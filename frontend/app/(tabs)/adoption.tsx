import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '../../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { petsAPI } from '../../src/services/api';

const STATUS_TABS = [
  { id: 'for_adoption', label: 'Adoption' },
  { id: 'for_sale', label: 'For Sale' },
  { id: 'lost', label: 'Lost' },
  { id: 'found', label: 'Found' },
];

const SPECIES_FILTERS = [
  { id: 'all', label: 'All', color: '#FF7A45' },
  { id: 'dog', label: 'Dogs', color: '#FF6B6B' },
  { id: 'cat', label: 'Cats', color: '#2EC4B6' },
  { id: 'bird', label: 'Birds', color: '#4CB3D4' },
];

const isDog = (species?: string) => (species || '').toLowerCase() === 'dog';

export default function AdoptionScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('for_adoption');
  const [species, setSpecies] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'name'>('newest');
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const params: any = { status };
      if (species !== 'all') params.species = species;
      const res = await petsAPI.getAll(params);
      let rows = res.data || [];
      // keep Islamic rule for sale
      if (status === 'for_sale') rows = rows.filter((p: any) => !isDog(p.species));
      setPets(rows);
    } catch (e) {
      console.error('adoption load error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status, species]);

  const filtered = useMemo(() => {
    let rows = [...pets];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((p) => (`${p.name || ''} ${p.breed || ''} ${p.location || ''}`).toLowerCase().includes(q));
    }
    if (sortBy === 'name') rows.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    else rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    return rows;
  }, [pets, search, sortBy]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) {
    return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Adoption</Text>
        <TouchableOpacity><Ionicons name='map-outline' size={22} color={Colors.primary} /></TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder='Search by name, breed, location...' />

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STATUS_TABS}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.statusRow}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.statusChip, status === item.id && styles.statusChipActive]} onPress={() => setStatus(item.id)}>
            <Text style={[styles.statusText, status === item.id && styles.statusTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={SPECIES_FILTERS}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.speciesRow}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.speciesItem} onPress={() => setSpecies(item.id)}>
            <View style={[styles.speciesIcon, { backgroundColor: item.color }, species === item.id && styles.speciesIconActive]}>
              <Ionicons name='paw' size={22} color={Colors.white} />
            </View>
            <Text style={[styles.speciesText, species === item.id && styles.speciesTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.resultRow}>
        <Text style={styles.resultText}>{filtered.length} pets found</Text>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setSortBy((s) => (s === 'newest' ? 'name' : 'newest'))}>
          <Ionicons name='funnel-outline' size={16} color={Colors.primary} />
          <Text style={styles.sortText}>Sort</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, Shadow.small]} onPress={() => router.push(`/pet/${item.id}`)}>
            <View style={styles.imageWrap}>
              {item.image ? <Image source={{ uri: item.image }} style={styles.image} /> : <View style={styles.imagePlaceholder}><Ionicons name='paw' size={24} color={Colors.textLight} /></View>}
              <View style={styles.badge}><Text style={styles.badgeText}>{item.status === 'for_sale' ? 'For Sale' : item.status === 'lost' ? 'Lost' : item.status === 'found' ? 'Found' : 'Adoption'}</Text></View>
              <TouchableOpacity style={styles.likeBtn}><Ionicons name='heart-outline' size={18} color={Colors.white} /></TouchableOpacity>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name} numberOfLines={1}>{item.name || 'Pet'}</Text>
              <Text style={styles.breed} numberOfLines={1}>{item.breed || 'Mixed breed'}</Text>
              <Text style={styles.meta}>♂ {item.age || 'N/A'}</Text>
              <Text style={styles.meta}>📍 {item.location || 'Unknown'}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={styles.center}><Text style={{ color: Colors.textSecondary }}>No pets found</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },

  statusRow: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs, gap: Spacing.sm },
  statusChip: { paddingVertical: 10, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  statusChipActive: { backgroundColor: '#20C3B3', borderColor: '#20C3B3' },
  statusText: { fontWeight: '600', color: Colors.textSecondary },
  statusTextActive: { color: Colors.white },

  speciesRow: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.md },
  speciesItem: { alignItems: 'center', width: 70 },
  speciesIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  speciesIconActive: { borderWidth: 3, borderColor: '#FFFFFFAA' },
  speciesText: { marginTop: 6, fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  speciesTextActive: { color: Colors.text },

  resultRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultText: { fontSize: FontSize.lg, color: Colors.textSecondary },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { color: Colors.primary, fontWeight: '600' },

  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  gridRow: { justifyContent: 'space-between', marginBottom: Spacing.md },
  card: { width: '48%', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  imageWrap: { position: 'relative', height: 130 },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#20C3B3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  badgeText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  likeBtn: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: '#00000044', justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: Spacing.sm },
  name: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  breed: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: 2 },
  meta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
});