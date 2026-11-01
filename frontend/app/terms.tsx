import React from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../src/constants/theme';

const SECTIONS = [
  {
    title: '1) القبول',
    body: 'باستخدامك Petsy فأنت توافق على هذه الشروط وعلى سياسة الخصوصية.',
  },
  {
    title: '2) طبيعة الخدمة',
    body: 'Petsy وسيط رقمي يربط المستخدمين للتبنّي والمجتمع والسوق والحجوزات البيطرية. المنصة ليست عيادة طبية، والاستشارات عبرها لا تغني عن الكشف البيطري المباشر عند الحاجة.',
  },
  {
    title: '3) سياسة محتوى متوافقة شرعياً',
    body: 'يُمنع بيع أو ترويج الخمر والمسكرات والخنزير والقمار واليانصيب والتمويل الربوي/التقسيط بفائدة، والمحتوى غير اللائق أو المسيء أو العنيف تجاه الإنسان أو الحيوان. للإدارة حق الإزالة والمراجعة.',
  },
  {
    title: '4) التبنّي والكفالة',
    body: 'تُقدَّم كرعاية ورحمة بالحيوان، وليست مقامرة أو سحباً عشوائياً بمقابل مضلل.',
  },
  {
    title: '5) السوق والمدفوعات',
    body: 'الدفع عند الاستلام خيار أساسي. قد تُتاح وسائل دفع محلية غير ربوية. عمولة المنصة أجرة خدمة/وساطة معلنة مسبقاً وليست فائدة ربوية. لا نقدّم تقسيطاً بفائدة.',
  },
  {
    title: '6) الحجوزات البيطرية',
    body: 'الحجز ترتيب موعد/طلب خدمة بين المستخدم ومقدّم الخدمة. العلاقة الطبية النهائية بين الطرفين.',
  },
];

export default function TermsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-forward" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>شروط الاستخدام</Text>
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
