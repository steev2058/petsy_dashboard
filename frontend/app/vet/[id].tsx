import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { vetsAPI } from '../../src/services/api';
import { useTranslation } from '../../src/hooks/useTranslation';

export default function VetDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  
  const [vet, setVet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVet();
  }, [id]);

  const loadVet = async () => {
    try {
      const response = await vetsAPI.getById(id as string);
      setVet(response.data);
    } catch (error) {
      console.error('Error loading vet:', error);
      Alert.alert('Error', 'Could not load vet details');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    Linking.openURL(`tel:${vet.phone}`);
  };

  const handleWhatsApp = () => {
    Linking.openURL(`https://wa.me/${vet.phone.replace(/[^0-9]/g, '')}`);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={18}
          color={Colors.accent}
        />
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!vet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.error} />
          <Text style={styles.errorText}>Vet not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Image */}
        <View style={styles.header}>
          <Image
            source={{
              uri:
                vet.image ||
                'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
            }}
            style={styles.coverImage}
          />
          <View style={styles.headerOverlay} />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Vet Info Card */}
        <View style={[styles.infoCard, Shadow.medium]}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri:
                  vet.image ||
                  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200',
              }}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.vetName}>{vet.name}</Text>
          <Text style={styles.clinicName}>{vet.clinic_name}</Text>
          
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {renderStars(Math.round(vet.rating))}
            </View>
            <Text style={styles.ratingText}>
              {vet.rating.toFixed(1)} ({vet.reviews_count} reviews)
            </Text>
          </View>

          <View style={styles.badges}>
            <View style={styles.badge}>
              <Ionicons name="briefcase" size={16} color={Colors.primary} />
              <Text style={styles.badgeText}>{vet.experience_years} years</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="paw" size={16} color={Colors.primary} />
              <Text style={styles.badgeText}>{vet.specialty}</Text>
            </View>
          </View>
        </View>

        {/* Contact Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionCard} onPress={handleCall}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.success }]}>
              <Ionicons name="call" size={24} color={Colors.white} />
            </View>
            <Text style={styles.actionLabel}>{t('call_vet')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={handleWhatsApp}>
            <View style={[styles.actionIcon, { backgroundColor: '#25D366' }]}>
              <Ionicons name="logo-whatsapp" size={24} color={Colors.white} />
            </View>
            <Text style={styles.actionLabel}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.primary }]}>
              <Ionicons name="calendar" size={24} color={Colors.white} />
            </View>
            <Text style={styles.actionLabel}>{t('book_appointment')}</Text>
          </TouchableOpacity>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{vet.address}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="navigate" size={20} color={Colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>City</Text>
              <Text style={styles.detailValue}>{vet.city}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time" size={20} color={Colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Available Hours</Text>
              <Text style={styles.detailValue}>
                {vet.available_hours || 'Contact for hours'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="call" size={20} color={Colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{vet.phone}</Text>
            </View>
          </View>
        </View>

        {/* Services */}
        {vet.services && vet.services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('services')}</Text>
            <View style={styles.servicesGrid}>
              {vet.services.map((service: string, index: number) => (
                <View key={index} style={styles.serviceChip}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.serviceText}>
                    {service.charAt(0).toUpperCase() + service.slice(1)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Book Appointment CTA */}
        <View style={styles.ctaSection}>
          <Button
            title={t('book_appointment')}
            onPress={() => {}}
            style={styles.ctaButton}
          />
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSize.xl,
    color: Colors.textSecondary,
    marginVertical: Spacing.lg,
  },
  header: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backButton: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: -60,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  avatarContainer: {
    marginTop: -70,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: Colors.white,
  },
  vetName: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  clinicName: {
    fontSize: FontSize.lg,
    color: Colors.primary,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  stars: {
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.backgroundDark,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.lg,
  },
  actionCard: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  actionLabel: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  section: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.backgroundDark,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  serviceText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  ctaSection: {
    padding: Spacing.md,
  },
  ctaButton: {
    width: '100%',
  },
});
