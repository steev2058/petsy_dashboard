import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing } from '../src/constants/theme';
import { useTranslation } from '../src/hooks/useTranslation';

export default function TermsScreen() {
  const router = useRouter();
  const { language, isRTL } = useTranslation();
  const L = {
    title: language === 'ar' ? 'شروط الخدمة' : 'Terms of Service',
    body: language === 'ar'
      ? 'باستخدامك لتطبيق Petsy، فإنك توافق على استخدام المنصة بمسؤولية، واحترام المستخدمين الآخرين، وتجنب نشر أي محتوى ضار أو غير قانوني. قد يقوم Petsy بإدارة المحتوى وتعليق الحسابات المسيئة. المعاملات والتواصل تتم بين المستخدمين ومقدمي الخدمات؛ لذا تحقّق دائمًا من التفاصيل قبل الدفع.'
      : 'By using Petsy, you agree to use the platform responsibly, respect other users, and avoid posting harmful or illegal content. Petsy may moderate content and suspend abusive accounts. Transactions and communications are between users and service providers; always verify details before payments.',
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
