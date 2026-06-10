import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Socket } from "socket.io-client";
import { createChatSocket } from "@/lib/socket-client";
import { useAuth } from "@/contexts/AuthContext";

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  ensureJoined: (channelId: number) => Promise<void>;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  ensureJoined: async () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isSessionVerified, authToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const joinedRef = useRef(new Set<number>());
  const pendingJoinsRef = useRef(new Map<number, Promise<void>>());

  const clearJoinState = useCallback(() => {
    joinedRef.current.clear();
    pendingJoinsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!isSessionVerified || !authToken) {
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      setConnected(false);
      clearJoinState();
      return;
    }

    const instance = createChatSocket(authToken);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => {
      setConnected(false);
      clearJoinState();
    };

    instance.on("connect", onConnect);
    instance.on("disconnect", onDisconnect);
    setSocket(instance);
    clearJoinState();
    if (instance.connected) setConnected(true);

    return () => {
      instance.off("connect", onConnect);
      instance.off("disconnect", onDisconnect);
      instance.disconnect();
      setSocket(null);
      setConnected(false);
      clearJoinState();
    };
  }, [isSessionVerified, authToken, clearJoinState]);

  const ensureJoined = useCallback(
    (channelId: number): Promise<void> => {
      if (!socket?.connected) {
        return Promise.reject(new Error("Socket not connected"));
      }
      if (joinedRef.current.has(channelId)) {
        return Promise.resolve();
      }
      const pending = pendingJoinsRef.current.get(channelId);
      if (pending) return pending;

      const promise = new Promise<void>((resolve, reject) => {
        socket.emit("join_channel", channelId, (res: { ok?: boolean; error?: string }) => {
          pendingJoinsRef.current.delete(channelId);
          if (res?.error) {
            reject(new Error(res.error));
            return;
          }
          joinedRef.current.add(channelId);
          resolve();
        });
      });
      pendingJoinsRef.current.set(channelId, promise);
      return promise;
    },
    [socket],
  );

  const value = useMemo(
    () => ({ socket, connected, ensureJoined }),
    [socket, connected, ensureJoined],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

export function useEnsureChannelJoined() {
  const { ensureJoined } = useSocket();
  return ensureJoined;
}

export function useSocketEmit() {
  const { socket } = useSocket();
  return useCallback(
    (event: string, payload: unknown, timeoutMs = 2000): Promise<unknown> =>
      new Promise((resolve, reject) => {
        if (!socket?.connected) {
          reject(new Error("Socket not connected"));
          return;
        }
        const timer = window.setTimeout(() => {
          reject(new Error("Socket timeout"));
        }, timeoutMs);
        socket.emit(event, payload, (response: unknown) => {
          window.clearTimeout(timer);
          resolve(response);
        });
      }),
    [socket],
  );
}
