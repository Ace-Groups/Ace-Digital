import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing } from '@/theme';
import { useGenerateReport } from '@workspace/api-client-react';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPORT_LOGS_KEY = '@reports_export_log';

export default function ReportsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { mutateAsync: generateReport, isPending } = useGenerateReport();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const stored = await AsyncStorage.getItem(REPORT_LOGS_KEY);
      if (stored) setLogs(JSON.parse(stored));
    } catch (e) {}
  };

  const saveLog = async (reportType: string, url: string) => {
    const newLog = { id: Date.now(), type: reportType, url, timestamp: new Date().toISOString() };
    const newLogs = [newLog, ...logs];
    setLogs(newLogs);
    await AsyncStorage.setItem(REPORT_LOGS_KEY, JSON.stringify(newLogs));
  };

  const handleExport = async (type: string) => {
    try {
      const res = await generateReport({
        data: {
          type,
          period: 'monthly',
          title: `${type.toUpperCase()} Report`
        }
      });
      
      const fileUrl = res.fileUrl;
      if (!fileUrl) {
        Alert.alert('Report Generated', 'Report was generated but no file URL was returned.');
        return;
      }

      await saveLog(type, fileUrl);

      // Download file to temp directory
      const localUri = FileSystem.documentDirectory + `report_${type}_${Date.now()}.pdf`;
      const downloadResult = await FileSystem.downloadAsync(fileUrl, localUri);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri);
      } else {
        Alert.alert('Success', 'Report saved locally, but sharing is not available.');
      }

    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to generate report');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[4], backgroundColor: c.surfaceElevated, borderBottomColor: c.borderSubtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Generate Reports</Text>
          
          <View style={styles.actionGrid}>
            {[
              { id: 'projects', label: 'Projects Overview', icon: 'folder' },
              { id: 'employees', label: 'Employee Stats', icon: 'people' },
              { id: 'tasks', label: 'Task Completion', icon: 'checkmark-circle' },
            ].map(report => (
              <TouchableOpacity
                key={report.id}
                style={[styles.reportCard, { backgroundColor: c.surfaceElevated, borderColor: c.borderSubtle }]}
                onPress={() => handleExport(report.id)}
                disabled={isPending}
              >
                <View style={[styles.iconBox, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name={report.icon as any} size={24} color={c.primary} />
                </View>
                <Text style={[styles.reportLabel, { color: c.text }]}>{report.label}</Text>
                {isPending ? (
                  <ActivityIndicator color={c.primary} style={{ marginTop: 8 }} />
                ) : (
                  <Text style={[styles.exportText, { color: c.primary }]}>Export PDF</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Export History</Text>
          {logs.length === 0 ? (
            <Text style={{ color: c.textTertiary, textAlign: 'center', marginTop: 20 }}>No logs yet</Text>
          ) : (
            logs.map(log => (
              <View key={log.id} style={[styles.logItem, { backgroundColor: c.surface, borderBottomColor: c.borderSubtle }]}>
                <Ionicons name="document-text" size={20} color={c.textSecondary} />
                <View style={styles.logInfo}>
                  <Text style={[styles.logType, { color: c.text }]}>{log.type.toUpperCase()}</Text>
                  <Text style={[styles.logDate, { color: c.textTertiary }]}>{new Date(log.timestamp).toLocaleString()}</Text>
                </View>
                <Ionicons name="checkmark" size={20} color={c.success} />
              </View>
            ))
          )}
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
  scrollContent: { padding: spacing[4] },
  section: { marginBottom: spacing[6] },
  sectionTitle: { ...typography.bodyMedium, fontWeight: '700', marginBottom: spacing[3], textTransform: 'uppercase' },
  actionGrid: { gap: spacing[3] },
  reportCard: {
    padding: spacing[4],
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  reportLabel: { flex: 1, ...typography.h4 },
  exportText: { ...typography.caption, fontWeight: '600' },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: 12,
    marginBottom: spacing[2],
  },
  logInfo: { flex: 1, marginLeft: spacing[3] },
  logType: { ...typography.bodyMedium, fontWeight: '600' },
  logDate: { ...typography.caption, marginTop: 2 },
});
