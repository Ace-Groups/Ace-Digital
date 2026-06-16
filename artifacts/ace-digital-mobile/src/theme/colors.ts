// Ace Digital — Mobile Design System Colors
// Matches the web app palette with mobile-optimized dark/light tokens

export const palette = {
  // Brand
  indigo: '#6366F1',
  indigoLight: '#818CF8',
  indigoDark: '#4F46E5',
  violet: '#8B5CF6',
  cyan: '#06B6D4',
  emerald: '#10B981',
  amber: '#F59E0B',
  rose: '#F43F5E',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const colors = {
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    surfacePressed: '#E2E8F0',
    border: '#E2E8F0',
    borderSubtle: '#F1F5F9',

    text: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    textInverse: '#FFFFFF',

    primary: palette.indigo,
    primaryLight: '#EEF2FF',
    primaryText: palette.indigo,

    success: palette.emerald,
    successLight: '#ECFDF5',
    warning: palette.amber,
    warningLight: '#FFFBEB',
    error: palette.rose,
    errorLight: '#FFF1F2',
    info: palette.cyan,
    infoLight: '#ECFEFF',

    tabBar: 'rgba(255, 255, 255, 0.92)',
    tabBarBorder: '#E2E8F0',
    tabBarActive: palette.indigo,
    tabBarInactive: '#94A3B8',

    card: '#FFFFFF',
    cardBorder: '#F1F5F9',
    shadow: 'rgba(0, 0, 0, 0.06)',

    overlay: 'rgba(0, 0, 0, 0.4)',
    shimmer: '#E2E8F0',
  },
  dark: {
    background: '#0A0A1A',
    surface: '#141428',
    surfaceElevated: '#1E1E3A',
    surfacePressed: '#2A2A4A',
    border: '#2A2A4A',
    borderSubtle: '#1E1E3A',

    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    textInverse: '#0F172A',

    primary: palette.indigoLight,
    primaryLight: 'rgba(99, 102, 241, 0.15)',
    primaryText: palette.indigoLight,

    success: '#34D399',
    successLight: 'rgba(16, 185, 129, 0.15)',
    warning: '#FBBF24',
    warningLight: 'rgba(245, 158, 11, 0.15)',
    error: '#FB7185',
    errorLight: 'rgba(244, 63, 94, 0.15)',
    info: '#22D3EE',
    infoLight: 'rgba(6, 182, 212, 0.15)',

    tabBar: 'rgba(10, 10, 26, 0.92)',
    tabBarBorder: '#1E1E3A',
    tabBarActive: palette.indigoLight,
    tabBarInactive: '#64748B',

    card: '#141428',
    cardBorder: '#2A2A4A',
    shadow: 'rgba(0, 0, 0, 0.3)',

    overlay: 'rgba(0, 0, 0, 0.6)',
    shimmer: '#1E1E3A',
  },
} as const;

export type ThemeColors = typeof colors.dark | typeof colors.light;
export type ColorScheme = 'light' | 'dark';
