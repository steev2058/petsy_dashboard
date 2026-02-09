import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../src/constants/theme';
import { settingsAPI } from '../src/services/api';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const [location, setLocation] = useState(true);
  const [email, setEmail] = useState(true);

  useEffect(() => { (async () => { try { const r = await settingsAPI.get(); setLocation(!!r.data.location_services); setEmail(!!r.data.email_updates);} catch {} })(); }, []);
  const save = async (patch:any) => { try { await settingsAPI.update(patch); } catch { Alert.alert('Error','Failed to save'); } };

  return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text}/></TouchableOpacity><Text style={styles.title}>Privacy Settings</Text><View style={{width:22}}/></View><View style={styles.card}><View style={styles.row}><Text style={styles.label}>Location Services</Text><Switch value={location} onValueChange={(v)=>{setLocation(v);save({location_services:v});}}/></View><View style={styles.row}><Text style={styles.label}>Email Updates</Text><Switch value={email} onValueChange={(v)=>{setEmail(v);save({email_updates:v});}}/></View></View></SafeAreaView>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F8F9FA'},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:Spacing.md,backgroundColor:Colors.white},title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},card:{margin:Spacing.md,backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md,gap:Spacing.md},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},label:{fontSize:FontSize.md,color:Colors.text,fontWeight:'600'}});