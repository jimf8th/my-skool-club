import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface, Snackbar, Checkbox } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { openPrivacyPolicy, openTerms, openCommunityStandards } from '../../utils/legalLinks';

const RULES = [
  { id: 'length',    label: 'At least 8 characters',     test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
  { id: 'number',    label: 'One number (0–9)',            test: (p) => /[0-9]/.test(p) },
  { id: 'special',   label: 'One special character',       test: (p) => /[^A-Za-z0-9]/.test(p) },
];
const STRENGTH = [
  { label: 'Very weak',   color: '#ef4444' },
  { label: 'Weak',        color: '#f97316' },
  { label: 'Fair',        color: '#eab308' },
  { label: 'Strong',      color: '#3b82f6' },
  { label: 'Very strong', color: '#22c55e' },
];

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', firstName: '', lastName: '',
  });
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const { register } = useAuth();
  const router = useRouter();

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const passedCount    = useMemo(() => RULES.filter(r => r.test(formData.password)).length, [formData.password]);
  const strength       = STRENGTH[passedCount] ?? STRENGTH[0];
  const passwordsMatch = formData.password === formData.confirmPassword;
  const allRulesPassed = passedCount === RULES.length;

  const handleRegister = async () => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setError('Please fill in all fields'); return;
    }
    if (!allRulesPassed) { setError('Please choose a stronger password'); return; }
    if (!passwordsMatch) { setError('Passwords do not match'); return; }
    if (!acceptedTerms) { setError('Confirm that you are at least 13 and accept the Terms'); return; }

    setLoading(true);
    setError('');
    const result = await register({
      email: formData.email, password: formData.password,
      firstName: formData.firstName, lastName: formData.lastName,
      ageConfirmed: true, acceptedTerms: true,
    });
    if (result.success) {
      if (result.verificationRequired) {
        router.push({
          pathname: '/verify-email',
          params: { email: result.email, codeJustSent: 'true' },
        });
      } else {
        router.replace('/(tabs)');
      }
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerIcon}><Text style={styles.headerEmoji}>🎓</Text></View>
            <Text variant="headlineMedium" style={styles.title}>Create Account</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>Join My Skool Club — it's free!</Text>
          </View>

          <Surface style={styles.formCard} elevation={0}>
            <View style={styles.nameRow}>
              <TextInput label="First Name *" accessibilityLabel="First Name *" value={formData.firstName}
                onChangeText={(v) => updateField('firstName', v)}
                mode="outlined" autoCapitalize="words" style={[styles.input, styles.nameInput]} />
              <TextInput label="Last Name *" accessibilityLabel="Last Name *" value={formData.lastName}
                onChangeText={(v) => updateField('lastName', v)}
                mode="outlined" autoCapitalize="words" style={[styles.input, styles.nameInput]} />
            </View>

            <TextInput label="Email *" accessibilityLabel="Email *" value={formData.email}
              onChangeText={(v) => updateField('email', v)}
              mode="outlined" keyboardType="email-address" autoCapitalize="none"
              left={<TextInput.Icon icon="email" />} style={styles.input} />

            <TextInput label="Password *" accessibilityLabel="Password *" value={formData.password}
              onChangeText={(v) => updateField('password', v)}
              mode="outlined" secureTextEntry={!showPassword} autoCapitalize="none"
              left={<TextInput.Icon icon="lock" />}
              right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
              style={styles.input} />

            {formData.password.length > 0 && (
              <View style={styles.strengthWrapper}>
                <View style={styles.strengthBarRow}>
                  {[1,2,3,4,5].map((i) => (
                    <View key={i} style={[styles.strengthSegment,
                      { backgroundColor: i <= passedCount ? strength.color : '#e5e7eb' }]} />
                  ))}
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                </View>
                <View style={styles.rulesList}>
                  {RULES.map((r) => {
                    const ok = r.test(formData.password);
                    return (
                      <View key={r.id} style={styles.ruleRow}>
                        <MaterialCommunityIcons name={ok ? 'check-circle' : 'circle-outline'} size={14} color={ok ? '#22c55e' : '#9ca3af'} />
                        <Text style={[styles.ruleText, ok && styles.ruleTextOk]}>{r.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <TextInput label="Confirm Password *" accessibilityLabel="Confirm Password *" value={formData.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              mode="outlined" secureTextEntry={!showConfirm} autoCapitalize="none"
              left={<TextInput.Icon icon="lock-check" />}
              right={<TextInput.Icon icon={showConfirm ? 'eye-off' : 'eye'} onPress={() => setShowConfirm(!showConfirm)} />}
              outlineColor={formData.confirmPassword ? (passwordsMatch ? '#22c55e' : '#ef4444') : undefined}
              style={styles.input} />

            {formData.confirmPassword.length > 0 && !passwordsMatch && (
              <Text style={styles.matchError}>Passwords do not match</Text>
            )}

            <TouchableTerms accepted={acceptedTerms} setAccepted={setAcceptedTerms} />

            <Button mode="contained" onPress={handleRegister} loading={loading} disabled={loading || !acceptedTerms}
              style={styles.button} contentStyle={styles.buttonContent}>
              Create Account
            </Button>
            <Button mode="text" onPress={() => router.push('/login')} style={styles.textButton}>
              Already have an account? Sign In
            </Button>
            <View style={styles.legalLinks}><Button compact mode="text" onPress={openTerms}>Terms</Button><Button compact mode="text" onPress={openPrivacyPolicy}>Privacy</Button><Button compact mode="text" onPress={openCommunityStandards}>Standards</Button></View>
          </Surface>
        </View>
      </ScrollView>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3500}
        action={{ label: 'Dismiss', onPress: () => setError('') }}>
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

function TouchableTerms({ accepted, setAccepted }) {
  return <View style={styles.termsRow}>
    <Checkbox status={accepted ? 'checked' : 'unchecked'} onPress={() => setAccepted(!accepted)} />
    <Text style={styles.termsText} onPress={() => setAccepted(!accepted)} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }}>
      I confirm I am at least 13 and agree to the Terms, Privacy Policy, and Community Standards.
    </Text>
  </View>;
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f3f4f6' },
  scrollContent:   { flexGrow: 1, justifyContent: 'center', padding: 20 },
  content:         { width: '100%', maxWidth: 420, alignSelf: 'center' },
  header:          { alignItems: 'center', marginBottom: 28 },
  headerIcon:      { width: 60, height: 60, borderRadius: 18, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  headerEmoji:     { fontSize: 28 },
  title:           { fontWeight: '700', marginBottom: 6, textAlign: 'center', color: '#111827' },
  subtitle:        { color: '#6b7280', textAlign: 'center' },
  formCard:        { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  nameRow:         { flexDirection: 'row', gap: 10 },
  nameInput:       { flex: 1 },
  input:           { marginBottom: 14 },
  strengthWrapper: { marginTop: -6, marginBottom: 14 },
  strengthBarRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  strengthSegment: { flex: 1, height: 5, borderRadius: 4 },
  strengthLabel:   { fontSize: 11, fontWeight: '700', width: 72, textAlign: 'right' },
  rulesList:       { gap: 5 },
  ruleRow:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText:        { fontSize: 12, color: '#9ca3af' },
  ruleTextOk:      { color: '#16a34a' },
  matchError:      { color: '#ef4444', fontSize: 12, marginTop: -10, marginBottom: 10, marginLeft: 4 },
  button:          { marginTop: 6, borderRadius: 10 },
  buttonContent:   { paddingVertical: 6 },
  textButton:      { marginTop: 4 },
  legalLinks:      { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: -4 },
  termsRow:        { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 6, paddingRight: 10, marginBottom: 10 },
  termsText:       { flex: 1, fontSize: 12, color: '#4b5563', lineHeight: 18, paddingTop: 8 },
});
