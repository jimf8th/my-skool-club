import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, Modal, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, FlatList, Alert,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from './Icon';
import { announcementsAPI } from '../services/api';
import { getFriendlyErrorMessage } from '../utils/errors';
import ReportContentModal from './ReportContentModal';

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

/**
 * Self-contained announcements flow for a single school: list -> form.
 * Props:
 *  - schoolId, currentUser
 *  - canCreate: bool (CREATE_ANNOUNCEMENT privilege — school/app admin only)
 *  - isSchoolAdmin: bool (may delete any announcement, not just their own)
 *  - initialView: 'list' | 'form' (default 'list')
 *  - onClose: () => void
 */
export default function AnnouncementsModal({ schoolId, currentUser, canCreate, isSchoolAdmin, initialView, onClose }) {
  const [view, setView] = useState(initialView === 'form' ? 'form' : 'list');
  const [announcements, setAnnouncements] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [reportTarget, setReportTarget] = useState(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      setAnnouncements(await announcementsAPI.list(schoolId));
    } catch (e) {
      Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to load announcements.'));
    } finally {
      setLoadingList(false);
    }
  }, [schoolId]);

  useEffect(() => { loadList(); }, [loadList]);

  const openCreate = () => setView('form');
  const backToList = (shouldReload) => {
    setView('list');
    if (shouldReload) loadList();
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Announcement',
      `Delete "${item.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await announcementsAPI.remove(schoolId, item.id);
              setAnnouncements((prev) => prev.filter((a) => a.id !== item.id));
            } catch (e) {
              Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to delete announcement.'));
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        {view === 'list' && (
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Announcements</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {canCreate && (
              <TouchableOpacity style={styles.newBtn} onPress={openCreate} activeOpacity={0.85}>
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                <Text style={styles.newBtnText}>New Announcement</Text>
              </TouchableOpacity>
            )}

            {loadingList ? (
              <View style={styles.center}><ActivityIndicator size="small" color="#4f46e5" /></View>
            ) : announcements.length === 0 ? (
              <View style={styles.center}>
                <MaterialCommunityIcons name="bullhorn-outline" size={40} color="#d1d5db" />
                <Text style={[styles.emptyText, { marginTop: 8 }]}>No announcements yet.</Text>
              </View>
            ) : (
              <FlatList
                data={announcements}
                keyExtractor={(a) => String(a.id)}
                renderItem={({ item }) => (
                  <View style={styles.row}>
                    <View style={styles.rowIcon}>
                      <MaterialCommunityIcons name="bullhorn" size={16} color="#4f46e5" />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle}>{item.title}</Text>
                      <Text style={styles.rowBodyText}>{item.body}</Text>
                      <Text style={styles.rowMeta}>{item.createdByName} · {formatDate(item.createdAt)}</Text>
                    </View>
                    {(isSchoolAdmin || item.createdByUserId === currentUser?.id) ? (
                      <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#dc2626" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => setReportTarget(item)} hitSlop={8} accessibilityLabel={`Report ${item.title}`}>
                        <MaterialCommunityIcons name="flag-outline" size={18} color="#6b7280" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              />
            )}
          </View>
        )}

        {view === 'form' && (
          <AnnouncementForm
            schoolId={schoolId}
            onSaved={() => backToList(true)}
            onCancel={() => backToList(false)}
            onClose={onClose}
          />
        )}
        <ReportContentModal visible={!!reportTarget} contentType="ANNOUNCEMENT" contentId={reportTarget?.id} onClose={() => setReportTarget(null)} onSubmitted={() => Alert.alert('Report submitted', 'An app administrator will review it.')} />
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Announcement Form (create) ────────────────────────────────── */
function AnnouncementForm({ schoolId, onSaved, onCancel, onClose }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!body.trim()) { setError('Message is required.'); return; }
    setSaving(true); setError('');
    try {
      await announcementsAPI.create(schoolId, { title: title.trim(), body: body.trim() });
      onSaved();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, 'Failed to post announcement.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
      <View style={styles.sheetHandle} />
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onCancel}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>New Announcement</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Picture Day Reminder"
          placeholderTextColor="#9ca3af"
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        <Text style={styles.fieldLabel}>Message *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Write your announcement..."
          placeholderTextColor="#9ca3af"
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}
        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleCreate} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Post Announcement</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
  sheetHandle:  { alignSelf: 'center', width: 36, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, marginBottom: 16 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle:   { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1, marginHorizontal: 8 },
  center:       { alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText:    { fontSize: 13, color: '#6b7280', textAlign: 'center' },

  newBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 12, marginBottom: 14 },
  newBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  row:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowIcon:     { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  rowBody:     { flex: 1, minWidth: 0 },
  rowTitle:    { fontSize: 14, fontWeight: '700', color: '#111827' },
  rowBodyText: { fontSize: 13, color: '#374151', marginTop: 3, lineHeight: 18 },
  rowMeta:     { fontSize: 11, color: '#9ca3af', marginTop: 6 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4, marginTop: 12 },
  input:      { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 2 },
  textArea:   { minHeight: 110, paddingTop: 12 },
  errorText:  { fontSize: 13, color: '#dc2626', marginTop: 8 },
  saveBtn:         { backgroundColor: '#4f46e5', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16, marginBottom: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
});
