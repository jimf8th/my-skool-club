import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Checkbox, Snackbar, Surface, Text, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getFriendlyErrorMessage } from '../../utils/errors';
import { openCommunityStandards, openPrivacyPolicy, openTerms } from '../../utils/legalLinks';

const PASSWORD_RULES = [
  (value) => value.length >= 8,
  (value) => /[A-Z]/.test(value),
  (value) => /[a-z]/.test(value),
  (value) => /\d/.test(value),
  (value) => /[^A-Za-z0-9]/.test(value),
];

export default function AcceptInviteScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { acceptInvitation } = useAuth();
  const token = typeof params.token === 'string' ? params.token : '';
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!token) {
        setError('This invitation link is incomplete.');
        setLoadingDetails(false);
        return;
      }
      try {
        const response = await authAPI.getInvitationDetails(token);
        if (active) setDetails(response);
      } catch (requestError) {
        if (active) setError(getFriendlyErrorMessage(requestError, 'This invitation is invalid or expired.'));
      } finally {
        if (active) setLoadingDetails(false);
      }
    };
    load();
    return () => { active = false; };
  }, [token]);

  const passwordStrong = useMemo(
    () => PASSWORD_RULES.every((rule) => rule(password)),
    [password]
  );

  const sendCode = async () => {
    setSendingCode(true);
    setError('');
    try {
      const response = await authAPI.sendInvitationCode(token);
      setCodeSent(true);
      setMessage(response.message);
    } catch (requestError) {
      setError(getFriendlyErrorMessage(requestError, 'Could not send the verification code.'));
    } finally {
      setSendingCode(false);
    }
  };

  const submit = async () => {
    setError('');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code sent to your email.');
      return;
    }
    if (!passwordStrong) {
      setError('Use at least 8 characters with uppercase, lowercase, number, and symbol.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!acceptedTerms) {
      setError('Confirm that you are at least 13 and accept the policies.');
      return;
    }

    setSubmitting(true);
    const result = await acceptInvitation({
      token,
      code,
      password,
      ageConfirmed: true,
      acceptedTerms: true,
    });
    setSubmitting(false);
    if (result.success) router.replace('/(tabs)');
    else setError(result.error);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Surface style={styles.card} elevation={1}>
          <View style={styles.icon}>
            <MaterialCommunityIcons name="account-heart-outline" size={30} color="#2563eb" />
          </View>
          <Text style={styles.title}>Accept your invitation</Text>

          {loadingDetails ? (
            <Text style={styles.subtitle}>Checking your secure invitation…</Text>
          ) : details ? (
            <>
              <Text style={styles.subtitle}>
                Welcome, {details.firstName} {details.lastName}. Confirm access to {details.maskedEmail}, then create your password.
              </Text>

              {!codeSent ? (
                <Button mode="contained" onPress={sendCode} loading={sendingCode} disabled={sendingCode}>
                  Email My Verification Code
                </Button>
              ) : (
                <>
                  {!!message && <Text style={styles.success}>{message}</Text>}
                  <TextInput
                    label="Six-digit code"
                    accessibilityLabel="Invitation verification code"
                    value={code}
                    onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    mode="outlined"
                    style={styles.input}
                  />
                  <TextInput
                    label="Password"
                    accessibilityLabel="Invitation password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    mode="outlined"
                    style={styles.input}
                  />
                  <Text style={styles.passwordHint}>
                    8+ characters with uppercase, lowercase, number, and symbol.
                  </Text>
                  <TextInput
                    label="Confirm password"
                    accessibilityLabel="Confirm invitation password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    mode="outlined"
                    style={styles.input}
                  />

                  <View style={styles.termsRow}>
                    <Checkbox
                      status={acceptedTerms ? 'checked' : 'unchecked'}
                      onPress={() => setAcceptedTerms((current) => !current)}
                    />
                    <Text
                      style={styles.termsText}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: acceptedTerms }}
                      onPress={() => setAcceptedTerms((current) => !current)}
                    >
                      I confirm I am at least 13 and accept the Terms, Privacy Policy, and Community Standards.
                    </Text>
                  </View>
                  <View style={styles.legalLinks}>
                    <Button compact mode="text" onPress={openTerms}>Terms</Button>
                    <Button compact mode="text" onPress={openPrivacyPolicy}>Privacy</Button>
                    <Button compact mode="text" onPress={openCommunityStandards}>Standards</Button>
                  </View>

                  <Button
                    mode="contained"
                    onPress={submit}
                    loading={submitting}
                    disabled={submitting || code.length !== 6 || !acceptedTerms}
                    style={styles.submitButton}
                  >
                    Create Account
                  </Button>
                  <Button mode="text" onPress={sendCode} disabled={sendingCode || submitting}>
                    Send another code
                  </Button>
                </>
              )}
            </>
          ) : null}

          {!loadingDetails && !details && (
            <Button mode="text" onPress={() => router.replace('/login')}>Go to Sign In</Button>
          )}
        </Surface>
      </ScrollView>
      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={5000}
        action={{ label: 'Dismiss', onPress: () => setError('') }}>
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  icon: { width: 58, height: 58, borderRadius: 18, alignSelf: 'center', backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center' },
  subtitle: { color: '#6b7280', textAlign: 'center', lineHeight: 21, marginTop: 8, marginBottom: 22 },
  success: { color: '#15803d', backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, marginBottom: 14 },
  input: { marginBottom: 12 },
  passwordHint: { color: '#6b7280', fontSize: 12, marginTop: -7, marginBottom: 12 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 6, paddingRight: 10 },
  termsText: { flex: 1, fontSize: 12, color: '#4b5563', lineHeight: 18, paddingTop: 8 },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  submitButton: { marginTop: 8 },
});
