import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { petsAPI, sponsorshipAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

export default function MySponsorshipsScreen() {
  const router = useRouter();
  const { language, isRTL } = useTranslation();
  const L = {
    title: language === 'ar' ? 'كفالاتي' : 'My Sponsorships',
    totalSponsored: language === 'ar' ? 'إجمالي الكفالة' : 'Total Sponsored',
    sponsorships: language === 'ar' ? 'كفالات' : 'sponsorships',
    pet: language === 'ar' ? 'حيوان' : 'Pet',
    unknown: language === 'ar' ? 'غير معروف' : 'unknown',
    mixed: language === 'ar' ? 'مختلط' : 'Mixed',
    amount: language === 'ar' ? 'المبلغ' : 'Amount',
    status: language === 'ar' ? 'الحالة' : 'Status',
    pending: language === 'ar' ? 'قيد الانتظار' : 'pending',
    empty: language === 'ar' ? 'ليس لديك كفالات بعد' : 'You have no sponsorships yet',
  };
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await sponsorshipAPI.getMy();
      const sponsorships = res.data || [];
      const petIds = Array.from(new Set(sponsorships.map((s: any) => s.pet_id).filter(Boolean)));
      const petEntries = await Promise.all(
        petIds.map(async (id) => {
          try {
            const p = await petsAPI.getById(id);
            return [id, p.data] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      const petMap = Object.fromEntries(petEntries);

      setRows(sponsorships.map((s: any) => ({ ...s, pet: petMap[s.pet_id] })));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  const total = rows.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.rtlText]}>{L.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.summary, Shadow.small]}>
        <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>{L.totalSponsored}</Text>
        <Text style={styles.summaryValue}>${total.toFixed(2)}</Text>
        <Text style={[styles.summarySub, isRTL && styles.rtlText]}>{rows.length} {L.sponsorships}</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, Shadow.small]} onPress={() => item.pet?.id && router.push(`/pet/${item.pet.id}`)}>
            {item.pet?.image ? <Image source={{ uri: item.pet.image }} style={styles.img} /> : <View style={styles.imgPh}><Ionicons name='paw' size={20} color={Colors.textLight} /></View>}
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={[styles.name, isRTL && styles.rtlText]}>{item.pet?.name || L.pet}</Text>
              <Text style={[styles.meta, isRTL && styles.rtlText]}>{item.pet?.species || L.unknown} • {item.pet?.breed || L.mixed}</Text>
              <Text style={[styles.meta, isRTL && styles.rtlText]}>{L.amount}: ${Number(item.amount || 0).toFixed(2)}</Text>
              <Text style={[styles.meta, isRTL && styles.rtlText]}>{L.status}: {item.status || L.pending}</Text>
            </View>
            <Ionicons name='chevron-forward' size={18} color={Colors.textLight} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={styles.center}><Text style={[styles.empty, isRTL && styles.rtlText]}>{L.empty}</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'},
  center:{flex:1,justifyContent:'center',alignItems:'center'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white},
  backBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'},
  title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},
  summary:{margin:Spacing.md,backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md},
  summaryLabel:{fontSize:FontSize.sm,color:Colors.textSecondary},
  summaryValue:{fontSize:FontSize.xxl,fontWeight:'800',color:Colors.primary,marginTop:2},
  summarySub:{fontSize:FontSize.sm,color:Colors.textSecondary,marginTop:2},
  list:{paddingHorizontal:Spacing.md,paddingBottom:110},
  card:{flexDirection:'row',alignItems:'center',backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md,marginBottom:Spacing.sm},
  img:{width:62,height:62,borderRadius:BorderRadius.md},
  imgPh:{width:62,height:62,borderRadius:BorderRadius.md,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'},
  name:{fontSize:FontSize.md,fontWeight:'700',color:Colors.text},
  meta:{fontSize:FontSize.sm,color:Colors.textSecondary,marginTop:2},
  empty:{color:Colors.textSecondary},
  rtlText:{textAlign:'right'},
});