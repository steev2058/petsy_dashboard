import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../src/constants/theme';
import { authAPI } from '../src/services/api';
import { useStore } from '../src/store/useStore';

export default function DeleteAccountScreen(){
  const router=useRouter();
  const { logout } = useStore();
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const onDelete=()=>Alert.alert('Delete Account','This action cannot be undone.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{setLoading(true);try{await authAPI.deleteAccount(password);await logout();router.replace('/(auth)/login');}catch(e:any){Alert.alert('Error',e?.response?.data?.detail||'Failed to delete account');}finally{setLoading(false);}}}]);
  return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.header}><TouchableOpacity onPress={()=>router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text}/></TouchableOpacity><Text style={styles.title}>Delete Account</Text><View style={{width:22}}/></View><View style={styles.content}><Text style={styles.warn}>Enter your password to confirm account deletion.</Text><TextInput secureTextEntry style={styles.input} placeholder='Password' value={password} onChangeText={setPassword}/><TouchableOpacity style={styles.btn} onPress={onDelete} disabled={loading}><Text style={styles.btnText}>{loading?'Deleting...':'Delete Account'}</Text></TouchableOpacity></View></SafeAreaView>
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F8F9FA'},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:Spacing.md,backgroundColor:Colors.white},title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},content:{padding:Spacing.md,gap:Spacing.md},warn:{color:Colors.error,fontSize:FontSize.md},input:{backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border,borderRadius:BorderRadius.lg,padding:Spacing.md},btn:{backgroundColor:Colors.error,padding:Spacing.md,borderRadius:BorderRadius.lg,alignItems:'center'},btnText:{color:Colors.white,fontWeight:'700'}});