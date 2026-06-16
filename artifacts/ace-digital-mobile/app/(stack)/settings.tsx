import React from 'react';
import { View, Text, ScrollView, StyleSheet, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme, typography, spacing, radius } from '@/theme';

export default function SettingsScreen() {
  const { c, isDark } = useTheme();

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
              onValueChange={() => {}} // Hooked up to system theme
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text style={[styles.hint, { color: c.textTertiary }]}>
            Matches your system appearance.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={[styles.row, styles.borderBottom, { borderBottomColor: c.borderSubtle }]}>
            <Text style={[styles.label, { color: c.text }]}>Push Notifications</Text>
            <Switch value={true} onValueChange={() => {}} trackColor={{ true: c.primary }} />
          </View>
          <View style={[styles.row, styles.borderBottom, { borderBottomColor: c.borderSubtle }]}>
            <Text style={[styles.label, { color: c.text }]}>Email Notifications</Text>
            <Switch value={true} onValueChange={() => {}} trackColor={{ true: c.primary }} />
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: c.text }]}>Marketing Updates</Text>
            <Switch value={false} onValueChange={() => {}} trackColor={{ true: c.primary }} />
          </View>
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
