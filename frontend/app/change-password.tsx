import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../src/constants/theme';
import { authAPI } from '../src/services/api';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!current || !next) return Alert.alert('Missing', 'Please fill all fields');
    if (next !== confirm) return Alert.alert('Mismatch', 'New password confirmation does not match');
    setSaving(true);
    try {
      await authAPI.changePassword({ current_password: current, new_password: next });
      Alert.alert('Success', 'Password changed successfully', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={Colors.text} /></TouchableOpacity><Text style={styles.title}>Change Password</Text><View style={{width:22}}/></View>
      <View style={styles.content}>
        <TextInput style={styles.input} secureTextEntry placeholder="Current password" value={current} onChangeText={setCurrent} />
        <TextInput style={styles.input} secureTextEntry placeholder="New password" value={next} onChangeText={setNext} />
        <TextInput style={styles.input} secureTextEntry placeholder="Confirm new password" value={confirm} onChangeText={setConfirm} />
        <TouchableOpacity style={styles.btn} onPress={onSave} disabled={saving}><Text style={styles.btnText}>{saving ? 'Saving...' : 'Save Password'}</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ container:{flex:1,backgroundColor:'#F8F9FA'}, header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:Spacing.md,backgroundColor:Colors.white}, title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text}, content:{padding:Spacing.md,gap:Spacing.md}, input:{backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md,borderWidth:1,borderColor:Colors.border}, btn:{backgroundColor:Colors.primary,padding:Spacing.md,borderRadius:BorderRadius.lg,alignItems:'center'}, btnText:{color:Colors.white,fontWeight:'700'} });