import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, typography, radius, spacing } from '@/theme';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary';
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'default', size = 'sm' }: BadgeProps) {
  const { c } = useTheme();

  const colorMap: Record<string, { bg: string; text: string }> = {
    default: { bg: c.surfaceElevated, text: c.textSecondary },
    success: { bg: c.successLight, text: c.success },
    warning: { bg: c.warningLight, text: c.warning },
    error: { bg: c.errorLight, text: c.error },
    info: { bg: c.infoLight, text: c.info },
    primary: { bg: c.primaryLight, text: c.primaryText },
  };

  const colors = colorMap[variant] ?? colorMap.default;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          paddingHorizontal: isSmall ? spacing[2] : spacing[3],
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}
    >
      <Text
        style={[
          isSmall ? styles.textSm : styles.textMd,
          { color: colors.text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  textSm: {
    ...typography.tiny,
    textTransform: 'capitalize',
  },
  textMd: {
    ...typography.captionMedium,
    textTransform: 'capitalize',
  },
});
