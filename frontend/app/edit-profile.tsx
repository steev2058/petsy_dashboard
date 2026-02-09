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
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);

  const hasChanges = useMemo(() => {
    return (
      (name || '') !== (user?.name || '') ||
      (phone || '') !== (user?.phone || '') ||
      (city || '') !== (user?.city || '') ||
      (bio || '') !== (user?.bio || '') ||
      (avatar || '') !== (user?.avatar || '')
    );
  }, [name, phone, city, bio, avatar, user]);

  const profileCompletion = useMemo(() => {
    const fields = [name, user?.email, phone, city, bio, avatar];
    const filled = fields.filter((f) => !!(f && String(f).trim())).length;
    return Math.round((filled / fields.length) * 100);
  }, [name, user?.email, phone, city, bio, avatar]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required');
      return;
    }

    if (phone.trim() && !/^\+?[0-9\s-]{7,20}$/.test(phone.trim())) {
      Alert.alert('Validation', 'Please enter a valid phone number');
      return;
    }

    if (bio.trim().length > 160) {
      Alert.alert('Validation', 'Bio must be 160 characters or less');
      return;
    }

    if (avatar.trim() && !/^https?:\/\//i.test(avatar.trim())) {
      Alert.alert('Validation', 'Avatar URL must start with http:// or https://');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        city: city.trim() || null,
        bio: bio.trim() || null,
        avatar: avatar.trim() || null,
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
          <Text style={styles.avatarHint}>Use an avatar image URL for now</Text>

          <View style={styles.progressBox}>
            <Text style={styles.progressTitle}>Profile completeness</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${profileCompletion}%` }]} />
            </View>
            <Text style={styles.progressText}>{profileCompletion}% complete</Text>
          </View>

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
          <Input label="Avatar URL" value={avatar} onChangeText={setAvatar} placeholder="https://..." autoCapitalize="none" />
          <Input
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about you"
            multiline
            numberOfLines={4}
            maxLength={160}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
          <Text style={styles.bioCount}>{bio.length}/160</Text>

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
  progressBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  progressTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: Colors.backgroundDark,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  progressText: {
    marginTop: Spacing.xs,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  bioCount: {
    textAlign: 'right',
    color: Colors.textSecondary,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
    fontSize: FontSize.xs,
  },
  saveButton: { marginTop: Spacing.md },
});
