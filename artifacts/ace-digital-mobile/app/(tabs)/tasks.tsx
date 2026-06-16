import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, typography, spacing, radius } from '@/theme';
import { useListTasks, type Task } from '@workspace/api-client-react';
import { TaskCard } from '@/components/TaskCard';
import { EmptyState } from '@/components/ui';

type Filter = 'all' | 'mine' | 'pending' | 'in-progress' | 'completed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

export default function TasksScreen() {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: tasks, isLoading, refetch, isRefetching } = useListTasks(undefined, {
    query: { queryKey: ['tasks'] },
  });

  const filtered = useMemo(() => {
    if (!tasks) return [];
    if (filter === 'all') return tasks;
    return tasks.filter((t) => t.status.toLowerCase().replace(/\s/g, '-') === filter);
  }, [tasks, filter]);

  const renderItem = ({ item }: { item: Task }) => (
    <TaskCard
      title={item.title}
      projectName={item.projectName}
      assigneeName={item.assigneeName}
      priority={item.priority}
      status={item.status}
      dueDate={item.dueDate}
      onPress={() => router.push(`/(stack)/task/${item.id}`)}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Text style={[styles.title, { color: c.text }]}>Tasks</Text>
        <Text style={[styles.count, { color: c.textTertiary }]}>
          {filtered.length} {filter === 'all' ? 'total' : filter}
        </Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.chip,
              {
                backgroundColor: filter === f.key ? c.primary : c.surfaceElevated,
                borderColor: filter === f.key ? c.primary : c.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: filter === f.key ? '#FFFFFF' : c.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Task List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
          filtered.length === 0 && styles.emptyContainer,
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={c.primary} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="checkbox-outline"
              title="No tasks found"
              subtitle={filter !== 'all' ? 'Try a different filter' : 'Tasks will appear here'}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  title: {
    ...typography.h2,
  },
  count: {
    ...typography.caption,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    ...typography.captionMedium,
  },
  listContent: {
    paddingHorizontal: spacing[4],
  },
  emptyContainer: {
    flex: 1,
  },
});
