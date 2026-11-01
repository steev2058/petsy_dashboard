import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useStore } from '../src/store/useStore';
import { authAPI } from '../src/services/api';
import { PetsySplash } from '../src/components/PetsySplash';

export default function SplashScreen() {
  const router = useRouter();
  const { token, setUser, isLoading, setLanguage } = useStore();
  const [motionDone, setMotionDone] = useState(false);
  const target = useRef<'home' | 'welcome' | null>(null);

  useEffect(() => {
    setLanguage('ar');
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (isLoading) return;
      try {
        if (token) {
          const response = await authAPI.getMe();
          setUser(response.data);
          target.current = 'home';
        } else {
          target.current = 'welcome';
        }
      } catch {
        target.current = 'welcome';
      }
    };
    checkAuth();
  }, [token, isLoading]);

  useEffect(() => {
    if (!motionDone || !target.current) return;
    router.replace(target.current === 'home' ? '/(tabs)/home' : '/welcome');
  }, [motionDone, token, isLoading]);

  return <PetsySplash onReady={() => setMotionDone(true)} />;
}
