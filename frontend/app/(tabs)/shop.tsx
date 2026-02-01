import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar, ProductCard, CategoryList, SHOP_CATEGORIES } from '../../src/components';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';
import { productsAPI } from '../../src/services/api';
import { useTranslation } from '../../src/hooks/useTranslation';
import { useStore } from '../../src/store/useStore';

const PET_TYPE_FILTERS = [
  { id: 'all', label: 'All', icon: 'paw' },
  { id: 'dog', label: 'Dogs', icon: 'paw' },
  { id: 'cat', label: 'Cats', icon: 'paw' },
  { id: 'bird', label: 'Birds', icon: 'paw' },
];

export default function ShopScreen() {
  const { t } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>('all');
  const [selectedPetType, setSelectedPetType] = useState('all');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = async () => {
    try {
      const params: any = {};
      if (selectedCategory && selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (selectedPetType && selectedPetType !== 'all') {
        params.pet_type = selectedPetType;
      }
      
      const response = await productsAPI.getAll(params);
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, selectedPetType]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, [selectedCategory, selectedPetType]);

  const filteredProducts = products.filter((product) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name?.toLowerCase().includes(query) ||
      product.brand?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query)
    );
  });

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
        <Text style={styles.title}>{t('shop')}</Text>
        <TouchableOpacity style={styles.cartButton}>
          <Ionicons name="cart-outline" size={26} color={Colors.text} />
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>0</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search products..."
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Pet Type Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.petTypeFilters}
        >
          {PET_TYPE_FILTERS.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.petTypeButton,
                selectedPetType === type.id && styles.petTypeButtonActive,
              ]}
              onPress={() => setSelectedPetType(type.id)}
            >
              <Ionicons
                name={type.icon as any}
                size={18}
                color={selectedPetType === type.id ? Colors.white : Colors.primary}
              />
              <Text
                style={[
                  styles.petTypeText,
                  selectedPetType === type.id && styles.petTypeTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Categories */}
        <Text style={styles.sectionTitle}>{t('categories')}</Text>
        <CategoryList
          categories={SHOP_CATEGORIES}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {/* Products Grid */}
        <Text style={styles.sectionTitle}>Products ({filteredProducts.length})</Text>
        <View style={styles.productsGrid}>
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => {}}
              onAddToCart={() => {}}
            />
          ))}
        </View>

        {filteredProducts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
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
  cartButton: {
    position: 'relative',
    padding: Spacing.xs,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  petTypeFilters: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  petTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: Spacing.xs,
  },
  petTypeButtonActive: {
    backgroundColor: Colors.primary,
  },
  petTypeText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  petTypeTextActive: {
    color: Colors.white,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyText: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
});
