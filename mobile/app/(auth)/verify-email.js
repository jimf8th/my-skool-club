import React, { useEffect, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Surface, Snackbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { checkEmailVerified, resendVerification, isAuthenticated } = useAuth();
  const email = typeof params.email === 'string' ? params.email : 'your email address';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (isAuthenticated) router.replace('/(tabs)');
  }, [isAuthenticated]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setInterval(() => setResendSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const handleContinue = async () => {
    setLoading(true); setError(''); setMessage('');
    const result = await checkEmailVerified();
    setLoading(false);
    if (result.success) router.replace('/(tabs)');
    else setError(result.error);
  };

  const handleResend = async () => {
    setError(''); setMessage('');
    const result = await resendVerification();
    if (result.success) { setMessage(result.message); setResendSeconds(60); }
    else setError(result.error);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Surface style={styles.card} elevation={1}>
          <Text variant="headlineMedium" style={styles.title}>Verify your email</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            We sent a verification link to {email}. Open it, then tap the button below.
          </Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!message && <Text style={styles.success}>{message}</Text>}
          <Button mode="contained" onPress={handleContinue} loading={loading} disabled={loading} style={styles.button}>
            I've verified my email
          </Button>
          <Button mode="text" onPress={handleResend} disabled={resendSeconds > 0} style={styles.resendButton}>
            {resendSeconds > 0 ? `Send another link in ${resendSeconds}s` : 'Send another link'}
          </Button>
        </Surface>
      </View>
      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={4000}>{error}</Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { padding: 24, borderRadius: 16, backgroundColor: '#fff' },
  title: { fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#6b7280', marginBottom: 24, lineHeight: 22 },
  error: { color: '#dc2626', marginBottom: 12 },
  success: { color: '#16a34a', marginBottom: 12 },
  button: { marginBottom: 8 },
  resendButton: {},
});
