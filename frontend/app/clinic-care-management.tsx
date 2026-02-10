import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { careAPI } from '../src/services/api';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';

export default function ClinicCareManagementScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [vets, setVets] = useState<any[]>([]);
  const [timelineVisible, setTimelineVisible] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [timelineTitle, setTimelineTitle] = useState('');

  const load = useCallback(async () => {
    try {
      const [res, vetsRes] = await Promise.all([careAPI.getClinicQueue(), careAPI.getClinicVets()]);
      setRows(res.data || []);
      setVets(vetsRes.data || []);
    } catch {
      setRows([]);
      setVets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: string) => {
    try {
      await careAPI.updateClinicRequest(id, { status });
      await load();
    } catch {
      Alert.alert('Error', 'Update failed');
    }
  };

  const assignVet = async (requestId: string, vetId: string) => {
    try {
      await careAPI.updateClinicRequest(requestId, { assigned_vet_id: vetId });
      await load();
    } catch {
      Alert.alert('Error', 'Failed to assign vet');
    }
  };

  const openTimeline = async (item: any) => {
    try {
      const res = await careAPI.getTimeline(item.id);
      setTimelineEvents(res.data || []);
      setTimelineTitle(item.title || 'Care Request');
      setTimelineVisible(true);
    } catch {
      Alert.alert('Error', 'Failed to load timeline');
    }
  };

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.center}><ActivityIndicator size='small' color={Colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}><Ionicons name='arrow-back' size={22} color={Colors.text} /></TouchableOpacity><Text style={styles.title}>Clinic Care Management</Text><View style={{ width: 40 }} /></View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.primary]} />}
        renderItem={({ item }) => (
          <View style={[styles.card, Shadow.small]}>
            <Text style={styles.cardTitle}>{item.title || 'Care Request'}</Text>
            <Text style={styles.meta}>Status: {item.status || 'pending'}</Text>
            <Text style={styles.meta}>Assigned Vet: {item.assigned_vet_id || 'Unassigned'}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.btn} onPress={() => setStatus(item.id, 'in_progress')}><Text style={styles.btnText}>In Progress</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btn} onPress={() => setStatus(item.id, 'completed')}><Text style={styles.btnText}>Complete</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnSoft} onPress={() => openTimeline(item)}><Text style={styles.btnSoftText}>Timeline</Text></TouchableOpacity>
            </View>
            <View style={styles.vetsRow}>
              {vets.slice(0, 4).map((v) => (
                <TouchableOpacity key={v.id} style={styles.vetChip} onPress={() => assignVet(item.id, v.id)}>
                  <Text style={styles.vetChipText}>{v.name || 'Vet'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.center}><Text style={styles.empty}>No clinic cases</Text></View>}
      />

      <Modal visible={timelineVisible} transparent animationType='slide' onRequestClose={() => setTimelineVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Timeline • {timelineTitle}</Text>
              <TouchableOpacity onPress={() => setTimelineVisible(false)}><Ionicons name='close' size={22} color={Colors.text} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {timelineEvents.length === 0 ? <Text style={styles.empty}>No events</Text> : timelineEvents.map((e) => (
                <View key={e.id} style={styles.timelineItem}>
                  <Text style={styles.timelineTitle}>{e.event_type} • {e.status || '-'}</Text>
                  <Text style={styles.timelineMeta}>{e.actor_name || 'System'} ({e.actor_role || '-'})</Text>
                  {!!e.notes && <Text style={styles.timelineNote}>{e.notes}</Text>}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8F9FA'}, center:{flex:1,justifyContent:'center',alignItems:'center'}, header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,backgroundColor:Colors.white}, iconBtn:{width:40,height:40,borderRadius:12,backgroundColor:Colors.backgroundDark,justifyContent:'center',alignItems:'center'}, title:{fontSize:FontSize.xl,fontWeight:'700',color:Colors.text}, list:{padding:Spacing.md,paddingBottom:110}, card:{backgroundColor:Colors.white,borderRadius:BorderRadius.lg,padding:Spacing.md,marginBottom:Spacing.sm}, cardTitle:{fontSize:FontSize.md,fontWeight:'700',color:Colors.text}, meta:{fontSize:FontSize.sm,color:Colors.textSecondary,marginTop:4}, row:{marginTop:10,flexDirection:'row',gap:8}, vetsRow:{marginTop:8,flexDirection:'row',gap:6,flexWrap:'wrap'}, vetChip:{backgroundColor:Colors.backgroundDark,borderRadius:BorderRadius.full,paddingHorizontal:10,paddingVertical:6}, vetChipText:{fontSize:FontSize.xs,color:Colors.text,fontWeight:'600'}, btn:{backgroundColor:Colors.primary,borderRadius:BorderRadius.md,paddingHorizontal:10,paddingVertical:8}, btnText:{color:Colors.white,fontSize:FontSize.xs,fontWeight:'700'}, btnSoft:{backgroundColor:Colors.backgroundDark,borderRadius:BorderRadius.md,paddingHorizontal:10,paddingVertical:8}, btnSoftText:{fontSize:FontSize.xs,fontWeight:'700',color:Colors.text},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.35)',justifyContent:'flex-end'}, modalCard:{maxHeight:'75%',backgroundColor:Colors.white,borderTopLeftRadius:16,borderTopRightRadius:16,padding:Spacing.md}, modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8}, modalTitle:{fontSize:FontSize.md,fontWeight:'700',color:Colors.text}, modalContent:{paddingBottom:20}, timelineItem:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:Colors.border}, timelineTitle:{fontSize:FontSize.sm,fontWeight:'700',color:Colors.text}, timelineMeta:{fontSize:FontSize.xs,color:Colors.textSecondary,marginTop:2}, timelineNote:{fontSize:FontSize.sm,color:Colors.text,marginTop:4},
  empty:{color:Colors.textSecondary}
});