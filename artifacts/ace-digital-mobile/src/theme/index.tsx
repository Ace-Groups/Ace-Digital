import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { colors, type ThemeColors, type ColorScheme } from './colors';

export { colors, palette } from './colors';
export { typography, fontFamily, fontSize } from './typography';
export { spacing, radius } from './spacing';

const THEME_KEY = 'ace_theme_override';

interface ThemeContextValue {
  colorScheme: ColorScheme;
  c: ThemeColors;
  isDark: boolean;
  themeSetting: 'light' | 'dark' | 'system';
  setThemeSetting: (theme: 'light' | 'dark' | 'system') => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'dark',
  c: colors.dark,
  isDark: true,
  themeSetting: 'system',
  setThemeSetting: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeSetting, setThemeSettingState] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(THEME_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemeSettingState(stored);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const setThemeSetting = async (next: 'light' | 'dark' | 'system') => {
    setThemeSettingState(next);
    try {
      await SecureStore.setItemAsync(THEME_KEY, next);
    } catch {
      // ignore
    }
  };

  const colorScheme: ColorScheme = useMemo(() => {
    if (themeSetting === 'system') {
      return systemScheme ?? 'dark';
    }
    return themeSetting;
  }, [themeSetting, systemScheme]);

  const c = colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const value = useMemo(
    () => ({ colorScheme, c, isDark, themeSetting, setThemeSetting }),
    [colorScheme, c, isDark, themeSetting]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
