import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';
import { useStore } from '../../src/store/useStore';

const API = () => {
  const base =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/api`;
};

export default function AdminShariaPolicy() {
  const router = useRouter();
  const token = useStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requireReview, setRequireReview] = useState(true);
  const [familySafe, setFamilySafe] = useState(true);
  const [keywords, setKeywords] = useState('');
  const [categories, setCategories] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API()}/admin/sharia-policy`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setRequireReview(data.require_product_review !== false);
          setFamilySafe(data.family_safe_images !== false);
          setKeywords((data.banned_keywords || []).join('\n'));
          setCategories((data.banned_categories || []).join('\n'));
        }
      } catch {
        /* keep defaults */
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        require_product_review: requireReview,
        family_safe_images: familySafe,
        banned_keywords: keywords
          .split('\n')
          .map((k) => k.trim())
          .filter(Boolean),
        banned_categories: categories
          .split('\n')
          .map((k) => k.trim())
          .filter(Boolean),
      };
      const res = await fetch(`${API()}/admin/sharia-policy`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('save failed');
      Alert.alert('تم', 'تم حفظ سياسة المحتوى الشرعي');
    } catch {
      Alert.alert('خطأ', 'تعذر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>السياسة الشرعية</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>مراجعة المنتجات قبل النشر</Text>
          <Switch
            value={requireReview}
            onValueChange={setRequireReview}
            trackColor={{ true: Colors.secondary }}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>صور عائلية فقط</Text>
          <Switch
            value={familySafe}
            onValueChange={setFamilySafe}
            trackColor={{ true: Colors.secondary }}
          />
        </View>
        <Text style={styles.fieldLabel}>كلمات ممنوعة (سطر لكل كلمة)</Text>
        <TextInput
          style={styles.input}
          multiline
          value={keywords}
          onChangeText={setKeywords}
          textAlign="right"
          placeholderTextColor={Colors.textLight}
        />
        <Text style={styles.fieldLabel}>فئات منتجات ممنوعة</Text>
        <TextInput
          style={styles.input}
          multiline
          value={categories}
          onChangeText={setCategories}
          textAlign="right"
          placeholderTextColor={Colors.textLight}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.saveText}>حفظ السياسة</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  content: { padding: Spacing.lg },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 8,
  },
  input: {
    minHeight: 120,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: Colors.white, fontWeight: '800', fontSize: FontSize.md },
});
