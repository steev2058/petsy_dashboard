import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { useStore } from '../src/store/useStore';
import { authAPI, settingsAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

export default function SettingsScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { language, setLanguage, logout, isAuthenticated, user } = useStore();
  
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationServices, setLocationServices] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await settingsAPI.get();
        const s = res.data || {};
        setNotifications(!!s.push_notifications);
        setDarkMode(!!s.dark_mode);
        setLocationServices(!!s.location_services);
        setEmailUpdates(!!s.email_updates);
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) loadSettings();
    else setLoading(false);
  }, [isAuthenticated]);

  const patchSettings = async (patch: any) => {
    try {
      await settingsAPI.update(patch);
    } catch {
      Alert.alert('Error', 'Failed to save setting');
    }
  };

  const handleLanguageChange = () => {
    const newLang = language === 'en' ? 'ar' : 'en';
    setLanguage(newLang);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'To continue, enter your password on the next page.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => router.push('/delete-account') },
      ]
    );
  };

  const settingSections = [
    {
      title: 'Account',
      items: [
        { icon: 'person', label: 'Edit Profile', onPress: () => router.push('/edit-profile') },
        { icon: 'lock-closed', label: 'Change Password', onPress: () => router.push('/change-password') },
        { icon: 'shield-checkmark', label: 'Privacy Settings', onPress: () => router.push('/privacy-settings') },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'globe',
          label: 'Language',
          value: language === 'en' ? 'English' : 'العربية',
          onPress: handleLanguageChange,
        },
        {
          icon: 'notifications',
          label: 'Push Notifications',
          isSwitch: true,
          switchValue: notifications,
          onSwitch: (value: boolean) => {
            setNotifications(value);
            patchSettings({ push_notifications: value });
          },
        },
        {
          icon: 'moon',
          label: 'Dark Mode',
          isSwitch: true,
          switchValue: darkMode,
          onSwitch: (value: boolean) => {
            setDarkMode(value);
            patchSettings({ dark_mode: value });
          },
        },
        {
          icon: 'location',
          label: 'Location Services',
          isSwitch: true,
          switchValue: locationServices,
          onSwitch: (value: boolean) => {
            setLocationServices(value);
            patchSettings({ location_services: value });
          },
        },
      ],
    },
    {
      title: 'Communication',
      items: [
        {
          icon: 'mail',
          label: 'Email Updates',
          isSwitch: true,
          switchValue: emailUpdates,
          onSwitch: (value: boolean) => {
            setEmailUpdates(value);
            patchSettings({ email_updates: value });
          },
        },
        { icon: 'chatbubbles', label: 'Chat Preferences', onPress: () => router.push('/chat-preferences') },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle', label: 'Help Center', onPress: () => router.push('/help-support') },
        { icon: 'document-text', label: 'Terms of Service', onPress: () => router.push('/terms') },
        { icon: 'shield', label: 'Privacy Policy', onPress: () => router.push('/privacy-policy') },
        { icon: 'information-circle', label: 'About Petsy', onPress: () => router.push('/about') },
      ],
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="small" color={Colors.primary} />
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
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={[styles.sectionContent, Shadow.small]}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    itemIndex < section.items.length - 1 && styles.settingItemBorder,
                  ]}
                  onPress={item.onPress}
                  disabled={item.isSwitch}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: Colors.primary + '15' }]}>
                      <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
                    </View>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                  </View>
                  
                  {item.isSwitch ? (
                    <Switch
                      value={item.switchValue}
                      onValueChange={item.onSwitch}
                      trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                      thumbColor={item.switchValue ? Colors.primary : Colors.textLight}
                    />
                  ) : (
                    <View style={styles.settingRight}>
                      {item.value && <Text style={styles.settingValue}>{item.value}</Text>}
                      <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Danger Zone */}
        {isAuthenticated && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.error }]}>Danger Zone</Text>
            <View style={[styles.sectionContent, Shadow.small]}>
              <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccount}>
                <Ionicons name="trash" size={20} color={Colors.error} />
                <Text style={styles.dangerText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* App Version */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>Petsy v1.0.0</Text>
          <Text style={styles.copyrightText}>© 2025 Petsy. All rights reserved.</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  settingValue: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  dangerText: {
    fontSize: FontSize.md,
    color: Colors.error,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  versionText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  copyrightText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
});
