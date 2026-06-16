import React from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, typography, spacing } from '@/theme';
import { useListProjects, type Project } from '@workspace/api-client-react';
import { ProjectCard } from '@/components/ProjectCard';
import { EmptyState } from '@/components/ui';

export default function ProjectsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: projects, isLoading, refetch, isRefetching } = useListProjects(undefined, {
    query: { queryKey: ['projects'] },
  });

  const renderItem = ({ item }: { item: Project }) => (
    <ProjectCard
      name={item.name}
      status={item.status}
      progress={item.progress}
      priority={item.priority}
      teamName={item.teamName}
      deadline={item.deadline}
      onPress={() => router.push(`/(stack)/project/${item.id}`)}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Text style={[styles.title, { color: c.text }]}>Projects</Text>
        <Text style={[styles.count, { color: c.textTertiary }]}>
          {projects?.length ?? 0} total
        </Text>
      </View>

      <FlatList
        data={projects ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
          (!projects || projects.length === 0) && styles.emptyContainer,
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={c.primary} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="folder-open-outline"
              title="No projects yet"
              subtitle="Projects will appear here once created"
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  title: { ...typography.h2 },
  count: { ...typography.caption },
  listContent: { paddingHorizontal: spacing[4] },
  emptyContainer: { flex: 1 },
});
