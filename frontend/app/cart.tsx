import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { useStore } from '../src/store/useStore';
import { useTranslation } from '../src/hooks/useTranslation';

const { width } = Dimensions.get('window');

export default function CartScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { cart, cartTotal, updateCartQuantity, removeFromCart, clearCart } = useStore();

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to your cart first');
      return;
    }
    router.push('/checkout');
  };

  const handleRemoveItem = (productId: string, name: string) => {
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' ? window.confirm(`Remove ${name} from cart?`) : false;
      if (ok) removeFromCart(productId);
      return;
    }

    Alert.alert(
      'Remove Item',
      `Remove ${name} from cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeFromCart(productId) },
      ]
    );
  };

  const shippingCost = cartTotal > 50 ? 0 : 5.99;
  const totalWithShipping = cartTotal + shippingCost;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Luxury Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Shopping Bag</Text>
          <Text style={styles.itemCount}>{cart.length} {cart.length === 1 ? 'item' : 'items'}</Text>
        </View>
        {cart.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              if (Platform.OS === 'web') {
                const ok = typeof window !== 'undefined' ? window.confirm('Remove all items from cart?') : false;
                if (ok) clearCart();
                return;
              }

              Alert.alert('Clear Cart', 'Remove all items from cart?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear All', style: 'destructive', onPress: clearCart },
              ]);
            }}
          >
            <Ionicons name="trash-outline" size={22} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {cart.length === 0 ? (
        <View style={styles.emptyCart}>
          <View style={styles.emptyIconContainer}>
            <LinearGradient
              colors={[Colors.primary + '30', Colors.primary + '10']}
              style={styles.emptyIconGradient}
            >
              <Ionicons name="bag-outline" size={60} color={Colors.primary} />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>Your bag is empty</Text>
          <Text style={styles.emptyText}>
            Looks like you haven't added any products yet.
            Start shopping to fill your bag with premium pet supplies!
          </Text>
          <TouchableOpacity
            style={styles.shopNowButton}
            onPress={() => router.push('/(tabs)/shop')}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.shopNowGradient}
            >
              <Ionicons name="storefront" size={20} color={Colors.white} />
              <Text style={styles.shopNowText}>Explore Shop</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Free Shipping Banner */}
          {cartTotal < 50 && (
            <View style={styles.shippingBanner}>
              <Ionicons name="car" size={18} color={Colors.primary} />
              <Text style={styles.shippingBannerText}>
                Add <Text style={styles.shippingAmount}>${(50 - cartTotal).toFixed(2)}</Text> more for FREE shipping!
              </Text>
            </View>
          )}

          <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
            {cart.map((item, index) => (
              <View
                key={item.product_id}
                style={[
                  styles.cartItem,
                  Shadow.small,
                  index === cart.length - 1 && { marginBottom: Spacing.lg }
                ]}
              >
                <View style={styles.itemImageContainer}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons name="cube" size={32} color={Colors.textLight} />
                    </View>
                  )}
                </View>
                
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                  
                  <View style={styles.quantitySection}>
                    <View style={styles.quantityControl}>
                      <TouchableOpacity
                        style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
                        onPress={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                      >
                        <Ionicons
                          name="remove"
                          size={16}
                          color={item.quantity <= 1 ? Colors.textLight : Colors.text}
                        />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={16} color={Colors.text} />
                      </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveItem(item.product_id, item.name)}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text style={styles.itemTotal}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}

            {/* Promo Code Section */}
            <TouchableOpacity style={[styles.promoSection, Shadow.small]}>
              <Ionicons name="pricetag" size={20} color={Colors.primary} />
              <Text style={styles.promoText}>Apply Promo Code</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <View style={{ height: 180 }} />
          </ScrollView>

          {/* Checkout Section */}
          <View style={[styles.checkoutSection, Shadow.large]}>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${cartTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                {shippingCost === 0 ? (
                  <View style={styles.freeShippingBadge}>
                    <Text style={styles.freeShippingText}>FREE</Text>
                  </View>
                ) : (
                  <Text style={styles.summaryValue}>${shippingCost.toFixed(2)}</Text>
                )}
              </View>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${totalWithShipping.toFixed(2)}</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.checkoutGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="lock-closed" size={18} color={Colors.white} />
                <Text style={styles.checkoutButtonText}>Secure Checkout</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={styles.securityBadges}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
              <Text style={styles.securityText}>Secure Payment</Text>
              <Text style={styles.securityDot}>•</Text>
              <Ionicons name="refresh" size={14} color={Colors.success} />
              <Text style={styles.securityText}>Easy Returns</Text>
            </View>
          </View>
        </>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: Spacing.sm,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  itemCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  clearButton: {
    padding: Spacing.sm,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyIconContainer: {
    marginBottom: Spacing.lg,
  },
  emptyIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    maxWidth: 280,
  },
  shopNowButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  shopNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  shopNowText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  shippingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '15',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  shippingBannerText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  shippingAmount: {
    fontWeight: '700',
    color: Colors.primary,
  },
  cartList: {
    flex: 1,
    padding: Spacing.md,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  itemImageContainer: {
    marginRight: Spacing.md,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
  },
  itemImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: Colors.backgroundDark,
  },
  quantityText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 32,
    textAlign: 'center',
  },
  removeButton: {
    padding: Spacing.xs,
  },
  itemTotal: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  promoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  promoText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  checkoutSection: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
  },
  summaryContainer: {
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  freeShippingBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  freeShippingText: {
    color: Colors.success,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.primary,
  },
  checkoutButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  checkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 4,
    gap: Spacing.sm,
  },
  checkoutButtonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  securityBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  securityText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  securityDot: {
    color: Colors.textLight,
    marginHorizontal: Spacing.xs,
  },
});
