import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { settingsAPI } from '../src/services/api';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const [location, setLocation] = useState(true);
  const [email, setEmail] = useState(true);

  useEffect(() => { (async () => { try { const r = await settingsAPI.get(); setLocation(!!r.data.location_services); setEmail(!!r.data.email_updates); } catch {} })(); }, []);
  const save = async (patch: any) => { try { await settingsAPI.update(patch); } catch { Alert.alert('Error', 'Failed to save'); } };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Privacy Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.card, Shadow.small]}>
        <Row label='Location Services' value={location} onChange={(v) => { setLocation(v); save({ location_services: v }); }} />
        <View style={styles.div} />
        <Row label='Email Updates' value={email} onChange={(v) => { setEmail(v); save({ email_updates: v }); }} />
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, onChange }: any) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: Colors.border, true: Colors.primary + '50' }} thumbColor={value ? Colors.primary : Colors.textLight} /></View>;
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
});