import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import api from '../../src/services/api';
import { useTranslation } from '../../src/hooks/useTranslation';

type FriendReport = {
  id: string;
  reason?: string;
  notes?: string;
  status?: string;
  created_at?: string;
  reported_by?: { id: string; name: string; email?: string };
  target_user?: { id: string; name: string; email?: string };
};

export default function AdminFriendReportsScreen() {
  const router = useRouter();
  const { language, isRTL } = useTranslation();
  const L = {
    title: language === 'ar' ? 'بلاغات الأصدقاء' : 'Friend Reports',
    noReports: language === 'ar' ? 'لا توجد بلاغات' : 'No reports found',
    reason: language === 'ar' ? 'السبب' : 'Reason',
    reporter: language === 'ar' ? 'المبلّغ' : 'Reporter',
    target: language === 'ar' ? 'المستهدف' : 'Target',
    na: language === 'ar' ? 'غير متاح' : 'n/a',
    open: language === 'ar' ? 'مفتوح' : 'open',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    confirm: language === 'ar' ? 'تأكيد' : 'Confirm',
    resolve: language === 'ar' ? 'حلّ' : 'Resolve',
    blockTarget: language === 'ar' ? 'حظر المستهدف' : 'Block Target',
    reject: language === 'ar' ? 'رفض' : 'Reject',
    resolveTitle: language === 'ar' ? 'حل البلاغ' : 'Resolve report',
    blockTitle: language === 'ar' ? 'حظر المستهدف للمبلّغ' : 'Block target for reporter',
    rejectTitle: language === 'ar' ? 'رفض البلاغ' : 'Reject report',
    applyAction: language === 'ar' ? 'تطبيق الإجراء' : 'Apply action',
  };
  const params = useLocalSearchParams<{ target_user_id?: string; status?: string }>();
  const [items, setItems] = useState<FriendReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/admin/friend-reports', { params: { target_user_id: params.target_user_id, status: params.status } });
      setItems(res.data || []);
    } catch (e) {
      console.error('Failed to load friend reports', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [params.target_user_id, params.status]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const review = async (id: string, action: 'resolve' | 'reject' | 'block_target') => {
    try {
      await api.put(`/admin/friend-reports/${id}`, { action });
      await load();
    } catch (e) {
      console.error('Failed review', e);
    }
  };

  const confirmAction = (id: string, action: 'resolve' | 'reject' | 'block_target', title: string) => {
    Alert.alert(title, `${L.applyAction}: ${action.replace('_', ' ')} ?`, [
      { text: L.cancel, style: 'cancel' },
      { text: L.confirm, style: action === 'reject' ? 'destructive' : 'default', onPress: () => review(id, action) }
    ]);
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
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.rtlText]}>{L.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={items.length === 0 ? styles.center : styles.list}
        ListEmptyComponent={<Text style={[styles.empty, isRTL && styles.rtlText]}>{L.noReports}</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, Shadow.small]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, isRTL && styles.rtlText]}>{L.reason}: {item.reason || L.na}</Text>
              <Text style={[styles.status, item.status === 'open' ? styles.open : styles.closed]}>{item.status || L.open}</Text>
            </View>
            <Text style={[styles.meta, isRTL && styles.rtlText]}>{L.reporter}: {item.reported_by?.name} ({item.reported_by?.email || L.na})</Text>
            <Text style={[styles.meta, isRTL && styles.rtlText]}>{L.target}: {item.target_user?.name} ({item.target_user?.email || L.na})</Text>
            {!!item.notes && <Text style={[styles.notes, isRTL && styles.rtlText]}>{item.notes}</Text>}
            {!!item.created_at && <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>}

            {item.status === 'open' ? (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => confirmAction(item.id, 'resolve', L.resolveTitle)}>
                  <Text style={styles.actionText}>{L.resolve}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.warnBtn]} onPress={() => confirmAction(item.id, 'block_target', L.blockTitle)}>
                  <Text style={styles.warnText}>{L.blockTarget}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => confirmAction(item.id, 'reject', L.rejectTitle)}>
                  <Text style={styles.rejectText}>{L.reject}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white },
  iconBtn: { width: 36, height: 36, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundDark, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  list: { padding: Spacing.md, gap: 10, paddingBottom: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: Colors.textSecondary },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },
  meta: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  notes: { color: Colors.text, marginTop: 8 },
  time: { color: Colors.textSecondary, marginTop: 8, fontSize: 11 },
  status: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  open: { color: Colors.warning },
  closed: { color: Colors.success },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: BorderRadius.md, backgroundColor: Colors.primary + '18' },
  actionText: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  warnBtn: { backgroundColor: Colors.warning + '18' },
  warnText: { color: Colors.warning, fontWeight: '700', fontSize: 12 },
  rejectBtn: { backgroundColor: Colors.error + '18' },
  rejectText: { color: Colors.error, fontWeight: '700', fontSize: 12 },
  rtlText: { textAlign: 'right' },
});
