import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing, radius } from '@/theme';
import { useGetChannel, useSendMessage } from '@workspace/api-client-react';
import { Avatar } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

function timeStr(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function ChannelDetailScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  const { data: channel, isLoading } = useGetChannel(Number(id), {
    query: { queryKey: ['channel', id], enabled: !!id },
  });

  const sendMutation = useSendMessage();

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !id) return;
    setText('');
    try {
      await sendMutation.mutateAsync({ id: Number(id), data: { body: trimmed } });
    } catch {
      // message send failed silently
    }
  };

  const messages = (channel as any)?.messages ?? [];
  const channelName = (channel as any)?.name ?? 'Chat';

  return (
    <>
      <Stack.Screen options={{ title: channelName.startsWith('#') ? channelName : `#${channelName}` }} />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: c.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item: any) => String(item.id)}
            renderItem={({ item }: { item: any }) => {
              const isMe = item.userId === user?.id;
              return (
                <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                  {!isMe && <Avatar name={item.userName ?? 'User'} size={32} />}
                  <View
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: isMe ? c.primary : c.surfaceElevated,
                        borderBottomRightRadius: isMe ? 4 : radius.lg,
                        borderBottomLeftRadius: isMe ? radius.lg : 4,
                      },
                    ]}
                  >
                    {!isMe && (
                      <Text style={[styles.senderName, { color: c.primaryText }]}>
                        {item.userName}
                      </Text>
                    )}
                    <Text style={[styles.msgText, { color: isMe ? '#FFFFFF' : c.text }]}>
                      {item.content}
                    </Text>
                    <Text style={[styles.msgTime, { color: isMe ? 'rgba(255,255,255,0.6)' : c.textTertiary }]}>
                      {item.createdAt ? timeStr(item.createdAt) : ''}
                    </Text>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={[styles.listContent, { paddingBottom: spacing[2] }]}
            showsVerticalScrollIndicator={false}
            inverted={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: insets.bottom || spacing[2] },
          ]}
        >
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
            disabled={!text.trim()}
            style={[styles.sendBtn, { backgroundColor: text.trim() ? c.primary : c.surfaceElevated }]}
          >
            <Ionicons name="send" size={18} color={text.trim() ? '#FFFFFF' : c.textTertiary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
});
