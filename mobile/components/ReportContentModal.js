import React, { useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from './Icon';
import { contentReportsAPI } from '../services/api';
import { getFriendlyErrorMessage } from '../utils/errors';

const REASONS = [
  ['HARASSMENT', 'Harassment or bullying'], ['HATE_SPEECH', 'Hate speech'],
  ['SEXUAL_CONTENT', 'Sexual content'], ['VIOLENCE', 'Violence or threat'],
  ['SELF_HARM', 'Self-harm'], ['SPAM', 'Spam or scam'],
  ['PERSONAL_INFORMATION', 'Personal information'], ['IMPERSONATION', 'Impersonation'],
  ['OTHER', 'Other'],
];

export default function ReportContentModal({ visible, contentType, contentId, onClose, onSubmitted }) {
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const close = () => {
    if (saving) return;
    setReason(null); setDetails(''); setError(''); onClose();
  };
  const submit = async () => {
    if (!reason) { setError('Choose a reason.'); return; }
    setSaving(true); setError('');
    try {
      await contentReportsAPI.create(contentType, contentId, reason, details.trim() || null);
      setReason(null); setDetails(''); onSubmitted?.(); onClose();
    } catch (e) { setError(getFriendlyErrorMessage(e, 'Could not submit this report.')); }
    finally { setSaving(false); }
  };

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
    <View style={styles.overlay}><View style={styles.card}>
      <View style={styles.header}><View style={styles.titleRow}><MaterialCommunityIcons name="flag-outline" size={22} color="#b91c1c" /><Text style={styles.title}>Report content</Text></View><TouchableOpacity onPress={close} accessibilityLabel="Close report form"><MaterialCommunityIcons name="close" size={22} color="#6b7280" /></TouchableOpacity></View>
      <Text style={styles.description}>Reports are confidential and reviewed by My Skool Club app administrators.</Text>
      <View style={styles.reasonGrid}>{REASONS.map(([value, label]) => <TouchableOpacity key={value} onPress={() => setReason(value)} style={[styles.reason, reason === value && styles.reasonSelected]}><Text style={[styles.reasonText, reason === value && styles.reasonTextSelected]}>{label}</Text></TouchableOpacity>)}</View>
      <TextInput value={details} onChangeText={setDetails} maxLength={1000} multiline placeholder="Optional details for the reviewer" placeholderTextColor="#9ca3af" style={styles.input} />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.actions}><TouchableOpacity onPress={close} disabled={saving} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={submit} disabled={saving || !reason} style={[styles.submit, (saving || !reason) && styles.disabled]}>{saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitText}>Submit Report</Text>}</TouchableOpacity></View>
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' }, card: { width: '100%', maxWidth: 480, alignSelf: 'center', maxHeight: '92%', backgroundColor: '#fff', borderRadius: 18, padding: 20, paddingBottom: Platform.OS === 'ios' ? 24 : 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { fontSize: 19, fontWeight: '700', color: '#111827' }, description: { marginTop: 10, color: '#4b5563', fontSize: 13, lineHeight: 19 },
  reasonGrid: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, reason: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7 }, reasonSelected: { borderColor: '#b91c1c', backgroundColor: '#fee2e2' }, reasonText: { fontSize: 12, color: '#374151' }, reasonTextSelected: { color: '#991b1b', fontWeight: '700' },
  input: { marginTop: 15, minHeight: 82, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 11, color: '#111827', textAlignVertical: 'top' }, error: { color: '#b91c1c', fontSize: 12, marginTop: 8 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }, cancel: { paddingHorizontal: 14, paddingVertical: 11 }, cancelText: { color: '#374151', fontWeight: '600' }, submit: { minWidth: 130, alignItems: 'center', backgroundColor: '#b91c1c', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 }, submitText: { color: '#fff', fontWeight: '700' }, disabled: { opacity: 0.45 },
});
