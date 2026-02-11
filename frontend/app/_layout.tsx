import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { useStore } from '../src/store/useStore';
import { Colors } from '../src/constants/theme';

export default function RootLayout() {
  const loadStoredAuth = useStore((state) => state.loadStoredAuth);
  const language = useStore((state) => state.language);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const user = useStore((state) => state.user);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Handle RTL for Arabic
  useEffect(() => {
    const isRTL = language === 'ar';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      // Reload app to apply RTL changes (only on native)
      if (Platform.OS !== 'web') {
        // For Expo, we would need to reload
        // Updates.reloadAsync();
      }
    }
  }, [language]);

  // Route guard for protected screens
  useEffect(() => {
    if (isLoading) return;

    const first = segments[0] || '';
    const second = segments[1] || '';

    const isAuthRoute = first === '(auth)';

    const protectedTopRoutes = new Set([
      'messages',
      'chat',
      'my-appointments',
      'favorites',
      'settings',
      'add-pet',
      'checkout',
      'create-post',
      'health-records',
      'pet-tracking',
      'book-appointment',
      'sponsor',
      'order-history',
      'order',
      'edit-profile',
      'my-pets',
      'blocked-users',
      'change-password',
      'privacy-settings',
      'chat-preferences',
      'delete-account',
      'create-adoption-post',
      'sponsorships',
      'create-sponsorship-post',
      'my-sponsorships',
      'create-marketplace-listing',
      'my-marketplace-listings',
      'vet-care-requests',
      'clinic-care-management',
      'market-owner-dashboard',
      'role-request',
      'my-role-requests',
      'notifications',
      'friends',
      'admin',
    ]);

    const protectedTabRoutes = new Set(['profile']);

    const isProtectedRoute =
      protectedTopRoutes.has(first) ||
      (first === '(tabs)' && protectedTabRoutes.has(second));

    if (!isAuthenticated && isProtectedRoute) {
      router.replace('/(auth)/login');
      return;
    }

    if (isAuthenticated) {
      const role = user?.role || 'user';
      const isAdmin = !!user?.is_admin || role === 'admin';

      const canAccessVet = isAdmin || role === 'vet';
      const canAccessClinic = isAdmin || role === 'care_clinic';
      const canAccessMarketOwner = isAdmin || role === 'market_owner';
      const canAccessAdmin = isAdmin;

      const isVetRoute = first === 'vet-care-requests';
      const isClinicRoute = first === 'clinic-care-management';
      const isMarketOwnerRoute = first === 'market-owner-dashboard';
      const isAdminRoute = first === 'admin';

      if (isVetRoute && !canAccessVet) {
        router.replace('/(tabs)/home');
        return;
      }

      if (isClinicRoute && !canAccessClinic) {
        router.replace('/(tabs)/home');
        return;
      }

      if (isMarketOwnerRoute && !canAccessMarketOwner) {
        router.replace('/(tabs)/home');
        return;
      }

      if (isAdminRoute && !canAccessAdmin) {
        router.replace('/(tabs)/home');
        return;
      }

      // Role request pages are only for regular users requesting role upgrades
      const isRoleRequestRoute = first === 'role-request' || first === 'my-role-requests';
      const isSpecializedRole = ['vet', 'market_owner', 'care_clinic', 'admin'].includes(role) || isAdmin;
      if (isRoleRequestRoute && isSpecializedRole) {
        router.replace('/(tabs)/home');
        return;
      }
    }

    if (isAuthenticated && isAuthRoute) {
      router.replace('/(tabs)/home');
    }
  }, [segments, isAuthenticated, isLoading, user, router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="pet/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="vet/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-pet" options={{ presentation: 'modal' }} />
        <Stack.Screen name="ai-assistant" options={{ presentation: 'modal' }} />
        <Stack.Screen name="emergency" options={{ presentation: 'modal' }} />
        <Stack.Screen name="lost-found" />
        <Stack.Screen name="lost-found/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="community" />
        <Stack.Screen name="community/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="tag/[code]" options={{ presentation: 'card' }} />
        <Stack.Screen name="cart" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="petsy-map" />
        <Stack.Screen name="messages" />
        <Stack.Screen name="create-post" options={{ presentation: 'modal' }} />
        <Stack.Screen name="health-records" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="my-appointments" />
        <Stack.Screen name="my-pets" />
        <Stack.Screen name="pet-tracking" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="blocked-users" />
        <Stack.Screen name="change-password" />
        <Stack.Screen name="privacy-settings" />
        <Stack.Screen name="chat-preferences" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="about" />
        <Stack.Screen name="delete-account" />
        <Stack.Screen name="create-adoption-post" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sponsorships" />
        <Stack.Screen name="create-sponsorship-post" options={{ presentation: 'modal' }} />
        <Stack.Screen name="my-sponsorships" />
        <Stack.Screen name="marketplace" />
        <Stack.Screen name="marketplace/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="create-marketplace-listing" options={{ presentation: 'modal' }} />
        <Stack.Screen name="my-marketplace-listings" />
        <Stack.Screen name="vet-care-requests" />
        <Stack.Screen name="clinic-care-management" />
        <Stack.Screen name="market-owner-dashboard" />
        <Stack.Screen name="role-request" options={{ presentation: 'modal' }} />
        <Stack.Screen name="my-role-requests" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="admin/index" />
        <Stack.Screen name="admin/friend-reports" />
        <Stack.Screen name="edit-profile" options={{ presentation: 'card' }} />
        <Stack.Screen name="help-support" />
        <Stack.Screen name="product/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="order/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="book-appointment/[vetId]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sponsor/[petId]" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
