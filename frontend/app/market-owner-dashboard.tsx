import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { marketOwnerAPI } from '../src/services/api';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';

export default function MarketOwnerDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const res = await marketOwnerAPI.getOverview();
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity><Text style={styles.title}>Market Owner</Text><View style={{ width: 40 }} /></View>
      <View style={styles.statsRow}>
        <View style={[styles.stat, Shadow.small]}><Text style={styles.statVal}>{data?.total_listings || 0}</Text><Text style={styles.statLbl}>Total</Text></View>
        <View style={[styles.stat, Shadow.small]}><Text style={styles.statVal}>{data?.active_listings || 0}</Text><Text style={styles.statLbl}>Active</Text></View>
        <View style={[styles.stat, Shadow.small]}><Text style={styles.statVal}>{data?.sold_listings || 0}</Text><Text style={styles.statLbl}>Sold</Text></View>
      </View>
      <View style={[styles.revenue, Shadow.small]}><Text style={styles.revLabel}>Estimated Revenue</Text><Text style={styles.revValue}>${Number(data?.estimated_revenue || 0).toFixed(2)}</Text></View>
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/create-marketplace-listing')}><Ionicons name='add-circle' size={16} color={Colors.primary} /><Text style={styles.quickText}>New Listing</Text></TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/my-marketplace-listings')}><Ionicons name='list' size={16} color={Colors.primary} /><Text style={styles.quickText}>Manage Listings</Text></TouchableOpacity>
      </View>
      <FlatList
        data={data?.recent_listings || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, Shadow.small]} onPress={() => router.push(`/marketplace/${item.id}`)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>${Number(item.price || 0).toFixed(2)} • {item.location}</Text>
            <Text style={styles.meta}>Status: {item.status}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'}, center:{flex:1,justifyContent:'center',alignItems:'center'}, header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white}, iconBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,justifyContent:'center',alignItems:'center'}, title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},
  statsRow:{flexDirection:'row',gap:8,padding:Spacing.md}, stat:{flex:1,backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md,alignItems:'center'}, statVal:{fontSize:FontSize.xl,fontWeight:'800',color:Colors.primary}, statLbl:{fontSize:FontSize.sm,color:Colors.textSecondary},
  revenue:{marginHorizontal:Spacing.md,marginBottom:Spacing.sm,backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md}, revLabel:{fontSize:FontSize.sm,color:Colors.textSecondary}, revValue:{fontSize:FontSize.xxl,fontWeight:'800',color:Colors.success,marginTop:4},
  quickActions:{flexDirection:'row',gap:8,paddingHorizontal:Spacing.md,paddingBottom:Spacing.sm}, quickBtn:{flex:1,backgroundColor:Colors.white,borderRadius:BorderRadius.md,paddingVertical:10,paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6}, quickText:{fontSize:FontSize.sm,fontWeight:'700',color:Colors.text},
  list:{paddingHorizontal:Spacing.md,paddingBottom:110}, card:{backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md,marginBottom:Spacing.sm}, cardTitle:{fontSize:FontSize.md,fontWeight:'700',color:Colors.text}, meta:{fontSize:FontSize.sm,color:Colors.textSecondary,marginTop:4}
});