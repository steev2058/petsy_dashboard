import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import api from '../../src/services/api';
import { useTranslation } from '../../src/hooks/useTranslation';

type AuditLog = {
  id: string;
  admin_user_id?: string;
  admin_email?: string;
  action?: string;
  target_type?: string;
  target_id?: string;
  payload?: Record<string, any>;
  created_at?: string;
};

const ACTION_FILTERS = ['all', 'review_friend_report', 'review_role_request', 'block_user', 'update_user'];

export default function AdminAuditLogsScreen() {
  const router = useRouter();
  const { language, isRTL } = useTranslation();
  const L = {
    title: language === 'ar' ? 'سجلات التدقيق الإدارية' : 'Admin Audit Logs',
    all: language === 'ar' ? 'الكل' : 'All',
    search: language === 'ar' ? 'ابحث في الإجراء أو بريد المشرف أو الهدف...' : 'Search action, admin email, target...',
    from: language === 'ar' ? 'من YYYY-MM-DD' : 'From YYYY-MM-DD',
    to: language === 'ar' ? 'إلى YYYY-MM-DD' : 'To YYYY-MM-DD',
    apply: language === 'ar' ? 'تطبيق' : 'Apply',
    clear: language === 'ar' ? 'مسح' : 'Clear',
    showing: language === 'ar' ? 'عرض حتى' : 'Showing up to',
    loadMore: language === 'ar' ? 'تحميل المزيد' : 'Load more',
    noLogs: language === 'ar' ? 'لا توجد سجلات تدقيق' : 'No audit logs found',
    admin: language === 'ar' ? 'المشرف' : 'Admin',
    target: language === 'ar' ? 'الهدف' : 'Target',
    unknown: language === 'ar' ? 'غير معروف' : 'unknown',
  };
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [limit, setLimit] = useState(200);
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/admin/audit-logs', { params: { limit, action: filter, q: query, from_date: fromDate, to_date: toDate } });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load admin audit logs', e);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [limit, filter]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const filteredItems = useMemo(() => items, [items]);

  const renderPayload = (payload?: Record<string, any>) => {
    if (!payload || Object.keys(payload).length === 0) return '—';
    try {
      return JSON.stringify(payload);
    } catch {
      return '—';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="small" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.rtlText]}>{L.title}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={18} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterWrap}>
        {ACTION_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f === 'all' ? L.all : f.replaceAll('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={L.search}
          placeholderTextColor={Colors.textLight}
          style={styles.searchInput}
          autoCapitalize="none"
        />
        <View style={styles.dateRow}>
          <TextInput
            value={fromDate}
            onChangeText={setFromDate}
            placeholder={L.from}
            placeholderTextColor={Colors.textLight}
            style={styles.dateInput}
            autoCapitalize="none"
          />
          <TextInput
            value={toDate}
            onChangeText={setToDate}
            placeholder={L.to}
            placeholderTextColor={Colors.textLight}
            style={styles.dateInput}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.queryActions}>
          <TouchableOpacity style={styles.applyBtn} onPress={load}>
            <Text style={styles.applyBtnText}>{L.apply}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              setQuery('');
              setFromDate('');
              setToDate('');
              setTimeout(() => load(), 0);
            }}
          >
            <Text style={styles.clearBtnText}>{L.clear}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.limitRow}>
        <Text style={[styles.limitText, isRTL && styles.rtlText]}>{L.showing} {limit} {language === 'ar' ? 'سجل' : 'logs'}</Text>
        <TouchableOpacity style={styles.moreBtn} onPress={() => setLimit((v) => Math.min(v + 200, 1000))}>
          <Text style={styles.moreBtnText}>{L.loadMore}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={filteredItems.length === 0 ? styles.center : styles.list}
        ListEmptyComponent={<Text style={[styles.empty, isRTL && styles.rtlText]}>{L.noLogs}</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, Shadow.small]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.action, isRTL && styles.rtlText]}>{(item.action || L.unknown).replaceAll('_', ' ')}</Text>
              <Text style={styles.time}>{item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</Text>
            </View>
            <Text style={[styles.meta, isRTL && styles.rtlText]}>{L.admin}: {item.admin_email || item.admin_user_id || '—'}</Text>
            <Text style={[styles.meta, isRTL && styles.rtlText]}>{L.target}: {item.target_type || '—'} {item.target_id ? `(${item.target_id})` : ''}</Text>
            <Text style={[styles.payload, isRTL && styles.rtlText]}>{renderPayload(item.payload)}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
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
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 4,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.white,
  },
  filterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  filterText: { fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize' },
  filterTextActive: { color: Colors.primary, fontWeight: '700' },
  searchWrap: { paddingHorizontal: Spacing.md, marginTop: 6, gap: 8 },
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: Colors.text,
    fontSize: 13,
  },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: Colors.text,
    fontSize: 12,
  },
  queryActions: { flexDirection: 'row', gap: 8 },
  applyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  applyBtnText: { color: Colors.white, fontWeight: '700', fontSize: 12 },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundDark,
  },
  clearBtnText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 12 },
  limitRow: {
    marginHorizontal: Spacing.md,
    marginTop: 6,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitText: { fontSize: 12, color: Colors.textSecondary },
  moreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
  },
  moreBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  list: { padding: Spacing.md, gap: 10, paddingBottom: 120 },
  empty: { color: Colors.textSecondary },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  action: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md, textTransform: 'capitalize', flex: 1 },
  time: { color: Colors.textSecondary, fontSize: 11 },
  meta: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  payload: { color: Colors.text, marginTop: 8, fontSize: 12 },
  rtlText: { textAlign: 'right' },
});
