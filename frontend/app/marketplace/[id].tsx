import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { communityAPI, conversationsAPI, marketplaceAPI } from '../../src/services/api';
import { useTranslation } from '../../src/hooks/useTranslation';

export default function MarketplaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { language, isRTL } = useTranslation();
  const L = {
    listing: language === 'ar' ? 'الإعلان' : 'Listing',
    notFound: language === 'ar' ? 'الإعلان غير موجود' : 'Listing not found',
    chatSeller: language === 'ar' ? 'محادثة البائع' : 'Chat Seller',
    report: language === 'ar' ? 'إبلاغ' : 'Report',
    block: language === 'ar' ? 'حظر' : 'Block',
    error: language === 'ar' ? 'خطأ' : 'Error',
    chatErr: language === 'ar' ? 'تعذر فتح المحادثة' : 'Could not open chat',
    reported: language === 'ar' ? 'تم الإبلاغ' : 'Reported',
    reportSent: language === 'ar' ? 'تم إرسال بلاغ الإعلان' : 'Listing report submitted',
    blocked: language === 'ar' ? 'تم الحظر' : 'Blocked',
    blockedMsg: language === 'ar' ? 'تم حظر البائع' : 'Seller blocked',
    category: language === 'ar' ? 'الفئة' : 'Category',
    location: language === 'ar' ? 'الموقع' : 'Location',
    species: (s?: string) => {
      if (language !== 'ar') return s || '';
      return s === 'pets' ? 'حيوانات' : s === 'accessories' ? 'إكسسوارات' : s === 'services' ? 'خدمات' : s || '';
    },
  };
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await marketplaceAPI.getById(id as string);
        setItem(res.data);
      } finally { setLoading(false); }
    };
    load();
  }, [id]);

  const contactSeller = async () => {
    try {
      const conv = await conversationsAPI.create({
        other_user_id: item.user_id,
        initial_message: language === 'ar' ? `مرحبًا، أنا مهتم بإعلانك في السوق: ${item.title}` : `Hi, I'm interested in your marketplace listing: ${item.title}`,
      });
      router.push(`/chat/${conv.data.id}`);
    } catch {
      Alert.alert(L.error, L.chatErr);
    }
  };

  const report = async () => {
    await marketplaceAPI.report(item.id, 'inappropriate');
    Alert.alert(L.reported, L.reportSent);
  };

  const block = async () => {
    await communityAPI.blockUser(item.user_id);
    Alert.alert(L.blocked, L.blockedMsg);
    router.replace('/marketplace');
  };

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;
  if (!item) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><Text style={isRTL && styles.rtlText}>{L.notFound}</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity><Text style={[styles.title, isRTL && styles.rtlText]}>{L.listing}</Text><View style={{ width: 40 }} /></View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {item.image ? <Image source={{ uri: item.image }} style={styles.img} /> : <View style={styles.imgPh}><Ionicons name='image' size={24} color={Colors.textLight} /></View>}
        <View style={[styles.box, Shadow.small]}>
          <Text style={[styles.name, isRTL && styles.rtlText]}>{item.title}</Text>
          <Text style={[styles.price, isRTL && styles.rtlText]}>${Number(item.price || 0).toFixed(2)}</Text>
          <Text style={[styles.meta, isRTL && styles.rtlText]}>{L.category}: {L.species(item.category)} • {L.location}: {item.location}</Text>
          <Text style={[styles.desc, isRTL && styles.rtlText]}>{item.description}</Text>
        </View>
      </ScrollView>
      <View style={[styles.bottom, Shadow.large]}>
        <TouchableOpacity style={styles.btn} onPress={contactSeller}><Ionicons name='chatbubbles' size={18} color={Colors.primary} /><Text style={[styles.btnText, isRTL && styles.rtlText]}>{L.chatSeller}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={report}><Ionicons name='flag' size={18} color={Colors.error} /><Text style={[styles.btnText, isRTL && styles.rtlText]}>{L.report}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={block}><Ionicons name='ban' size={18} color={Colors.textSecondary} /><Text style={[styles.btnText, isRTL && styles.rtlText]}>{L.block}</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'},center:{flex:1,justifyContent:'center',alignItems:'center'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white},iconBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'},title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},
  img:{width:'100%',height:250,backgroundColor:Colors.backgroundDark},imgPh:{width:'100%',height:250,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'},
  box:{margin:Spacing.md,backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md},name:{fontSize:FontSize.lg,fontWeight:'700',color:Colors.text},price:{fontSize:FontSize.xl,fontWeight:'800',color:Colors.primary,marginTop:4},meta:{fontSize:FontSize.sm,color:Colors.textSecondary,marginTop:4,textTransform:'capitalize'},desc:{fontSize:FontSize.sm,color:Colors.text,marginTop:8,lineHeight:20},
  bottom:{position:'absolute',left:0,right:0,bottom:0,backgroundColor:Colors.white,padding:Spacing.md,flexDirection:'row',justifyContent:'space-between'},btn:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:Colors.backgroundDark,paddingVertical:10,paddingHorizontal:10,borderRadius:BorderRadius.md},btnText:{fontSize:FontSize.xs,color:Colors.text,fontWeight:'600'},
  rtlText:{textAlign:'right'}
});