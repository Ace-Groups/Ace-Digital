import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { colors, type ThemeColors, type ColorScheme } from './colors';

export { colors, palette } from './colors';
export { typography, fontFamily, fontSize } from './typography';
export { spacing, radius } from './spacing';

interface ThemeContextValue {
  colorScheme: ColorScheme;
  c: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'dark',
  c: colors.dark,
  isDark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const colorScheme: ColorScheme = systemScheme ?? 'dark';
  const c = colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const value = useMemo(() => ({ colorScheme, c, isDark }), [colorScheme, c, isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
