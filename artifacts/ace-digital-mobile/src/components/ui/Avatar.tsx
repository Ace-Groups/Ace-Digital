import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme, typography, radius } from '@/theme';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

const AVATAR_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#06B6D4',
  '#10B981', '#F59E0B', '#EF4444', '#3B82F6',
];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const { c } = useTheme();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  const bg = colorForName(name);
  const fontSize = size * 0.38;

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.initials, { fontSize, lineHeight: fontSize * 1.2 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontFamily: typography.bodySemibold.fontFamily,
  },
});
