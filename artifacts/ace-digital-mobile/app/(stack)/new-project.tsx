import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing } from '@/theme';
import { useCreateProject } from '@workspace/api-client-react';
import { useRouter } from 'expo-router';

export default function NewProjectScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { mutateAsync: createProject, isPending } = useCreateProject();

  const [form, setForm] = useState({
    name: '',
    description: '',
    priority: 'high',
    status: 'active',
  });

  const handleSave = async () => {
    if (!form.name) {
      Alert.alert('Error', 'Project Name is required.');
      return;
    }
    try {
      await createProject({
        data: {
          name: form.name,
          description: form.description,
          priority: form.priority,
          status: form.status,
        }
      });
      Alert.alert('Success', 'Project created successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create project');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[4], backgroundColor: c.surfaceElevated, borderBottomColor: c.borderSubtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>New Project</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: c.textSecondary }]}>Project Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.borderSubtle }]}
            placeholder="e.g. Website Redesign"
            placeholderTextColor={c.textTertiary}
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: c.textSecondary }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: c.surface, color: c.text, borderColor: c.borderSubtle }]}
            placeholder="Describe the project..."
            placeholderTextColor={c.textTertiary}
            multiline
            numberOfLines={4}
            value={form.description}
            onChangeText={(text) => setForm({ ...form, description: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: c.textSecondary }]}>Priority</Text>
          <View style={styles.rowContainer}>
            {['low', 'medium', 'high', 'urgent'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.badge,
                  { backgroundColor: form.priority === p ? c.primary : c.surface },
                  form.priority === p ? undefined : { borderWidth: 1, borderColor: c.borderSubtle }
                ]}
                onPress={() => setForm({ ...form, priority: p })}
              >
                <Text style={[
                  styles.badgeText,
                  { color: form.priority === p ? '#FFF' : c.textSecondary }
                ]}>
                  {p.toUpperCase()}
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
            <Text style={styles.saveButtonText}>Create Project</Text>
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
  textArea: {
    height: 100,
    paddingTop: spacing[3],
    textAlignVertical: 'top',
  },
  rowContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  badgeText: { fontSize: 14, fontWeight: '600' },
  saveButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[6],
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
