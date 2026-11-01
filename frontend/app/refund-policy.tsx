import React from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../src/constants/theme';

const SECTIONS = [
  {
    title: '1) طلبات السوق',
    body: 'يمكن إلغاء الطلب قبل تأكيد البائع دون رسوم. بعد التأكيد يكون الإلغاء باتفاق الطرفين. عند الاستلام إذا كان المنتج تالفاً أو مخالفاً للوصف يحق للمشتري رفضه في COD مع إبلاغ الإدارة.',
  },
  {
    title: '2) الحجوزات البيطرية',
    body: 'يمكن إلغاء الحجز قبل موعده حسب سياسة العيادة الظاهرة في صفحة الحجز. التخلف المتكرر قد يؤثر على أولوية الحجوزات لاحقاً.',
  },
  {
    title: '3) عمولة المنصة',
    body: 'لا تُحصَّل عمولة على طلب غير مكتمل. للطلبات المكتملة تُحتسب العمولة كأجرة خدمة وفق النسبة المعلنة.',
  },
  {
    title: '4) النزاعات',
    body: 'تواصل مع الدعم عبر التطبيق أو admin@petsy.company مع رقم الطلب/الحجز خلال 48 ساعة من الواقعة.',
  },
];

export default function RefundPolicyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-forward" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإلغاء والاسترجاع</Text>
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
