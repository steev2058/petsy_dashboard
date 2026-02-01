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
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { healthAPI } from '../src/services/api';
import { useStore } from '../src/store/useStore';
import { useTranslation } from '../src/hooks/useTranslation';

const RECORD_TYPES = [
  { id: 'vaccination', label: 'Vaccination', icon: 'medical', color: '#10B981' },
  { id: 'vet_visit', label: 'Vet Visit', icon: 'medkit', color: '#6366F1' },
  { id: 'medication', label: 'Medication', icon: 'fitness', color: '#F59E0B' },
  { id: 'weight', label: 'Weight', icon: 'scale', color: '#EC4899' },
  { id: 'other', label: 'Other', icon: 'document-text', color: '#8B5CF6' },
];

interface HealthRecord {
  id: string;
  pet_id: string;
  record_type: string;
  title: string;
  description?: string;
  date: string;
  vet_name?: string;
  clinic_name?: string;
  next_due_date?: string;
  notes?: string;
}

export default function HealthRecordsScreen() {
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { t, isRTL } = useTranslation();
  const { isAuthenticated, myPets } = useStore();
  
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState('vaccination');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    vet_name: '',
    clinic_name: '',
    next_due_date: '',
    notes: '',
  });

  const currentPet = myPets.find(p => p.id === petId);

  useEffect(() => {
    if (petId) {
      loadRecords();
    }
  }, [petId]);

  const loadRecords = async () => {
    try {
      const response = await healthAPI.getByPetId(petId as string);
      setRecords(response.data);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  }, [petId]);

  const handleAddRecord = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    try {
      await healthAPI.create({
        pet_id: petId,
        record_type: selectedType,
        ...formData,
      });
      setShowAddModal(false);
      setFormData({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        vet_name: '',
        clinic_name: '',
        next_due_date: '',
        notes: '',
      });
      loadRecords();
      Alert.alert('Success', 'Health record added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add record');
    }
  };

  const getTypeConfig = (type: string) => {
    return RECORD_TYPES.find(t => t.id === type) || RECORD_TYPES[4];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderRecord = ({ item, index }: { item: HealthRecord; index: number }) => {
    const typeConfig = getTypeConfig(item.record_type);
    
    return (
      <Animated.View entering={FadeInDown.delay(index * 100)}>
        <TouchableOpacity style={[styles.recordCard, Shadow.small]}>
          <View style={[styles.recordIcon, { backgroundColor: typeConfig.color + '20' }]}>
            <Ionicons name={typeConfig.icon as any} size={24} color={typeConfig.color} />
          </View>
          <View style={styles.recordContent}>
            <View style={styles.recordHeader}>
              <Text style={styles.recordTitle}>{item.title}</Text>
              <Text style={styles.recordDate}>{formatDate(item.date)}</Text>
            </View>
            <Text style={styles.recordType}>{typeConfig.label}</Text>
            {item.vet_name && (
              <Text style={styles.recordVet}>
                <Ionicons name="person" size={12} /> {item.vet_name}
              </Text>
            )}
            {item.next_due_date && (
              <View style={styles.nextDueBadge}>
                <Ionicons name="calendar" size={12} color={Colors.warning} />
                <Text style={styles.nextDueText}>Next: {formatDate(item.next_due_date)}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Health Records</Text>
          {currentPet && <Text style={styles.subtitle}>{currentPet.name}</Text>}
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.addButtonGradient}
          >
            <Ionicons name="add" size={24} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {RECORD_TYPES.slice(0, 4).map((type) => {
          const count = records.filter(r => r.record_type === type.id).length;
          return (
            <View key={type.id} style={[styles.statCard, Shadow.small]}>
              <View style={[styles.statIcon, { backgroundColor: type.color + '20' }]}>
                <Ionicons name={type.icon as any} size={18} color={type.color} />
              </View>
              <Text style={styles.statCount}>{count}</Text>
              <Text style={styles.statLabel}>{type.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Records List */}
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={renderRecord}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-text" size={48} color={Colors.white} />
            </View>
            <Text style={styles.emptyTitle}>No Records Yet</Text>
            <Text style={styles.emptyText}>Start tracking your pet's health by adding records</Text>
          </View>
        }
      />

      {/* Add Record Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Add Health Record</Text>
              
              {/* Record Type Selection */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                {RECORD_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeButton,
                      selectedType === type.id && { backgroundColor: type.color },
                    ]}
                    onPress={() => setSelectedType(type.id)}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={18}
                      color={selectedType === type.id ? Colors.white : type.color}
                    />
                    <Text style={[
                      styles.typeButtonText,
                      selectedType === type.id && { color: Colors.white },
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Title *"
                  placeholderTextColor={Colors.textLight}
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Date (YYYY-MM-DD) *"
                  placeholderTextColor={Colors.textLight}
                  value={formData.date}
                  onChangeText={(text) => setFormData({ ...formData, date: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Veterinarian Name"
                  placeholderTextColor={Colors.textLight}
                  value={formData.vet_name}
                  onChangeText={(text) => setFormData({ ...formData, vet_name: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Clinic Name"
                  placeholderTextColor={Colors.textLight}
                  value={formData.clinic_name}
                  onChangeText={(text) => setFormData({ ...formData, clinic_name: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Next Due Date (YYYY-MM-DD)"
                  placeholderTextColor={Colors.textLight}
                  value={formData.next_due_date}
                  onChangeText={(text) => setFormData({ ...formData, next_due_date: text })}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Notes"
                  placeholderTextColor={Colors.textLight}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  multiline
                  numberOfLines={3}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleAddRecord}>
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    style={styles.saveButtonGradient}
                  >
                    <Text style={styles.saveButtonText}>Save Record</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  backButton: {},
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statCount: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  recordCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  recordIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  recordDate: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  recordType: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    marginTop: 2,
  },
  recordVet: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  nextDueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warning + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  nextDueText: {
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  typeSelector: {
    marginBottom: Spacing.md,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundDark,
    marginRight: Spacing.sm,
  },
  typeButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundDark,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  saveButton: {
    flex: 2,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.white,
  },
});
