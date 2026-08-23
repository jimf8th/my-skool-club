import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Snackbar, Surface, Text, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { verifyEmail, resendVerification } = useAuth();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(
    params.codeJustSent === 'true' ? 'We sent a six-digit code to your email.' : ''
  );
  const [resendSeconds, setResendSeconds] = useState(params.codeJustSent === 'true' ? 60 : 0);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setInterval(() => setResendSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const handleVerify = async () => {
    setError('');
    setMessage('');
    if (!email || !/^\d{6}$/.test(code)) {
      setError('Enter your email and the six-digit verification code.');
      return;
    }

    setLoading(true);
    const result = await verifyEmail(email, code);
    setLoading(false);
    if (result.success) router.replace('/(tabs)');
    else setError(result.error);
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    if (!email) {
      setError('Enter your email address first.');
      return;
    }

    const result = await resendVerification(email);
    if (result.success) {
      setMessage(result.message);
      setResendSeconds(60);
    } else {
      setError(result.error);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerIcon}><Text style={styles.headerEmoji}>✉️</Text></View>
            <Text variant="headlineMedium" style={styles.title}>Verify your email</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>Enter the code to finish creating your account.</Text>
          </View>

          <Surface style={styles.card} elevation={0}>
            {message ? <Text style={styles.successMessage}>{message}</Text> : null}
            <TextInput
              label="Email"
              accessibilityLabel="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              left={<TextInput.Icon icon="email" />}
              style={styles.input}
            />
            <TextInput
              label="Six-digit code"
              accessibilityLabel="Six-digit code"
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
              mode="outlined"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
              left={<TextInput.Icon icon="numeric" />}
              style={styles.codeInput}
              contentStyle={styles.codeInputContent}
            />
            <Button
              mode="contained"
              onPress={handleVerify}
              loading={loading}
              disabled={loading || code.length !== 6}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Verify and sign in
            </Button>
            <Button
              mode="text"
              onPress={handleResend}
              disabled={resendSeconds > 0}
              style={styles.textButton}
            >
              {resendSeconds > 0 ? `Send another code in ${resendSeconds}s` : 'Send another code'}
            </Button>
            <Button mode="text" onPress={() => router.replace('/login')}>
              Back to sign in
            </Button>
          </Surface>
        </View>
      </ScrollView>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={4000}
        action={{ label: 'Dismiss', onPress: () => setError('') }}>
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  content: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  header: { alignItems: 'center', marginBottom: 28 },
  headerIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  headerEmoji: { fontSize: 28 },
  title: { fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: '#6b7280', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  successMessage: { color: '#15803d', backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, marginBottom: 14 },
  input: { marginBottom: 14 },
  codeInput: { marginBottom: 14 },
  codeInputContent: { textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: '700' },
  button: { marginTop: 4, borderRadius: 10 },
  buttonContent: { paddingVertical: 6 },
  textButton: { marginTop: 6 },
});
