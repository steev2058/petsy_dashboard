import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { roleRequestAPI } from '../src/services/api';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { useTranslation } from '../src/hooks/useTranslation';

const statusColor = (s: string) => s === 'approved' ? Colors.success : s === 'rejected' ? Colors.error : Colors.primary;

export default function MyRoleRequestsScreen() {
  const router = useRouter();
  const { language, isRTL } = useTranslation();
  const L = {
    title: language === 'ar' ? 'طلباتي للأدوار' : 'My Role Requests',
    pending: language === 'ar' ? 'قيد الانتظار' : 'pending',
    approved: language === 'ar' ? 'مقبول' : 'approved',
    rejected: language === 'ar' ? 'مرفوض' : 'rejected',
    noRequests: language === 'ar' ? 'لا توجد طلبات أدوار بعد' : 'No role requests yet',
  };
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await roleRequestAPI.getMy();
      setRows(res.data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.rtlText]}>{L.title}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/role-request')}><Ionicons name='add' size={20} color={Colors.white} /></TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.primary]} />}
        renderItem={({ item }) => (
          <View style={[styles.card, Shadow.small]}>
            <View style={styles.rowTop}>
              <Text style={[styles.roleText, isRTL && styles.rtlText]}>{language === 'ar' ? (item.target_role === 'vet' ? 'طبيب بيطري' : item.target_role === 'market_owner' ? 'مالك سوق' : item.target_role === 'care_clinic' ? 'عيادة رعاية' : String(item.target_role || '').replace('_', ' ')) : String(item.target_role || '').replace('_', ' ')}</Text>
              <View style={[styles.badge, { backgroundColor: statusColor(item.status) + '20' }]}>
                <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>{item.status === 'approved' ? L.approved : item.status === 'rejected' ? L.rejected : L.pending}</Text>
              </View>
            </View>
            {item.reason ? <Text style={[styles.reason, isRTL && styles.rtlText]}>{item.reason}</Text> : null}
            <Text style={[styles.date, isRTL && styles.rtlText]}>{item.created_at ? new Date(item.created_at).toLocaleString(language === 'ar' ? 'ar' : 'en') : ''}</Text>
          </View>
        )}
        ListEmptyComponent={<View style={styles.center}><Text style={[styles.empty, isRTL && styles.rtlText]}>{L.noRequests}</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'}, center:{flex:1,justifyContent:'center',alignItems:'center'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white},
  backBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'},
  addBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center'},
  title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},
  list:{padding:Spacing.md,paddingBottom:110},
  card:{backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md,marginBottom:Spacing.sm},
  rowTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  roleText:{fontSize:FontSize.md,fontWeight:'700',color:Colors.text,textTransform:'capitalize'},
  badge:{paddingHorizontal:10,paddingVertical:4,borderRadius:BorderRadius.full},
  badgeText:{fontSize:FontSize.xs,fontWeight:'700',textTransform:'capitalize'},
  reason:{fontSize:FontSize.sm,color:Colors.text,marginTop:8},
  date:{fontSize:FontSize.xs,color:Colors.textSecondary,marginTop:8},
  empty:{color:Colors.textSecondary},
  rtlText:{textAlign:'right'}
});