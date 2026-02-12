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
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { healthAPI, petsAPI, careAPI } from '../src/services/api';
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
  attachments?: string[];
}

interface FollowUpForm {
  title: string;
  description: string;
  location: string;
  priority: 'low' | 'normal' | 'high';
  follow_up_context: string;
  follow_up_due_date: string;
  reminder_enabled: boolean;
  attachments: string[];
}

export default function HealthRecordsScreen() {
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { t, isRTL } = useTranslation();
  const { isAuthenticated, myPets } = useStore();
  const [petsList, setPetsList] = useState<any[]>(myPets || []);
  const [selectedPetId, setSelectedPetId] = useState<string | undefined>(petId);
  
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
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

  const [followUpForm, setFollowUpForm] = useState<FollowUpForm>({
    title: 'Follow-up medical review',
    description: '',
    location: '',
    priority: 'normal',
    follow_up_context: '',
    follow_up_due_date: '',
    reminder_enabled: true,
    attachments: [],
  });

  const currentPet = petsList.find(p => p.id === selectedPetId);

  useEffect(() => {
    const initPets = async () => {
      try {
        const source = (myPets && myPets.length > 0) ? myPets : (await petsAPI.getMyPets()).data;
        setPetsList(source || []);
        if (!selectedPetId && source?.length) setSelectedPetId(source[0].id);
      } catch (e) {
        console.error('Error loading pets for health records:', e);
      }
    };
    initPets();
  }, []);

  useEffect(() => {
    if (petId) setSelectedPetId(petId);
  }, [petId]);

  useEffect(() => {
    if (selectedPetId) loadRecords(selectedPetId);
    else setLoading(false);
  }, [selectedPetId]);

  const loadRecords = async (targetPetId?: string) => {
    if (!targetPetId) return;
    try {
      const response = await healthAPI.getByPetId(targetPetId);
      setRecords(response.data);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecords(selectedPetId);
    setRefreshing(false);
  }, [selectedPetId]);

  const handleAddRecord = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    try {
      if (!selectedPetId) {
        Alert.alert('No pet selected', 'Please select a pet first');
        return;
      }
      await healthAPI.create({
        pet_id: selectedPetId,
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
      loadRecords(selectedPetId);
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

  const addFollowUpAttachment = async () => {
    try {
      setUploadingAttachment(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.4,
        base64: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Upload failed', 'Could not read file. Please try another image.');
        return;
      }
      const mime = asset.mimeType || 'image/jpeg';
      const dataUrl = `data:${mime};base64,${asset.base64}`;
      setFollowUpForm((prev) => ({ ...prev, attachments: [...prev.attachments, dataUrl].slice(0, 4) }));
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Attachment upload is not available on this device.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const submitFollowUpRequest = async () => {
    if (!selectedPetId) {
      Alert.alert('No pet selected', 'Please select a pet first');
      return;
    }
    if (!followUpForm.description.trim()) {
      Alert.alert('Missing details', 'Please describe symptoms or what follow-up is needed.');
      return;
    }
    if (followUpForm.reminder_enabled && !followUpForm.follow_up_due_date.trim()) {
      Alert.alert('Reminder date required', 'Set a follow-up due date to enable reminder.');
      return;
    }
    try {
      setSavingFollowUp(true);
      await careAPI.createRequest({
        pet_id: selectedPetId,
        title: followUpForm.title || 'Follow-up medical review',
        description: followUpForm.description,
        location: followUpForm.location,
        priority: followUpForm.priority,
        follow_up_context: followUpForm.follow_up_context,
        follow_up_due_date: followUpForm.follow_up_due_date || undefined,
        reminder_enabled: followUpForm.reminder_enabled,
        attachments: followUpForm.attachments,
      });
      setShowFollowUpModal(false);
      setFollowUpForm({
        title: 'Follow-up medical review',
        description: '',
        location: '',
        priority: 'normal',
        follow_up_context: '',
        follow_up_due_date: '',
        reminder_enabled: true,
        attachments: [],
      });
      Alert.alert('Submitted', 'Your follow-up request is now visible to clinic/vet team.');
    } catch (error: any) {
      Alert.alert('Failed to submit', error?.response?.data?.detail || 'Please try again in a moment.');
    } finally {
      setSavingFollowUp(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loaderText}>Loading data...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            {!!item.attachments?.length && (
              <Text style={styles.recordAttachmentText}>
                <Ionicons name="attach" size={12} /> {item.attachments.length} attachment(s)
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
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.followUpButton}
            onPress={() => setShowFollowUpModal(true)}
          >
            <Ionicons name="paper-plane" size={18} color={Colors.primary} />
          </TouchableOpacity>
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
      </View>

      {/* Pet selector */}
      {petsList.length > 0 && (
        <View style={styles.petSelectSection}>
          <Text style={styles.petSelectTitle}>Select Pet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petSelectorRow}>
            {petsList.map((pet) => (
              <TouchableOpacity
                key={pet.id}
                style={[styles.petCard, selectedPetId === pet.id && styles.petCardActive]}
                onPress={() => setSelectedPetId(pet.id)}
              >
                <View style={styles.petAvatarWrap}>
                  {pet.image ? (
                    <Image source={{ uri: pet.image }} style={styles.petAvatar} />
                  ) : (
                    <View style={styles.petAvatarPlaceholder}>
                      <Ionicons name="paw" size={20} color={Colors.textLight} />
                    </View>
                  )}
                </View>
                <Text style={[styles.petName, selectedPetId === pet.id && styles.petNameActive]} numberOfLines={1}>{pet.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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
            <Text style={styles.emptyText}>Start tracking your pet&apos;s health by adding records</Text>
          </View>
        }
      />

      {/* Follow-up Request Modal */}
      <Modal visible={showFollowUpModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Request Vet Follow-up</Text>
              <Text style={styles.followUpHint}>Share symptoms, attach photos, and set a reminder. Vet/clinic team will see this context.</Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Short title"
                  placeholderTextColor={Colors.textLight}
                  value={followUpForm.title}
                  onChangeText={(text) => setFollowUpForm((prev) => ({ ...prev, title: text }))}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Symptoms or concern *"
                  placeholderTextColor={Colors.textLight}
                  multiline
                  value={followUpForm.description}
                  onChangeText={(text) => setFollowUpForm((prev) => ({ ...prev, description: text }))}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Follow-up context (what changed since last visit)"
                  placeholderTextColor={Colors.textLight}
                  multiline
                  value={followUpForm.follow_up_context}
                  onChangeText={(text) => setFollowUpForm((prev) => ({ ...prev, follow_up_context: text }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Location (optional)"
                  placeholderTextColor={Colors.textLight}
                  value={followUpForm.location}
                  onChangeText={(text) => setFollowUpForm((prev) => ({ ...prev, location: text }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Follow-up due date YYYY-MM-DD"
                  placeholderTextColor={Colors.textLight}
                  value={followUpForm.follow_up_due_date}
                  onChangeText={(text) => setFollowUpForm((prev) => ({ ...prev, follow_up_due_date: text }))}
                />

                <View style={styles.attachmentHeader}>
                  <Text style={styles.attachmentTitle}>Medical Attachments ({followUpForm.attachments.length}/4)</Text>
                  <TouchableOpacity style={styles.attachmentBtn} disabled={uploadingAttachment || followUpForm.attachments.length >= 4} onPress={addFollowUpAttachment}>
                    {uploadingAttachment ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={styles.attachmentBtnText}>Upload image</Text>}
                  </TouchableOpacity>
                </View>
                {followUpForm.attachments.map((_, idx) => (
                  <View key={`${idx}`} style={styles.attachmentRow}>
                    <Text style={styles.attachmentRowText}>Attachment #{idx + 1}</Text>
                    <TouchableOpacity onPress={() => setFollowUpForm((prev) => ({ ...prev, attachments: prev.attachments.filter((__, i) => i !== idx) }))}>
                      <Ionicons name="close-circle" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowFollowUpModal(false)} disabled={savingFollowUp}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={submitFollowUpRequest} disabled={savingFollowUp}>
                  <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.saveButtonGradient}>
                    {savingFollowUp ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.saveButtonText}>Send to Vet</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  followUpButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
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
  petSelectSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  petSelectTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  petSelectorRow: {
    gap: Spacing.sm,
    paddingBottom: 2,
  },
  petCard: {
    width: 106,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
  },
  petCardActive: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  petAvatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    marginBottom: 8,
  },
  petAvatar: {
    width: '100%',
    height: '100%',
  },
  petAvatarPlaceholder: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petName: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  petNameActive: {
    color: Colors.primary,
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
  recordAttachmentText: {
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
    marginBottom: Spacing.sm,
  },
  followUpHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
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
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  attachmentTitle: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  attachmentBtn: {
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  attachmentBtnText: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  attachmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    marginBottom: Spacing.xs,
  },
  attachmentRowText: {
    color: Colors.text,
    fontSize: FontSize.sm,
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
  loaderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: Spacing.sm,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
});
