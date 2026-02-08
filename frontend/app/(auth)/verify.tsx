import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components';
import { Colors, FontSize, Spacing, BorderRadius } from '../../src/constants/theme';
import { authAPI } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import { useTranslation } from '../../src/hooks/useTranslation';

export default function VerifyScreen() {
  const router = useRouter();
  const { userId, email, verificationCode } = useLocalSearchParams<{ userId: string; email?: string; verificationCode?: string }>();
  const { t } = useTranslation();
  const { setUser, setToken } = useStore();
  
  const [code, setCode] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // For demo: show the verification code
  useEffect(() => {
    if (verificationCode) {
      Alert.alert('Demo Mode', `Your verification code is: ${verificationCode}`);
    }
  }, [verificationCode]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus next input
    if (text && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 4) {
      Alert.alert('Error', 'Please enter the 4-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.verify(userId as string, fullCode);
      await setToken(response.data.access_token);
      setUser(response.data.user);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error.response?.data?.detail || 'Invalid code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert('Error', 'Missing email for resend');
      return;
    }
    try {
      const response = await authAPI.resendVerification(email);
      const newCode = response?.data?.verification_code;
      if (newCode) {
        Alert.alert('New Code', `Your new verification code is: ${newCode}`);
      } else {
        Alert.alert('Success', response?.data?.message || 'Verification code resent');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to resend code');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail" size={50} color={Colors.white} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{t('verify_account')}</Text>
        <Text style={styles.subtitle}>{t('enter_code')}</Text>

        {/* Code Input */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.codeInput,
                digit ? styles.codeInputFilled : null,
              ]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text.slice(-1), index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Verify Button */}
        <Button
          title={t('confirm')}
          onPress={handleVerify}
          loading={loading}
          style={styles.verifyButton}
        />

        {/* Resend */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendLink}>{t('resend_code')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  backButton: {
    padding: Spacing.sm,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  codeInput: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundDark,
    borderWidth: 2,
    borderColor: Colors.border,
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    color: Colors.text,
  },
  codeInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  verifyButton: {
    marginBottom: Spacing.lg,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  resendText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  resendLink: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
