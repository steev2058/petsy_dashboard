import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, PetCard } from '../../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { useStore } from '../../src/store/useStore';
import { petsAPI, loyaltyAPI } from '../../src/services/api';
import { useTranslation } from '../../src/hooks/useTranslation';

const TIER_COLORS: Record<string, string[]> = {
  bronze: ['#CD7F32', '#B87333'],
  silver: ['#C0C0C0', '#A8A9AD'],
  gold: ['#FFD700', '#FFC000'],
  platinum: ['#E5E4E2', '#B8B8B8'],
};

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, logout, isAuthenticated, language, setLanguage } = useStore();
  const [myPets, setMyPets] = useState<any[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState({
    total_points: 0,
    lifetime_points: 0,
    tier: 'bronze',
    points_value: 0,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, logout, isAuthenticated, language, setLanguage } = useStore();
  const [myPets, setMyPets] = useState<any[]>([]);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ar' : 'en';
    setLanguage(newLang);
    Alert.alert(
      newLang === 'ar' ? 'تم تغيير اللغة' : 'Language Changed',
      newLang === 'ar' ? 'تم تغيير اللغة إلى العربية' : 'Language changed to English'
    );
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadMyPets();
      loadLoyaltyPoints();
    }
  }, [isAuthenticated]);

  const loadMyPets = async () => {
    try {
      const response = await petsAPI.getMyPets();
      setMyPets(response.data);
    } catch (error) {
      console.error('Error loading my pets:', error);
    }
  };

  const loadLoyaltyPoints = async () => {
    try {
      const response = await loyaltyAPI.getPoints();
      setLoyaltyPoints(response.data);
    } catch (error) {
      console.log('Error loading loyalty points:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.notLoggedIn}>
          <View style={styles.notLoggedInIcon}>
            <Ionicons name="person" size={64} color={Colors.textLight} />
          </View>
          <Text style={styles.notLoggedInTitle}>Welcome to Petsy</Text>
          <Text style={styles.notLoggedInText}>
            Login to manage your pets, favorites, and more
          </Text>
          <Button
            title="Login"
            onPress={() => router.push('/(auth)/login')}
            style={styles.loginButton}
          />
          <Button
            title="Sign Up"
            onPress={() => router.push('/(auth)/signup')}
            variant="outline"
          />
        </View>
      </SafeAreaView>
    );
  }

  const menuItems = [
    { icon: 'paw', label: t('my_pets'), onPress: () => router.push('/add-pet') },
    { icon: 'bag-handle', label: 'Order History', onPress: () => router.push('/order-history') },
    { icon: 'heart', label: t('favorites'), onPress: () => router.push('/favorites') },
    { icon: 'chatbubbles', label: t('messages'), onPress: () => router.push('/messages') },
    { icon: 'calendar', label: t('my_appointments'), onPress: () => router.push('/my-appointments') },
    { icon: 'document-text', label: t('health_records'), onPress: () => {
      if (myPets.length > 0) {
        router.push(`/health-records?petId=${myPets[0].id}`);
      } else {
        Alert.alert('No Pets', 'Add a pet first to track health records');
      }
    }},
    { icon: 'location', label: 'Pet Tracking', onPress: () => router.push('/pet-tracking') },
    { icon: 'globe', label: 'العربية / English', onPress: toggleLanguage },
    { icon: 'moon', label: 'Dark Mode', toggle: true, value: isDarkMode, onToggle: setIsDarkMode },
    { icon: 'settings', label: t('settings'), onPress: () => router.push('/settings') },
    { icon: 'help-circle', label: 'Help & Support', onPress: () => router.push('/help-support') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('my_profile')}</Text>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, Shadow.medium]}>
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={Colors.white} />
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {user?.city && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color={Colors.textSecondary} />
              <Text style={styles.userLocation}>{user.city}</Text>
            </View>
          )}
          <Button
            title={t('edit_profile')}
            onPress={() => {}}
            variant="outline"
            size="small"
            style={styles.editButton}
          />
        </View>

        {/* My Pets Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('my_pets')}</Text>
            <TouchableOpacity onPress={() => router.push('/add-pet')}>
              <Ionicons name="add-circle" size={28} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          {myPets.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {myPets.map((pet) => (
                <View key={pet.id} style={styles.petCardWrapper}>
                  <PetCard
                    pet={pet}
                    onPress={() => router.push(`/pet/${pet.id}`)}
                    compact
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity
              style={styles.addPetCard}
              onPress={() => router.push('/add-pet')}
            >
              <Ionicons name="add" size={40} color={Colors.primary} />
              <Text style={styles.addPetText}>{t('add_pet')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.route ? () => router.push(item.route as any) : item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIcon}>
                  <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  profileCard: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.secondary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  userName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  userEmail: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  userLocation: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  editButton: {
    marginTop: Spacing.md,
  },
  section: {
    marginTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  petCardWrapper: {
    paddingLeft: Spacing.md,
  },
  addPetCard: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  addPetText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '600',
  },
  menuSection: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
  },
  logoutText: {
    fontSize: FontSize.lg,
    color: Colors.error,
    fontWeight: '600',
  },
  notLoggedIn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  notLoggedInIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  notLoggedInTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  notLoggedInText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  loginButton: {
    width: '100%',
    marginBottom: Spacing.md,
  },
});
