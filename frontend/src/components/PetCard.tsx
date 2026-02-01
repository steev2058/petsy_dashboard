import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSize, Spacing, Shadow } from '../constants/theme';
import { PetImages } from '../constants/images';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 3) / 2;

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: string;
  gender: string;
  image?: string;
  status: string;
  price?: number;
  location?: string;
  likes: number;
}

interface PetCardProps {
  pet: Pet;
  onPress: () => void;
  onLike?: () => void;
  isLiked?: boolean;
  compact?: boolean;
}

export const PetCard: React.FC<PetCardProps> = ({
  pet,
  onPress,
  onLike,
  isLiked = false,
  compact = false,
}) => {
  const getDefaultImage = () => {
    switch (pet.species?.toLowerCase()) {
      case 'cat':
        return PetImages.defaultCat;
      case 'bird':
        return PetImages.defaultBird;
      default:
        return PetImages.defaultDog;
    }
  };

  const getStatusColor = () => {
    switch (pet.status) {
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

  const getStatusText = () => {
    switch (pet.status) {
      case 'for_adoption':
        return 'Adoption';
      case 'for_sale':
        return pet.price ? `$${pet.price}` : 'For Sale';
      case 'lost':
        return 'Lost';
      case 'found':
        return 'Found';
      default:
        return '';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.compactCard, Shadow.medium]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: pet.image || getDefaultImage() }}
          style={styles.image}
          resizeMode="cover"
        />
        {pet.status !== 'owned' && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        )}
        {onLike && (
          <TouchableOpacity style={styles.likeButton} onPress={onLike}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={isLiked ? Colors.error : Colors.white}
            />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {pet.name}
        </Text>
        <Text style={styles.breed} numberOfLines={1}>
          {pet.breed || pet.species}
        </Text>
        <View style={styles.footer}>
          <View style={styles.infoRow}>
            <Ionicons
              name={pet.gender === 'male' ? 'male' : 'female'}
              size={14}
              color={pet.gender === 'male' ? '#4A90D9' : '#E91E8C'}
            />
            <Text style={styles.age}>{pet.age || 'Unknown'}</Text>
          </View>
          {pet.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.location} numberOfLines={1}>
                {pet.location}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  compactCard: {
    width: 160,
  },
  imageContainer: {
    position: 'relative',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  likeButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: BorderRadius.full,
    padding: Spacing.xs,
  },
  content: {
    padding: Spacing.sm,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  breed: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  footer: {
    flexDirection: 'column',
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  age: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  location: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
  },
});
