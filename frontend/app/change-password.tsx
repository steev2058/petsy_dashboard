import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { authAPI } from '../src/services/api';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!current || !next || !confirm) return Alert.alert('Missing info', 'Please fill all fields');
    if (next !== confirm) return Alert.alert('Mismatch', 'New password confirmation does not match');
    setSaving(true);
    try {
      await authAPI.changePassword({ current_password: current, new_password: next });
      Alert.alert('Success', 'Password changed successfully', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.card, Shadow.small]}>
        <Text style={styles.cardTitle}>Security</Text>
        <TextInput style={styles.input} secureTextEntry placeholder='Current password' value={current} onChangeText={setCurrent} />
        <TextInput style={styles.input} secureTextEntry placeholder='New password' value={next} onChangeText={setNext} />
        <TextInput style={styles.input} secureTextEntry placeholder='Confirm new password' value={confirm} onChangeText={setConfirm} />

        <TouchableOpacity style={styles.btn} onPress={onSave} disabled={saving}>
          {saving ? <ActivityIndicator size='small' color={Colors.white} /> : <Text style={styles.btnText}>Save Password</Text>}
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
});