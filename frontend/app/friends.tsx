import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { friendsAPI, conversationsAPI, settingsAPI } from '../src/services/api';

type FriendUser = { id: string; name: string; username?: string; user_code?: string; is_online?: boolean; friendship_status?: string; mutual_count?: number };
type FriendRequest = { id: string; message?: string; user: FriendUser; created_at?: string };

export default function FriendsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'friends' | 'requests' | 'find'>('friends');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [searchResult, setSearchResult] = useState<FriendUser[]>([]);
  const [allowFriendRequests, setAllowFriendRequests] = useState<'everyone' | 'nobody'>('everyone');

  const load = async () => {
    try {
      const [fr, req, st] = await Promise.all([friendsAPI.getFriends(), friendsAPI.getRequests(), settingsAPI.get()]);
      setFriends(fr.data || []);
      setIncoming(req.data?.incoming || []);
      setOutgoing(req.data?.outgoing || []);
      setAllowFriendRequests((st.data?.allow_friend_requests || 'everyone') as 'everyone' | 'nobody');
    } catch (e) {
      console.error('Failed loading friends', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  const doSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setSearchResult([]);
      return;
    }
    try {
      const res = await friendsAPI.search(q.trim());
      setSearchResult(res.data || []);
    } catch (e) {
      console.error('Search failed', e);
    }
  };

  const startChat = async (userId: string) => {
    try {
      const res = await conversationsAPI.startDirect(userId);
      const conversationId = res.data?.conversation_id;
      if (conversationId) router.push(`/chat/${conversationId}` as any);
    } catch (e: any) {
      console.error('Cannot start chat', e?.response?.data || e);
    }
  };

  const sendRequest = async (userId: string) => {
    try {
      await friendsAPI.sendRequest(userId);
      await doSearch(query);
      await load();
    } catch (e) {
      console.error('send request failed', e);
    }
  };

  const review = async (id: string, action: 'accept'|'reject') => {
    try {
      await friendsAPI.reviewRequest(id, action);
      await load();
    } catch (e) {
      console.error('review failed', e);
    }
  };

  const togglePrivacy = async () => {
    const next = allowFriendRequests === 'everyone' ? 'nobody' : 'everyone';
    try {
      await settingsAPI.update({ allow_friend_requests: next });
      setAllowFriendRequests(next);
    } catch (e) {
      console.error('privacy update failed', e);
    }
  };

  const blockUser = (userId: string) => {
    Alert.alert('Block user', 'Block this user and remove friendship/requests?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: async () => {
        try {
          await friendsAPI.blockUser(userId);
          await load();
          if (query.trim().length >= 2) await doSearch(query);
        } catch (e) {
          console.error('block failed', e);
        }
      } }
    ]);
  };

  const reportUser = (userId: string) => {
    Alert.alert('Report user', 'Report this profile for abuse?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: async () => {
        try {
          await friendsAPI.reportUser(userId, 'abuse', 'Reported from friends flow');
        } catch (e) {
          console.error('report failed', e);
        }
      } }
    ]);
  };

  const renderFriend = ({ item }: { item: FriendUser }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>@{item.username || 'user'} • {item.user_code || item.id?.slice(0, 8)}</Text>
        <Text style={styles.meta}>{item.mutual_count || 0} mutual friends</Text>
      </View>
      <View style={{ gap: 8, alignItems: 'flex-end' }}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => startChat(item.id)}>
          <Text style={styles.primaryBtnText}>Message</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.iconAction} onPress={() => reportUser(item.id)}><Ionicons name="flag-outline" size={14} color={Colors.error} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconAction} onPress={() => blockUser(item.id)}><Ionicons name="ban-outline" size={14} color={Colors.error} /></TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderIncoming = ({ item }: { item: FriendRequest }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.user?.name}</Text>
        <Text style={styles.meta}>@{item.user?.username || 'user'} • {item.user?.user_code || item.user?.id?.slice(0, 8)}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => review(item.id, 'reject')}><Text style={styles.secondaryBtnText}>Reject</Text></TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => review(item.id, 'accept')}><Text style={styles.primaryBtnText}>Accept</Text></TouchableOpacity>
      </View>
    </View>
  );

  const renderSearch = ({ item }: { item: FriendUser }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>@{item.username || 'user'} • {item.user_code || item.id?.slice(0, 8)}</Text>
        <Text style={styles.meta}>{item.mutual_count || 0} mutual friends</Text>
      </View>
      <View style={{ gap: 8, alignItems: 'flex-end' }}>
        {item.friendship_status === 'friends' ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => startChat(item.id)}><Text style={styles.primaryBtnText}>Message</Text></TouchableOpacity>
        ) : item.friendship_status === 'incoming_pending' ? (
          <Text style={styles.pending}>Requested you</Text>
        ) : item.friendship_status === 'outgoing_pending' ? (
          <Text style={styles.pending}>Pending</Text>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => sendRequest(item.id)}><Text style={styles.primaryBtnText}>Add Friend</Text></TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.iconAction} onPress={() => reportUser(item.id)}><Ionicons name="flag-outline" size={14} color={Colors.error} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconAction} onPress={() => blockUser(item.id)}><Ionicons name="ban-outline" size={14} color={Colors.error} /></TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return <SafeAreaView style={styles.container}><View style={styles.center}><ActivityIndicator size="small" color={Colors.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Friends</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.tabsRow}>
        {['friends','requests','find'].map((key) => (
          <TouchableOpacity key={key} style={[styles.tabChip, tab === key && styles.tabChipActive]} onPress={() => setTab(key as any)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{key === 'friends' ? 'Friends' : key === 'requests' ? `Requests (${incoming.length})` : 'Find Users'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.privacyRow}>
        <Ionicons name="shield-checkmark-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.privacyText}>Friend requests: {allowFriendRequests === 'everyone' ? 'Everyone' : 'Nobody'}</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={togglePrivacy}>
          <Text style={styles.secondaryBtnText}>Change</Text>
        </TouchableOpacity>
      </View>

      {tab === 'find' && (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search by name, username, or PET code" value={query} onChangeText={doSearch} />
        </View>
      )}

      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        data={tab === 'friends' ? friends : tab === 'requests' ? incoming : searchResult}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={(tab === 'requests' ? incoming.length : (tab === 'friends' ? friends.length : searchResult.length)) === 0 ? styles.center : styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>{tab === 'friends' ? 'No friends yet' : tab === 'requests' ? 'No incoming requests' : 'Search users to add friends'}</Text>}
        renderItem={tab === 'friends' ? renderFriend : tab === 'requests' ? renderIncoming : renderSearch}
        ListHeaderComponent={tab === 'requests' && outgoing.length > 0 ? (
          <View style={styles.outgoingBox}>
            <Text style={styles.outgoingTitle}>Outgoing Requests</Text>
            {outgoing.map((r) => <Text key={r.id} style={styles.outgoingItem}>• {r.user?.name} (@{r.user?.username || 'user'})</Text>)}
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconBtn: { width: 36, height: 36, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundDark, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  tabsRow: { flexDirection: 'row', gap: 8, padding: Spacing.md, paddingBottom: 6, flexWrap: 'wrap' },
  tabChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  tabChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  tabText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '700' },
  tabTextActive: { color: Colors.primary },
  searchWrap: { marginHorizontal: Spacing.md, marginBottom: 8, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8 },
  searchInput: { flex: 1, height: 42 },
  privacyRow: { marginHorizontal: Spacing.md, marginBottom: 8, borderRadius: BorderRadius.lg, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  privacyText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  list: { padding: Spacing.md, gap: 8, paddingBottom: 120 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.small, flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },
  meta: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  primaryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md },
  primaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: 12 },
  secondaryBtn: { backgroundColor: Colors.backgroundDark, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md },
  secondaryBtnText: { color: Colors.text, fontWeight: '700', fontSize: 12 },
  iconAction: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  pending: { color: Colors.textSecondary, fontWeight: '700', fontSize: 12 },
  outgoingBox: { marginHorizontal: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  outgoingTitle: { fontWeight: '700', color: Colors.text, marginBottom: 6 },
  outgoingItem: { color: Colors.textSecondary, fontSize: 12, marginBottom: 2 },
});
