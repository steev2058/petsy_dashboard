import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSize, Spacing, Shadow } from '../constants/theme';

interface Vet {
  id: string;
  name: string;
  specialty: string;
  experience_years: number;
  phone: string;
  clinic_name: string;
  city: string;
  rating: number;
  reviews_count: number;
  image?: string;
  available_hours?: string;
}

interface VetCardProps {
  vet: Vet;
  onPress: () => void;
  onCall?: () => void;
}

export const VetCard: React.FC<VetCardProps> = ({ vet, onPress, onCall }) => {
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color={Colors.accent}
        />
      );
    }
    return stars;
  };

  return (
    <TouchableOpacity
      style={[styles.card, Shadow.medium]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri:
              vet.image ||
              'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200',
          }}
          style={styles.image}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{vet.name}</Text>
        <Text style={styles.clinic}>{vet.clinic_name}</Text>
        <View style={styles.ratingRow}>
          <View style={styles.stars}>{renderStars(Math.round(vet.rating))}</View>
          <Text style={styles.reviews}>({vet.reviews_count})</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="briefcase-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.infoText}>{vet.experience_years} years exp.</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.infoText}>{vet.city}</Text>
        </View>
        {vet.available_hours && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{vet.available_hours}</Text>
          </View>
        )}
      </View>
      {onCall && (
        <TouchableOpacity style={styles.callButton} onPress={onCall}>
          <Ionicons name="call" size={20} color={Colors.white} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  clinic: {
    fontSize: FontSize.md,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  stars: {
    flexDirection: 'row',
  },
  reviews: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  callButton: {
    backgroundColor: Colors.success,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
});
