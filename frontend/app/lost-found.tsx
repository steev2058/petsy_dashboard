import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar, Button } from '../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { lostFoundAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

export default function LostFoundScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'lost' | 'found'>('lost');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [selectedType]);

  const loadPosts = async () => {
    try {
      const response = await lostFoundAPI.getAll({ type: selectedType });
      setPosts(response.data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
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

  const filteredPosts = posts.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      item?.title,
      item?.pet_species,
      item?.breed,
      item?.color,
      item?.last_seen_location,
      item?.description,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const renderPost = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.postCard, Shadow.medium]}>
      <View style={styles.postImageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.postImage} />
        ) : (
          <View style={styles.postImagePlaceholder}>
            <Ionicons name="paw" size={40} color={Colors.textLight} />
          </View>
        )}
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: item.type === 'lost' ? Colors.error : Colors.success },
          ]}
        >
          <Text style={styles.typeBadgeText}>
            {item.type === 'lost' ? 'LOST' : 'FOUND'}
          </Text>
        </View>
      </View>
      <View style={styles.postContent}>
        <Text style={styles.postSpecies}>
          {item.breed ? `${item.breed} ${item.pet_species}` : item.pet_species}
        </Text>
        <Text style={styles.postColor}>{item.color}</Text>
        <View style={styles.postLocation}>
          <Ionicons name="location" size={14} color={Colors.textSecondary} />
          <Text style={styles.postLocationText} numberOfLines={1}>
            {item.last_seen_location}
          </Text>
        </View>
        <View style={styles.postDate}>
          <Ionicons name="calendar" size={14} color={Colors.textSecondary} />
          <Text style={styles.postDateText}>{item.last_seen_date}</Text>
        </View>
        <TouchableOpacity style={styles.contactButton}>
          <Ionicons name="call" size={16} color={Colors.white} />
          <Text style={styles.contactButtonText}>Contact</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('lost_found')}</Text>
        <TouchableOpacity onPress={() => router.push(`/create-post?type=${selectedType}`)}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Type Toggle */}
      <View style={styles.typeToggle}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === 'lost' && styles.typeButtonActiveLost,
          ]}
          onPress={() => setSelectedType('lost')}
        >
          <Ionicons
            name="search"
            size={20}
            color={selectedType === 'lost' ? Colors.white : Colors.error}
          />
          <Text
            style={[
              styles.typeButtonText,
              selectedType === 'lost' && styles.typeButtonTextActive,
            ]}
          >
            Lost Pets
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === 'found' && styles.typeButtonActiveFound,
          ]}
          onPress={() => setSelectedType('found')}
        >
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={selectedType === 'found' ? Colors.white : Colors.success}
          />
          <Text
            style={[
              styles.typeButtonText,
              selectedType === 'found' && styles.typeButtonTextActive,
            ]}
          >
            Found Pets
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by location, breed..."
      />

      {/* Posts List */}
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={selectedType === 'lost' ? 'search' : 'checkmark-circle'}
              size={64}
              color={Colors.textLight}
            />
            <Text style={styles.emptyTitle}>
              {searchQuery.trim()
                ? 'No matching results'
                : `No ${selectedType} pets reported`}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery.trim()
                ? 'Try another keyword (location, breed, species, color)'
                : selectedType === 'lost'
                ? 'Report a lost pet to get help from the community'
                : 'Found a pet? Report it to help find the owner'}
            </Text>
            <Button
              title={selectedType === 'lost' ? t('report_lost') : t('report_found')}
              onPress={() => {}}
              style={styles.reportButton}
            />
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
  },
  backButton: {
    padding: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  typeToggle: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeButtonActiveLost: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  typeButtonActiveFound: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  typeButtonText: {
    fontSize: FontSize.md,
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
  postCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  postImageContainer: {
    width: 120,
    height: 150,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  typeBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  postContent: {
    flex: 1,
    padding: Spacing.md,
  },
  postSpecies: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  postColor: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  postLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  postLocationText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  postDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  postDateText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  contactButtonText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  reportButton: {
    minWidth: 200,
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
