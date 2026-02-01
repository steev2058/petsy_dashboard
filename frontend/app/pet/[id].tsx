import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { Button } from '../../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { PetImages } from '../src/constants/images';
import { petsAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

const { width, height } = Dimensions.get('window');

export default function PetDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  
  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    loadPet();
  }, [id]);

  const loadPet = async () => {
    try {
      const response = await petsAPI.getById(id as string);
      setPet(response.data);
    } catch (error) {
      console.error('Error loading pet:', error);
      Alert.alert('Error', 'Could not load pet details');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      const response = await petsAPI.like(id as string);
      setLiked(response.data.liked);
    } catch (error) {
      console.error('Error liking pet:', error);
    }
  };

  const handleContact = () => {
    Alert.alert(
      'Contact Owner',
      'How would you like to contact the owner?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Message', onPress: () => {} },
        { text: 'WhatsApp', onPress: () => Linking.openURL('https://wa.me/963912345678') },
      ]
    );
  };

  const getDefaultImage = () => {
    switch (pet?.species?.toLowerCase()) {
      case 'cat':
        return PetImages.defaultCat;
      case 'bird':
        return PetImages.defaultBird;
      default:
        return PetImages.defaultDog;
    }
  };

  const getStatusColor = () => {
    switch (pet?.status) {
      case 'for_adoption':
        return Colors.success;
      case 'for_sale':
        return Colors.primary;
      case 'lost':
        return Colors.error;
      case 'found':
        return Colors.warning;
      default:
        return Colors.secondary;
    }
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

  if (!pet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.error} />
          <Text style={styles.errorText}>Pet not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hero Image */}
      <Animated.View entering={FadeIn.duration(500)} style={styles.imageContainer}>
        <Image
          source={{ uri: pet.image || getDefaultImage() }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay} />
        
        {/* Header Buttons */}
        <SafeAreaView style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="share-outline" size={24} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleLike}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={24}
                color={liked ? Colors.error : Colors.white}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Status Badge */}
        {pet.status !== 'owned' && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>
              {pet.status === 'for_adoption'
                ? 'For Adoption'
                : pet.status === 'for_sale'
                ? `$${pet.price || 'Contact'}`
                : pet.status.replace('_', ' ')}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Content */}
      <Animated.View entering={SlideInUp.duration(500)} style={styles.contentContainer}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Pet Name & Info */}
          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Ionicons
                name={pet.gender === 'male' ? 'male' : 'female'}
                size={28}
                color={pet.gender === 'male' ? '#4A90D9' : '#E91E8C'}
              />
            </View>
            <Text style={styles.breed}>{pet.breed || pet.species}</Text>
            {pet.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color={Colors.textSecondary} />
                <Text style={styles.location}>{pet.location}</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{pet.age || 'Unknown'}</Text>
              <Text style={styles.statLabel}>{t('age')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{pet.weight ? `${pet.weight} kg` : 'N/A'}</Text>
              <Text style={styles.statLabel}>{t('weight')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{pet.color || 'N/A'}</Text>
              <Text style={styles.statLabel}>{t('color')}</Text>
            </View>
          </View>

          {/* Health Info */}
          <View style={styles.healthSection}>
            <View style={[styles.healthItem, pet.vaccinated && styles.healthItemActive]}>
              <Ionicons
                name={pet.vaccinated ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={pet.vaccinated ? Colors.success : Colors.textLight}
              />
              <Text style={styles.healthText}>{t('vaccinated')}</Text>
            </View>
            <View style={[styles.healthItem, pet.neutered && styles.healthItemActive]}>
              <Ionicons
                name={pet.neutered ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={pet.neutered ? Colors.success : Colors.textLight}
              />
              <Text style={styles.healthText}>{t('neutered')}</Text>
            </View>
          </View>

          {/* Description */}
          {pet.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>About {pet.name}</Text>
              <Text style={styles.description}>{pet.description}</Text>
            </View>
          )}

          {/* Owner Card */}
          <View style={styles.ownerSection}>
            <Text style={styles.sectionTitle}>Owner</Text>
            <View style={[styles.ownerCard, Shadow.small]}>
              <View style={styles.ownerAvatar}>
                <Ionicons name="person" size={32} color={Colors.white} />
              </View>
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>Pet Owner</Text>
                <Text style={styles.ownerLocation}>{pet.location || 'Syria'}</Text>
              </View>
              <TouchableOpacity style={styles.callButton} onPress={handleContact}>
                <Ionicons name="chatbubble-ellipses" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <TouchableOpacity style={styles.likeButtonBottom} onPress={handleLike}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={28}
            color={liked ? Colors.error : Colors.text}
          />
        </TouchableOpacity>
        <Button
          title={pet.status === 'for_adoption' ? t('adopt_now') : t('contact_owner')}
          onPress={handleContact}
          style={styles.contactButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  imageContainer: {
    height: height * 0.4,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  headerButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statusBadge: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    marginTop: -BorderRadius.xl,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  nameSection: {
    marginBottom: Spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  petName: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.text,
  },
  breed: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  location: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  healthSection: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  healthItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.md,
  },
  healthItemActive: {
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
  },
  healthText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
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
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  ownerSection: {
    marginBottom: Spacing.lg,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  ownerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  ownerName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  ownerLocation: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  likeButtonBottom: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactButton: {
    flex: 1,
  },
});
