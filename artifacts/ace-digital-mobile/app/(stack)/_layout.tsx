import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

export default function StackLayout() {
  const { c } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.text,
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: c.background },
      }}
    />
  );
}
