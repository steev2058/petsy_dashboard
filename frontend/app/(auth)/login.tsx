import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Button, Input } from '../../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { PetsyMark, PetsyName } from '../../src/components/PetsyLogo';
import { Brand } from '../../src/brand/tokens';
import { authAPI } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import { useTranslation } from '../../src/hooks/useTranslation';
import { getApiErrorMessage } from '../../src/utils/apiError';

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { t, language } = useTranslation();
  const { setUser, setToken, setLanguage } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loginError, setLoginError] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'error',
  });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAr = language === 'ar';
  const isWide = width > 880;

  const heroY = useSharedValue(16);
  const heroOpacity = useSharedValue(0);
  const cardY = useSharedValue(22);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (language !== 'ar') setLanguage('ar');
    heroOpacity.value = withTiming(1, { duration: 450 });
    heroY.value = withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) });
    cardOpacity.value = withDelay(160, withTiming(1, { duration: 420 }));
    cardY.value = withDelay(160, withTiming(0, { duration: 460, easing: Easing.out(Easing.cubic) }));
  }, []);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroY.value }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = isAr ? 'البريد مطلوب' : 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = isAr ? 'صيغة البريد غير صحيحة' : 'Invalid email format';
    if (!password) newErrors.password = isAr ? 'كلمة المرور مطلوبة' : 'Password is required';
    else if (password.length < 6) newErrors.password = isAr ? 'كلمة المرور قصيرة جداً' : 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ visible: true, message, type });
    toastTimerRef.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 2200);
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoginError('');
    setLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      await setToken(response.data.access_token);
      setUser(response.data.user);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      const message = getApiErrorMessage(
        error,
        isAr ? 'فشل تسجيل الدخول. حاول مجدداً.' : 'Login failed. Please try again.',
        t
      );
      showToast(message, 'error');
      setLoginError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => setLanguage(language === 'en' ? 'ar' : 'en');

  const continueAsGuest = async () => {
    await setToken(null);
    setUser(null);
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#FFF8F5', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowOrange} pointerEvents="none" />
      <View style={styles.glowOlive} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, isWide && styles.scrollWide]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {toast.visible && (
            <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
              <Ionicons
                name={toast.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
                size={16}
                color={Colors.white}
              />
              <Text style={styles.toastText}>{toast.message}</Text>
            </View>
          )}

          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => router.push('/welcome')} style={styles.brandChip}>
              <PetsyMark size={28} />
              <Text style={styles.brandChipText}>Petsy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage}>
              <Ionicons name="globe-outline" size={18} color={Colors.primary} />
              <Text style={styles.langText}>{language === 'en' ? 'العربية' : 'English'}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.layout, isWide && styles.layoutWide]}>
            <Animated.View style={[styles.heroCol, heroStyle, isWide && styles.heroWide]}>
              <PetsyMark size={112} animated />
              <PetsyName fontSize={44} />
              <Text style={styles.subtitle}>
                {isAr ? 'أهلاً بك في Petsy' : 'Welcome to Petsy'}
              </Text>
            </Animated.View>

            <Animated.View style={[styles.formCard, Shadow.medium, cardStyle, isWide && styles.formWide]}>
              <Text style={styles.formHeading}>{isAr ? 'تسجيل الدخول' : t('login')}</Text>

              <Input
                label={isAr ? 'البريد الإلكتروني' : t('email')}
                placeholder="you@email.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (loginError) setLoginError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                leftIcon={<Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />}
              />

              <Input
                label={isAr ? 'كلمة المرور' : t('password')}
                placeholder="••••••••"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (loginError) setLoginError('');
                }}
                secureTextEntry={!showPassword}
                error={errors.password}
                leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>
                }
              />

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => router.push('/(auth)/forgot-password')}
              >
                <Text style={styles.forgotPasswordText}>
                  {isAr ? 'نسيت كلمة المرور؟' : t('forgot_password')}
                </Text>
              </TouchableOpacity>

              <Button
                title={isAr ? 'تسجيل الدخول' : t('login')}
                onPress={handleLogin}
                loading={loading}
                style={styles.loginButton}
              />

              {!!loginError && <Text style={styles.loginErrorText}>{loginError}</Text>}

              <Button
                title={isAr ? 'متابعة كضيف' : 'Continue as Guest'}
                onPress={continueAsGuest}
                variant="outline"
                style={styles.guestButton}
              />

              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>
                  {isAr ? 'ليس لديك حساب؟ ' : `${t('no_account')} `}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                  <Text style={styles.signupLink}>{isAr ? 'إنشاء حساب' : t('signup')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.colors.stone },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: Spacing.lg, paddingBottom: 48 },
  scrollWide: { maxWidth: 1040, width: '100%', alignSelf: 'center' },
  glowOrange: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,107,56,0.14)',
  },
  glowOlive: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,107,56,0.06)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  brandChipText: { fontWeight: '800', color: Brand.colors.ink, fontSize: FontSize.md },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  langText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '700' },
  layout: { gap: Spacing.xl },
  layoutWide: { flexDirection: 'row', alignItems: 'center', gap: 40 },
  heroCol: { alignItems: 'center' },
  heroWide: { flex: 1, paddingHorizontal: 12 },
  logoStage: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoHalo: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1.5,
    borderColor: 'rgba(139,144,80,0.45)',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: Brand.colors.cedar,
    letterSpacing: 1,
    fontFamily: 'Tajawal_800ExtraBold',
  },
  rule: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: Brand.colors.gold,
    marginTop: 10,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Brand.colors.inkMuted,
    textAlign: 'center',
    fontWeight: '700',
  },
  heroHint: {
    marginTop: 8,
    maxWidth: 340,
    textAlign: 'center',
    color: Colors.textSecondary,
    lineHeight: 22,
    fontSize: FontSize.md,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formWide: { flex: 1, maxWidth: 440 },
  formHeading: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Brand.colors.ink,
    textAlign: 'right',
    marginBottom: Spacing.md,
  },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: Spacing.lg },
  forgotPasswordText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '600' },
  loginButton: { marginTop: Spacing.sm },
  loginErrorText: {
    marginTop: Spacing.sm,
    color: Colors.error,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  guestButton: { marginTop: Spacing.sm },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    flexWrap: 'wrap',
  },
  signupText: { color: Colors.textSecondary, fontSize: FontSize.md },
  signupLink: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '800' },
  toast: {
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  toastSuccess: { backgroundColor: Colors.success },
  toastError: { backgroundColor: Colors.error },
  toastText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600', flex: 1 },
});
