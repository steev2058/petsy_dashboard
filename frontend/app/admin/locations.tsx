import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import api from '../../src/services/api';
import { Input } from '../../src/components';

const LOCATION_TYPES = ['clinic', 'pet_shop', 'shelter', 'park', 'grooming'];

export default function AdminLocationsScreen() {
  const router = useRouter();
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editLoc, setEditLoc] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', type: 'clinic', address: '', city: '', phone: '', latitude: '', longitude: '' });

  useEffect(() => { loadLocations(); }, []);

  const loadLocations = async () => {
    try {
      const response = await api.get('/admin/locations');
      setLocations(response.data || []);
    } catch (error) {
      console.log('Error:', error);
    } finally { setLoading(false); }
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadLocations(); setRefreshing(false); }, []);

  const handleSave = async () => {
    if (!formData.name) { Alert.alert('Error', 'Name is required'); return; }
    try {
      const data = { ...formData, latitude: parseFloat(formData.latitude) || 0, longitude: parseFloat(formData.longitude) || 0 };
      if (editLoc) {
        await api.put(`/admin/locations/${editLoc.id}`, data);
        setLocations(locations.map(l => l.id === editLoc.id ? { ...l, ...data } : l));
      } else {
        const response = await api.post('/admin/locations', data);
        setLocations([...locations, response.data]);
      }
      setShowModal(false);
      resetForm();
    } catch (error) { Alert.alert('Error', 'Failed to save'); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Location', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/admin/locations/${id}`); setLocations(locations.filter(l => l.id !== id)); } catch { Alert.alert('Error', 'Failed'); }
      }}
    ]);
  };

  const resetForm = () => { setFormData({ name: '', type: 'clinic', address: '', city: '', phone: '', latitude: '', longitude: '' }); setEditLoc(null); };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'clinic': return 'medical';
      case 'pet_shop': return 'storefront';
      case 'shelter': return 'home';
      case 'park': return 'leaf';
      case 'grooming': return 'cut';
      default: return 'location';
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'clinic': return '#EF4444';
      case 'pet_shop': return '#10B981';
      case 'shelter': return '#6366F1';
      case 'park': return '#84CC16';
      case 'grooming': return '#EC4899';
      default: return Colors.primary;
    }
  };

  const renderLocation = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.card, Shadow.small]} onPress={() => { setFormData({ name: item.name || '', type: item.type || 'clinic', address: item.address || '', city: item.city || '', phone: item.phone || '', latitude: item.latitude?.toString() || '', longitude: item.longitude?.toString() || '' }); setEditLoc(item); setShowModal(true); }}>
      <View style={[styles.typeIcon, { backgroundColor: getTypeColor(item.type) + '20' }]}>
        <Ionicons name={getTypeIcon(item.type) as any} size={24} color={getTypeColor(item.type)} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.address}>{item.address || item.city}</Text>
        <Text style={styles.type}>{item.type?.replace('_', ' ')}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id)}><Ionicons name="trash-outline" size={20} color={Colors.error} /></TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Locations</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowModal(true); }}><Ionicons name="add" size={24} color={Colors.white} /></TouchableOpacity>
      </View>
      <FlatList data={locations} renderItem={renderLocation} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />} ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="location-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No locations</Text></View>} />
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editLoc ? 'Edit Location' : 'Add Location'}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}><Ionicons name="close" size={24} color={Colors.text} /></TouchableOpacity>
            </View>
            <View style={styles.modalForm}>
              <Input label="Name *" value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} />
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeSelector}>
                {LOCATION_TYPES.map((type) => (
                  <TouchableOpacity key={type} style={[styles.typeOption, formData.type === type && { backgroundColor: getTypeColor(type), borderColor: getTypeColor(type) }]} onPress={() => setFormData({ ...formData, type })}>
                    <Ionicons name={getTypeIcon(type) as any} size={16} color={formData.type === type ? Colors.white : getTypeColor(type)} />
                    <Text style={[styles.typeOptionText, formData.type === type && { color: Colors.white }]}>{type.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input label="Address" value={formData.address} onChangeText={(t) => setFormData({ ...formData, address: t })} />
              <Input label="City" value={formData.city} onChangeText={(t) => setFormData({ ...formData, city: t })} />
              <Input label="Phone" value={formData.phone} onChangeText={(t) => setFormData({ ...formData, phone: t })} />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}><LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.saveGradient}><Text style={styles.saveText}>{editLoc ? 'Update' : 'Add'}</Text></LinearGradient></TouchableOpacity>
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
  typeIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: Spacing.md },
  name: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  address: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  type: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2, textTransform: 'capitalize' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, paddingBottom: Spacing.xxl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  modalForm: { gap: Spacing.sm },
  inputLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginTop: Spacing.sm },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  typeOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  typeOptionText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text, textTransform: 'capitalize' },
  saveButton: { marginTop: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  saveGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  saveText: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.white },
});
