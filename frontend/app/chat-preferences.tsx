import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../src/constants/theme';
import { settingsAPI } from '../src/services/api';

export default function ChatPreferencesScreen() {
  const router = useRouter();
  const [sound, setSound] = useState(true);
  const [preview, setPreview] = useState(true);
  useEffect(()=>{(async()=>{try{const r=await settingsAPI.get(); setSound(!!r.data.chat_sound); setPreview(!!r.data.chat_preview);}catch{}})();},[]);
  const save=async(p:any)=>{try{await settingsAPI.update(p);}catch{Alert.alert('Error','Failed to save');}};
  return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.header}><TouchableOpacity onPress={()=>router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text}/></TouchableOpacity><Text style={styles.title}>Chat Preferences</Text><View style={{width:22}}/></View><View style={styles.card}><View style={styles.row}><Text style={styles.label}>Message sound</Text><Switch value={sound} onValueChange={(v)=>{setSound(v);save({chat_sound:v});}}/></View><View style={styles.row}><Text style={styles.label}>Show message preview</Text><Switch value={preview} onValueChange={(v)=>{setPreview(v);save({chat_preview:v});}}/></View></View></SafeAreaView>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F8F9FA'},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:Spacing.md,backgroundColor:Colors.white},title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},card:{margin:Spacing.md,backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md,gap:Spacing.md},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},label:{fontSize:FontSize.md,color:Colors.text,fontWeight:'600'}});