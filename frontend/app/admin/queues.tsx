import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';
import { useStore } from '../../src/store/useStore';

const API = () => {
  const base =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/api`;
};

type QueueData = Record<string, number>;

export default function AdminQueues() {
  const router = useRouter();
  const token = useStore((s) => s.token);
  const [data, setData] = useState<QueueData>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch(`${API()}/admin/queues/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [token])
  );

  const cards = [
    {
      key: 'pending_role_requests',
      label: 'طلبات أدوار',
      href: '/admin/role-requests',
      color: Colors.primary,
    },
    {
      key: 'pending_friend_reports',
      label: 'بلاغات مفتوحة',
      href: '/admin/friend-reports',
      color: Colors.error,
    },
    {
      key: 'open_orders',
      label: 'طلبات سوق نشطة',
      href: '/admin/orders',
      color: Colors.secondary,
    },
    {
      key: 'pending_appointments',
      label: 'حجوزات بيطرية',
      href: '/admin/appointments',
      color: Colors.secondaryDark,
    },
    {
      key: 'pending_seller_verifications',
      label: 'تحقق بائعين',
      href: '/admin/users',
      color: Colors.warning,
    },
    {
      key: 'pending_vet_verifications',
      label: 'تحقق بيطريين',
      href: '/admin/vets',
      color: Colors.warning,
    },
  ] as const;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>طوابير العمل</Text>
        <TouchableOpacity onPress={load}>
          <Ionicons name="refresh" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        >
          <Text style={styles.hint}>مراجعة يومية للطوابير الحرجة قبل الإطلاق العام</Text>
          {cards.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={styles.card}
              onPress={() => router.push(c.href as any)}
            >
              <View style={[styles.badge, { backgroundColor: c.color }]}>
                <Text style={styles.badgeText}>{data[c.key] ?? 0}</Text>
              </View>
              <Text style={styles.cardLabel}>{c.label}</Text>
              <Ionicons name="chevron-back" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.link}
            onPress={() => router.push('/admin/sharia-policy' as any)}
          >
            <Text style={styles.linkText}>إعدادات السياسة الشرعية ←</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  content: { padding: Spacing.lg },
  hint: { textAlign: 'right', color: Colors.textSecondary, marginBottom: Spacing.md },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badge: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: { color: Colors.white, fontWeight: '800' },
  cardLabel: {
    flex: 1,
    textAlign: 'right',
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  link: { marginTop: Spacing.lg, alignItems: 'center' },
  linkText: { color: Colors.primary, fontWeight: '700' },
});
