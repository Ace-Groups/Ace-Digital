import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme, typography, spacing, radius } from '@/theme';
import { Button, Input } from '@/components/ui';

export default function ChangePasswordScreen() {
  const { c } = useTheme();
  // const router = useRouter(); // if using expo-router, use router.back()
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!current || !newPass || !confirm) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (newPass !== confirm) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    setLoading(true);
    // TODO: Connect to change password API mutation
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Password updated successfully');
    }, 1000);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Change Password' }} />
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { color: c.text }]}>Change Password</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              Please enter your current password to create a new one.
            </Text>

            <View style={[styles.form, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <Input
                label="Current Password"
                placeholder="Enter current password"
                value={current}
                onChangeText={setCurrent}
                secureTextEntry
              />
              <Input
                label="New Password"
                placeholder="Enter new password"
                value={newPass}
                onChangeText={setNewPass}
                secureTextEntry
              />
              <Input
                label="Confirm New Password"
                placeholder="Confirm new password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                containerStyle={{ marginBottom: spacing[6] }}
              />

              <Button
                title="Update Password"
                onPress={handleSave}
                loading={loading}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing[4], paddingTop: spacing[6] },
  title: { ...typography.h3, marginBottom: spacing[2] },
  subtitle: { ...typography.body, marginBottom: spacing[6] },
  form: { padding: spacing[4], borderRadius: radius.lg, borderWidth: 1 },
});
