import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Surface, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { invitationsAPI } from '../services/api';
import { getFriendlyErrorMessage } from '../utils/errors';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InviteFriendModal({ visible, onDismiss }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const close = () => {
    if (loading) return;
    setFirstName('');
    setLastName('');
    setEmail('');
    setError('');
    setMessage('');
    onDismiss();
  };

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setError('');
    setMessage('');
    if (!firstName.trim() || !lastName.trim() || !normalizedEmail) {
      setError('Enter your friend’s first name, last name, and email address.');
      return;
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await invitationsAPI.inviteFriend({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
      });
      setMessage(response.message || 'Invitation sent.');
    } catch (requestError) {
      setError(getFriendlyErrorMessage(
        requestError,
        'Could not send the invitation. Please try again.'
      ));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Surface style={styles.dialog} elevation={5}>
          <View style={styles.icon}>
            <MaterialCommunityIcons name="account-plus-outline" size={28} color="#2563eb" />
          </View>
          <Text style={styles.title}>Invite a Friend</Text>
          <Text style={styles.body}>
            We’ll email your friend a secure, 48-hour link to create their account.
          </Text>

          {!!message && <Text style={styles.success}>{message}</Text>}
          {!!error && <Text style={styles.error}>{error}</Text>}

          {!message && (
            <>
              <View style={styles.nameRow}>
                <TextInput
                  label="First name"
                  accessibilityLabel="Friend first name"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  mode="outlined"
                  disabled={loading}
                  style={styles.nameInput}
                />
                <TextInput
                  label="Last name"
                  accessibilityLabel="Friend last name"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  mode="outlined"
                  disabled={loading}
                  style={styles.nameInput}
                />
              </View>
              <TextInput
                label="Email address"
                accessibilityLabel="Friend email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                mode="outlined"
                disabled={loading}
                style={styles.emailInput}
              />
            </>
          )}

          <View style={styles.actions}>
            <Button mode="text" onPress={close} disabled={loading}>
              {message ? 'Done' : 'Cancel'}
            </Button>
            {!message && (
              <Button mode="contained" onPress={submit} loading={loading} disabled={loading}>
                Send Invitation
              </Button>
            )}
          </View>
        </Surface>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  dialog: { width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 20 },
  icon: { width: 52, height: 52, borderRadius: 26, alignSelf: 'center', backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 20, color: '#4b5563', textAlign: 'center', marginTop: 8, marginBottom: 14 },
  nameRow: { flexDirection: 'row', gap: 10 },
  nameInput: { flex: 1 },
  emailInput: { marginTop: 10 },
  success: { color: '#15803d', backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, marginTop: 4 },
  error: { color: '#b91c1c', backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
});
