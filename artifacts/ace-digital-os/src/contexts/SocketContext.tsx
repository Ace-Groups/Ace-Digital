import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Socket } from "socket.io-client";
import { createChatSocket } from "@/lib/socket-client";
import { getAuthToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      setConnected(false);
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    const instance = createChatSocket(token);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    instance.on("connect", onConnect);
    instance.on("disconnect", onDisconnect);
    setSocket(instance);
    if (instance.connected) setConnected(true);

    return () => {
      instance.off("connect", onConnect);
      instance.off("disconnect", onDisconnect);
      instance.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [isAuthenticated]);

  const value = useMemo(() => ({ socket, connected }), [socket, connected]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

export function useSocketEmit() {
  const { socket } = useSocket();
  return useCallback(
    (event: string, payload: unknown, timeoutMs = 8000): Promise<unknown> =>
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
