import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { communityAPI, lostFoundAPI } from '../src/services/api';
import { useStore } from '../src/store/useStore';
import { useTranslation } from '../src/hooks/useTranslation';

const POST_TYPES = [
  { id: 'question', label: 'Ask Question', icon: 'help-circle', color: '#6366F1' },
  { id: 'story', label: 'Share Story', icon: 'book', color: '#10B981' },
  { id: 'tip', label: 'Share Tip', icon: 'bulb', color: '#F59E0B' },
  { id: 'sponsorship', label: 'Sponsorship', icon: 'heart', color: '#EF4444' },
];

const PET_SPECIES = [
  { id: 'dog', label: 'Dog', icon: 'paw' },
  { id: 'cat', label: 'Cat', icon: 'paw' },
  { id: 'bird', label: 'Bird', icon: 'paw' },
  { id: 'rabbit', label: 'Rabbit', icon: 'paw' },
  { id: 'other', label: 'Other', icon: 'paw' },
];

export default function CreatePostScreen() {
  const router = useRouter();
  const { type: postCategory } = useLocalSearchParams<{ type: 'community' | 'lost' | 'found' }>();
  const { t, isRTL } = useTranslation();
  const { user, isAuthenticated } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('question');
  const [selectedSpecies, setSelectedSpecies] = useState('dog');
  const [image, setImage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    }, 1800);
  };
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    breed: '',
    color: '',
    last_seen_location: '',
    last_seen_date: '',
    contact_phone: user?.phone || '',
  });

  const isLostFound = postCategory === 'lost' || postCategory === 'found';

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to create a post');
      return;
    }

    if (!formData.title.trim()) {
      Alert.alert('Missing Info', 'Please enter a title');
      return;
    }

    if (!formData.content.trim()) {
      Alert.alert('Missing Info', 'Please enter content');
      return;
    }

    if (isLostFound && !formData.last_seen_location.trim()) {
      Alert.alert('Missing Info', 'Please enter the last seen location');
      return;
    }

    setLoading(true);
    try {
      if (isLostFound) {
        await lostFoundAPI.create({
          type: postCategory,
          pet_species: selectedSpecies,
          breed: formData.breed,
          color: formData.color,
          description: formData.content,
          last_seen_location: formData.last_seen_location,
          last_seen_date: formData.last_seen_date || new Date().toISOString().split('T')[0],
          contact_phone: formData.contact_phone,
          image: image,
        });
        showToast(`Your ${postCategory} pet report has been posted`, 'success');
        setTimeout(() => {
          router.replace('/lost-found');
        }, 900);
      } else {
        await communityAPI.create({
          type: selectedType,
          title: formData.title,
          content: formData.content,
          image: image,
        });
        Alert.alert(
          'Success!',
          'Your post has been published',
          [{ text: 'OK', onPress: () => router.replace('/community') }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Create Post</Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.loginRequired}>
          <Ionicons name="person-circle" size={80} color={Colors.primary} />
          <Text style={styles.loginTitle}>Login Required</Text>
          <Text style={styles.loginText}>Please login to create posts</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.loginGradient}
            >
              <Text style={styles.loginButtonText}>Login Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {toast.visible && (
        <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
          <Ionicons name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={16} color={Colors.white} />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isLostFound ? `Report ${postCategory === 'lost' ? 'Lost' : 'Found'} Pet` : 'Create Post'}
          </Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Post Type Selection (Community only) */}
          {!isLostFound && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Post Type</Text>
              <View style={styles.typeGrid}>
                {POST_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeCard,
                      selectedType === type.id && { borderColor: type.color, borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedType(type.id)}
                  >
                    <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
                      <Ionicons name={type.icon as any} size={24} color={type.color} />
                    </View>
                    <Text style={styles.typeLabel}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Pet Species (Lost & Found only) */}
          {isLostFound && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pet Species</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.speciesRow}>
                  {PET_SPECIES.map((species) => (
                    <TouchableOpacity
                      key={species.id}
                      style={[
                        styles.speciesButton,
                        selectedSpecies === species.id && styles.speciesButtonActive,
                      ]}
                      onPress={() => setSelectedSpecies(species.id)}
                    >
                      <Ionicons
                        name={species.icon as any}
                        size={18}
                        color={selectedSpecies === species.id ? Colors.white : Colors.primary}
                      />
                      <Text
                        style={[
                          styles.speciesText,
                          selectedSpecies === species.id && styles.speciesTextActive,
                        ]}
                      >
                        {species.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Image Upload */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photo</Text>
            <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image }} style={styles.uploadedImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera" size={40} color={Colors.textLight} />
                  <Text style={styles.uploadText}>Tap to add photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isLostFound ? 'Description Title' : 'Title'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={isLostFound ? 'e.g., Golden Retriever lost in Downtown' : 'Enter title...'}
              placeholderTextColor={Colors.textLight}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
          </View>

          {/* Lost & Found specific fields */}
          {isLostFound && (
            <>
              <View style={styles.row}>
                <View style={[styles.section, { flex: 1 }]}>
                  <Text style={styles.sectionTitle}>Breed</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Golden Retriever"
                    placeholderTextColor={Colors.textLight}
                    value={formData.breed}
                    onChangeText={(text) => setFormData({ ...formData, breed: text })}
                  />
                </View>
                <View style={[styles.section, { flex: 1, marginLeft: Spacing.md }]}>
                  <Text style={styles.sectionTitle}>Color</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Golden, Brown"
                    placeholderTextColor={Colors.textLight}
                    value={formData.color}
                    onChangeText={(text) => setFormData({ ...formData, color: text })}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Last Seen Location *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Street, Area, City"
                  placeholderTextColor={Colors.textLight}
                  value={formData.last_seen_location}
                  onChangeText={(text) => setFormData({ ...formData, last_seen_location: text })}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact Phone *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1 234 567 8900"
                  placeholderTextColor={Colors.textLight}
                  value={formData.contact_phone}
                  onChangeText={(text) => setFormData({ ...formData, contact_phone: text })}
                  keyboardType="phone-pad"
                />
              </View>
            </>
          )}

          {/* Content */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={isLostFound 
                ? 'Describe your pet: any distinguishing features, collar, when last seen...'
                : 'Write your post content...'
              }
              placeholderTextColor={Colors.textLight}
              value={formData.content}
              onChangeText={(text) => setFormData({ ...formData, content: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.bottomBar, Shadow.large]}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? [Colors.textLight, Colors.textLight] : [Colors.primary, Colors.primaryDark]}
              style={styles.submitGradient}
            >
              <Ionicons
                name={isLostFound ? 'megaphone' : 'paper-plane'}
                size={20}
                color={Colors.white}
              />
              <Text style={styles.submitText}>
                {loading ? 'Posting...' : isLostFound ? 'Post Report' : 'Publish Post'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  typeLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  speciesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  speciesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  speciesButtonActive: {
    backgroundColor: Colors.primary,
  },
  speciesText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  speciesTextActive: {
    color: Colors.white,
  },
  imageUpload: {
    height: 200,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundDark,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
  },
  bottomBar: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    gap: Spacing.sm,
  },
  submitText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  loginRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loginTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  loginText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  loginButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  loginGradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  toast: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 100,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Shadow.small,
  },
  toastSuccess: {
    backgroundColor: Colors.success,
  },
  toastError: {
    backgroundColor: Colors.error,
  },
  toastText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
});
