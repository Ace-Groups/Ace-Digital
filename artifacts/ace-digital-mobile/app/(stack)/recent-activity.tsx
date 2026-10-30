import React from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme, typography, spacing } from '@/theme';
import { useListActivity } from '@workspace/api-client-react';

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function RecentActivityScreen() {
  const { c } = useTheme();

  const { data: activities, isLoading, refetch, isRefetching } = useListActivity(undefined, {
    query: {
      queryKey: ['activity-list'],
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Recent Activity' }} />
      <View style={[styles.container, { backgroundColor: c.background }]}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        ) : (
          <FlatList
            data={activities}
            keyExtractor={(item: any) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={c.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: c.textTertiary }]}>No recent activity found.</Text>
              </View>
            }
            renderItem={({ item }: { item: any }) => (
              <View style={[styles.activityItem, { borderBottomColor: c.borderSubtle }]}>
                <View style={[styles.activityDot, { backgroundColor: c.primary }]} />
                <View style={styles.activityContent}>
                  <Text style={[styles.activityText, { color: c.text }]} numberOfLines={2}>
                    <Text style={{ fontWeight: '600' }}>
                      {item.actorName ?? 'System'}
                    </Text>
                    {' '}{item.action?.replace(/_/g, ' ')} {item.entityType?.replace(/_/g, ' ')}
                  </Text>
                  <Text style={[styles.activityTime, { color: c.textTertiary }]}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing[4],
  },
  emptyContainer: {
    padding: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[4],
    borderBottomWidth: 0.5,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: spacing[3],
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    ...typography.caption,
    lineHeight: 18,
  },
  activityTime: {
    ...typography.tiny,
    marginTop: 4,
  },
});
