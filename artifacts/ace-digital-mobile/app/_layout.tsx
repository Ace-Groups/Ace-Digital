import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { loadPersistedQueryCache, subscribeToPersistQueryCache } from '@/lib/query-persister';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(token: string | null) {
  if (!token) return;
  try {
    const existingStatus = (await Notifications.getPermissionsAsync()) as any;
    let finalStatus = existingStatus;
    if (!existingStatus.granted) {
      const status = (await Notifications.requestPermissionsAsync()) as any;
      finalStatus = status;
    }
    if (!finalStatus.granted) {
      console.log('Failed to get push token for push notification!');
      return;
    }

    let expoToken = '';
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenResult = await Notifications.getExpoPushTokenAsync({
        ...(projectId ? { projectId } : {}),
      });
      expoToken = tokenResult.data;
    } catch (tokenErr) {
      console.warn('Failed to get Expo push token:', tokenErr);
    }

    if (expoToken) {
      const { getApiBase } = await import('@/lib/api-config');
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/v1/push-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform: 'expo',
          token: expoToken,
          deviceLabel: Platform.OS === 'ios' ? 'iOS Device/Sim' : 'Android Device/Sim',
        }),
      });
      if (response.ok) {
        console.log('Push token successfully registered on backend');
      } else {
        console.warn('Failed to register push token on backend:', await response.text());
      }
    }
  } catch (error) {
    console.error('Error registering push notifications:', error);
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60, // 1 hour
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function RootNavigator() {
  const { c, isDark } = useTheme();
  const { isAuthenticated, token } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token) {
      void registerForPushNotificationsAsync(token);
    }
  }, [isAuthenticated, token]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="(stack)"
          options={{ headerShown: false }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void loadPersistedQueryCache(queryClient).then(() => {
      unsubscribe = subscribeToPersistQueryCache(queryClient);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <RootNavigator />
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}


