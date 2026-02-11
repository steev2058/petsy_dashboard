import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { communityAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { language, isRTL } = useTranslation();
  const L = {
    title: language === 'ar' ? 'المستخدمون المحظورون' : 'Blocked Users',
    noBlocked: language === 'ar' ? 'لا يوجد مستخدمون محظورون' : 'No blocked users',
    unblock: language === 'ar' ? 'إلغاء الحظر' : 'Unblock',
    unblocked: language === 'ar' ? 'تم إلغاء الحظر' : 'Unblocked',
    unblockedMsg: language === 'ar' ? 'تم إلغاء حظر' : 'has been unblocked.',
    error: language === 'ar' ? 'خطأ' : 'Error',
    loadFail: language === 'ar' ? 'فشل تحميل المستخدمين المحظورين' : 'Failed to load blocked users',
    unblockFail: language === 'ar' ? 'فشل إلغاء الحظر' : 'Failed to unblock user',
  };
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await communityAPI.getBlockedUsers();
      setUsers(res.data || []);
    } catch (e) {
      Alert.alert(L.error, L.loadFail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUnblock = async (userId: string, name: string) => {
    try {
      await communityAPI.unblockUser(userId);
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
      Alert.alert(L.unblocked, `${name} ${L.unblockedMsg}`);
    } catch (e) {
      Alert.alert(L.error, L.unblockFail);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="small" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonInner}><Ionicons name="arrow-back" size={22} color={Colors.text} /></View>
        </TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.rtlText]}>{L.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={[styles.empty, isRTL && styles.rtlText]}>{L.noBlocked}</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, Shadow.small]}>
            <View style={styles.left}>
              {item.avatar ? <Image source={{ uri: item.avatar }} style={styles.avatar} /> : <View style={styles.avatarPh}><Text style={styles.avatarTx}>{(item.name || 'U')[0]}</Text></View>}
              <Text style={styles.name}>{item.name}</Text>
            </View>
            <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblock(item.user_id, item.name)}>
              <Text style={styles.unblockText}>{L.unblock}</Text>
            </TouchableOpacity>
          </View>
        )}
      />
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
  list: { padding: Spacing.md },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarPh: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarTx: { color: Colors.white, fontWeight: '700' },
  name: { fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },
  unblockBtn: { borderWidth: 1, borderColor: Colors.error, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 6 },
  unblockText: { color: Colors.error, fontWeight: '700' },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 40 },
  rtlText: { textAlign: 'right' },
});