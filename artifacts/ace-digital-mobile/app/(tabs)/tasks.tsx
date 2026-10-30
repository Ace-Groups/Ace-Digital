import React, { useState, useMemo } from 'react';
import { 
  View, Text, FlatList, RefreshControl, StyleSheet, Pressable, 
  Modal, TextInput, ScrollView, TouchableOpacity, Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme, typography, spacing, radius } from '@/theme';
import { 
  useListTasks, 
  useCreateTask, 
  useListProjects, 
  useListEmployees, 
  getListEmployeesQueryKey, 
  type Task 
} from '@workspace/api-client-react';
import { TaskCard } from '@/components/TaskCard';
import { EmptyState, Avatar } from '@/components/ui';

type Filter = 'all' | 'mine' | 'pending' | 'in-progress' | 'completed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

const getTodayStr = (offsetDays = 0) => {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function TasksScreen() {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [manualRefreshing, setManualRefreshing] = useState(false);

  // Modal and Form States
  const [createTaskVisible, setCreateTaskVisible] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<number | null>(null);
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState('');

  const { data: tasks, isLoading, refetch, isRefetching } = useListTasks(undefined, {
    query: { queryKey: ['tasks'] },
  });

  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setManualRefreshing(false);
    }
  };

  const { data: projects } = useListProjects();
  const { data: employees } = useListEmployees(undefined, {
    query: {
      queryKey: getListEmployeesQueryKey(),
    }
  });

  const createTaskMutation = useCreateTask();

  const filtered = useMemo(() => {
    if (!tasks) return [];
    if (filter === 'all') return tasks;
    return tasks.filter((t) => t.status.toLowerCase().replace(/\s/g, '-') === filter);
  }, [tasks, filter]);

  const activeProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => p.status !== 'DONE');
  }, [projects]);

  const activeEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter((e) => e.status === 'active');
  }, [employees]);

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return;
    try {
      await createTaskMutation.mutateAsync({
        data: {
          title: taskTitle.trim(),
          projectId: selectedProject ?? undefined,
          assigneeId: selectedAssignee ?? undefined,
          assigneeIds: selectedAssignee ? [selectedAssignee] : undefined,
          priority: taskPriority,
          dueDate: taskDueDate || undefined,
          status: 'PENDING',
        },
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreateTaskVisible(false);
      setTaskTitle('');
      setSelectedProject(null);
      setSelectedAssignee(null);
      setTaskPriority('MEDIUM');
      setTaskDueDate('');

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err) {
      console.error('[createTask]', err);
    }
  };

  const renderItem = ({ item }: { item: Task }) => (
    <TaskCard
      title={item.title}
      projectName={item.projectName}
      assigneeName={item.assigneeName}
      priority={item.priority}
      status={item.status}
      dueDate={item.dueDate}
      onPress={() => router.push(`/(stack)/task/${item.id}`)}
    />
  );

  const serifFont = Platform.select({ ios: 'Georgia', android: 'serif' });

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <View>
          <Text style={[styles.title, { color: c.text, fontFamily: serifFont }]}>Tasks</Text>
          <Text style={[styles.count, { color: c.textTertiary, fontFamily: serifFont }]}>
            {filtered.length} {filter === 'all' ? 'total' : filter}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCreateTaskVisible(true);
          }}
          style={({ pressed }) => [
            styles.addButton,
            {
              backgroundColor: c.primary,
              opacity: pressed ? 0.8 : 1,
              shadowColor: c.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
            },
          ]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.chip,
              {
                backgroundColor: filter === f.key ? c.primary : c.surfaceElevated,
                borderColor: filter === f.key ? c.primary : c.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: filter === f.key ? '#030914' : c.textSecondary, fontFamily: serifFont, fontWeight: '700' },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Task List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 120 },
          filtered.length === 0 && styles.emptyContainer,
        ]}
        refreshControl={
          <RefreshControl refreshing={manualRefreshing} onRefresh={handleRefresh} tintColor={c.primary} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="checkbox-outline"
              title="No tasks found"
              subtitle={filter !== 'all' ? 'Try a different filter' : 'Tasks will appear here'}
            />
          )
        }
      />

      {/* Create Task Modal */}
      <Modal
        visible={createTaskVisible}
        animationType="slide"
        onRequestClose={() => setCreateTaskVisible(false)}
      >
        <View style={[styles.modalWrapper, { backgroundColor: c.background, paddingTop: insets.top }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.borderSubtle }]}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCreateTaskVisible(false);
              }}
              style={{ padding: 10, marginLeft: -10 }}
            >
              <Ionicons name="close" size={26} color={c.text} />
            </Pressable>
            <Text style={[styles.modalHeaderTitle, { color: c.text, fontFamily: serifFont }]}>New Task</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleCreateTask();
              }}
              disabled={!taskTitle.trim() || createTaskMutation.isPending}
              style={{ padding: 10, marginRight: -10 }}
            >
              <Text
                style={[
                  styles.modalHeaderAction,
                  { color: taskTitle.trim() && !createTaskMutation.isPending ? c.primary : c.textTertiary, fontFamily: serifFont }
                ]}
              >
                Create
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.formLabel, { color: c.textSecondary, fontFamily: serifFont }]}>TASK TITLE</Text>
            <TextInput
              style={[
                styles.formInput,
                { backgroundColor: c.surfaceElevated, color: c.text, borderColor: c.border }
              ]}
              placeholder="What needs to be done?"
              placeholderTextColor={c.textTertiary}
              value={taskTitle}
              onChangeText={setTaskTitle}
              autoFocus
            />

            <Text style={[styles.formLabel, { color: c.textSecondary, marginTop: spacing[4] }]}>PROJECT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.scrollContent}>
              <Pressable
                onPress={() => setSelectedProject(null)}
                style={[
                  styles.projectChip,
                  {
                    backgroundColor: selectedProject === null ? c.primary + '15' : c.surfaceElevated,
                    borderColor: selectedProject === null ? c.primary : c.border,
                  }
                ]}
              >
                <Text style={[styles.chipText, { color: selectedProject === null ? c.primary : c.textSecondary }]}>
                  No Project
                </Text>
              </Pressable>
              {activeProjects.map((proj) => (
                <Pressable
                  key={proj.id}
                  onPress={() => setSelectedProject(proj.id)}
                  style={[
                    styles.projectChip,
                    {
                      backgroundColor: selectedProject === proj.id ? c.primary + '15' : c.surfaceElevated,
                      borderColor: selectedProject === proj.id ? c.primary : c.border,
                    }
                  ]}
                >
                  <Text style={[styles.chipText, { color: selectedProject === proj.id ? c.primary : c.textSecondary }]}>
                    {proj.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.formLabel, { color: c.textSecondary, marginTop: spacing[4] }]}>ASSIGNEE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.scrollContent}>
              <Pressable
                onPress={() => setSelectedAssignee(null)}
                style={[
                  styles.assigneeChip,
                  {
                    backgroundColor: selectedAssignee === null ? c.primary + '15' : c.surfaceElevated,
                    borderColor: selectedAssignee === null ? c.primary : c.border,
                  }
                ]}
              >
                <Ionicons name="person-outline" size={16} color={selectedAssignee === null ? c.primary : c.textSecondary} style={{ marginRight: spacing[1] }} />
                <Text style={[styles.chipText, { color: selectedAssignee === null ? c.primary : c.textSecondary }]}>
                  Unassigned
                </Text>
              </Pressable>
              {activeEmployees.map((emp) => (
                <Pressable
                  key={emp.id}
                  onPress={() => setSelectedAssignee(emp.id)}
                  style={[
                    styles.assigneeChip,
                    {
                      backgroundColor: selectedAssignee === emp.id ? c.primary + '15' : c.surfaceElevated,
                      borderColor: selectedAssignee === emp.id ? c.primary : c.border,
                    }
                  ]}
                >
                  <View style={{ marginRight: spacing[1] }}>
                    <Avatar name={emp.fullName} uri={emp.avatarUrl} size={18} />
                  </View>
                  <Text style={[styles.chipText, { color: selectedAssignee === emp.id ? c.primary : c.textSecondary }]}>
                    {emp.fullName.split(' ')[0]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.formLabel, { color: c.textSecondary, marginTop: spacing[4] }]}>PRIORITY</Text>
            <View style={styles.priorityRow}>
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => {
                const isSelected = taskPriority === p;
                let activeColor: string = c.textSecondary;
                let activeBg: string = c.surfaceElevated;
                
                if (isSelected) {
                  if (p === 'LOW') { activeColor = '#10B981'; activeBg = '#10B98115'; }
                  else if (p === 'MEDIUM') { activeColor = '#3B82F6'; activeBg = '#3B82F615'; }
                  else if (p === 'HIGH') { activeColor = '#F59E0B'; activeBg = '#F59E0B15'; }
                  else if (p === 'URGENT') { activeColor = '#EF4444'; activeBg = '#EF444415'; }
                }
                
                return (
                  <Pressable
                    key={p}
                    onPress={() => setTaskPriority(p)}
                    style={[
                      styles.priorityBtn,
                      {
                        backgroundColor: activeBg,
                        borderColor: isSelected ? activeColor : c.border,
                      }
                    ]}
                  >
                    <Text style={[styles.priorityBtnText, { color: isSelected ? activeColor : c.textSecondary }]}>
                      {p}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.formLabel, { color: c.textSecondary, marginTop: spacing[4] }]}>DUE DATE</Text>
            <TextInput
              style={[
                styles.formInput,
                { backgroundColor: c.surfaceElevated, color: c.text, borderColor: c.border }
              ]}
              placeholder="YYYY-MM-DD (e.g. 2026-06-20)"
              placeholderTextColor={c.textTertiary}
              value={taskDueDate}
              onChangeText={setTaskDueDate}
            />
            <View style={styles.datePresetsRow}>
              {[
                { label: 'Today', offset: 0 },
                { label: 'Tomorrow', offset: 1 },
                { label: '+3 Days', offset: 3 },
                { label: '+1 Week', offset: 7 },
                { label: 'Clear', offset: null }
              ].map((preset) => {
                const targetDate = preset.offset !== null ? getTodayStr(preset.offset) : '';
                const isSelected = (preset.offset === null && taskDueDate === '') || (preset.offset !== null && taskDueDate === targetDate);
                return (
                  <Pressable
                    key={preset.label}
                    onPress={() => setTaskDueDate(targetDate)}
                    style={[
                      styles.datePresetChip,
                      {
                        backgroundColor: isSelected ? c.primary + '15' : c.surfaceElevated,
                        borderColor: isSelected ? c.primary : c.border,
                      }
                    ]}
                  >
                    <Text style={[styles.datePresetText, { color: isSelected ? c.primary : c.textSecondary }]}>
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  title: {
    ...typography.h2,
  },
  count: {
    ...typography.caption,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    ...typography.captionMedium,
  },
  listContent: {
    paddingHorizontal: spacing[4],
  },
  emptyContainer: {
    flex: 1,
  },
  modalWrapper: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalHeaderAction: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing[4],
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing[2],
    letterSpacing: 0.5,
  },
  formInput: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    fontSize: 16,
  },
  horizontalScroll: {
    flexDirection: 'row',
    marginBottom: spacing[1],
  },
  scrollContent: {
    gap: spacing[2],
    paddingRight: spacing[4],
  },
  projectChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  assigneeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  priorityBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  datePresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
    marginBottom: spacing[10],
  },
  datePresetChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  datePresetText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
