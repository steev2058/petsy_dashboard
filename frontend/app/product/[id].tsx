import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { productsAPI } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import { useTranslation } from '../../src/hooks/useTranslation';

const { width } = Dimensions.get('window');

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

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, isRTL } = useTranslation();
  const { addToCart, cart } = useStore();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await productsAPI.getById(id as string);
      setProduct(response.data);
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: selectedQuantity,
    });
    
    Alert.alert(
      '✨ Added to Cart',
      `${selectedQuantity}x ${product.name} added to your cart`,
      [
        { text: 'Continue Shopping', onPress: () => router.back() },
        { text: 'View Cart', onPress: () => router.push('/cart') },
      ]
    );
  };

  const getCategoryImage = () => {
    if (!product) return '';
    switch (product.category) {
      case 'food':
        return 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600';
      case 'toys':
        return 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=600';
      case 'medicine':
        return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600';
      case 'accessories':
        return 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600';
      default:
        return 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.error} />
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity style={styles.backToShopButton} onPress={() => router.back()}>
            <Text style={styles.backToShopText}>Back to Shop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const discount = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <View style={styles.headerButtonInner}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/cart')}
        >
          <View style={styles.headerButtonInner}>
            <Ionicons name="bag-handle" size={22} color={Colors.text} />
          </View>
          {cartItemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.image || getCategoryImage() }}
            style={styles.productImage}
            resizeMode="cover"
          />
          {discount > 0 && (
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53']}
              style={styles.discountBadge}
            >
              <Text style={styles.discountText}>-{discount}% OFF</Text>
            </LinearGradient>
          )}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => setIsFavorite(!isFavorite)}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? Colors.error : Colors.white}
            />
          </TouchableOpacity>
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          {/* Brand & Category */}
          <View style={styles.metaRow}>
            {product.brand && (
              <View style={styles.brandBadge}>
                <Text style={styles.brandText}>{product.brand}</Text>
              </View>
            )}
            <View style={styles.categoryBadge}>
              <Ionicons name="paw" size={12} color={Colors.primary} />
              <Text style={styles.categoryText}>
                {product.pet_type === 'all' ? 'All Pets' : product.pet_type}
              </Text>
            </View>
          </View>

          {/* Name & Rating */}
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.floor(product.rating) ? 'star' : 'star-outline'}
                  size={18}
                  color={Colors.accent}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>{product.rating.toFixed(1)} rating</Text>
            <View style={styles.stockBadge}>
              <View style={[styles.stockDot, { backgroundColor: product.in_stock ? Colors.success : Colors.error }]} />
              <Text style={[styles.stockText, { color: product.in_stock ? Colors.success : Colors.error }]}>
                {product.in_stock ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceSection}>
            <Text style={styles.currentPrice}>${product.price.toFixed(2)}</Text>
            {product.original_price && product.original_price > product.price && (
              <Text style={styles.originalPrice}>${product.original_price.toFixed(2)}</Text>
            )}
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              {product.description || `Premium quality ${product.category} for your beloved ${product.pet_type}. This product is carefully selected to ensure the best care for your pet. Made with high-quality ingredients and materials.`}
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.featuresGrid}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#0284C7" />
                </View>
                <Text style={styles.featureText}>Quality Assured</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#D97706" />
                </View>
                <Text style={styles.featureText}>Safe & Natural</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="leaf" size={20} color="#059669" />
                </View>
                <Text style={styles.featureText}>Eco-Friendly</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#FCE7F3' }]}>
                  <Ionicons name="heart" size={20} color="#DB2777" />
                </View>
                <Text style={styles.featureText}>Pet Approved</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      {product.in_stock && (
        <View style={[styles.bottomBar, Shadow.large]}>
          <View style={styles.quantitySelector}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
            >
              <Ionicons name="remove" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{selectedQuantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setSelectedQuantity(selectedQuantity + 1)}
            >
              <Ionicons name="add" size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.addToCartGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="bag-add" size={22} color={Colors.white} />
              <Text style={styles.addToCartText}>
                Add to Cart • ${(product.price * selectedQuantity).toFixed(2)}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    zIndex: 10,
  },
  headerButton: {
    position: 'relative',
  },
  headerButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.medium,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  imageContainer: {
    width: width,
    height: width,
    backgroundColor: Colors.backgroundDark,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 100,
    left: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  discountText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  favoriteButton: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    marginTop: -24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  brandBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  brandText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textTransform: 'capitalize',
  },
  productName: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
  },
  originalPrice: {
    fontSize: FontSize.lg,
    color: Colors.textLight,
    textDecorationLine: 'line-through',
  },
  descriptionSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  descriptionText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  featuresSection: {
    marginBottom: Spacing.lg,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  featureItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundDark,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  addToCartButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  addToCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    gap: Spacing.sm,
  },
  addToCartText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSize.xl,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backToShopButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  backToShopText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
