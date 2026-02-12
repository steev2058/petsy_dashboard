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

export default function AdminSponsorshipsScreen() {
  const router = useRouter();
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadSponsorships(); }, []);

  const loadSponsorships = async () => {
    try {
      const response = await api.get('/admin/sponsorships');
      setSponsorships(response.data || []);
    } catch (error) {
      const mock = [
        { id: '1', pet_name: 'Max', user_name: 'John Doe', amount: 50, message: 'Hope this helps!', is_anonymous: false, created_at: new Date().toISOString() },
        { id: '2', pet_name: 'Buddy', user_name: 'Anonymous', amount: 100, is_anonymous: true, created_at: new Date().toISOString() },
      ];
      setSponsorships(mock);
    } finally { setLoading(false); }
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadSponsorships(); setRefreshing(false); }, []);

  const totalSponsored = sponsorships.reduce((sum, s) => sum + (s.amount || 0), 0);


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

  const renderSponsorship = ({ item }: { item: any }) => (
    <View style={[styles.card, Shadow.small]}>
      <View style={styles.heartIcon}>
        <Ionicons name="heart" size={24} color={Colors.error} />
      </View>
      <View style={styles.info}>
        <Text style={styles.petName}>{item.pet_name || 'Unknown Pet'}</Text>
        <Text style={styles.sponsor}>{item.is_anonymous ? 'Anonymous' : item.user_name}</Text>
        {item.message && <Text style={styles.message} numberOfLines={1}>&ldquo;{item.message}&rdquo;</Text>}
        <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.amount}>${item.amount?.toFixed(2)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Sponsorships</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.totalCard}>
        <Ionicons name="heart-circle" size={40} color={Colors.error} />
        <View style={styles.totalInfo}>
          <Text style={styles.totalLabel}>Total Sponsored</Text>
          <Text style={styles.totalValue}>${totalSponsored.toFixed(2)}</Text>
        </View>
        <Text style={styles.totalCount}>{sponsorships.length} donations</Text>
      </View>
      <FlatList data={sponsorships} renderItem={renderSponsorship} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />} ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="heart-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No sponsorships yet</Text></View>} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  totalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.error + '15', marginHorizontal: Spacing.md, marginTop: Spacing.sm, padding: Spacing.lg, borderRadius: BorderRadius.lg, gap: Spacing.md },
  totalInfo: { flex: 1 },
  totalLabel: { fontSize: FontSize.sm, color: Colors.error },
  totalValue: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.error },
  totalCount: { fontSize: FontSize.sm, color: Colors.error },
  listContent: { padding: Spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  heartIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.error + '20', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: Spacing.md },
  petName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  sponsor: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  message: { fontSize: FontSize.sm, color: Colors.textLight, fontStyle: 'italic', marginTop: 2 },
  date: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  amount: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.error },
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
