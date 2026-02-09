import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { petTagsAPI } from '../../src/services/api';

export default function TagScanPage() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({ scanner_name: '', scanner_phone: '', location: '', message: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await petTagsAPI.scan(String(code || ''));
        setData(res.data);
      } catch (e: any) {
        Alert.alert('Tag not found', e?.response?.data?.detail || 'Invalid or inactive tag');
      } finally {
        setLoading(false);
      }
    };
    if (code) load();
  }, [code]);

  const reportFound = async () => {
    if (!form.location.trim()) return Alert.alert('Missing location', 'Please enter where you found the pet');
    setSending(true);
    try {
      await petTagsAPI.reportScan(String(code), form);
      Alert.alert('Reported', 'Thanks! The owner has been notified via scan history.');
      setForm({ scanner_name: '', scanner_phone: '', location: '', message: '' });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to send report');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;
  if (!data) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><Text>Tag unavailable</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Found Pet</Text>
        <View style={[styles.card, Shadow.small]}>
          {data?.pet?.image ? <Image source={{ uri: data.pet.image }} style={styles.image} /> : null}
          <Text style={styles.petName}>{data?.pet?.name || 'Unknown pet'}</Text>
          <Text style={styles.petMeta}>{data?.pet?.species} {data?.pet?.breed ? `• ${data.pet.breed}` : ''}</Text>
          <Text style={styles.desc}>{data?.pet?.description || ''}</Text>
          <Text style={styles.owner}>Owner: {data?.owner?.name || 'Unknown'}{data?.owner?.phone ? ` • ${data.owner.phone}` : ''}</Text>
        </View>

        <View style={[styles.card, Shadow.small]}>
          <Text style={styles.subTitle}>Report current location</Text>
          <TextInput style={styles.input} placeholder='Your name (optional)' value={form.scanner_name} onChangeText={(v)=>setForm({...form,scanner_name:v})} />
          <TextInput style={styles.input} placeholder='Your phone (optional)' value={form.scanner_phone} onChangeText={(v)=>setForm({...form,scanner_phone:v})} />
          <TextInput style={styles.input} placeholder='Location *' value={form.location} onChangeText={(v)=>setForm({...form,location:v})} />
          <TextInput style={[styles.input, styles.textArea]} multiline placeholder='Message to owner (optional)' value={form.message} onChangeText={(v)=>setForm({...form,message:v})} />
          <TouchableOpacity style={styles.btn} onPress={reportFound} disabled={sending}><Text style={styles.btnText}>{sending ? 'Sending...' : 'Send to Owner'}</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md },
  image: { width: '100%', height: 200, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  petName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  petMeta: { color: Colors.textSecondary, marginTop: 2 },
  desc: { color: Colors.textSecondary, marginTop: 8 },
  owner: { marginTop: 8, color: Colors.primary, fontWeight: '600' },
  subTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  input: { backgroundColor: Colors.backgroundDark, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  btn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, alignItems: 'center', marginTop: 4 },
  btnText: { color: Colors.white, fontWeight: '700' },
});