import {
  parseServerEvent,
  type ClientFrame,
  type ServerEvent,
} from "@workspace/realtime-protocol";
import { getAuthToken } from "@/lib/api";
import { isRealtimeConfigured, resolveRealtimeWsUrl } from "@/lib/realtime-config";

export type RealtimeListener = (event: ServerEvent) => void;

const MAX_FAILURES = 5;
const BASE_DELAY_MS = 1000;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<RealtimeListener>();
  private pendingChannels = new Set<number>();
  private authenticated = false;
  private failures = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private _available = false;

  get available(): boolean {
    return this._available;
  }

  subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ServerEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private send(frame: ClientFrame): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame));
    }
  }

  connect(): void {
    if (!isRealtimeConfigured()) return;

    const url = resolveRealtimeWsUrl();
    if (!url) return;

    const token = getAuthToken();
    if (!token) return;

    this.intentionalClose = false;
    this.clearReconnect();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.failures = 0;
      this.authenticated = false;
      this.send({ type: "auth", token });
    };

    this.ws.onmessage = (ev) => {
      let raw: unknown;
      try {
        raw = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      const event = parseServerEvent(raw);
      if (!event) return;

      if (event.type === "authenticated") {
        this.authenticated = true;
        this._available = true;
        this.flushSubscriptions();
        return;
      }

      if (event.type === "error") {
        if (event.code === "unauthorized") {
          this._available = false;
          this.disconnect();
        }
        this.emit(event);
        return;
      }

      this.emit(event);
    };

    this.ws.onclose = () => {
      this.authenticated = false;
      this.ws = null;
      if (!this.intentionalClose) {
        this._available = false;
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    this.intentionalClose = true;
    this._available = false;
    this.authenticated = false;
    this.clearReconnect();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnect();
    this.failures += 1;
    if (this.failures >= MAX_FAILURES) {
      this._available = false;
      return;
    }
    const delay = Math.min(BASE_DELAY_MS * 2 ** (this.failures - 1), 30_000);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  setChannelSubscriptions(channelIds: number[]): void {
    this.pendingChannels = new Set(channelIds);
    this.flushSubscriptions();
  }

  private flushSubscriptions(): void {
    if (!this.authenticated || this.pendingChannels.size === 0) return;
    this.send({
      type: "subscribe",
      channelIds: [...this.pendingChannels],
    });
  }

  ping(): void {
    this.send({ type: "ping" });
  }
}

export const realtimeClient = new RealtimeClient();
