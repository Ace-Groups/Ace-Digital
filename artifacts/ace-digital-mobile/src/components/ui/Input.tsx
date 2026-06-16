import React from 'react';
import { View, Text, TextInput, StyleSheet, type TextInputProps, type ViewStyle } from 'react-native';
import { useTheme, typography, radius, spacing } from '@/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, containerStyle, style, ...props }: InputProps) {
  const { c } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: c.surfaceElevated,
            color: c.text,
            borderColor: error ? c.error : c.border,
          },
          style,
        ]}
        placeholderTextColor={c.textTertiary}
        {...props}
      />
      {error && <Text style={[styles.error, { color: c.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  label: {
    ...typography.captionMedium,
    marginBottom: spacing[1],
  },
  input: {
    ...typography.body,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
  },
  error: {
    ...typography.caption,
    marginTop: spacing[1],
  },
});
