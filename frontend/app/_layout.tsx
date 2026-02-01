import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../src/store/useStore';
import { Colors } from '../src/constants/theme';

export default function RootLayout() {
  const loadStoredAuth = useStore((state) => state.loadStoredAuth);

  useEffect(() => {
    loadStoredAuth();
  }, []);

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
        <Stack.Screen name="community" />
      </Stack>
    </>
  );
}
