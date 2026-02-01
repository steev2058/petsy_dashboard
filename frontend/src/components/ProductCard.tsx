import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSize, Spacing, Shadow } from '../constants/theme';

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
}

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
}) => {
  const getCategoryImage = () => {
    switch (product.category) {
      case 'food':
        return 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=300';
      case 'toys':
        return 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=300';
      case 'medicine':
        return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300';
      default:
        return 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=300';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, Shadow.small]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.image || getCategoryImage() }}
          style={styles.image}
          resizeMode="cover"
        />
        {product.original_price && product.original_price > product.price && (
          <View style={styles.saleBadge}>
            <Text style={styles.saleText}>SALE</Text>
          </View>
        )}
        {!product.in_stock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>${product.price.toFixed(2)}</Text>
          {product.original_price && product.original_price > product.price && (
            <Text style={styles.originalPrice}>
              ${product.original_price.toFixed(2)}
            </Text>
          )}
        </View>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={Colors.accent} />
          <Text style={styles.rating}>{product.rating.toFixed(1)}</Text>
        </View>
      </View>
      {onAddToCart && product.in_stock && (
        <TouchableOpacity style={styles.addButton} onPress={onAddToCart}>
          <Ionicons name="add" size={20} color={Colors.white} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginRight: Spacing.md,
  },
  imageContainer: {
    position: 'relative',
    height: 120,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  saleBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  saleText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  content: {
    padding: Spacing.sm,
  },
  brand: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    marginBottom: 2,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
    height: 36,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  price: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  originalPrice: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    textDecorationLine: 'line-through',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.xs,
  },
  rating: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  addButton: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
