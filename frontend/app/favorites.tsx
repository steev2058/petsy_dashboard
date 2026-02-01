import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { favoritesAPI } from '../src/services/api';
import { useStore } from '../src/store/useStore';
import { useTranslation } from '../src/hooks/useTranslation';

interface FavoriteItem {
  id: string;
  item_type: 'pet' | 'product';
  item_id: string;
  item: any;
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'pet', label: 'Pets' },
  { id: 'product', label: 'Products' },
];

export default function FavoritesScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { isAuthenticated } = useStore();
  
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadFavorites();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, selectedTab]);

  const loadFavorites = async () => {
    try {
      const params = selectedTab === 'all' ? {} : { item_type: selectedTab };
      const response = await favoritesAPI.getAll(params);
      setFavorites(response.data);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  }, [selectedTab]);

  const handleRemoveFavorite = async (item: FavoriteItem) => {
    Alert.alert(
      'Remove Favorite',
      'Are you sure you want to remove this from favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await favoritesAPI.remove(item.item_type, item.item_id);
              setFavorites(prev => prev.filter(f => f.id !== item.id));
            } catch (error) {
              console.error('Error removing favorite:', error);
            }
          },
        },
      ]
    );
  };

  const navigateToItem = (item: FavoriteItem) => {
    if (item.item_type === 'pet') {
      router.push(`/pet/${item.item_id}`);
    } else {
      router.push(`/product/${item.item_id}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Favorites</Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.loginRequired}>
          <Ionicons name="heart" size={80} color={Colors.primary} />
          <Text style={styles.loginTitle}>Login Required</Text>
          <Text style={styles.loginText}>Please login to view your favorites</Text>
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

  const renderFavoriteItem = ({ item, index }: { item: FavoriteItem; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 100)} exiting={FadeOutLeft}>
      <TouchableOpacity
        style={[styles.itemCard, Shadow.small]}
        onPress={() => navigateToItem(item)}
        activeOpacity={0.9}
      >
        <View style={styles.itemImageContainer}>
          {item.item?.image ? (
            <Image source={{ uri: item.item.image }} style={styles.itemImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name={item.item_type === 'pet' ? 'paw' : 'cube'}
                size={32}
                color={Colors.textLight}
              />
            </View>
          )}
          <View style={styles.typeBadge}>
            <Ionicons
              name={item.item_type === 'pet' ? 'paw' : 'cart'}
              size={12}
              color={Colors.white}
            />
          </View>
        </View>
        
        <View style={styles.itemContent}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.item?.name || 'Unknown'}
          </Text>
          {item.item_type === 'pet' ? (
            <Text style={styles.itemMeta}>
              {item.item?.species} • {item.item?.breed || 'Mixed'}
            </Text>
          ) : (
            <Text style={styles.itemPrice}>${item.item?.price?.toFixed(2)}</Text>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFavorite(item)}
        >
          <Ionicons name="heart" size={24} color={Colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>Favorites</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && styles.tabActive,
            ]}
            onPress={() => setSelectedTab(tab.id)}
          >
            <Text style={[
              styles.tabText,
              selectedTab === tab.id && styles.tabTextActive,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={renderFavoriteItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="heart-outline" size={48} color={Colors.white} />
            </View>
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptyText}>Start adding pets and products you love!</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/(tabs)/adoption')}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.browseGradient}
              >
                <Text style={styles.browseText}>Browse Pets</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
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
  backButton: {},
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundDark,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemImageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.md,
  },
  imagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  itemName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  itemMeta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  browseButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  browseGradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  browseText: {
    fontSize: FontSize.md,
    fontWeight: '600',
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
});
