import React, { useEffect, useState, useRef } from 'react';
import { Platform, Alert, Modal, StyleSheet, Pressable, Animated, View, Text, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
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
import Constants from 'expo-constants';

SplashScreen.preventAutoHideAsync();



async function registerForPushNotificationsAsync(token: string | null) {
  if (!token) return;
  try {
    if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
      return; // Not supported in Expo Go Android SDK 53+
    }
    const Notifications = await import('expo-notifications');
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

let globalAlertHandler: ((title: string, message?: string, buttons?: any[]) => void) | null = null;

const nativeAlert = Alert.alert;
Alert.alert = (title, message, buttons) => {
  if (globalAlertHandler) {
    globalAlertHandler(title, message, buttons);
  } else {
    nativeAlert(title, message, buttons);
  }
};

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: any[];
  onClose: () => void;
  c: any;
  isDark: boolean;
}

function CustomAlertModal({ visible, title, message, buttons, onClose, c, isDark }: CustomAlertProps) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(cardScale, { toValue: 0.85, duration: 150, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  if (!showModal) return null;

  const handleButtonPress = (onPress?: () => void) => {
    onClose();
    if (onPress) {
      setTimeout(() => {
        onPress();
      }, 150);
    }
  };

  const defaultButtons = [{ text: 'OK', onPress: () => {} }];
  const activeButtons = buttons && buttons.length > 0 ? buttons : defaultButtons;
  const isHorizontal = activeButtons.length <= 2;

  const serifFont = Platform.select({ ios: 'Georgia', android: 'serif' });

  return (
    <Modal transparent visible={showModal} animationType="none" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <Animated.View 
          style={[
            modalStyles.backdrop, 
            { 
              opacity: backdropOpacity,
              backgroundColor: isDark ? 'rgba(5, 10, 25, 0.55)' : 'rgba(15, 23, 42, 0.4)'
            }
          ]} 
        />
        
        <Animated.View style={[
          modalStyles.card,
          {
            opacity: cardOpacity,
            transform: [{ scale: cardScale }],
            backgroundColor: isDark ? 'rgba(30, 30, 50, 0.92)' : 'rgba(255, 255, 255, 0.94)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          }
        ]}>
          <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFillObject} />
          
          <View style={modalStyles.content}>
            <Text style={[
              modalStyles.title, 
              { 
                color: c.text,
                fontFamily: serifFont,
              }
            ]}>
              {title}
            </Text>
            
            {message && (
              <Text style={[
                modalStyles.message, 
                { 
                  color: c.textSecondary,
                  fontFamily: serifFont,
                }
              ]}>
                {message}
              </Text>
            )}
            
            <View style={[
              modalStyles.buttonsContainer, 
              isHorizontal ? modalStyles.rowButtons : modalStyles.columnButtons
            ]}>
              {activeButtons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                
                let btnBg = c.primary;
                let btnTextCol = '#FFFFFF';
                let btnBorderCol = 'transparent';
                let btnBorderW = 0;

                if (isCancel) {
                  btnBg = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
                  btnTextCol = c.textSecondary;
                } else if (isDestructive) {
                  btnBg = '#EF4444';
                  btnTextCol = '#FFFFFF';
                } else {
                  btnBg = isDark ? c.primary : '#334155';
                  btnTextCol = '#FFFFFF';
                }

                return (
                  <Pressable
                    key={index}
                    style={({ pressed }) => [
                      modalStyles.button,
                      {
                        backgroundColor: btnBg,
                        borderColor: btnBorderCol,
                        borderWidth: btnBorderW,
                        opacity: pressed ? 0.8 : 1,
                        flex: isHorizontal ? 1 : undefined,
                        marginHorizontal: isHorizontal ? 6 : 0,
                        marginVertical: isHorizontal ? 0 : 6,
                      }
                    ]}
                    onPress={() => handleButtonPress(btn.onPress)}
                  >
                    <Text style={[
                      modalStyles.buttonText, 
                      { 
                        color: btnTextCol,
                        fontFamily: serifFont,
                        fontWeight: '700',
                      }
                    ]}>
                      {btn.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '82%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 12,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    fontWeight: '500',
  },
  buttonsContainer: {
    width: '100%',
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  columnButtons: {
    flexDirection: 'column',
  },
  button: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
});

function RootNavigator() {
  const { c, isDark } = useTheme();
  const { isAuthenticated, token } = useAuth();

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState<{ title: string; message?: string; buttons?: any[] }>({ title: '' });

  useEffect(() => {
    globalAlertHandler = (title, message, buttons) => {
      setAlertData({ title, message, buttons });
      setAlertVisible(true);
    };
    return () => {
      globalAlertHandler = null;
    };
  }, []);

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

      <CustomAlertModal
        visible={alertVisible}
        title={alertData.title}
        message={alertData.message}
        buttons={alertData.buttons}
        onClose={() => setAlertVisible(false)}
        c={c}
        isDark={isDark}
      />
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
    async function initNotifications() {
      try {
        if (Platform.OS === 'android' && Constants.appOwnership === 'expo') return;
        const Notifications = await import('expo-notifications');
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      } catch (err) {
        console.warn('Could not initialize notifications', err);
      }
    }
    initNotifications();
  }, []);

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


