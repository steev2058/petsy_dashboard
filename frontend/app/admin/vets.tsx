import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';

export default function AdminVetsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Veterinarians</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.text}>Manual "Add Vet" is disabled.</Text>
        <Text style={styles.sub}>Admins must manage vet verification via Vet Profiles Queue.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/admin/vet-profiles' as any)}>
          <Text style={styles.buttonText}>Open Vet Profiles Queue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F8F9FA' },
  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:Colors.white, paddingHorizontal:Spacing.md, paddingVertical:Spacing.sm },
  backButton:{ width:40, height:40, borderRadius:12, backgroundColor:Colors.backgroundDark, justifyContent:'center', alignItems:'center' },
  title:{ fontSize:FontSize.xl, fontWeight:'700', color:Colors.text },
  card:{ margin:Spacing.md, backgroundColor:Colors.white, borderRadius:BorderRadius.lg, padding:Spacing.lg },
  text:{ fontSize:FontSize.lg, fontWeight:'700', color:Colors.text },
  sub:{ marginTop:8, color:Colors.textSecondary },
  button:{ marginTop:16, backgroundColor:Colors.primary, borderRadius:12, paddingVertical:12, alignItems:'center' },
  buttonText:{ color:Colors.white, fontWeight:'700' },
});