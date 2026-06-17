import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography } from '@/theme';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
}

const MASCOT_SOURCES: Record<string, any> = {
  '1': require('../../../assets/mascots/mascot-1.png'),
  '2': require('../../../assets/mascots/mascot-2.png'),
  '3': require('../../../assets/mascots/mascot-3.png'),
  '4': require('../../../assets/mascots/mascot-4.png'),
  '5': require('../../../assets/mascots/mascot-5.png'),
  '6': require('../../../assets/mascots/mascot-6.png'),
  '7': require('../../../assets/mascots/mascot-7.png'),
  '8': require('../../../assets/mascots/mascot-8.png'),
  '9': require('../../../assets/mascots/mascot-9.png'),
  '10': require('../../../assets/mascots/mascot-10.png'),
  '11': require('../../../assets/mascots/mascot-11.png'),
  '12': require('../../../assets/mascots/mascot-12.png'),
  '13': require('../../../assets/mascots/mascot-13.png'),
  '14': require('../../../assets/mascots/mascot-14.png'),
  '15': require('../../../assets/mascots/mascot-15.png'),
};

const PRESET_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  user: 'person',
  code: 'code-working',
  design: 'color-palette',
  sales: 'trending-up',
  finance: 'cash',
  hr: 'people',
  ops: 'settings',
  mgmt: 'happy',
};

const PRESET_COLORS: Record<string, string> = {
  user: '#64748B',
  code: '#2563EB',
  design: '#9333EA',
  sales: '#D97706',
  finance: '#059669',
  hr: '#DB2777',
  ops: '#EA580C',
  mgmt: '#6366F1',
};

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

interface ParsedAvatar {
  type: 'image' | 'mascot' | 'preset' | null;
  value: any;
}

function parseAvatar(uri: string | null | undefined): ParsedAvatar {
  if (!uri) return { type: null, value: null };

  if (uri.startsWith('identity:')) {
    try {
      const decoded = decodeURIComponent(uri.slice('identity:'.length));
      const parsed = JSON.parse(decoded);
      if (parsed.profilePhotoUrl) {
        return parseAvatar(parsed.profilePhotoUrl);
      }
      if (parsed.mascotId) {
        return { type: 'mascot', value: String(parsed.mascotId) };
      }
    } catch {
      return { type: null, value: null };
    }
  }

  if (uri.startsWith('mascot:')) {
    return { type: 'mascot', value: uri.slice('mascot:'.length) };
  }

  if (uri.startsWith('preset:')) {
    return { type: 'preset', value: uri.slice('preset:'.length) };
  }

  return { type: 'image', value: uri };
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const { c } = useTheme();

  const parsed = parseAvatar(uri);

  if (parsed.type === 'mascot') {
    const source = MASCOT_SOURCES[parsed.value];
    if (source) {
      return (
        <Image
          source={source}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      );
    }
  }

  if (parsed.type === 'preset') {
    const iconName = PRESET_ICONS[parsed.value] ?? 'person';
    const bgColor = PRESET_COLORS[parsed.value] ?? '#64748B';
    const iconSize = size * 0.45;
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor },
        ]}
      >
        <Ionicons name={iconName} size={iconSize} color="#FFFFFF" />
      </View>
    );
  }

  if (parsed.type === 'image') {
    return (
      <Image
        source={{ uri: parsed.value }}
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
