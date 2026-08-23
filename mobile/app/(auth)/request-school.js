import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { schoolRequestsAPI } from '../../services/api';
import { getFriendlyErrorMessage } from '../../utils/errors';

const initialForm = {
  firstName: '', lastName: '', contactPhone: '', adminEmail: '', schoolName: '',
  description: '', address: '', city: '', state: '', postalCode: '', website: '', schoolPhone: '',
};

export default function RequestSchoolScreen() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const set = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const submit = async () => {
    const missing = Object.values(form).some((value) => !value.trim());
    if (missing) return setError('Complete every field before submitting.');
    if (!/^https?:\/\//i.test(form.website.trim())) return setError('School website must begin with http:// or https://.');
    setSaving(true); setError('');
    try {
      await schoolRequestsAPI.submit(Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value.trim()])
      ));
      setSubmitted(true);
    } catch (requestError) {
      setError(getFriendlyErrorMessage(requestError, 'Could not submit the school request.'));
    } finally { setSaving(false); }
  };

  if (submitted) return <SafeAreaView style={styles.screen}>
    <View style={styles.successCard} accessibilityRole="summary">
      <View style={styles.successIcon}><MaterialCommunityIcons name="check" size={34} color="#15803d" /></View>
      <Text style={styles.successTitle}>Request submitted</Text>
      <Text style={styles.successText}>An application administrator must approve your request before the school is created and becomes active. We will email {form.adminEmail} after a decision.</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/')}><Text style={styles.primaryButtonText}>Return home</Text></TouchableOpacity>
    </View>
  </SafeAreaView>;

  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Back"><MaterialCommunityIcons name="arrow-left" size={22} color="#4338ca" /><Text style={styles.backText}>Back</Text></TouchableOpacity>
        <Text style={styles.kicker}>SCHOOL ONBOARDING</Text>
        <Text style={styles.title}>Request your school</Text>
        <Text style={styles.intro}>Submit the administrator and school information below. An application administrator must approve the request before the school is created or becomes active.</Text>

        <Text style={styles.sectionTitle}>Proposed school administrator</Text>
        <Field label="First name" value={form.firstName} onChangeText={(value) => set('firstName', value)} autoComplete="name-given" />
        <Field label="Last name" value={form.lastName} onChangeText={(value) => set('lastName', value)} autoComplete="name-family" />
        <Field label="Contact phone number" value={form.contactPhone} onChangeText={(value) => set('contactPhone', value)} keyboardType="phone-pad" autoComplete="tel" />
        <Field label="Administrator email" value={form.adminEmail} onChangeText={(value) => set('adminEmail', value)} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />

        <Text style={styles.sectionTitle}>School details</Text>
        <Field label="School name" value={form.schoolName} onChangeText={(value) => set('schoolName', value)} />
        <Field label="School description" value={form.description} onChangeText={(value) => set('description', value)} multiline numberOfLines={4} />
        <Field label="Street address" value={form.address} onChangeText={(value) => set('address', value)} autoComplete="street-address" />
        <Field label="City" value={form.city} onChangeText={(value) => set('city', value)} />
        <Field label="State or region" value={form.state} onChangeText={(value) => set('state', value)} />
        <Field label="ZIP or postal code" value={form.postalCode} onChangeText={(value) => set('postalCode', value)} autoComplete="postal-code" />
        <Field label="Main school phone" value={form.schoolPhone} onChangeText={(value) => set('schoolPhone', value)} keyboardType="phone-pad" />
        <Field label="School website" value={form.website} onChangeText={(value) => set('website', value)} keyboardType="url" autoCapitalize="none" placeholder="https://school.example" />

        {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
        <TouchableOpacity style={[styles.primaryButton, saving && styles.disabled]} disabled={saving} onPress={submit} accessibilityRole="button"><Text style={styles.primaryButtonText}>{saving ? 'Submitting…' : 'Submit for approval'}</Text></TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function Field({ label, multiline, ...props }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} accessibilityLabel={label} multiline={multiline} style={[styles.input, multiline && styles.textarea]} placeholderTextColor="#9ca3af" /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 44 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 24 },
  backText: { color: '#4338ca', fontWeight: '700' },
  kicker: { color: '#4f46e5', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: '#111827', fontSize: 30, fontWeight: '900', marginTop: 6 },
  intro: { color: '#4b5563', fontSize: 14, lineHeight: 21, marginTop: 10 },
  sectionTitle: { color: '#111827', fontSize: 17, fontWeight: '800', marginTop: 28, marginBottom: 5 },
  field: { marginTop: 13 },
  label: { color: '#374151', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 13, backgroundColor: '#fff', paddingHorizontal: 14, color: '#111827', fontSize: 15 },
  textarea: { minHeight: 108, paddingTop: 13, textAlignVertical: 'top' },
  error: { color: '#b91c1c', backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, marginTop: 18 },
  primaryButton: { minHeight: 52, backgroundColor: '#4f46e5', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 22, paddingHorizontal: 22 },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.55 },
  successCard: { margin: 22, padding: 26, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flex: 1 },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: '#14532d', fontSize: 25, fontWeight: '900', marginTop: 18 },
  successText: { color: '#166534', textAlign: 'center', lineHeight: 21, marginTop: 10 },
});
