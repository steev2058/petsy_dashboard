import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing } from '../src/constants/theme';
import { useTranslation } from '../src/hooks/useTranslation';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { language, isRTL } = useTranslation();
  const L = {
    title: language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy',
    body: language === 'ar'
      ? 'يقوم Petsy بتخزين بيانات الحساب والملف الشخصي والمنشورات والمحادثات والتفضيلات لتقديم وظائف التطبيق. نحن لا نبيع البيانات الشخصية. يمكنك تحديث ملفك الشخصي، والتحكم في تفضيلات التواصل، وحظر المستخدمين، أو حذف حسابك من الإعدادات.'
      : 'Petsy stores account/profile data, posts, chats, and preferences to provide app functionality. We do not sell personal data. You can update your profile, control communication preferences, block users, or delete your account from settings.',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.rtlText]}>{L.title}</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.text, isRTL && styles.rtlText]}>{L.body}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.white },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  content: { padding: Spacing.md },
  text: { fontSize: FontSize.md, color: Colors.text, lineHeight: 24 },
  rtlText: { textAlign: 'right' },
});
