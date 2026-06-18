import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl,
  Modal, ScrollView, Switch, Image, TouchableOpacity, Linking, Dimensions,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing, radius } from '@/theme';
import { useGetChannel, useGetChannelMessages, useSendMessage, useVotePoll, useRsvpEvent, useToggleMessageReaction, useDeleteMessage, usePinMessage, useUnpinMessage, useListChannelPins } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

const CHAT_THEMES = [
  // 0: Midnight Indigo
  {
    darkGradients: ['#0B0F19', '#1E1B4B', '#111827'],
    lightGradients: ['#EEF2F6', '#E2E8F0', '#F8FAFC'],
    bubbleBgMeDark: '#6366F1',
    bubbleBgMeLight: '#4F46E5',
  },
  // 1: Forest Emerald
  {
    darkGradients: ['#061F1E', '#022C22', '#0F172A'],
    lightGradients: ['#ECFDF5', '#D1FAE5', '#F1F5F9'],
    bubbleBgMeDark: '#10B981',
    bubbleBgMeLight: '#059669',
  },
  // 2: Sunset Rose
  {
    darkGradients: ['#1A0C16', '#2E101D', '#0F172A'],
    lightGradients: ['#FFF5F5', '#FFE3E3', '#F8FAFC'],
    bubbleBgMeDark: '#EC4899',
    bubbleBgMeLight: '#D01E6C',
  },
  // 3: Ocean Breeze
  {
    darkGradients: ['#031B2A', '#0F172A', '#071626'],
    lightGradients: ['#F0F9FF', '#E0F2FE', '#F1F5F9'],
    bubbleBgMeDark: '#0EA5E9',
    bubbleBgMeLight: '#0284C7',
  },
  // 4: Cyber Violet
  {
    darkGradients: ['#120B24', '#1E1435', '#090514'],
    lightGradients: ['#FAF5FF', '#F3E8FF', '#F8FAFC'],
    bubbleBgMeDark: '#8B5CF6',
    bubbleBgMeLight: '#6D28D9',
  },
] as const;

function timeStr(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function ChannelDetailScreen() {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState<'image' | 'video' | 'file' | null>(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const isPickingRef = useRef(false);

  const themeIndex = useMemo(() => {
    if (!id) return 0;
    const str = String(id);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % CHAT_THEMES.length;
  }, [id]);

  const currentTheme = CHAT_THEMES[themeIndex];
  const bubbleBgMe = isDark ? currentTheme.bubbleBgMeDark : currentTheme.bubbleBgMeLight;

  const pickImage = async () => {
    if (isPickingRef.current) return;
    isPickingRef.current = true;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'We need gallery permissions to let you select photos/videos. Please enable them in your device settings.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.2,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const processed: any[] = [];
        for (const asset of result.assets) {
          let base64Data = asset.base64;
          if (!base64Data) {
            try {
              base64Data = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
            } catch (err) {
              console.error('[Base64ReadError]', err);
              Alert.alert('Error', `Failed to read media content for ${asset.fileName || 'selected file'}.`);
              continue;
            }
          }

          const size = asset.fileSize || Math.floor((base64Data.length * 3) / 4);
          if (size > 25000000) {
            Alert.alert(
              'File Too Large',
              `Selected file "${asset.fileName || 'media'}" is too large (${Math.round(size / 1024 / 1024)}MB). Please select files smaller than 25MB to ensure successful delivery.`
            );
            continue;
          }

          const mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
          const name = asset.fileName || `media-${Date.now()}-${Math.random().toString(36).substring(5)}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;
          const url = `data:${mimeType};base64,${base64Data}`;

          processed.push({
            type: asset.type === 'video' ? 'video' : 'image',
            url,
            name,
            mimeType,
            size,
          });
        }

        if (processed.length > 0) {
          setPendingAttachments((prev) => [...prev, ...processed]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err) {
      console.error('[pickImage]', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('picking in progress') || errMsg.includes('canceled')) {
        return;
      }
      Alert.alert('Error', 'An error occurred while picking the image.');
    } finally {
      isPickingRef.current = false;
    }
  };

  const pickDocument = async () => {
    if (isPickingRef.current) return;
    isPickingRef.current = true;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const processed: any[] = [];
        for (const asset of result.assets) {
          const size = asset.size ?? 0;

          if (size > 25000000) {
            Alert.alert(
              'File Too Large',
              `Selected document "${asset.name || 'file'}" is too large (${Math.round(size / 1024 / 1024)}MB). Please select files smaller than 25MB.`
            );
            continue;
          }

          let base64Data = '';
          try {
            base64Data = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch (err) {
            console.error('[Base64ReadError]', err);
            Alert.alert('Error', `Failed to read document content for ${asset.name || 'selected file'}.`);
            continue;
          }

          const mimeType = asset.mimeType || 'application/octet-stream';
          const name = asset.name || `file-${Date.now()}-${Math.random().toString(36).substring(5)}`;
          const url = `data:${mimeType};base64,${base64Data}`;

          processed.push({
            type: 'file',
            url,
            name,
            mimeType,
            size,
          });
        }

        if (processed.length > 0) {
          setPendingAttachments((prev) => [...prev, ...processed]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err) {
      console.error('[pickDocument]', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('picking in progress') || errMsg.includes('canceled')) {
        return;
      }
      Alert.alert('Error', 'An error occurred while selecting the document.');
    } finally {
      isPickingRef.current = false;
    }
  };

  const takePhoto = async () => {
    if (isPickingRef.current) return;
    isPickingRef.current = true;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'We need camera permissions to let you take photos/videos. Please enable them in your device settings.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.15,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const processed: any[] = [];
        for (const asset of result.assets) {
          let base64Data = asset.base64;
          if (!base64Data) {
            try {
              base64Data = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
            } catch (err) {
              console.error('[Base64ReadError]', err);
              Alert.alert('Error', 'Failed to read camera content.');
              continue;
            }
          }

          const size = asset.fileSize || Math.floor((base64Data.length * 3) / 4);
          if (size > 25000000) {
            Alert.alert(
              'File Too Large',
              `Photo is too large (${Math.round(size / 1024 / 1024)}MB). Please try taking the photo again or select from gallery.`
            );
            continue;
          }

          const mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
          const name = asset.fileName || `camera-${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;
          const url = `data:${mimeType};base64,${base64Data}`;

          processed.push({
            type: asset.type === 'video' ? 'video' : 'image',
            url,
            name,
            mimeType,
            size,
          });
        }

        if (processed.length > 0) {
          setPendingAttachments((prev) => [...prev, ...processed]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err) {
      console.error('[takePhoto]', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('picking in progress') || errMsg.includes('canceled')) {
        return;
      }
      Alert.alert('Error', 'An error occurred while taking the photo.');
    } finally {
      isPickingRef.current = false;
    }
  };

  const handleToggleReaction = async (msg: any, emoji: string) => {
    if (!id || !user) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const channelId = Number(id);
    const userId = user.id;

    const currentMeta = msg.metadata ?? {};
    const reactions = { ...(currentMeta.reactions ?? {}) };
    const currentList = [...(reactions[emoji] ?? [])];
    const idx = currentList.indexOf(userId);
    if (idx >= 0) {
      currentList.splice(idx, 1);
    } else {
      currentList.push(userId);
    }
    if (currentList.length) {
      reactions[emoji] = currentList;
    } else {
      delete reactions[emoji];
    }

    const updatedMessage = {
      ...msg,
      metadata: { ...currentMeta, reactions },
    };

    const updateCache = (old: any) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return old.map((m: any) => m.id === msg.id ? updatedMessage : m);
      }
      if (old.messages) {
        return {
          ...old,
          messages: old.messages.map((m: any) => m.id === msg.id ? updatedMessage : m),
        };
      }
      return old;
    };

    queryClient.setQueryData(['channel-messages', id], updateCache);
    queryClient.setQueryData(['channel', id], updateCache);

    try {
      await toggleReactionMutation.mutateAsync({
        id: channelId,
        messageId: msg.id,
        data: { emoji },
      });
      queryClient.invalidateQueries({ queryKey: ['channel-pins', id] });
    } catch (err) {
      console.error('[toggleReaction] failed', err);
      queryClient.invalidateQueries({ queryKey: ['channel', id] });
      queryClient.invalidateQueries({ queryKey: ['channel-messages', id] });
    }
  };

  // Poll Form States
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  // Event Form States
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventStartAt, setEventStartAt] = useState('');
  const [eventEndAt, setEventEndAt] = useState('');

  const listRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();
  const isInitialScrollRef = useRef(true);

  const { socket, connected, ensureJoined, setActiveChannelId } = useSocket();

  const { data: channel, isLoading, refetch, isRefetching } = useGetChannel(Number(id), {
    query: {
      queryKey: ['channel', id],
      enabled: !!id,
      refetchInterval: connected ? false : 5000, // Disable polling when socket is active
    },
  });

  const { data: messagesData, isLoading: isMessagesLoading, refetch: refetchMessages, isRefetching: isMessagesRefetching } = useGetChannelMessages(Number(id), { limit: 50 }, {
    query: {
      queryKey: ['channel-messages', id],
      enabled: !!id,
      refetchInterval: connected ? false : 5000,
    }
  });

  const sendMutation = useSendMessage();
  const voteMutation = useVotePoll();
  const rsvpMutation = useRsvpEvent();
  const toggleReactionMutation = useToggleMessageReaction();
  const deleteMutation = useDeleteMessage();
  const pinMutation = usePinMessage();
  const unpinMutation = useUnpinMessage();

  const { data: pinnedMessagesData } = useListChannelPins(Number(id), {
    query: {
      queryKey: ['channel-pins', id],
      enabled: !!id,
    }
  });

  const handleOpenUrl = (url: string) => {
    if (!url) return;
    Linking.openURL(url).catch((err) => console.warn('[open-url]', err));
  };

  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      await Promise.all([refetch(), refetchMessages()]);
    } finally {
      setManualRefreshing(false);
    }
  };

  const handleVotePoll = async (msg: any, optionId: string) => {
    if (!id || !user) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const channelId = Number(id);
    const userId = user.id;
    const currentMeta = msg.metadata ?? {};
    const votes = { ...currentMeta.votes };
    
    if (!currentMeta.allowMultiple) {
      for (const key of Object.keys(votes)) {
        votes[key] = (votes[key] ?? []).filter((uid: number) => uid !== userId);
      }
      votes[optionId] = [userId];
    } else {
      const existing = votes[optionId] ?? [];
      if (existing.includes(userId)) {
        votes[optionId] = existing.filter((uid: number) => uid !== userId);
      } else {
        votes[optionId] = [...existing, userId];
      }
    }
    
    const updatedMessage = {
      ...msg,
      metadata: { ...currentMeta, votes },
    };
    
    queryClient.setQueryData(['channel-messages', id], (old: any) => {
      const msgs = old ?? [];
      return msgs.map((m: any) => m.id === msg.id ? updatedMessage : m);
    });

    queryClient.setQueryData(['channel', id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: (old.messages ?? []).map((m: any) => m.id === msg.id ? updatedMessage : m),
      };
    });
    
    try {
      await voteMutation.mutateAsync({
        id: channelId,
        messageId: msg.id,
        data: { optionId },
      });
    } catch {
      queryClient.invalidateQueries({ queryKey: ['channel', id] });
      queryClient.invalidateQueries({ queryKey: ['channel-messages', id] });
    }
  };

  const handleRsvpEvent = async (msg: any, status: 'going' | 'maybe' | 'no') => {
    if (!id || !user) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const channelId = Number(id);
    const userId = user.id;
    const currentMeta = msg.metadata ?? {};
    const rsvps = {
      going: (currentMeta.rsvps?.going ?? []).filter((uid: number) => uid !== userId),
      maybe: (currentMeta.rsvps?.maybe ?? []).filter((uid: number) => uid !== userId),
      no: (currentMeta.rsvps?.no ?? []).filter((uid: number) => uid !== userId),
    };
    rsvps[status].push(userId);
    
    const updatedMessage = {
      ...msg,
      metadata: { ...currentMeta, rsvps },
    };
    
    queryClient.setQueryData(['channel-messages', id], (old: any) => {
      const msgs = old ?? [];
      return msgs.map((m: any) => m.id === msg.id ? updatedMessage : m);
    });

    queryClient.setQueryData(['channel', id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: (old.messages ?? []).map((m: any) => m.id === msg.id ? updatedMessage : m),
      };
    });
    
    try {
      await rsvpMutation.mutateAsync({
        id: channelId,
        messageId: msg.id,
        data: { status },
      });
    } catch {
      queryClient.invalidateQueries({ queryKey: ['channel', id] });
      queryClient.invalidateQueries({ queryKey: ['channel-messages', id] });
    }
  };

  useEffect(() => {
    if (!id) return;
    setActiveChannelId(Number(id));
    return () => {
      setActiveChannelId(null);
    };
  }, [id, setActiveChannelId]);

  useEffect(() => {
    if (!id || !socket || !connected) return;

    void ensureJoined(Number(id)).catch((err) => {
      console.warn('[socket-join]', err);
    });
  }, [id, socket, connected, ensureJoined]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!id || (!trimmed && pendingAttachments.length === 0)) return;
    
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setText('');
    const attachmentsToSend = [...pendingAttachments];
    setPendingAttachments([]);

    const clientId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const tempId = -Math.abs(clientId.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
    const now = new Date().toISOString();

    const pendingMsg = {
      id: tempId,
      clientId,
      channelId: Number(id),
      userId: user?.id,
      userName: user?.fullName ?? 'Me',
      body: trimmed,
      content: trimmed,
      attachments: attachmentsToSend,
      messageKind: 'text',
      createdAt: now,
      status: 'sending',
    };

    // Optimistically update query client cache
    queryClient.setQueryData(['channel-messages', id], (old: any) => {
      const msgs = old ?? [];
      return [...msgs, pendingMsg];
    });
    queryClient.setQueryData(['channel', id], (old: any) => {
      if (!old) return old;
      const msgs = old.messages ?? [];
      return {
        ...old,
        messages: [...msgs, pendingMsg],
      };
    });

    const markFailed = () => {
      queryClient.setQueryData(['channel-messages', id], (old: any) => {
        const msgs = old ?? [];
        return msgs.map((m: any) => m.clientId === clientId ? { ...m, status: 'failed' } : m);
      });
      queryClient.setQueryData(['channel', id], (old: any) => {
        if (!old) return old;
        const msgs = old.messages ?? [];
        return {
          ...old,
          messages: msgs.map((m: any) => m.clientId === clientId ? { ...m, status: 'failed' } : m),
        };
      });
    };

    const sendHttp = async () => {
      try {
        const response = await sendMutation.mutateAsync({ 
          id: Number(id), 
          data: { 
            body: trimmed, 
            attachments: attachmentsToSend 
          } 
        });
        queryClient.setQueryData(['channel-messages', id], (old: any) => {
          const msgs = old ?? [];
          const kept = msgs.filter((m: any) => m.clientId !== clientId && m.id !== tempId && m.id !== response.id);
          return [...kept, response].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
        queryClient.setQueryData(['channel', id], (old: any) => {
          if (!old) return old;
          const msgs = old.messages ?? [];
          const kept = msgs.filter((m: any) => m.clientId !== clientId && m.id !== tempId && m.id !== response.id);
          return {
            ...old,
            messages: [...kept, response].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
          };
        });
      } catch (err) {
        console.error('[sendHttp] failed', err);
        markFailed();
      }
    };

    if (connected && socket) {
      try {
        await ensureJoined(Number(id));
        socket.emit('message:send', {
          channelId: Number(id),
          clientId,
          body: trimmed,
          attachments: attachmentsToSend,
          messageKind: 'text',
        }, (ack: any) => {
          if (ack && ack.status === 'success' && ack.message) {
            queryClient.setQueryData(['channel-messages', id], (old: any) => {
              const msgs = old ?? [];
              const kept = msgs.filter((m: any) => m.clientId !== clientId && m.id !== tempId && m.id !== ack.message.id);
              return [...kept, ack.message].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            });
            queryClient.setQueryData(['channel', id], (old: any) => {
              if (!old) return old;
              const msgs = old.messages ?? [];
              const kept = msgs.filter((m: any) => m.clientId !== clientId && m.id !== tempId && m.id !== ack.message.id);
              return {
                ...old,
                messages: [...kept, ack.message].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
              };
            });
          } else {
            void sendHttp();
          }
        });
      } catch (err) {
        console.warn('[socket-send] failed, falling back to HTTP', err);
        void sendHttp();
      }
    } else {
      void sendHttp();
    }
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || !id) return;
    const filteredOptions = pollOptions.filter(o => o.trim() !== '');
    if (filteredOptions.length < 2) return;

    setShowPollModal(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollAllowMultiple(false);

    const meta = {
      question: pollQuestion.trim(),
      options: filteredOptions.map((opt, i) => ({ id: `opt_${i}_${Date.now()}`, label: opt.trim() })),
      votes: filteredOptions.reduce((acc, opt, i) => {
        acc[`opt_${i}_${Date.now()}`] = [];
        return acc;
      }, {} as any),
      allowMultiple: pollAllowMultiple,
    };

    const clientId = 'poll_' + Math.random().toString(36).substring(2, 15);
    const tempId = -Math.abs(clientId.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
    const now = new Date().toISOString();

    const pendingMsg = {
      id: tempId,
      clientId,
      channelId: Number(id),
      userId: user?.id,
      userName: user?.fullName ?? 'Me',
      body: '',
      content: '',
      messageKind: 'poll',
      metadata: meta,
      createdAt: now,
      status: 'sending',
    };

    queryClient.setQueryData(['channel-messages', id], (old: any) => {
      const msgs = old ?? [];
      return [...msgs, pendingMsg];
    });
    queryClient.setQueryData(['channel', id], (old: any) => {
      if (!old) return old;
      const msgs = old.messages ?? [];
      return {
        ...old,
        messages: [...msgs, pendingMsg],
      };
    });

    const markFailed = () => {
      queryClient.setQueryData(['channel-messages', id], (old: any) => {
        const msgs = old ?? [];
        return msgs.map((m: any) => m.clientId === clientId ? { ...m, status: 'failed' } : m);
      });
      queryClient.setQueryData(['channel', id], (old: any) => {
        if (!old) return old;
        const msgs = old.messages ?? [];
        return {
          ...old,
          messages: msgs.map((m: any) => m.clientId === clientId ? { ...m, status: 'failed' } : m),
        };
      });
    };

    const sendHttp = async () => {
      try {
        const response = await sendMutation.mutateAsync({
          id: Number(id),
          data: {
            body: '',
            messageKind: 'poll',
            metadata: meta,
          }
        });
        queryClient.setQueryData(['channel-messages', id], (old: any) => {
          const msgs = old ?? [];
          const kept = msgs.filter((m: any) => m.clientId !== clientId && m.id !== tempId && m.id !== response.id);
          return [...kept, response].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
        queryClient.setQueryData(['channel', id], (old: any) => {
          if (!old) return old;
          const msgs = old.messages ?? [];
          const kept = msgs.filter((m: any) => m.clientId !== clientId && m.id !== tempId && m.id !== response.id);
          return {
            ...old,
            messages: [...kept, response].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
          };
        });
      } catch (err) {
        console.warn('[create-poll-http] failed', err);
        markFailed();
      }
    };

    if (connected && socket) {
      try {
        await ensureJoined(Number(id));
        socket.emit('message:send', {
          channelId: Number(id),
          clientId,
          body: '',
          messageKind: 'poll',
          metadata: meta,
        }, (ack: any) => {
          if (ack && ack.status === 'success' && ack.message) {
            queryClient.setQueryData(['channel-messages', id], (old: any) => {
              const msgs = old ?? [];
              const kept = msgs.filter((m: any) => m.clientId !== clientId && m.id !== tempId && m.id !== ack.message.id);
              return [...kept, ack.message].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            });
            queryClient.setQueryData(['channel', id], (old: any) => {
              if (!old) return old;
              const msgs = old.messages ?? [];
              const kept = msgs.filter((m: any) => m.clientId !== clientId && m.id !== tempId && m.id !== ack.message.id);
              return {
                ...old,
                messages: [...kept, ack.message].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
              };
            });
          } else {
            void sendHttp();
          }
        });
      } catch (err) {
        console.warn('[create-poll-socket] failed, falling back to HTTP', err);
        void sendHttp();
      }
    } else {
      void sendHttp();
    }
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !id) return;

    setShowEventModal(false);
    const title = eventTitle.trim();
    const body = eventDesc.trim();
    const location = eventLocation.trim() || null;
    
    let startAt = eventStartAt;
    let endAt = eventEndAt || null;

    try {
      new Date(startAt).toISOString();
    } catch {
      startAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    }

    if (endAt) {
      try {
        new Date(endAt).toISOString();
      } catch {
        endAt = null;
      }
    }

    setEventTitle('');
    setEventDesc('');
    setEventLocation('');
    setEventStartAt('');
    setEventEndAt('');

    const meta = {
      title,
      startAt,
      endAt,
      location,
      rsvps: { going: [], maybe: [], no: [] },
    };

    const clientId = 'event_' + Math.random().toString(36).substring(2, 15);
    const tempId = -Math.abs(clientId.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
    const now = new Date().toISOString();

    const pendingMsg = {
      id: tempId,
      clientId,
      channelId: Number(id),
      userId: user?.id,
      userName: user?.fullName ?? 'Me',
      body: body,
      content: body,
      messageKind: 'event',
      metadata: meta,
      createdAt: now,
      status: 'sending',
    };

    queryClient.setQueryData(['channel-messages', id], (old: any) => {
      const msgs = old ?? [];
      return [...msgs, pendingMsg];
    });
    queryClient.setQueryData(['channel', id], (old: any) => {
      if (!old) return old;
      const msgs = old.messages ?? [];
      return {
        ...old,
        messages: [...msgs, pendingMsg],
      };
    });

    const markFailed = () => {
      queryClient.setQueryData(['channel-messages', id], (old: any) => {
        const msgs = old ?? [];
        return msgs.map((m: any) => m.clientId === clientId ? { ...m, status: 'failed' } : m);
      });
      queryClient.setQueryData(['channel', id], (old: any) => {
        if (!old) return old;
        const msgs = old.messages ?? [];
        return {
          ...old,
          messages: msgs.map((m: any) => m.clientId === clientId ? { ...m, status: 'failed' } : m),
        };
      });
    };

    const sendHttp = async () => {
      try {
        const response = await sendMutation.mutateAsync({
          id: Number(id),
          data: {
            body: body,
            messageKind: 'event',
            metadata: meta,
          }
        });
        queryClient.setQueryData(['channel-messages', id], (old: any) => {
          const msgs = old ?? [];
          const kept = msgs.filter((m: any) => m.clientId !== clientId && m.id !== tempId && m.id !== response.id);
          return [...kept, response].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
        queryClient.setQueryData(['channel', id], (old: any) => {
          if (!old) return old;
          const msgs = old.messages ?? [];
          const kept = msgs.filter((m: any) => m.clientId !== clientId && m.id !== tempId && m.id !== response.id);
          return {
            ...old,
            messages: [...kept, response].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
          };
        });
      } catch (err) {
        console.warn('[create-event-http] failed', err);
        markFailed();
      }
    };

    if (connected && socket) {
      try {
        await ensureJoined(Number(id));
        socket.emit('message:send', {
          channelId: Number(id),
          clientId,
          body: body,
          messageKind: 'event',
          metadata: meta,
        }, (ack: any) => {
          if (ack && ack.status === 'success' && ack.message) {
            queryClient.setQueryData(['channel-messages', id], (old: any) => {
              const msgs = old ?? [];
              const kept = msgs.filter((m: any) => m.clientId !== clientId && m.id !== tempId && m.id !== ack.message.id);
              return [...kept, ack.message].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            });
            queryClient.setQueryData(['channel', id], (old: any) => {
              if (!old) return old;
              const msgs = old.messages ?? [];
              const kept = msgs.filter((m: any) => m.clientId !== clientId && m.id !== tempId && m.id !== ack.message.id);
              return {
                ...old,
                messages: [...kept, ack.message].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
              };
            });
          } else {
            void sendHttp();
          }
        });
      } catch (err) {
        console.warn('[create-event-socket] failed, falling back to HTTP', err);
        void sendHttp();
      }
    } else {
      void sendHttp();
    }
  };

  function formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function MobilePollCard({ msg, isMe }: { msg: any; isMe: boolean }) {
    const meta = msg.metadata;
    if (!meta || !meta.question || !meta.options) return null;

    const totalVotes = Object.values(meta.votes ?? {}).reduce((n: number, arr: any) => n + (arr?.length ?? 0), 0);
    const myVotes = new Set(
      Object.entries(meta.votes ?? {})
        .filter(([, ids]: any) => ids?.includes(user?.id ?? -1))
        .map(([optId]) => optId)
    );

    return (
      <View style={[styles.pollCard, { borderColor: isMe ? 'rgba(255,255,255,0.2)' : c.border }]}>
        <Text style={[styles.pollQuestion, { color: isMe ? '#FFFFFF' : c.text }]}>
          {meta.question}
        </Text>
        
        <View style={styles.pollOptionsContainer}>
          {meta.options.map((opt: any) => {
            const count = meta.votes?.[opt.id]?.length ?? 0;
            const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
            const selected = myVotes.has(opt.id);
            
            return (
              <Pressable
                key={opt.id}
                onPress={() => handleVotePoll(msg, opt.id)}
                style={[
                  styles.pollOptionBtn,
                  { 
                    borderColor: selected ? (isMe ? '#FFFFFF' : c.primary) : (isMe ? 'rgba(255,255,255,0.2)' : c.border),
                    backgroundColor: isMe ? 'rgba(255,255,255,0.05)' : c.surfaceElevated 
                  }
                ]}
              >
                <View 
                  style={[
                    styles.pollOptionProgress, 
                    { 
                      width: `${pct}%`, 
                      backgroundColor: selected 
                        ? (isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,102,204,0.1)') 
                        : (isMe ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)') 
                    }
                  ]}
                />
                
                <View style={styles.pollOptionContent}>
                  <View style={styles.pollOptionLabelRow}>
                    {selected && (
                      <Ionicons 
                        name="checkmark-circle" 
                        size={16} 
                        color={isMe ? '#FFFFFF' : c.primary} 
                        style={{ marginRight: spacing[1] }} 
                      />
                    )}
                    <Text style={[styles.pollOptionLabel, { color: isMe ? '#FFFFFF' : c.text, fontWeight: selected ? '600' : '400' }]}>
                      {opt.label}
                    </Text>
                  </View>
                  <Text style={[styles.pollOptionPct, { color: isMe ? 'rgba(255,255,255,0.7)' : c.textTertiary }]}>
                    {pct}% ({count})
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        
        <View style={[styles.pollFooter, { borderTopColor: isMe ? 'rgba(255,255,255,0.2)' : c.border }]}>
          <Text style={[styles.pollFooterText, { color: isMe ? 'rgba(255,255,255,0.6)' : c.textTertiary }]}>
            {totalVotes} vote{totalVotes === 1 ? '' : 's'}
            {meta.allowMultiple ? ' • Multiple choice' : ''}
          </Text>
        </View>
      </View>
    );
  }

  function MobileEventCard({ msg, isMe }: { msg: any; isMe: boolean }) {
    const meta = msg.metadata;
    if (!meta || !meta.title) return null;

    const myStatus = ['going', 'maybe', 'no'].find((status: any) =>
      meta.rsvps?.[status]?.includes(user?.id ?? -1)
    );

    const going = meta.rsvps?.going?.length ?? 0;
    const maybe = meta.rsvps?.maybe?.length ?? 0;
    const no = meta.rsvps?.no?.length ?? 0;

    const formatDate = (isoStr: string) => {
      try {
        const d = new Date(isoStr);
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      } catch {
        return isoStr;
      }
    };

    return (
      <View style={[styles.eventCard, { borderColor: isMe ? 'rgba(255,255,255,0.2)' : c.border }]}>
        <View style={styles.eventHeader}>
          <Ionicons name="calendar" size={20} color={isMe ? '#FFFFFF' : c.primary} />
          <View style={styles.eventHeaderInfo}>
            <Text style={[styles.eventTitle, { color: isMe ? '#FFFFFF' : c.text }]}>
              {meta.title}
            </Text>
            <Text style={[styles.eventTime, { color: isMe ? 'rgba(255,255,255,0.7)' : c.textTertiary }]}>
              {formatDate(meta.startAt)}
              {meta.endAt ? ` - ${formatDate(meta.endAt)}` : ''}
            </Text>
            {meta.location ? (
              <View style={styles.eventLocRow}>
                <Ionicons name="pin" size={12} color={isMe ? 'rgba(255,255,255,0.6)' : c.textTertiary} />
                <Text style={[styles.eventLoc, { color: isMe ? 'rgba(255,255,255,0.7)' : c.textTertiary }]} numberOfLines={1}>
                  {meta.location}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {msg.body ? (
          <Text style={[styles.eventDescText, { color: isMe ? 'rgba(255,255,255,0.85)' : c.text }]}>
            {msg.body}
          </Text>
        ) : null}

        <View style={styles.rsvpContainer}>
          {[
            { status: 'going', label: 'Going' },
            { status: 'maybe', label: 'Maybe' },
            { status: 'no', label: "Can't go" }
          ].map((opt) => {
            const active = myStatus === opt.status;
            return (
              <Pressable
                key={opt.status}
                onPress={() => handleRsvpEvent(msg, opt.status as any)}
                style={[
                  styles.rsvpBtn,
                  {
                    backgroundColor: active 
                      ? (isMe ? '#FFFFFF' : c.primary) 
                      : (isMe ? 'rgba(255,255,255,0.1)' : c.surfaceElevated),
                    borderColor: active 
                      ? (isMe ? '#FFFFFF' : c.primary) 
                      : (isMe ? 'rgba(255,255,255,0.2)' : c.border),
                  }
                ]}
              >
                <Text 
                  style={[
                    styles.rsvpBtnText, 
                    { 
                      color: active 
                        ? (isMe ? c.primary : '#FFFFFF') 
                        : (isMe ? '#FFFFFF' : c.text),
                      fontWeight: active ? '600' : '400'
                    }
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.rsvpCountText, { color: isMe ? 'rgba(255,255,255,0.6)' : c.textTertiary }]}>
          {going} going • {maybe + no} others
        </Text>
      </View>
    );
  }

  function MessageAttachments({ attachments, isMe }: { attachments: any[]; isMe: boolean }) {
    if (!attachments || attachments.length === 0) return null;
    
    const images = attachments.filter(a => a.type === 'image');
    const videos = attachments.filter(a => a.type === 'video');
    const files = attachments.filter(a => a.type !== 'image' && a.type !== 'video');

    return (
      <View style={styles.attachmentsContainer}>
        {/* Render Images */}
        {images.map((img, i) => (
          <Pressable key={i} onPress={() => setPreviewImage(img.url)} style={styles.imageAttachmentWrap}>
            <Image source={{ uri: img.url }} style={styles.imageAttachment} resizeMode="cover" />
          </Pressable>
        ))}

        {/* Render Videos */}
        {videos.map((vid, i) => (
          <Pressable key={i} onPress={() => handleOpenUrl(vid.url)} style={[styles.videoAttachmentWrap, { backgroundColor: isMe ? 'rgba(0,0,0,0.2)' : c.surface }]}>
            <Ionicons name="play-circle" size={30} color={isMe ? '#FFFFFF' : c.primary} style={styles.videoPlayIcon} />
            <View style={styles.videoAttachmentTextCol}>
              <Text style={[styles.attachmentName, { color: isMe ? '#FFFFFF' : c.text }]} numberOfLines={1}>
                {vid.name || 'Attached Video'}
              </Text>
              <Text style={[styles.attachmentSize, { color: isMe ? 'rgba(255,255,255,0.7)' : c.textTertiary }]}>
                Video • {vid.size ? formatFileSize(vid.size) : '1.5 MB'}
              </Text>
            </View>
          </Pressable>
        ))}

        {/* Render Files */}
        {files.map((file, i) => (
          <Pressable key={i} onPress={() => handleOpenUrl(file.url)} style={[styles.fileAttachmentWrap, { backgroundColor: isMe ? 'rgba(255,255,255,0.1)' : c.surfaceElevated, borderColor: isMe ? 'rgba(255,255,255,0.2)' : c.border }]}>
            <Ionicons name="document-text" size={20} color={isMe ? '#FFFFFF' : c.primary} />
            <View style={styles.fileAttachmentTextCol}>
              <Text style={[styles.attachmentName, { color: isMe ? '#FFFFFF' : c.text }]} numberOfLines={1}>
                {file.name || 'Attached File'}
              </Text>
              <Text style={[styles.attachmentSize, { color: isMe ? 'rgba(255,255,255,0.7)' : c.textTertiary }]}>
                {file.mimeType ? file.mimeType.split('/')[1]?.toUpperCase() : 'PDF'} • {file.size ? formatFileSize(file.size) : '350 KB'}
              </Text>
            </View>
            <Ionicons name="download-outline" size={16} color={isMe ? '#FFFFFF' : c.textTertiary} />
          </Pressable>
        ))}
      </View>
    );
  }

  const messages = messagesData ?? [];

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        if (isInitialScrollRef.current) {
          listRef.current?.scrollToEnd({ animated: false });
          isInitialScrollRef.current = false;
        } else {
          listRef.current?.scrollToEnd({ animated: true });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);
  const rawName = (channel as any)?.type === 'DM'
    ? ((channel as any)?.dmPeerName ?? (channel as any)?.name)
    : ((channel as any)?.name ?? 'Chat');
  const channelName = rawName.startsWith('#') ? rawName : `#${rawName}`;
  const canSend = text.trim().length > 0 || pendingAttachments.length > 0;
  const bgColors = isDark ? currentTheme.darkGradients : currentTheme.lightGradients;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.glowBlob, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.15)', top: '12%', left: '-15%', width: 280, height: 280, borderRadius: 140 }]} />
      <View style={[styles.glowBlob, { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.18)' : 'rgba(236, 72, 153, 0.11)', bottom: '18%', right: '-15%', width: 320, height: 320, borderRadius: 160 }]} />
      {Platform.OS !== 'web' ? (
        <BlurView intensity={isDark ? 25 : 45} tint={isDark ? 'dark' : 'default'} style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.2)' : 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(30px)' } as any]} />
      )}

      <Stack.Screen
        options={{
          title: channelName,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                paddingRight: 16,
              }}
            >
              <Ionicons name="chevron-back" size={24} color={c.text} />
              <Text style={{ color: c.text, fontSize: 16, fontFamily: 'Inter_500Medium', marginLeft: -4 }}>Back</Text>
            </TouchableOpacity>
          )
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading || (isMessagesLoading && !messagesData) ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item: any) => String(item.id)}
            renderItem={({ item }: { item: any }) => {
              const currentUserId = user?.id;
              const isMe = Boolean(
                currentUserId && (
                  (item.userId && Number(item.userId) === Number(currentUserId)) ||
                  (item.senderId && Number(item.senderId) === Number(currentUserId))
                )
              );
              const hasAttachments = item.attachments && item.attachments.length > 0;
              const isPoll = item.messageKind === 'poll';
              const isEvent = item.messageKind === 'event';
              const hasText = Boolean(item.content || item.body);
              const senderDisplayName = item.userName ?? item.senderName ?? 'User';
              const isPinned = pinnedMessagesData?.some((p: any) => Number(p.messageId) === Number(item.id));
              
              const bubbleBg = isMe 
                ? bubbleBgMe 
                : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)');
              
              const bubbleBorderColor = isMe
                ? (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)')
                : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)');

              return (
                <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                  {!isMe && <Avatar name={senderDisplayName} size={32} />}
                  <Pressable
                    onLongPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedMessage(item);
                      setShowActionsModal(true);
                    }}
                    style={({ pressed }) => [
                      styles.bubble,
                      isMe && styles.bubbleMe,
                      {
                        backgroundColor: bubbleBg,
                        borderColor: bubbleBorderColor,
                        borderWidth: 1,
                        borderTopLeftRadius: 18,
                        borderTopRightRadius: 18,
                        borderBottomRightRadius: isMe ? 4 : 18,
                        borderBottomLeftRadius: isMe ? 18 : 4,
                        opacity: pressed ? 0.95 : 1,
                      },
                    ]}
                  >
                    {!isMe && (
                      <Text style={[styles.senderName, { color: c.primary }]}>
                        {senderDisplayName}
                      </Text>
                    )}
                    
                    {hasText && !isPoll && !isEvent && (
                      <Text style={[styles.msgText, { color: isMe ? '#FFFFFF' : c.text }]}>
                        {item.content || item.body}
                      </Text>
                    )}

                    {isPoll && <MobilePollCard msg={item} isMe={isMe} />}
                    {isEvent && <MobileEventCard msg={item} isMe={isMe} />}
                    {hasAttachments && <MessageAttachments attachments={item.attachments} isMe={isMe} />}

                    {/* Render Reactions */}
                    {item.metadata?.reactions && Object.keys(item.metadata.reactions).length > 0 && (
                      <View style={styles.reactionsListContainer}>
                        {Object.entries(item.metadata.reactions as Record<string, number[]>).map(([emoji, userIds]) => {
                          const hasReacted = userIds.includes(Number(user?.id));
                          return (
                            <Pressable
                              key={emoji}
                              onPress={() => void handleToggleReaction(item, emoji)}
                              style={[
                                styles.reactionBadge,
                                {
                                  backgroundColor: hasReacted
                                    ? (isMe ? 'rgba(255, 255, 255, 0.25)' : 'rgba(99, 102, 241, 0.15)')
                                    : (isMe ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.03)'),
                                  borderColor: hasReacted
                                    ? (isMe ? '#FFFFFF' : c.primary)
                                    : (isMe ? 'rgba(255, 255, 255, 0.2)' : c.border),
                                },
                              ]}
                            >
                              <Text style={styles.reactionEmoji}>{emoji}</Text>
                              <Text style={[styles.reactionCount, { color: isMe ? '#FFFFFF' : c.text }]}>
                                {userIds.length}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4, gap: 4 }}>
                      {isPinned && (
                        <Ionicons name="pin" size={10} color={isMe ? 'rgba(255,255,255,0.7)' : c.textTertiary} style={{ marginRight: 2 }} />
                      )}
                      <Text style={[styles.msgTime, { color: isMe ? 'rgba(255,255,255,0.6)' : c.textTertiary, marginTop: 0 }]}>
                        {item.createdAt ? timeStr(item.createdAt) : ''}
                      </Text>
                      {isMe && item.status === 'sending' && (
                        <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.6)" />
                      )}
                      {isMe && item.status === 'failed' && (
                        <Ionicons name="alert-circle" size={12} color="#EF4444" />
                      )}
                    </View>
                  </Pressable>
                </View>
              );
            }}
            contentContainerStyle={[styles.listContent, { paddingBottom: spacing[2] }]}
            showsVerticalScrollIndicator={false}
            inverted={false}
            refreshControl={
              <RefreshControl refreshing={manualRefreshing} onRefresh={handleRefresh} tintColor={c.primary} />
            }
          />
        )}

        {/* Pending Attachments Preview Bar */}
        {pendingAttachments.length > 0 && (
          <View style={[styles.attachmentPreviewBar, { backgroundColor: c.surfaceElevated }]}>
            {pendingAttachments.map((att, i) => (
              <View key={i} style={[styles.attachmentChip, { backgroundColor: c.surface }]}>
                <Ionicons
                  name={att.type === 'image' ? 'image' : att.type === 'video' ? 'videocam' : 'document'}
                  size={14}
                  color={c.primary}
                />
                <Text style={[styles.attachmentChipText, { color: c.text }]} numberOfLines={1}>
                  {att.name}
                </Text>
                <Pressable onPress={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                  <Ionicons name="close-circle" size={16} color={c.textTertiary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: insets.bottom || spacing[2] },
          ]}
        >
          <Pressable
            onPress={() => setShowAttachMenu(true)}
            style={[styles.clipBtn, { backgroundColor: c.surfaceElevated }]}
          >
            <Ionicons name="attach" size={22} color={c.text} />
          </Pressable>

          <TextInput
            style={[styles.textInput, { backgroundColor: c.surfaceElevated, color: c.text }]}
            placeholder="Type a message..."
            placeholderTextColor={c.textTertiary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
          />

          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendBtn, { backgroundColor: canSend ? c.primary : c.surfaceElevated }]}
          >
            <Ionicons name="send" size={18} color={canSend ? '#FFFFFF' : c.textTertiary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Bottom Action Sheet Modal */}
      <Modal
        visible={showAttachMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <Pressable 
          style={styles.modalBackdrop} 
          onPress={() => setShowAttachMenu(false)}
        >
          <View style={[styles.bottomSheetContainer, { backgroundColor: c.surface }]}>
            <View style={[styles.bottomSheetHeaderLine, { backgroundColor: c.border }]} />
            <Text style={[styles.bottomSheetTitle, { color: c.text }]}>Actions</Text>
            
            <Pressable 
              onPress={() => {
                setShowAttachMenu(false);
                setTimeout(() => {
                  void takePhoto();
                }, 200);
              }}
              style={styles.bottomSheetRow}
            >
              <Ionicons name="camera-outline" size={20} color={c.primary} />
              <Text style={[styles.bottomSheetRowText, { color: c.text }]}>Take Photo / Video</Text>
            </Pressable>

            <Pressable 
              onPress={() => {
                setShowAttachMenu(false);
                setTimeout(() => {
                  void pickImage();
                }, 200);
              }}
              style={styles.bottomSheetRow}
            >
              <Ionicons name="image-outline" size={20} color={c.primary} />
              <Text style={[styles.bottomSheetRowText, { color: c.text }]}>Attach Photo / Video</Text>
            </Pressable>

            <Pressable 
              onPress={() => {
                setShowAttachMenu(false);
                setTimeout(() => {
                  void pickDocument();
                }, 200);
              }}
              style={styles.bottomSheetRow}
            >
              <Ionicons name="document-text-outline" size={20} color={c.primary} />
              <Text style={[styles.bottomSheetRowText, { color: c.text }]}>Attach Document</Text>
            </Pressable>

            <Pressable 
              onPress={() => { 
                setShowAttachMenu(false); 
                setPollQuestion('');
                setPollOptions(['', '']);
                setPollAllowMultiple(false);
                setShowPollModal(true); 
              }}
              style={styles.bottomSheetRow}
            >
              <Ionicons name="bar-chart-outline" size={20} color={c.primary} />
              <Text style={[styles.bottomSheetRowText, { color: c.text }]}>Create Poll</Text>
            </Pressable>

            <Pressable 
              onPress={() => { 
                setShowAttachMenu(false); 
                const tom = new Date();
                tom.setDate(tom.getDate() + 1);
                tom.setHours(10, 0, 0, 0);
                const tomEnd = new Date(tom.getTime() + 60 * 60 * 1000);
                
                const pad = (n: number) => n.toString().padStart(2, '0');
                const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                
                setEventTitle('');
                setEventDesc('');
                setEventLocation('');
                setEventStartAt(fmt(tom));
                setEventEndAt(fmt(tomEnd));
                setShowEventModal(true); 
              }}
              style={styles.bottomSheetRow}
            >
              <Ionicons name="calendar-outline" size={20} color={c.primary} />
              <Text style={[styles.bottomSheetRowText, { color: c.text }]}>Create Event</Text>
            </Pressable>

            <Pressable 
              onPress={() => setShowAttachMenu(false)}
              style={[styles.bottomSheetRow, styles.bottomSheetCancelRow]}
            >
              <Text style={[styles.bottomSheetCancelText, { color: c.textTertiary }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>



      {/* Create Poll Modal */}
      <Modal
        visible={showPollModal}
        animationType="slide"
        onRequestClose={() => setShowPollModal(false)}
      >
        <View style={[styles.modalWrapper, { backgroundColor: c.background, paddingTop: insets.top }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <Pressable
              onPress={() => setShowPollModal(false)}
              style={{ padding: 10, marginLeft: -10 }}
            >
              <Ionicons name="close" size={26} color={c.text} />
            </Pressable>
            <Text style={[styles.modalHeaderTitle, { color: c.text }]}>New Poll</Text>
            <Pressable 
              onPress={handleCreatePoll}
              disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim() !== '').length < 2}
              style={{ padding: 10, marginRight: -10 }}
            >
              <Text 
                style={[
                  styles.modalHeaderAction, 
                  { 
                    color: (pollQuestion.trim() && pollOptions.filter(o => o.trim() !== '').length >= 2) 
                      ? c.primary 
                      : c.textTertiary 
                  }
                ]}
              >
                Create
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.formLabel, { color: c.text }]}>QUESTION</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: c.surfaceElevated, color: c.text, borderColor: c.border }]}
              placeholder="What would you like to ask?"
              placeholderTextColor={c.textTertiary}
              value={pollQuestion}
              onChangeText={setPollQuestion}
            />

            <Text style={[styles.formLabel, { color: c.text, marginTop: spacing[4] }]}>OPTIONS</Text>
            {pollOptions.map((opt, idx) => (
              <View key={idx} style={styles.optionInputRow}>
                <TextInput
                  style={[styles.formInput, { flex: 1, backgroundColor: c.surfaceElevated, color: c.text, borderColor: c.border, marginBottom: spacing[2] }]}
                  placeholder={`Option ${idx + 1}`}
                  placeholderTextColor={c.textTertiary}
                  value={opt}
                  onChangeText={(val) => {
                    const next = [...pollOptions];
                    next[idx] = val;
                    setPollOptions(next);
                  }}
                />
                {pollOptions.length > 2 && (
                  <Pressable 
                    onPress={() => setPollOptions(prev => prev.filter((_, i) => i !== idx))}
                    style={{ marginLeft: spacing[2], alignSelf: 'center', marginBottom: spacing[2] }}
                  >
                    <Ionicons name="trash-outline" size={20} color="red" />
                  </Pressable>
                )}
              </View>
            ))}

            {pollOptions.length < 6 && (
              <TouchableOpacity
                onPress={() => setPollOptions(prev => [...prev, ''])}
                style={[styles.addOptionBtn, { borderColor: c.border }]}
              >
                <Ionicons name="add" size={16} color={c.primary} />
                <Text style={{ color: c.primary, fontWeight: '600', marginLeft: spacing[1] }}>Add option</Text>
              </TouchableOpacity>
            )}

            <View style={[styles.switchRow, { borderTopColor: c.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: c.text }]}>Allow Multiple Choices</Text>
                <Text style={[styles.switchSub, { color: c.textTertiary }]}>Allow members to vote on more than one option</Text>
              </View>
              <Switch
                value={pollAllowMultiple}
                onValueChange={setPollAllowMultiple}
                trackColor={{ false: c.border, true: c.primary }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Create Event Modal */}
      <Modal
        visible={showEventModal}
        animationType="slide"
        onRequestClose={() => setShowEventModal(false)}
      >
        <View style={[styles.modalWrapper, { backgroundColor: c.background, paddingTop: insets.top }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <Pressable
              onPress={() => setShowEventModal(false)}
              style={{ padding: 10, marginLeft: -10 }}
            >
              <Ionicons name="close" size={26} color={c.text} />
            </Pressable>
            <Text style={[styles.modalHeaderTitle, { color: c.text }]}>New Event</Text>
            <Pressable 
              onPress={handleCreateEvent}
              disabled={!eventTitle.trim()}
              style={{ padding: 10, marginRight: -10 }}
            >
              <Text 
                style={[
                  styles.modalHeaderAction, 
                  { color: eventTitle.trim() ? c.primary : c.textTertiary }
                ]}
              >
                Create
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.formLabel, { color: c.text }]}>EVENT TITLE</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: c.surfaceElevated, color: c.text, borderColor: c.border }]}
              placeholder="What is the event name?"
              placeholderTextColor={c.textTertiary}
              value={eventTitle}
              onChangeText={setEventTitle}
            />

            <Text style={[styles.formLabel, { color: c.text, marginTop: spacing[4] }]}>DESCRIPTION</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: c.surfaceElevated, color: c.text, borderColor: c.border, height: 80, textAlignVertical: 'top' }]}
              placeholder="Describe the details (optional)"
              placeholderTextColor={c.textTertiary}
              value={eventDesc}
              onChangeText={setEventDesc}
              multiline
            />

            <Text style={[styles.formLabel, { color: c.text, marginTop: spacing[4] }]}>LOCATION</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: c.surfaceElevated, color: c.text, borderColor: c.border }]}
              placeholder="Where is the event? (e.g. Conference Room A, Zoom)"
              placeholderTextColor={c.textTertiary}
              value={eventLocation}
              onChangeText={setEventLocation}
            />

            <Text style={[styles.formLabel, { color: c.text, marginTop: spacing[4] }]}>START DATE & TIME</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: c.surfaceElevated, color: c.text, borderColor: c.border }]}
              placeholder="YYYY-MM-DD HH:MM (e.g. 2026-06-20 14:00)"
              placeholderTextColor={c.textTertiary}
              value={eventStartAt}
              onChangeText={setEventStartAt}
            />

            <Text style={[styles.formLabel, { color: c.text, marginTop: spacing[4] }]}>END DATE & TIME</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: c.surfaceElevated, color: c.text, borderColor: c.border }]}
              placeholder="YYYY-MM-DD HH:MM (optional)"
              placeholderTextColor={c.textTertiary}
              value={eventEndAt}
              onChangeText={setEventEndAt}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={previewImage !== null}
        transparent={true}
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.fullscreenImageWrap}>
          <Pressable style={styles.imageBackdropClose} onPress={() => setPreviewImage(null)}>
            {previewImage && (
              <Image source={{ uri: previewImage }} style={styles.fullscreenImage} resizeMode="contain" />
            )}
          </Pressable>
          <Pressable style={[styles.closePreviewBtn, { top: Math.max(20, insets.top + 10) }]} onPress={() => setPreviewImage(null)}>
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>

      {/* Message Actions Modal */}
      <Modal
        visible={showActionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionsModal(false)}
      >
        <Pressable 
          style={styles.modalBackdrop} 
          onPress={() => setShowActionsModal(false)}
        >
          <View style={[styles.bottomSheetContainer, { backgroundColor: c.surface }]}>
            <View style={[styles.bottomSheetHeaderLine, { backgroundColor: c.border }]} />
            
            {selectedMessage && (
              <>
                <View style={styles.actionSheetMsgPreview}>
                  <Text style={[styles.actionSheetMsgSender, { color: c.textTertiary }]}>
                    {selectedMessage.userName ?? selectedMessage.senderName ?? 'Teammate'}
                  </Text>
                  <Text style={[styles.actionSheetMsgBody, { color: c.text }]} numberOfLines={2}>
                    {selectedMessage.body || selectedMessage.content || (selectedMessage.attachments?.length ? '📎 Attachment' : 'Message')}
                  </Text>
                </View>

                {/* Quick Reactions Row */}
                <Text style={[styles.actionSheetSectionTitle, { color: c.textTertiary }]}>Reactions</Text>
                <View style={styles.quickReactionsRow}>
                  {['👍', '❤️', '😂', '🎉'].map((emoji) => {
                    const userIds = selectedMessage.metadata?.reactions?.[emoji] ?? [];
                    const hasReacted = userIds.includes(Number(user?.id));
                    return (
                      <Pressable
                        key={emoji}
                        onPress={() => {
                          setShowActionsModal(false);
                          void handleToggleReaction(selectedMessage, emoji);
                        }}
                        style={[
                          styles.quickReactionBtn,
                          {
                            backgroundColor: hasReacted
                              ? 'rgba(99, 102, 241, 0.12)'
                              : c.surfaceElevated,
                            borderColor: hasReacted ? c.primary : c.border,
                          },
                        ]}
                      >
                        <Text style={styles.quickReactionEmoji}>{emoji}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={[styles.divider, { backgroundColor: c.borderSubtle }]} />

                {/* Pin Action */}
                <Pressable
                  onPress={async () => {
                    setShowActionsModal(false);
                    const isPinned = pinnedMessagesData?.some((p: any) => Number(p.messageId) === Number(selectedMessage.id));
                    try {
                      if (isPinned) {
                        await unpinMutation.mutateAsync({
                          id: Number(id),
                          messageId: selectedMessage.id,
                        });
                      } else {
                        await pinMutation.mutateAsync({
                          id: Number(id),
                          messageId: selectedMessage.id,
                        });
                      }
                      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      queryClient.invalidateQueries({ queryKey: ['channel-pins', id] });
                    } catch (err) {
                      console.error('[pin/unpin failed]', err);
                      Alert.alert('Error', `Failed to ${isPinned ? 'unpin' : 'pin'} message.`);
                    }
                  }}
                  style={styles.bottomSheetRow}
                >
                  <Ionicons
                    name={pinnedMessagesData?.some((p: any) => Number(p.messageId) === Number(selectedMessage.id)) ? "pin-outline" : "pin"}
                    size={20}
                    color={c.primary}
                  />
                  <Text style={[styles.bottomSheetRowText, { color: c.text }]}>
                    {pinnedMessagesData?.some((p: any) => Number(p.messageId) === Number(selectedMessage.id)) ? "Unpin Message" : "Pin Message"}
                  </Text>
                </Pressable>

                {/* Delete Action (only if me, or channel admins/owners) */}
                <Pressable
                  onPress={() => {
                    setShowActionsModal(false);
                    Alert.alert(
                      'Delete Message',
                      'Are you sure you want to delete this message?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await deleteMutation.mutateAsync({
                                id: Number(id),
                                messageId: selectedMessage.id,
                              });
                              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                              queryClient.invalidateQueries({ queryKey: ['channel-messages', id] });
                              queryClient.invalidateQueries({ queryKey: ['channel', id] });
                            } catch (err) {
                              console.error('[delete failed]', err);
                              Alert.alert('Error', 'Failed to delete message.');
                            }
                          },
                        },
                      ]
                    );
                  }}
                  style={styles.bottomSheetRow}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={[styles.bottomSheetRowText, { color: '#EF4444' }]}>Delete Message</Text>
                </Pressable>
              </>
            )}
            
            <Pressable 
              onPress={() => setShowActionsModal(false)}
              style={[styles.bottomSheetRow, { borderTopWidth: 1, borderTopColor: c.borderSubtle }]}
            >
              <Text style={[styles.bottomSheetRowText, { color: c.textTertiary, textAlign: 'center', flex: 1 }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glowBlob: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.8,
  },
  devicePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  devicePickerBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: { padding: spacing[4] },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    marginBottom: spacing[2],
    maxWidth: '80%',
  },
  msgRowMe: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  bubble: {
    borderRadius: radius.lg,
    padding: spacing[3],
    maxWidth: '100%',
  },
  bubbleMe: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 1.5,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
      } as any,
    }),
  },
  senderName: {
    ...typography.tiny,
    marginBottom: 2,
  },
  msgText: {
    ...typography.body,
  },
  msgTime: {
    ...typography.tiny,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 0.5,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  pollCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[3],
    marginTop: spacing[2],
    width: 250,
  },
  pollQuestion: {
    ...typography.body,
    fontWeight: 'bold',
    marginBottom: spacing[2],
  },
  pollOptionsContainer: {
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  pollOptionBtn: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    position: 'relative',
    overflow: 'hidden',
  },
  pollOptionProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  pollOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pollOptionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pollOptionLabel: {
    ...typography.caption,
  },
  pollOptionPct: {
    ...typography.tiny,
    marginLeft: spacing[2],
  },
  pollFooter: {
    marginTop: spacing[2],
    borderTopWidth: 0.5,
    paddingTop: spacing[2],
  },
  pollFooterText: {
    ...typography.tiny,
  },
  
  eventCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[3],
    marginTop: spacing[2],
    width: 250,
  },
  eventHeader: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  eventHeaderInfo: {
    flex: 1,
  },
  eventTitle: {
    ...typography.body,
    fontWeight: 'bold',
  },
  eventTime: {
    ...typography.tiny,
    marginTop: 2,
  },
  eventLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  eventLoc: {
    ...typography.tiny,
  },
  eventDescText: {
    ...typography.caption,
    marginVertical: spacing[2],
  },
  rsvpContainer: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  rsvpBtn: {
    flex: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingVertical: 6,
    alignItems: 'center',
  },
  rsvpBtnText: {
    ...typography.tiny,
  },
  rsvpCountText: {
    ...typography.tiny,
    marginTop: spacing[2],
  },
  
  attachmentsContainer: {
    marginTop: spacing[2],
    gap: spacing[2],
    maxWidth: 250,
  },
  imageAttachmentWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    height: 150,
    width: '100%',
  },
  imageAttachment: {
    width: '100%',
    height: '100%',
  },
  videoAttachmentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing[2],
    gap: spacing[2],
  },
  videoPlayIcon: {
    alignSelf: 'center',
  },
  videoAttachmentTextCol: {
    flex: 1,
  },
  fileAttachmentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[2],
    gap: spacing[2],
  },
  fileAttachmentTextCol: {
    flex: 1,
  },
  attachmentName: {
    ...typography.caption,
    fontWeight: '600',
  },
  attachmentSize: {
    ...typography.tiny,
  },
  
  clipBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  attachmentPreviewBar: {
    flexDirection: 'row',
    padding: spacing[2],
    gap: spacing[2],
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    gap: spacing[1],
    maxWidth: 150,
  },
  attachmentChipText: {
    ...typography.tiny,
    flex: 1,
  },
  
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[6],
  },
  bottomSheetHeaderLine: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: spacing[3],
  },
  bottomSheetTitle: {
    ...typography.body,
    fontWeight: 'bold',
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  bottomSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    gap: spacing[3],
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
  },
  bottomSheetRowText: {
    ...typography.body,
  },
  bottomSheetCancelRow: {
    marginTop: spacing[2],
    justifyContent: 'center',
  },
  bottomSheetCancelText: {
    ...typography.body,
    fontWeight: '600',
  },
  
  fullscreenModalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  pickerModalContainer: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing[4],
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  pickerTitle: {
    ...typography.body,
    fontWeight: 'bold',
  },
  pickerScroll: {
    flex: 1,
  },
  pickerSectionLabel: {
    ...typography.tiny,
    fontWeight: 'bold',
    marginBottom: spacing[2],
    letterSpacing: 1,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    gap: spacing[3],
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  presetTextCol: {
    flex: 1,
  },
  presetName: {
    ...typography.caption,
    fontWeight: '500',
  },
  presetSub: {
    ...typography.tiny,
    marginTop: 2,
  },
  pickerSeparator: {
    height: 1,
    marginVertical: spacing[4],
  },
  customFileForm: {
    gap: spacing[2],
  },
  modalInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    ...typography.body,
  },
  customFileBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  
  modalWrapper: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: spacing[3],
    borderBottomWidth: 0.5,
  },
  modalHeaderTitle: {
    ...typography.body,
    fontWeight: 'bold',
  },
  modalHeaderAction: {
    ...typography.body,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing[4],
  },
  formLabel: {
    ...typography.tiny,
    fontWeight: 'bold',
    marginBottom: spacing[2],
    letterSpacing: 1,
  },
  formInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    ...typography.body,
    marginBottom: spacing[3],
  },
  optionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing[2],
    marginBottom: spacing[4],
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    borderTopWidth: 0.5,
    marginTop: spacing[2],
  },
  switchLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  switchSub: {
    ...typography.tiny,
    marginTop: 2,
  },
  
  fullscreenImageWrap: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBackdropClose: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
  closePreviewBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  reactionsListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 4,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  actionSheetMsgPreview: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    borderRadius: radius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(99, 102, 241, 0.5)',
  },
  actionSheetMsgSender: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  actionSheetMsgBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  actionSheetSectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: spacing[4],
    marginTop: spacing[2],
    marginBottom: spacing[1],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickReactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    marginBottom: spacing[2],
  },
  quickReactionBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickReactionEmoji: {
    fontSize: 24,
  },
  divider: {
    height: 1,
    marginVertical: spacing[2],
  },
});
