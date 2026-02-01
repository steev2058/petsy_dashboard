import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { useStore } from '../../src/store/useStore';
import api from '../../src/services/api';

const { width } = Dimensions.get('window');

interface DashboardStats {
  users: number;
  pets: number;
  orders: number;
  appointments: number;
  products: number;
  vets: number;
  revenue: number;
  pendingOrders: number;
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
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.log('Error loading stats:', error);
      // Use mock data if API fails
      setStats({
        users: 156,
        pets: 89,
        orders: 234,
        appointments: 67,
        products: 45,
        vets: 12,
        revenue: 15680,
        pendingOrders: 18,
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardStats();
    setRefreshing(false);
  };

  const StatCard = ({ label, value, icon, color, trend }: any) => (
    <Animated.View entering={FadeInDown.delay(100)} style={[styles.statCard, Shadow.small]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{typeof value === 'number' && value > 999 ? `${(value/1000).toFixed(1)}k` : value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {trend && (
        <View style={[styles.trendBadge, { backgroundColor: trend > 0 ? Colors.success + '20' : Colors.error + '20' }]}>
          <Ionicons name={trend > 0 ? 'trending-up' : 'trending-down'} size={12} color={trend > 0 ? Colors.success : Colors.error} />
          <Text style={[styles.trendText, { color: trend > 0 ? Colors.success : Colors.error }]}>{Math.abs(trend)}%</Text>
        </View>
      )}
    </Animated.View>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loginRequired}>
          <Ionicons name="shield" size={64} color={Colors.primary} />
          <Text style={styles.loginTitle}>Admin Access Required</Text>
          <Text style={styles.loginText}>Please login with admin credentials</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/(auth)/login')}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.loginGradient}>
              <Text style={styles.loginButtonText}>Login</Text>
            </LinearGradient>
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.headerTitleText}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>Petsy Control Panel</Text>
          </View>
          <TouchableOpacity style={styles.notifButton}>
            <Ionicons name="notifications" size={24} color={Colors.white} />
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Total Users" value={stats.users} icon="people" color="#6366F1" trend={12} />
            <StatCard label="Total Pets" value={stats.pets} icon="paw" color="#EC4899" trend={8} />
            <StatCard label="Orders" value={stats.orders} icon="bag-handle" color="#F59E0B" trend={-3} />
            <StatCard label="Revenue" value={`$${stats.revenue}`} icon="cash" color="#10B981" trend={15} />
          </View>
        </View>

        {/* Pending Actions */}
        <View style={styles.pendingSection}>
          <Text style={styles.sectionTitle}>Pending Actions</Text>
          <View style={[styles.pendingCard, Shadow.small]}>
            <View style={styles.pendingItem}>
              <View style={[styles.pendingIcon, { backgroundColor: Colors.warning + '20' }]}>
                <Ionicons name="bag-handle" size={20} color={Colors.warning} />
              </View>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingLabel}>Pending Orders</Text>
                <Text style={styles.pendingValue}>{stats.pendingOrders} orders need attention</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/admin/orders')}>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.pendingDivider} />
            <View style={styles.pendingItem}>
              <View style={[styles.pendingIcon, { backgroundColor: Colors.error + '20' }]}>
                <Ionicons name="alert-circle" size={20} color={Colors.error} />
              </View>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingLabel}>Lost Pets Reports</Text>
                <Text style={styles.pendingValue}>5 new reports to review</Text>
              </View>
              <TouchableOpacity>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.pendingDivider} />
            <View style={styles.pendingItem}>
              <View style={[styles.pendingIcon, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="calendar" size={20} color={Colors.primary} />
              </View>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingLabel}>Today's Appointments</Text>
                <Text style={styles.pendingValue}>{stats.appointments} appointments scheduled</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/admin/appointments')}>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Management Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Management</Text>
          <View style={styles.menuGrid}>
            {MENU_ITEMS.map((item, index) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(index * 50)}>
                <TouchableOpacity
                  style={[styles.menuItem, Shadow.small]}
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
        </View>

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
  backButton: {
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
  notifButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  statCard: {
    width: (width - Spacing.md * 2 - Spacing.sm) / 2,
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
  menuItem: {
    width: (width - Spacing.md * 2 - Spacing.sm * 2) / 3,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
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
  loginRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loginTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  loginText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  loginButton: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  loginGradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  loginButtonText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.white,
  },
});
