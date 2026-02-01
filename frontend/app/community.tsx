import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedRN, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { communityAPI } from '../src/services/api';
import { useStore } from '../src/store/useStore';
import { useTranslation } from '../src/hooks/useTranslation';

interface Post {
  id: string;
  type: string;
  title: string;
  content: string;
  image?: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  likes: number;
  comments: number;
  created_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  created_at: string;
}

const POST_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'question', label: 'Questions' },
  { id: 'story', label: 'Stories' },
  { id: 'tip', label: 'Tips' },
  { id: 'sponsorship', label: 'Sponsorship' },
];

export default function CommunityScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { isAuthenticated, user } = useStore();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Comments modal
  const [showComments, setShowComments] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    loadPosts();
  }, [selectedType]);

  useEffect(() => {
    if (showComments) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showComments]);

  const loadPosts = async () => {
    try {
      const params = selectedType === 'all' ? {} : { type: selectedType };
      const response = await communityAPI.getAll(params);
      setPosts(response.data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }, [selectedType]);

  const loadComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      const response = await communityAPI.getComments(postId);
      setComments(response.data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleOpenComments = (post: Post) => {
    setSelectedPost(post);
    setShowComments(true);
    loadComments(post.id);
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !selectedPost || !isAuthenticated) return;

    setSendingComment(true);
    try {
      await communityAPI.addComment(selectedPost.id, newComment.trim());
      setNewComment('');
      loadComments(selectedPost.id);
      // Update post comment count locally
      setPosts(prev => prev.map(p => 
        p.id === selectedPost.id ? { ...p, comments: p.comments + 1 } : p
      ));
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to post comment');
    } finally {
      setSendingComment(false);
    }
  };

  const handleLike = async (post: Post) => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to like posts');
      return;
    }

    try {
      await communityAPI.like(post.id);
      setPosts(prev => prev.map(p => 
        p.id === post.id ? { ...p, likes: p.likes + 1 } : p
      ));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleShare = async (post: Post) => {
    try {
      await Share.share({
        title: post.title,
        message: `Check out this post on Petsy: "${post.title}"\n\n${post.content.substring(0, 100)}...\n\nDownload Petsy to see more!`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
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
      case 'question': return '#6366F1';
      case 'story': return '#10B981';
      case 'tip': return '#F59E0B';
      case 'sponsorship': return '#EF4444';
      default: return Colors.primary;
    }
  };

  const renderPost = ({ item, index }: { item: Post; index: number }) => (
    <AnimatedRN.View entering={FadeInDown.delay(index * 50)}>
      <View style={[styles.postCard, Shadow.small]}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          {item.user_avatar ? (
            <Image source={{ uri: item.user_avatar }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarInitial}>
                {item.user_name[0]?.toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          <View style={styles.postMeta}>
            <Text style={styles.userName}>{item.user_name}</Text>
            <View style={styles.postInfo}>
              <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + '20' }]}>
                <Ionicons name={getTypeIcon(item.type) as any} size={12} color={getTypeColor(item.type)} />
                <Text style={[styles.typeText, { color: getTypeColor(item.type) }]}>
                  {item.type}
                </Text>
              </View>
              <Text style={styles.postTime}>{formatTime(item.created_at)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Post Content */}
        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postContent} numberOfLines={4}>{item.content}</Text>

        {item.image && (
          <Image source={{ uri: item.image }} style={styles.postImage} />
        )}

        {/* Post Actions */}
        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item)}>
            <Ionicons name="heart-outline" size={22} color={Colors.textSecondary} />
            <Text style={styles.actionCount}>{item.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenComments(item)}>
            <Ionicons name="chatbubble-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.actionCount}>{item.comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(item)}>
            <Ionicons name="share-social-outline" size={22} color={Colors.textSecondary} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedRN.View>
  );

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      {item.user_avatar ? (
        <Image source={{ uri: item.user_avatar }} style={styles.commentAvatar} />
      ) : (
        <View style={styles.commentAvatarPlaceholder}>
          <Text style={styles.commentAvatarInitial}>
            {item.user_name[0]?.toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.commentContent}>
        <View style={styles.commentBubble}>
          <Text style={styles.commentUserName}>{item.user_name}</Text>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
        <Text style={styles.commentTime}>{formatTime(item.created_at)}</Text>
      </View>
    </View>
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
        <Text style={styles.title}>Community</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => Alert.alert('Search', 'Search functionality coming soon!')}
        >
          <Ionicons name="search" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Type Filters */}
      <FlatList
        horizontal
        data={POST_TYPES}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.typeFilters}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.typeFilter,
              selectedType === item.id && styles.typeFilterActive,
            ]}
            onPress={() => setSelectedType(item.id)}
          >
            <Text style={[
              styles.typeFilterText,
              selectedType === item.id && styles.typeFilterTextActive,
            ]}>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.white} />
            </View>
            <Text style={styles.emptyTitle}>No Posts Yet</Text>
            <Text style={styles.emptyText}>Be the first to share something!</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-post?type=community')}>
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Comments Modal */}
      <Modal visible={showComments} transparent animationType="none" onRequestClose={() => setShowComments(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowComments(false)}
        >
          <Animated.View
            style={[
              styles.commentsSheet,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.sheetHandle} />
              
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Comments</Text>
                <TouchableOpacity onPress={() => setShowComments(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                renderItem={renderComment}
                style={styles.commentsList}
                ListEmptyComponent={
                  <View style={styles.noComments}>
                    <Text style={styles.noCommentsText}>
                      {loadingComments ? 'Loading comments...' : 'No comments yet. Be the first!'}
                    </Text>
                  </View>
                }
              />

              {isAuthenticated ? (
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                  <View style={styles.commentInput}>
                    <TextInput
                      style={styles.input}
                      placeholder="Write a comment..."
                      placeholderTextColor={Colors.textLight}
                      value={newComment}
                      onChangeText={setNewComment}
                      multiline
                      maxLength={500}
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        (!newComment.trim() || sendingComment) && styles.sendButtonDisabled,
                      ]}
                      onPress={handleSendComment}
                      disabled={!newComment.trim() || sendingComment}
                    >
                      <Ionicons
                        name="send"
                        size={20}
                        color={newComment.trim() ? Colors.white : Colors.textLight}
                      />
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingView>
              ) : (
                <TouchableOpacity
                  style={styles.loginPrompt}
                  onPress={() => {
                    setShowComments(false);
                    router.push('/(auth)/login');
                  }}
                >
                  <Text style={styles.loginPromptText}>Login to comment</Text>
                </TouchableOpacity>
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
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeFilters: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  typeFilter: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundDark,
  },
  typeFilterActive: {
    backgroundColor: Colors.primary,
  },
  typeFilterText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typeFilterTextActive: {
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
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  postMeta: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  userName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  postInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  typeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  postTime: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  moreButton: {
    padding: Spacing.xs,
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
    marginTop: Spacing.sm,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginRight: Spacing.md,
  },
  actionCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  actionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
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
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: Spacing.md,
    borderRadius: 28,
    overflow: 'hidden',
    ...Shadow.large,
  },
  fabGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  commentsSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.md,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  commentsTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  commentsList: {
    maxHeight: 300,
    padding: Spacing.md,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  commentAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarInitial: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
  },
  commentContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  commentBubble: {
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  commentUserName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  commentText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  commentTime: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 4,
    marginLeft: Spacing.sm,
  },
  noComments: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  noCommentsText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    maxHeight: 100,
    color: Colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.backgroundDark,
  },
  loginPrompt: {
    padding: Spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  loginPromptText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '600',
  },
});
