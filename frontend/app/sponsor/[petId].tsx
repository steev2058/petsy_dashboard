import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { petsAPI, sponsorshipAPI, paymentAPI } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import { useTranslation } from '../../src/hooks/useTranslation';
import { PaymentMethodSelector } from '../../src/components';

const PRESET_AMOUNTS = [5, 10, 25, 50, 100];

const IMPACT_INFO = [
  { amount: 5, icon: 'nutrition', label: '1 Day of Food', color: '#10B981' },
  { amount: 10, icon: 'medical', label: 'Basic Medical Care', color: '#6366F1' },
  { amount: 25, icon: 'fitness', label: 'Vaccination', color: '#F59E0B' },
  { amount: 50, icon: 'home', label: '1 Week of Shelter', color: '#EC4899' },
  { amount: 100, icon: 'heart', label: 'Full Month Care', color: '#EF4444' },
];

export default function SponsorPetScreen() {
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { t, isRTL } = useTranslation();
  const { isAuthenticated, user } = useStore();

  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '' });

  useEffect(() => {
    loadPet();
  }, [petId]);

  const loadPet = async () => {
    try {
      const response = await petsAPI.getById(petId as string);
      setPet(response.data);
    } catch (error) {
      console.error('Error loading pet:', error);
      Alert.alert('Error', 'Could not load pet details');
    } finally {
      setLoading(false);
    }
  };

  const finalAmount = isCustom ? parseFloat(customAmount) || 0 : selectedAmount;

  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmount('');
  };

  const handleCustomAmount = (text: string) => {
    setCustomAmount(text);
    setIsCustom(true);
  };

  const getImpact = (amount: number) => {
    const impact = IMPACT_INFO.find(i => amount >= i.amount);
    return impact || IMPACT_INFO[0];
  };

  const handleSubmitSponsorship = async () => {
    if (finalAmount < 1) {
      Alert.alert('Invalid Amount', 'Please enter a valid sponsorship amount');
      return;
    }

    // Validate card details if using Stripe
    if (paymentMethod === 'stripe') {
      if (!cardDetails.number || cardDetails.number.length < 15) {
        Alert.alert('Invalid Card', 'Please enter a valid card number');
        return;
      }
      if (!cardDetails.expiry || cardDetails.expiry.length < 4) {
        Alert.alert('Invalid Card', 'Please enter a valid expiry date');
        return;
      }
      if (!cardDetails.cvc || cardDetails.cvc.length < 3) {
        Alert.alert('Invalid Card', 'Please enter a valid CVC');
        return;
      }
    }

    setSubmitting(true);
    try {
      // First create the sponsorship
      const sponsorshipResponse = await sponsorshipAPI.create({
        pet_id: petId,
        amount: finalAmount,
        message: message.trim() || undefined,
        is_anonymous: isAnonymous,
      });

      // Then process the payment
      await paymentAPI.processPayment({
        amount: finalAmount,
        payment_method: paymentMethod,
        sponsorship_id: sponsorshipResponse.data?.id,
        ...(paymentMethod === 'stripe' && {
          card_number: cardDetails.number,
          card_expiry: cardDetails.expiry,
          card_cvc: cardDetails.cvc,
        }),
      });

      Alert.alert(
        '💝 Thank You!',
        `Your sponsorship of $${finalAmount.toFixed(2)} for ${pet?.name} has been received. You're making a real difference! You also earned ${Math.floor(finalAmount)} Petsy Points! 🎉`,
        [
          { text: 'View Pet', onPress: () => router.replace(`/pet/${petId}`) },
          { text: 'Done', onPress: () => router.back() },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to process sponsorship');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Sponsor a Pet</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loginRequired}>
          <LinearGradient
            colors={[Colors.error + '20', Colors.error + '10']}
            style={styles.loginIcon}
          >
            <Ionicons name="heart" size={60} color={Colors.error} />
          </LinearGradient>
          <Text style={styles.loginTitle}>Login Required</Text>
          <Text style={styles.loginText}>Please login to sponsor rescue pets</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.loginGradient}
            >
              <Text style={styles.loginButtonText}>Login Now</Text>
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
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Sponsor {pet?.name || 'Pet'}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Pet Card */}
          {pet && (
            <Animated.View entering={FadeInDown.delay(100)}>
              <View style={[styles.petCard, Shadow.medium]}>
                <View style={styles.rescueBadge}>
                  <Ionicons name="heart" size={12} color={Colors.white} />
                  <Text style={styles.rescueText}>Rescue Pet</Text>
                </View>
                {pet.image ? (
                  <Image source={{ uri: pet.image }} style={styles.petImage} />
                ) : (
                  <View style={styles.petImagePlaceholder}>
                    <Ionicons name="paw" size={40} color={Colors.textLight} />
                  </View>
                )}
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petInfo}>
                  {pet.species} • {pet.breed || 'Mixed'} • {pet.age || 'Unknown age'}
                </Text>
                {pet.total_sponsorship > 0 && (
                  <View style={styles.totalRaised}>
                    <Text style={styles.totalRaisedLabel}>Total Raised</Text>
                    <Text style={styles.totalRaisedAmount}>
                      ${pet.total_sponsorship?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {step === 1 ? (
            <Animated.View entering={FadeInUp.delay(200)}>
              {/* Amount Selection */}
              <Text style={styles.sectionTitle}>Select Amount</Text>
              <View style={styles.amountGrid}>
                {PRESET_AMOUNTS.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.amountCard,
                      selectedAmount === amount && !isCustom && styles.amountCardActive,
                    ]}
                    onPress={() => handleSelectAmount(amount)}
                  >
                    <Text style={[
                      styles.amountText,
                      selectedAmount === amount && !isCustom && styles.amountTextActive,
                    ]}>
                      ${amount}
                    </Text>
                    <Text style={[
                      styles.amountLabel,
                      selectedAmount === amount && !isCustom && styles.amountLabelActive,
                    ]}>
                      {IMPACT_INFO.find(i => i.amount === amount)?.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.amountCard,
                    isCustom && styles.amountCardActive,
                  ]}
                  onPress={() => setIsCustom(true)}
                >
                  <Ionicons
                    name="create"
                    size={20}
                    color={isCustom ? Colors.white : Colors.primary}
                  />
                  <Text style={[
                    styles.amountLabel,
                    isCustom && styles.amountLabelActive,
                  ]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {isCustom && (
                <View style={styles.customInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.customInput}
                    placeholder="Enter amount"
                    placeholderTextColor={Colors.textLight}
                    value={customAmount}
                    onChangeText={handleCustomAmount}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                </View>
              )}

              {/* Impact Preview */}
              {finalAmount > 0 && (
                <View style={[styles.impactCard, Shadow.small]}>
                  <View style={[styles.impactIcon, { backgroundColor: getImpact(finalAmount).color + '20' }]}>
                    <Ionicons
                      name={getImpact(finalAmount).icon as any}
                      size={24}
                      color={getImpact(finalAmount).color}
                    />
                  </View>
                  <View style={styles.impactContent}>
                    <Text style={styles.impactTitle}>Your Impact</Text>
                    <Text style={styles.impactDesc}>
                      ${finalAmount.toFixed(2)} provides {getImpact(finalAmount).label.toLowerCase()} for {pet?.name}
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInUp.delay(100)}>
              {/* Message & Options */}
              <Text style={styles.sectionTitle}>Add a Message (Optional)</Text>
              <TextInput
                style={styles.messageInput}
                placeholder="Write an encouraging message for the shelter..."
                placeholderTextColor={Colors.textLight}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.charCount}>{message.length}/500</Text>

              {/* Anonymous Option */}
              <TouchableOpacity
                style={styles.anonymousOption}
                onPress={() => setIsAnonymous(!isAnonymous)}
              >
                <View style={[styles.checkbox, isAnonymous && styles.checkboxActive]}>
                  {isAnonymous && <Ionicons name="checkmark" size={16} color={Colors.white} />}
                </View>
                <View style={styles.anonymousContent}>
                  <Text style={styles.anonymousTitle}>Make this anonymous</Text>
                  <Text style={styles.anonymousDesc}>Your name won't be shown publicly</Text>
                </View>
              </TouchableOpacity>

              {/* Summary */}
              <View style={[styles.summaryCard, Shadow.medium]}>
                <Text style={styles.summaryTitle}>Sponsorship Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Pet</Text>
                  <Text style={styles.summaryValue}>{pet?.name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount</Text>
                  <Text style={styles.summaryAmount}>${finalAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Sponsor</Text>
                  <Text style={styles.summaryValue}>
                    {isAnonymous ? 'Anonymous' : user?.name}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <Text style={styles.summaryNote}>
                  💝 100% of your sponsorship goes directly to caring for {pet?.name}
                </Text>
              </View>
            </Animated.View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom Actions */}
        <View style={[styles.bottomBar, Shadow.large]}>
          {step === 2 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(1)}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.text} />
            </TouchableOpacity>
          )}

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${finalAmount.toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.continueButton,
              finalAmount < 1 && styles.continueButtonDisabled,
            ]}
            onPress={() => {
              if (step === 1) {
                setStep(2);
              } else {
                handleSubmitSponsorship();
              }
            }}
            disabled={finalAmount < 1 || submitting}
          >
            <LinearGradient
              colors={finalAmount >= 1 ? [Colors.error, '#C53030'] : [Colors.textLight, Colors.textLight]}
              style={styles.continueGradient}
            >
              {submitting ? (
                <Text style={styles.continueText}>Processing...</Text>
              ) : (
                <>
                  <Ionicons name={step === 1 ? 'arrow-forward' : 'heart'} size={20} color={Colors.white} />
                  <Text style={styles.continueText}>
                    {step === 1 ? 'Continue' : 'Sponsor Now'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.error,
  },
  petCard: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    position: 'relative',
  },
  rescueBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  rescueText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.white,
  },
  petImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: Colors.error + '30',
  },
  petImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petName: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  petInfo: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  totalRaised: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  totalRaisedLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  totalRaisedAmount: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.success,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  amountCard: {
    width: '31%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  amountCardActive: {
    borderColor: Colors.error,
    backgroundColor: Colors.error,
  },
  amountText: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  amountTextActive: {
    color: Colors.white,
  },
  amountLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  amountLabelActive: {
    color: Colors.white,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.error,
  },
  currencySymbol: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.error,
  },
  customInput: {
    flex: 1,
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    padding: Spacing.md,
  },
  impactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  impactIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  impactContent: {
    flex: 1,
  },
  impactTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  impactDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  messageInput: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'right',
    marginRight: Spacing.md,
    marginTop: Spacing.xs,
  },
  anonymousOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  anonymousContent: {
    flex: 1,
  },
  anonymousTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  anonymousDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  summaryTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  summaryRow: {
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
    fontWeight: '600',
    color: Colors.text,
  },
  summaryAmount: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.error,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  summaryNote: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.error,
  },
  continueButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  continueText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  loginRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loginIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  loginTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  loginText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  loginButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  loginGradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  loginButtonText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.white,
  },
});
