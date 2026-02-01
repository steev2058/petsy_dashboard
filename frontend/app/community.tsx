import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { communityAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

const POST_TYPES = [
  { id: 'all', label: 'All', icon: 'grid' },
  { id: 'question', label: 'Questions', icon: 'help-circle' },
  { id: 'story', label: 'Stories', icon: 'book' },
  { id: 'tip', label: 'Tips', icon: 'bulb' },
  { id: 'sponsorship', label: 'Sponsorship', icon: 'heart' },
];

export default function CommunityScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [selectedType]);

  const loadPosts = async () => {
    try {
      const params = selectedType !== 'all' ? { type: selectedType } : {};
      const response = await communityAPI.getAll(params);
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

  const handleLike = async (postId: string) => {
    try {
      await communityAPI.like(postId);
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, likes: p.likes + 1 } : p
      ));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'question': return 'help-circle';
      case 'story': return 'book';
      case 'tip': return 'bulb';
      case 'sponsorship': return 'heart';
      default: return 'chatbubble';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'question': return Colors.primary;
      case 'story': return Colors.secondary;
      case 'tip': return Colors.accent;
      case 'sponsorship': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  const renderPost = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.postCard, Shadow.small]}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          {item.user_avatar ? (
            <Image source={{ uri: item.user_avatar }} style={styles.userAvatar} />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Ionicons name="person" size={18} color={Colors.white} />
            </View>
          )}
          <View>
            <Text style={styles.userName}>{item.user_name}</Text>
            <Text style={styles.postTime}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]}>
          <Ionicons name={getTypeIcon(item.type) as any} size={12} color={Colors.white} />
          <Text style={styles.typeBadgeText}>{item.type}</Text>
        </View>
      </View>

      {/* Post Content */}
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postContent} numberOfLines={3}>
        {item.content}
      </Text>

      {/* Post Image */}
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.postImage} />
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleLike(item.id)}
        >
          <Ionicons name="heart-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.actionText}>{item.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.actionText}>{item.comments_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color={Colors.textSecondary} />
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
        <Text style={styles.title}>{t('community')}</Text>
        <TouchableOpacity>
          <Ionicons name="create" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search posts..."
      />

      {/* Type Filter */}
      <FlatList
        horizontal
        data={POST_TYPES}
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
              size={16}
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

      {/* Posts */}
      <FlatList
        data={posts}
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
            <Ionicons name="chatbubbles" size={64} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>
              Be the first to share something with the community!
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-post?type=community')}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
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
  typeFilter: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  typeButtonTextActive: {
    color: Colors.white,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  postTime: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.white,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  postTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  postContent: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  postActions: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
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
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: Spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.large,
  },
});
