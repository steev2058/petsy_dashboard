import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar, PetCard, CategoryList, PET_CATEGORIES } from '../../src/components';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';
import { petsAPI } from '../../src/services/api';
import { useTranslation } from '../../src/hooks/useTranslation';

const { width } = Dimensions.get('window');

const STATUS_FILTERS = [
  { id: 'for_adoption', label: 'Adoption', color: Colors.success },
  { id: 'for_sale', label: 'For Sale', color: Colors.primary },
  { id: 'lost', label: 'Lost', color: Colors.error },
  { id: 'found', label: 'Found', color: Colors.warning },
];

export default function AdoptionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('for_adoption');
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPets = async () => {
    try {
      const params: any = {};
      if (selectedStatus && selectedStatus !== 'all') {
        params.status = selectedStatus;
      }
      if (selectedCategory && selectedCategory !== 'all') {
        params.species = selectedCategory;
      }
      
      const response = await petsAPI.getAll(params);
      setPets(response.data);
    } catch (error) {
      console.error('Error loading pets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPets();
  }, [selectedCategory, selectedStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPets();
    setRefreshing(false);
  }, [selectedCategory, selectedStatus]);

  const filteredPets = pets.filter((pet) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pet.name?.toLowerCase().includes(query) ||
      pet.breed?.toLowerCase().includes(query) ||
      pet.location?.toLowerCase().includes(query)
    );
  });

  const renderHeader = () => (
    <View>
      {/* Status Filters */}
      <View style={styles.statusFilters}>
        {STATUS_FILTERS.map((status) => (
          <TouchableOpacity
            key={status.id}
            style={[
              styles.statusButton,
              selectedStatus === status.id && { backgroundColor: status.color },
            ]}
            onPress={() => setSelectedStatus(status.id)}
          >
            <Text
              style={[
                styles.statusText,
                selectedStatus === status.id && styles.statusTextActive,
              ]}
            >
              {status.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pet Categories */}
      <CategoryList
        categories={PET_CATEGORIES}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredPets.length} pets found
        </Text>
        <TouchableOpacity style={styles.sortButton}>
          <Ionicons name="funnel-outline" size={18} color={Colors.primary} />
          <Text style={styles.sortText}>Sort</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('adoption')}</Text>
        <TouchableOpacity>
          <Ionicons name="map-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by name, breed, location..."
      />

      {/* Pet List */}
      <FlatList
        data={filteredPets}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <PetCard
            pet={item}
            onPress={() => router.push(`/pet/${item.id}`)}
            onLike={() => {}}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="paw" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>No pets found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  statusFilters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  statusButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statusTextActive: {
    color: Colors.white,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  resultsCount: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sortText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  row: {
    paddingHorizontal: Spacing.md,
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyText: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
});
