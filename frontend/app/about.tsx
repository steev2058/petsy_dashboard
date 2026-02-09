import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing } from '../src/constants/theme';

export default function AboutScreen(){const router=useRouter();return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.header}><TouchableOpacity onPress={()=>router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text}/></TouchableOpacity><Text style={styles.title}>About Petsy</Text><View style={{width:22}}/></View><View style={styles.content}><Text style={styles.name}>Petsy v1.0.0</Text><Text style={styles.text}>Petsy is your complete pet marketplace and adoption platform.</Text><Text style={styles.copy}>© 2025 Petsy. All rights reserved.</Text></View></SafeAreaView>}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F8F9FA'},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:Spacing.md,backgroundColor:Colors.white},title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text},content:{padding:Spacing.md},name:{fontSize:FontSize.xl,fontWeight:'800',color:Colors.text,marginBottom:8},text:{fontSize:FontSize.md,color:Colors.textSecondary},copy:{marginTop:20,fontSize:FontSize.sm,color:Colors.textLight}});