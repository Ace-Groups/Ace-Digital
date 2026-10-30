import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { getApiBase } from '@/lib/api-config';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  ensureJoined: (channelId: number) => Promise<void>;
  setActiveChannelId: (channelId: number | null) => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  ensureJoined: async () => {},
  setActiveChannelId: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  
  const joinedRef = useRef(new Set<number>());
  const pendingJoinsRef = useRef(new Map<number, Promise<void>>());
  const activeChannelIdRef = useRef<number | null>(null);

  const clearJoinState = useCallback(() => {
    joinedRef.current.clear();
    pendingJoinsRef.current.clear();
  }, []);

  const setActiveChannelId = useCallback((id: number | null) => {
    activeChannelIdRef.current = id;
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      setConnected(false);
      clearJoinState();
      return;
    }

    const instance = io(getApiBase(), {
      path: '/socket.io',
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => {
      setConnected(false);
      clearJoinState();
    };

    const handleNewMessage = (incoming: any) => {
      const channelId = incoming.channelId;
      if (!channelId) return;

      // Update specific channel details/messages query caches
      const keysToUpdate = [String(channelId), Number(channelId)];
      keysToUpdate.forEach((keyId) => {
        // Update new channel-messages cache
        queryClient.setQueryData(['channel-messages', keyId], (old: any) => {
          const msgs = old ?? [];
          if (msgs.some((m: any) => m.id === incoming.id || (incoming.clientId && m.clientId === incoming.clientId))) {
            return old;
          }
          return [...msgs, incoming].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });

        // Update legacy channel cache
        queryClient.setQueryData(['channel', keyId], (old: any) => {
          if (!old) return old;
          const msgs = old.messages ?? [];
          if (msgs.some((m: any) => m.id === incoming.id || (incoming.clientId && m.clientId === incoming.clientId))) {
            return old;
          }
          return {
            ...old,
            messages: [...msgs, incoming].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
          };
        });
      });

      // Update the channel list preview and unread counts
      queryClient.setQueryData(['channels'], (old: any) => {
        if (!old) return old;
        return old.map((channel: any) => {
          if (channel.id === Number(channelId)) {
            const bodyPreview = incoming.messageKind === 'poll' 
              ? '📊 Poll: ' + (incoming.metadata?.question ?? '')
              : incoming.messageKind === 'event'
              ? '📅 Event: ' + (incoming.metadata?.title ?? '')
              : incoming.body || incoming.content || (incoming.attachments?.length ? '📎 Sent an attachment' : '');

            const isCurrentChannel = activeChannelIdRef.current === Number(channelId);
            const unreadIncrement = !isCurrentChannel ? 1 : 0;

            return {
              ...channel,
              lastMessagePreview: bodyPreview,
              lastMessage: bodyPreview,
              lastPostAt: incoming.createdAt,
              lastMessageAt: incoming.createdAt,
              unreadCount: (channel.unreadCount ?? 0) + unreadIncrement,
            };
          }
          return channel;
        });
      });
    };

    const handlePersistedMessage = ({ clientId, message }: { clientId: string; message: any }) => {
      const channelId = message.channelId;
      if (!channelId) return;

      const keysToUpdate = [String(channelId), Number(channelId)];
      keysToUpdate.forEach((keyId) => {
        // Update new channel-messages cache
        queryClient.setQueryData(['channel-messages', keyId], (old: any) => {
          const msgs = old ?? [];
          const updated = msgs.map((m: any) => (m.id === message.id || m.clientId === clientId ? message : m));
          if (!updated.some((m: any) => m.id === message.id)) {
            updated.push(message);
          }
          return updated.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });

        // Update legacy channel cache
        queryClient.setQueryData(['channel', keyId], (old: any) => {
          if (!old) return old;
          const msgs = old.messages ?? [];
          const updated = msgs.map((m: any) => (m.id === message.id || m.clientId === clientId ? message : m));
          if (!updated.some((m: any) => m.id === message.id)) {
            updated.push(message);
          }
          return {
            ...old,
            messages: updated.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
          };
        });
      });
    };

    instance.on('connect', onConnect);
    instance.on('disconnect', onDisconnect);
    instance.on('message:new', handleNewMessage);
    instance.on('message:persisted', handlePersistedMessage);

    setSocket(instance);
    clearJoinState();
    if (instance.connected) setConnected(true);

    return () => {
      instance.off('connect', onConnect);
      instance.off('disconnect', onDisconnect);
      instance.off('message:new', handleNewMessage);
      instance.off('message:persisted', handlePersistedMessage);
      instance.disconnect();
      setSocket(null);
      setConnected(false);
      clearJoinState();
    };
  }, [isAuthenticated, token, clearJoinState, queryClient]);

  const ensureJoined = useCallback(
    (channelId: number): Promise<void> => {
      if (!socket?.connected) {
        return Promise.reject(new Error('Socket not connected'));
      }
      if (joinedRef.current.has(channelId)) {
        return Promise.resolve();
      }
      const pending = pendingJoinsRef.current.get(channelId);
      if (pending) return pending;

      const promise = new Promise<void>((resolve, reject) => {
        socket.emit('join_channel', channelId, (res: { ok?: boolean; error?: string }) => {
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
    [socket]
  );

  const value = useMemo(
    () => ({ socket, connected, ensureJoined, setActiveChannelId }),
    [socket, connected, ensureJoined, setActiveChannelId]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
