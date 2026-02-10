import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { careAPI } from '../src/services/api';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';

export default function VetCareRequestsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await careAPI.getVetQueue();
      setRows(res.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: 'accept'|'start'|'complete') => {
    try {
      await careAPI.updateVetRequest(id, { action });
      await load();
    } catch {
      Alert.alert('Error', 'Action failed');
    }
  };

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity><Text style={styles.title}>Vet Care Requests</Text><View style={{ width: 40 }} /></View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.primary]} />}
        renderItem={({ item }) => (
          <View style={[styles.card, Shadow.small]}>
            <Text style={styles.cardTitle}>{item.title || 'Care Request'}</Text>
            <Text style={styles.meta}>Status: {item.status || 'pending'}</Text>
            <Text style={styles.meta}>Location: {item.location || 'N/A'}</Text>
            <Text style={styles.desc}>{item.description || '-'}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.btn} onPress={() => act(item.id, 'accept')}><Text style={styles.btnText}>Accept</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btn} onPress={() => act(item.id, 'start')}><Text style={styles.btnText}>Start</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btn} onPress={() => act(item.id, 'complete')}><Text style={styles.btnText}>Complete</Text></TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.center}><Text style={styles.empty}>No care requests</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'}, center:{flex:1,justifyContent:'center',alignItems:'center'}, header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white}, iconBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,justifyContent:'center',alignItems:'center'}, title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text}, list:{padding:Spacing.md,paddingBottom:110}, card:{backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md,marginBottom:Spacing.sm}, cardTitle:{fontSize:FontSize.md,fontWeight:'700',color:Colors.text}, meta:{fontSize:FontSize.sm,color:Colors.textSecondary,marginTop:2}, desc:{fontSize:FontSize.sm,color:Colors.text,marginTop:6}, row:{marginTop:10,flexDirection:'row',gap:8}, btn:{backgroundColor:Colors.primary,borderRadius:BorderRadius.md,paddingHorizontal:10,paddingVertical:8}, btnText:{color:Colors.white,fontSize:FontSize.xs,fontWeight:'700'}, empty:{color:Colors.textSecondary}
});