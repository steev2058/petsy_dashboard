import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { marketplaceAPI } from '../src/services/api';

export default function MyMarketplaceListings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await marketplaceAPI.getMy();
      setRows(res.data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity><Text style={styles.title}>My Listings</Text><View style={{ width: 40 }} /></View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, Shadow.small]} onPress={() => router.push(`/marketplace/${item.id}`)}>
            {item.image ? <Image source={{ uri: item.image }} style={styles.img} /> : <View style={styles.imgPh}><Ionicons name='image' size={20} color={Colors.textLight} /></View>}
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.meta}>${Number(item.price || 0).toFixed(2)} • {item.location}</Text>
              <Text style={styles.meta}>Status: {item.status || 'active'}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={styles.center}><Text style={styles.empty}>No listings yet</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'}, center:{flex:1,justifyContent:'center',alignItems:'center'}, header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white}, iconBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'}, title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text}, list:{padding:Spacing.md,paddingBottom:110}, card:{flexDirection:'row',alignItems:'center',backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md,marginBottom:Spacing.sm}, img:{width:70,height:70,borderRadius:BorderRadius.md}, imgPh:{width:70,height:70,borderRadius:BorderRadius.md,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'}, name:{fontSize:FontSize.md,fontWeight:'700',color:Colors.text}, meta:{fontSize:FontSize.sm,color:Colors.textSecondary,marginTop:2}, empty:{color:Colors.textSecondary}
});