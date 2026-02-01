import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
  TextInput,
  Linking,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { mapAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

const { width, height } = Dimensions.get('window');

interface MapLocationItem {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone?: string;
  rating: number;
  is_open_now: boolean;
  hours?: string;
  image?: string;
}

const LOCATION_TYPES = [
  { id: 'all', label: 'All', icon: 'location', color: '#6366F1' },
  { id: 'vet', label: 'Vets', icon: 'medkit', color: '#EF4444' },
  { id: 'clinic', label: 'Clinics', icon: 'medical', color: '#10B981' },
  { id: 'pet_shop', label: 'Shops', icon: 'storefront', color: '#F59E0B' },
  { id: 'shelter', label: 'Shelters', icon: 'home', color: '#8B5CF6' },
  { id: 'park', label: 'Parks', icon: 'leaf', color: '#22C55E' },
];

export default function MapScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [selectedType, setSelectedType] = useState('all');
  const [locations, setLocations] = useState<MapLocationItem[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<MapLocationItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    getUserLocation();
    loadLocations();
  }, [selectedType]);

  useEffect(() => {
    if (showDetails) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showDetails]);

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

  const getTypeConfig = (type: string) => {
    return LOCATION_TYPES.find(t => t.id === type) || LOCATION_TYPES[0];
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const openDirections = (location: MapLocationItem) => {
    const scheme = Platform.select({ ios: 'maps://0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${location.latitude},${location.longitude}`;
    const label = encodeURIComponent(location.name);
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });
    
    if (url) {
      Linking.openURL(url);
    }
  };

  const callLocation = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const filteredLocations = locations.filter((loc) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      loc.name.toLowerCase().includes(query) ||
      loc.address.toLowerCase().includes(query) ||
      loc.city.toLowerCase().includes(query)
    );
  });

  const selectAndShowDetails = (location: MapLocationItem) => {
    setSelectedLocation(location);
    setShowDetails(true);
  };

  const renderLocationCard = ({ item }: { item: MapLocationItem }) => {
    const typeConfig = getTypeConfig(item.type);
    const distance = userLocation
      ? calculateDistance(userLocation.lat, userLocation.lng, item.latitude, item.longitude)
      : null;

    return (
      <TouchableOpacity
        style={[styles.locationCard, Shadow.small]}
        onPress={() => selectAndShowDetails(item)}
        activeOpacity={0.9}
      >
        <View style={[styles.locationTypeIcon, { backgroundColor: typeConfig.color }]}>
          <Ionicons name={typeConfig.icon as any} size={22} color={Colors.white} />
        </View>
        
        <View style={styles.locationInfo}>
          <View style={styles.locationNameRow}>
            <Text style={styles.locationName} numberOfLines={1}>{item.name}</Text>
            {item.is_open_now && (
              <View style={styles.openBadge}>
                <View style={styles.openDot} />
                <Text style={styles.openText}>Open</Text>
              </View>
            )}
          </View>
          <Text style={styles.locationAddress} numberOfLines={1}>{item.address}, {item.city}</Text>
          
          <View style={styles.locationMeta}>
            {item.rating > 0 && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            )}
            {distance !== null && (
              <View style={styles.distanceContainer}>
                <Ionicons name="navigate" size={12} color={Colors.textSecondary} />
                <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
              </View>
            )}
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.directionsButton}
          onPress={() => openDirections(item)}
        >
          <Ionicons name="navigate" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Luxury Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Petsy Map</Text>
          <Text style={styles.subtitle}>{filteredLocations.length} locations found</Text>
        </View>
        <TouchableOpacity onPress={getUserLocation} style={styles.myLocationButton}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.myLocationGradient}
          >
            <Ionicons name="locate" size={20} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, Shadow.small]}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clinics, shops, parks..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Interactive Map Preview */}
      <View style={styles.mapContainer}>
        <LinearGradient
          colors={['#E0F2FE', '#BFDBFE', '#93C5FD']}
          style={styles.mapGradient}
        >
          {/* Map Grid Lines */}
          {[...Array(6)].map((_, i) => (
            <View key={`h-${i}`} style={[styles.mapGridLine, { top: (i + 1) * (height * 0.22 / 7) }]} />
          ))}
          {[...Array(8)].map((_, i) => (
            <View key={`v-${i}`} style={[styles.mapGridLineVertical, { left: (i + 1) * (width / 9) }]} />
          ))}
          
          {/* Location Pins */}
          {filteredLocations.slice(0, 8).map((loc, index) => {
            const typeConfig = getTypeConfig(loc.type);
            const pinX = 30 + ((index % 4) * (width - 100) / 4);
            const pinY = 20 + (Math.floor(index / 4) * 60);
            
            return (
              <TouchableOpacity
                key={loc.id}
                style={[
                  styles.mapPin,
                  {
                    backgroundColor: typeConfig.color,
                    left: pinX,
                    top: pinY,
                  },
                  selectedLocation?.id === loc.id && styles.mapPinSelected,
                ]}
                onPress={() => selectAndShowDetails(loc)}
              >
                <Ionicons name={typeConfig.icon as any} size={14} color={Colors.white} />
              </TouchableOpacity>
            );
          })}
          
          {/* User Location Marker */}
          {userLocation && (
            <View style={styles.userMarker}>
              <View style={styles.userMarkerPulse} />
              <View style={styles.userMarkerDot} />
            </View>
          )}
          
          {/* Map Label */}
          <View style={styles.mapLabel}>
            <Ionicons name="map" size={16} color={Colors.textSecondary} />
            <Text style={styles.mapLabelText}>Tap pins to view details</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Type Filters */}
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
              selectedType === item.id && { backgroundColor: item.color },
            ]}
            onPress={() => setSelectedType(item.id)}
          >
            <Ionicons
              name={item.icon as any}
              size={16}
              color={selectedType === item.id ? Colors.white : item.color}
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

      {/* Locations List */}
      <FlatList
        data={filteredLocations}
        keyExtractor={(item) => item.id}
        renderItem={renderLocationCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="location" size={40} color={Colors.white} />
            </View>
            <Text style={styles.emptyTitle}>No locations found</Text>
            <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
          </View>
        }
      />

      {/* Location Details Modal */}
      <Modal
        visible={showDetails}
        transparent
        animationType="none"
        onRequestClose={() => setShowDetails(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDetails(false)}
        >
          <Animated.View
            style={[
              styles.detailsSheet,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.detailsHandle} />
              
              {selectedLocation && (
                <>
                  <View style={styles.detailsHeader}>
                    <View style={[
                      styles.detailsTypeIcon,
                      { backgroundColor: getTypeConfig(selectedLocation.type).color }
                    ]}>
                      <Ionicons
                        name={getTypeConfig(selectedLocation.type).icon as any}
                        size={28}
                        color={Colors.white}
                      />
                    </View>
                    <View style={styles.detailsInfo}>
                      <Text style={styles.detailsName}>{selectedLocation.name}</Text>
                      <Text style={styles.detailsAddress}>
                        {selectedLocation.address}, {selectedLocation.city}
                      </Text>
                      {selectedLocation.hours && (
                        <View style={styles.hoursContainer}>
                          <Ionicons name="time" size={14} color={Colors.primary} />
                          <Text style={styles.hoursText}>{selectedLocation.hours}</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.closeDetailsButton}
                      onPress={() => setShowDetails(false)}
                    >
                      <Ionicons name="close" size={24} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.detailsStats}>
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="star" size={18} color="#F59E0B" />
                      </View>
                      <Text style={styles.statValue}>{selectedLocation.rating.toFixed(1)}</Text>
                      <Text style={styles.statLabel}>Rating</Text>
                    </View>
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: selectedLocation.is_open_now ? '#D1FAE5' : '#FEE2E2' }]}>
                        <Ionicons
                          name={selectedLocation.is_open_now ? 'checkmark-circle' : 'close-circle'}
                          size={18}
                          color={selectedLocation.is_open_now ? '#10B981' : '#EF4444'}
                        />
                      </View>
                      <Text style={styles.statValue}>{selectedLocation.is_open_now ? 'Open' : 'Closed'}</Text>
                      <Text style={styles.statLabel}>Status</Text>
                    </View>
                    {userLocation && (
                      <View style={styles.statItem}>
                        <View style={[styles.statIcon, { backgroundColor: '#E0E7FF' }]}>
                          <Ionicons name="navigate" size={18} color="#6366F1" />
                        </View>
                        <Text style={styles.statValue}>
                          {calculateDistance(
                            userLocation.lat,
                            userLocation.lng,
                            selectedLocation.latitude,
                            selectedLocation.longitude
                          ).toFixed(1)} km
                        </Text>
                        <Text style={styles.statLabel}>Distance</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.detailsActions}>
                    {selectedLocation.phone && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => callLocation(selectedLocation.phone!)}
                      >
                        <LinearGradient
                          colors={['#10B981', '#059669']}
                          style={styles.actionGradient}
                        >
                          <Ionicons name="call" size={20} color={Colors.white} />
                          <Text style={styles.actionText}>Call</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openDirections(selectedLocation)}
                    >
                      <LinearGradient
                        colors={[Colors.primary, Colors.primaryDark]}
                        style={styles.actionGradient}
                      >
                        <Ionicons name="navigate" size={20} color={Colors.white} />
                        <Text style={styles.actionText}>Directions</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButtonOutline}
                      onPress={() => {
                        const shareMessage = `Check out ${selectedLocation.name} at ${selectedLocation.address}, ${selectedLocation.city}`;
                        Alert.alert('Share', shareMessage);
                      }}
                    >
                      <Ionicons name="share-social" size={20} color={Colors.primary} />
                      <Text style={styles.actionTextOutline}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  backButton: {},
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  myLocationButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  myLocationGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  mapContainer: {
    height: height * 0.22,
    overflow: 'hidden',
  },
  mapGradient: {
    flex: 1,
    position: 'relative',
  },
  mapGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  mapGridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  mapPin: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    ...Shadow.medium,
  },
  mapPinSelected: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
  },
  userMarker: {
    position: 'absolute',
    left: width / 2 - 12,
    top: height * 0.11 - 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '30',
  },
  userMarkerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  mapLabel: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white + 'E6',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  mapLabelText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
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
  },
  typeButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  typeButtonTextActive: {
    color: Colors.white,
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
  locationTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  locationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  locationName: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  openText: {
    fontSize: FontSize.xs,
    color: '#059669',
    fontWeight: '600',
  },
  locationAddress: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  locationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  directionsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  detailsSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  detailsHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailsTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  detailsName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  detailsAddress: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  hoursText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  closeDetailsButton: {
    padding: Spacing.xs,
  },
  detailsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  detailsActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  actionText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  actionButtonOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    gap: Spacing.sm,
  },
  actionTextOutline: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
