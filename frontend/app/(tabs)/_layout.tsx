import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';
import { useTranslation } from '../../src/hooks/useTranslation';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const isAr = language === 'ar';

  const renderTabIcon = (
    icon: keyof typeof Ionicons.glyphMap,
    color: string,
    size: number,
    focused: boolean
  ) => (
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
            title: isAr ? 'الرئيسية' : t('home'),
            tabBarIcon: ({ color, size, focused }) => renderTabIcon('home', color, size, focused),
          }}
        />
        <Tabs.Screen
          name="adoption"
          options={{
            title: isAr ? 'تبنّي' : t('adoption'),
            tabBarIcon: ({ color, size, focused }) => renderTabIcon('heart', color, size, focused),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: isAr ? 'السوق' : t('shop'),
            tabBarIcon: ({ color, size, focused }) => renderTabIcon('storefront', color, size, focused),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: isAr ? 'رسائل' : 'Messages',
            href: '/messages',
            tabBarIcon: ({ color, size, focused }) =>
              renderTabIcon('chatbubbles', color, size, focused),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: isAr ? 'حسابي' : t('profile'),
            tabBarIcon: ({ color, size, focused }) => renderTabIcon('person', color, size, focused),
          }}
        />
      </Tabs>

      <TouchableOpacity style={styles.sosButton} onPress={() => router.push('/lost-found')}>
        <Text style={styles.sosText}>{isAr ? 'ضائع' : 'SOS'}</Text>
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
    backgroundColor: Colors.surface,
    borderTopWidth: 0,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    height: 68,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: { paddingTop: 2 },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: Colors.primarySoft },
  tabLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  sosButton: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.md,
    minWidth: 56,
    height: 56,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  sosText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '800' },
});
