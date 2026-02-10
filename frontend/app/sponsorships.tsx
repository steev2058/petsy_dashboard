import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { petsAPI } from '../src/services/api';

export default function SponsorshipsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await petsAPI.getAll({ status: 'for_adoption' });
      setPets((res.data || []).slice(0, 50));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Sponsorship</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/my-sponsorships')} style={styles.historyBtn}><Ionicons name='list' size={20} color={Colors.primary} /></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/create-sponsorship-post')} style={styles.addBtn}><Ionicons name='add' size={22} color={Colors.white} /></TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={pets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, Shadow.small]} onPress={() => router.push(`/sponsor/${item.id}`)}>
            {item.image ? <Image source={{ uri: item.image }} style={styles.img} /> : <View style={styles.imgPh}><Ionicons name='paw' size={22} color={Colors.textLight} /></View>}
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.name}>{item.name || 'Pet'}</Text>
              <Text style={styles.meta}>{item.species} • {item.breed || 'Mixed'}</Text>
              <Text style={styles.meta}>Location: {item.location || 'N/A'}</Text>
            </View>
            <View style={styles.sponsorBtn}><Text style={styles.sponsorText}>Sponsor</Text></View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={styles.center}><Text style={{ color: Colors.textSecondary }}>No pets available for sponsorship</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'},
  center:{flex:1,justifyContent:'center',alignItems:'center'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white},
  backBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'},
  headerActions:{flexDirection:'row',alignItems:'center',gap:8},
  historyBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border,alignItems:'center',justifyContent:'center'},
  addBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center'},
  title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},
  list:{padding:Spacing.md,paddingBottom:100},
  card:{flexDirection:'row',alignItems:'center',backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md,marginBottom:Spacing.sm},
  img:{width:70,height:70,borderRadius:BorderRadius.md},
  imgPh:{width:70,height:70,borderRadius:BorderRadius.md,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'},
  name:{fontSize:FontSize.md,fontWeight:'700',color:Colors.text},
  meta:{fontSize:FontSize.sm,color:Colors.textSecondary,marginTop:2},
  sponsorBtn:{backgroundColor:Colors.primary,borderRadius:BorderRadius.full,paddingHorizontal:12,paddingVertical:7},
  sponsorText:{color:Colors.white,fontSize:FontSize.sm,fontWeight:'700'},
});