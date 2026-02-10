import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { roleRequestAPI } from '../src/services/api';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';

const ROLES = ['vet', 'market_owner', 'care_clinic'] as const;

export default function RoleRequestScreen() {
  const router = useRouter();
  const [targetRole, setTargetRole] = useState<typeof ROLES[number]>('vet');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{visible:boolean;message:string;type:'success'|'error'}>({visible:false,message:'',type:'success'});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success'|'error'='success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, message, type });
    timerRef.current = setTimeout(() => setToast((p)=>({ ...p, visible:false })), 2000);
  };

  const submit = async () => {
    if (!reason.trim()) {
      showToast('Please enter your reason', 'error');
      return;
    }
    setSaving(true);
    try {
      await roleRequestAPI.create(targetRole, reason.trim());
      showToast('Role request submitted', 'success');
      setTimeout(() => router.back(), 700);
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to submit request', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {toast.visible && <View style={[styles.toast, toast.type === 'success' ? styles.ok : styles.err]}><Ionicons name={toast.type==='success'?'checkmark-circle':'alert-circle'} size={16} color={Colors.white}/><Text style={styles.toastText}>{toast.message}</Text></View>}
      <View style={styles.header}><TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity><Text style={styles.title}>Request Role</Text><View style={{ width: 40 }} /></View>
      <View style={styles.content}>
        <Text style={styles.label}>Target Role</Text>
        <View style={styles.row}>
          {ROLES.map((r) => (
            <TouchableOpacity key={r} style={[styles.roleChip, targetRole === r && styles.roleChipActive]} onPress={() => setTargetRole(r)}>
              <Text style={[styles.roleChipText, targetRole === r && styles.roleChipTextActive]}>{r.replace('_',' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { marginTop: 12 }]}>Reason</Text>
        <TextInput
          style={styles.input}
          placeholder='Why should this role be approved?'
          multiline
          value={reason}
          onChangeText={setReason}
        />
        <TouchableOpacity style={styles.submit} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator size='small' color={Colors.white} /> : <Text style={styles.submitText}>Submit Request</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'}, header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white}, backBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'}, title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},
  content:{padding:Spacing.md}, label:{fontSize:FontSize.sm,color:Colors.textSecondary,fontWeight:'600',marginBottom:8}, row:{flexDirection:'row',flexWrap:'wrap',gap:8}, roleChip:{paddingHorizontal:12,paddingVertical:8,borderRadius:BorderRadius.full,backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border}, roleChipActive:{backgroundColor:Colors.primary,borderColor:Colors.primary}, roleChipText:{color:Colors.textSecondary,fontWeight:'600',textTransform:'capitalize'}, roleChipTextActive:{color:Colors.white},
  input:{minHeight:130,backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border,borderRadius:BorderRadius.lg,padding:Spacing.md,textAlignVertical:'top',color:Colors.text},
  submit:{marginTop:12,backgroundColor:Colors.primary,borderRadius:BorderRadius.lg,paddingVertical:14,alignItems:'center'}, submitText:{color:Colors.white,fontSize:FontSize.md,fontWeight:'700'},
  toast:{position:'absolute',top:16,left:16,right:16,zIndex:100,borderRadius:BorderRadius.md,paddingVertical:10,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8,...Shadow.small}, ok:{backgroundColor:Colors.success}, err:{backgroundColor:Colors.error}, toastText:{color:Colors.white,fontWeight:'600',fontSize:FontSize.sm,flex:1}
});