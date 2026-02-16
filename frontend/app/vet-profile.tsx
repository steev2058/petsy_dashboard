import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../src/constants/theme';
import { vetProfileAPI } from '../src/services/api';

const PET_TYPES = ['dogs', 'cats', 'birds', 'all'];

export default function VetProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState<any>({
    name: '', specialty: '', experience_years: '', phone: '', city: '', location_text: '', image_url: '', pet_types_supported: [],
  });

  const load = async () => {
    try {
      const res = await vetProfileAPI.getMe();
      setProfile(res.data);
      setForm({
        name: res.data?.name || '', specialty: res.data?.specialty || '', experience_years: String(res.data?.experience_years || ''),
        phone: res.data?.phone || '', city: res.data?.city || '', location_text: res.data?.location_text || '', image_url: res.data?.image_url || '',
        pet_types_supported: res.data?.pet_types_supported || [],
      });
    } catch {
      Alert.alert('Error', 'Failed to load vet profile');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const minValid = useMemo(() => {
    return !!(form.name?.trim() && form.specialty?.trim() && Number(form.experience_years || 0) >= 0 && form.phone?.trim() && form.city?.trim() && (form.pet_types_supported || []).length > 0);
  }, [form]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, experience_years: Number(form.experience_years || 0) };
      const res = await vetProfileAPI.updateMe(payload);
      setProfile(res.data);
      Alert.alert('Saved', 'Draft saved');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to save');
    } finally { setSaving(false); }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await save();
      const res = await vetProfileAPI.submit();
      setProfile(res.data);
      Alert.alert('Submitted', 'Profile submitted for verification');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  const status = profile?.status || 'draft';

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.center}><ActivityIndicator color={Colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Vet Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }}>
        <View style={styles.banner}><Text style={styles.bannerText}>Status: {status.replace('_', ' ')}</Text>{status === 'rejected' && !!profile?.verification_notes && <Text style={styles.note}>Notes: {profile.verification_notes}</Text>}</View>

        {['name','specialty','experience_years','phone','city','location_text','image_url'].map((k) => (
          <View key={k} style={{ marginBottom: 10 }}>
            <Text style={styles.label}>{k}</Text>
            <TextInput
              value={form[k]}
              onChangeText={(t) => setForm((p:any) => ({ ...p, [k]: t }))}
              style={styles.input}
              keyboardType={k === 'experience_years' ? 'number-pad' : 'default'}
            />
          </View>
        ))}

        <Text style={styles.label}>pet_types_supported</Text>
        <View style={styles.row}>{PET_TYPES.map((pt) => {
          const active = (form.pet_types_supported || []).includes(pt);
          return <TouchableOpacity key={pt} style={[styles.chip, active && styles.chipA]} onPress={() => setForm((p:any)=>({ ...p, pet_types_supported: active ? p.pet_types_supported.filter((x:string)=>x!==pt) : [...p.pet_types_supported, pt] }))}><Text style={[styles.chipT, active && styles.chipTA]}>{pt}</Text></TouchableOpacity>;
        })}</View>

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveTxt}>Save (Draft)</Text>}</TouchableOpacity>
        <TouchableOpacity style={[styles.submitBtn, !minValid && { opacity: 0.5 }]} disabled={!minValid || submitting} onPress={submit}>{submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveTxt}>{status === 'rejected' ? 'Resubmit for verification' : 'Submit for verification'}</Text>}</TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F8F9FA' },
  center:{ flex:1, justifyContent:'center', alignItems:'center' },
  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:Colors.white, paddingHorizontal:Spacing.md, paddingVertical:Spacing.sm },
  back:{ width:40, height:40, borderRadius:12, backgroundColor:Colors.backgroundDark, justifyContent:'center', alignItems:'center' },
  title:{ fontSize:FontSize.xl, fontWeight:'700', color:Colors.text },
  banner:{ backgroundColor:Colors.white, padding:12, borderRadius:BorderRadius.lg, marginBottom:10 },
  bannerText:{ fontWeight:'700', color:Colors.text },
  note:{ marginTop:6, color:Colors.error },
  label:{ color:Colors.textSecondary, marginBottom:4 },
  input:{ backgroundColor:Colors.white, borderRadius:12, borderColor:Colors.border, borderWidth:1, paddingHorizontal:12, paddingVertical:10, color:Colors.text },
  row:{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:14 },
  chip:{ paddingHorizontal:10, paddingVertical:7, borderRadius:999, backgroundColor:Colors.backgroundDark },
  chipA:{ backgroundColor:Colors.primary },
  chipT:{ color:Colors.textSecondary, fontWeight:'600' },
  chipTA:{ color:Colors.white },
  saveBtn:{ backgroundColor:Colors.primary, borderRadius:12, paddingVertical:12, alignItems:'center', marginBottom:8 },
  submitBtn:{ backgroundColor:Colors.success, borderRadius:12, paddingVertical:12, alignItems:'center' },
  saveTxt:{ color:Colors.white, fontWeight:'700' },
});