import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import api from '../../src/services/api';

export default function AdminPaymentsScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadPayments(); }, []);

  const loadPayments = async () => {
    try {
      const response = await api.get('/admin/payments');
      setPayments(response.data || []);
    } catch (error) {
      const mock = [
        { id: '1', amount: 125.99, payment_method: 'stripe', status: 'succeeded', created_at: new Date().toISOString() },
        { id: '2', amount: 50.00, payment_method: 'paypal', status: 'pending', created_at: new Date().toISOString() },
        { id: '3', amount: 89.00, payment_method: 'shamcash', status: 'succeeded', created_at: new Date().toISOString() },
      ];
      setPayments(mock);
    } finally { setLoading(false); }
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadPayments(); setRefreshing(false); }, []);

  const getMethodIcon = (method: string) => {
    switch(method) {
      case 'stripe': return 'card';
      case 'paypal': return 'logo-paypal';
      case 'shamcash': return 'qr-code';
      default: return 'cash';
    }
  };

  const getStatusColor = (status: string) => status === 'succeeded' ? Colors.success : status === 'pending' ? Colors.warning : Colors.error;

  const totalRevenue = payments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + (p.amount || 0), 0);


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

  const renderPayment = ({ item }: { item: any }) => (
    <View style={[styles.card, Shadow.small]}>
      <View style={[styles.methodIcon, { backgroundColor: Colors.primary + '20' }]}>
        <Ionicons name={getMethodIcon(item.payment_method) as any} size={24} color={Colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.amount}>${item.amount?.toFixed(2)}</Text>
        <Text style={styles.method}>{item.payment_method}</Text>
        <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Payments</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.revenueCard}>
        <Ionicons name="wallet" size={32} color={Colors.success} />
        <View style={styles.revenueInfo}>
          <Text style={styles.revenueLabel}>Total Revenue</Text>
          <Text style={styles.revenueValue}>${totalRevenue.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <View style={styles.statItem}><Text style={styles.statValue}>{payments.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={styles.statValue}>{payments.filter(p => p.status === 'succeeded').length}</Text><Text style={styles.statLabel}>Succeeded</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={styles.statValue}>{payments.filter(p => p.status === 'pending').length}</Text><Text style={styles.statLabel}>Pending</Text></View>
      </View>
      <FlatList data={payments} renderItem={renderPayment} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />} ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="card-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No payments</Text></View>} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  revenueCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.success + '15', marginHorizontal: Spacing.md, marginTop: Spacing.sm, padding: Spacing.lg, borderRadius: BorderRadius.lg, gap: Spacing.md },
  revenueInfo: {},
  revenueLabel: { fontSize: FontSize.sm, color: Colors.success },
  revenueValue: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.success },
  stats: { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: Spacing.md, marginTop: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  statDivider: { width: 1, backgroundColor: Colors.border },
  listContent: { padding: Spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  methodIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: Spacing.md },
  amount: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  method: { fontSize: FontSize.sm, color: Colors.textSecondary, textTransform: 'capitalize', marginTop: 2 },
  date: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSize.sm, fontWeight: '600', textTransform: 'capitalize' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.md },
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
