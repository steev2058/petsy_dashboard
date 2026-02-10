import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { communityAPI, conversationsAPI, marketplaceAPI } from '../../src/services/api';

export default function MarketplaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
        initial_message: `Hi, I'm interested in your marketplace listing: ${item.title}`,
      });
      router.push(`/chat/${conv.data.id}`);
    } catch {
      Alert.alert('Error', 'Could not open chat');
    }
  };

  const report = async () => {
    await marketplaceAPI.report(item.id, 'inappropriate');
    Alert.alert('Reported', 'Listing report submitted');
  };

  const block = async () => {
    await communityAPI.blockUser(item.user_id);
    Alert.alert('Blocked', 'Seller blocked');
    router.replace('/marketplace');
  };

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;
  if (!item) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><Text>Listing not found</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity><Text style={styles.title}>Listing</Text><View style={{ width: 40 }} /></View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {item.image ? <Image source={{ uri: item.image }} style={styles.img} /> : <View style={styles.imgPh}><Ionicons name='image' size={24} color={Colors.textLight} /></View>}
        <View style={[styles.box, Shadow.small]}>
          <Text style={styles.name}>{item.title}</Text>
          <Text style={styles.price}>${Number(item.price || 0).toFixed(2)}</Text>
          <Text style={styles.meta}>{item.category} • {item.location}</Text>
          <Text style={styles.desc}>{item.description}</Text>
        </View>
      </ScrollView>
      <View style={[styles.bottom, Shadow.large]}>
        <TouchableOpacity style={styles.btn} onPress={contactSeller}><Ionicons name='chatbubbles' size={18} color={Colors.primary} /><Text style={styles.btnText}>Chat Seller</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={report}><Ionicons name='flag' size={18} color={Colors.error} /><Text style={styles.btnText}>Report</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={block}><Ionicons name='ban' size={18} color={Colors.textSecondary} /><Text style={styles.btnText}>Block</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'},center:{flex:1,justifyContent:'center',alignItems:'center'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white},iconBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'},title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},
  img:{width:'100%',height:250,backgroundColor:Colors.backgroundDark},imgPh:{width:'100%',height:250,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'},
  box:{margin:Spacing.md,backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md},name:{fontSize:FontSize.lg,fontWeight:'700',color:Colors.text},price:{fontSize:FontSize.xl,fontWeight:'800',color:Colors.primary,marginTop:4},meta:{fontSize:FontSize.sm,color:Colors.textSecondary,marginTop:4,textTransform:'capitalize'},desc:{fontSize:FontSize.sm,color:Colors.text,marginTop:8,lineHeight:20},
  bottom:{position:'absolute',left:0,right:0,bottom:0,backgroundColor:Colors.white,padding:Spacing.md,flexDirection:'row',justifyContent:'space-between'},btn:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:Colors.backgroundDark,paddingVertical:10,paddingHorizontal:10,borderRadius:BorderRadius.md},btnText:{fontSize:FontSize.xs,color:Colors.text,fontWeight:'600'}
});