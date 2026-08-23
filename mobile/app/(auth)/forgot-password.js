import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { authAPI } from '../../services/api';
import { getFriendlyErrorMessage } from '../../utils/errors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const router = useRouter();
  const submit = async () => {
    if (!email.trim()) { setError('Enter your email address.'); return; }
    setLoading(true); setError('');
    try { await authAPI.forgotPassword(email.trim()); router.push({ pathname: '/reset-password', params: { email: email.trim() } }); }
    catch (e) { setError(getFriendlyErrorMessage(e, 'Could not request a reset code.')); }
    finally { setLoading(false); }
  };
  return <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Surface style={styles.card} elevation={1}><Text style={styles.title}>Reset your password</Text><Text style={styles.subtitle}>We’ll email a six-digit code if an eligible account exists.</Text><TextInput label="Email" accessibilityLabel="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" mode="outlined" /><Button mode="contained" onPress={submit} loading={loading} disabled={loading} style={styles.button}>Send Reset Code</Button><Button mode="text" onPress={() => router.back()}>Back to Sign In</Button></Surface><Snackbar visible={!!error} onDismiss={() => setError('')}>{error}</Snackbar></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f3f4f6' }, card: { maxWidth: 420, width: '100%', alignSelf: 'center', padding: 24, borderRadius: 18, backgroundColor: '#fff' }, title: { fontSize: 24, fontWeight: '700', color: '#111827' }, subtitle: { color: '#6b7280', lineHeight: 20, marginTop: 8, marginBottom: 22 }, button: { marginTop: 18, marginBottom: 6 } });
