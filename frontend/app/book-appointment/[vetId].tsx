import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { vetsAPI, appointmentsAPI, petsAPI, paymentAPI } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import { useTranslation } from '../../src/hooks/useTranslation';
import { PaymentMethodSelector } from '../../src/components';

const CONSULTATION_FEE = 50; // Default consultation fee

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '02:00 PM',
  '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM',
  '04:30 PM', '05:00 PM', '05:30 PM',
];

const REASONS = [
  { id: 'checkup', label: 'General Checkup', icon: 'medical', price: 50 },
  { id: 'vaccination', label: 'Vaccination', icon: 'fitness', price: 35 },
  { id: 'sick', label: 'Pet is Sick', icon: 'thermometer', price: 75 },
  { id: 'grooming', label: 'Grooming', icon: 'cut', price: 40 },
  { id: 'dental', label: 'Dental Care', icon: 'happy', price: 60 },
  { id: 'surgery', label: 'Surgery Consultation', icon: 'medkit', price: 100 },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal', price: 50 },
];

export default function BookAppointmentScreen() {
  const router = useRouter();
  const { vetId, rescheduleId } = useLocalSearchParams<{ vetId: string; rescheduleId?: string }>();
  const { t, isRTL } = useTranslation();
  const { isAuthenticated, myPets } = useStore();
  
  const [vet, setVet] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '' });
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const appointmentFee = REASONS.find(r => r.id === selectedReason)?.price || CONSULTATION_FEE;

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  useEffect(() => {
    loadData();
  }, [vetId]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ visible: true, message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2200);
  };

  const loadData = async () => {
    try {
      const [vetResponse, petsResponse] = await Promise.all([
        vetsAPI.getById(vetId as string),
        isAuthenticated ? petsAPI.getMyPets() : Promise.resolve({ data: [] }),
      ]);
      setVet(vetResponse.data);
      setPets(petsResponse.data);
      if (petsResponse.data.length > 0) {
        setSelectedPet(petsResponse.data[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleBookAppointment = async () => {
    if (!selectedTime) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for visit');
      return;
    }

    // Validate card if using Stripe
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

    setBooking(true);
    try {
      const appointmentData = {
        vet_id: vetId,
        pet_id: selectedPet,
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTime,
        reason: REASONS.find(r => r.id === selectedReason)?.label || selectedReason,
        vet_name: vet?.name,
        pet_name: pets.find(p => p.id === selectedPet)?.name,
        fee: appointmentFee,
      };

      const appointmentResponse = await appointmentsAPI.create(appointmentData);

      // If this is reschedule flow, replace old appointment with the new one
      if (rescheduleId) {
        try {
          await appointmentsAPI.cancel(String(rescheduleId));
        } catch (e) {
          console.log('Old appointment cancel on reschedule failed:', e);
        }
      }
      
      // Process payment only for new bookings (not reschedules)
      if (!rescheduleId) {
        await paymentAPI.processPayment({
          amount: appointmentFee,
          payment_method: paymentMethod,
          appointment_id: appointmentResponse.data?.id,
          ...(paymentMethod === 'stripe' && {
            card_number: cardDetails.number,
            card_expiry: cardDetails.expiry,
            card_cvc: cardDetails.cvc,
          }),
        });
      }
      
      showToast(rescheduleId ? 'Reschedule is successful' : 'Booking is successful', 'success');
      setTimeout(() => router.replace('/my-appointments'), 900);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return selectedTime !== null;
    if (step === 2) return selectedReason !== null;
    if (step === 3) return paymentMethod !== null;
    return true;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loaderText}>Loading data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Book Appointment</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loginRequired}>
          <Ionicons name="calendar" size={80} color={Colors.primary} />
          <Text style={styles.loginTitle}>Login Required</Text>
          <Text style={styles.loginText}>Please login to book appointments</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Book Appointment</Text>
        <View style={{ width: 40 }} />
      </View>

      {toast.visible && (
        <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          <Ionicons
            name={toast.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={18}
            color={Colors.white}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={styles.progressStep}>
            <View style={[styles.progressDot, step >= s && styles.progressDotActive]}>
              {step > s ? (
                <Ionicons name="checkmark" size={14} color={Colors.white} />
              ) : (
                <Text style={[styles.progressNumber, step >= s && styles.progressNumberActive]}>
                  {s}
                </Text>
              )}
            </View>
            <Text style={[styles.progressLabel, step >= s && styles.progressLabelActive]}>
              {s === 1 ? 'Date & Time' : s === 2 ? 'Reason' : 'Confirm'}
            </Text>
            {s < 3 && <View style={[styles.progressLine, step > s && styles.progressLineActive]} />}
          </View>
        ))}
      </View>

      {/* Vet Info */}
      {vet && (
        <Animated.View entering={FadeInDown.delay(100)} style={[styles.vetCard, Shadow.small]}>
          <View style={styles.vetAvatar}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.avatarGradient}>
              <Text style={styles.avatarInitial}>{vet.name[0]}</Text>
            </LinearGradient>
          </View>
          <View style={styles.vetInfo}>
            <Text style={styles.vetName}>{vet.name}</Text>
            <Text style={styles.vetSpecialty}>{vet.specialty} Specialist</Text>
            <View style={styles.vetRating}>
              <Ionicons name="star" size={14} color={Colors.accent} />
              <Text style={styles.ratingText}>{vet.rating?.toFixed(1) || '4.5'}</Text>
            </View>
          </View>
        </Animated.View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Step 1: Date & Time */}
        {step === 1 && (
          <Animated.View entering={FadeInUp}>
            {/* Date Selection */}
            <Text style={styles.sectionTitle}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
              <View style={styles.datesRow}>
                {dates.map((date, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateCard,
                      selectedDate.toDateString() === date.toDateString() && styles.dateCardActive,
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[
                      styles.dateDay,
                      selectedDate.toDateString() === date.toDateString() && styles.dateDayActive,
                    ]}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text style={[
                      styles.dateNumber,
                      selectedDate.toDateString() === date.toDateString() && styles.dateNumberActive,
                    ]}>
                      {date.getDate()}
                    </Text>
                    {isToday(date) && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayText}>Today</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Time Selection */}
            <Text style={styles.sectionTitle}>Select Time</Text>
            <View style={styles.timeSlotsGrid}>
              {TIME_SLOTS.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    selectedTime === time && styles.timeSlotActive,
                  ]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[
                    styles.timeText,
                    selectedTime === time && styles.timeTextActive,
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Step 2: Reason */}
        {step === 2 && (
          <Animated.View entering={FadeInUp}>
            <Text style={styles.sectionTitle}>Reason for Visit</Text>
            <View style={styles.reasonsGrid}>
              {REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonCard,
                    selectedReason === reason.id && styles.reasonCardActive,
                  ]}
                  onPress={() => setSelectedReason(reason.id)}
                >
                  <View style={[
                    styles.reasonIcon,
                    selectedReason === reason.id && styles.reasonIconActive,
                  ]}>
                    <Ionicons
                      name={reason.icon as any}
                      size={24}
                      color={selectedReason === reason.id ? Colors.white : Colors.primary}
                    />
                  </View>
                  <Text style={[
                    styles.reasonLabel,
                    selectedReason === reason.id && styles.reasonLabelActive,
                  ]}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pet Selection */}
            {pets.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Select Pet</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.petsRow}>
                    {pets.map((pet) => (
                      <TouchableOpacity
                        key={pet.id}
                        style={[
                          styles.petCard,
                          selectedPet === pet.id && styles.petCardActive,
                        ]}
                        onPress={() => setSelectedPet(pet.id)}
                      >
                        {pet.image ? (
                          <Image source={{ uri: pet.image }} style={styles.petImage} />
                        ) : (
                          <View style={styles.petImagePlaceholder}>
                            <Ionicons name="paw" size={24} color={Colors.textLight} />
                          </View>
                        )}
                        <Text style={[
                          styles.petName,
                          selectedPet === pet.id && styles.petNameActive,
                        ]}>
                          {pet.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </Animated.View>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <Animated.View entering={FadeInUp}>
            <Text style={styles.sectionTitle}>Appointment Summary</Text>
            <View style={[styles.summaryCard, Shadow.medium]}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="calendar" size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.summaryLabel}>Date</Text>
                  <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="time" size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.summaryLabel}>Time</Text>
                  <Text style={styles.summaryValue}>{selectedTime}</Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="medical" size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.summaryLabel}>Reason</Text>
                  <Text style={styles.summaryValue}>
                    {REASONS.find(r => r.id === selectedReason)?.label}
                  </Text>
                </View>
              </View>
              {selectedPet && (
                <>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryIcon}>
                      <Ionicons name="paw" size={20} color={Colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.summaryLabel}>Pet</Text>
                      <Text style={styles.summaryValue}>
                        {pets.find(p => p.id === selectedPet)?.name}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            <View style={styles.noteCard}>
              <Ionicons name="information-circle" size={20} color={Colors.primary} />
              <Text style={styles.noteText}>
                You will receive a confirmation notification once your appointment is confirmed by the clinic.
              </Text>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomBar, Shadow.large]}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(step - 1)}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed() && styles.nextButtonDisabled,
          ]}
          onPress={() => {
            if (step < 3) {
              setStep(step + 1);
            } else {
              handleBookAppointment();
            }
          }}
          disabled={!canProceed() || booking}
        >
          <LinearGradient
            colors={canProceed() ? [Colors.primary, Colors.primaryDark] : [Colors.textLight, Colors.textLight]}
            style={styles.nextGradient}
          >
            {booking ? (
              <Text style={styles.nextText}>Booking...</Text>
            ) : (
              <>
                <Text style={styles.nextText}>
                  {step === 3 ? 'Confirm Booking' : 'Continue'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.white} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
  toast: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastSuccess: { backgroundColor: '#22c55e' },
  toastError: { backgroundColor: Colors.error },
  toastText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '600',
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
    width: 30,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
  progressLineActive: {
    backgroundColor: Colors.primary,
  },
  vetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  vetAvatar: {
    marginRight: Spacing.md,
  },
  avatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  vetInfo: {
    flex: 1,
  },
  vetName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  vetSpecialty: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  vetRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  ratingText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  datesScroll: {
    paddingHorizontal: Spacing.md,
  },
  datesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dateCard: {
    width: 65,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  dateDay: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  dateDayActive: {
    color: Colors.primary,
  },
  dateNumber: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  dateNumberActive: {
    color: Colors.primary,
  },
  todayBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.xs,
  },
  todayText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.white,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  timeSlot: {
    width: '30%',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  timeSlotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  timeTextActive: {
    color: Colors.white,
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  reasonCard: {
    width: '47%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  reasonIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reasonIconActive: {
    backgroundColor: Colors.primary,
  },
  reasonLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  reasonLabelActive: {
    color: Colors.primary,
  },
  petsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  petCard: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 80,
  },
  petCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  petImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  petImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  petNameActive: {
    color: Colors.primary,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '10',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  noteText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primary,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundDark,
  },
  backButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  nextButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  nextText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
  loginRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loginTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
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
  loaderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: Spacing.sm,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
});
