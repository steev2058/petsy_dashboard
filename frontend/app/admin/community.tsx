import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import api from '../../src/services/api';

export default function AdminCommunityScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    try {
      const response = await api.get('/admin/community');
      setPosts(response.data || []);
    } catch (error) {
      const mock = [
        { id: '1', type: 'question', title: 'How to train a puppy?', author_name: 'John', likes_count: 15, comments_count: 8, created_at: new Date().toISOString() },
        { id: '2', type: 'story', title: 'My adoption journey', author_name: 'Jane', likes_count: 42, comments_count: 12, created_at: new Date().toISOString() },
      ];
      setPosts(mock);
    } finally { setLoading(false); }
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadPosts(); setRefreshing(false); }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/admin/community/${id}`); setPosts(posts.filter(p => p.id !== id)); } catch { Alert.alert('Error', 'Failed'); }
      }}
    ]);
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'question': return '#6366F1';
      case 'story': return '#EC4899';
      case 'tip': return '#10B981';
      case 'sponsorship': return '#F59E0B';
      default: return Colors.primary;
    }
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

  const renderPost = ({ item }: { item: any }) => (
    <View style={[styles.card, Shadow.small]}>
      <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + '20' }]}>
        <Text style={[styles.typeText, { color: getTypeColor(item.type) }]}>{item.type}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{item.title || item.content?.slice(0, 50)}</Text>
        <Text style={styles.author}>by {item.author_name}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}><Ionicons name="heart" size={14} color={Colors.error} /><Text style={styles.statText}>{item.likes_count || 0}</Text></View>
          <View style={styles.stat}><Ionicons name="chatbubble" size={14} color={Colors.primary} /><Text style={styles.statText}>{item.comments_count || 0}</Text></View>
        </View>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
        <Ionicons name="trash-outline" size={20} color={Colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Community</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.stats}>
        <View style={styles.statItem}><Text style={styles.statValue}>{posts.length}</Text><Text style={styles.statLabel}>Posts</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={styles.statValue}>{posts.reduce((sum, p) => sum + (p.likes_count || 0), 0)}</Text><Text style={styles.statLabel}>Likes</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={styles.statValue}>{posts.reduce((sum, p) => sum + (p.comments_count || 0), 0)}</Text><Text style={styles.statLabel}>Comments</Text></View>
      </View>
      <FlatList data={posts} renderItem={renderPost} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />} ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="chatbubbles-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No posts</Text></View>} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  stats: { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: Spacing.md, marginTop: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  statDivider: { width: 1, backgroundColor: Colors.border },
  listContent: { padding: Spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  typeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  typeText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  info: { flex: 1, marginLeft: Spacing.md },
  title: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  author: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', marginTop: Spacing.xs, gap: Spacing.md },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  deleteBtn: { padding: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.md },
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
