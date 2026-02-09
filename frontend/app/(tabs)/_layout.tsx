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

  const renderTabIcon = (icon: keyof typeof Ionicons.glyphMap, color: string, size: number, focused: boolean) => (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={icon} size={focused ? size + 1 : size} color={focused ? Colors.primary : color} />
    </View>
  );

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabItem,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarLabelStyle: styles.tabLabel,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t('home'),
            tabBarIcon: ({ color, size, focused }) => renderTabIcon('home', color, size, focused),
          }}
        />
        <Tabs.Screen
          name="adoption"
          options={{
            title: t('adoption'),
            tabBarIcon: ({ color, size, focused }) => renderTabIcon('heart', color, size, focused),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: t('shop'),
            tabBarIcon: ({ color, size, focused }) => renderTabIcon('storefront', color, size, focused),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('profile'),
            tabBarIcon: ({ color, size, focused }) => renderTabIcon('person', color, size, focused),
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
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    borderRadius: BorderRadius.xl,
    elevation: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    height: 68,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    paddingTop: 2,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.primary + '14',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  sosButton: {
    position: 'absolute',
    bottom: 100,
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
