import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import api, { vetsAPI } from '../../src/services/api';
import { Input } from '../../src/components';

export default function AdminVetsScreen() {
  const router = useRouter();
  const [vets, setVets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editVet, setEditVet] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', specialty: '', experience: '', phone: '', location: '', rating: '', image: '' });

  useEffect(() => { loadVets(); }, []);

  const loadVets = async () => {
    try {
      const response = await vetsAPI.getAll();
      setVets(response.data || []);
    } catch (error) {
      console.log('Error:', error);
    } finally { setLoading(false); }
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadVets(); setRefreshing(false); }, []);

  const handleSave = async () => {
    if (!formData.name) { Alert.alert('Error', 'Name is required'); return; }
    try {
      if (editVet) {
        await api.put(`/admin/vets/${editVet.id}`, formData);
        setVets(vets.map(v => v.id === editVet.id ? { ...v, ...formData } : v));
      } else {
        const response = await api.post('/admin/vets', formData);
        setVets([...vets, response.data]);
      }
      setShowModal(false);
      resetForm();
    } catch (error) { Alert.alert('Error', 'Failed to save'); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Vet', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/admin/vets/${id}`); setVets(vets.filter(v => v.id !== id)); } catch { Alert.alert('Error', 'Failed'); }
      }}
    ]);
  };

  const resetForm = () => { setFormData({ name: '', specialty: '', experience: '', phone: '', location: '', rating: '', image: '' }); setEditVet(null); };

  const openEdit = (vet: any) => {
    setFormData({ name: vet.name || '', specialty: vet.specialty || '', experience: vet.experience?.toString() || '', phone: vet.phone || '', location: vet.location || '', rating: vet.rating?.toString() || '', image: vet.image || '' });
    setEditVet(vet);
    setShowModal(true);
  };

  const renderVet = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.card, Shadow.small]} onPress={() => openEdit(item)}>
      <View style={styles.avatar}>
        {item.image ? <Image source={{ uri: item.image }} style={styles.avatarImage} /> : <Ionicons name="person" size={32} color={Colors.white} />}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.specialty}>{item.specialty}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color={Colors.warning} />
          <Text style={styles.rating}>{item.rating || '4.5'}</Text>
          <Text style={styles.experience}>{item.experience}+ yrs</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id)}><Ionicons name="trash-outline" size={20} color={Colors.error} /></TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Veterinarians</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowModal(true); }}><Ionicons name="add" size={24} color={Colors.white} /></TouchableOpacity>
      </View>
      <FlatList data={vets} renderItem={renderVet} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />} ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="medical-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No vets</Text></View>} />
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editVet ? 'Edit Vet' : 'Add Vet'}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}><Ionicons name="close" size={24} color={Colors.text} /></TouchableOpacity>
            </View>
            <View style={styles.modalForm}>
              <Input label="Name *" value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} />
              <Input label="Specialty" value={formData.specialty} onChangeText={(t) => setFormData({ ...formData, specialty: t })} />
              <Input label="Experience (years)" value={formData.experience} onChangeText={(t) => setFormData({ ...formData, experience: t })} keyboardType="numeric" />
              <Input label="Phone" value={formData.phone} onChangeText={(t) => setFormData({ ...formData, phone: t })} />
              <Input label="Location" value={formData.location} onChangeText={(t) => setFormData({ ...formData, location: t })} />
              <Input label="Image URL" value={formData.image} onChangeText={(t) => setFormData({ ...formData, image: t })} />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}><LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.saveGradient}><Text style={styles.saveText}>{editVet ? 'Update' : 'Add'}</Text></LinearGradient></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  addButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: Spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: 60, height: 60 },
  info: { flex: 1, marginLeft: Spacing.md },
  name: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  specialty: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, gap: 4 },
  rating: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  experience: { fontSize: FontSize.sm, color: Colors.textSecondary, marginLeft: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, paddingBottom: Spacing.xxl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  modalForm: { gap: Spacing.sm },
  saveButton: { marginTop: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  saveGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  saveText: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.white },
});
