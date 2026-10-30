import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing } from '@/theme';
import { useCreateEmployee } from '@workspace/api-client-react';
import { useRouter } from 'expo-router';

export default function AddUserScreen() {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { mutateAsync: createEmployee, isPending } = useCreateEmployee();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    role: 'employee',
    jobTitle: '',
  });

  const handleSave = async () => {
    if (!form.fullName || !form.email) {
      Alert.alert('Error', 'Full Name and Email are required.');
      return;
    }
    try {
      await createEmployee({
        data: {
          fullName: form.fullName,
          email: form.email,
          role: form.role,
          jobTitle: form.jobTitle,
          passwordMode: 'auto',
          sendWelcomeEmail: true,
        }
      });
      Alert.alert('Success', 'User created successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create user');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[4], backgroundColor: c.surfaceElevated, borderBottomColor: c.borderSubtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>Add User</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: c.textSecondary }]}>Full Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.borderSubtle }]}
            placeholder="e.g. John Doe"
            placeholderTextColor={c.textTertiary}
            value={form.fullName}
            onChangeText={(text) => setForm({ ...form, fullName: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: c.textSecondary }]}>Email Address *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.borderSubtle }]}
            placeholder="e.g. john@example.com"
            placeholderTextColor={c.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(text) => setForm({ ...form, email: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: c.textSecondary }]}>Job Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.borderSubtle }]}
            placeholder="e.g. Software Engineer"
            placeholderTextColor={c.textTertiary}
            value={form.jobTitle}
            onChangeText={(text) => setForm({ ...form, jobTitle: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: c.textSecondary }]}>Role</Text>
          <View style={styles.roleContainer}>
            {['admin', 'manager', 'employee'].map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleBadge,
                  { backgroundColor: form.role === r ? c.primary : c.surface },
                  form.role === r ? undefined : { borderWidth: 1, borderColor: c.borderSubtle }
                ]}
                onPress={() => setForm({ ...form, role: r })}
              >
                <Text style={[
                  styles.roleText,
                  { color: form.role === r ? '#FFF' : c.textSecondary }
                ]}>
                  {r.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: c.primary }]}
          onPress={handleSave}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Create User</Text>
          )}
        </TouchableOpacity>
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
  scrollContent: { padding: spacing[4] },
  formGroup: { marginBottom: spacing[5] },
  label: { ...typography.bodyMedium, fontWeight: '600', marginBottom: spacing[2] },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
    fontSize: 16,
  },
  roleContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  roleText: { fontSize: 14, fontWeight: '600' },
  saveButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[6],
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
