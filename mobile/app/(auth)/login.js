import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Checkbox, Surface, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { openCommunityStandards, openPrivacyPolicy, openTerms } from '../../utils/legalLinks';
import { MaterialCommunityIcons } from '../../components/Icon';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consentRequired, setConsentRequired] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const { login, loginWithGoogle, loginWithApple, completeConsent } = useAuth();
  const router = useRouter();

  const handleResult = (result) => {
    if (result.success) { router.replace('/(tabs)'); return; }
    if (result.verificationRequired) { router.push({ pathname: '/verify-email', params: { email } }); return; }
    if (result.consentRequired) { setConsentRequired(true); } else { setError(result.error); }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true); setError('');
    handleResult(await login(email, password));
  };

  const handleApple = async () => { setLoading(true); setError(''); handleResult(await loginWithApple()); };
  const handleGoogle = async () => { setLoading(true); setError(''); handleResult(await loginWithGoogle()); };
  const handleConsent = async () => { setLoading(true); setError(''); handleResult(await completeConsent()); };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="displaySmall" style={styles.title}>Welcome Back</Text>
            <Text variant="bodyLarge" style={styles.subtitle}>Sign in to continue</Text>
          </View>
          <Surface style={styles.formContainer} elevation={1}>
            {consentRequired ? (
              <View style={styles.consentContainer}>
                <Text variant="titleMedium" style={styles.consentTitle}>One last step</Text>
                <Text variant="bodyMedium" style={styles.consentIntro}>
                  Please confirm the following to create your account:
                </Text>
                <View style={styles.consentRow}>
                  <Checkbox status={consentAccepted ? 'checked' : 'unchecked'} onPress={() => setConsentAccepted(!consentAccepted)} />
                  <Text variant="bodySmall" style={styles.consentText}>
                    I confirm I am at least 13 and agree to the{' '}
                    <Text style={styles.consentLink} onPress={openTerms}>Terms</Text>,{' '}
                    <Text style={styles.consentLink} onPress={openPrivacyPolicy}>Privacy Policy</Text>, and{' '}
                    <Text style={styles.consentLink} onPress={openCommunityStandards}>Community Standards</Text>.
                  </Text>
                </View>
                <Button mode="contained" disabled={!consentAccepted || loading} loading={loading} onPress={handleConsent} style={styles.button}>Create my account</Button>
              </View>
            ) : (
              <>
                <TextInput label="Email" accessibilityLabel="Email" value={email} onChangeText={setEmail}
                  mode="outlined" keyboardType="email-address" autoCapitalize="none" autoComplete="email"
                  left={<TextInput.Icon icon="email" />} style={styles.input} />
                <TextInput label="Password" accessibilityLabel="Password" value={password} onChangeText={setPassword}
                  mode="outlined" secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="password"
                  left={<TextInput.Icon icon="lock" />}
                  right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
                  style={styles.input} />
                <Button mode="contained" onPress={handleLogin} loading={loading} disabled={loading} style={styles.button}>Sign In</Button>
                <Button mode="text" compact onPress={() => router.push('/forgot-password')}>Forgot Password?</Button>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text variant="bodySmall" style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>
                <View style={styles.socialButtonRow}>
                  <TouchableOpacity style={[styles.socialIconBtn, styles.appleBtn, loading && styles.disabledBtn]} onPress={handleApple} disabled={loading} accessibilityLabel="Sign in with Apple">
                    <MaterialCommunityIcons name="apple" size={26} color="#ffffff" />
                    <Text style={styles.appleBtnText}>Apple</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.socialIconBtn, styles.googleBtn, loading && styles.disabledBtn]} onPress={handleGoogle} disabled={loading} accessibilityLabel="Sign in with Google">
                    <MaterialCommunityIcons name="google" size={24} color="#4285F4" />
                    <Text style={styles.googleBtnText}>Google</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            <Button mode="text" onPress={() => router.push('/register')} style={styles.textButton}>Don't have an account? Sign Up</Button>
            <Button mode="text" icon="home-outline" onPress={() => router.replace('/')} style={styles.homeLink}>Back to Home</Button>
          </Surface>
        </View>
      </ScrollView>
      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000} action={{ label: 'Dismiss', onPress: () => setError('') }}>{error}</Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  content: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  header: { marginBottom: 32, alignItems: 'center' },
  title: { fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#6b7280', textAlign: 'center' },
  formContainer: { padding: 24, borderRadius: 16, backgroundColor: '#ffffff' },
  input: { marginBottom: 16 },
  button: { marginTop: 8, paddingVertical: 6 },
  textButton: { marginTop: 8 },
  homeLink: { marginTop: 4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, color: '#9ca3af' },
  socialButtonRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 8 },
  socialIconBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, gap: 8,
  },
  appleBtn: { backgroundColor: '#000000' },
  appleBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  googleBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dadce0' },
  googleBtnText: { color: '#3c4043', fontWeight: '600', fontSize: 15 },
  disabledBtn: { opacity: 0.5 },
  consentContainer: { gap: 12 },
  consentTitle: { fontWeight: 'bold', marginBottom: 4 },
  consentIntro: { color: '#6b7280', marginBottom: 4 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  consentText: { flex: 1, marginTop: 8 },
  consentLink: { color: '#4F46E5', textDecorationLine: 'underline' },
});
