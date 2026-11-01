import React from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../src/constants/theme';

const SECTIONS = [
  {
    title: '1) من نحن',
    body: 'Petsy منصة رقمية لخدمات رعاية الحيوانات الأليفة في سوريا (تبنّي، مجتمع، سوق، حجوزات بيطرية).',
  },
  {
    title: '2) البيانات التي نجمعها',
    body: 'بيانات الحساب (الاسم، البريد، الهاتف، المدينة)، بيانات الاستخدام (المنشورات، الطلبات، الحجوزات، الرسائل)، وبيانات تقنية أساسية للأمان.',
  },
  {
    title: '3) كيف نستخدم البيانات',
    body: 'تشغيل الخدمات، التواصل بشأن الطلبات والحجوزات، الموديريشن، ومنع الإساءة وتحسين التجربة.',
  },
  {
    title: '4) المشاركة',
    body: 'لا نبيع بياناتك. قد نشارك الحد الأدنى اللازم مع مزوّدي البنية التقنية أو مع البائع/البيطري المرتبط بطلبك فقط.',
  },
  {
    title: '5) الاحتفاظ والأمان',
    body: 'نحتفظ بالبيانات طالما الحساب نشط أو يلزم قانوناً، ونطبّق إجراءات حماية مناسبة.',
  },
  {
    title: '6) حقوقك والتواصل',
    body: 'يمكنك طلب تصحيح بياناتك أو حذف الحساب من الإعدادات. للتواصل: privacy@petsy.company',
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-forward" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>سياسة الخصوصية</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>آخر تحديث: 2026-11-01</Text>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.card}>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  content: { padding: Spacing.lg, paddingBottom: 48 },
  updated: { color: Colors.textLight, marginBottom: Spacing.md, textAlign: 'right' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, textAlign: 'right', marginBottom: 8 },
  body: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 24, textAlign: 'right' },
});
