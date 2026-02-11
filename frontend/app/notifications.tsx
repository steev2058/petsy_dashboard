import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
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

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await notificationsAPI.getAll({ limit: 200 });
      setItems(res.data || []);
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
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

    const listingId = item?.data?.listing_id;
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={markAllRead} disabled={markingAll}>
          {markingAll ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="checkmark-done-outline" size={20} color={Colors.primary} />}
        </TouchableOpacity>
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
          ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.card, !item.is_read && styles.unreadCard]} onPress={() => markReadAndOpen(item)}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {!item.is_read && <View style={styles.dot} />}
              </View>
              <Text style={styles.cardBody}>{item.body}</Text>
              {!!item.created_at && <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadow.small,
  },
  unreadCard: {
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, flex: 1 },
  cardBody: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 19 },
  time: { marginTop: 8, fontSize: 12, color: Colors.textSecondary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginLeft: 10 },
});
