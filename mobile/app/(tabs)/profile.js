import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, Surface, Divider, TextInput, Button } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '../../components/Icon';
import { openAbout, openPrivacyPolicy, openTerms, openCommunityStandards, openSupport, emailSupport } from '../../utils/legalLinks';
import InviteFriendModal from '../../components/InviteFriendModal';

export default function ProfileScreen() {
  const { user, logout, deleteAccount } = useAuth();
  const router = useRouter();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  const isAdmin = user?.appRole === 'APP_ADMIN';

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteVisible(false);
    setDeleteConfirmation('');
    setDeleteError('');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Type DELETE exactly to confirm.');
      return;
    }

    setDeleting(true);
    setDeleteError('');
    const result = await deleteAccount();
    setDeleting(false);

    if (result.success) {
      setDeleteVisible(false);
      router.replace('/login');
    } else {
      setDeleteError(result.error);
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, isAdmin && styles.avatarAdmin]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.displayName}>
            {user ? `${user.firstName} ${user.lastName}` : 'Loading…'}
          </Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>

          {isAdmin && (
            <View style={styles.adminBadge}>
              <MaterialCommunityIcons name="shield-check" size={13} color="#4f46e5" />
              <Text style={styles.adminBadgeText}>App Administrator</Text>
            </View>
          )}
        </View>

        {/* Info card */}
        <Surface style={styles.card} elevation={0}>
          <Text style={styles.cardHeading}>Account Info</Text>

          <InfoRow icon="account" label="First Name" value={user?.firstName ?? '—'} />
          <Divider style={styles.divider} />
          <InfoRow icon="account" label="Last Name"  value={user?.lastName  ?? '—'} />
          <Divider style={styles.divider} />
          <InfoRow icon="email"   label="Email"      value={user?.email     ?? '—'} />
          <Divider style={styles.divider} />
          <InfoRow
            icon="shield-account"
            label="Role"
            value={isAdmin ? 'Administrator' : 'Member'}
            valueColor={isAdmin ? '#4f46e5' : '#111827'}
          />
        </Surface>

        {/* Settings */}
        <Surface style={styles.card} elevation={0}>
          <Text style={styles.cardHeading}>Settings</Text>
          <SettingsRow
            icon="account-plus-outline"
            label="Invite a Friend"
            onPress={() => setInviteVisible(true)}
            accessibilityHint="Opens a form to email a friend an invitation"
          />
          <Divider style={styles.divider} />
          <SettingsRow
            icon="lock-outline"
            label="Privacy Policy"
            onPress={openPrivacyPolicy}
            accessibilityHint="Opens the My Skool Club privacy policy in your browser"
          />
          <Divider style={styles.divider} />
          <SettingsRow icon="file-document-outline" label="Terms of Service" onPress={openTerms} />
          <Divider style={styles.divider} />
          <SettingsRow icon="shield-check-outline" label="Community Standards" onPress={openCommunityStandards} />
          <Divider style={styles.divider} />
          <SettingsRow
            icon="information-outline"
            label="About My Skool Club"
            onPress={openAbout}
            accessibilityHint="Opens the My Skool Club About page in your browser"
          />
          <Divider style={styles.divider} />
          <SettingsRow icon="help-circle-outline" label="Help & Support" onPress={openSupport} />
          <Divider style={styles.divider} />
          <SettingsRow icon="email-outline" label="Email Support" onPress={emailSupport} />
        </Surface>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <MaterialCommunityIcons name="logout" size={18} color="#dc2626" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => setDeleteVisible(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
        >
          <MaterialCommunityIcons name="delete-outline" size={18} color="#991b1b" />
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={deleteVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteDialog}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Surface style={styles.deleteDialog} elevation={5}>
            <View style={styles.deleteDialogIcon}>
              <MaterialCommunityIcons name="alert-outline" size={28} color="#b91c1c" />
            </View>
            <Text style={styles.deleteDialogTitle}>Delete your account?</Text>
            <Text style={styles.deleteDialogBody}>
              This permanently removes your profile, memberships, RSVPs, notifications,
              events, announcements, and draft invoices. Finalized school accounting and
              asset history will be retained without your identity.
            </Text>
            <Text style={styles.deleteDialogBody}>
              You must return any checked-out inventory before deletion.
            </Text>

            <TextInput
              label='Type "DELETE" to confirm'
              accessibilityLabel='Type "DELETE" to confirm'
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              autoCapitalize="characters"
              autoCorrect={false}
              mode="outlined"
              disabled={deleting}
              style={styles.deleteInput}
            />

            {!!deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}

            <View style={styles.deleteActions}>
              <Button mode="text" onPress={closeDeleteDialog} disabled={deleting}>
                Cancel
              </Button>
              <Button
                mode="contained"
                buttonColor="#b91c1c"
                accessibilityLabel="Confirm account deletion"
                onPress={handleDeleteAccount}
                loading={deleting}
                disabled={deleting || deleteConfirmation !== 'DELETE'}
              >
                Delete Account
              </Button>
            </View>
          </Surface>
        </KeyboardAvoidingView>
      </Modal>

      <InviteFriendModal
        visible={inviteVisible}
        onDismiss={() => setInviteVisible(false)}
      />
    </>
  );
}

function InfoRow({ icon, label, value, valueColor = '#111827' }) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color="#9ca3af" style={{ marginRight: 10 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function SettingsRow({ icon, label, onPress, accessibilityHint }) {
  return (
    <TouchableOpacity
      style={styles.settingsRow}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'link' : undefined}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
    >
      <MaterialCommunityIcons name={icon} size={18} color="#6b7280" style={{ marginRight: 10 }} />
      <Text style={styles.settingsLabel}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color="#d1d5db" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f3f4f6' },
  scrollContent: { padding: 16, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarAdmin: { backgroundColor: '#7c3aed' },
  avatarText:  { color: '#fff', fontSize: 28, fontWeight: '700' },
  displayName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  email:       { fontSize: 13, color: '#6b7280', marginTop: 2 },

  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#eef2ff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8,
  },
  adminBadgeText: { fontSize: 12, fontWeight: '600', color: '#4f46e5' },

  card:        { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 },
  cardHeading: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  divider:     { marginVertical: 0 },

  infoRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  infoLabel:  { flex: 1, fontSize: 14, color: '#6b7280' },
  infoValue:  { fontSize: 14, fontWeight: '500' },

  settingsRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  settingsLabel: { flex: 1, fontSize: 14, color: '#111827' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: '#fecaca',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#dc2626' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, marginTop: 10,
  },
  deleteText: { fontSize: 14, fontWeight: '600', color: '#991b1b' },
  modalOverlay: {
    flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)',
  },
  deleteDialog: {
    width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: '#fff',
    borderRadius: 18, padding: 20,
  },
  deleteDialogIcon: {
    width: 52, height: 52, borderRadius: 26, alignSelf: 'center',
    backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  deleteDialogTitle: {
    fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 10,
  },
  deleteDialogBody: {
    fontSize: 14, lineHeight: 20, color: '#4b5563', textAlign: 'center', marginBottom: 10,
  },
  deleteInput: { marginTop: 8 },
  deleteError: { color: '#b91c1c', fontSize: 13, marginTop: 10 },
  deleteActions: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
    gap: 8, marginTop: 18,
  },
});
