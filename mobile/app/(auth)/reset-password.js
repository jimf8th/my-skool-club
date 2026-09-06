import React, { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface, Snackbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { authAPI } from '../../services/api';
import { getFriendlyErrorMessage } from '../../utils/errors';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams(); const router = useRouter();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : ''); const [code, setCode] = useState(''); const [password, setPassword] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const submit = async () => {
    if (!email || code.length !== 6 || password.length < 8) { setError('Enter your email, six-digit code, and a password of at least 8 characters.'); return; }
    setLoading(true); setError('');
    try { await authAPI.resetPassword(email, code, password); router.replace('/login'); }
    catch (e) { setError(getFriendlyErrorMessage(e, 'Could not reset your password.')); }
    finally { setLoading(false); }
  };
  return <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Surface style={styles.card} elevation={1}><Text style={styles.title}>Enter your reset code</Text><Text style={styles.subtitle}>The code expires in 15 minutes and can be used once.</Text><TextInput label="Email" accessibilityLabel="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" mode="outlined" style={styles.input} /><TextInput label="6-digit code" accessibilityLabel="6-digit code" value={code} onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" mode="outlined" style={styles.input} /><TextInput label="New password" accessibilityLabel="New password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" mode="outlined" style={styles.input} /><Button mode="contained" onPress={submit} loading={loading} disabled={loading || code.length !== 6} style={styles.button}>Update Password</Button><Button mode="text" onPress={() => router.replace('/login')}>Back to Sign In</Button></Surface><Snackbar visible={!!error} onDismiss={() => setError('')}>{error}</Snackbar></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f3f4f6' }, card: { maxWidth: 420, width: '100%', alignSelf: 'center', padding: 24, borderRadius: 18, backgroundColor: '#fff' }, title: { fontSize: 24, fontWeight: '700', color: '#111827' }, subtitle: { color: '#6b7280', lineHeight: 20, marginTop: 8, marginBottom: 22 }, input: { marginBottom: 12 }, button: { marginTop: 8, marginBottom: 6 } });
