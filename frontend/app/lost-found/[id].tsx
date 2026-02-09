import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { conversationsAPI, lostFoundAPI } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';

export default function LostFoundDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated } = useStore();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const res = await lostFoundAPI.getById(id);
        setPost(res.data);
      } catch (e) {
        Alert.alert('Error', 'Failed to load report details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleCall = async () => {
    if (!post?.contact_phone) {
      Alert.alert('No Phone', 'No contact phone available');
      return;
    }
    const phone = String(post.contact_phone).trim();
    const url = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Unavailable', 'Phone calling is not supported on this device/browser');
      return;
    }
    await Linking.openURL(url);
  };

  const handleChat = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to start chat');
      return;
    }
    if (!post?.user_id) {
      Alert.alert('Error', 'Post owner not found');
      return;
    }
    if (post.user_id === user?.id) {
      Alert.alert('Info', 'This is your own post');
      return;
    }

    setChatLoading(true);
    try {
      const initial = `Hi, I'm contacting you about your ${post.type} pet report (${post.pet_species}${post.breed ? ` - ${post.breed}` : ''}).`;
      const res = await conversationsAPI.create({
        other_user_id: post.user_id,
        initial_message: initial,
      });
      const conversationId = res?.data?.conversation_id;
      if (conversationId) {
        router.push(`/chat/${conversationId}`);
      } else {
        Alert.alert('Error', 'Could not open chat');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to start chat');
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loaderText}>Loading report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loaderBox}>
          <Text style={styles.loaderText}>Report not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>{post.type === 'lost' ? 'Lost Pet Report' : 'Found Pet Report'}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {post.image ? (
          <Image source={{ uri: post.image }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="paw" size={44} color={Colors.textLight} />
          </View>
        )}

        <View style={[styles.card, Shadow.small]}>
          <Text style={styles.petTitle}>{post.pet_species}{post.breed ? ` • ${post.breed}` : ''}</Text>
          <Text style={styles.meta}>Color: {post.color || 'Unknown'}</Text>
          <Text style={styles.meta}>Location: {post.last_seen_location}</Text>
          <Text style={styles.meta}>Date: {post.last_seen_date}</Text>
          <Text style={styles.desc}>{post.description}</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, Shadow.large]}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
          <Ionicons name="call" size={18} color={Colors.primary} />
          <Text style={styles.actionText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.chatBtn} onPress={handleChat} disabled={chatLoading}>
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.chatGradient}>
            {chatLoading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="chatbubble-ellipses" size={18} color={Colors.white} />
            )}
            <Text style={styles.chatText}>{chatLoading ? 'Opening...' : 'Chat'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
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
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  content: { padding: Spacing.md, paddingBottom: 120 },
  image: { width: '100%', height: 220, borderRadius: BorderRadius.lg, marginBottom: Spacing.md },
  imagePlaceholder: {
    height: 220,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md },
  petTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: 8, textTransform: 'capitalize' },
  meta: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: 6 },
  desc: { fontSize: FontSize.md, color: Colors.text, marginTop: 8, lineHeight: 22 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    width: 110,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionText: { color: Colors.primary, fontWeight: '700' },
  chatBtn: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  chatGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  chatText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 8, color: Colors.textSecondary },
});