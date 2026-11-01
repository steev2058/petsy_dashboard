import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';
import { useStore } from '../../src/store/useStore';

export default function AdminAnalytics() {
  const router = useRouter();
  const token = useStore((s) => s.token);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const base = process.env.EXPO_PUBLIC_BACKEND_URL || window.location.origin;
        const res = await fetch(`${base}/api/analytics/overview`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setData(await res.json());
      } finally { setLoading(false); }
    })();
  }, [token]);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-forward" size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>قياس التحويل — سوريا</Text>
        <View style={{width:22}} />
      </View>
      {loading ? <ActivityIndicator style={{marginTop:40}} color={Colors.primary} /> : (
        <ScrollView contentContainerStyle={{padding:16}}>
          {[
            ['مستخدمون', data?.users],
            ['حيوانات/تبنّي', data?.pets],
            ['طلبات سوق', data?.orders],
            ['حجوزات', data?.appointments],
            ['منشورات مجتمع', data?.community_posts],
          ].map(([l,v]) => (
            <View key={String(l)} style={styles.card}>
              <Text style={styles.val}>{v ?? 0}</Text>
              <Text style={styles.label}>{l}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.background},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:16,backgroundColor:Colors.surface,borderBottomWidth:1,borderBottomColor:Colors.border},
  title:{fontSize:FontSize.lg,fontWeight:'800',color:Colors.text},
  card:{backgroundColor:Colors.surface,borderRadius:BorderRadius.md,padding:16,marginBottom:10,borderWidth:1,borderColor:Colors.border,flexDirection:'row-reverse',justifyContent:'space-between'},
  val:{fontSize:24,fontWeight:'800',color:Colors.primary},
  label:{fontSize:FontSize.md,color:Colors.text,fontWeight:'600',alignSelf:'center'},
});
