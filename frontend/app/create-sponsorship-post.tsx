import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { petsAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

const SPECIES = ['cat', 'bird', 'fish', 'rabbit', 'dog', 'other'];

export default function CreateSponsorshipPostScreen() {
  const router = useRouter();
  const { language, isRTL } = useTranslation();
  const L = {
    title: language === 'ar' ? 'إنشاء منشور كفالة' : 'Create Sponsorship Post',
    tapPhoto: language === 'ar' ? 'اضغط لإضافة صورة' : 'Tap to add photo',
    petName: language === 'ar' ? 'اسم الحيوان *' : 'Pet name *',
    breed: language === 'ar' ? 'السلالة' : 'Breed',
    age: language === 'ar' ? 'العمر' : 'Age',
    location: language === 'ar' ? 'الموقع *' : 'Location *',
    desc: language === 'ar' ? 'الوصف' : 'Description',
    post: language === 'ar' ? 'نشر للكفالة' : 'Post for Sponsorship',
    enterName: language === 'ar' ? 'يرجى إدخال اسم الحيوان' : 'Please enter pet name',
    enterLocation: language === 'ar' ? 'يرجى إدخال الموقع' : 'Please enter location',
    created: language === 'ar' ? 'تم إنشاء منشور الكفالة بنجاح' : 'Sponsorship post created successfully',
    createFail: language === 'ar' ? 'فشل إنشاء منشور الكفالة' : 'Failed to create sponsorship post',
  };
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [species, setSpecies] = useState('cat');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [form, setForm] = useState({ name: '', breed: '', age: '', gender: 'male', location: '', description: '', vaccinated: true });

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ visible: true, message, type });
    toastTimerRef.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 1800);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6, base64: true });
    if (!result.canceled && result.assets[0]?.base64) setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
  };

  const onSubmit = async () => {
    if (!form.name.trim()) return showToast(L.enterName, 'error');
    if (!form.location.trim()) return showToast(L.enterLocation, 'error');

    setSaving(true);
    try {
      await petsAPI.create({
        name: form.name,
        species,
        breed: form.breed,
        age: form.age,
        gender: form.gender,
        location: form.location,
        description: form.description,
        vaccinated: form.vaccinated,
        neutered: false,
        image,
        status: 'for_adoption',
      });
      showToast(L.created, 'success');
      setTimeout(() => router.replace('/sponsorships'), 700);
    } catch (e: any) {
      showToast(e?.response?.data?.detail || L.createFail, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {toast.visible && (
        <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
          <Ionicons name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={16} color={Colors.white} />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.rtlText]}>{L.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={[styles.imageBox, Shadow.small]} onPress={pickImage}>
          {image ? <Image source={{ uri: image }} style={styles.image} /> : <><Ionicons name='camera' size={28} color={Colors.textLight} /><Text style={styles.imageText}>{L.tapPhoto}</Text></>}
        </TouchableOpacity>

        <TextInput style={[styles.input, isRTL && styles.rtlText]} placeholder={L.petName} value={form.name} onChangeText={(v)=>setForm({...form,name:v})} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.speciesRow}>
          {SPECIES.map((s) => <TouchableOpacity key={s} style={[styles.spBtn, species===s && styles.spBtnActive]} onPress={() => setSpecies(s)}><Text style={[styles.spText, species===s && styles.spTextActive]}>{language === 'ar' ? (s === 'cat' ? 'قط' : s === 'bird' ? 'طائر' : s === 'fish' ? 'سمك' : s === 'rabbit' ? 'أرنب' : s === 'dog' ? 'كلب' : 'أخرى') : s}</Text></TouchableOpacity>)}
        </ScrollView>
        <TextInput style={[styles.input, isRTL && styles.rtlText]} placeholder={L.breed} value={form.breed} onChangeText={(v)=>setForm({...form,breed:v})} />
        <TextInput style={[styles.input, isRTL && styles.rtlText]} placeholder={L.age} value={form.age} onChangeText={(v)=>setForm({...form,age:v})} />
        <TextInput style={[styles.input, isRTL && styles.rtlText]} placeholder={L.location} value={form.location} onChangeText={(v)=>setForm({...form,location:v})} />
        <TextInput style={[styles.input, styles.area, isRTL && styles.rtlText]} placeholder={L.desc} multiline value={form.description} onChangeText={(v)=>setForm({...form,description:v})} />
        <TouchableOpacity style={styles.submit} onPress={onSubmit} disabled={saving}>{saving ? <ActivityIndicator size='small' color={Colors.white} /> : <Text style={styles.submitText}>{L.post}</Text>}</TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white},
  back:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'},
  title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},
  content:{padding:Spacing.md,paddingBottom:120,gap:Spacing.sm},
  imageBox:{height:180,borderRadius:BorderRadius.lg,backgroundColor:Colors.white,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  image:{width:'100%',height:'100%'},
  imageText:{marginTop:8,color:Colors.textSecondary},
  input:{backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border,borderRadius:BorderRadius.lg,padding:Spacing.md,color:Colors.text},
  area:{minHeight:100,textAlignVertical:'top'},
  speciesRow:{gap:8,paddingVertical:4},
  spBtn:{paddingHorizontal:14,paddingVertical:8,borderRadius:BorderRadius.full,backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border},
  spBtnActive:{backgroundColor:Colors.primary,borderColor:Colors.primary},
  spText:{textTransform:'capitalize',fontWeight:'600',color:Colors.textSecondary},
  spTextActive:{color:Colors.white},
  submit:{marginTop:6,backgroundColor:Colors.primary,borderRadius:BorderRadius.lg,paddingVertical:14,alignItems:'center'},
  submitText:{color:Colors.white,fontWeight:'700',fontSize:FontSize.md},
  toast:{position:'absolute',top:16,left:16,right:16,zIndex:100,borderRadius:BorderRadius.md,paddingVertical:10,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8,...Shadow.small},
  toastSuccess:{backgroundColor:Colors.success},
  toastError:{backgroundColor:Colors.error},
  toastText:{color:Colors.white,fontWeight:'600',fontSize:FontSize.sm,flex:1},
  rtlText:{textAlign:'right'},
});