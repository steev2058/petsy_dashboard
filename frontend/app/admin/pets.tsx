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

export default function AdminPetsScreen() {
  const router = useRouter();
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadPets(); }, []);

  const loadPets = async () => {
    try {
      const response = await api.get('/pets');
      setPets(response.data || []);
    } catch (error) {
      console.log('Error:', error);
    } finally { setLoading(false); }
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadPets(); setRefreshing(false); }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Pet', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/pets/${id}`); setPets(pets.filter(p => p.id !== id)); } catch { Alert.alert('Error', 'Failed'); }
      }}
    ]);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'for_adoption': return Colors.success;
      case 'for_sale': return Colors.primary;
      case 'lost': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  const filteredPets = filter === 'all' ? pets : pets.filter(p => p.status === filter);

  const renderPet = ({ item }: { item: any }) => (
    <View style={[styles.card, Shadow.small]}>
      <View style={styles.imageContainer}>
        {item.image ? <Image source={{ uri: item.image }} style={styles.petImage} /> : <View style={styles.imagePlaceholder}><Ionicons name="paw" size={32} color={Colors.textLight} /></View>}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status?.replace('_', ' ')}</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.breed}>{item.breed} • {item.age}</Text>
        <Text style={styles.species}>{item.species}</Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
        <Ionicons name="trash-outline" size={20} color={Colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Pets</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.filterContainer}>
        {['all', 'for_adoption', 'for_sale', 'lost'].map((f) => (
          <TouchableOpacity key={f} style={[styles.filterTab, filter === f && styles.filterTabActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>{f === 'all' ? 'All' : f.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.stats}>
        <View style={styles.statItem}><Text style={styles.statValue}>{pets.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={styles.statValue}>{pets.filter(p => p.status === 'for_adoption').length}</Text><Text style={styles.statLabel}>For Adoption</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={styles.statValue}>{pets.filter(p => p.status === 'lost').length}</Text><Text style={styles.statLabel}>Lost</Text></View>
      </View>
      <FlatList data={filteredPets} renderItem={renderPet} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />} ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="paw-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No pets</Text></View>} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  filterContainer: { flexDirection: 'row', backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.xs },
  filterTab: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundDark },
  filterTabActive: { backgroundColor: Colors.primary },
  filterTabText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary, textTransform: 'capitalize' },
  filterTabTextActive: { color: Colors.white },
  stats: { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: Spacing.md, marginTop: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  statDivider: { width: 1, backgroundColor: Colors.border },
  listContent: { padding: Spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  imageContainer: { position: 'relative' },
  petImage: { width: 60, height: 60, borderRadius: BorderRadius.md },
  imagePlaceholder: { width: 60, height: 60, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  statusBadge: { position: 'absolute', bottom: -4, left: 0, right: 0, paddingVertical: 2, borderRadius: 4, alignItems: 'center' },
  statusText: { fontSize: 8, fontWeight: '700', color: Colors.white, textTransform: 'capitalize' },
  info: { flex: 1, marginLeft: Spacing.md },
  name: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  breed: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  species: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  deleteBtn: { padding: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.md },
});
