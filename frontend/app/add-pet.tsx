import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button, Input } from '../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { petsAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

const SPECIES_OPTIONS = [
  { id: 'dog', label: 'Dog', icon: 'paw' },
  { id: 'cat', label: 'Cat', icon: 'paw' },
  { id: 'bird', label: 'Bird', icon: 'paw' },
  { id: 'fish', label: 'Fish', icon: 'water' },
  { id: 'rabbit', label: 'Rabbit', icon: 'paw' },
  { id: 'other', label: 'Other', icon: 'ellipse' },
];

const STATUS_OPTIONS = [
  { id: 'owned', label: 'My Pet' },
  { id: 'for_adoption', label: 'For Adoption' },
  { id: 'for_sale', label: 'For Sale' },
];

export default function AddPetScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditMode = !!editId;
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    species: 'dog',
    breed: '',
    age: '',
    gender: 'male',
    color: '',
    weight: '',
    description: '',
    status: 'owned',
    price: '',
    location: '',
    vaccinated: false,
    neutered: false,
  });

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ visible: true, message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2200);
  };

  useEffect(() => {
    const loadPetForEdit = async () => {
      if (!editId) return;
      setLoading(true);
      try {
        const res = await petsAPI.getById(editId);
        const p = res.data;
        setFormData({
          name: p.name || '',
          species: p.species || 'dog',
          breed: p.breed || '',
          age: p.age || '',
          gender: p.gender || 'male',
          color: p.color || '',
          weight: p.weight ? String(p.weight) : '',
          description: p.description || '',
          status: p.status || 'owned',
          price: p.price ? String(p.price) : '',
          location: p.location || '',
          vaccinated: !!p.vaccinated,
          neutered: !!p.neutered,
        });
        if (p.image) setImage(p.image);
      } catch (e) {
        Alert.alert('Error', 'Failed to load pet details');
      } finally {
        setLoading(false);
      }
    };
    loadPetForEdit();
  }, [editId]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your pet\'s name');
      return;
    }

    setLoading(true);
    try {
      const petData = {
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        image: image || undefined,
      };

      if (isEditMode && editId) {
        await petsAPI.update(editId, petData);
        showToast('Pet updated successfully', 'success');
      } else {
        await petsAPI.create(petData);
        showToast('Saved successfully', 'success');
      }
      setTimeout(() => router.replace('/my-pets'), 900);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Could not add pet. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{isEditMode ? 'Edit Pet' : t('add_pet')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {toast.visible && (
          <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
            <Ionicons
              name={toast.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
              size={18}
              color={Colors.white}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Image Picker */}
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.petImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={40} color={Colors.textSecondary} />
                <Text style={styles.imageText}>Add Photo</Text>
              </View>
            )}
            <View style={styles.editImageButton}>
              <Ionicons name="pencil" size={16} color={Colors.white} />
            </View>
          </TouchableOpacity>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label={t('pet_name')}
              placeholder="What's your pet's name?"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            {/* Species Selection */}
            <Text style={styles.label}>{t('species')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.optionsScroll}
            >
              {SPECIES_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.speciesOption,
                    formData.species === option.id && styles.speciesOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, species: option.id })}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={24}
                    color={
                      formData.species === option.id ? Colors.white : Colors.primary
                    }
                  />
                  <Text
                    style={[
                      styles.speciesText,
                      formData.species === option.id && styles.speciesTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input
              label={t('breed')}
              placeholder="e.g., Golden Retriever"
              value={formData.breed}
              onChangeText={(text) => setFormData({ ...formData, breed: text })}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label={t('age')}
                  placeholder="e.g., 2 years"
                  value={formData.age}
                  onChangeText={(text) => setFormData({ ...formData, age: text })}
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label={t('weight') + ' (kg)'}
                  placeholder="e.g., 10"
                  value={formData.weight}
                  onChangeText={(text) => setFormData({ ...formData, weight: text })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Gender Selection */}
            <Text style={styles.label}>{t('gender')}</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  formData.gender === 'male' && styles.genderOptionMale,
                ]}
                onPress={() => setFormData({ ...formData, gender: 'male' })}
              >
                <Ionicons
                  name="male"
                  size={24}
                  color={formData.gender === 'male' ? Colors.white : '#4A90D9'}
                />
                <Text
                  style={[
                    styles.genderText,
                    formData.gender === 'male' && styles.genderTextActive,
                  ]}
                >
                  {t('male')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  formData.gender === 'female' && styles.genderOptionFemale,
                ]}
                onPress={() => setFormData({ ...formData, gender: 'female' })}
              >
                <Ionicons
                  name="female"
                  size={24}
                  color={formData.gender === 'female' ? Colors.white : '#E91E8C'}
                />
                <Text
                  style={[
                    styles.genderText,
                    formData.gender === 'female' && styles.genderTextActive,
                  ]}
                >
                  {t('female')}
                </Text>
              </TouchableOpacity>
            </View>

            <Input
              label={t('color')}
              placeholder="e.g., Golden"
              value={formData.color}
              onChangeText={(text) => setFormData({ ...formData, color: text })}
            />

            <Input
              label={t('description')}
              placeholder="Tell us about your pet..."
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={4}
              style={{ height: 100, textAlignVertical: 'top' }}
            />

            {/* Status Selection */}
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.statusOption,
                    formData.status === option.id && styles.statusOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, status: option.id })}
                >
                  <Text
                    style={[
                      styles.statusText,
                      formData.status === option.id && styles.statusTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {formData.status === 'for_sale' && (
              <Input
                label="Price ($)"
                placeholder="Enter price"
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                keyboardType="numeric"
              />
            )}

            <Input
              label="Location"
              placeholder="City, Country"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
            />

            {/* Health Checkboxes */}
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() =>
                  setFormData({ ...formData, vaccinated: !formData.vaccinated })
                }
              >
                <View
                  style={[
                    styles.checkboxBox,
                    formData.vaccinated && styles.checkboxBoxActive,
                  ]}
                >
                  {formData.vaccinated && (
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>{t('vaccinated')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkbox}
                onPress={() =>
                  setFormData({ ...formData, neutered: !formData.neutered })
                }
              >
                <View
                  style={[
                    styles.checkboxBox,
                    formData.neutered && styles.checkboxBoxActive,
                  ]}
                >
                  {formData.neutered && (
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>{t('neutered')}</Text>
              </TouchableOpacity>
            </View>

            <Button
              title={isEditMode ? 'Update Pet' : t('save')}
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
            />
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  toast: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastSuccess: { backgroundColor: '#22c55e' },
  toastError: { backgroundColor: Colors.error },
  toastText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  imagePicker: {
    alignSelf: 'center',
    marginVertical: Spacing.lg,
    position: 'relative',
  },
  petImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  imagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  imageText: {
    marginTop: Spacing.xs,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  form: {
    paddingHorizontal: Spacing.md,
  },
  label: {
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.sm,
    fontWeight: '500',
  },
  optionsScroll: {
    marginBottom: Spacing.md,
  },
  speciesOption: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundDark,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  speciesOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  speciesText: {
    marginTop: Spacing.xs,
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  speciesTextActive: {
    color: Colors.white,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundDark,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  genderOptionMale: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  genderOptionFemale: {
    backgroundColor: '#E91E8C',
    borderColor: '#E91E8C',
  },
  genderText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  genderTextActive: {
    color: Colors.white,
  },
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statusOption: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundDark,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  statusTextActive: {
    color: Colors.white,
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginVertical: Spacing.md,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkboxLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  submitButton: {
    marginTop: Spacing.lg,
  },
});
