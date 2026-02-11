import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { marketplaceAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

const CATEGORIES = ['pets', 'accessories', 'services'];

export default function CreateMarketplaceListing() {
  const router = useRouter();
  const { language, isRTL } = useTranslation();
  const L = {
    editListing: language === 'ar' ? 'تعديل الإعلان' : 'Edit Listing',
    createListing: language === 'ar' ? 'إنشاء إعلان' : 'Create Listing',
    tapPhoto: language === 'ar' ? 'اضغط لإضافة صورة' : 'Tap to add photo',
    title: language === 'ar' ? 'العنوان *' : 'Title *',
    desc: language === 'ar' ? 'الوصف *' : 'Description *',
    price: language === 'ar' ? 'السعر *' : 'Price *',
    location: language === 'ar' ? 'الموقع *' : 'Location *',
    petType: language === 'ar' ? 'نوع الحيوان (اختياري)' : 'Pet Type (optional)',
    cond: language === 'ar' ? 'الحالة (اختياري)' : 'Condition (optional)',
    saveChanges: language === 'ar' ? 'حفظ التغييرات' : 'Save Changes',
    publish: language === 'ar' ? 'نشر الإعلان' : 'Publish Listing',
    fillRequired: language === 'ar' ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill required fields',
    updated: language === 'ar' ? 'تم تحديث الإعلان بنجاح' : 'Listing updated successfully',
    posted: language === 'ar' ? 'تم نشر الإعلان بنجاح' : 'Listing posted successfully',
    updateFail: language === 'ar' ? 'فشل تحديث الإعلان' : 'Failed to update listing',
    createFail: language === 'ar' ? 'فشل إنشاء الإعلان' : 'Failed to create listing',
    loadFail: language === 'ar' ? 'فشل تحميل الإعلان' : 'Failed to load listing',
  };
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [toast, setToast] = useState<{visible:boolean;message:string;type:'success'|'error'}>({visible:false,message:'',type:'success'});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'pets', price: '', location: '', pet_type: '', condition: '' });

  useEffect(() => {
    const loadEdit = async () => {
      if (!editId) return;
      try {
        const res = await marketplaceAPI.getById(editId);
        const item = res.data;
        setForm({
          title: item.title || '',
          description: item.description || '',
          category: item.category || 'pets',
          price: String(item.price ?? ''),
          location: item.location || '',
          pet_type: item.pet_type || '',
          condition: item.condition || '',
        });
        setImage(item.image || null);
      } catch {
        showToast(L.loadFail, 'error');
      }
    };
    loadEdit();
  }, [editId]);

  const showToast = (message: string, type: 'success'|'error'='success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, message, type });
    timerRef.current = setTimeout(() => setToast((p)=>({ ...p, visible:false })), 1800);
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7, base64: true });
    if (!res.canceled && res.assets[0]?.base64) setImage(`data:image/jpeg;base64,${res.assets[0].base64}`);
  };

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.location.trim() || !form.price.trim()) {
      showToast(L.fillRequired, 'error');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await marketplaceAPI.update(editId, { ...form, price: Number(form.price), image });
        showToast(L.updated, 'success');
      } else {
        await marketplaceAPI.create({ ...form, price: Number(form.price), image });
        showToast(L.posted, 'success');
      }
      setTimeout(() => router.replace('/my-marketplace-listings'), 700);
    } catch (e: any) {
      showToast(e?.response?.data?.detail || (editId ? L.updateFail : L.createFail), 'error');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {toast.visible && <View style={[styles.toast, toast.type === 'success' ? styles.ok : styles.err]}><Ionicons name={toast.type==='success'?'checkmark-circle':'alert-circle'} size={16} color={Colors.white}/><Text style={styles.toastText}>{toast.message}</Text></View>}
      <View style={styles.header}><TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity><Text style={[styles.title, isRTL && styles.rtlText]}>{editId ? L.editListing : L.createListing}</Text><View style={{ width: 40 }} /></View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={[styles.imageBox, Shadow.small]} onPress={pickImage}>{image ? <Image source={{ uri: image }} style={styles.image} /> : <Text style={styles.hint}>{L.tapPhoto}</Text>}</TouchableOpacity>
        <TextInput style={[styles.input, isRTL && styles.rtlText]} placeholder={L.title} value={form.title} onChangeText={(v)=>setForm({...form,title:v})} />
        <TextInput style={[styles.input, styles.area, isRTL && styles.rtlText]} placeholder={L.desc} multiline value={form.description} onChangeText={(v)=>setForm({...form,description:v})} />
        <View style={styles.row}>{CATEGORIES.map((c)=><TouchableOpacity key={c} style={[styles.chip, form.category===c && styles.chipActive]} onPress={()=>setForm({...form,category:c})}><Text style={[styles.chipText, form.category===c && styles.chipTextActive]}>{c}</Text></TouchableOpacity>)}</View>
        <TextInput style={[styles.input, isRTL && styles.rtlText]} placeholder={L.price} keyboardType='numeric' value={form.price} onChangeText={(v)=>setForm({...form,price:v})} />
        <TextInput style={[styles.input, isRTL && styles.rtlText]} placeholder={L.location} value={form.location} onChangeText={(v)=>setForm({...form,location:v})} />
        <TextInput style={[styles.input, isRTL && styles.rtlText]} placeholder={L.petType} value={form.pet_type} onChangeText={(v)=>setForm({...form,pet_type:v})} />
        <TextInput style={[styles.input, isRTL && styles.rtlText]} placeholder={L.cond} value={form.condition} onChangeText={(v)=>setForm({...form,condition:v})} />
        <TouchableOpacity style={styles.submit} onPress={submit} disabled={saving}>{saving ? <ActivityIndicator size='small' color={Colors.white} /> : <Text style={styles.submitText}>{editId ? L.saveChanges : L.publish}</Text>}</TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'}, header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white}, iconBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,alignItems:'center',justifyContent:'center'}, title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text}, content:{padding:Spacing.md,paddingBottom:120,gap:Spacing.sm}, imageBox:{height:180,borderRadius:BorderRadius.lg,backgroundColor:Colors.white,alignItems:'center',justifyContent:'center'}, image:{width:'100%',height:'100%',borderRadius:BorderRadius.lg}, hint:{color:Colors.textSecondary}, input:{backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border,borderRadius:BorderRadius.lg,padding:Spacing.md,color:Colors.text}, area:{minHeight:100,textAlignVertical:'top'}, row:{flexDirection:'row',gap:8,flexWrap:'wrap'}, chip:{paddingHorizontal:14,paddingVertical:8,borderRadius:BorderRadius.full,backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border}, chipActive:{backgroundColor:Colors.primary,borderColor:Colors.primary}, chipText:{textTransform:'capitalize',color:Colors.textSecondary,fontWeight:'600'}, chipTextActive:{color:Colors.white}, submit:{marginTop:6,backgroundColor:Colors.primary,borderRadius:BorderRadius.lg,paddingVertical:14,alignItems:'center'}, submitText:{color:Colors.white,fontWeight:'700',fontSize:FontSize.md}, toast:{position:'absolute',top:16,left:16,right:16,zIndex:100,borderRadius:BorderRadius.md,paddingVertical:10,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8,...Shadow.small}, ok:{backgroundColor:Colors.success}, err:{backgroundColor:Colors.error}, toastText:{color:Colors.white,fontWeight:'600',fontSize:FontSize.sm,flex:1}, rtlText:{textAlign:'right'}
});