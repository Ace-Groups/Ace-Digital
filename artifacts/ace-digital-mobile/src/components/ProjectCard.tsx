import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, radius, spacing, palette } from '@/theme';
import { Badge } from '@/components/ui';

interface ProjectCardProps {
  name: string;
  status: string;
  progress: number;
  priority: string;
  teamName?: string | null;
  deadline?: string | null;
  onPress?: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  active: palette.emerald,
  'in-progress': palette.indigo,
  in_progress: palette.indigo,
  planning: palette.amber,
  completed: palette.cyan,
  'on-hold': '#94A3B8',
  on_hold: '#94A3B8',
};

export function ProjectCard({ name, status, progress, priority, teamName, deadline, onPress }: ProjectCardProps) {
  const { c, isDark } = useTheme();

  const progressColor = STATUS_COLOR[status.toLowerCase()] ?? c.primary;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const serifFont = Platform.select({ ios: 'Georgia', android: 'serif' });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? c.surfacePressed : c.card,
          borderColor: c.cardBorder,
          shadowColor: isDark ? c.primary : '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.08 : 0.04,
          shadowRadius: 8,
          elevation: 2,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <View style={[styles.dot, { backgroundColor: progressColor }]} />
          <Text style={[styles.name, { color: c.text, fontFamily: serifFont }]} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${clampedProgress}%`, backgroundColor: progressColor },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: c.textTertiary, fontFamily: serifFont }]}>
        {clampedProgress}% complete
      </Text>

      <View style={styles.footer}>
        <View style={styles.badges}>
          <Badge label={status.replace(/[-_]/g, ' ')} variant="primary" />
          <Badge label={priority} variant={priority.toLowerCase() === 'high' ? 'error' : 'default'} />
        </View>
        <View style={styles.meta}>
          {teamName && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={12} color={c.textTertiary} />
              <Text style={[styles.metaText, { color: c.textTertiary, fontFamily: serifFont }]} numberOfLines={1}>
                {teamName}
              </Text>
            </View>
          )}
          {deadline && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={c.textTertiary} />
              <Text style={[styles.metaText, { color: c.textTertiary, fontFamily: serifFont }]}>
                {new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          )}
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing[2],
  },
  name: {
    ...typography.bodyMedium,
    flex: 1,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    ...typography.tiny,
    marginTop: 4,
    marginBottom: spacing[3],
  },
  footer: {
    gap: spacing[2],
  },
  badges: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  meta: {
    flexDirection: 'row',
    gap: spacing[4],
    marginTop: spacing[1],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.tiny,
  },
});
