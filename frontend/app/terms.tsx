import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing } from '../src/constants/theme';

export default function TermsScreen(){const router=useRouter();return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.header}><TouchableOpacity onPress={()=>router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text}/></TouchableOpacity><Text style={styles.title}>Terms of Service</Text><View style={{width:22}}/></View><ScrollView contentContainerStyle={styles.content}><Text style={styles.text}>By using Petsy, you agree to use the platform responsibly, respect other users, and avoid posting harmful or illegal content. Petsy may moderate content and suspend abusive accounts. Transactions and communications are between users and service providers; always verify details before payments.</Text></ScrollView></SafeAreaView>}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F8F9FA'},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:Spacing.md,backgroundColor:Colors.white},title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},content:{padding:Spacing.md},text:{fontSize:FontSize.md,color:Colors.text,lineHeight:24}});