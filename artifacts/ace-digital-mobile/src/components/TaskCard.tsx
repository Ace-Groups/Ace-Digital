import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, radius, spacing } from '@/theme';
import { Badge } from '@/components/ui';

interface TaskCardProps {
  title: string;
  projectName?: string | null;
  assigneeName?: string | null;
  priority: string;
  status: string;
  dueDate?: string | null;
  onPress?: () => void;
}

const PRIORITY_VARIANT: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'info',
};

const STATUS_VARIANT: Record<string, 'success' | 'primary' | 'warning' | 'default'> = {
  completed: 'success',
  done: 'success',
  'in-progress': 'primary',
  in_progress: 'primary',
  'in progress': 'primary',
  pending: 'warning',
  todo: 'default',
};

function formatDueDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays}d`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function TaskCard({ title, projectName, assigneeName, priority, status, dueDate, onPress }: TaskCardProps) {
  const { c } = useTheme();

  const isOverdue = dueDate && new Date(dueDate) < new Date();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? c.surfacePressed : c.card, borderColor: c.cardBorder },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
            {title}
          </Text>
          {projectName && (
            <View style={styles.projectRow}>
              <Ionicons name="folder-outline" size={12} color={c.textTertiary} />
              <Text style={[styles.meta, { color: c.textTertiary }]} numberOfLines={1}>
                {projectName}
              </Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
      </View>

      <View style={styles.footer}>
        <View style={styles.badges}>
          <Badge label={priority} variant={PRIORITY_VARIANT[priority.toLowerCase()] ?? 'default'} />
          <Badge label={status.replace(/[-_]/g, ' ')} variant={STATUS_VARIANT[status.toLowerCase()] ?? 'default'} />
        </View>
        {dueDate && (
          <Text style={[styles.due, { color: isOverdue ? c.error : c.textTertiary }]}>
            {formatDueDate(dueDate)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    marginBottom: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    marginRight: spacing[2],
  },
  title: {
    ...typography.bodyMedium,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  meta: {
    ...typography.caption,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[3],
  },
  badges: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  due: {
    ...typography.tiny,
  },
});
