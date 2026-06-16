import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/theme';
import { EmptyState } from '@/components/ui';

export default function NotificationsScreen() {
  const { c } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <EmptyState
          icon="notifications-off-outline"
          title="All caught up!"
          subtitle="You have no unread notifications"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
