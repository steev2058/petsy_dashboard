import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';
import { useTranslation } from '../../src/hooks/useTranslation';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t('home'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="adoption"
          options={{
            title: t('adoption'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="heart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: t('shop'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="storefront" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('profile'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* Floating SOS Button */}
      <TouchableOpacity
        style={styles.sosButton}
        onPress={() => router.push('/emergency')}
      >
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  sosButton: {
    position: 'absolute',
    bottom: 80,
    right: Spacing.md,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  sosText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '800',
  },
});
