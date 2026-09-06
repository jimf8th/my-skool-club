import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Checkbox, Surface, Snackbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getFriendlyErrorMessage } from '../../utils/errors';
import { openCommunityStandards, openPrivacyPolicy, openTerms } from '../../utils/legalLinks';

export default function AcceptInviteScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { acceptInvitation, isAuthenticated, user } = useAuth();
  const token = typeof params.token === 'string' ? params.token : '';
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!token) { setError('This invitation link is incomplete.'); setLoadingDetails(false); return; }
      try {
        const response = await authAPI.getInvitationDetails(token);
        if (active) setDetails(response);
      } catch (e) {
        if (active) setError(getFriendlyErrorMessage(e, 'This invitation is invalid or expired.'));
      } finally {
        if (active) setLoadingDetails(false);
      }
    };
    load();
    return () => { active = false; };
  }, [token]);

  const submit = async () => {
    if (!acceptedTerms) { setError('Confirm that you are at least 13 and accept the policies.'); return; }
    setSubmitting(true); setError('');
    const result = await acceptInvitation(token);
    setSubmitting(false);
    if (result.success) router.replace('/(tabs)');
    else setError(result.error);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Surface style={styles.card} elevation={1}>
            <Text variant="headlineMedium" style={styles.title}>Accept your invitation</Text>
            {loadingDetails ? (
              <Text style={styles.subtitle}>Checking your secure invitation…</Text>
            ) : details ? (
              <Text style={styles.subtitle}>Welcome, {details.firstName} {details.lastName}.</Text>
            ) : null}
            {!!error && <Text style={styles.error}>{error}</Text>}
            {!loadingDetails && details && !isAuthenticated && (
              <View>
                <Text style={styles.info}>
                  First create an account or sign in with the invited email address, then return here to accept.
                </Text>
                <Button mode="contained" onPress={() => router.push('/register')} style={styles.button}>Create account</Button>
                <Button mode="text" onPress={() => router.push('/login')}>I already have an account</Button>
              </View>
            )}
            {!loadingDetails && details && isAuthenticated && (
              <View style={styles.form}>
                <Text style={styles.info}>Signed in as {user?.email}</Text>
                <View style={styles.consentRow}>
                  <Checkbox status={acceptedTerms ? 'checked' : 'unchecked'} onPress={() => setAcceptedTerms(!acceptedTerms)} />
                  <Text variant="bodySmall" style={styles.consentText}>
                    I confirm I am at least 13 and agree to the{' '}
                    <Text style={styles.link} onPress={openTerms}>Terms</Text>,{' '}
                    <Text style={styles.link} onPress={openPrivacyPolicy}>Privacy Policy</Text>, and{' '}
                    <Text style={styles.link} onPress={openCommunityStandards}>Community Standards</Text>.
                  </Text>
                </View>
                <Button mode="contained" onPress={submit} loading={submitting} disabled={submitting || !acceptedTerms} style={styles.button}>
                  Accept invitation
                </Button>
              </View>
            )}
          </Surface>
        </View>
      </ScrollView>
      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={4000}>{error}</Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  content: { maxWidth: 420, width: '100%', alignSelf: 'center' },
  card: { padding: 24, borderRadius: 16, backgroundColor: '#fff' },
  title: { fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#6b7280', marginBottom: 20 },
  error: { color: '#dc2626', marginBottom: 12 },
  info: { color: '#374151', marginBottom: 16 },
  form: { gap: 12 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  consentText: { flex: 1, marginTop: 8 },
  link: { color: '#4F46E5', textDecorationLine: 'underline' },
  button: { marginTop: 4 },
});
