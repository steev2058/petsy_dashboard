import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { notificationsAPI } from '../src/services/api';

type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at?: string;
  data?: Record<string, any>;
};

type FilterKey = 'all' | 'unread' | 'care_request' | 'role_request' | 'marketplace' | 'admin';

const PAGE_SIZE = 20;

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<FilterKey>('all');
  const isFetchingRef = useRef(false);
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filterMeta = useMemo(() => ([
    { key: 'all' as FilterKey, label: 'All' },
    { key: 'unread' as FilterKey, label: 'Unread' },
    { key: 'care_request' as FilterKey, label: 'Care' },
    { key: 'role_request' as FilterKey, label: 'Roles' },
    { key: 'marketplace' as FilterKey, label: 'Market' },
    { key: 'admin' as FilterKey, label: 'Admin' },
  ]), []);

  const load = useCallback(async (opts?: { reset?: boolean; silent?: boolean }) => {
    const reset = !!opts?.reset;
    const silent = !!opts?.silent;
    const nextOffset = reset ? 0 : offset;

    if (isFetchingRef.current) return;

    if (reset) {
      if (!silent) setLoading(true);
      setHasMore(true);
      setOffset(0);
    } else {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    }

    isFetchingRef.current = true;
    try {
      const params: any = {
        limit: PAGE_SIZE,
        offset: nextOffset,
      };
      if (filter === 'unread') params.unread_only = true;
      if (filter !== 'all' && filter !== 'unread') params.notif_type = filter;

      const res = await notificationsAPI.getAll(params);
      const payload = res.data || {};
      const newItems: AppNotification[] = payload.items || [];

      if (reset) {
        setItems(newItems);
      } else {
        setItems((prev) => [...prev, ...newItems]);
      }
      setHasMore(!!payload.has_more);
      setOffset(nextOffset + newItems.length);
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [filter, hasMore, loadingMore, offset]);

  useEffect(() => {
    load({ reset: true });
  }, [filter]);

  // Real-time-ish refresh via polling (without pull-to-refresh)
  useEffect(() => {
    if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    liveTimerRef.current = setInterval(() => {
      load({ reset: true, silent: true });
    }, 10000);

    return () => {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    };
  }, [filter, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load({ reset: true });
  };

  const markReadAndOpen = async (item: AppNotification) => {
    try {
      if (!item.is_read) {
        await notificationsAPI.markRead(item.id);
        setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));
      }
    } catch (e) {
      console.error('Failed to mark notification', e);
    }

    const route = item?.data?.route;
    const listingId = item?.data?.listing_id;

    if (route) {
      router.push(route as any);
      return;
    }
    if (listingId) {
      router.push(`/marketplace/${listingId}` as any);
      return;
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsAPI.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error('Failed to mark all read', e);
    } finally {
      setMarkingAll(false);
    }
  };

  const clearAll = async () => {
    Alert.alert('Clear notifications', 'Delete all notifications history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          setClearingAll(true);
          try {
            await notificationsAPI.clearAll();
            setItems([]);
            setHasMore(false);
            setOffset(0);
          } catch (e) {
            console.error('Failed to clear notifications', e);
          } finally {
            setClearingAll(false);
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={markAllRead} disabled={markingAll || clearingAll}>
            {markingAll ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="checkmark-done-outline" size={20} color={Colors.primary} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={clearAll} disabled={markingAll || clearingAll}>
            {clearingAll ? <ActivityIndicator size="small" color={Colors.error} /> : <Ionicons name="trash-outline" size={20} color={Colors.error} />}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filtersRow}>
        {filterMeta.map((f) => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterChipActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.emptyText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          contentContainerStyle={items.length === 0 ? styles.center : styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No notifications found</Text>}
          onEndReachedThreshold={0.2}
          onEndReached={() => load({ reset: false })}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.card, !item.is_read && styles.unreadCard]} onPress={() => markReadAndOpen(item)}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {!item.is_read && <View style={styles.dot} />}
              </View>
              <Text style={styles.cardBody}>{item.body}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.typeText}>{item.type}</Text>
                {!!item.created_at && <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundDark,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  filtersRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 8, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  filterText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: Colors.primary },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.small },
  unreadCard: { borderWidth: 1, borderColor: Colors.primary + '44' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, flex: 1 },
  cardBody: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 19 },
  metaRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeText: { color: Colors.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  time: { fontSize: 12, color: Colors.textSecondary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginLeft: 10 },
});
