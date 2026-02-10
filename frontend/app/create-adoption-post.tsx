import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { petsAPI } from '../src/services/api';

const SPECIES = ['cat', 'bird', 'fish', 'rabbit', 'dog', 'other'];

export default function CreateAdoptionPostScreen() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [species, setSpecies] = useState('cat');
  const [form, setForm] = useState({
    name: '', breed: '', age: '', gender: 'male', location: '', description: '', vaccinated: true,
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6, base64: true });
    if (!result.canceled && result.assets[0]?.base64) setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
  };

  const onSubmit = async () => {
    if (!form.name.trim()) return Alert.alert('Missing info', 'Please enter pet name');
    if (!form.location.trim()) return Alert.alert('Missing info', 'Please enter location');

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
      Alert.alert('Success', 'Adoption post created successfully', [{ text: 'OK', onPress: () => router.replace('/(tabs)/adoption') }]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to create adoption post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Create Adoption Post</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={[styles.imageBox, Shadow.small]} onPress={pickImage}>
          {image ? <Image source={{ uri: image }} style={styles.image} /> : <><Ionicons name='camera' size={28} color={Colors.textLight} /><Text style={styles.imageText}>Tap to add photo</Text></>}
        </TouchableOpacity>

        <TextInput style={styles.input} placeholder='Pet name *' value={form.name} onChangeText={(v)=>setForm({...form,name:v})} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.speciesRow}>
          {SPECIES.map((s) => (
            <TouchableOpacity key={s} style={[styles.spBtn, species===s && styles.spBtnActive]} onPress={() => setSpecies(s)}>
              <Text style={[styles.spText, species===s && styles.spTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput style={styles.input} placeholder='Breed' value={form.breed} onChangeText={(v)=>setForm({...form,breed:v})} />
        <TextInput style={styles.input} placeholder='Age' value={form.age} onChangeText={(v)=>setForm({...form,age:v})} />
        <TextInput style={styles.input} placeholder='Location *' value={form.location} onChangeText={(v)=>setForm({...form,location:v})} />
        <TextInput style={[styles.input, styles.area]} placeholder='Description' multiline value={form.description} onChangeText={(v)=>setForm({...form,description:v})} />

        <TouchableOpacity style={styles.submit} onPress={onSubmit} disabled={saving}>
          {saving ? <ActivityIndicator size='small' color={Colors.white} /> : <Text style={styles.submitText}>Post for Adoption</Text>}
        </TouchableOpacity>
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
});