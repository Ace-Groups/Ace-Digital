import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, Card } from '@/components/ui';

export default function ProfileScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const menuItems = [
    { icon: 'notifications-outline' as const, label: 'Notifications', route: '/(stack)/notifications' },
    { icon: 'settings-outline' as const, label: 'Settings', route: '/(stack)/settings' },
    { icon: 'key-outline' as const, label: 'Change Password', route: '/(stack)/change-password' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing[4], paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Avatar uri={user?.avatarUrl} name={user?.fullName ?? 'User'} size={88} />
          <Text style={[styles.name, { color: c.text }]}>{user?.fullName}</Text>
          <Text style={[styles.role, { color: c.textSecondary }]}>
            {user?.jobTitle ?? user?.role ?? 'Employee'}
          </Text>
          {user?.email && (
            <Text style={[styles.email, { color: c.textTertiary }]}>{user.email}</Text>
          )}
        </View>

        {/* Info Cards */}
        <Card style={{ marginBottom: spacing[4] }}>
          <InfoRow icon="business-outline" label="Team" value={user?.teamName ?? '—'} c={c} />
          <View style={[styles.divider, { backgroundColor: c.borderSubtle }]} />
          <InfoRow icon="card-outline" label="Employee ID" value={user?.employeeCode ?? '—'} c={c} />
          <View style={[styles.divider, { backgroundColor: c.borderSubtle }]} />
          <InfoRow icon="call-outline" label="Phone" value={user?.phone ?? '—'} c={c} />
        </Card>

        {/* Menu Items */}
        <Card style={{ marginBottom: spacing[4], padding: 0 }}>
          {menuItems.map((item, i) => (
            <React.Fragment key={item.label}>
              <Pressable
                onPress={() => router.push(item.route as any)}
                style={({ pressed }) => [
                  styles.menuItem,
                  { backgroundColor: pressed ? c.surfacePressed : 'transparent' },
                  i === 0 && { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
                  i === menuItems.length - 1 && { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
                ]}
              >
                <Ionicons name={item.icon} size={20} color={c.textSecondary} />
                <Text style={[styles.menuLabel, { color: c.text }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
              </Pressable>
              {i < menuItems.length - 1 && (
                <View style={[styles.menuDivider, { backgroundColor: c.borderSubtle, marginLeft: spacing[12] }]} />
              )}
            </React.Fragment>
          ))}
        </Card>

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            {
              backgroundColor: pressed ? c.errorLight : 'transparent',
              borderColor: c.error,
            },
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color={c.error} />
          <Text style={[styles.logoutText, { color: c.error }]}>Sign Out</Text>
        </Pressable>

        <Text style={[styles.version, { color: c.textTertiary }]}>
          Ace Digital Mobile v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  c,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  c: any;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={c.textTertiary} style={styles.infoIcon} />
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: c.textTertiary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: c.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing[4] },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  name: {
    ...typography.h3,
    marginTop: spacing[3],
  },
  role: {
    ...typography.bodyMedium,
    marginTop: 2,
  },
  email: {
    ...typography.caption,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  infoIcon: {
    marginRight: spacing[3],
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...typography.tiny,
    marginBottom: 1,
  },
  infoValue: {
    ...typography.bodyMedium,
  },
  divider: {
    height: 0.5,
    marginLeft: spacing[8],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  menuLabel: {
    ...typography.body,
    flex: 1,
  },
  menuDivider: {
    height: 0.5,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  logoutText: {
    ...typography.button,
  },
  version: {
    ...typography.tiny,
    textAlign: 'center',
  },
});
