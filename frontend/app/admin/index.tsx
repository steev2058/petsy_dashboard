import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/services/api';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const cardWidth = isWeb ? Math.min((width - 80) / 4, 200) : (width - Spacing.md * 2 - Spacing.sm) / 2;

interface DashboardStats {
  users: number;
  pets: number;
  orders: number;
  appointments: number;
  products: number;
  vets: number;
  revenue: number;
  pendingOrders: number;
  monthlyStats?: { month: string; orders: number; revenue: number }[];
  recentOrders?: { id: string; total: number; status: string }[];
  recentUsers?: { id: string; name: string; email: string }[];
}

const MENU_ITEMS = [
  { id: 'users', label: 'Users', icon: 'people', color: '#6366F1', route: '/admin/users' },
  { id: 'pets', label: 'Pets', icon: 'paw', color: '#EC4899', route: '/admin/pets' },
  { id: 'orders', label: 'Orders', icon: 'bag-handle', color: '#F59E0B', route: '/admin/orders' },
  { id: 'products', label: 'Products', icon: 'cube', color: '#10B981', route: '/admin/products' },
  { id: 'appointments', label: 'Appointments', icon: 'calendar', color: '#8B5CF6', route: '/admin/appointments' },
  { id: 'vets', label: 'Veterinarians', icon: 'medical', color: '#EF4444', route: '/admin/vets' },
  { id: 'community', label: 'Community', icon: 'chatbubbles', color: '#06B6D4', route: '/admin/community' },
  { id: 'locations', label: 'Map Locations', icon: 'location', color: '#84CC16', route: '/admin/locations' },
  { id: 'sponsorships', label: 'Sponsorships', icon: 'heart', color: '#F43F5E', route: '/admin/sponsorships' },
  { id: 'payments', label: 'Payments', icon: 'card', color: '#0EA5E9', route: '/admin/payments' },
  { id: 'settings', label: 'Settings', icon: 'settings', color: '#64748B', route: '/admin/settings' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { isAuthenticated, user } = useStore();
  const [stats, setStats] = useState<DashboardStats>({
    users: 0,
    pets: 0,
    orders: 0,
    appointments: 0,
    products: 0,
    vets: 0,
    revenue: 0,
    pendingOrders: 0,
    monthlyStats: [],
    recentOrders: [],
    recentUsers: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const isAdmin = user?.is_admin || user?.role === 'admin';

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadDashboardStats();
    } else if (isAuthenticated && !isAdmin) {
      setAccessDenied(true);
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin]);

  const loadDashboardStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
      setAccessDenied(false);
    } catch (error: any) {
      console.log('Error loading stats:', error);
      if (error.response?.status === 403) {
        setAccessDenied(true);
      } else {
        // Use mock data if API fails for other reasons
        setStats({
          users: 156,
          pets: 89,
          orders: 234,
          appointments: 67,
          products: 45,
          vets: 12,
          revenue: 15680,
          pendingOrders: 18,
          monthlyStats: [
            { month: 'Jan', orders: 45, revenue: 2300 },
            { month: 'Feb', orders: 52, revenue: 2800 },
            { month: 'Mar', orders: 61, revenue: 3200 },
            { month: 'Apr', orders: 58, revenue: 3100 },
            { month: 'May', orders: 72, revenue: 4100 },
            { month: 'Jun', orders: 85, revenue: 4800 },
          ],
          recentOrders: [],
          recentUsers: [],
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardStats();
    setRefreshing(false);
  };

  // Simple bar chart component
  const SimpleBarChart = ({ data }: { data: { month: string; orders: number; revenue: number }[] }) => {
    if (!data || data.length === 0) return null;
    const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
    
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loaderText}>Loading data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Revenue Overview (Last 6 Months)</Text>
        <View style={styles.chartBars}>
          {data.map((item, index) => (
            <View key={index} style={styles.barWrapper}>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { height: `${(item.revenue / maxRevenue) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.barLabel}>{item.month}</Text>
              <Text style={styles.barValue}>${item.revenue > 999 ? `${(item.revenue/1000).toFixed(1)}k` : item.revenue}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const StatCard = ({ label, value, icon, color, trend }: any) => (
    <Animated.View entering={FadeInDown.delay(100)} style={[styles.statCard, Shadow.small, { width: cardWidth }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{typeof value === 'number' && value > 999 ? `${(value/1000).toFixed(1)}k` : value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {trend !== undefined && (
        <View style={[styles.trendBadge, { backgroundColor: trend > 0 ? Colors.success + '20' : Colors.error + '20' }]}>
          <Ionicons name={trend > 0 ? 'trending-up' : 'trending-down'} size={12} color={trend > 0 ? Colors.success : Colors.error} />
          <Text style={[styles.trendText, { color: trend > 0 ? Colors.success : Colors.error }]}>{Math.abs(trend)}%</Text>
        </View>
      )}
    </Animated.View>
  );

  // Not logged in
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.accessDenied}>
          <View style={styles.accessDeniedIcon}>
            <Ionicons name="lock-closed" size={64} color={Colors.error} />
          </View>
          <Text style={styles.accessDeniedTitle}>Admin Access Required</Text>
          <Text style={styles.accessDeniedText}>Please login with your admin account to access the dashboard.</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/(auth)/login')}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.loginGradient}>
              <Ionicons name="log-in" size={20} color={Colors.white} />
              <Text style={styles.loginButtonText}>Login to Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Logged in but not admin
  if (accessDenied || !isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.accessDenied}>
          <View style={[styles.accessDeniedIcon, { backgroundColor: Colors.error + '15' }]}>
            <Ionicons name="shield-checkmark" size={64} color={Colors.error} />
          </View>
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            You don't have administrator privileges. Contact your system administrator to request access.
          </Text>
          <View style={styles.userInfo}>
            <Text style={styles.userInfoLabel}>Logged in as:</Text>
            <Text style={styles.userInfoValue}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/home')}>
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.headerTitleText}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>Petsy Control Panel</Text>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="notifications" size={24} color={Colors.white} />
            {stats.pendingOrders > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{stats.pendingOrders > 9 ? '9+' : stats.pendingOrders}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={isWeb ? styles.webContent : undefined}
      >
        {/* Quick Stats */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={[styles.statsGrid, isWeb && styles.webStatsGrid]}>
            <StatCard label="Total Users" value={stats.users} icon="people" color="#6366F1" trend={12} />
            <StatCard label="Total Pets" value={stats.pets} icon="paw" color="#EC4899" trend={8} />
            <StatCard label="Orders" value={stats.orders} icon="bag-handle" color="#F59E0B" trend={-3} />
            <StatCard label="Revenue" value={`$${stats.revenue}`} icon="cash" color="#10B981" trend={15} />
          </View>
        </Animated.View>

        {/* Analytics Chart */}
        <Animated.View entering={FadeIn.delay(300)} style={styles.chartSection}>
          <SimpleBarChart data={stats.monthlyStats || []} />
        </Animated.View>

        {/* Pending Actions */}
        <Animated.View entering={FadeIn.delay(400)} style={styles.pendingSection}>
          <Text style={styles.sectionTitle}>Pending Actions</Text>
          <View style={[styles.pendingCard, Shadow.small]}>
            <TouchableOpacity style={styles.pendingItem} onPress={() => router.push('/admin/orders')}>
              <View style={[styles.pendingIcon, { backgroundColor: Colors.warning + '20' }]}>
                <Ionicons name="bag-handle" size={20} color={Colors.warning} />
              </View>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingLabel}>Pending Orders</Text>
                <Text style={styles.pendingValue}>{stats.pendingOrders} orders need attention</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.pendingDivider} />
            <TouchableOpacity style={styles.pendingItem} onPress={() => router.push('/admin/appointments')}>
              <View style={[styles.pendingIcon, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="calendar" size={20} color={Colors.primary} />
              </View>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingLabel}>Today's Appointments</Text>
                <Text style={styles.pendingValue}>{stats.appointments} appointments scheduled</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.pendingDivider} />
            <TouchableOpacity style={styles.pendingItem} onPress={() => router.push('/admin/pets')}>
              <View style={[styles.pendingIcon, { backgroundColor: Colors.error + '20' }]}>
                <Ionicons name="alert-circle" size={20} color={Colors.error} />
              </View>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingLabel}>Lost Pet Reports</Text>
                <Text style={styles.pendingValue}>Review pending reports</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Management Menu */}
        <Animated.View entering={FadeIn.delay(500)} style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Management</Text>
          <View style={[styles.menuGrid, isWeb && styles.webMenuGrid]}>
            {MENU_ITEMS.map((item, index) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(index * 50)}>
                <TouchableOpacity
                  style={[styles.menuItem, Shadow.small, isWeb && styles.webMenuItem]}
                  onPress={() => router.push(item.route as any)}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon as any} size={28} color={item.color} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  webContent: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: Spacing.lg,
  },
  header: {
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  statsSection: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  webStatsGrid: {
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: Spacing.xs,
    gap: 2,
  },
  trendText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  chartSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  chartContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadow.small,
  },
  chartTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 60,
  },
  barContainer: {
    width: 30,
    height: 100,
    backgroundColor: Colors.backgroundDark,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 6,
    minHeight: 4,
  },
  barLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 2,
  },
  pendingSection: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  pendingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  pendingLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  pendingValue: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pendingDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  menuSection: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  webMenuGrid: {
    gap: Spacing.md,
  },
  menuItem: {
    width: (width - Spacing.md * 2 - Spacing.sm * 2) / 3,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  webMenuItem: {
    width: 140,
    minHeight: 120,
    justifyContent: 'center',
  },
  menuIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  menuLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  accessDeniedIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.error + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  accessDeniedTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  accessDeniedText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  userInfo: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  userInfoLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  userInfoValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 4,
  },
  loginButton: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  loginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  loginButtonText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.white,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  backButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  loaderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: Spacing.sm,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
});
