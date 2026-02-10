import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { roleRequestAPI } from '../../src/services/api';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';

export default function AdminRoleRequestsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await roleRequestAPI.getAdminAll();
      setRows(res.data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (id: string, action: 'approve' | 'reject') => {
    await roleRequestAPI.review(id, action);
    await load();
  };

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity><Text style={styles.title}>Role Requests</Text><View style={{ width: 40 }} /></View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.primary]} />}
        renderItem={({ item }) => (
          <View style={[styles.card, Shadow.small]}>
            <Text style={styles.name}>{item.user_name || 'User'}</Text>
            <Text style={styles.meta}>{item.user_email || '-'}</Text>
            <Text style={styles.meta}>Requested: {item.target_role}</Text>
            <Text style={styles.meta}>Status: {item.status}</Text>
            {item.reason ? <Text style={styles.reason}>Reason: {item.reason}</Text> : null}
            {item.status === 'pending' && (
              <View style={styles.row}>
                <TouchableOpacity style={styles.btn} onPress={() => review(item.id, 'approve')}><Text style={styles.btnText}>Approve</Text></TouchableOpacity>
                <TouchableOpacity style={styles.btnDanger} onPress={() => review(item.id, 'reject')}><Text style={styles.btnDangerText}>Reject</Text></TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'}, center:{flex:1,justifyContent:'center',alignItems:'center'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white}, backBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,justifyContent:'center',alignItems:'center'}, title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},
  list:{padding:Spacing.md,paddingBottom:110}, card:{backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md,marginBottom:Spacing.sm}, name:{fontSize:FontSize.md,fontWeight:'700',color:Colors.text}, meta:{fontSize:FontSize.sm,color:Colors.textSecondary,marginTop:3}, reason:{fontSize:FontSize.sm,color:Colors.text,marginTop:6}, row:{marginTop:10,flexDirection:'row',gap:8}, btn:{backgroundColor:Colors.success,borderRadius:BorderRadius.md,paddingHorizontal:12,paddingVertical:8}, btnText:{fontSize:FontSize.xs,fontWeight:'700',color:Colors.white}, btnDanger:{backgroundColor:'#FEE2E2',borderRadius:BorderRadius.md,paddingHorizontal:12,paddingVertical:8}, btnDangerText:{fontSize:FontSize.xs,fontWeight:'700',color:Colors.error}
});