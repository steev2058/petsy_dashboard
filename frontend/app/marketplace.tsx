import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Image, RefreshControl, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { communityAPI, conversationsAPI, marketplaceAPI } from '../src/services/api';

const CATS = ['all', 'pets', 'accessories', 'services'];

export default function MarketplaceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await marketplaceAPI.getAll({ category: cat, q: q || undefined });
      setItems(res.data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cat, q]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  const contactSeller = async (item: any) => {
    try {
      const conv = await conversationsAPI.create({
        other_user_id: item.user_id,
        initial_message: `Hi, I'm interested in your marketplace listing: ${item.title}`,
      });
      router.push(`/chat/${conv.data.id}`);
    } catch {
      Alert.alert('Error', 'Could not open chat with seller');
    }
  };

  const reportListing = async (id: string) => {
    try {
      await marketplaceAPI.report(id, 'inappropriate');
      Alert.alert('Reported', 'Listing report submitted');
    } catch {
      Alert.alert('Error', 'Failed to report listing');
    }
  };

  const blockSeller = async (userId: string) => {
    try {
      await communityAPI.blockUser(userId);
      Alert.alert('Blocked', 'Seller blocked. Their listings will be hidden.');
      load();
    } catch {
      Alert.alert('Error', 'Failed to block seller');
    }
  };

  const list = useMemo(() => items, [items]);

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Marketplace</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/my-marketplace-listings')} style={styles.iconBtn}><Ionicons name='list' size={20} color={Colors.primary} /></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/create-marketplace-listing')} style={[styles.iconBtn, styles.addBtn]}><Ionicons name='add' size={22} color={Colors.white} /></TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name='search' size={18} color={Colors.textLight} />
        <TextInput value={q} onChangeText={setQ} placeholder='Search listings...' style={styles.searchInput} onSubmitEditing={load} />
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListHeaderComponent={(
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {CATS.map((item) => (
              <TouchableOpacity key={item} onPress={() => setCat(item)} style={[styles.chip, cat === item && styles.chipActive]}>
                <Text style={[styles.chipText, cat === item && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        renderItem={({ item }) => (
          <View style={[styles.card, Shadow.small]}>
            <TouchableOpacity onPress={() => router.push(`/marketplace/${item.id}`)}>
              {item.image ? <Image source={{ uri: item.image }} style={styles.img} /> : <View style={styles.imgPh}><Ionicons name='image' size={20} color={Colors.textLight} /></View>}
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.meta}>${Number(item.price || 0).toFixed(2)} • {item.location}</Text>
              <Text numberOfLines={2} style={styles.desc}>{item.description}</Text>
            </TouchableOpacity>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => contactSeller(item)}><Ionicons name='chatbubbles' size={16} color={Colors.primary} /><Text style={styles.actionText}>Chat</Text></TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => reportListing(item.id)}><Ionicons name='flag' size={16} color={Colors.error} /><Text style={styles.actionText}>Report</Text></TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => blockSeller(item.user_id)}><Ionicons name='ban' size={16} color={Colors.textSecondary} /><Text style={styles.actionText}>Block</Text></TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.center}><Text style={styles.empty}>No listings yet</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'}, center:{flex:1,justifyContent:'center',alignItems:'center'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white},
  iconBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'},
  addBtn:{backgroundColor:Colors.primary}, headerActions:{flexDirection:'row',gap:8}, title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},
  searchWrap:{margin:Spacing.md,marginBottom:Spacing.sm,backgroundColor:Colors.white,borderRadius:BorderRadius.lg,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:Colors.border},
  searchInput:{flex:1,color:Colors.text}, chipsRow:{paddingHorizontal:Spacing.md,gap:8,paddingBottom:Spacing.sm}, chip:{paddingHorizontal:14,paddingVertical:8,borderRadius:BorderRadius.full,backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border}, chipActive:{backgroundColor:Colors.primary,borderColor:Colors.primary}, chipText:{textTransform:'capitalize',color:Colors.textSecondary,fontWeight:'600'}, chipTextActive:{color:Colors.white},
  list:{paddingHorizontal:Spacing.md,paddingTop:4,paddingBottom:110}, card:{backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.sm,marginBottom:Spacing.sm}, img:{width:'100%',height:160,borderRadius:BorderRadius.md,backgroundColor:Colors.backgroundDark}, imgPh:{width:'100%',height:160,borderRadius:BorderRadius.md,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'}, itemTitle:{marginTop:8,fontSize:FontSize.md,fontWeight:'700',color:Colors.text}, meta:{marginTop:4,color:Colors.textSecondary,fontSize:FontSize.sm}, desc:{marginTop:4,color:Colors.textSecondary,fontSize:FontSize.sm}, actions:{marginTop:10,flexDirection:'row',justifyContent:'space-between'}, actionBtn:{flexDirection:'row',alignItems:'center',gap:5,paddingVertical:6,paddingHorizontal:8,borderRadius:BorderRadius.md,backgroundColor:Colors.backgroundDark}, actionText:{fontSize:FontSize.xs,color:Colors.text}, empty:{color:Colors.textSecondary}
});