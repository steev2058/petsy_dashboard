import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { mapAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

const { width, height } = Dimensions.get('window');

const LOCATION_TYPES = [
  { id: 'all', label: 'All', icon: 'location' },
  { id: 'vet', label: 'Vets', icon: 'medkit' },
  { id: 'clinic', label: 'Clinics', icon: 'medical' },
  { id: 'pet_shop', label: 'Shops', icon: 'storefront' },
  { id: 'shelter', label: 'Shelters', icon: 'home' },
  { id: 'park', label: 'Parks', icon: 'leaf' },
];

export default function MapScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [selectedType, setSelectedType] = useState('all');
  const [locations, setLocations] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  useEffect(() => {
    getUserLocation();
    loadLocations();
  }, [selectedType]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const params: any = {};
      if (selectedType !== 'all') {
        params.type = selectedType;
      }
      const response = await mapAPI.getLocations(params);
      setLocations(response.data);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'vet': return 'medkit';
      case 'clinic': return 'medical';
      case 'pet_shop': return 'storefront';
      case 'shelter': return 'home';
      case 'park': return 'leaf';
      default: return 'location';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'vet': return Colors.primary;
      case 'clinic': return Colors.secondary;
      case 'pet_shop': return Colors.accent;
      case 'shelter': return Colors.success;
      case 'park': return '#96CEB4';
      default: return Colors.textSecondary;
    }
  };

  const renderLocationCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.locationCard, Shadow.small, selectedLocation?.id === item.id && styles.locationCardSelected]}
      onPress={() => setSelectedLocation(item)}
    >
      <View style={[styles.locationIcon, { backgroundColor: getTypeColor(item.type) }]}>
        <Ionicons name={getTypeIcon(item.type) as any} size={24} color={Colors.white} />
      </View>
      <View style={styles.locationInfo}>
        <Text style={styles.locationName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.locationAddress} numberOfLines={1}>{item.address}</Text>
        <View style={styles.locationMeta}>
          {item.rating > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color={Colors.accent} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
          {item.is_open_now && (
            <View style={styles.openBadge}>
              <Text style={styles.openText}>Open Now</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Petsy Map</Text>
        <TouchableOpacity onPress={getUserLocation}>
          <Ionicons name="locate" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Map Placeholder - In production, use react-native-maps */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={80} color={Colors.textLight} />
          <Text style={styles.mapPlaceholderText}>Interactive Map</Text>
          <Text style={styles.mapSubtext}>Showing {locations.length} locations</Text>
          {userLocation && (
            <Text style={styles.coordsText}>
              Your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </Text>
          )}
        </View>
        
        {/* Floating Location Pins */}
        <View style={styles.pinContainer}>
          {locations.slice(0, 5).map((loc, index) => (
            <TouchableOpacity
              key={loc.id}
              style={[
                styles.mapPin,
                { 
                  backgroundColor: getTypeColor(loc.type),
                  left: 30 + (index * 60),
                  top: 30 + (index * 40),
                }
              ]}
              onPress={() => setSelectedLocation(loc)}
            >
              <Ionicons name={getTypeIcon(loc.type) as any} size={16} color={Colors.white} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Type Filter */}
      <FlatList
        horizontal
        data={LOCATION_TYPES}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.typeFilter}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === item.id && styles.typeButtonActive,
            ]}
            onPress={() => setSelectedType(item.id)}
          >
            <Ionicons
              name={item.icon as any}
              size={18}
              color={selectedType === item.id ? Colors.white : Colors.primary}
            />
            <Text
              style={[
                styles.typeButtonText,
                selectedType === item.id && styles.typeButtonTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Selected Location Detail */}
      {selectedLocation && (
        <View style={[styles.selectedCard, Shadow.medium]}>
          <View style={styles.selectedHeader}>
            <View style={[styles.selectedIcon, { backgroundColor: getTypeColor(selectedLocation.type) }]}>
              <Ionicons name={getTypeIcon(selectedLocation.type) as any} size={28} color={Colors.white} />
            </View>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedName}>{selectedLocation.name}</Text>
              <Text style={styles.selectedAddress}>{selectedLocation.address}, {selectedLocation.city}</Text>
              {selectedLocation.hours && (
                <Text style={styles.selectedHours}>{selectedLocation.hours}</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setSelectedLocation(null)}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.selectedActions}>
            {selectedLocation.phone && (
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="call" size={20} color={Colors.success} />
                <Text style={styles.actionBtnText}>Call</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="navigate" size={20} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="share" size={20} color={Colors.secondary} />
              <Text style={styles.actionBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Locations List */}
      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        renderItem={renderLocationCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="location" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No locations found</Text>
          </View>
        }
      />
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
  mapContainer: {
    height: height * 0.25,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  mapSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  coordsText: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.sm,
  },
  pinContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPin: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  typeFilter: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  typeButtonTextActive: {
    color: Colors.white,
  },
  selectedCard: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  selectedIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  selectedName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  selectedAddress: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  selectedHours: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    marginTop: 4,
  },
  selectedActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionBtnText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  locationCardSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  locationName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  locationAddress: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  locationMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: FontSize.xs,
    color: Colors.text,
    fontWeight: '600',
  },
  openBadge: {
    backgroundColor: 'rgba(0,184,148,0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  openText: {
    fontSize: FontSize.xs,
    color: Colors.success,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
});
