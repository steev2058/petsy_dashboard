import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Input, PaymentMethodSelector, LoyaltyPointsCard } from '../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { useStore } from '../src/store/useStore';
import { ordersAPI, paymentAPI, loyaltyAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

// Cross-platform alert function
const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
  }
};

export default function CheckoutScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { cart, cartTotal, clearCart, user, isAuthenticated } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '' });
  const [loyaltyPoints, setLoyaltyPoints] = useState({ total_points: 0, tier: 'bronze', points_value: 0 });
  const [pointsToUse, setPointsToUse] = useState(0);
  const [formData, setFormData] = useState({
    address: '',
    city: user?.city || '',
    phone: user?.phone || '',
    notes: '',
  });
  const [step, setStep] = useState(1);

  const shippingCost = cartTotal > 50 ? 0 : 5.99;
  const pointsDiscount = pointsToUse / 100; // 100 points = $1
  const totalWithShipping = Math.max(0, cartTotal + shippingCost - pointsDiscount);

  // Load loyalty points on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadLoyaltyPoints();
    }
  }, [isAuthenticated]);

  const loadLoyaltyPoints = async () => {
    try {
      const response = await loyaltyAPI.getPoints();
      setLoyaltyPoints(response.data);
    } catch (error) {
      console.log('Error loading loyalty points:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!formData.address.trim()) {
      showAlert('Missing Information', 'Please enter your shipping address');
      return;
    }
    if (!formData.city.trim()) {
      showAlert('Missing Information', 'Please enter your city');
      return;
    }
    if (!formData.phone.trim()) {
      showAlert('Missing Information', 'Please enter your phone number');
      return;
    }

    // Validate card details if using Stripe
    if (paymentMethod === 'stripe') {
      if (!cardDetails.number || cardDetails.number.length < 15) {
        showAlert('Invalid Card', 'Please enter a valid card number');
        return;
      }
      if (!cardDetails.expiry || cardDetails.expiry.length < 4) {
        showAlert('Invalid Card', 'Please enter a valid expiry date');
        return;
      }
      if (!cardDetails.cvc || cardDetails.cvc.length < 3) {
        showAlert('Invalid Card', 'Please enter a valid CVC');
        return;
      }
    }

    setLoading(true);
    try {
      // First create the order
      const orderData = {
        items: cart.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        total: totalWithShipping,
        shipping_address: formData.address,
        shipping_city: formData.city,
        shipping_phone: formData.phone,
        payment_method: paymentMethod,
        notes: formData.notes,
        points_used: pointsToUse,
      };

      const orderResponse = await ordersAPI.create(orderData);
      const orderId = orderResponse.data?.id;

      // Process payment
      const paymentData = {
        amount: cartTotal + shippingCost,
        payment_method: paymentMethod,
        order_id: orderId,
        points_to_use: pointsToUse,
        ...(paymentMethod === 'stripe' && {
          card_number: cardDetails.number,
          card_expiry: cardDetails.expiry,
          card_cvc: cardDetails.cvc,
        }),
      };

      const paymentResponse = await paymentAPI.processPayment(paymentData);
      
      clearCart();

      // Show success with points earned info
      const pointsEarned = paymentResponse.data?.points_earned || 0;
      const message = pointsEarned > 0 
        ? `Your order has been placed successfully! You earned ${pointsEarned} Petsy Points 🎉`
        : 'Your order has been placed successfully. We will contact you shortly for delivery.';

      showAlert('🎉 Order Confirmed!', message, () => {
        router.replace('/(tabs)/shop');
      });
    } catch (error: any) {
      showAlert(
        'Order Failed',
        error.response?.data?.detail || 'Failed to place order. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Checkout</Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.loginRequired}>
          <View style={styles.loginIconContainer}>
            <Ionicons name="person-circle" size={80} color={Colors.primary} />
          </View>
          <Text style={styles.loginTitle}>Login Required</Text>
          <Text style={styles.loginText}>Please login to complete your purchase</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.loginGradient}
            >
              <Text style={styles.loginButtonText}>Login to Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Checkout</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  step >= s && styles.progressDotActive,
                ]}
              >
                {step > s ? (
                  <Ionicons name="checkmark" size={14} color={Colors.white} />
                ) : (
                  <Text style={[styles.progressNumber, step >= s && styles.progressNumberActive]}>
                    {s}
                  </Text>
                )}
              </View>
              <Text style={[styles.progressLabel, step >= s && styles.progressLabelActive]}>
                {s === 1 ? 'Review' : s === 2 ? 'Shipping' : 'Payment'}
              </Text>
              {s < 3 && <View style={[styles.progressLine, step > s && styles.progressLineActive]} />}
            </View>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Step 1: Order Review */}
          {step === 1 && (
            <>
              <View style={[styles.section, Shadow.small]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="bag-handle" size={20} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Order Summary</Text>
                </View>
                
                {cart.map((item) => (
                  <View key={item.product_id} style={styles.orderItem}>
                    <View style={styles.orderItemImageContainer}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.orderItemImage} />
                      ) : (
                        <View style={styles.orderItemImagePlaceholder}>
                          <Ionicons name="cube" size={20} color={Colors.textLight} />
                        </View>
                      )}
                    </View>
                    <View style={styles.orderItemDetails}>
                      <Text style={styles.orderItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.orderItemQty}>Qty: {item.quantity}</Text>
                    </View>
                    <Text style={styles.orderItemPrice}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}

                <View style={styles.summaryDivider} />
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>${cartTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Shipping</Text>
                  {shippingCost === 0 ? (
                    <Text style={styles.freeShipping}>FREE</Text>
                  ) : (
                    <Text style={styles.summaryValue}>${shippingCost.toFixed(2)}</Text>
                  )}
                </View>
                <View style={[styles.summaryLine, styles.totalLine]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>${(cartTotal + shippingCost).toFixed(2)}</Text>
                </View>
              </View>
            </>
          )}

          {/* Step 2: Shipping Address */}
          {step === 2 && (
            <View style={[styles.section, Shadow.small]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Shipping Address</Text>
              </View>
              
              <Input
                label="Street Address"
                placeholder="Street, Building, Apartment number"
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                leftIcon={<Ionicons name="home-outline" size={20} color={Colors.textSecondary} />}
              />
              <Input
                label="City"
                placeholder="Enter your city"
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                leftIcon={<Ionicons name="business-outline" size={20} color={Colors.textSecondary} />}
              />
              <Input
                label="Phone Number"
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
                leftIcon={<Ionicons name="call-outline" size={20} color={Colors.textSecondary} />}
              />
              <Input
                label="Delivery Notes (Optional)"
                placeholder="Any special instructions?"
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                multiline
                numberOfLines={2}
                leftIcon={<Ionicons name="document-text-outline" size={20} color={Colors.textSecondary} />}
              />
            </View>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <>
              {/* Payment Method */}
              <View style={[styles.section, Shadow.small]}>
                <PaymentMethodSelector
                  selectedMethod={paymentMethod}
                  onSelect={setPaymentMethod}
                  cardDetails={cardDetails}
                  onCardDetailsChange={setCardDetails}
                />
              </View>

              {/* Loyalty Points */}
              <View style={[styles.section, Shadow.small]}>
                <LoyaltyPointsCard
                  totalPoints={loyaltyPoints.total_points}
                  tier={loyaltyPoints.tier}
                  pointsValue={loyaltyPoints.points_value}
                  showRedemption={true}
                  pointsToUse={pointsToUse}
                  onPointsToUseChange={setPointsToUse}
                  orderTotal={cartTotal + shippingCost}
                />
              </View>

              {/* Order Total with Discount */}
              <View style={[styles.section, Shadow.small]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="receipt" size={20} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Final Summary</Text>
                </View>
                <View style={styles.discountSummary}>
                  <Text style={styles.discountLabel}>Order Total</Text>
                  <Text style={styles.summaryValue}>${(cartTotal + shippingCost).toFixed(2)}</Text>
                </View>
                {pointsToUse > 0 && (
                  <View style={styles.discountSummary}>
                    <Text style={styles.discountLabel}>Points Discount</Text>
                    <Text style={styles.discountValue}>-${pointsDiscount.toFixed(2)}</Text>
                  </View>
                )}
                <View style={[styles.discountSummary, { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }]}>
                  <Text style={styles.newTotalLabel}>Amount to Pay</Text>
                  <Text style={styles.newTotalValue}>${totalWithShipping.toFixed(2)}</Text>
                </View>
              </View>
            </>
          )}

          <View style={{ height: 140 }} />
        </ScrollView>

        {/* Place Order Button */}
        <View style={[styles.bottomSection, Shadow.large]}>
          <View style={styles.finalSummary}>
            <View>
              <Text style={styles.finalLabel}>Total Amount</Text>
              <Text style={styles.finalValue}>${totalWithShipping.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={styles.placeOrderButton}
              onPress={handlePlaceOrder}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? [Colors.textLight, Colors.textLight] : [Colors.primary, Colors.primaryDark]}
                style={styles.placeOrderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <Text style={styles.placeOrderText}>Processing...</Text>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                    <Text style={styles.placeOrderText}>Place Order</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  backButton: {},
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  progressNumber: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  progressNumberActive: {
    color: Colors.white,
  },
  progressLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  progressLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  progressLineActive: {
    backgroundColor: Colors.primary,
  },
  section: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    marginBottom: 0,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  orderItemImageContainer: {
    marginRight: Spacing.md,
  },
  orderItemImage: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
  },
  orderItemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemName: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  orderItemQty: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  orderItemPrice: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  freeShipping: {
    fontSize: FontSize.md,
    color: Colors.success,
    fontWeight: '700',
  },
  totalLine: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primary,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundDark,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentIconContainerSelected: {
    backgroundColor: Colors.primary,
  },
  paymentInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  paymentLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentLabelSelected: {
    color: Colors.primary,
  },
  paymentDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  bottomSection: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
  },
  finalSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  finalLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  finalValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.primary,
  },
  placeOrderButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  placeOrderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  placeOrderText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  loginRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loginIconContainer: {
    marginBottom: Spacing.lg,
  },
  loginTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  loginText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  loginButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  loginGradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  discountSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  discountLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  discountValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.success,
  },
  newTotalLabel: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  newTotalValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
});
