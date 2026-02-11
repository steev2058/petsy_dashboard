import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { authAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { language, isRTL } = useTranslation();
  const L = {
    title: language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password',
    security: language === 'ar' ? 'الأمان' : 'Security',
    current: language === 'ar' ? 'كلمة المرور الحالية' : 'Current password',
    next: language === 'ar' ? 'كلمة المرور الجديدة' : 'New password',
    confirm: language === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password',
    save: language === 'ar' ? 'حفظ كلمة المرور' : 'Save Password',
    missingTitle: language === 'ar' ? 'معلومات ناقصة' : 'Missing info',
    missingBody: language === 'ar' ? 'يرجى تعبئة جميع الحقول' : 'Please fill all fields',
    mismatchTitle: language === 'ar' ? 'عدم تطابق' : 'Mismatch',
    mismatchBody: language === 'ar' ? 'تأكيد كلمة المرور الجديدة غير مطابق' : 'New password confirmation does not match',
    success: language === 'ar' ? 'تم بنجاح' : 'Success',
    successBody: language === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully',
    ok: language === 'ar' ? 'حسنًا' : 'OK',
    error: language === 'ar' ? 'خطأ' : 'Error',
    fail: language === 'ar' ? 'فشل تغيير كلمة المرور' : 'Failed to change password',
  };

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!current || !next || !confirm) return Alert.alert(L.missingTitle, L.missingBody);
    if (next !== confirm) return Alert.alert(L.mismatchTitle, L.mismatchBody);
    setSaving(true);
    try {
      await authAPI.changePassword({ current_password: current, new_password: next });
      Alert.alert(L.success, L.successBody, [{ text: L.ok, onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert(L.error, e?.response?.data?.detail || L.fail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.rtlText]}>{L.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.card, Shadow.small]}>
        <Text style={[styles.cardTitle, isRTL && styles.rtlText]}>{L.security}</Text>
        <TextInput style={[styles.input, isRTL && styles.rtlText]} secureTextEntry placeholder={L.current} value={current} onChangeText={setCurrent} />
        <TextInput style={[styles.input, isRTL && styles.rtlText]} secureTextEntry placeholder={L.next} value={next} onChangeText={setNext} />
        <TextInput style={[styles.input, isRTL && styles.rtlText]} secureTextEntry placeholder={L.confirm} value={confirm} onChangeText={setConfirm} />

        <TouchableOpacity style={styles.btn} onPress={onSave} disabled={saving}>
          {saving ? <ActivityIndicator size='small' color={Colors.white} /> : <Text style={styles.btnText}>{L.save}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  card: { margin: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm },
  cardTitle: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  input: { backgroundColor: Colors.backgroundDark, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  btn: { marginTop: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  rtlText: { textAlign: 'right' },
});
