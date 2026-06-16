import React from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing, radius } from '@/theme';
import { useListChannels } from '@workspace/api-client-react';
import { Avatar, EmptyState } from '@/components/ui';

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function ChatScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: channels, isLoading, refetch, isRefetching } = useListChannels({
    query: { queryKey: ['channels'] },
  });

  const renderItem = ({ item }: { item: any }) => {
    const isGeneral = item.name?.toLowerCase() === 'general';
    const icon = item.type === 'dm' ? 'person' : isGeneral ? 'megaphone' : 'chatbubble-ellipses';

    return (
      <Pressable
        onPress={() => router.push(`/(stack)/channel/${item.id}`)}
        style={({ pressed }) => [
          styles.channelItem,
          { backgroundColor: pressed ? c.surfacePressed : 'transparent', borderBottomColor: c.borderSubtle },
        ]}
      >
        <View style={[styles.channelIcon, { backgroundColor: c.primaryLight }]}>
          <Ionicons name={icon} size={20} color={c.primaryText} />
        </View>
        <View style={styles.channelContent}>
          <View style={styles.channelHeader}>
            <Text style={[styles.channelName, { color: c.text }]} numberOfLines={1}>
              {item.type === 'dm' ? item.otherUserName ?? item.name : `#${item.name}`}
            </Text>
            {item.lastMessageAt && (
              <Text style={[styles.channelTime, { color: c.textTertiary }]}>
                {timeAgo(item.lastMessageAt)}
              </Text>
            )}
          </View>
          {item.lastMessage && (
            <Text style={[styles.channelPreview, { color: c.textSecondary }]} numberOfLines={1}>
              {item.lastMessage}
            </Text>
          )}
        </View>
        {item.unreadCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: c.primary }]}>
            <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Text style={[styles.title, { color: c.text }]}>Chat</Text>
      </View>

      <FlatList
        data={channels ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          { paddingBottom: insets.bottom + 100 },
          (!channels || channels.length === 0) && styles.emptyContainer,
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={c.primary} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="chatbubbles-outline"
              title="No channels yet"
              subtitle="Chat channels will appear here"
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  title: { ...typography.h2 },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 0.5,
  },
  channelIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  channelContent: {
    flex: 1,
    marginRight: spacing[2],
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelName: {
    ...typography.bodyMedium,
    flex: 1,
  },
  channelTime: {
    ...typography.tiny,
    marginLeft: spacing[2],
  },
  channelPreview: {
    ...typography.caption,
    marginTop: 2,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: { flex: 1 },
});
