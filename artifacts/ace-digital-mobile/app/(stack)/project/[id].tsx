import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useTheme, typography, spacing, radius } from '@/theme';
import { useGetProject, useListTasks } from '@workspace/api-client-react';
import { Card, Badge } from '@/components/ui';
import { TaskCard } from '@/components/TaskCard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const STATUS_COLOR: Record<string, string> = {
  active: '#10B981', 
  'in-progress': '#6366F1', 
  planning: '#F59E0B',
  completed: '#06B6D4', 
  'on-hold': '#94A3B8',
};

const STATUS_GRADIENT: Record<string, [string, string]> = {
  active: ['#10B981', '#047857'],
  'in-progress': ['#6366F1', '#4338CA'],
  planning: ['#F59E0B', '#B45309'],
  completed: ['#06B6D4', '#0891B2'],
  'on-hold': ['#94A3B8', '#475569'],
};

export default function ProjectDetailScreen() {
  const { c, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: project, isLoading: isProjectLoading } = useGetProject(Number(id), {
    query: { queryKey: ['project', id], enabled: !!id },
  });

  const { data: tasks, isLoading: isTasksLoading } = useListTasks(
    { projectId: Number(id) },
    {
      query: {
        queryKey: ['tasks', { projectId: Number(id) }],
        enabled: !!id,
      },
    }
  );

  const taskStats = useMemo(() => {
    if (!tasks) return { pending: 0, inProgress: 0, completed: 0, total: 0 };
    const pending = tasks.filter(t => t.status === 'PENDING').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const completed = tasks.filter(t => t.status === 'DONE').length;
    return { pending, inProgress, completed, total: tasks.length };
  }, [tasks]);

  if (isProjectLoading || !project) {
    return (
      <>
        <Stack.Screen options={{ title: 'Project' }} />
        <View style={[styles.loading, { backgroundColor: c.background }]}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </>
    );
  }

  const statusKey = project.status?.toLowerCase() || 'planning';
  const progressColor = STATUS_COLOR[statusKey] ?? c.primary;
  const headerGradient = STATUS_GRADIENT[statusKey] || [c.primary, c.primary];

  return (
    <>
      <Stack.Screen options={{ title: project.name }} />
      <ScrollView
        style={[styles.container, { backgroundColor: c.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Header Card */}
        <View style={styles.bannerContainer}>
          <LinearGradient colors={headerGradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerClient}>{project.clientName || 'Internal Project'}</Text>
            <Text style={styles.bannerTitle}>{project.name}</Text>
            <View style={styles.bannerBadges}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {project.status.replace(/[-_]/g, ' ').toUpperCase()}
                </Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: project.priority.toLowerCase() === 'high' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.priorityBadgeText}>
                  {project.priority.toUpperCase()} PRIORITY
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        {project.description && (
          <View style={[styles.descBox, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
            <Text style={[styles.descTitle, { color: c.textTertiary }]}>ABOUT THE PROJECT</Text>
            <Text style={[styles.description, { color: c.textSecondary }]}>{project.description}</Text>
          </View>
        )}

        {/* Progress & Budget Metrics Row */}
        <View style={styles.metricsRow}>
          <Card style={{ ...styles.metricCard, flex: 1 }}>
            <View style={styles.metricHeader}>
              <Ionicons name="trending-up" size={18} color={progressColor} />
              <Text style={[styles.metricLabel, { color: c.textTertiary }]}>PROGRESS</Text>
            </View>
            <Text style={[styles.metricValue, { color: c.text }]}>{project.progress}%</Text>
            <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={[styles.progressFill, { width: `${project.progress}%`, backgroundColor: progressColor }]} />
            </View>
          </Card>

          {project.budget != null && (
            <Card style={{ ...styles.metricCard, flex: 1 }}>
              <View style={styles.metricHeader}>
                <Ionicons name="wallet-outline" size={18} color="#10B981" />
                <Text style={[styles.metricLabel, { color: c.textTertiary }]}>BUDGET</Text>
              </View>
              <Text style={[styles.metricValue, { color: c.text }]}>
                ₹{project.budget.toLocaleString('en-IN')}
              </Text>
              <Text style={[styles.metricSub, { color: c.textTertiary }]}>Allocated funds</Text>
            </Card>
          )}
        </View>

        {/* Meta Info list */}
        <Card style={styles.detailsCard}>
          {project.teamName && (
            <View style={[styles.detailRow, { borderBottomColor: c.border }]}>
              <View style={styles.detailLeft}>
                <Ionicons name="people-outline" size={18} color={c.textTertiary} />
                <Text style={[styles.detailLabel, { color: c.textTertiary }]}>Team</Text>
              </View>
              <Text style={[styles.detailValue, { color: c.text }]}>{project.teamName}</Text>
            </View>
          )}
          {project.clientName && (
            <View style={[styles.detailRow, { borderBottomColor: c.border }]}>
              <View style={styles.detailLeft}>
                <Ionicons name="business-outline" size={18} color={c.textTertiary} />
                <Text style={[styles.detailLabel, { color: c.textTertiary }]}>Client</Text>
              </View>
              <Text style={[styles.detailValue, { color: c.text }]}>{project.clientName}</Text>
            </View>
          )}
          {project.deadline && (
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Ionicons name="calendar-outline" size={18} color={c.textTertiary} />
                <Text style={[styles.detailLabel, { color: c.textTertiary }]}>Deadline</Text>
              </View>
              <Text style={[styles.detailValue, { color: c.text }]}>
                {new Date(project.deadline).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </Text>
            </View>
          )}
        </Card>

        {/* Associated Tasks Section */}
        <View style={styles.tasksSection}>
          <View style={styles.tasksHeader}>
            <Text style={[styles.tasksTitle, { color: c.text }]}>Associated Tasks</Text>
            <View style={[styles.tasksCountBadge, { backgroundColor: c.primary }]}>
              <Text style={styles.tasksCountBadgeText}>{taskStats.total}</Text>
            </View>
          </View>

          {/* Task Stats Breakdown */}
          {taskStats.total > 0 && (
            <View style={styles.statsRow}>
              <View style={[styles.statBadge, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                <Text style={[styles.statBadgeText, { color: c.textSecondary }]}>
                  {taskStats.pending} Pending
                </Text>
              </View>
              <View style={[styles.statBadge, { backgroundColor: '#6366F120' }]}>
                <Text style={[styles.statBadgeText, { color: '#6366F1' }]}>
                  {taskStats.inProgress} In Progress
                </Text>
              </View>
              <View style={[styles.statBadge, { backgroundColor: '#10B98120' }]}>
                <Text style={[styles.statBadgeText, { color: '#10B981' }]}>
                  {taskStats.completed} Completed
                </Text>
              </View>
            </View>
          )}

          {isTasksLoading ? (
            <ActivityIndicator size="small" color={c.primary} style={{ marginTop: spacing[4] }} />
          ) : !tasks || tasks.length === 0 ? (
            <View style={[styles.emptyTasksBox, { borderColor: c.border }]}>
              <Ionicons name="checkbox-outline" size={32} color={c.textTertiary} style={{ marginBottom: spacing[1] }} />
              <Text style={[styles.emptyTasksText, { color: c.textSecondary }]}>No tasks yet</Text>
              <Text style={[styles.emptyTasksSub, { color: c.textTertiary }]}>Associated tasks will appear here</Text>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  title={task.title}
                  projectName={task.projectName}
                  assigneeName={task.assigneeName}
                  priority={task.priority}
                  status={task.status}
                  dueDate={task.dueDate}
                  onPress={() => router.push(`/(stack)/task/${task.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[12],
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContainer: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing[4],
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  bannerOverlay: {
    padding: spacing[5],
    paddingTop: spacing[6],
  },
  bannerClient: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[1],
  },
  bannerTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: spacing[3],
  },
  bannerBadges: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: spacing[1],
    borderRadius: radius.md,
  },
  statusBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: spacing[1],
    borderRadius: radius.md,
  },
  priorityBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  descBox: {
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing[4],
  },
  descTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  metricCard: {
    padding: spacing[4],
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing[2],
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: spacing[2],
  },
  metricSub: {
    fontSize: 11,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  detailsCard: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
    marginBottom: spacing[5],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  tasksSection: {
    marginTop: spacing[2],
  },
  tasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  tasksTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  tasksCountBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  tasksCountBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  statBadge: {
    paddingHorizontal: 10,
    paddingVertical: spacing[1],
    borderRadius: radius.full,
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyTasksBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTasksText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyTasksSub: {
    fontSize: 12,
    marginTop: 2,
  },
  tasksList: {
    gap: spacing[2],
  },
});
