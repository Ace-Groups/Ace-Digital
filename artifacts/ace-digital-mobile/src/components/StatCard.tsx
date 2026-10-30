import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, radius, spacing } from '@/theme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  gradient?: [string, string];
  subtitle?: string;
}

export function StatCard({ title, value, icon, gradient, subtitle }: StatCardProps) {
  const { c, isDark } = useTheme();

  const defaultGradient: [string, string] = isDark
    ? ['rgba(99,102,241,0.2)', 'rgba(139,92,246,0.1)']
    : ['rgba(99,102,241,0.08)', 'rgba(139,92,246,0.04)'];

  return (
    <LinearGradient
      colors={gradient ?? defaultGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderColor: c.cardBorder }]}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
          <Ionicons name={icon} size={20} color={c.primaryText} />
        </View>
      </View>
      <Text style={[styles.value, { color: c.text }]}>{value}</Text>
      <Text style={[styles.title, { color: c.textSecondary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: c.textTertiary }]}>{subtitle}</Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    minWidth: 150,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...typography.h3,
    marginBottom: 2,
  },
  title: {
    ...typography.captionMedium,
  },
  subtitle: {
    ...typography.tiny,
    marginTop: 2,
  },
});
