import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useGetDashboard } from '@workspace/api-client-react';
import { Avatar, Badge } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BarChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ACTION_BUTTONS = [
  { id: 'add_user', icon: 'person-add-outline', label: 'Add User', route: '/(stack)/add-user' },
  { id: 'new_project', icon: 'folder-open-outline', label: 'New Project', route: '/(stack)/new-project' },
  { id: 'reports', icon: 'pie-chart-outline', label: 'Reports', route: '/(stack)/reports' },
  { id: 'settings', icon: 'settings-outline', label: 'Settings', route: '/(stack)/settings' },
];

export default function HomeScreen() {
  const { c, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [manualRefreshing, setManualRefreshing] = React.useState(false);

  // Advanced Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;
  const deadlinesAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnim = (anim: Animated.Value) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      });

    Animated.stagger(150, [
      createAnim(headerAnim),
      createAnim(statsAnim),
      createAnim(actionsAnim),
      createAnim(deadlinesAnim),
    ]).start();
  }, [headerAnim, statsAnim, actionsAnim, deadlinesAnim]);

  const { data, isLoading, refetch } = useGetDashboard({
    query: { queryKey: ['dashboard'] },
  });

  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setManualRefreshing(false);
    }
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const isAdminOrManager = user?.role?.toLowerCase().includes('admin') || user?.role === 'manager';

  const renderStatCard = (title: string, value: number, icon: any) => (
    <View style={[styles.premiumStatCard, { backgroundColor: c.surfaceElevated, borderColor: c.borderSubtle }]}>
      <View style={[styles.statIconWrapper, { backgroundColor: c.primaryLight }]}>
        <Ionicons name={icon} size={22} color={c.primary} />
      </View>
      <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: c.textTertiary }]}>{title}</Text>
    </View>
  );

  const translateY = (anim: Animated.Value) => anim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0]
  });

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={manualRefreshing} onRefresh={handleRefresh} tintColor="#FFFFFF" />
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* HERO HEADER */}
        <Animated.View style={{ opacity: headerAnim, transform: [{ translateY: translateY(headerAnim) }] }}>
          <LinearGradient
            colors={[c.primary, isDark ? c.background : '#1E3A8A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroHeader, { paddingTop: insets.top + spacing[4] }]}
          >
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.heroGreeting}>{greeting}</Text>
                <Text style={styles.heroName}>{user?.fullName?.split(' ')[0] ?? 'User'}</Text>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>
                    {user?.role ? user.role.replace(/_/g, ' ').toUpperCase() : 'MEMBER'}
                  </Text>
                </View>
              </View>
              <View style={styles.avatarRing}>
                <Avatar uri={user?.avatarUrl} name={user?.fullName ?? 'User'} size={56} />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.contentContainer}>
          {/* STATS GRID OVERLAPPING HEADER */}
          {data && (
            <Animated.View style={[styles.statsContainer, { opacity: statsAnim, transform: [{ translateY: translateY(statsAnim) }] }]}>
              <View style={styles.statsRow}>
                {renderStatCard('Active Projects', data.activeProjectsCount, 'folder-open')}
                {renderStatCard('My Tasks', data.myOpenTasksCount ?? 0, 'checkbox')}
              </View>
              
              {isAdminOrManager && (
                <View style={styles.statsRow}>
                  {renderStatCard('Employees', data.employeeCount, 'people')}
                  {renderStatCard('Approvals', data.pendingApprovalsCount, 'time')}
                </View>
              )}

              <View style={[styles.section, { marginTop: spacing[4] }]}>
                <Text style={[styles.sectionTitle, { color: c.text, marginBottom: spacing[3] }]}>Overview</Text>
                <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: c.surfaceElevated }}>
                  <BarChart
                    data={{
                      labels: ['Projects', 'Tasks', 'Approvals'],
                      datasets: [
                        {
                          data: [
                            data.activeProjectsCount || 0,
                            data.myOpenTasksCount || 0,
                            data.pendingApprovalsCount || 0,
                          ],
                        },
                      ],
                    }}
                    width={width - spacing[4] * 2}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                      backgroundColor: c.surfaceElevated,
                      backgroundGradientFrom: c.surfaceElevated,
                      backgroundGradientTo: c.surfaceElevated,
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                      labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                      style: {
                        borderRadius: 20,
                      },
                      barPercentage: 0.6,
                    }}
                    style={{
                      marginVertical: 8,
                      borderRadius: 20,
                    }}
                    showValuesOnTopOfBars
                  />
                </View>
              </View>
            </Animated.View>
          )}

          {/* QUICK ACTIONS */}
          {isAdminOrManager && (
            <Animated.View style={[styles.section, { opacity: actionsAnim, transform: [{ translateY: translateY(actionsAnim) }] }]}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>Quick Actions</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsScroll}>
                {ACTION_BUTTONS.map((action, idx) => (
                  <TouchableOpacity 
                    key={action.id} 
                    style={styles.actionButton}
                    onPress={() => router.push(action.route as any)}
                  >
                    <View style={[styles.actionIconBg, { backgroundColor: c.surfaceElevated }]}>
                      <Ionicons name={action.icon as any} size={24} color={c.primary} />
                    </View>
                    <Text style={[styles.actionLabel, { color: c.textSecondary }]}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* UPCOMING DEADLINES CAROUSEL */}
          {data?.upcomingDeadlines && data.upcomingDeadlines.length > 0 && (
            <Animated.View style={[styles.section, { opacity: deadlinesAnim, transform: [{ translateY: translateY(deadlinesAnim) }] }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>Upcoming Deadlines</Text>
                <TouchableOpacity>
                  <Text style={[styles.seeAllText, { color: c.primary }]}>See All</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={width * 0.8 + 16} decelerationRate="fast" contentContainerStyle={styles.deadlinesScroll}>
                {data.upcomingDeadlines.slice(0, 5).map((project) => (
                  <View key={project.id} style={[styles.deadlinePremiumCard, { backgroundColor: c.surfaceElevated, borderColor: c.borderSubtle }]}>
                    <View style={styles.deadlineTop}>
                      <View style={[styles.deadlineIconBox, { backgroundColor: c.primaryLight }]}>
                        <Ionicons name="calendar" size={20} color={c.primary} />
                      </View>
                      <Badge
                        label={project.status.replace(/[-_]/g, ' ')}
                        variant={project.status === 'active' ? 'success' : 'default'}
                      />
                    </View>
                    <Text style={[styles.deadlineProjectName, { color: c.text }]} numberOfLines={1}>
                      {project.name}
                    </Text>
                    <Text style={[styles.deadlineProjectDate, { color: c.primary }]}>
                      {project.deadline
                        ? new Date(project.deadline).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'No deadline'}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Loading State */}
          {isLoading && !data && (
            <View style={styles.loadingSection}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.skeleton, { backgroundColor: c.shimmer }]} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroHeader: {
    paddingHorizontal: spacing[5],
    paddingBottom: 80, // Extra space for overlapping cards
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroGreeting: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    fontWeight: '600',
  },
  heroName: {
    ...typography.h1,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  avatarRing: {
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 40,
  },
  contentContainer: {
    paddingHorizontal: spacing[4],
    marginTop: -50, // Pull up overlapping the hero header
  },
  statsContainer: {
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  premiumStatCard: {
    flex: 1,
    padding: spacing[4],
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  statValue: {
    ...typography.h2,
    marginBottom: 2,
  },
  statTitle: {
    ...typography.caption,
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  seeAllText: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  actionsScroll: {
    gap: spacing[4],
    paddingRight: spacing[4],
  },
  actionButton: {
    alignItems: 'center',
    width: 70,
  },
  actionIconBg: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  actionLabel: {
    ...typography.caption,
    textAlign: 'center',
  },
  deadlinesScroll: {
    gap: spacing[4],
    paddingRight: spacing[4],
  },
  deadlinePremiumCard: {
    width: width * 0.7,
    padding: spacing[4],
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  deadlineTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  deadlineIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deadlineProjectName: {
    ...typography.h4,
    marginBottom: 4,
  },
  deadlineProjectDate: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  loadingSection: {
    gap: spacing[3],
  },
  skeleton: {
    height: 90,
    borderRadius: 20,
  },
});
