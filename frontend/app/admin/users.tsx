import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import api from '../../src/services/api';
import { useTranslation } from '../../src/hooks/useTranslation';

export default function AdminUsersScreen() {
  const router = useRouter();
  const { language, isRTL } = useTranslation();
  const L = {
    users: language === 'ar' ? 'المستخدمون' : 'Users',
    searchUsers: language === 'ar' ? 'ابحث عن مستخدمين...' : 'Search users...',
    total: language === 'ar' ? 'الإجمالي' : 'Total',
    verified: language === 'ar' ? 'موثّق' : 'Verified',
    admins: language === 'ar' ? 'المشرفون' : 'Admins',
    noUsers: language === 'ar' ? 'لا يوجد مستخدمون' : 'No users found',
    userDetails: language === 'ar' ? 'تفاصيل المستخدم' : 'User Details',
    verify: language === 'ar' ? 'توثيق' : 'Verify',
    unverify: language === 'ar' ? 'إلغاء التوثيق' : 'Unverify',
    setVet: language === 'ar' ? 'تعيين طبيب' : 'Set Vet',
    setMarket: language === 'ar' ? 'تعيين سوق' : 'Set Market',
    setClinic: language === 'ar' ? 'تعيين عيادة' : 'Set Clinic',
    setAdmin: language === 'ar' ? 'تعيين مشرف' : 'Set Admin',
    removeAdmin: language === 'ar' ? 'إزالة صلاحية مشرف' : 'Remove Admin',
    forceVerify: language === 'ar' ? 'تفعيل الحساب' : 'Force Verify',
    forceUnverify: language === 'ar' ? 'إلغاء تفعيل الحساب' : 'Force Unverify',
    reports: language === 'ar' ? 'البلاغات' : 'Reports',
    block: language === 'ar' ? 'حظر' : 'Block',
    unblock: language === 'ar' ? 'إلغاء الحظر' : 'Unblock',
    delete: language === 'ar' ? 'حذف' : 'Delete',
    joined: language === 'ar' ? 'انضم' : 'Joined',
    reportsOpen: language === 'ar' ? 'بلاغات مفتوحة' : 'Reports',
    blocked: language === 'ar' ? 'محظور' : 'Blocked',
    loading: language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading data...',
    authTools: language === 'ar' ? 'أدوات التحقق' : 'Auth Tools',
    verificationCode: language === 'ar' ? 'رمز التحقق' : 'Verification code',
    resetCode: language === 'ar' ? 'رمز إعادة التعيين' : 'Reset code',
    resetExpiryMins: language === 'ar' ? 'صلاحية الرمز (دقائق)' : 'Reset expiry (minutes)',
    save: language === 'ar' ? 'حفظ' : 'Save',
    clear: language === 'ar' ? 'مسح' : 'Clear',
  };
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authFields, setAuthFields] = useState<any>(null);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [resetExpiryMinsInput, setResetExpiryMinsInput] = useState('15');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = users.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data || []);
      setFilteredUsers(response.data || []);
    } catch (error) {
      console.log('Error loading users:', error);
      // Mock data
      const mockUsers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', created_at: new Date().toISOString(), is_verified: true, role: 'user' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', created_at: new Date().toISOString(), is_verified: true, role: 'admin' },
        { id: '3', name: 'Bob Wilson', email: 'bob@example.com', created_at: new Date().toISOString(), is_verified: false, role: 'user' },
      ];
      setUsers(mockUsers);
      setFilteredUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }, []);

  const handleDeleteUser = async (userId: string) => {
    Alert.alert('Delete User', 'Are you sure you want to delete this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/users/${userId}`);
            setUsers(users.filter(u => u.id !== userId));
            Alert.alert('Success', 'User deleted successfully');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete user');
          }
        },
      },
    ]);
  };

  const openAuthTools = async (user: any) => {
    setAuthLoading(true);
    setShowAuthModal(true);
    try {
      const res = await api.get(`/admin/users/${user.id}/auth-fields`);
      setAuthFields(res.data);
      setVerificationCodeInput(res.data?.verification_code || '');
      setResetCodeInput(res.data?.reset_code || '');
      setResetExpiryMinsInput('15');
    } catch (e) {
      Alert.alert('Error', 'Failed to load auth fields');
      setShowAuthModal(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const saveAuthTools = async () => {
    if (!selectedUser) return;
    setAuthLoading(true);
    try {
      const payload: any = {
        verification_code: verificationCodeInput,
        reset_code: resetCodeInput,
      };
      const mins = parseInt(resetExpiryMinsInput || '0', 10);
      if (!Number.isNaN(mins) && mins > 0) payload.reset_code_expires_minutes = mins;

      const res = await api.put(`/admin/users/${selectedUser.id}/auth-fields`, payload);
      // refresh current view
      const next = { ...(authFields || {}), ...(res.data?.updated || {}) };
      setAuthFields(next);
      Alert.alert('Success', 'Updated');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail?.message || e?.response?.data?.detail || 'Failed to update');
    } finally {
      setAuthLoading(false);
    }
  };

  const clearVerification = async () => {
    if (!selectedUser) return;
    setAuthLoading(true);
    try {
      await api.put(`/admin/users/${selectedUser.id}/auth-fields`, { clear_verification: true });
      setVerificationCodeInput('');
      setAuthFields((prev: any) => ({ ...(prev || {}), verification_code: null }));
    } finally {
      setAuthLoading(false);
    }
  };

  const clearReset = async () => {
    if (!selectedUser) return;
    setAuthLoading(true);
    try {
      await api.put(`/admin/users/${selectedUser.id}/auth-fields`, { clear_reset: true });
      setResetCodeInput('');
      setAuthFields((prev: any) => ({ ...(prev || {}), reset_code: null, reset_code_expires_at: null }));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleToggleVerification = async (user: any) => {
    try {
      await api.put(`/admin/users/${user.id}`, { is_verified: !user.is_verified });
      const nextVerified = !user.is_verified;
      setUsers(users.map(u => u.id === user.id ? { ...u, is_verified: nextVerified } : u));
      setSelectedUser((prev: any) => (prev?.id === user.id ? { ...prev, is_verified: nextVerified } : prev));
      setAuthFields((prev: any) => (prev?.id === user.id ? { ...prev, is_verified: nextVerified } : prev));
    } catch (error) {
      Alert.alert('Error', 'Failed to update user');
    }
  };

  const handleAdminToggle = async (user: any) => {
    try {
      if (user?.is_admin || user?.role === 'admin') {
        await api.post(`/admin/users/${user.id}/remove-admin`);
        setUsers(users.map(u => u.id === user.id ? { ...u, is_admin: false, role: 'user' } : u));
        setSelectedUser((prev: any) => (prev?.id === user.id ? { ...prev, is_admin: false, role: 'user' } : prev));
        setAuthFields((prev: any) => (prev?.id === user.id ? { ...prev, is_admin: false, role: 'user' } : prev));
      } else {
        await api.post(`/admin/users/${user.id}/make-admin`);
        setUsers(users.map(u => u.id === user.id ? { ...u, is_admin: true, role: 'admin' } : u));
        setSelectedUser((prev: any) => (prev?.id === user.id ? { ...prev, is_admin: true, role: 'admin' } : prev));
        setAuthFields((prev: any) => (prev?.id === user.id ? { ...prev, is_admin: true, role: 'admin' } : prev));
      }
    } catch {
      Alert.alert('Error', 'Failed to update admin status');
    }
  };

  const handleSetRole = async (user: any, role: string) => {
    try {
      await api.put(`/admin/users/${user.id}`, { role });
      setUsers(users.map(u => u.id === user.id ? { ...u, role, is_admin: role === 'admin' } : u));
      setSelectedUser({ ...user, role, is_admin: role === 'admin' });
      Alert.alert('Success', `Role updated to ${role}`);
    } catch {
      Alert.alert('Error', 'Failed to update role');
    }
  };

  const handleAdminBlockToggle = async (user: any) => {
    try {
      if (user.is_blocked_by_admin) {
        await api.delete(`/admin/users/${user.id}/block`);
      } else {
        await api.post(`/admin/users/${user.id}/block`);
      }
      const next = !user.is_blocked_by_admin;
      setUsers(users.map(u => u.id === user.id ? { ...u, is_blocked_by_admin: next } : u));
      setSelectedUser({ ...user, is_blocked_by_admin: next });
    } catch {
      Alert.alert('Error', 'Failed to update block status');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={[styles.loaderText, isRTL && styles.rtlText]}>{L.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderUser = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.userCard, Shadow.small]}
      onPress={() => { setSelectedUser(item); setShowModal(true); }}
    >
      <View style={styles.userAvatar}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
        ) : (
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{(item.name || 'U')[0].toUpperCase()}</Text>
          </LinearGradient>
        )}
      </View>
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName}>{item.name}</Text>
          {item.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={[styles.userDate, isRTL && styles.rtlText]}>{L.joined} {formatDate(item.created_at)}</Text>
        <View style={styles.safetyRow}>
          <Text style={[styles.safetyChip, item.friend_reports_open_count > 0 ? styles.safetyWarn : styles.safetyOk]}>
            {L.reportsOpen}: {item.friend_reports_open_count || 0}
          </Text>
          {item.is_blocked_by_admin ? <Text style={[styles.safetyChip, styles.safetyBlocked]}>{L.blocked}</Text> : null}
        </View>
      </View>
      <View style={[styles.verifiedBadge, { backgroundColor: item.is_verified ? Colors.success + '20' : Colors.error + '20' }]}>
        <Ionicons name={item.is_verified ? 'checkmark-circle' : 'close-circle'} size={16} color={item.is_verified ? Colors.success : Colors.error} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.rtlText]}>{L.users}</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={L.searchUsers}
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

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>{L.total}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{users.filter(u => u.is_verified).length}</Text>
          <Text style={styles.statLabel}>{L.verified}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{users.filter(u => u.role === 'admin').length}</Text>
          <Text style={styles.statLabel}>{L.admins}</Text>
        </View>
      </View>

      {/* User List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>{L.noUsers}</Text>
          </View>
        }
      />

      {/* Auth Tools Modal */}
      <Modal visible={showAuthModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>{L.authTools}</Text>
              <TouchableOpacity onPress={() => setShowAuthModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {authLoading ? (
              <View style={{ padding: Spacing.lg, alignItems: 'center' }}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : (
              <View style={{ paddingVertical: Spacing.sm }}>
                {!!authFields && (
                  <View style={[styles.row, { marginTop: 0 }]}> 
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: (authFields.is_verified ? Colors.error : Colors.success) }]}
                      onPress={() => handleToggleVerification(selectedUser)}
                    >
                      <Text style={styles.smallBtnText}>{authFields.is_verified ? L.forceUnverify : L.forceVerify}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: (authFields.is_admin || authFields.role === 'admin') ? Colors.error : Colors.primary }]}
                      onPress={() => handleAdminToggle(selectedUser)}
                    >
                      <Text style={styles.smallBtnText}>{(authFields.is_admin || authFields.role === 'admin') ? L.removeAdmin : L.setAdmin}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.fieldLabel}>{L.verificationCode}</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="1234"
                  value={verificationCodeInput}
                  onChangeText={setVerificationCodeInput}
                />
                <View style={styles.row}>
                  <TouchableOpacity style={styles.smallBtn} onPress={saveAuthTools}>
                    <Text style={styles.smallBtnText}>{L.save}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallBtn, styles.smallBtnDanger]} onPress={clearVerification}>
                    <Text style={[styles.smallBtnText, { color: Colors.error }]}>{L.clear}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>{L.resetCode}</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="4321"
                  value={resetCodeInput}
                  onChangeText={setResetCodeInput}
                />
                <Text style={styles.fieldLabel}>{L.resetExpiryMins}</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="15"
                  value={resetExpiryMinsInput}
                  onChangeText={setResetExpiryMinsInput}
                  keyboardType="number-pad"
                />
                <View style={styles.row}>
                  <TouchableOpacity style={styles.smallBtn} onPress={saveAuthTools}>
                    <Text style={styles.smallBtnText}>{L.save}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallBtn, styles.smallBtnDanger]} onPress={clearReset}>
                    <Text style={[styles.smallBtnText, { color: Colors.error }]}>{L.clear}</Text>
                  </TouchableOpacity>
                </View>

                {!!authFields?.reset_code_expires_at && (
                  <Text style={styles.hintText}>reset_code_expires_at: {String(authFields.reset_code_expires_at)}</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* User Detail Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>{L.userDetails}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {selectedUser && (
              <>
                <View style={styles.modalUserInfo}>
                  <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>{(selectedUser.name || 'U')[0].toUpperCase()}</Text>
                  </LinearGradient>
                  <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                  <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalAction} onPress={() => handleToggleVerification(selectedUser)}>
                    <Ionicons name={selectedUser.is_verified ? 'close-circle' : 'checkmark-circle'} size={24} color={selectedUser.is_verified ? Colors.error : Colors.success} />
                    <Text style={styles.modalActionText}>{selectedUser.is_verified ? L.unverify : L.verify}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalAction} onPress={() => handleSetRole(selectedUser, 'vet')}>
                    <Ionicons name="medical" size={24} color={Colors.primary} />
                    <Text style={styles.modalActionText}>{L.setVet}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalAction} onPress={() => handleSetRole(selectedUser, 'market_owner')}>
                    <Ionicons name="storefront" size={24} color={Colors.primary} />
                    <Text style={styles.modalActionText}>{L.setMarket}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalAction} onPress={() => handleSetRole(selectedUser, 'care_clinic')}>
                    <Ionicons name="business" size={24} color={Colors.primary} />
                    <Text style={styles.modalActionText}>{L.setClinic}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalAction} onPress={() => handleSetRole(selectedUser, 'admin')}>
                    <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
                    <Text style={styles.modalActionText}>{L.setAdmin}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalAction} onPress={() => { setShowModal(false); openAuthTools(selectedUser); }}>
                    <Ionicons name="key" size={24} color={Colors.primary} />
                    <Text style={styles.modalActionText}>{L.authTools}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalAction} onPress={() => { setShowModal(false); router.push(`/admin/friend-reports?target_user_id=${selectedUser.id}` as any); }}>
                    <Ionicons name="flag" size={24} color={Colors.warning} />
                    <Text style={styles.modalActionText}>{L.reports}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalAction} onPress={() => handleAdminBlockToggle(selectedUser)}>
                    <Ionicons name={selectedUser.is_blocked_by_admin ? 'lock-open' : 'ban'} size={24} color={selectedUser.is_blocked_by_admin ? Colors.success : Colors.error} />
                    <Text style={[styles.modalActionText, { color: selectedUser.is_blocked_by_admin ? Colors.success : Colors.error }]}>{selectedUser.is_blocked_by_admin ? L.unblock : L.block}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalAction, { backgroundColor: Colors.error + '20' }]} onPress={() => { setShowModal(false); handleDeleteUser(selectedUser.id); }}>
                    <Ionicons name="trash" size={24} color={Colors.error} />
                    <Text style={[styles.modalActionText, { color: Colors.error }]}>{L.delete}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  addButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: Spacing.md, marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, gap: Spacing.sm },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm },
  fieldInput: { backgroundColor: Colors.backgroundDark, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  row: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  smallBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  smallBtnDanger: { backgroundColor: Colors.error + '20' },
  smallBtnText: { color: Colors.white, fontWeight: '700' },
  hintText: { marginTop: Spacing.sm, fontSize: FontSize.xs, color: Colors.textSecondary },
  statsBar: { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: Spacing.md, marginTop: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  statDivider: { width: 1, backgroundColor: Colors.border },
  listContent: { padding: Spacing.md },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  userAvatar: { marginRight: Spacing.md },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  userName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  adminBadge: { backgroundColor: Colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  adminBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  userEmail: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  userDate: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  safetyRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  safetyChip: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  safetyWarn: { backgroundColor: Colors.warning + '20', color: Colors.warning },
  safetyOk: { backgroundColor: Colors.success + '20', color: Colors.success },
  safetyBlocked: { backgroundColor: Colors.error + '20', color: Colors.error },
  verifiedBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, paddingBottom: Spacing.xxl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  modalUserInfo: { alignItems: 'center', marginBottom: Spacing.lg },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  modalAvatarText: { fontSize: 32, fontWeight: '700', color: Colors.white },
  modalUserName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginTop: Spacing.md },
  modalUserEmail: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.xs },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  modalAction: { width: '31%', alignItems: 'center', backgroundColor: Colors.backgroundDark, padding: Spacing.sm, borderRadius: BorderRadius.lg },
  modalActionText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginTop: Spacing.xs },
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
  rtlText: { textAlign: 'right' },
});
