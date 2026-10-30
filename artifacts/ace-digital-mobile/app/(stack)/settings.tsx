import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, Pressable, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, typography, spacing, radius } from '@/theme';

export default function SettingsScreen() {
  const { c, isDark, setThemeSetting } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: insets.top + spacing[4], backgroundColor: c.surfaceElevated, borderBottomColor: c.borderSubtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: c.surfaceElevated, borderColor: c.borderSubtle }]}>
          <View style={styles.row}>
            <View style={styles.iconLabel}>
              <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={c.primary} style={{ marginRight: 12 }} />
              <Text style={[styles.label, { color: c.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(val) => {
                void setThemeSetting(val ? 'dark' : 'light');
              }}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: c.surfaceElevated, borderColor: c.borderSubtle }]}>
          <View style={[styles.row, styles.borderBottom, { borderBottomColor: c.borderSubtle }]}>
            <View style={styles.iconLabel}>
              <Ionicons name="notifications" size={20} color={c.primary} style={{ marginRight: 12 }} />
              <Text style={[styles.label, { color: c.text }]}>Push Notifications</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handleTogglePush}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.row}>
            <View style={styles.iconLabel}>
              <Ionicons name="mail" size={20} color={c.primary} style={{ marginRight: 12 }} />
              <Text style={[styles.label, { color: c.text }]}>Email Notifications</Text>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={handleToggleEmail}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Activity</Text>
        <View style={[styles.card, { backgroundColor: c.surfaceElevated, borderColor: c.borderSubtle }]}>
          <Pressable 
            onPress={() => router.push('/(stack)/recent-activity')}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.iconLabel}>
              <Ionicons name="time" size={20} color={c.primary} style={{ marginRight: 12 }} />
              <Text style={[styles.label, { color: c.text }]}>Recent Activity</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
          </Pressable>
        </View>
        
        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: c.textTertiary }]}>Ace Digital App v1.0.0</Text>
          <Text style={[styles.versionText, { color: c.textTertiary, marginTop: 4, fontSize: 10 }]}>Developer ID: 6763873045053341339</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing[4],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  title: { ...typography.h3, fontWeight: '700' },
  content: { padding: spacing[4] },
  sectionTitle: { ...typography.bodyMedium, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing[3], marginTop: spacing[4], marginLeft: spacing[2] },
  card: { borderRadius: radius.xl, paddingHorizontal: spacing[4], borderWidth: 1, marginBottom: spacing[4] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[4] },
  borderBottom: { borderBottomWidth: 0.5 },
  label: { ...typography.bodyMedium, fontWeight: '600' },
  iconLabel: { flexDirection: 'row', alignItems: 'center' },
  footer: { marginTop: spacing[8], alignItems: 'center' },
  versionText: { ...typography.caption, fontWeight: '500' },
});
