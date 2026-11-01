import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Input } from '../../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { PetsyMark } from '../../src/components/PetsyLogo';
import { authAPI } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import { useTranslation } from '../../src/hooks/useTranslation';
import { getApiErrorMessage } from '../../src/utils/apiError';

export default function LoginScreen() {
  const router = useRouter();
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

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) {
      newErrors.email = isAr ? 'البريد مطلوب' : 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = isAr ? 'صيغة البريد غير صحيحة' : 'Invalid email format';
    }
    if (!password) {
      newErrors.password = isAr ? 'كلمة المرور مطلوبة' : 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = isAr ? 'كلمة المرور قصيرة جداً' : 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ visible: true, message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2200);
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
      <LinearGradient colors={['#F7F3EE', '#EDE6DC']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

          <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage}>
            <Ionicons name="globe-outline" size={20} color={Colors.primary} />
            <Text style={styles.langText}>{language === 'en' ? 'العربية' : 'English'}</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <PetsyMark size={88} />
            <Text style={styles.title}>Petsy</Text>
            <Text style={styles.subtitle}>
              {isAr ? 'أهلاً بك في منصة رعاية الحيوان' : t('welcome')}
            </Text>
          </View>

          <View style={[styles.formCard, Shadow.medium]}>
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
          </View>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>
              {isAr ? 'ليس لديك حساب؟ ' : `${t('no_account')} `}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.signupLink}>{isAr ? 'إنشاء حساب' : t('signup')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push('/welcome')} style={styles.backHome}>
            <Text style={styles.backHomeText}>{isAr ? 'العودة للصفحة الرئيسية' : 'Back to landing'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: Spacing.lg },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  langText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '600' },
  logoContainer: { alignItems: 'center', marginVertical: Spacing.lg },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logoEmoji: { fontSize: 40 },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.md,
  },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: Spacing.lg },
  forgotPasswordText: { color: Colors.primary, fontSize: FontSize.md },
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
    marginTop: Spacing.xl,
    flexWrap: 'wrap',
  },
  signupText: { color: Colors.textSecondary, fontSize: FontSize.md },
  signupLink: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '700' },
  backHome: { alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.xl },
  backHomeText: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: '600' },
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
