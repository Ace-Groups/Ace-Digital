import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing } from '@/theme';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'folder-open-outline', title, subtitle }: EmptyStateProps) {
  const { c } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={c.textTertiary} />
      <Text style={[styles.title, { color: c.textSecondary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: c.textTertiary }]}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[8],
  },
  title: {
    ...typography.bodyMedium,
    marginTop: spacing[3],
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing[1],
    textAlign: 'center',
  },
});
