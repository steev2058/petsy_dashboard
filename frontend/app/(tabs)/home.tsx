import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar, PetCard, VetCard, ProductCard, CategoryList, PET_CATEGORIES } from '../../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { PetImages } from '../../src/constants/images';
import { petsAPI, vetsAPI, productsAPI } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import { useTranslation } from '../../src/hooks/useTranslation';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { user, setDrawerOpen, isDrawerOpen, language, setLanguage } = useStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState<any[]>([]);
  const [vets, setVets] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [petsRes, vetsRes, productsRes] = await Promise.all([
        petsAPI.getAll({ status: 'for_adoption' }),
        vetsAPI.getAll(),
        productsAPI.getAll(),
      ]);
      setPets(petsRes.data.slice(0, 6));
      setVets(vetsRes.data.slice(0, 3));
      setProducts(productsRes.data.slice(0, 6));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const quickServices = [

    { id: 'adoption', icon: 'heart', label: t('adoption'), color: '#FF6B6B', route: '/(tabs)/adoption' },
    { id: 'map', icon: 'map', label: 'Map', color: '#4ECDC4', route: '/petsy-map' },
    { id: 'shop', icon: 'cart', label: t('shop'), color: '#45B7D1', route: '/(tabs)/shop' },
    { id: 'chat', icon: 'chatbubbles', label: 'Messages', color: '#96CEB4', route: '/messages' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.pageLoader}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.pageLoaderText}>Loading home data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setDrawerOpen(true)}>
            <Ionicons name="menu" size={28} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <View style={styles.logoSmall}>
              <Text style={styles.logoEmoji}>🐾</Text>
            </View>
            <Text style={styles.logoText}>Petsy</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setLanguage(language === 'en' ? 'ar' : 'en')}>
              <Ionicons name="globe-outline" size={24} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/ai-assistant')}>
              <Ionicons name="sparkles" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('search_pets')}
          showFilter
          onFilter={() => {}}
        />

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <Image
            source={{ uri: PetImages.hero }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Find Your Perfect Companion</Text>
            <Text style={styles.heroSubtitle}>Adopt, don't shop!</Text>
            <TouchableOpacity 
              style={styles.heroButton}
              onPress={() => router.push('/(tabs)/adoption')}
            >
              <Text style={styles.heroButtonText}>Explore Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('quick_services')}</Text>
          <View style={styles.servicesGrid}>
            {quickServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => router.push(service.route as any)}
              >
                <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
                  <Ionicons name={service.icon as any} size={24} color={Colors.white} />
                </View>
                <Text style={styles.serviceLabel}>{service.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pet Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('categories')}</Text>
          <CategoryList
            categories={PET_CATEGORIES}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </View>

        {/* Latest Pets */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('latest_pets')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/adoption')}>
              <Text style={styles.seeAll}>{t('see_all')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={pets}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PetCard
                pet={item}
                onPress={() => router.push(`/pet/${item.id}`)}
                compact
              />
            )}
          />
        </View>

        {/* Nearby Vets */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('nearby_vets')}</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>{t('see_all')}</Text>
            </TouchableOpacity>
          </View>
          {vets.map((vet) => (
            <VetCard
              key={vet.id}
              vet={vet}
              onPress={() => router.push(`/vet/${vet.id}`)}
              onCall={() => {}}
            />
          ))}
        </View>

        {/* Pet Supplies */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('pet_supplies')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/shop')}>
              <Text style={styles.seeAll}>{t('see_all')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={products}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                onPress={() => {}}
              />
            )}
          />
        </View>

        {/* Community CTA */}
        <TouchableOpacity 
          style={styles.communityCTA}
          onPress={() => router.push('/community')}
        >
          <View style={styles.communityContent}>
            <Ionicons name="people" size={32} color={Colors.white} />
            <View style={styles.communityText}>
              <Text style={styles.communityTitle}>Join Our Community</Text>
              <Text style={styles.communitySubtitle}>Share stories & ask questions</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.white} />
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <TouchableOpacity 
          style={styles.drawerOverlay} 
          activeOpacity={1}
          onPress={() => setDrawerOpen(false)}
        >
          <View style={styles.drawer}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.drawerScrollContent}
            >
              <TouchableOpacity
                style={styles.drawerHeader}
                activeOpacity={0.85}
                onPress={() => {
                  setDrawerOpen(false);
                  if (user) {
                    router.push('/edit-profile');
                  } else {
                    router.push('/(auth)/login');
                  }
                }}
              >
                <View style={styles.drawerAvatar}>
                  {user?.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.drawerAvatarImage} />
                  ) : (
                    <Ionicons name="person" size={40} color={Colors.white} />
                  )}
                </View>
                <Text style={styles.drawerName}>{user?.name || 'Guest'}</Text>
                <Text style={styles.drawerEmail}>{user?.email || 'Login to continue'}</Text>
              </TouchableOpacity>
              
              <View style={styles.drawerMenu}>
                {[
                  { icon: 'paw', label: t('my_pets'), route: '/my-pets' },
                  { icon: 'heart', label: t('favorites'), route: '/(tabs)/adoption' },
                  { icon: 'chatbubbles', label: t('messages'), route: '/(tabs)/profile' },
                  { icon: 'search', label: t('lost_found'), route: '/lost-found' },
                  { icon: 'people', label: t('community'), route: '/community' },
                  { icon: 'ribbon', label: 'Sponsorship', route: '/sponsorships' },
                  { icon: 'storefront', label: 'Marketplace', route: '/marketplace' },
                  ...((user?.role === 'vet' || user?.is_admin) ? [{ icon: 'medkit', label: 'Vet Requests', route: '/vet-care-requests' }] : []),
                  ...((user?.role === 'care_clinic' || user?.is_admin) ? [{ icon: 'business', label: 'Clinic Care', route: '/clinic-care-management' }] : []),
                  ...((user?.role === 'market_owner' || user?.is_admin) ? [{ icon: 'stats-chart', label: 'Market Owner', route: '/market-owner-dashboard' }] : []),
                  ...((user && !user?.is_admin && !['vet','market_owner','care_clinic'].includes(user?.role || '')) ? [{ icon: 'git-pull-request', label: 'Request Role', route: '/role-request' }] : []),
                  ...((user?.role === 'admin' || user?.is_admin) ? [{ icon: 'shield-checkmark', label: 'Admin Panel', route: '/admin' }] : []),
                  { icon: 'settings', label: t('settings'), route: '/(tabs)/profile' },
                ].map((item) => (
                  <TouchableOpacity 
                    key={item.label}
                    style={styles.drawerItem}
                    onPress={() => {
                      setDrawerOpen(false);
                      router.push(item.route as any);
                    }}
                  >
                    <Ionicons name={item.icon as any} size={22} color={Colors.text} />
                    <Text style={styles.drawerItemText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      )}
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
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  logoEmoji: {
    fontSize: 18,
  },
  logoText: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  heroBanner: {
    margin: Spacing.md,
    height: 180,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.large,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  heroTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    fontSize: FontSize.md,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  heroButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  seeAll: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '600',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  serviceCard: {
    width: (width - Spacing.md * 5) / 4,
    alignItems: 'center',
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  serviceLabel: {
    fontSize: FontSize.xs,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  horizontalList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  communityCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.secondary,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  communityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  communityText: {},
  communityTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  communitySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.white,
    opacity: 0.9,
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  drawer: {
    width: width * 0.75,
    height: '100%',
    backgroundColor: Colors.white,
  },
  drawerScrollContent: {
    paddingBottom: 28,
  },
  drawerHeader: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  drawerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  drawerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  drawerName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  drawerEmail: {
    fontSize: FontSize.md,
    color: Colors.white,
    opacity: 0.9,
  },
  drawerMenu: {
    padding: Spacing.md,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  drawerItemText: {
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  pageLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageLoaderText: {
    marginTop: Spacing.sm,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
});
