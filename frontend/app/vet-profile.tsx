import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../src/constants/theme';
import { vetProfileAPI } from '../src/services/api';
import * as ImagePicker from 'expo-image-picker';

const PET_TYPES = ['dogs', 'cats', 'birds', 'all'];

export default function VetProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
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

  const pickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') return Alert.alert('Permission required', 'Please allow gallery access');
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0] as any;
        const mime = a.mimeType || 'image/jpeg';
        const uri = a.base64 ? `data:${mime};base64,${a.base64}` : a.uri;
        setForm((p:any) => ({ ...p, image_url: uri || '' }));
      }
    } catch {
      Alert.alert('Error', 'Could not pick image');
    } finally {
      setPickerOpen(false);
    }
  };

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') return Alert.alert('Permission required', 'Please allow camera access');
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0] as any;
        const mime = a.mimeType || 'image/jpeg';
        const uri = a.base64 ? `data:${mime};base64,${a.base64}` : a.uri;
        setForm((p:any) => ({ ...p, image_url: uri || '' }));
      }
    } catch {
      Alert.alert('Error', 'Could not take photo');
    } finally {
      setPickerOpen(false);
    }
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

        {['name','specialty','experience_years','phone','city','location_text'].map((k) => (
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

        <Text style={styles.label}>Profile image</Text>
        <TouchableOpacity style={styles.imagePick} onPress={() => setPickerOpen(true)}>
          {form.image_url ? <Image source={{ uri: form.image_url }} style={styles.imagePreview} /> : <Ionicons name="camera" size={22} color={Colors.primary} />}
          <Text style={styles.imagePickText}>{form.image_url ? 'Change image' : 'Upload from gallery/camera'}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>pet_types_supported</Text>
        <View style={styles.row}>{PET_TYPES.map((pt) => {
          const active = (form.pet_types_supported || []).includes(pt);
          return <TouchableOpacity key={pt} style={[styles.chip, active && styles.chipA]} onPress={() => setForm((p:any)=>({ ...p, pet_types_supported: active ? p.pet_types_supported.filter((x:string)=>x!==pt) : [...p.pet_types_supported, pt] }))}><Text style={[styles.chipT, active && styles.chipTA]}>{pt}</Text></TouchableOpacity>;
        })}</View>

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveTxt}>Save (Draft)</Text>}</TouchableOpacity>
        <TouchableOpacity style={[styles.submitBtn, !minValid && { opacity: 0.5 }]} disabled={!minValid || submitting} onPress={submit}>{submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveTxt}>{status === 'rejected' ? 'Resubmit for verification' : 'Submit for verification'}</Text>}</TouchableOpacity>
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setPickerOpen(false)} activeOpacity={1}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.modalAction} onPress={takePhoto}>
              <Ionicons name="camera" size={18} color={Colors.text} />
              <Text style={styles.modalText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalAction} onPress={pickFromGallery}>
              <Ionicons name="images" size={18} color={Colors.text} />
              <Text style={styles.modalText}>Choose from gallery</Text>
            </TouchableOpacity>
            {!!form.image_url && (
              <TouchableOpacity style={styles.modalAction} onPress={() => { setForm((p:any)=>({ ...p, image_url: '' })); setPickerOpen(false); }}>
                <Ionicons name="trash" size={18} color={Colors.error} />
                <Text style={[styles.modalText, { color: Colors.error }]}>Remove image</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
  imagePick:{ backgroundColor:Colors.white, borderRadius:12, borderColor:Colors.border, borderWidth:1, padding:10, marginBottom:10, flexDirection:'row', alignItems:'center', gap:10 },
  imagePreview:{ width:56, height:56, borderRadius:10 },
  imagePickText:{ color:Colors.textSecondary, fontWeight:'600' },
  modalBackdrop:{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'flex-end' },
  modalCard:{ backgroundColor:Colors.white, padding:12, borderTopLeftRadius:16, borderTopRightRadius:16 },
  modalAction:{ flexDirection:'row', alignItems:'center', gap:10, paddingVertical:12, paddingHorizontal:6 },
  modalText:{ color:Colors.text, fontWeight:'600' },
});
