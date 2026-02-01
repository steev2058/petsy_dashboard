import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { vetsAPI, appointmentsAPI, petsAPI } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import { useTranslation } from '../../src/hooks/useTranslation';

const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
];

export default function BookAppointmentScreen() {
  const router = useRouter();
  const { vetId } = useLocalSearchParams<{ vetId: string }>();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useStore();
  
  const [vet, setVet] = useState<any>(null);
  const [myPets, setMyPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [vetId]);

  const loadData = async () => {
    try {
      const [vetRes, petsRes] = await Promise.all([
        vetsAPI.getById(vetId as string),
        isAuthenticated ? petsAPI.getMyPets() : Promise.resolve({ data: [] }),
      ]);
      setVet(vetRes.data);
      setMyPets(petsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: date.toLocaleString('default', { month: 'short' }),
    };
  };

  const handleSubmit = async () => {
    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }
    if (!selectedTime) {
      Alert.alert('Error', 'Please select a time');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Error', 'Please enter a reason for the visit');
      return;
    }

    setSubmitting(true);
    try {
      await appointmentsAPI.create({
        vet_id: vetId,
        pet_id: selectedPet,
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTime,
        reason: reason.trim(),
        notes: notes.trim(),
      });

      Alert.alert(
        'Appointment Booked!',
        `Your appointment with ${vet?.name} has been scheduled for ${selectedDate.toLocaleDateString()} at ${selectedTime}.`,
        [
          { text: 'OK', onPress: () => router.back() },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to book appointment. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('book_appointment')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.notLoggedIn}>
          <Ionicons name="calendar" size={64} color={Colors.textLight} />
          <Text style={styles.notLoggedInTitle}>Login Required</Text>
          <Text style={styles.notLoggedInText}>Please login to book appointments</Text>
          <Button
            title="Login"
            onPress={() => router.push('/(auth)/login')}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('book_appointment')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Vet Info */}
        {vet && (
          <View style={[styles.vetCard, Shadow.small]}>
            <Image
              source={{ uri: vet.image || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200' }}
              style={styles.vetImage}
            />
            <View style={styles.vetInfo}>
              <Text style={styles.vetName}>{vet.name}</Text>
              <Text style={styles.vetClinic}>{vet.clinic_name}</Text>
              <View style={styles.vetMeta}>
                <Ionicons name="star" size={14} color={Colors.accent} />
                <Text style={styles.vetRating}>{vet.rating.toFixed(1)}</Text>
                <Text style={styles.vetExp}>• {vet.experience_years} years exp.</Text>
              </View>
            </View>
          </View>
        )}

        {/* Select Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.datesRow}>
              {generateDates().map((date, index) => {
                const formatted = formatDate(date);
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateCard,
                      isSelected && styles.dateCardSelected,
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[styles.dateDay, isSelected && styles.dateTextSelected]}>
                      {formatted.day}
                    </Text>
                    <Text style={[styles.dateNum, isSelected && styles.dateTextSelected]}>
                      {formatted.date}
                    </Text>
                    <Text style={[styles.dateMonth, isSelected && styles.dateTextSelected]}>
                      {formatted.month}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Select Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time</Text>
          <View style={styles.timesGrid}>
            {TIME_SLOTS.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeSlot,
                  selectedTime === time && styles.timeSlotSelected,
                ]}
                onPress={() => setSelectedTime(time)}
              >
                <Text
                  style={[
                    styles.timeText,
                    selectedTime === time && styles.timeTextSelected,
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Select Pet */}
        {myPets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Pet (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.petsRow}>
                {myPets.map((pet) => (
                  <TouchableOpacity
                    key={pet.id}
                    style={[
                      styles.petCard,
                      selectedPet === pet.id && styles.petCardSelected,
                    ]}
                    onPress={() => setSelectedPet(selectedPet === pet.id ? null : pet.id)}
                  >
                    <View style={styles.petAvatar}>
                      <Ionicons name="paw" size={24} color={selectedPet === pet.id ? Colors.white : Colors.primary} />
                    </View>
                    <Text style={[styles.petName, selectedPet === pet.id && styles.petNameSelected]}>
                      {pet.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Reason */}
        <View style={styles.section}>
          <Input
            label="Reason for Visit *"
            placeholder="e.g., Annual checkup, vaccination, health concern"
            value={reason}
            onChangeText={setReason}
          />
          <Input
            label="Additional Notes (optional)"
            placeholder="Any special instructions or concerns"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Book Button */}
      <View style={[styles.bottomSection, Shadow.large]}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Selected:</Text>
          <Text style={styles.summaryValue}>
            {selectedDate ? selectedDate.toLocaleDateString() : 'No date'}
            {selectedTime ? ` at ${selectedTime}` : ''}
          </Text>
        </View>
        <Button
          title="Confirm Booking"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!selectedDate || !selectedTime || !reason.trim()}
        />
      </View>
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
  vetCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  vetImage: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.md,
  },
  vetInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  vetName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  vetClinic: {
    fontSize: FontSize.md,
    color: Colors.primary,
  },
  vetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  vetRating: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  vetExp: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  section: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  datesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dateCard: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    minWidth: 70,
  },
  dateCardSelected: {
    backgroundColor: Colors.primary,
  },
  dateDay: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  dateNum: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginVertical: 2,
  },
  dateMonth: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  dateTextSelected: {
    color: Colors.white,
  },
  timesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timeSlot: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeSlotSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  timeTextSelected: {
    color: Colors.white,
  },
  petsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  petCard: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    minWidth: 80,
  },
  petCardSelected: {
    backgroundColor: Colors.primary,
  },
  petAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  petName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  petNameSelected: {
    color: Colors.white,
  },
  bottomSection: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  summaryLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  notLoggedIn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  notLoggedInTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  notLoggedInText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});
