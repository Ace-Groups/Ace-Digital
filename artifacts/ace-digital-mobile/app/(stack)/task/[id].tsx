import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTheme, typography, spacing } from '@/theme';
import { useGetTask } from '@workspace/api-client-react';
import { Card, Badge, Avatar } from '@/components/ui';

export default function TaskDetailScreen() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: task, isLoading } = useGetTask(Number(id), {
    query: { queryKey: ['task', id], enabled: !!id },
  });

  if (isLoading || !task) {
    return (
      <>
        <Stack.Screen options={{ title: 'Task' }} />
        <View style={[styles.loading, { backgroundColor: c.background }]}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </>
    );
  }

  const priorityVariant: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
    critical: 'error', high: 'error', medium: 'warning', low: 'info',
  };
  const statusVariant: Record<string, 'success' | 'primary' | 'warning' | 'default'> = {
    completed: 'success', done: 'success', 'in-progress': 'primary', in_progress: 'primary', pending: 'warning', todo: 'default',
  };

  return (
    <>
      <Stack.Screen options={{ title: task.title }} />
      <ScrollView
        style={[styles.container, { backgroundColor: c.background }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: c.text }]}>{task.title}</Text>

        <View style={styles.badges}>
          <Badge label={task.priority} variant={priorityVariant[task.priority?.toLowerCase()] ?? 'default'} size="md" />
          <Badge label={task.status.replace(/[-_]/g, ' ')} variant={statusVariant[task.status?.toLowerCase()] ?? 'default'} size="md" />
        </View>

        {/* Progress */}
        <Card style={{ marginTop: spacing[4] }}>
          <Text style={[styles.label, { color: c.textTertiary }]}>Progress</Text>
          <View style={[styles.progressTrack, { backgroundColor: c.surfaceElevated }]}>
            <View style={[styles.progressFill, { width: `${task.progress}%`, backgroundColor: c.primary }]} />
          </View>
          <Text style={[styles.progressText, { color: c.textSecondary }]}>{task.progress}%</Text>
        </Card>

        {/* Details */}
        <Card style={{ marginTop: spacing[3] }}>
          {task.projectName && (
            <DetailRow label="Project" value={task.projectName} c={c} />
          )}
          {task.teamName && (
            <DetailRow label="Team" value={task.teamName} c={c} />
          )}
          {task.dueDate && (
            <DetailRow
              label="Due Date"
              value={new Date(task.dueDate).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
              c={c}
            />
          )}
          {task.createdByName && (
            <DetailRow label="Created by" value={task.createdByName} c={c} />
          )}
        </Card>

        {/* Assignees */}
        {task.assignees && task.assignees.length > 0 && (
          <Card style={{ marginTop: spacing[3] }}>
            <Text style={[styles.label, { color: c.textTertiary, marginBottom: spacing[2] }]}>Assignees</Text>
            {task.assignees.map((a) => (
              <View key={a.userId} style={styles.assigneeRow}>
                <Avatar name={a.fullName} size={32} />
                <Text style={[styles.assigneeName, { color: c.text }]}>{a.fullName}</Text>
                {a.completed && <Badge label="Done" variant="success" />}
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </>
  );
}

function DetailRow({ label, value, c }: { label: string; value: string; c: any }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: c.textTertiary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing[4], paddingBottom: spacing[12] },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.h3, marginBottom: spacing[2] },
  badges: { flexDirection: 'row', gap: spacing[2] },
  label: { ...typography.captionMedium, marginBottom: spacing[1] },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: spacing[1] },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { ...typography.caption, marginTop: spacing[1] },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[2] },
  detailLabel: { ...typography.caption },
  detailValue: { ...typography.bodyMedium },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[1] },
  assigneeName: { ...typography.bodyMedium, flex: 1 },
});
