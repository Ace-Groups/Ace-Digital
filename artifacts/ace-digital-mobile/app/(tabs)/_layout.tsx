import React, { useEffect, useRef } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, typography } from '@/theme';
import { ActivityIndicator, View } from 'react-native';

interface AnimatedTabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
  size: number;
  c: any;
}

function AnimatedTabIcon({ name, focused, color, size, c }: AnimatedTabIconProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.22 : 1,
      tension: 110,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={styles.iconContainer}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <Ionicons name={name} size={size + 2} color={color} />
      </Animated.View>
      {focused && (
        <View style={[styles.indicatorDot, { backgroundColor: c.primary, shadowColor: c.primary }]} />
      )}
    </Animated.View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const { c, isDark } = useTheme();

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.tabBarActive,
        tabBarInactiveTintColor: c.tabBarInactive,
        tabBarLabelStyle: {
          ...typography.tabLabel,
          fontSize: 10,
          fontWeight: '700',
          marginBottom: 6,
        },
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(4, 11, 24, 0.72)' : 'rgba(255, 255, 255, 0.85)',
          borderWidth: 1.5,
          borderColor: isDark ? 'rgba(0, 216, 246, 0.18)' : 'rgba(0, 0, 0, 0.06)',
          height: 72,
          paddingTop: 10,
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 28 : 16,
          left: 16,
          right: 16,
          borderRadius: 24,
          shadowColor: isDark ? '#00D8F6' : '#000000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.16 : 0.08,
          shadowRadius: 20,
          elevation: 6,
          overflow: 'hidden',
        },
        tabBarBackground: () => (
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={60}
            style={StyleSheet.absoluteFillObject}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name={focused ? 'home' : 'home-outline'} size={size} color={color} focused={focused} c={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name={focused ? 'checkbox' : 'checkbox-outline'} size={size} color={color} focused={focused} c={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name={focused ? 'folder' : 'folder-outline'} size={size} color={color} focused={focused} c={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={color} focused={focused} c={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name={focused ? 'person' : 'person-outline'} size={size} color={color} focused={focused} c={c} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
  },
  indicatorDot: {
    position: 'absolute',
    bottom: -6,
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 3,
  },
});
