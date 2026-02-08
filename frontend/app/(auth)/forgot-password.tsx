import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../src/components';
import { Colors, FontSize, Spacing } from '../../src/constants/theme';
import { authAPI } from '../../src/services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);

  const requestCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.forgotPassword(email.trim());
      setRequested(true);
      const demoCode = response?.data?.reset_code;
      if (demoCode) {
        Alert.alert('Reset Code', `Your reset code is: ${demoCode}`);
      } else {
        Alert.alert('Success', 'If your email exists, a reset code has been sent.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to request reset code');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim() || !code.trim() || !newPassword.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({
        email: email.trim(),
        code: code.trim(),
        new_password: newPassword,
      });
      Alert.alert('Success', 'Password reset successful. Please login.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Forgot Password</Text>
          </View>

          <Input
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Button title="Send Reset Code" onPress={requestCode} loading={loading} style={styles.button} />

          {requested && (
            <>
              <Input label="Reset Code" placeholder="4-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" />
              <Input
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              <Button title="Reset Password" onPress={resetPassword} loading={loading} style={styles.button} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  backButton: { marginRight: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text },
  button: { marginTop: Spacing.md },
});