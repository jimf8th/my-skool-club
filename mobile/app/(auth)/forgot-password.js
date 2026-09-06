import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { forgotPassword } = useAuth();
  const router = useRouter();

  const submit = async () => {
    if (!email.trim()) { setError('Enter your email address.'); return; }
    setLoading(true); setError('');
    const result = await forgotPassword(email.trim());
    setLoading(false);
    if (result.success) setMessage(result.message);
    else setError(result.error);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Surface style={styles.card} elevation={1}>
          <Text variant="headlineMedium" style={styles.title}>Reset your password</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>We'll email a reset link if an eligible account exists.</Text>
          {!!message && <Text style={styles.success}>{message}</Text>}
          <TextInput label="Email" accessibilityLabel="Email" value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" autoComplete="email" mode="outlined" style={styles.input} />
          <Button mode="contained" onPress={submit} loading={loading} disabled={loading} style={styles.button}>Send Reset Link</Button>
          <Button mode="text" onPress={() => router.back()}>Back to Sign In</Button>
        </Surface>
      </View>
      <Snackbar visible={!!error} onDismiss={() => setError('')}>{error}</Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f3f4f6' },
  content: { justifyContent: 'center' },
  card: { maxWidth: 420, width: '100%', alignSelf: 'center', padding: 24, borderRadius: 18, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { color: '#6b7280', lineHeight: 20, marginTop: 8, marginBottom: 22 },
  success: { color: '#16a34a', marginBottom: 12 },
  input: { marginBottom: 16 },
  button: { marginTop: 2, marginBottom: 6 },
});
