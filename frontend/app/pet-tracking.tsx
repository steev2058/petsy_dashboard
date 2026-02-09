import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { petTagsAPI, petsAPI } from '../src/services/api';
import { useStore } from '../src/store/useStore';
import { useTranslation } from '../src/hooks/useTranslation';

export default function PetTrackingScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { isAuthenticated, myPets } = useStore();
  
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [petTag, setPetTag] = useState<any>(null);
  const [tagCode, setTagCode] = useState('');
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [pets, setPets] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPets();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedPet) {
      loadPetTag();
    }
  }, [selectedPet]);

  const loadPets = async () => {
    try {
      const response = await petsAPI.getMyPets();
      setPets(response.data);
      if (response.data.length > 0) {
        setSelectedPet(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  const loadPetTag = async () => {
    try {
      const response = await petTagsAPI.getByPetId(selectedPet.id);
      setPetTag(response.data);
      if (response.data) {
        loadScans();
      }
    } catch (error) {
      console.error('Error loading pet tag:', error);
      setPetTag(null);
    }
  };

  const loadScans = async () => {
    try {
      const response = await petTagsAPI.getScans(selectedPet.id);
      setScans(response.data);
    } catch (error) {
      console.error('Error loading scans:', error);
    }
  };

  const handleRegisterTag = async () => {
    if (!tagCode.trim()) {
      Alert.alert('Error', 'Please enter a tag code');
      return;
    }

    setLoading(true);
    try {
      await petTagsAPI.register({
        pet_id: selectedPet.id,
        tag_code: tagCode.trim(),
      });
      Alert.alert('Success', 'Pet tag registered successfully!');
      setShowRegister(false);
      setTagCode('');
      loadPetTag();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to register tag');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!petTag) return;
    
    try {
      await Share.share({
        message: `Scan this Petsy Tag to find my pet: ${selectedPet.name}\nTag Code: ${petTag.tag_code}\nScan URL: https://petsy.app/tag/${petTag.tag_code}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAuthenticated) {
  
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

  return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Pet Tracking</Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.loginRequired}>
          <Ionicons name="location" size={80} color={Colors.primary} />
          <Text style={styles.loginTitle}>Login Required</Text>
          <Text style={styles.loginText}>Please login to access pet tracking</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>Pet Tracking</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Pet Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Pet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.petsRow}>
              {pets.map((pet) => (
                <TouchableOpacity
                  key={pet.id}
                  style={[
                    styles.petCard,
                    selectedPet?.id === pet.id && styles.petCardActive,
                  ]}
                  onPress={() => setSelectedPet(pet)}
                >
                  {pet.image ? (
                    <Image source={{ uri: pet.image }} style={styles.petImage} />
                  ) : (
                    <View style={styles.petImagePlaceholder}>
                      <Ionicons name="paw" size={24} color={Colors.textLight} />
                    </View>
                  )}
                  <Text style={[
                    styles.petName,
                    selectedPet?.id === pet.id && styles.petNameActive,
                  ]}>
                    {pet.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {pets.length === 0 && (
                <TouchableOpacity
                  style={styles.addPetCard}
                  onPress={() => router.push('/add-pet')}
                >
                  <Ionicons name="add" size={32} color={Colors.primary} />
                  <Text style={styles.addPetText}>Add Pet</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>

        {selectedPet && (
          <>
            {/* Tag Status */}
            <Animated.View entering={FadeInDown.delay(100)}>
              <View style={[styles.tagCard, Shadow.medium]}>
                {petTag ? (
                  <>
                    <LinearGradient
                      colors={[Colors.primary, Colors.primaryDark]}
                      style={styles.tagIcon}
                    >
                      <Ionicons name="qr-code" size={40} color={Colors.white} />
                    </LinearGradient>
                    <Text style={styles.tagTitle}>Petsy Tag Active</Text>
                    <Text style={styles.tagCode}>Code: {petTag.tag_code}</Text>
                    <View style={styles.tagStats}>
                      <View style={styles.tagStat}>
                        <Ionicons name="eye" size={18} color={Colors.primary} />
                        <Text style={styles.tagStatValue}>{petTag.scan_count || 0}</Text>
                        <Text style={styles.tagStatLabel}>Scans</Text>
                      </View>
                      <View style={styles.tagStat}>
                        <Ionicons name="time" size={18} color={Colors.success} />
                        <Text style={styles.tagStatValue}>
                          {petTag.last_scanned ? formatDate(petTag.last_scanned) : 'Never'}
                        </Text>
                        <Text style={styles.tagStatLabel}>Last Scan</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                      <Ionicons name="share-social" size={20} color={Colors.primary} />
                      <Text style={styles.shareText}>Share Tag</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.noTagIcon}>
                      <Ionicons name="qr-code-outline" size={48} color={Colors.textLight} />
                    </View>
                    <Text style={styles.noTagTitle}>No Tag Registered</Text>
                    <Text style={styles.noTagText}>Register a Petsy Tag to track your pet</Text>
                    <TouchableOpacity
                      style={styles.registerButton}
                      onPress={() => setShowRegister(true)}
                    >
                      <LinearGradient
                        colors={[Colors.primary, Colors.primaryDark]}
                        style={styles.registerGradient}
                      >
                        <Ionicons name="add" size={20} color={Colors.white} />
                        <Text style={styles.registerText}>Register Tag</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </Animated.View>

            {/* Scan History */}
            {petTag && scans.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Scan History</Text>
                {scans.map((scan, index) => (
                  <Animated.View key={scan.id} entering={FadeInDown.delay(index * 50)}>
                    <View style={[styles.scanCard, Shadow.small]}>
                      <View style={styles.scanIcon}>
                        <Ionicons name="locate" size={20} color={Colors.primary} />
                      </View>
                      <View style={styles.scanContent}>
                        <Text style={styles.scanLocation}>
                          {scan.location || 'Unknown location'}
                        </Text>
                        <Text style={styles.scanTime}>{formatDate(scan.created_at)}</Text>
                        {scan.scanner_name && (
                          <Text style={styles.scannerInfo}>
                            Scanned by: {scan.scanner_name}
                          </Text>
                        )}
                      </View>
                    </View>
                  </Animated.View>
                ))}
              </View>
            )}

            {/* How It Works */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How It Works</Text>
              <View style={styles.stepsContainer}>
                {[
                  { icon: 'pricetag', title: 'Get a Tag', desc: 'Purchase a Petsy Tag for your pet' },
                  { icon: 'qr-code', title: 'Register', desc: 'Link the tag to your pet profile' },
                  { icon: 'scan', title: 'Anyone Scans', desc: 'Finder scans tag to see your info' },
                  { icon: 'notifications', title: 'Get Notified', desc: 'Receive alerts when tag is scanned' },
                ].map((step, index) => (
                  <View key={index} style={styles.stepItem}>
                    <View style={[styles.stepIcon, { backgroundColor: Colors.primary + '15' }]}>
                      <Ionicons name={step.icon as any} size={20} color={Colors.primary} />
                    </View>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Register Modal */}
      {showRegister && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, Shadow.large]}>
            <Text style={styles.modalTitle}>Register Petsy Tag</Text>
            <Text style={styles.modalSubtitle}>Enter the code from your Petsy Tag</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="Enter tag code (e.g., PETSY-ABC123)"
              placeholderTextColor={Colors.textLight}
              value={tagCode}
              onChangeText={setTagCode}
              autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowRegister(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleRegisterTag}
                disabled={loading}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={styles.confirmGradient}
                >
                  <Text style={styles.confirmText}>
                    {loading ? 'Registering...' : 'Register'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  petsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  petCard: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 80,
  },
  petCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  petImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  petImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  petNameActive: {
    color: Colors.primary,
  },
  addPetCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    minWidth: 80,
    minHeight: 90,
  },
  addPetText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  tagCard: {
    margin: Spacing.md,
    padding: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  tagIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tagTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  tagCode: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  tagStats: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  tagStat: {
    alignItems: 'center',
  },
  tagStatValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  tagStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '15',
  },
  shareText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  noTagIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  noTagTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  noTagText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  registerButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  registerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  registerText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.white,
  },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  scanIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  scanLocation: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  scanTime: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scannerInfo: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    marginTop: 2,
  },
  stepsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  stepItem: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stepTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  codeInput: {
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundDark,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  confirmButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  confirmGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.white,
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
    fontSize: FontSize.lg,
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
