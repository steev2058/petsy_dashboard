import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { settingsAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

export default function ChatPreferencesScreen() {
  const router = useRouter();
  const { language, isRTL } = useTranslation();
  const L = {
    title: language === 'ar' ? 'تفضيلات الدردشة' : 'Chat Preferences',
    messageSound: language === 'ar' ? 'صوت الرسائل' : 'Message sound',
    preview: language === 'ar' ? 'إظهار معاينة الرسائل' : 'Show message preview',
    error: language === 'ar' ? 'خطأ' : 'Error',
    saveFail: language === 'ar' ? 'فشل الحفظ' : 'Failed to save',
  };
  const [sound, setSound] = useState(true);
  const [preview, setPreview] = useState(true);

  useEffect(() => { (async () => { try { const r = await settingsAPI.get(); setSound(!!r.data.chat_sound); setPreview(!!r.data.chat_preview); } catch {} })(); }, []);
  const save = async (patch: any) => { try { await settingsAPI.update(patch); } catch { Alert.alert(L.error, L.saveFail); } };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.rtlText]}>{L.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.card, Shadow.small]}>
        <Row label={L.messageSound} value={sound} onChange={(v: boolean) => { setSound(v); save({ chat_sound: v }); }} isRTL={isRTL} />
        <View style={styles.div} />
        <Row label={L.preview} value={preview} onChange={(v: boolean) => { setPreview(v); save({ chat_preview: v }); }} isRTL={isRTL} />
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, onChange, isRTL }: any) {
  return <View style={styles.row}><Text style={[styles.label, isRTL && styles.rtlText]}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: Colors.border, true: Colors.primary + '50' }} thumbColor={value ? Colors.primary : Colors.textLight} /></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  card: { margin: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  label: { fontSize: FontSize.md, color: Colors.text, fontWeight: '500' },
  div: { height: 1, backgroundColor: Colors.border },
  rtlText: { textAlign: 'right' },
});