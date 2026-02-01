import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  withDelay,
  runOnJS
} from 'react-native-reanimated';
import { useStore } from '../src/store/useStore';
import { Colors, FontSize, Spacing } from '../src/constants/theme';
import { authAPI } from '../src/services/api';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { token, setUser, isLoading } = useStore();
  const [checking, setChecking] = useState(true);
  
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const navigateToApp = () => {
    router.replace('/(tabs)/home');
  };

  const navigateToAuth = () => {
    router.replace('/(auth)/login');
  };

  useEffect(() => {
    // Start animations
    logoScale.value = withSpring(1, { damping: 10, stiffness: 100 });
    logoOpacity.value = withTiming(1, { duration: 500 });
    textOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (isLoading) return;
      
      try {
        if (token) {
          const response = await authAPI.getMe();
          setUser(response.data);
          setTimeout(() => runOnJS(navigateToApp)(), 1500);
        } else {
          setTimeout(() => runOnJS(navigateToAuth)(), 2000);
        }
      } catch (error) {
        setTimeout(() => runOnJS(navigateToAuth)(), 2000);
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, [token, isLoading]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🐾</Text>
        </View>
      </Animated.View>
      
      <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
        <Text style={styles.title}>Petsy</Text>
        <Text style={styles.subtitle}>Your Pet Marketplace</Text>
      </Animated.View>

      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ for pet lovers</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoEmoji: {
    fontSize: 50,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 150,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
  },
  footerText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
});
