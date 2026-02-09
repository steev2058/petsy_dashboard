import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { appointmentsAPI, vetsAPI } from '../src/services/api';
import { useStore } from '../src/store/useStore';
import { useTranslation } from '../src/hooks/useTranslation';

interface Appointment {
  id: string;
  vet_id: string;
  pet_id?: string;
  date: string;
  time: string;
  reason?: string;
  status: string;
  vet_name?: string;
  pet_name?: string;
}

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function MyAppointmentsScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { isAuthenticated } = useStore();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedTab, setSelectedTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ id: string; type: 'cancel' | 'reschedule' } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadAppointments();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadAppointments = async () => {
    try {
      const response = await appointmentsAPI.getAll();
      setAppointments(response.data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  }, []);

  const doCancelAppointment = async (appointment: Appointment) => {
    setActionLoading({ id: appointment.id, type: 'cancel' });
    try {
      await appointmentsAPI.cancel(appointment.id);
      await loadAppointments();
      Alert.alert('Success', 'Appointment cancelled successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to cancel');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelAppointment = async (appointment: Appointment) => {
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' ? window.confirm('Are you sure you want to cancel this appointment?') : true;
      if (ok) await doCancelAppointment(appointment);
      return;
    }

    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => doCancelAppointment(appointment),
        },
      ]
    );
  };

  const handleRescheduleAppointment = (appointment: Appointment) => {
    setActionLoading({ id: appointment.id, type: 'reschedule' });
    router.push(`/book-appointment/${appointment.vet_id}?rescheduleId=${appointment.id}` as any);
    setTimeout(() => setActionLoading(null), 700);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loaderText}>Loading appointments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredAppointments = appointments.filter((apt) => {
    if (selectedTab === 'upcoming') return apt.status === 'confirmed' || apt.status === 'pending';
    if (selectedTab === 'completed') return apt.status === 'completed';
    return apt.status === 'cancelled';
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return Colors.success;
      case 'pending': return Colors.warning;
      case 'completed': return Colors.primary;
      case 'cancelled': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>My Appointments</Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.loginRequired}>
          <Ionicons name="calendar" size={80} color={Colors.primary} />
          <Text style={styles.loginTitle}>Login Required</Text>
          <Text style={styles.loginText}>Please login to view your appointments</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.loginGradient}
            >
              <Text style={styles.loginButtonText}>Login Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderAppointment = ({ item, index }: { item: Appointment; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100)}>
      <View style={[styles.appointmentCard, Shadow.small]}>
        <View style={styles.dateSection}>
          <Text style={styles.dateDay}>
            {new Date(item.date).getDate()}
          </Text>
          <Text style={styles.dateMonth}>
            {new Date(item.date).toLocaleDateString('en-US', { month: 'short' })}
          </Text>
        </View>
        
        <View style={styles.appointmentContent}>
          <View style={styles.appointmentHeader}>
            <Text style={styles.vetName}>{item.vet_name || 'Veterinarian'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          </View>
          
          <View style={styles.appointmentDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="time" size={14} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{item.time}</Text>
            </View>
            {item.pet_name && (
              <View style={styles.detailRow}>
                <Ionicons name="paw" size={14} color={Colors.textSecondary} />
                <Text style={styles.detailText}>{item.pet_name}</Text>
              </View>
            )}
            {item.reason && (
              <View style={styles.detailRow}>
                <Ionicons name="document-text" size={14} color={Colors.textSecondary} />
                <Text style={styles.detailText} numberOfLines={1}>{item.reason}</Text>
              </View>
            )}
          </View>
          
          {(item.status === 'confirmed' || item.status === 'pending') && (
            <View style={styles.appointmentActions}>
              <TouchableOpacity
                style={styles.rescheduleButton}
                disabled={!!actionLoading}
                onPress={() => handleRescheduleAppointment(item)}
              >
                {actionLoading?.id === item.id && actionLoading?.type === 'reschedule' ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="calendar" size={16} color={Colors.primary} />
                )}
                <Text style={styles.rescheduleText}>Reschedule</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                disabled={!!actionLoading}
                onPress={() => handleCancelAppointment(item)}
              >
                {actionLoading?.id === item.id && actionLoading?.type === 'cancel' ? (
                  <ActivityIndicator size="small" color={Colors.error} />
                ) : (
                  <Ionicons name="close-circle" size={16} color={Colors.error} />
                )}
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>My Appointments</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/adoption')}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.addButtonGradient}
          >
            <Ionicons name="add" size={24} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && styles.tabActive,
            ]}
            onPress={() => setSelectedTab(tab.id)}
          >
            <Text style={[
              styles.tabText,
              selectedTab === tab.id && styles.tabTextActive,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => item.id}
        renderItem={renderAppointment}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={48} color={Colors.white} />
            </View>
            <Text style={styles.emptyTitle}>No Appointments</Text>
            <Text style={styles.emptyText}>Book an appointment with a veterinarian</Text>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => router.push('/(tabs)/adoption')}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.bookGradient}
              >
                <Text style={styles.bookText}>Find a Vet</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  backButton: {},
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundDark,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  dateSection: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
  dateMonth: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  appointmentContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vetName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  appointmentDetails: {
    marginTop: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 4,
  },
  detailText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  rescheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rescheduleText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cancelText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  bookButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  bookGradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  bookText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.white,
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
    marginTop: Spacing.md,
  },
  loginText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  loginButton: {
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
