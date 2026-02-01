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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import api from '../../src/services/api';

export default function AdminAppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadAppointments(); }, []);

  const loadAppointments = async () => {
    try {
      const response = await api.get('/admin/appointments');
      setAppointments(response.data || []);
    } catch (error) {
      const mock = [
        { id: '1', vet_name: 'Dr. Smith', pet_name: 'Buddy', date: '2025-02-15', time: '10:00 AM', reason: 'Checkup', status: 'confirmed' },
        { id: '2', vet_name: 'Dr. Johnson', pet_name: 'Max', date: '2025-02-16', time: '2:00 PM', reason: 'Vaccination', status: 'pending' },
      ];
      setAppointments(mock);
    } finally { setLoading(false); }
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadAppointments(); setRefreshing(false); }, []);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'confirmed': return Colors.success;
      case 'pending': return Colors.warning;
      case 'cancelled': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  const renderAppointment = ({ item }: { item: any }) => (
    <View style={[styles.card, Shadow.small]}>
      <View style={styles.cardHeader}>
        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>{new Date(item.date).getDate()}</Text>
          <Text style={styles.dateMonth}>{new Date(item.date).toLocaleDateString('en', { month: 'short' })}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.vetName}>{item.vet_name}</Text>
          <Text style={styles.petName}>{item.pet_name} • {item.time}</Text>
          <Text style={styles.reason}>{item.reason}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Appointments</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.filterContainer}>
        {['all', 'pending', 'confirmed', 'cancelled'].map((f) => (
          <TouchableOpacity key={f} style={[styles.filterTab, filter === f && styles.filterTabActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filter === 'all' ? appointments : appointments.filter(a => a.status === filter)}
        renderItem={renderAppointment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="calendar-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No appointments</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  filterContainer: { flexDirection: 'row', backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.xs },
  filterTab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundDark },
  filterTabActive: { backgroundColor: Colors.primary },
  filterTabText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  filterTabTextActive: { color: Colors.white },
  listContent: { padding: Spacing.md },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  dateBox: { width: 50, height: 50, backgroundColor: Colors.primary + '20', borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  dateDay: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.primary },
  dateMonth: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.primary },
  cardInfo: { flex: 1, marginLeft: Spacing.md },
  vetName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  petName: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  reason: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSize.xs, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.md },
});
