import React from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useGetDashboard } from '@workspace/api-client-react';
import { StatCard } from '@/components/StatCard';
import { Card, Avatar, Badge } from '@/components/ui';

function formatCurrency(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

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

export default function HomeScreen() {
  const { c, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [manualRefreshing, setManualRefreshing] = React.useState(false);

  const { data, isLoading, refetch, isRefetching } = useGetDashboard({
    query: { queryKey: ['dashboard'] },
  });

  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setManualRefreshing(false);
    }
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing[4], paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={manualRefreshing} onRefresh={handleRefresh} tintColor={c.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: c.textSecondary }]}>{greeting}</Text>
            <Text style={[styles.name, { color: c.text }]}>{user?.fullName?.split(' ')[0] ?? 'User'}</Text>
          </View>
          <Avatar uri={user?.avatarUrl} name={user?.fullName ?? 'User'} size={48} />
        </View>

        {/* Stat Cards Grid */}
        {data && (
          <>
            <View style={styles.statsRow}>
              <StatCard
                title="Active Projects"
                value={data.activeProjectsCount}
                icon="folder-open"
                gradient={isDark ? ['rgba(99,102,241,0.2)', 'rgba(99,102,241,0.05)'] : ['rgba(99,102,241,0.1)', 'rgba(99,102,241,0.02)']}
              />
              <StatCard
                title="My Tasks"
                value={data.myOpenTasksCount ?? 0}
                icon="checkbox-outline"
                gradient={isDark ? ['rgba(16,185,129,0.2)', 'rgba(16,185,129,0.05)'] : ['rgba(16,185,129,0.1)', 'rgba(16,185,129,0.02)']}
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                title="Employees"
                value={data.employeeCount}
                icon="people"
                gradient={isDark ? ['rgba(139,92,246,0.2)', 'rgba(139,92,246,0.05)'] : ['rgba(139,92,246,0.1)', 'rgba(139,92,246,0.02)']}
              />
              <StatCard
                title="Pending Approvals"
                value={data.pendingApprovalsCount}
                icon="time"
                gradient={isDark ? ['rgba(245,158,11,0.2)', 'rgba(245,158,11,0.05)'] : ['rgba(245,158,11,0.1)', 'rgba(245,158,11,0.02)']}
              />
            </View>
          </>
        )}

        {/* Upcoming Deadlines */}
        {data?.upcomingDeadlines && data.upcomingDeadlines.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Upcoming Deadlines</Text>
            {data.upcomingDeadlines.slice(0, 5).map((project) => (
              <Card key={project.id} style={{ marginBottom: spacing[2] }}>
                <View style={styles.deadlineRow}>
                  <View style={styles.deadlineContent}>
                    <Text style={[styles.deadlineName, { color: c.text }]} numberOfLines={1}>
                      {project.name}
                    </Text>
                    <Text style={[styles.deadlineDate, { color: c.textTertiary }]}>
                      {project.deadline
                        ? new Date(project.deadline).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'No deadline'}
                    </Text>
                  </View>
                  <Badge
                    label={project.status.replace(/[-_]/g, ' ')}
                    variant={project.status === 'active' ? 'success' : 'default'}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Loading State */}
        {isLoading && !data && (
          <View style={styles.loadingSection}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[styles.skeleton, { backgroundColor: c.shimmer }]}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...typography.caption,
    marginBottom: 2,
  },
  name: {
    ...typography.h2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  section: {
    marginTop: spacing[4],
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing[3],
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deadlineContent: {
    flex: 1,
    marginRight: spacing[2],
  },
  deadlineName: {
    ...typography.bodyMedium,
  },
  deadlineDate: {
    ...typography.caption,
    marginTop: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[3],
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
  },
  activityTime: {
    ...typography.tiny,
    marginTop: 2,
  },
  loadingSection: {
    marginTop: spacing[4],
    gap: spacing[3],
  },
  skeleton: {
    height: 80,
    borderRadius: 12,
  },
});
