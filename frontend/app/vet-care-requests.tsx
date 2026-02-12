import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { careAPI } from '../src/services/api';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';

export default function VetCareRequestsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [diagnosisById, setDiagnosisById] = useState<Record<string, string>>({});
  const [prescriptionById, setPrescriptionById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await careAPI.getVetQueue();
      setRows(res.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: 'accept'|'start'|'complete') => {
    try {
      const payload: any = { action };
      if (action === 'complete') {
        const diagnosis = (diagnosisById[id] || '').trim();
        const prescription = (prescriptionById[id] || '').trim();
        if (!diagnosis || !prescription) {
          Alert.alert('Required', 'Diagnosis and prescription are required to complete the case');
          return;
        }
        payload.vet_notes = notesById[id] || undefined;
        payload.diagnosis = diagnosis;
        payload.prescription = prescription;
      }
      await careAPI.updateVetRequest(id, payload);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Action failed');
    }
  };

  const showTimeline = async (id: string) => {
    try {
      const res = await careAPI.getTimeline(id);
      const events = (res.data || []).slice(-8);
      const text = events.map((e: any) => `• ${e.event_type} (${e.status || '-'}) ${e.actor_name ? 'by '+e.actor_name : ''}`).join('\n');
      Alert.alert('Case Timeline', text || 'No timeline events yet');
    } catch {
      Alert.alert('Error', 'Failed to load timeline');
    }
  };

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity><Text style={styles.title}>Vet Care Requests</Text><View style={{ width: 40 }} /></View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.primary]} />}
        renderItem={({ item }) => {
          const status = item.status || 'pending';
          const completed = status === 'completed';
          const canAccept = status === 'pending';
          const canStart = status === 'accepted' || status === 'pending';
          const canComplete = status === 'in_progress' || status === 'accepted';
          return (
          <View style={[styles.card, Shadow.small]}>
            <Text style={styles.cardTitle}>{item.title || 'Care Request'}</Text>
            <Text style={styles.meta}>Status: {status}</Text>
            <Text style={styles.meta}>Location: {item.location || 'N/A'}</Text>
            {!!item.follow_up_due_date && <Text style={styles.meta}>Follow-up due: {item.follow_up_due_date}</Text>}
            {item.reminder_enabled && <Text style={styles.reminder}>Reminder requested by owner</Text>}
            <Text style={styles.desc}>{item.description || '-'}</Text>
            {!!item.follow_up_context && <Text style={styles.contextText}>Context: {item.follow_up_context}</Text>}
            {!!item.attachments?.length && <Text style={styles.attachText}>Attachments shared: {item.attachments.length}</Text>}
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, !canAccept && styles.btnDisabled]} disabled={!canAccept} onPress={() => act(item.id, 'accept')}><Text style={styles.btnText}>Accept</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, !canStart && styles.btnDisabled]} disabled={!canStart} onPress={() => act(item.id, 'start')}><Text style={styles.btnText}>Start</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, (!canComplete || completed) && styles.btnDisabled]} disabled={!canComplete || completed} onPress={() => act(item.id, 'complete')}><Text style={styles.btnText}>Complete</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => showTimeline(item.id)}><Text style={styles.btnSecondaryText}>Timeline</Text></TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder='Diagnosis (optional)'
              value={diagnosisById[item.id] || ''}
              onChangeText={(v) => setDiagnosisById((s) => ({ ...s, [item.id]: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder='Prescription (optional)'
              value={prescriptionById[item.id] || ''}
              onChangeText={(v) => setPrescriptionById((s) => ({ ...s, [item.id]: v }))}
            />
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder='Vet notes (optional)'
              multiline
              value={notesById[item.id] || ''}
              onChangeText={(v) => setNotesById((s) => ({ ...s, [item.id]: v }))}
            />
          </View>
        )}
        ListEmptyComponent={<View style={styles.center}><Text style={styles.empty}>No care requests</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'}, center:{flex:1,justifyContent:'center',alignItems:'center'}, header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white}, iconBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,justifyContent:'center',alignItems:'center'}, title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text}, list:{padding:Spacing.md,paddingBottom:110}, card:{backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md,marginBottom:Spacing.sm}, cardTitle:{fontSize:FontSize.md,fontWeight:'700',color:Colors.text}, meta:{fontSize:FontSize.sm,color:Colors.textSecondary,marginTop:2}, reminder:{fontSize:FontSize.xs,color:Colors.warning,marginTop:4,fontWeight:'700'}, desc:{fontSize:FontSize.sm,color:Colors.text,marginTop:6}, contextText:{fontSize:FontSize.sm,color:Colors.textSecondary,marginTop:6}, attachText:{fontSize:FontSize.xs,color:Colors.primary,marginTop:4,fontWeight:'700'}, row:{marginTop:10,flexDirection:'row',gap:8,flexWrap:'wrap'}, btn:{backgroundColor:Colors.primary,borderRadius:BorderRadius.md,paddingHorizontal:10,paddingVertical:8}, btnDisabled:{opacity:0.4}, btnText:{color:Colors.white,fontSize:FontSize.xs,fontWeight:'700'}, btnSecondary:{backgroundColor:Colors.backgroundDark,borderRadius:BorderRadius.md,paddingHorizontal:10,paddingVertical:8}, btnSecondaryText:{fontSize:FontSize.xs,fontWeight:'700',color:Colors.text}, input:{marginTop:8,backgroundColor:Colors.backgroundDark,borderRadius:BorderRadius.md,paddingHorizontal:10,paddingVertical:8,color:Colors.text,fontSize:FontSize.sm}, notesInput:{minHeight:70,textAlignVertical:'top'}, empty:{color:Colors.textSecondary}
});