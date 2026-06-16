import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTheme, typography, spacing, palette } from '@/theme';
import { useGetProject } from '@workspace/api-client-react';
import { Card, Badge } from '@/components/ui';

const STATUS_COLOR: Record<string, string> = {
  active: palette.emerald, 'in-progress': palette.indigo, planning: palette.amber,
  completed: palette.cyan, 'on-hold': '#94A3B8',
};

export default function ProjectDetailScreen() {
  const { c, isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: project, isLoading } = useGetProject(Number(id), {
    query: { queryKey: ['project', id], enabled: !!id },
  });

  if (isLoading || !project) {
    return (
      <>
        <Stack.Screen options={{ title: 'Project' }} />
        <View style={[styles.loading, { backgroundColor: c.background }]}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </>
    );
  }

  const progressColor = STATUS_COLOR[project.status?.toLowerCase()] ?? c.primary;

  return (
    <>
      <Stack.Screen options={{ title: project.name }} />
      <ScrollView
        style={[styles.container, { backgroundColor: c.background }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: c.text }]}>{project.name}</Text>

        <View style={styles.badges}>
          <Badge label={project.status.replace(/[-_]/g, ' ')} variant="primary" size="md" />
          <Badge label={project.priority} variant={project.priority.toLowerCase() === 'high' ? 'error' : 'default'} size="md" />
        </View>

        {project.description && (
          <Text style={[styles.description, { color: c.textSecondary }]}>{project.description}</Text>
        )}

        {/* Progress */}
        <Card style={{ marginTop: spacing[4] }}>
          <Text style={[styles.label, { color: c.textTertiary }]}>Progress</Text>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <View style={[styles.progressFill, { width: `${project.progress}%`, backgroundColor: progressColor }]} />
          </View>
          <Text style={[styles.progressText, { color: c.textSecondary }]}>{project.progress}% complete</Text>
        </Card>

        {/* Details */}
        <Card style={{ marginTop: spacing[3] }}>
          {project.teamName && <DetailRow label="Team" value={project.teamName} c={c} />}
          {project.clientName && <DetailRow label="Client" value={project.clientName} c={c} />}
          {project.deadline && (
            <DetailRow
              label="Deadline"
              value={new Date(project.deadline).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
              c={c}
            />
          )}
          {project.budget != null && (
            <DetailRow label="Budget" value={`₹${project.budget.toLocaleString('en-IN')}`} c={c} />
          )}
        </Card>
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
  description: { ...typography.body, marginTop: spacing[3] },
  label: { ...typography.captionMedium, marginBottom: spacing[1] },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: spacing[1] },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { ...typography.caption, marginTop: spacing[1] },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[2] },
  detailLabel: { ...typography.caption },
  detailValue: { ...typography.bodyMedium },
});
