import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminMarketplaceAPI } from '../../src/services/api';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';

export default function AdminMarketplaceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [l, r] = await Promise.all([adminMarketplaceAPI.getListings(), adminMarketplaceAPI.getReports()]);
      setListings(l.data || []);
      setReports(r.data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: 'active'|'sold'|'archived') => {
    await adminMarketplaceAPI.setListingStatus(id, status);
    await load();
  };

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity><Text style={styles.title}>Marketplace Admin</Text><View style={{ width: 40 }} /></View>
      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statVal}>{listings.length}</Text><Text style={styles.statLbl}>Listings</Text></View>
        <View style={styles.stat}><Text style={styles.statVal}>{reports.length}</Text><Text style={styles.statLbl}>Reports</Text></View>
      </View>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.primary]} />}
        renderItem={({ item }) => (
          <View style={[styles.card, Shadow.small]}>
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.meta}>Owner: {item.user_name || 'Unknown'} • {item.category}</Text>
            <Text style={styles.meta}>Status: {item.status || 'active'}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.btn} onPress={() => setStatus(item.id, 'active')}><Text style={styles.btnText}>Active</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btn} onPress={() => setStatus(item.id, 'sold')}><Text style={styles.btnText}>Sold</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnWarn} onPress={() => setStatus(item.id, 'archived')}><Text style={styles.btnWarnText}>Archive</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'}, center:{flex:1,justifyContent:'center',alignItems:'center'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white}, backBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,justifyContent:'center',alignItems:'center'}, title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},
  statsRow:{padding:Spacing.md,flexDirection:'row',gap:8}, stat:{flex:1,backgroundColor:Colors.white,borderRadius:BorderRadius.md,padding:Spacing.md,alignItems:'center'}, statVal:{fontSize:FontSize.xl,fontWeight:'800',color:Colors.primary}, statLbl:{fontSize:FontSize.sm,color:Colors.textSecondary},
  list:{paddingHorizontal:Spacing.md,paddingBottom:110}, card:{backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md,marginBottom:Spacing.sm}, name:{fontSize:FontSize.md,fontWeight:'700',color:Colors.text}, meta:{fontSize:FontSize.sm,color:Colors.textSecondary,marginTop:4}, row:{marginTop:10,flexDirection:'row',gap:8}, btn:{backgroundColor:Colors.backgroundDark,borderRadius:BorderRadius.md,paddingHorizontal:10,paddingVertical:8}, btnText:{fontSize:FontSize.xs,fontWeight:'700',color:Colors.text}, btnWarn:{backgroundColor:'#FEE2E2',borderRadius:BorderRadius.md,paddingHorizontal:10,paddingVertical:8}, btnWarnText:{fontSize:FontSize.xs,fontWeight:'700',color:Colors.error}
});