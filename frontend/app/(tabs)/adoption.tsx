import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '../../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { petsAPI } from '../../src/services/api';
import { useTranslation } from '../../src/hooks/useTranslation';

const TX_SECTIONS = [{ id: 'adoption', label: 'Adoption' }, { id: 'sale', label: 'For Sale' }];
const FILTERS = [
  { id: 'permissible', label: 'Permissible Pets' },
  { id: 'adoption_only', label: 'Adoption Only' },
  { id: 'guard_dogs', label: 'Guard Dogs (Allowed Uses)' },
  { id: 'cats', label: 'Cats' },
  { id: 'birds', label: 'Birds' },
  { id: 'all', label: 'All' },
];

const PERMISSIBLE = new Set(['cat', 'bird', 'fish', 'rabbit', 'cow', 'goat', 'sheep', 'camel', 'horse', 'chicken']);
const DOG_ALLOWED_KEYWORDS = ['guard', 'farm', 'service', 'security', 'herding'];

const isDog = (species?: string) => (species || '').toLowerCase() === 'dog';
const isPermissible = (species?: string) => PERMISSIBLE.has((species || '').toLowerCase());
const isGuardUseDog = (pet: any) => isDog(pet?.species) && DOG_ALLOWED_KEYWORDS.some(k => `${pet?.description || ''}`.toLowerCase().includes(k));

export default function AdoptionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [tx, setTx] = useState<'adoption' | 'sale'>('adoption');
  const [filter, setFilter] = useState('permissible');
  const [sort, setSort] = useState<'newest' | 'age'>('newest');
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const status = tx === 'sale' ? 'for_sale' : 'for_adoption';
      const res = await petsAPI.getAll({ status });
      let rows = res.data || [];
      if (tx === 'sale') rows = rows.filter((p: any) => !isDog(p?.species));
      setPets(rows);
    } catch (e) {
      console.error('adoption load error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tx]);

  const list = useMemo(() => {
    let rows = [...pets];
    if (filter === 'permissible') rows = rows.filter((p) => isPermissible(p.species));
    if (filter === 'adoption_only') rows = rows.filter((p) => p.status === 'for_adoption');
    if (filter === 'guard_dogs') rows = rows.filter((p) => isGuardUseDog(p));
    if (filter === 'cats') rows = rows.filter((p) => (p.species || '').toLowerCase() === 'cat');
    if (filter === 'birds') rows = rows.filter((p) => (p.species || '').toLowerCase() === 'bird');

    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((p) => (`${p.name || ''} ${p.breed || ''} ${p.location || ''}`).toLowerCase().includes(q));
    }

    if (sort === 'age') rows.sort((a, b) => String(a.age || '').localeCompare(String(b.age || '')));
    else rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    return rows;
  }, [pets, filter, query, sort]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><Text style={styles.title}>{t('adoption')}</Text></View>

      <View style={styles.noticeBox}><Ionicons name='information-circle' size={16} color={Colors.primary} /><Text style={styles.noticeText}>Kindness to animals is a core value in Islam. Listings are moderated for ethical treatment and transparency.</Text></View>

      <View style={styles.txRow}>
        {TX_SECTIONS.map((s) => (
          <TouchableOpacity key={s.id} style={[styles.txBtn, tx === s.id && styles.txBtnActive]} onPress={() => setTx(s.id as any)}>
            <Text style={[styles.txText, tx === s.id && styles.txTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tx === 'sale' && <Text style={styles.ruleText}>Dogs are restricted to adoption/rehoming only and hidden from sale listings.</Text>}

      <View style={styles.searchWrap}>
        <SearchBar value={query} onChangeText={setQuery} placeholder='Search by name, breed, location...' />
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={FILTERS}
        keyExtractor={(i) => i.id}
        style={styles.filterList}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.filterChip, filter === item.id && styles.filterChipActive]} onPress={() => setFilter(item.id)}>
            <Text numberOfLines={1} style={[styles.filterChipText, filter === item.id && styles.filterChipTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.infoPanel}>
        <Text style={styles.infoTitle}>Islamic Pet Ownership Notes</Text>
        <Text style={styles.infoText}>• Sale listings are limited to permissible pets.</Text>
        <Text style={styles.infoText}>• Dogs are shown as adoption/rehoming, and should be for allowed uses (guard/farm/service).</Text>
        <Text style={styles.infoText}>• Verify health status, age, and vaccination before any transaction.</Text>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>{list.length} listings</Text>
        <TouchableOpacity onPress={() => setSort((s) => (s === 'newest' ? 'age' : 'newest'))}>
          <Text style={styles.sortText}>{sort === 'newest' ? 'Sort: Newest' : 'Sort: Age'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, Shadow.small]} onPress={() => router.push(`/pet/${item.id}`)}>
            <View style={styles.cardRow}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.petImage} />
              ) : (
                <View style={styles.petImagePlaceholder}><Ionicons name='paw' size={24} color={Colors.textLight} /></View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.cardTop}>
                  <Text style={styles.name}>{item.name || 'Pet'}</Text>
                  <View style={[styles.badge, { backgroundColor: item.status === 'for_sale' ? Colors.primary : Colors.success }]}>
                    <Text style={styles.badgeText}>{item.status === 'for_sale' ? 'For Sale' : 'Adoption'}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>{(item.species || 'unknown').toUpperCase()} • {item.breed || 'Mixed'}</Text>
                <Text style={styles.meta}>Age: {item.age || 'N/A'} • Vaccinated: {item.vaccinated ? 'Yes' : 'No'}</Text>
                <Text style={styles.meta}>Location: {item.location || 'N/A'}</Text>
              </View>
            </View>
            {isDog(item.species) && <Text style={styles.dogNote}>Dog listing: adoption/rehoming only. Allowed uses include guarding, farming, or service support.</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No listings found for current filters.</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  noticeBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#EEF6FF', borderRadius: BorderRadius.md, marginHorizontal: Spacing.md, marginTop: Spacing.sm, padding: Spacing.sm },
  noticeText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm },
  txRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  txBtn: { flex: 1, height: 44, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  txBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  txText: { color: Colors.text, fontWeight: '600' },
  txTextActive: { color: Colors.white },
  searchWrap: { paddingTop: 2, paddingBottom: 8 },
  ruleText: { paddingHorizontal: Spacing.md, marginTop: 4, marginBottom: 6, color: Colors.textSecondary, fontSize: FontSize.xs },
  filterList: { marginBottom: Spacing.xs },
  filterRow: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm, alignItems: 'center' },
  filterChip: { height: 38, minWidth: 96, maxWidth: 220, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  filterChipTextActive: { color: Colors.white },
  infoPanel: { marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.sm, padding: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  infoTitle: { fontWeight: '700', color: Colors.text, marginBottom: 4 },
  infoText: { color: Colors.textSecondary, fontSize: FontSize.xs, marginBottom: 2 },
  resultsHeader: { paddingHorizontal: Spacing.md, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultsText: { color: Colors.textSecondary },
  sortText: { color: Colors.primary, fontWeight: '600', fontSize: FontSize.sm },
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 110 },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardRow: { flexDirection: 'row', gap: Spacing.md },
  petImage: { width: 84, height: 84, borderRadius: BorderRadius.md },
  petImagePlaceholder: { width: 84, height: 84, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundDark, alignItems: 'center', justifyContent: 'center' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  badgeText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  meta: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 4 },
  dogNote: { marginTop: 8, color: '#7A4B00', fontSize: FontSize.xs, backgroundColor: '#FFF4DD', padding: 8, borderRadius: BorderRadius.sm },
  emptyText: { color: Colors.textSecondary },
});
