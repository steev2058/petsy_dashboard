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
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { vetsAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';
import * as Location from 'expo-location';

type Vet = {
  id: string;
  name: string;
  specialty?: string;
  clinic_name?: string;
  city?: string;
  phone?: string;
  rating?: number;
  reviews_count?: number;
  latitude?: number;
  longitude?: number;
};

const SPECIALTIES = ['all', 'dogs', 'cats', 'birds'];

type SortMode = 'rating' | 'nearest';

export default function VetsScreen() {
  const router = useRouter();
  const { language } = useTranslation();

  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [sortBy, setSortBy] = useState<SortMode>('rating');
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const labels = {
    title: language === 'ar' ? 'الأطباء البيطريون' : 'Vets',
    search: language === 'ar' ? 'ابحث بالاسم أو العيادة...' : 'Search by name or clinic...',
    city: language === 'ar' ? 'المدينة' : 'City',
    noData: language === 'ar' ? 'لا يوجد أطباء مطابقين' : 'No vets found',
    all: language === 'ar' ? 'الكل' : 'All',
    dogs: language === 'ar' ? 'كلاب' : 'Dogs',
    cats: language === 'ar' ? 'قطط' : 'Cats',
    birds: language === 'ar' ? 'طيور' : 'Birds',
    sortRating: language === 'ar' ? 'الأعلى تقييماً' : 'Top rated',
    sortNearest: language === 'ar' ? 'الأقرب' : 'Nearest',
    call: language === 'ar' ? 'اتصال' : 'Call',
    openMap: language === 'ar' ? 'الخريطة' : 'Map',
    locationOff: language === 'ar' ? 'فعّل الموقع لإظهار الأقرب' : 'Enable location for nearest sort',
  };

  const loadVets = async () => {
    try {
      const params: any = {};
      if (city.trim()) params.city = city.trim();
      if (search.trim()) params.q = search.trim();
      if (specialty !== 'all') params.pet_type = specialty;
      params.sort = sortBy === 'nearest' ? 'nearest' : 'top_rated';
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
  }, [city, specialty, sortBy, search]);

  useEffect(() => {
    if (sortBy !== 'nearest') return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setMyLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch {
        // ignore
      }
    })();
  }, [sortBy]);

  const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = !q
      ? [...vets]
      : vets.filter(v => `${v.name || ''} ${v.clinic_name || ''} ${v.city || ''}`.toLowerCase().includes(q));

    if (sortBy === 'nearest' && myLocation) {
      rows.sort((a, b) => {
        const ad = (a.latitude != null && a.longitude != null)
          ? distanceKm(myLocation.latitude, myLocation.longitude, a.latitude, a.longitude)
          : Number.POSITIVE_INFINITY;
        const bd = (b.latitude != null && b.longitude != null)
          ? distanceKm(myLocation.latitude, myLocation.longitude, b.latitude, b.longitude)
          : Number.POSITIVE_INFINITY;
        return ad - bd;
      });
    } else {
      rows.sort((a, b) => (Number(b.rating || 0) - Number(a.rating || 0)));
    }

    return rows;
  }, [vets, search, sortBy, myLocation]);

  const onRefresh = () => {
    setRefreshing(true);
    loadVets();
  };

  const renderVet = ({ item }: { item: Vet }) => {
    const canShowDistance = !!myLocation && item.latitude != null && item.longitude != null;
    const distance = canShowDistance
      ? distanceKm(myLocation!.latitude, myLocation!.longitude, item.latitude!, item.longitude!)
      : null;

    return (
      <TouchableOpacity style={[styles.card, Shadow.small]} onPress={() => router.push(`/vet/${item.id}` as any)}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(item.name || 'V')[0].toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.clinic_name || '-'}</Text>
            <Text style={styles.meta}>{item.city || '-'}</Text>
            {distance != null && <Text style={styles.meta}>{distance.toFixed(1)} km</Text>}
          </View>
          <View style={styles.ratingWrap}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>{Number(item.rating || 0).toFixed(1)}</Text>
          </View>
        </View>
        <View style={styles.actionsRow}>
          {!!item.phone && (
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => {
                const phone = String(item.phone || '').trim();
                if (!phone) return;
                Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Cannot open dialer'));
              }}
            >
              <Ionicons name="call" size={15} color={Colors.white} />
              <Text style={styles.callBtnText}>{labels.call}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() => {
              const hasCoords = item.latitude != null && item.longitude != null;
              const url = hasCoords
                ? `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.clinic_name || item.name || ''} ${item.city || ''}`.trim())}`;
              Linking.openURL(url).catch(() => Alert.alert('Error', 'Cannot open maps'));
            }}
          >
            <Ionicons name="map" size={15} color={Colors.primary} />
            <Text style={styles.mapBtnText}>{labels.openMap}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

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

      <View style={[styles.filtersRow, { marginTop: 6 }]}> 
        <TouchableOpacity style={[styles.filterChip, sortBy === 'rating' && styles.filterChipActive]} onPress={() => setSortBy('rating')}>
          <Text style={[styles.filterText, sortBy === 'rating' && styles.filterTextActive]}>{labels.sortRating}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterChip, sortBy === 'nearest' && styles.filterChipActive]} onPress={() => setSortBy('nearest')}>
          <Text style={[styles.filterText, sortBy === 'nearest' && styles.filterTextActive]}>{labels.sortNearest}</Text>
        </TouchableOpacity>
      </View>

      {sortBy === 'nearest' && !myLocation && (
        <Text style={styles.locationHint}>{labels.locationOff}</Text>
      )}

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
  locationHint: { color: Colors.textSecondary, fontSize: FontSize.xs, paddingHorizontal: Spacing.md, marginTop: 6 },
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
  actionsRow: { flexDirection: 'row', marginTop: Spacing.sm, justifyContent: 'flex-end', gap: 8 },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  callBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  mapBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
});
