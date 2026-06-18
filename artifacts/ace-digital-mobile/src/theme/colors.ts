// Ace Digital — Mobile Design System Colors
// Matches the web app palette with mobile-optimized dark/light tokens

export const palette = {
  // Brand
  indigo: '#2563EB', // Blue 600
  indigoLight: '#60A5FA', // Blue 400
  indigoDark: '#1D4ED8', // Blue 700
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
    background: '#030914',
    surface: 'rgba(13, 27, 49, 0.65)',
    surfaceElevated: 'rgba(18, 38, 68, 0.8)',
    surfacePressed: 'rgba(28, 58, 98, 0.95)',
    border: 'rgba(0, 216, 246, 0.18)',
    borderSubtle: 'rgba(0, 216, 246, 0.1)',

    text: '#FFFFFF',
    textSecondary: '#95A5C0',
    textTertiary: '#6B7E9C',
    textInverse: '#030914',

    primary: '#00D8F6',
    primaryLight: 'rgba(0, 216, 246, 0.12)',
    primaryText: '#00D8F6',

    success: '#10B981',
    successLight: 'rgba(16, 185, 129, 0.12)',
    warning: '#FBBF24',
    warningLight: 'rgba(245, 158, 11, 0.12)',
    error: '#FB7185',
    errorLight: 'rgba(244, 63, 94, 0.12)',
    info: '#38BDF8',
    infoLight: 'rgba(56, 189, 248, 0.12)',

    tabBar: 'rgba(4, 11, 24, 0.82)',
    tabBarBorder: 'rgba(0, 216, 246, 0.15)',
    tabBarActive: '#00D8F6',
    tabBarInactive: '#6B7E9C',

    card: 'rgba(13, 27, 49, 0.65)',
    cardBorder: 'rgba(0, 216, 246, 0.18)',
    shadow: 'rgba(0, 216, 246, 0.08)',

    overlay: 'rgba(3, 9, 20, 0.75)',
    shimmer: 'rgba(18, 38, 68, 0.5)',
  },
} as const;

export type ThemeColors = typeof colors.dark | typeof colors.light;
export type ColorScheme = 'light' | 'dark';
