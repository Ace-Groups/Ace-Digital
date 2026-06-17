import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing, radius } from '@/theme';

export default function SettingsScreen() {
  const { c, isDark, setThemeSetting } = useTheme();
  const router = useRouter();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedPush = await SecureStore.getItemAsync('ace_push_enabled');
        const storedEmail = await SecureStore.getItemAsync('ace_email_enabled');
        if (storedPush !== null) setPushEnabled(storedPush === 'true');
        if (storedEmail !== null) setEmailEnabled(storedEmail === 'true');
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleTogglePush = async (val: boolean) => {
    setPushEnabled(val);
    try {
      await SecureStore.setItemAsync('ace_push_enabled', String(val));
    } catch {
      // ignore
    }
  };

  const handleToggleEmail = async (val: boolean) => {
    setEmailEnabled(val);
    try {
      await SecureStore.setItemAsync('ace_email_enabled', String(val));
    } catch {
      // ignore
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView
        style={[styles.container, { backgroundColor: c.background }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: c.text }]}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={(val) => {
                void setThemeSetting(val ? 'dark' : 'light');
              }}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text style={[styles.hint, { color: c.textTertiary }]}>
            Change the application theme to match your preference.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={[styles.row, styles.borderBottom, { borderBottomColor: c.borderSubtle }]}>
            <Text style={[styles.label, { color: c.text }]}>Push Notifications</Text>
            <Switch
              value={pushEnabled}
              onValueChange={handleTogglePush}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: c.text }]}>Email Notifications</Text>
            <Switch
              value={emailEnabled}
              onValueChange={handleToggleEmail}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>Activity</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Pressable 
            onPress={() => router.push('/(stack)/recent-activity')}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.label, { color: c.text }]}>Recent Activity</Text>
            <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing[4] },
  sectionTitle: { ...typography.captionMedium, marginBottom: spacing[2], marginLeft: spacing[2] },
  card: { borderRadius: radius.lg, paddingHorizontal: spacing[4], borderWidth: 1, marginBottom: spacing[6] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[3] },
  borderBottom: { borderBottomWidth: 0.5 },
  label: { ...typography.body },
  hint: { ...typography.tiny, marginBottom: spacing[3] },
});
