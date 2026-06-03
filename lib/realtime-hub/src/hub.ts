import type { WebSocket } from "ws";
import {
  type PublishedEvent,
  type ServerEvent,
  parseClientFrame,
  parsePublishedEvent,
  serializeEvent,
} from "@workspace/realtime-protocol";
import type { AuthPayload } from "./jwt.js";
import { verifyToken } from "./jwt-verify.js";

type ClientState = {
  ws: WebSocket;
  userId?: number;
  auth?: AuthPayload;
  channels: Set<number>;
};

export type SubscribeChecker = (
  userId: number,
  auth: AuthPayload,
  channelIds: number[],
) => Promise<number[]>;

export type RealtimeHubOptions = {
  verifyAuth: (token: string) => AuthPayload;
  onSubscribe: SubscribeChecker;
};

export class RealtimeHub {
  private clients = new Set<ClientState>();
  private channelRooms = new Map<number, Set<ClientState>>();
  private userRooms = new Map<number, Set<ClientState>>();

  constructor(private options: RealtimeHubOptions) {}

  addClient(ws: WebSocket): void {
    const state: ClientState = { ws, channels: new Set() };
    this.clients.add(state);

    ws.on("message", (data) => {
      void this.handleMessage(state, data);
    });

    ws.on("close", () => {
      this.removeClient(state);
    });
  }

  private removeClient(state: ClientState): void {
    this.clients.delete(state);
    for (const channelId of state.channels) {
      this.leaveChannel(state, channelId);
    }
    if (state.userId != null) {
      const room = this.userRooms.get(state.userId);
      room?.delete(state);
      if (room?.size === 0) this.userRooms.delete(state.userId);
    }
  }

  private send(state: ClientState, event: ServerEvent): void {
    if (state.ws.readyState !== state.ws.OPEN) return;
    state.ws.send(serializeEvent(event));
  }

  private joinChannel(state: ClientState, channelId: number): void {
    state.channels.add(channelId);
    let room = this.channelRooms.get(channelId);
    if (!room) {
      room = new Set();
      this.channelRooms.set(channelId, room);
    }
    room.add(state);
  }

  private leaveChannel(state: ClientState, channelId: number): void {
    state.channels.delete(channelId);
    const room = this.channelRooms.get(channelId);
    room?.delete(state);
    if (room?.size === 0) this.channelRooms.delete(channelId);
  }

  private joinUser(state: ClientState, userId: number): void {
    state.userId = userId;
    let room = this.userRooms.get(userId);
    if (!room) {
      room = new Set();
      this.userRooms.set(userId, room);
    }
    room.add(state);
  }

  private async handleMessage(state: ClientState, data: WebSocket.RawData): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(data));
    } catch {
      this.send(state, { type: "error", code: "invalid_json", message: "Invalid JSON" });
      return;
    }

    const frame = parseClientFrame(parsed);
    if (!frame) {
      this.send(state, { type: "error", code: "invalid_frame", message: "Invalid frame" });
      return;
    }

    if (frame.type === "ping") {
      this.send(state, { type: "pong" });
      return;
    }

    if (frame.type === "auth") {
      try {
        const auth = this.options.verifyAuth(frame.token);
        state.auth = auth;
        this.joinUser(state, auth.userId);
        this.send(state, { type: "authenticated", userId: auth.userId });
      } catch {
        this.send(state, { type: "error", code: "unauthorized", message: "Invalid token" });
      }
      return;
    }

    if (!state.auth) {
      this.send(state, { type: "error", code: "unauthorized", message: "Authenticate first" });
      return;
    }

    if (frame.type === "subscribe") {
      const allowed = await this.options.onSubscribe(
        state.auth.userId,
        state.auth,
        frame.channelIds,
      );
      for (const id of allowed) {
        this.joinChannel(state, id);
      }
      this.send(state, { type: "subscribed", channelIds: allowed });
      return;
    }

    if (frame.type === "unsubscribe") {
      for (const id of frame.channelIds) {
        this.leaveChannel(state, id);
      }
    }
  }

  /** Fan-out a published event to connected WebSocket clients. */
  dispatch(event: PublishedEvent): void {
    switch (event.type) {
      case "message:new": {
        const room = this.channelRooms.get(event.message.channelId);
        if (!room) return;
        const payload: ServerEvent = event;
        for (const client of room) this.send(client, payload);
        return;
      }
      case "message:updated": {
        const room = this.channelRooms.get(event.channelId);
        if (!room) return;
        for (const client of room) this.send(client, event);
        return;
      }
      case "message:deleted": {
        const room = this.channelRooms.get(event.channelId);
        if (!room) return;
        for (const client of room) this.send(client, event);
        return;
      }
      case "channel:activity": {
        const room = this.channelRooms.get(event.activity.channelId);
        if (!room) return;
        for (const client of room) this.send(client, event);
        return;
      }
      case "notification:new": {
        const room = this.userRooms.get(event.notification.userId);
        if (!room) return;
        const { userId: _uid, ...notification } = event.notification;
        const payload: ServerEvent = { type: "notification:new", notification };
        for (const client of room) this.send(client, payload);
        return;
      }
    }
  }

  dispatchRaw(json: string): void {
    try {
      const parsed = parsePublishedEvent(JSON.parse(json));
      if (parsed) this.dispatch(parsed);
    } catch {
      /* ignore malformed redis payloads */
    }
  }
}

export function createDefaultHubOptions(
  onSubscribe: SubscribeChecker,
): RealtimeHubOptions {
  return {
    verifyAuth(token: string) {
      return verifyToken(token);
    },
    onSubscribe,
  };
}

let globalHub: RealtimeHub | null = null;

export function getGlobalHub(): RealtimeHub | null {
  return globalHub;
}

export function setGlobalHub(hub: RealtimeHub | null): void {
  globalHub = hub;
}

export function createHub(options: RealtimeHubOptions): RealtimeHub {
  return new RealtimeHub(options);
}
