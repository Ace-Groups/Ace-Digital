import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme, radius, spacing } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const { c } = useTheme();

  const variantStyle: ViewStyle =
    variant === 'elevated'
      ? {
          backgroundColor: c.surfaceElevated,
          shadowColor: c.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 12,
          elevation: 4,
        }
      : variant === 'outlined'
        ? {
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
          }
        : {
            backgroundColor: c.card,
            shadowColor: c.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 1,
            shadowRadius: 8,
            elevation: 2,
          };

  return (
    <View style={[styles.card, variantStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing[4],
  },
});
