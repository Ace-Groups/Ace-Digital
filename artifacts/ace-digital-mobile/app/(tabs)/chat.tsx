import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing, radius } from '@/theme';
import {
  useListChannels,
  useCreateChannel,
  useListEmployees,
  useOpenDm,
  getListEmployeesQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, EmptyState, Button, Input } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function ChatScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { connected } = useSocket();

  const [createChannelVisible, setCreateChannelVisible] = useState(false);
  const [openDmVisible, setOpenDmVisible] = useState(false);

  // Create Channel states
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [channelType, setChannelType] = useState<'TEAM' | 'ANNOUNCEMENT'>('TEAM');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  // DM search state
  const [dmSearch, setDmSearch] = useState('');
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const { data: channels, isLoading, refetch, isRefetching } = useListChannels({
    query: {
      queryKey: ['channels'],
      refetchInterval: connected ? 15000 : 5000, // Poll less frequently when socket is active
    },
  });

  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setManualRefreshing(false);
    }
  };

  const { data: employees, isLoading: isEmployeesLoading } = useListEmployees(undefined, {
    query: {
      enabled: createChannelVisible || openDmVisible,
      queryKey: getListEmployeesQueryKey(),
    },
  });

  const createChannelMutation = useCreateChannel();
  const openDmMutation = useOpenDm();

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const filteredEmployeesForInvite = useMemo(() => {
    if (!employees) return [];
    const q = memberSearch.trim().toLowerCase();
    return employees
      .filter((e) => e.id !== user?.id)
      .filter((e) => e.status === 'active')
      .filter((e) => !q || e.fullName.toLowerCase().includes(q) || (e.email && e.email.toLowerCase().includes(q)));
  }, [employees, memberSearch, user?.id]);

  const filteredEmployeesForDm = useMemo(() => {
    if (!employees) return [];
    const q = dmSearch.trim().toLowerCase();
    return employees
      .filter((e) => e.id !== user?.id)
      .filter((e) => e.status === 'active')
      .filter((e) => !q || e.fullName.toLowerCase().includes(q) || (e.email && e.email.toLowerCase().includes(q)));
  }, [employees, dmSearch, user?.id]);

  const toggleMember = (id: number) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter((x) => x !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  const handleCreateChannelSubmit = async () => {
    const cleanName = channelName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!cleanName) {
      Alert.alert('Error', 'Channel name is required');
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(cleanName)) {
      Alert.alert('Error', 'Invalid channel name. Use lowercase letters, numbers, and hyphens only.');
      return;
    }

    try {
      const channel = await createChannelMutation.mutateAsync({
        data: {
          name: cleanName,
          description: channelDesc.trim() || undefined,
          type: channelType,
          memberIds: selectedMembers.length > 0 ? selectedMembers : undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['channels'] });
      setCreateChannelVisible(false);
      // Reset form
      setChannelName('');
      setChannelDesc('');
      setChannelType('TEAM');
      setSelectedMembers([]);
      setMemberSearch('');
      // Navigate
      router.push(`/(stack)/channel/${channel.id}`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not create channel');
    }
  };

  const handleOpenDmSelect = async (userId: number) => {
    try {
      const channel = await openDmMutation.mutateAsync({
        data: { userId },
      });
      await queryClient.invalidateQueries({ queryKey: ['channels'] });
      setOpenDmVisible(false);
      setDmSearch('');
      router.push(`/(stack)/channel/${channel.id}`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not open direct message');
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isGeneral = item.name?.toLowerCase() === 'general';
    const icon = item.type === 'DM' ? 'person' : isGeneral ? 'megaphone' : 'chatbubble-ellipses';
    const displayTime = item.lastPostAt ?? item.lastMessageAt;
    const displayPreview = item.lastMessagePreview ?? item.lastMessage;

    return (
      <Pressable
        onPress={() => router.push(`/(stack)/channel/${item.id}`)}
        style={({ pressed }) => [
          styles.channelItem,
          { backgroundColor: pressed ? c.surfacePressed : 'transparent', borderBottomColor: c.borderSubtle },
        ]}
      >
        <View style={[styles.channelIcon, { backgroundColor: c.primaryLight }]}>
          <Ionicons name={icon} size={20} color={c.primaryText} />
        </View>
        <View style={styles.channelContent}>
          <View style={styles.channelHeader}>
            <Text style={[styles.channelName, { color: c.text }]} numberOfLines={1}>
              {item.type === 'DM' ? `#${item.dmPeerName ?? item.name}` : `#${item.name}`}
            </Text>
            {displayTime && (
              <Text style={[styles.channelTime, { color: c.textTertiary }]}>
                {timeAgo(displayTime)}
              </Text>
            )}
          </View>
          {displayPreview && (
            <Text style={[styles.channelPreview, { color: c.textSecondary }]} numberOfLines={1}>
              {displayPreview}
            </Text>
          )}
        </View>
        {item.unreadCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: c.primary }]}>
            <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Text style={[styles.title, { color: c.text }]}>Chat</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setCreateChannelVisible(true)}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: pressed ? c.surfacePressed : c.surfaceElevated }
            ]}
          >
            <Ionicons name="add" size={24} color={c.text} />
          </Pressable>
          <Pressable
            onPress={() => setOpenDmVisible(true)}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: pressed ? c.surfacePressed : c.surfaceElevated }
            ]}
          >
            <Ionicons name="create-outline" size={22} color={c.text} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={channels ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          { paddingBottom: insets.bottom + 100 },
          (!channels || channels.length === 0) && styles.emptyContainer,
        ]}
        refreshControl={
          <RefreshControl refreshing={manualRefreshing} onRefresh={handleRefresh} tintColor={c.primary} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="chatbubbles-outline"
              title="No channels yet"
              subtitle="Chat channels will appear here"
            />
          )
        }
      />

      {/* Create Channel Modal */}
      <Modal
        visible={createChannelVisible}
        animationType="slide"
        onRequestClose={() => setCreateChannelVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: c.background, paddingTop: insets.top }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.borderSubtle }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Create Channel</Text>
            <Pressable onPress={() => setCreateChannelVisible(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color={c.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalForm} contentContainerStyle={{ paddingBottom: insets.bottom + spacing[4] }}>
            <Input
              label="Channel Name"
              placeholder="e.g. general-discussions"
              value={channelName}
              onChangeText={setChannelName}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Description (optional)"
              placeholder="What is this channel for?"
              value={channelDesc}
              onChangeText={setChannelDesc}
            />

            {isAdmin && (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: c.textSecondary }]}>Channel Type</Text>
                <View style={styles.typeSelectorRow}>
                  <Pressable
                    onPress={() => setChannelType('TEAM')}
                    style={[
                      styles.typeOption,
                      { borderColor: c.border },
                      channelType === 'TEAM'
                        ? { backgroundColor: c.primary, borderColor: c.primary }
                        : { backgroundColor: c.surfaceElevated }
                    ]}
                  >
                    <Text style={[styles.typeOptionText, channelType === 'TEAM' ? { color: '#FFFFFF' } : { color: c.textSecondary }]}>
                      Team Channel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setChannelType('ANNOUNCEMENT')}
                    style={[
                      styles.typeOption,
                      { borderColor: c.border },
                      channelType === 'ANNOUNCEMENT'
                        ? { backgroundColor: c.primary, borderColor: c.primary }
                        : { backgroundColor: c.surfaceElevated }
                    ]}
                  >
                    <Text style={[styles.typeOptionText, channelType === 'ANNOUNCEMENT' ? { color: '#FFFFFF' } : { color: c.textSecondary }]}>
                      Announcement
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: c.textSecondary }]}>Invite Teammates</Text>
              <View style={[styles.searchContainer, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
                <Ionicons name="search-outline" size={18} color={c.textSecondary} style={{ marginRight: spacing[2] }} />
                <TextInput
                  style={[styles.searchInput, { color: c.text }]}
                  placeholder="Search by name or email..."
                  placeholderTextColor={c.textTertiary}
                  value={memberSearch}
                  onChangeText={setMemberSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={[styles.membersListContainer, { borderColor: c.border, backgroundColor: c.surface }]}>
                {filteredEmployeesForInvite.length === 0 ? (
                  <View style={styles.emptySearchContainer}>
                    <Text style={[styles.emptySearchText, { color: c.textTertiary }]}>
                      {isEmployeesLoading ? 'Loading teammates...' : 'No teammates found'}
                    </Text>
                  </View>
                ) : (
                  filteredEmployeesForInvite.map((emp) => {
                    const isSelected = selectedMembers.includes(emp.id);
                    return (
                      <Pressable
                        key={emp.id}
                        onPress={() => toggleMember(emp.id)}
                        style={[
                          styles.employeeRow,
                          { borderBottomColor: c.borderSubtle }
                        ]}
                      >
                        <Avatar name={emp.fullName} uri={emp.avatarUrl} size={32} />
                        <View style={styles.employeeInfo}>
                          <Text style={[styles.employeeName, { color: c.text }]} numberOfLines={1}>
                            {emp.fullName}
                          </Text>
                          <Text style={[styles.employeeEmail, { color: c.textTertiary }]} numberOfLines={1}>
                            {emp.email}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.checkbox,
                            { borderColor: isSelected ? c.primary : c.border },
                            isSelected && { backgroundColor: c.primary }
                          ]}
                        >
                          {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>

            <Button
              title="Create Channel"
              onPress={handleCreateChannelSubmit}
              loading={createChannelMutation.isPending}
              disabled={!channelName.trim()}
              style={{ marginTop: spacing[4] }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Open DM Modal */}
      <Modal
        visible={openDmVisible}
        animationType="slide"
        onRequestClose={() => setOpenDmVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: c.background, paddingTop: insets.top }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.borderSubtle }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>New Chat</Text>
            <Pressable onPress={() => setOpenDmVisible(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color={c.text} />
            </Pressable>
          </View>

          <View style={[styles.modalForm, { flex: 1 }]}>
            <View style={[styles.searchContainer, { backgroundColor: c.surfaceElevated, borderColor: c.border, marginBottom: spacing[4] }]}>
              <Ionicons name="search-outline" size={18} color={c.textSecondary} style={{ marginRight: spacing[2] }} />
              <TextInput
                style={[styles.searchInput, { color: c.text }]}
                placeholder="Search by name or email..."
                placeholderTextColor={c.textTertiary}
                value={dmSearch}
                onChangeText={setDmSearch}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <FlatList
              data={filteredEmployeesForDm}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleOpenDmSelect(item.id)}
                  style={({ pressed }) => [
                    styles.employeeRow,
                    {
                      borderBottomColor: c.borderSubtle,
                      backgroundColor: pressed ? c.surfacePressed : 'transparent'
                    }
                  ]}
                >
                  <Avatar name={item.fullName} uri={item.avatarUrl} size={40} />
                  <View style={styles.employeeInfo}>
                    <Text style={[styles.employeeName, { color: c.text }]} numberOfLines={1}>
                      {item.fullName}
                    </Text>
                    <Text style={[styles.employeeEmail, { color: c.textTertiary }]} numberOfLines={1}>
                      {item.email}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
                </Pressable>
              )}
              ListEmptyComponent={
                isEmployeesLoading ? (
                  <ActivityIndicator size="small" color={c.primary} style={{ marginTop: 20 }} />
                ) : (
                  <Text style={[styles.emptyText, { color: c.textTertiary }]}>No teammates found</Text>
                )
              }
              contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {(openDmMutation.isPending || createChannelMutation.isPending) && (
        <View style={[styles.loadingOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.loadingBox, { backgroundColor: c.surface }]}>
            <ActivityIndicator size="large" color={c.primary} />
            <Text style={[styles.loadingText, { color: c.text, marginTop: spacing[3] }]}>
              {createChannelMutation.isPending ? 'Creating channel...' : 'Opening conversation...'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  title: { ...typography.h2 },
  headerActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 0.5,
  },
  channelIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  channelContent: {
    flex: 1,
    marginRight: spacing[2],
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelName: {
    ...typography.bodyMedium,
    flex: 1,
  },
  channelTime: {
    ...typography.tiny,
    marginLeft: spacing[2],
  },
  channelPreview: {
    ...typography.caption,
    marginTop: 2,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: { flex: 1 },

  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    ...typography.h3,
  },
  modalCloseButton: {
    padding: 10,
    marginRight: -10,
  },
  modalForm: {
    padding: spacing[4],
  },
  formGroup: {
    marginBottom: spacing[4],
  },
  label: {
    ...typography.captionMedium,
    marginBottom: spacing[2],
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  typeOption: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeOptionText: {
    ...typography.button,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: 8,
  },
  membersListContainer: {
    borderWidth: 1,
    borderRadius: radius.md,
    maxHeight: 200,
    overflow: 'hidden',
    marginTop: spacing[2],
  },
  emptySearchContainer: {
    padding: spacing[4],
    alignItems: 'center',
  },
  emptySearchText: {
    ...typography.caption,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2] + 2,
    borderBottomWidth: 0.5,
  },
  employeeInfo: {
    flex: 1,
    marginLeft: spacing[3],
    marginRight: spacing[2],
  },
  employeeName: {
    ...typography.bodyMedium,
  },
  employeeEmail: {
    ...typography.caption,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  loadingBox: {
    padding: spacing[5],
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    minWidth: 180,
  },
  loadingText: {
    ...typography.bodyMedium,
  },
});
