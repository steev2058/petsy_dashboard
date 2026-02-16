import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminVetProfilesAPI, adminAPI } from '../../src/services/api';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';

const TABS = ['pending_verification','active','rejected','suspended'];

export default function AdminVetProfilesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('pending_verification');
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');

  const load = async () => {
    try {
      const res = await adminVetProfilesAPI.getAll({ status, q: q.trim() || undefined, city: city.trim() || undefined });
      setRows(res.data || []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const action = async (id: string, act: any, payload?: any) => {
    await adminVetProfilesAPI.action(id, { action: act, ...(payload || {}) });
    await load();
  };

  const reject = async (id: string) => {
    const promptFn: any = (globalThis as any).prompt;
    const notes = typeof promptFn === 'function' ? (promptFn('Rejection notes required') || '') : 'Rejected by admin';
    if (!String(notes).trim()) return Alert.alert('Notes required');
    await action(id, 'reject', { verification_notes: String(notes).trim() });
  };

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.center}><ActivityIndicator color={Colors.primary} /></View></SafeAreaView>;

  return <SafeAreaView style={styles.container} edges={['top']}>
    <View style={styles.header}><TouchableOpacity style={styles.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={Colors.text} /></TouchableOpacity><Text style={styles.title}>Vet Profiles Queue</Text><View style={{ width: 40 }} /></View>
    <View style={styles.search}><TextInput value={q} onChangeText={setQ} placeholder='q' style={styles.input}/><TextInput value={city} onChangeText={setCity} placeholder='city' style={styles.input}/><TouchableOpacity style={styles.go} onPress={load}><Text style={styles.goT}>Go</Text></TouchableOpacity></View>
    <View style={styles.tabs}>{TABS.map(t => <TouchableOpacity key={t} style={[styles.tab, status===t && styles.tabA]} onPress={() => setStatus(t)}><Text style={[styles.tabT, status===t && styles.tabTA]}>{t.replace('_',' ')}</Text></TouchableOpacity>)}</View>
    <FlatList data={rows} keyExtractor={(i)=>i.id} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }} renderItem={({ item }) => (
      <View style={styles.card}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>{item.user?.email} • {item.city} • {item.specialty}</Text>
        <Text style={styles.meta}>submitted/updated: {item.updated_at ? new Date(item.updated_at).toLocaleString() : '-'}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={() => action(item.id,'approve')}><Text style={styles.btnT}>Approve</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnD} onPress={() => reject(item.id)}><Text style={styles.btnDT}>Reject</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnW} onPress={() => action(item.id,'suspend')}><Text style={styles.btnWT}>Suspend</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnW} onPress={() => action(item.id,'set_public',{ is_public: !item.is_public })}><Text style={styles.btnWT}>{item.is_public ? 'Unpublic' : 'Public'}</Text></TouchableOpacity>
        </View>
        <View style={styles.row}>
          <TouchableOpacity style={styles.link} onPress={() => router.push('/admin/users' as any)}><Text style={styles.linkT}>Open user profile</Text></TouchableOpacity>
          <TouchableOpacity style={styles.link} onPress={async () => { if (item.user?.id) { if (item.user?.is_blocked_by_admin) await adminAPI.unblockUser(item.user.id); else await adminAPI.blockUser(item.user.id); await load(); } }}><Text style={styles.linkT}>{item.user?.is_blocked_by_admin ? 'Unblock account' : 'Block account'}</Text></TouchableOpacity>
        </View>
      </View>
    )} />
  </SafeAreaView>
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F8F9FA' }, center:{ flex:1, justifyContent:'center', alignItems:'center' },
  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:Colors.white, paddingHorizontal:Spacing.md, paddingVertical:Spacing.sm },
  back:{ width:40, height:40, borderRadius:12, backgroundColor:Colors.backgroundDark, justifyContent:'center', alignItems:'center' }, title:{ fontSize:FontSize.xl, fontWeight:'700' },
  search:{ flexDirection:'row', gap:8, padding:Spacing.md }, input:{ flex:1, backgroundColor:Colors.white, borderRadius:12, borderWidth:1, borderColor:Colors.border, paddingHorizontal:10, paddingVertical:8 }, go:{ backgroundColor:Colors.primary, borderRadius:12, paddingHorizontal:12, justifyContent:'center' }, goT:{ color:Colors.white, fontWeight:'700' },
  tabs:{ flexDirection:'row', gap:6, paddingHorizontal:Spacing.md, marginBottom:6, flexWrap:'wrap' }, tab:{ backgroundColor:Colors.backgroundDark, borderRadius:999, paddingHorizontal:10, paddingVertical:6 }, tabA:{ backgroundColor:Colors.primary }, tabT:{ color:Colors.textSecondary }, tabTA:{ color:Colors.white },
  card:{ backgroundColor:Colors.white, borderRadius:12, padding:12, marginBottom:10 }, name:{ fontWeight:'700', color:Colors.text }, meta:{ color:Colors.textSecondary, marginTop:2, fontSize:12 }, row:{ flexDirection:'row', gap:8, marginTop:8, flexWrap:'wrap' },
  btn:{ backgroundColor:Colors.success, borderRadius:8, paddingHorizontal:10, paddingVertical:6 }, btnT:{ color:Colors.white, fontWeight:'700' },
  btnD:{ backgroundColor:'#FEE2E2', borderRadius:8, paddingHorizontal:10, paddingVertical:6 }, btnDT:{ color:Colors.error, fontWeight:'700' },
  btnW:{ backgroundColor:'#E5E7EB', borderRadius:8, paddingHorizontal:10, paddingVertical:6 }, btnWT:{ color:Colors.text, fontWeight:'700' },
  link:{ backgroundColor:Colors.primary+'22', borderRadius:8, paddingHorizontal:10, paddingVertical:6 }, linkT:{ color:Colors.primary, fontWeight:'700' },
});