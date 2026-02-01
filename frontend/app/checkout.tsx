import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { useStore } from '../src/store/useStore';
import { ordersAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

const PAYMENT_METHODS = [
  { id: 'cash_on_delivery', label: 'Cash on Delivery', icon: 'cash' },
  { id: 'whatsapp', label: 'Pay via WhatsApp', icon: 'logo-whatsapp' },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { cart, cartTotal, clearCart, user } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [formData, setFormData] = useState({
    address: '',
    city: user?.city || '',
    phone: user?.phone || '',
    notes: '',
  });

  const handlePlaceOrder = async () => {
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter your shipping address');
      return;
    }
    if (!formData.city.trim()) {
      Alert.alert('Error', 'Please enter your city');
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        items: cart.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        total: cartTotal,
        shipping_address: formData.address,
        shipping_city: formData.city,
        shipping_phone: formData.phone,
        payment_method: paymentMethod,
        notes: formData.notes,
      };

      await ordersAPI.create(orderData);
      clearCart();

      Alert.alert(
        'Order Placed!',
        'Your order has been placed successfully. We will contact you shortly.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/profile'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to place order. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Order Summary */}
          <View style={[styles.section, Shadow.small]}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {cart.map((item) => (
              <View key={item.product_id} style={styles.orderItem}>
                <Text style={styles.orderItemName} numberOfLines={1}>
                  {item.quantity}x {item.name}
                </Text>
                <Text style={styles.orderItemPrice}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${cartTotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Shipping Address */}
          <View style={[styles.section, Shadow.small]}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <Input
              label="Address"
              placeholder="Street, Building, Apartment"
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
            />
            <Input
              label="City"
              placeholder="Damascus, Aleppo, etc."
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
            />
            <Input
              label="Phone Number"
              placeholder="+963 xxx xxx xxx"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
            />
            <Input
              label="Notes (optional)"
              placeholder="Special instructions for delivery"
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Payment Method */}
          <View style={[styles.section, Shadow.small]}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentOption,
                  paymentMethod === method.id && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMethod(method.id)}
              >
                <Ionicons
                  name={method.icon as any}
                  size={24}
                  color={paymentMethod === method.id ? Colors.white : Colors.primary}
                />
                <Text
                  style={[
                    styles.paymentLabel,
                    paymentMethod === method.id && styles.paymentLabelSelected,
                  ]}
                >
                  {method.label}
                </Text>
                {paymentMethod === method.id && (
                  <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Place Order Button */}
        <View style={[styles.bottomSection, Shadow.large]}>
          <View style={styles.finalTotal}>
            <Text style={styles.finalTotalLabel}>Total to Pay</Text>
            <Text style={styles.finalTotalValue}>${cartTotal.toFixed(2)}</Text>
          </View>
          <Button
            title="Place Order"
            onPress={handlePlaceOrder}
            loading={loading}
            style={styles.placeOrderButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
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
  backButton: {
    padding: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  section: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    marginBottom: 0,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  orderItemName: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  orderItemPrice: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundDark,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  paymentOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentLabelSelected: {
    color: Colors.white,
  },
  bottomSection: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  finalTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  finalTotalLabel: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
  },
  finalTotalValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.primary,
  },
  placeOrderButton: {
    width: '100%',
  },
});
