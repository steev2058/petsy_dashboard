import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { conversationsAPI, getChatWebSocketUrl } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';
import { useStore } from '../src/store/useStore';

interface Conversation {
  id: string;
  other_user?: {
    id: string;
    name: string;
    avatar?: string;
    is_online?: boolean;
  };
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
      connectRealtime();
    } else {
      setLoading(false);
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated]);

  const connectRealtime = async () => {
    try {
      const wsUrl = await getChatWebSocketUrl();
      if (!wsUrl) return;

      if (wsRef.current) wsRef.current.close();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message' || data.type === 'conversations_updated') {
            loadConversations();
          } else if (data.type === 'presence_update') {
            const uid = data?.payload?.user_id;
            const isOnline = !!data?.payload?.is_online;
            if (!uid) return;
            setConversations((prev) => prev.map((c) => (
              c.other_user?.id === uid
                ? { ...c, other_user: { ...c.other_user, is_online: isOnline } }
                : c
            )));
          } else if (data.type === 'connected') {
            const onlineIds: string[] = data?.payload?.online_user_ids || [];
            setConversations((prev) => prev.map((c) => (
              c.other_user?.id
                ? { ...c, other_user: { ...c.other_user, is_online: onlineIds.includes(c.other_user.id) } }
                : c
            )));
          }
        } catch (e) {
          console.log('Messages realtime parse error', e);
        }
      };

      ws.onclose = () => {
        if (!isAuthenticated) return;
        reconnectTimerRef.current = setTimeout(() => connectRealtime(), 2000);
      };
    } catch (error) {
      console.error('Realtime connection error:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await conversationsAPI.getAll();
      setConversations(response.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loaderText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Messages</Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.loginRequired}>
          <View style={styles.loginIconContainer}>
            <LinearGradient
              colors={[Colors.primary + '30', Colors.primary + '10']}
              style={styles.loginIconGradient}
            >
              <Ionicons name="chatbubbles" size={60} color={Colors.primary} />
            </LinearGradient>
          </View>
          <Text style={styles.loginTitle}>Login to Chat</Text>
          <Text style={styles.loginText}>
            Sign in to view your messages and connect with pet owners
          </Text>
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

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.conversationCard, Shadow.small]}
      onPress={() => router.push(`/chat/${item.id}`)}
      activeOpacity={0.9}
    >
      <View style={styles.avatarContainer}>
        {item.other_user?.avatar ? (
          <Image source={{ uri: item.other_user.avatar }} style={styles.avatar} />
        ) : (
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.avatarPlaceholder}
          >
            <Text style={styles.avatarInitial}>
              {(item.other_user?.name || 'U')[0].toUpperCase()}
            </Text>
          </LinearGradient>
        )}
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unread_count > 9 ? '9+' : item.unread_count}
            </Text>
          </View>
        )}
        {item.other_user?.is_online ? <View style={styles.onlineIndicator} /> : null}
      </View>
      
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.other_user?.name || 'Unknown User'}
          </Text>
          {item.last_message_time && (
            <Text style={styles.time}>{formatTime(item.last_message_time)}</Text>
          )}
        </View>
        <Text
          style={[
            styles.lastMessage,
            item.unread_count > 0 && styles.lastMessageUnread,
          ]}
          numberOfLines={1}
        >
          {item.last_message || 'Start a conversation'}
        </Text>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
    </TouchableOpacity>
  );

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
          <Text style={styles.title}>Messages</Text>
          {totalUnread > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{totalUnread} new</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.newChatButton} onPress={() => router.push('/friends')}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.newChatGradient}
          >
            <Ionicons name="people" size={20} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, Shadow.small]}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
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

      {/* Online Friends */}
      <View style={styles.onlineSection}>
        <Text style={styles.onlineTitle}>Online Now</Text>
        <FlatList
          horizontal
          data={conversations.filter((c) => !!c.other_user?.is_online).slice(0, 5)}
          keyExtractor={(item) => `online-${item.id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.onlineList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.onlineUser}
              onPress={() => router.push(`/chat/${item.id}`)}
            >
              {item.other_user?.avatar ? (
                <Image source={{ uri: item.other_user.avatar }} style={styles.onlineAvatar} />
              ) : (
                <LinearGradient
                  colors={[Colors.secondary, Colors.secondary + 'CC']}
                  style={styles.onlineAvatarPlaceholder}
                >
                  <Text style={styles.onlineInitial}>
                    {(item.other_user?.name || 'U')[0].toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.onlineDot} />
              <Text style={styles.onlineName} numberOfLines={1}>
                {item.other_user?.name?.split(' ')[0] || 'User'}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.noOnlineText}>No one online</Text>
          }
        />
      </View>

      {/* Conversations List */}
      <FlatList
        data={conversations.filter((c) =>
          c.other_user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
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
            <View style={styles.emptyIconContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.white} />
            </View>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyText}>
              Start chatting by contacting a pet owner from the adoption page
            </Text>
            <TouchableOpacity
              style={styles.startChatButton}
              onPress={() => router.push('/(tabs)/adoption')}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.startChatGradient}
              >
                <Ionicons name="paw" size={18} color={Colors.white} />
                <Text style={styles.startChatText}>Browse Pets</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.md,
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  headerBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  newChatButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  newChatGradient: {
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
  onlineSection: {
    backgroundColor: Colors.white,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  onlineTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  onlineList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  onlineUser: {
    alignItems: 'center',
    width: 60,
  },
  onlineAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.success,
  },
  onlineAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.success,
  },
  onlineInitial: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  onlineDot: {
    position: 'absolute',
    top: 36,
    right: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  onlineName: {
    fontSize: FontSize.xs,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  noOnlineText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  unreadText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  conversationInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  lastMessage: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  lastMessageUnread: {
    color: Colors.text,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 280,
    lineHeight: 22,
  },
  startChatButton: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  startChatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  startChatText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  loginRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loginIconContainer: {
    marginBottom: Spacing.lg,
  },
  loginIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  loginText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
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
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '600',
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
