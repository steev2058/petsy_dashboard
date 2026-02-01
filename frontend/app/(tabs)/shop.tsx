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
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SearchBar, CategoryList, SHOP_CATEGORIES } from '../../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { productsAPI } from '../../src/services/api';
import { useTranslation } from '../../src/hooks/useTranslation';
import { useStore } from '../../src/store/useStore';

const { width } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - Spacing.md * 3) / 2;

const PET_TYPE_FILTERS = [
  { id: 'all', label: 'All Pets', icon: 'paw' },
  { id: 'dog', label: 'Dogs', icon: 'paw' },
  { id: 'cat', label: 'Cats', icon: 'paw' },
  { id: 'bird', label: 'Birds', icon: 'paw' },
];

interface Product {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  original_price?: number;
  image?: string;
  brand?: string;
  pet_type: string;
  in_stock: boolean;
  rating: number;
  quantity?: number;
}

const LuxuryProductCard = ({ product, onPress, onAddToCart }: {
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
}) => {
  const getCategoryImage = () => {
    switch (product.category) {
      case 'food':
        return 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400';
      case 'toys':
        return 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=400';
      case 'medicine':
        return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400';
      case 'accessories':
        return 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400';
      default:
        return 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400';
    }
  };

  const discount = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={[styles.luxuryCard, Shadow.medium]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.cardImageContainer}>
        <Image
          source={{ uri: product.image || getCategoryImage() }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        {discount > 0 && (
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            style={styles.discountBadge}
          >
            <Text style={styles.discountText}>-{discount}%</Text>
          </LinearGradient>
        )}
        {!product.in_stock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Sold Out</Text>
          </View>
        )}
        <TouchableOpacity style={styles.wishlistButton}>
          <Ionicons name="heart-outline" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardContent}>
        {product.brand && (
          <Text style={styles.brandName}>{product.brand}</Text>
        )}
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= Math.floor(product.rating) ? 'star' : 'star-outline'}
              size={12}
              color={Colors.accent}
            />
          ))}
          <Text style={styles.ratingText}>({product.rating.toFixed(1)})</Text>
        </View>
        
        <View style={styles.priceContainer}>
          <View>
            <Text style={styles.currentPrice}>${product.price.toFixed(2)}</Text>
            {product.original_price && product.original_price > product.price && (
              <Text style={styles.originalPrice}>
                ${product.original_price.toFixed(2)}
              </Text>
            )}
          </View>
          {product.in_stock && (
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={(e) => {
                e.stopPropagation();
                onAddToCart();
              }}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.addToCartGradient}
              >
                <Ionicons name="bag-add" size={18} color={Colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ShopScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { cart, addToCart } = useStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>('all');
  const [selectedPetType, setSelectedPetType] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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

  const handleAddToCart = (product: Product) => {
    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
    Alert.alert(
      '✨ Added to Cart',
      `${product.name} has been added to your cart`,
      [{ text: 'Continue Shopping' }, { text: 'View Cart', onPress: () => router.push('/cart') }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Luxury Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.title}>Petsy Shop</Text>
        </View>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push('/cart')}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.cartButtonGradient}
          >
            <Ionicons name="bag-handle" size={24} color={Colors.white} />
          </LinearGradient>
          {cartItemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search premium products..."
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Featured Banner */}
        <TouchableOpacity style={styles.featuredBanner}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featuredGradient}
          >
            <View style={styles.featuredContent}>
              <View style={styles.featuredTextContainer}>
                <Text style={styles.featuredTitle}>Premium Collection</Text>
                <Text style={styles.featuredSubtitle}>Up to 30% OFF</Text>
                <View style={styles.shopNowButton}>
                  <Text style={styles.shopNowText}>Shop Now</Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.white} />
                </View>
              </View>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=300' }}
                style={styles.featuredImage}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

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
              {selectedPetType === type.id ? (
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={styles.petTypeGradient}
                >
                  <Ionicons name={type.icon as any} size={16} color={Colors.white} />
                  <Text style={styles.petTypeTextActive}>{type.label}</Text>
                </LinearGradient>
              ) : (
                <>
                  <Ionicons name={type.icon as any} size={16} color={Colors.primary} />
                  <Text style={styles.petTypeText}>{type.label}</Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <CategoryList
          categories={SHOP_CATEGORIES}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {/* Products Grid */}
        <View style={styles.productsHeader}>
          <Text style={styles.sectionTitle}>All Products</Text>
          <Text style={styles.productCount}>{filteredProducts.length} items</Text>
        </View>
        
        <View style={styles.productsGrid}>
          {filteredProducts.map((product) => (
            <LuxuryProductCard
              key={product.id}
              product={product}
              onPress={() => router.push(`/product/${product.id}`)}
              onAddToCart={() => handleAddToCart(product)}
            />
          ))}
        </View>

        {filteredProducts.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="storefront" size={48} color={Colors.white} />
            </View>
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptyText}>Try adjusting your filters</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  welcomeText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  cartButton: {
    position: 'relative',
  },
  cartButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  cartBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  searchContainer: {
    backgroundColor: Colors.white,
    paddingBottom: Spacing.sm,
  },
  featuredBanner: {
    margin: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.large,
  },
  featuredGradient: {
    padding: Spacing.lg,
  },
  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredTextContainer: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  featuredSubtitle: {
    fontSize: FontSize.lg,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: Spacing.md,
  },
  shopNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  shopNowText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  featuredImage: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.lg,
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
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  petTypeButtonActive: {
    borderWidth: 0,
    padding: 0,
    overflow: 'hidden',
  },
  petTypeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  petTypeText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  petTypeTextActive: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: Spacing.md,
  },
  productCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  luxuryCard: {
    width: PRODUCT_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  cardImageContainer: {
    position: 'relative',
    height: 140,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  discountText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  wishlistButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: Spacing.sm,
  },
  brandName: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
    height: 40,
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: 2,
  },
  ratingText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primary,
  },
  originalPrice: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  addToCartGradient: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
