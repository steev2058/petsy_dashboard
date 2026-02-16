import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { vetsAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

type Vet = {
  id: string;
  name: string;
  specialty?: string;
  clinic_name?: string;
  city?: string;
  phone?: string;
  rating?: number;
  reviews_count?: number;
};

const SPECIALTIES = ['all', 'dogs', 'cats', 'birds'];

export default function VetsScreen() {
  const router = useRouter();
  const { language } = useTranslation();

  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [specialty, setSpecialty] = useState('all');

  const labels = {
    title: language === 'ar' ? 'الأطباء البيطريون' : 'Vets',
    search: language === 'ar' ? 'ابحث بالاسم أو العيادة...' : 'Search by name or clinic...',
    city: language === 'ar' ? 'المدينة' : 'City',
    noData: language === 'ar' ? 'لا يوجد أطباء مطابقين' : 'No vets found',
    all: language === 'ar' ? 'الكل' : 'All',
    dogs: language === 'ar' ? 'كلاب' : 'Dogs',
    cats: language === 'ar' ? 'قطط' : 'Cats',
    birds: language === 'ar' ? 'طيور' : 'Birds',
  };

  const loadVets = async () => {
    try {
      const params: any = {};
      if (city.trim()) params.city = city.trim();
      if (specialty !== 'all') params.specialty = specialty;
      const res = await vetsAPI.getAll(params);
      setVets(res.data || []);
    } catch (e) {
      setVets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVets();
  }, [city, specialty]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vets;
    return vets.filter(v =>
      `${v.name || ''} ${v.clinic_name || ''} ${v.city || ''}`.toLowerCase().includes(q),
    );
  }, [vets, search]);

  const onRefresh = () => {
    setRefreshing(true);
    loadVets();
  };

  const renderVet = ({ item }: { item: Vet }) => (
    <TouchableOpacity style={[styles.card, Shadow.small]} onPress={() => router.push(`/vet/${item.id}` as any)}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(item.name || 'V')[0].toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>{item.clinic_name || '-'}</Text>
          <Text style={styles.meta}>{item.city || '-'}</Text>
        </View>
        <View style={styles.ratingWrap}>
          <Ionicons name="star" size={14} color="#F59E0B" />
          <Text style={styles.ratingText}>{Number(item.rating || 0).toFixed(1)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{labels.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={labels.search}
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="location" size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={labels.city}
          placeholderTextColor={Colors.textLight}
          value={city}
          onChangeText={setCity}
        />
      </View>

      <View style={styles.filtersRow}>
        {SPECIALTIES.map((sp) => (
          <TouchableOpacity
            key={sp}
            style={[styles.filterChip, specialty === sp && styles.filterChipActive]}
            onPress={() => setSpecialty(sp)}
          >
            <Text style={[styles.filterText, specialty === sp && styles.filterTextActive]}>
              {(labels as any)[sp] || sp}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderVet}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 90 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          ListEmptyComponent={<Text style={styles.empty}>{labels.noData}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, height: 44, color: Colors.text },
  filtersRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, marginTop: Spacing.sm },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.backgroundDark },
  filterChipActive: { backgroundColor: Colors.primary },
  filterText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  filterTextActive: { color: Colors.white },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.xl },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: '700', color: Colors.primary },
  name: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  meta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
});
