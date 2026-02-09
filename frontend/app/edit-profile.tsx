import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from '../src/components';
import { Colors, FontSize, Spacing, BorderRadius } from '../src/constants/theme';
import { authAPI } from '../src/services/api';
import { useStore } from '../src/store/useStore';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useStore();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [loading, setLoading] = useState(false);

  const hasChanges = useMemo(() => {
    return (
      (name || '') !== (user?.name || '') ||
      (phone || '') !== (user?.phone || '') ||
      (city || '') !== (user?.city || '') ||
      (bio || '') !== (user?.bio || '')
    );
  }, [name, phone, city, bio, user]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        city: city.trim() || null,
        bio: bio.trim() || null,
      });

      setUser(response.data);
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Update Failed', error?.response?.data?.detail || 'Could not update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={42} color={Colors.white} />
          </View>
          <Text style={styles.avatarHint}>Avatar upload can be added next</Text>

          <Input label="Name" value={name} onChangeText={setName} placeholder="Your full name" />
          <Input
            label="Email"
            value={user?.email || ''}
            editable={false}
            placeholder="Email"
            containerStyle={{ opacity: 0.65 }}
          />
          <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="+963 ..." keyboardType="phone-pad" />
          <Input label="City" value={city} onChangeText={setCity} placeholder="Your city" />
          <Input
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about you"
            multiline
            numberOfLines={4}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />

          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={loading}
            disabled={!hasChanges || loading}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundDark,
  },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  content: { padding: Spacing.lg, paddingBottom: 120 },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarHint: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    fontSize: FontSize.sm,
  },
  saveButton: { marginTop: Spacing.md },
});
