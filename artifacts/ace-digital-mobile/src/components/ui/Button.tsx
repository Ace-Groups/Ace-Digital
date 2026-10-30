import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, type ViewStyle, type TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, radius, spacing, typography } from '@/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const { c } = useTheme();

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const bgColors: Record<string, string> = {
    primary: c.primary,
    secondary: c.surfaceElevated,
    ghost: 'transparent',
    danger: c.error,
  };

  const textColors: Record<string, string> = {
    primary: '#FFFFFF',
    secondary: c.text,
    ghost: c.primaryText,
    danger: '#FFFFFF',
  };

  const heights: Record<string, number> = { sm: 36, md: 48, lg: 56 };
  const fontSizes: Record<string, TextStyle> = {
    sm: { fontSize: 13 },
    md: { fontSize: 15 },
    lg: { fontSize: 17 },
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bgColors[variant],
          height: heights[size],
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: variant === 'ghost' ? 0 : variant === 'secondary' ? 1 : 0,
          borderColor: variant === 'secondary' ? c.border : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              fontSizes[size],
              { color: textColors[variant], marginLeft: icon ? 8 : 0 },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing[5],
  },
  text: {
    ...typography.button,
  },
});
