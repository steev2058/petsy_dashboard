import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../constants/theme';

interface PaymentMethodSelectorProps {
  selectedMethod: string;
  onSelect: (method: string) => void;
  cardDetails?: {
    number: string;
    expiry: string;
    cvc: string;
  };
  onCardDetailsChange?: (details: { number: string; expiry: string; cvc: string }) => void;
}

const PAYMENT_METHODS = [
  {
    id: 'stripe',
    name: 'Credit/Debit Card',
    icon: 'card',
    description: 'Visa, Mastercard, Amex',
    brands: ['visa', 'mastercard', 'amex'],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: 'logo-paypal',
    description: 'Pay with PayPal account',
    color: '#003087',
  },
  {
    id: 'shamcash',
    name: 'ShamCash QR',
    icon: 'qr-code',
    description: 'Scan QR to pay',
    color: '#00C853',
  },
  {
    id: 'cash_on_delivery',
    name: 'Cash on Delivery',
    icon: 'cash',
    description: 'Pay when you receive',
    color: '#FF9800',
  },
];

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onSelect,
  cardDetails = { number: '', expiry: '', cvc: '' },
  onCardDetailsChange,
}) => {
  const [showCardForm, setShowCardForm] = useState(selectedMethod === 'stripe');

  const handleSelectMethod = (methodId: string) => {
    onSelect(methodId);
    setShowCardForm(methodId === 'stripe');
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ').slice(0, 19) : cleaned;
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const getCardBrand = (number: string) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.startsWith('4')) return 'visa';
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    return null;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Method</Text>

      {PAYMENT_METHODS.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.methodCard,
            selectedMethod === method.id && styles.methodCardSelected,
          ]}
          onPress={() => handleSelectMethod(method.id)}
        >
          <View style={[
            styles.methodIcon,
            { backgroundColor: method.color ? method.color + '20' : Colors.primary + '20' }
          ]}>
            <Ionicons
              name={method.icon as any}
              size={24}
              color={method.color || Colors.primary}
            />
          </View>
          
          <View style={styles.methodContent}>
            <Text style={styles.methodName}>{method.name}</Text>
            <Text style={styles.methodDesc}>{method.description}</Text>
            
            {method.brands && (
              <View style={styles.cardBrands}>
                {method.brands.map((brand) => (
                  <View key={brand} style={styles.brandBadge}>
                    <Text style={styles.brandText}>{brand.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          
          <View style={[
            styles.radioOuter,
            selectedMethod === method.id && styles.radioOuterSelected,
          ]}>
            {selectedMethod === method.id && (
              <View style={styles.radioInner} />
            )}
          </View>
        </TouchableOpacity>
      ))}

      {/* Card Input Form */}
      {showCardForm && selectedMethod === 'stripe' && (
        <View style={styles.cardForm}>
          <Text style={styles.cardFormTitle}>Card Details</Text>
          
          <View style={styles.cardInputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="card-outline" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.cardInput}
                placeholder="Card Number"
                placeholderTextColor={Colors.textLight}
                value={formatCardNumber(cardDetails.number)}
                onChangeText={(text) => onCardDetailsChange?.({
                  ...cardDetails,
                  number: text.replace(/\D/g, ''),
                })}
                keyboardType="numeric"
                maxLength={19}
              />
              {getCardBrand(cardDetails.number) && (
                <View style={styles.detectedBrand}>
                  <Text style={styles.detectedBrandText}>
                    {getCardBrand(cardDetails.number)?.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.cardRow}>
              <View style={[styles.inputWrapper, { flex: 1, marginRight: Spacing.sm }]}>
                <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.cardInput}
                  placeholder="MM/YY"
                  placeholderTextColor={Colors.textLight}
                  value={formatExpiry(cardDetails.expiry)}
                  onChangeText={(text) => onCardDetailsChange?.({
                    ...cardDetails,
                    expiry: text.replace(/\D/g, ''),
                  })}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.cardInput}
                  placeholder="CVC"
                  placeholderTextColor={Colors.textLight}
                  value={cardDetails.cvc}
                  onChangeText={(text) => onCardDetailsChange?.({
                    ...cardDetails,
                    cvc: text.replace(/\D/g, '').slice(0, 4),
                  })}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
          </View>
          
          <View style={styles.secureNote}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
            <Text style={styles.secureText}>Your payment info is secure and encrypted</Text>
          </View>
        </View>
      )}

      {/* ShamCash Info */}
      {selectedMethod === 'shamcash' && (
        <View style={styles.shamcashInfo}>
          <LinearGradient
            colors={['#00C853', '#00E676']}
            style={styles.qrPlaceholder}
          >
            <Ionicons name="qr-code" size={48} color={Colors.white} />
            <Text style={styles.qrText}>QR Code will appear after confirmation</Text>
          </LinearGradient>
          <Text style={styles.shamcashNote}>
            Scan the QR code with your ShamCash app to complete payment
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  methodName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  methodDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardBrands: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  brandBadge: {
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  cardForm: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  cardFormTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  cardInputContainer: {
    gap: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  cardInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  cardRow: {
    flexDirection: 'row',
  },
  detectedBrand: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  detectedBrandText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  secureText: {
    fontSize: FontSize.sm,
    color: Colors.success,
  },
  shamcashInfo: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  qrPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrText: {
    fontSize: FontSize.xs,
    color: Colors.white,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  shamcashNote: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});

export default PaymentMethodSelector;
