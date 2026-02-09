import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { communityAPI } from '../../src/services/api';

export default function CommunityPostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const res = await communityAPI.getById(id);
        setPost(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="small" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><Text>Post not found</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonInner}><Ionicons name="arrow-back" size={22} color={Colors.text} /></View>
        </TouchableOpacity>
        <Text style={styles.title}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, Shadow.small]}>
          <Text style={styles.user}>{post.user_name}</Text>
          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.body}>{post.content}</Text>
          {post.image ? <Image source={{ uri: post.image }} style={styles.image} /> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white },
  backButton: {},
  backButtonInner: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  content: { padding: Spacing.md },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md },
  user: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 8 },
  postTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  body: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22 },
  image: { width: '100%', height: 220, marginTop: 12, borderRadius: BorderRadius.md },
});