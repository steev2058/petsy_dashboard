import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert, Platform } from 'react-native';
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

  const onDelete = (id: string) => {
    const performDelete = async () => {
      try {
        await marketplaceAPI.remove(id);
        await load();
      } catch {
        Alert.alert('Error', 'Failed to delete listing');
      }
    };

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' ? window.confirm('Delete this listing?') : false;
      if (ok) performDelete();
      return;
    }

    Alert.alert('Delete listing', 'Are you sure you want to delete this listing?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: performDelete }
    ]);
  };

  const onMarkSold = async (id: string) => {
    try {
      await marketplaceAPI.setStatus(id, 'sold');
      await load();
    } catch {
      Alert.alert('Error', 'Failed to update listing status');
    }
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
          <View style={[styles.card, Shadow.small]}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push(`/marketplace/${item.id}`)}>
              <View style={styles.thumbWrap}>
                {item.image ? <Image source={{ uri: item.image }} style={styles.img} /> : <View style={styles.imgPh}><Ionicons name='image' size={20} color={Colors.textLight} /></View>}
                {item.status === 'sold' && (
                  <View style={styles.soldBadge}><Text style={styles.soldBadgeText}>SOLD</Text></View>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={styles.name}>{item.title}</Text>
                <Text style={styles.meta}>${Number(item.price || 0).toFixed(2)} • {item.location}</Text>
                <Text style={styles.meta}>Status: {item.status || 'active'}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/create-marketplace-listing?editId=${item.id}`)}><Text style={styles.actionText}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onMarkSold(item.id)}><Text style={styles.actionText}>Mark Sold</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => onDelete(item.id)}><Text style={[styles.actionText, styles.deleteText]}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.center}><Text style={styles.empty}>No listings yet</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'}, center:{flex:1,justifyContent:'center',alignItems:'center'}, header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white}, iconBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'}, title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text}, list:{padding:Spacing.md,paddingBottom:110}, card:{backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md,marginBottom:Spacing.sm}, thumbWrap:{position:'relative'}, img:{width:70,height:70,borderRadius:BorderRadius.md}, imgPh:{width:70,height:70,borderRadius:BorderRadius.md,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'}, soldBadge:{position:'absolute',top:-6,right:-6,backgroundColor:'#16A34A',paddingHorizontal:8,paddingVertical:3,borderRadius:BorderRadius.full}, soldBadgeText:{color:Colors.white,fontSize:10,fontWeight:'800'}, name:{fontSize:FontSize.md,fontWeight:'700',color:Colors.text}, meta:{fontSize:FontSize.sm,color:Colors.textSecondary,marginTop:2}, actionsRow:{marginTop:10,flexDirection:'row',gap:8}, actionBtn:{paddingHorizontal:10,paddingVertical:7,borderRadius:BorderRadius.md,backgroundColor:Colors.backgroundDark}, actionText:{fontSize:FontSize.xs,fontWeight:'700',color:Colors.text}, deleteBtn:{backgroundColor:'#FEE2E2'}, deleteText:{color:Colors.error}, empty:{color:Colors.textSecondary}
});