import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, RefreshControl, Modal,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
  FlatList, Alert, Linking,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '../../components/Icon';
import { schoolsAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { fuzzyFilter } from '../../utils/fuzzySearch';
import EventsModal from '../../components/EventsModal';
import AnnouncementsModal from '../../components/AnnouncementsModal';
import { getFriendlyErrorMessage } from '../../utils/errors';

export default function SchoolsScreen() {
  const { user } = useAuth();
  const isAppAdmin = user?.appRole === 'APP_ADMIN';

  const [schools, setSchools]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible]       = useState(false);
  const [detailSchoolId, setDetailSchoolId]         = useState(null);

  const loadSchools = useCallback(async () => {
    try {
      const data = await schoolsAPI.getAll();
      setSchools(data);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadSchools(); }, [loadSchools]);

  const onRefresh = () => { setRefreshing(true); loadSchools(); };

  const handleToggleEnabled = async (school) => {
    const action = school.enabled ? 'disable' : 'enable';
    Alert.alert(
      `${school.enabled ? 'Disable' : 'Enable'} School`,
      `Are you sure you want to ${action} "${school.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: school.enabled ? 'Disable' : 'Enable',
          style: school.enabled ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await schoolsAPI.setEnabled(school.id, !school.enabled);
              setSchools((prev) =>
                prev.map((s) => s.id === school.id ? { ...s, enabled: !s.enabled } : s)
              );
            } catch (e) {
              Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to update school.'));
            }
          },
        },
      ]
    );
  };

  const handleToggleTier = (school) => {
    const nextTier = school.tier === 'PREMIUM' ? 'STANDARD' : 'PREMIUM';
    const nextLabel = nextTier === 'PREMIUM' ? 'Premium' : 'Standard';
    Alert.alert(
      `Set ${nextLabel}`,
      `Change "${school.name}" to ${nextLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Set ${nextLabel}`,
          onPress: async () => {
            try {
              const updated = await schoolsAPI.setTier(school.id, nextTier);
              setSchools((prev) => prev.map((item) => item.id === school.id ? updated : item));
            } catch (e) {
              Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to update school tier.'));
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Schools</Text>
          {isAppAdmin && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setAddModalVisible(true)} activeOpacity={0.8}>
              <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add School</Text>
            </TouchableOpacity>
          )}
        </View>

        {schools.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="school-outline" size={56} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Schools Yet</Text>
            <Text style={styles.emptyText}>
              {isAppAdmin ? 'Tap "Add School" to create the first one.' : 'Schools will appear here once they are created.'}
            </Text>
          </View>
        ) : (
          schools.map((school) => (
            <SchoolCard
              key={school.id}
              school={school}
              isAppAdmin={isAppAdmin}
              onToggle={() => handleToggleEnabled(school)}
              onToggleTier={() => handleToggleTier(school)}
              onView={() => setDetailSchoolId(school.id)}
            />
          ))
        )}
      </ScrollView>

      {addModalVisible && (
        <AddSchoolModal
          visible={addModalVisible}
          onClose={() => setAddModalVisible(false)}
          onCreated={() => { setAddModalVisible(false); loadSchools(); }}
        />
      )}

      {detailSchoolId != null && (
        <SchoolDetailModal
          schoolId={detailSchoolId}
          currentUser={user}
          isAppAdmin={isAppAdmin}
          onClose={() => setDetailSchoolId(null)}
        />
      )}
    </View>
  );
}

/* ─── School Card ──────────────────────────────────────────────────── */
function SchoolCard({ school, isAppAdmin, onToggle, onToggleTier, onView }) {
  return (
    <View style={[styles.card, !school.enabled && styles.cardDisabled]}>
      <View style={styles.cardIconWrap}>
        <MaterialCommunityIcons name="school" size={22} color={school.enabled ? '#4f46e5' : '#9ca3af'} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.schoolName, !school.enabled && styles.textMuted]}>{school.name}</Text>
          {!school.enabled && (
            <View style={styles.disabledBadge}>
              <Text style={styles.disabledBadgeText}>Disabled</Text>
            </View>
          )}
          <View style={[styles.tierBadge, school.tier === 'PREMIUM' ? styles.premiumBadge : styles.standardBadge]}>
            <Text style={[styles.tierBadgeText, school.tier === 'PREMIUM' ? styles.premiumBadgeText : styles.standardBadgeText]}>
              {school.tier === 'PREMIUM' ? 'Premium' : 'Standard'}
            </Text>
          </View>
        </View>
        {!!school.description && (
          <Text style={styles.schoolDescription} numberOfLines={2}>{school.description}</Text>
        )}
      </View>
      <View style={styles.cardActions}>
        {isAppAdmin && (
          <>
            <TouchableOpacity style={[styles.actionBtn, styles.tierActionBtn]} onPress={onToggleTier} activeOpacity={0.7}>
              <Text style={[styles.actionBtnText, { color: '#92400e' }]}>
                {school.tier === 'PREMIUM' ? 'Standard' : 'Premium'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, school.enabled ? styles.disableBtn : styles.enableBtn]}
              onPress={onToggle}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionBtnText, { color: school.enabled ? '#dc2626' : '#16a34a' }]}>
                {school.enabled ? 'Disable' : 'Enable'}
              </Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={styles.viewBtn} onPress={onView} activeOpacity={0.7}>
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── School Detail Modal ──────────────────────────────────────────── */
function SchoolDetailModal({ schoolId, currentUser, isAppAdmin, onClose }) {
  const [view, setView] = useState('detail'); // 'detail' | 'edit' | 'pick-admin'
  const [school, setSchool]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Edit form state
  const [editName, setEditName]   = useState('');
  const [editDesc, setEditDesc]   = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving]       = useState(false);

  // Admin picker state
  const [users, setUsers]           = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  // Membership state — own status (regular users)
  const [myMembership, setMyMembership]         = useState(null);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [joiningSchool, setJoiningSchool]       = useState(false);

  // Pending requests state (admins only)
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingPending, setLoadingPending]   = useState(false);

  // Approved members list (admins only)
  const [schoolMembers, setSchoolMembers]   = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch]     = useState('');

  // Privileges (drives Events/Announcements access — any approved member or admin)
  const [schoolPrivileges, setSchoolPrivileges] = useState(new Set());
  const [eventsModalVisible, setEventsModalVisible] = useState(false);
  const [announcementsModalVisible, setAnnouncementsModalVisible] = useState(false);

  const fetchSchool = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await schoolsAPI.getById(schoolId);
      setSchool(data);
      setEditName(data.name);
      setEditDesc(data.description ?? '');
      setEditAddress(data.address ?? '');
      setEditCity(data.city ?? '');
      setEditState(data.state ?? '');
      setEditPostalCode(data.postalCode ?? '');
      setEditWebsite(data.website ?? '');
      setEditPhone(data.phone ?? '');
    } catch (e) {
      setError(getFriendlyErrorMessage(e, 'Failed to load school details.'));
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchSchool(); }, [fetchSchool]);

  useEffect(() => {
    let active = true;
    schoolsAPI.getMyPrivileges(schoolId)
      .then((privs) => { if (active) setSchoolPrivileges(new Set(privs)); })
      .catch(() => { if (active) setSchoolPrivileges(new Set()); });
    return () => { active = false; };
  }, [schoolId]);

  const isSchoolAdmin = isAppAdmin ||
    (school?.admins ?? []).some((a) => a.userId === currentUser?.id);

  const canViewEvents = schoolPrivileges.has('VIEW_EVENTS');
  const canViewAnnouncements = schoolPrivileges.has('VIEW_ANNOUNCEMENTS');

  const handleSaveEdit = async () => {
    if (!editName.trim()) { setError('School name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await schoolsAPI.update(schoolId, {
        name: editName.trim(), description: editDesc.trim(), address: editAddress.trim(),
        city: editCity.trim(), state: editState.trim(), postalCode: editPostalCode.trim(),
        website: editWebsite.trim(), phone: editPhone.trim(),
      });
      await fetchSchool();
      setView('detail');
    } catch (e) {
      setError(getFriendlyErrorMessage(e, 'Failed to save changes.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAdmin = (admin) => {
    if ((school?.admins ?? []).length <= 1) {
      Alert.alert('Cannot Remove', 'A school must have at least one admin. Assign another admin first.');
      return;
    }
    Alert.alert(
      'Remove Admin',
      `Remove ${admin.userFirstName} ${admin.userLastName} as school admin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await schoolsAPI.removeAdmin(schoolId, admin.userId);
              await fetchSchool();
            } catch (e) {
              Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to remove admin.'));
            }
          },
        },
      ]
    );
  };

  const openAdminPicker = async () => {
    setView('pick-admin');
    setUserSearch('');
    setLoadingUsers(true);
    try {
      const data = await usersAPI.getAll();
      setUsers(data);
    } catch (e) {
      setError('Could not load users.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddAdmin = async (u) => {
    setAddingAdmin(true);
    try {
      await schoolsAPI.addAdmin(schoolId, u.id);
      await fetchSchool();
      setView('detail');
    } catch (e) {
      Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to add admin.'));
    } finally {
      setAddingAdmin(false);
    }
  };

  // ---- Membership handlers ----

  const fetchMyMembership = useCallback(async () => {
    setLoadingMembership(true);
    try {
      const data = await schoolsAPI.getMyMembership(schoolId);
      setMyMembership(data || null);
    } catch {
      setMyMembership(null);
    } finally {
      setLoadingMembership(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchMyMembership(); }, [fetchMyMembership]);

  const handleJoinRequest = async () => {
    setJoiningSchool(true);
    try {
      const result = await schoolsAPI.requestToJoin(schoolId);
      setMyMembership(result);
    } catch (e) {
      Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to send membership request.'));
    } finally {
      setJoiningSchool(false);
    }
  };

  const openPendingRequests = async () => {
    setView('pending-requests');
    setLoadingPending(true);
    try {
      const data = await schoolsAPI.getPendingRequests(schoolId);
      setPendingRequests(data);
    } catch (e) {
      setPendingRequests([]);
    } finally {
      setLoadingPending(false);
    }
  };

  const openMembersList = async () => {
    setView('members-list');
    setLoadingMembers(true);
    setMemberSearch('');
    try {
      const data = await schoolsAPI.getMembers(schoolId);
      setSchoolMembers(data);
    } catch (e) {
      setSchoolMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleApprove = async (item) => {
    try {
      await schoolsAPI.approveMember(schoolId, item.userId);
      setPendingRequests((prev) => prev.filter((r) => r.userId !== item.userId));
    } catch (e) {
      Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to approve request.'));
    }
  };

  const handleReject = (item) => {
    Alert.alert(
      'Reject Request',
      `Reject ${item.userFirstName} ${item.userLastName}'s membership request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await schoolsAPI.rejectMember(schoolId, item.userId);
              setPendingRequests((prev) => prev.filter((r) => r.userId !== item.userId));
            } catch (e) {
              Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to reject request.'));
            }
          },
        },
      ]
    );
  };

  const handleRevoke = (item) => {
    Alert.alert(
      'Remove Member',
      `Remove ${item.userFirstName} ${item.userLastName} from this school?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await schoolsAPI.revokeMember(schoolId, item.userId);
              setSchoolMembers((prev) => prev.filter((m) => m.userId !== item.userId));
            } catch (e) {
              Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to remove member.'));
            }
          },
        },
      ]
    );
  };

  const currentAdminIds = new Set((school?.admins ?? []).map((a) => a.userId));
  const filteredUsers = users.filter((u) => {
    if (currentAdminIds.has(u.id)) return false;
    const q = userSearch.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        {/* ── DETAIL view ── */}
        {view === 'detail' && (
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{school?.name ?? 'School'}</Text>
              <TouchableOpacity onPress={onClose} accessibilityLabel="Close add school form" testID="close-add-school-form">
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : error && !school ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Status badge */}
                <View style={styles.detailStatusRow}>
                  <View style={[styles.statusBadge, school.enabled ? styles.enabledBadge : styles.disabledBadgeLarge]}>
                    <MaterialCommunityIcons
                      name={school.enabled ? 'check-circle' : 'cancel'}
                      size={14}
                      color={school.enabled ? '#16a34a' : '#dc2626'}
                    />
                    <Text style={[styles.statusBadgeText, { color: school.enabled ? '#16a34a' : '#dc2626' }]}>
                      {school.enabled ? 'Active' : 'Disabled'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, school.tier === 'PREMIUM' ? styles.premiumBadge : styles.standardBadge]}>
                    <MaterialCommunityIcons name={school.tier === 'PREMIUM' ? 'star-circle' : 'circle-outline'} size={14} color={school.tier === 'PREMIUM' ? '#92400e' : '#4b5563'} />
                    <Text style={[styles.statusBadgeText, { color: school.tier === 'PREMIUM' ? '#92400e' : '#4b5563' }]}>
                      {school.tier === 'PREMIUM' ? 'Premium' : 'Standard'}
                    </Text>
                  </View>
                  {isSchoolAdmin && (
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => { setError(''); setView('edit'); }}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={15} color="#4f46e5" />
                      <Text style={styles.editBtnText}>Edit Details</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Description */}
                {!!school.description && (
                  <View style={styles.descBox}>
                    <Text style={styles.fieldLabel}>About</Text>
                    <Text style={styles.descText}>{school.description}</Text>
                  </View>
                )}

                {(school.address || school.website || school.phone) && (
                  <View style={styles.descBox}>
                    <Text style={styles.fieldLabel}>Contact</Text>
                    {!!school.address && <Text style={styles.descText}>{school.address}{'\n'}{school.city}, {school.state} {school.postalCode}</Text>}
                    {!!school.phone && <TouchableOpacity onPress={() => Linking.openURL(`tel:${school.phone}`)}><Text style={styles.contactLink}>{school.phone}</Text></TouchableOpacity>}
                    {!!school.website && <TouchableOpacity onPress={() => Linking.openURL(school.website)}><Text style={styles.contactLink}>{school.website}</Text></TouchableOpacity>}
                  </View>
                )}

                {/* Admins section */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    School Admins ({(school.admins ?? []).length})
                  </Text>
                  {isSchoolAdmin && (
                    <TouchableOpacity onPress={openAdminPicker} activeOpacity={0.8} style={styles.addAdminBtn}>
                      <MaterialCommunityIcons name="account-plus-outline" size={16} color="#4f46e5" />
                      <Text style={styles.addAdminBtnText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {(school.admins ?? []).length === 0 ? (
                  <Text style={styles.emptyText}>No admins found.</Text>
                ) : (
                  (school.admins ?? []).map((admin) => (
                    <View key={admin.userId} style={styles.adminRow}>
                      <View style={styles.adminAvatar}>
                        <Text style={styles.adminAvatarText}>
                          {admin.userFirstName[0]}{admin.userLastName[0]}
                        </Text>
                      </View>
                      <View style={styles.adminRowBody}>
                        <Text style={styles.adminRowName}>
                          {admin.userFirstName} {admin.userLastName}
                          {admin.userId === currentUser?.id ? ' (you)' : ''}
                        </Text>
                        <Text style={styles.adminRowEmail}>{admin.userEmail}</Text>
                      </View>
                      {isSchoolAdmin && (school.admins ?? []).length > 1 && (
                        <TouchableOpacity
                          onPress={() => handleRemoveAdmin(admin)}
                          activeOpacity={0.7}
                          style={styles.removeAdminBtn}
                        >
                          <MaterialCommunityIcons name="account-minus-outline" size={18} color="#dc2626" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}

                {!!error && <Text style={[styles.errorText, { marginTop: 12 }]}>{error}</Text>}

                {/* ── Membership section ── */}
                {isSchoolAdmin ? (
                  <>
                    <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                      <Text style={styles.sectionTitle}>Membership</Text>
                    </View>
                    <TouchableOpacity style={styles.membershipActionRow} onPress={openPendingRequests} activeOpacity={0.7}>
                      <View style={[styles.membershipActionIcon, { backgroundColor: '#fef3c7' }]}>
                        <MaterialCommunityIcons name="account-clock-outline" size={18} color="#d97706" />
                      </View>
                      <Text style={styles.membershipActionText}>Review Pending Requests</Text>
                      <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.membershipActionRow} onPress={openMembersList} activeOpacity={0.7}>
                      <View style={[styles.membershipActionIcon, { backgroundColor: '#dcfce7' }]}>
                        <MaterialCommunityIcons name="account-multiple-check-outline" size={18} color="#16a34a" />
                      </View>
                      <Text style={styles.membershipActionText}>View Approved Members</Text>
                      <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.myMembershipCard}>
                    <Text style={styles.myMembershipTitle}>Your Membership</Text>
                    {loadingMembership ? (
                      <ActivityIndicator size="small" color="#4f46e5" style={{ marginTop: 8 }} />
                    ) : myMembership?.status === 'APPROVED' ? (
                      <View style={styles.memberStatusRow}>
                        <MaterialCommunityIcons name="check-circle" size={16} color="#16a34a" />
                        <Text style={[styles.memberStatusText, { color: '#16a34a' }]}>Active Member</Text>
                      </View>
                    ) : myMembership?.status === 'PENDING' ? (
                      <View style={styles.memberStatusRow}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color="#d97706" />
                        <Text style={[styles.memberStatusText, { color: '#d97706' }]}>Pending Approval</Text>
                      </View>
                    ) : myMembership?.status === 'REJECTED' ? (
                      <View>
                        <View style={styles.memberStatusRow}>
                          <MaterialCommunityIcons name="close-circle-outline" size={16} color="#dc2626" />
                          <Text style={[styles.memberStatusText, { color: '#dc2626' }]}>Request Rejected</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.joinBtn, { marginTop: 10 }]}
                          onPress={handleJoinRequest}
                          disabled={joiningSchool}
                          activeOpacity={0.85}
                        >
                          {joiningSchool
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={styles.joinBtnText}>Request Again</Text>}
                        </TouchableOpacity>
                      </View>
                    ) : currentUser?.emailVerified === false ? (
                      <View style={styles.memberStatusRow}>
                        <MaterialCommunityIcons name="email-alert-outline" size={16} color="#d97706" />
                        <Text style={[styles.memberStatusText, { color: '#d97706' }]}>
                          Verify your email to join
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.joinBtn}
                        onPress={handleJoinRequest}
                        disabled={joiningSchool}
                        activeOpacity={0.85}
                      >
                        {joiningSchool
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={styles.joinBtnText}>Request to Join</Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {canViewEvents && (
                  <>
                    <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                      <Text style={styles.sectionTitle}>Events</Text>
                    </View>
                    <TouchableOpacity style={styles.membershipActionRow} onPress={() => setEventsModalVisible(true)} activeOpacity={0.7}>
                      <View style={[styles.membershipActionIcon, { backgroundColor: '#ede9fe' }]}>
                        <MaterialCommunityIcons name="calendar-star" size={18} color="#4f46e5" />
                      </View>
                      <Text style={styles.membershipActionText}>View Events &amp; RSVP</Text>
                      <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
                    </TouchableOpacity>
                  </>
                )}

                {canViewAnnouncements && (
                  <>
                    <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                      <Text style={styles.sectionTitle}>Announcements</Text>
                    </View>
                    <TouchableOpacity style={styles.membershipActionRow} onPress={() => setAnnouncementsModalVisible(true)} activeOpacity={0.7}>
                      <View style={[styles.membershipActionIcon, { backgroundColor: '#fffbeb' }]}>
                        <MaterialCommunityIcons name="bullhorn" size={18} color="#d97706" />
                      </View>
                      <Text style={styles.membershipActionText}>View Announcements</Text>
                      <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        )}

        {eventsModalVisible && (
          <EventsModal
            schoolId={schoolId}
            currentUser={currentUser}
            canCreate={schoolPrivileges.has('CREATE_EVENT')}
            isSchoolAdmin={isSchoolAdmin}
            onClose={() => setEventsModalVisible(false)}
          />
        )}

        {announcementsModalVisible && (
          <AnnouncementsModal
            schoolId={schoolId}
            currentUser={currentUser}
            canCreate={schoolPrivileges.has('CREATE_ANNOUNCEMENT')}
            isSchoolAdmin={isSchoolAdmin}
            onClose={() => setAnnouncementsModalVisible(false)}
          />
        )}

        {/* ── EDIT view ── */}
        {view === 'edit' && (
          <View style={[styles.modalSheet, { maxHeight: '92%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setError(''); setView('detail'); }}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit School</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>School Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lincoln High School"
              placeholderTextColor="#9ca3af"
              value={editName}
              onChangeText={setEditName}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Brief description of the school…"
              placeholderTextColor="#9ca3af"
              value={editDesc}
              onChangeText={setEditDesc}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.fieldLabel}>Street Address</Text>
            <TextInput style={styles.input} value={editAddress} onChangeText={setEditAddress} placeholder="Street address" placeholderTextColor="#9ca3af" />
            <Text style={styles.fieldLabel}>City</Text>
            <TextInput style={styles.input} value={editCity} onChangeText={setEditCity} placeholder="City" placeholderTextColor="#9ca3af" />
            <Text style={styles.fieldLabel}>State or Region</Text>
            <TextInput style={styles.input} value={editState} onChangeText={setEditState} placeholder="State or region" placeholderTextColor="#9ca3af" />
            <Text style={styles.fieldLabel}>ZIP or Postal Code</Text>
            <TextInput style={styles.input} value={editPostalCode} onChangeText={setEditPostalCode} placeholder="ZIP or postal code" placeholderTextColor="#9ca3af" />
            <Text style={styles.fieldLabel}>Main School Phone</Text>
            <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="Main school phone" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />
            <Text style={styles.fieldLabel}>School Website</Text>
            <TextInput style={styles.input} value={editWebsite} onChangeText={setEditWebsite} placeholder="https://school.example" placeholderTextColor="#9ca3af" keyboardType="url" autoCapitalize="none" />

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveEdit}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* ── PICK-ADMIN view ── */}
        {view === 'pick-admin' && (
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setView('detail')}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add School Admin</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { marginBottom: 8 }]}
              placeholder="Search by name or email…"
              placeholderTextColor="#9ca3af"
              value={userSearch}
              onChangeText={setUserSearch}
              autoFocus
            />

            {loadingUsers || addingAdmin ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : (
              <FlatList
                data={filteredUsers}
                keyExtractor={(u) => String(u.id)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: u }) => (
                  <TouchableOpacity
                    style={styles.userRow}
                    onPress={() => handleAddAdmin(u)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.adminAvatar}>
                      <Text style={styles.adminAvatarText}>{u.firstName[0]}{u.lastName[0]}</Text>
                    </View>
                    <View style={styles.userRowBody}>
                      <Text style={styles.userRowName}>{u.firstName} {u.lastName}</Text>
                      <Text style={styles.userRowEmail}>{u.email}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No users match your search.</Text>
                }
              />
            )}
          </View>
        )}

        {/* ── PENDING REQUESTS view ── */}
        {view === 'pending-requests' && (
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setView('detail')}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Pending Requests</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {loadingPending ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : pendingRequests.length === 0 ? (
              <View style={styles.center}>
                <MaterialCommunityIcons name="account-clock-outline" size={40} color="#d1d5db" />
                <Text style={[styles.emptyText, { marginTop: 8 }]}>No pending membership requests.</Text>
              </View>
            ) : (
              <FlatList
                data={pendingRequests}
                keyExtractor={(r) => String(r.userId)}
                renderItem={({ item }) => (
                  <View style={styles.pendingRow}>
                    <View style={styles.adminAvatar}>
                      <Text style={styles.adminAvatarText}>
                        {item.userFirstName[0]}{item.userLastName[0]}
                      </Text>
                    </View>
                    <View style={styles.userRowBody}>
                      <Text style={styles.userRowName}>{item.userFirstName} {item.userLastName}</Text>
                      <Text style={styles.userRowEmail}>{item.userEmail}</Text>
                    </View>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)} activeOpacity={0.7}>
                      <MaterialCommunityIcons name="check" size={18} color="#16a34a" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)} activeOpacity={0.7}>
                      <MaterialCommunityIcons name="close" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        )}

        {/* ── MEMBERS LIST view ── */}
        {view === 'members-list' && (
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setView('detail')}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Approved Members</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {schoolMembers.length > 0 && (
              <TextInput
                style={[styles.input, { marginBottom: 8 }]}
                placeholder="Search by name…"
                placeholderTextColor="#9ca3af"
                value={memberSearch}
                onChangeText={setMemberSearch}
              />
            )}

            {loadingMembers ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : schoolMembers.length === 0 ? (
              <View style={styles.center}>
                <MaterialCommunityIcons name="account-multiple-outline" size={40} color="#d1d5db" />
                <Text style={[styles.emptyText, { marginTop: 8 }]}>No approved members yet.</Text>
              </View>
            ) : (
              <FlatList
                data={fuzzyFilter(schoolMembers, memberSearch, (m) => [`${m.userFirstName} ${m.userLastName}`, m.userEmail])}
                keyExtractor={(m) => String(m.userId)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <View style={styles.pendingRow}>
                    <View style={styles.adminAvatar}>
                      <Text style={styles.adminAvatarText}>
                        {item.userFirstName[0]}{item.userLastName[0]}
                      </Text>
                    </View>
                    <View style={styles.userRowBody}>
                      <Text style={styles.userRowName}>{item.userFirstName} {item.userLastName}</Text>
                      <Text style={styles.userRowEmail}>{item.userEmail}</Text>
                    </View>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRevoke(item)} activeOpacity={0.7}>
                      <MaterialCommunityIcons name="account-remove-outline" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={[styles.center, { marginTop: 16 }]}>
                    <Text style={styles.emptyText}>No members match "{memberSearch}".</Text>
                  </View>
                }
              />
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Add School Modal ─────────────────────────────────────────────── */
function AddSchoolModal({ visible, onClose, onCreated }) {
  const [step, setStep]             = useState('form'); // 'form' | 'pick-admin'
  const [form, setForm]             = useState({ name: '', description: '' });
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [users, setUsers]           = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (!visible) return;
    setLoadingUsers(true);
    usersAPI.getAll()
      .then(setUsers)
      .catch(() => setError('Could not load users.'))
      .finally(() => setLoadingUsers(false));
  }, [visible]);

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const handleCreate = async () => {
    if (!form.name.trim())  { setError('School name is required.'); return; }
    if (!selectedAdmin)     { setError('A school admin must be selected.'); return; }
    setSaving(true);
    setError('');
    try {
      await schoolsAPI.create({
        name: form.name.trim(),
        description: form.description.trim(),
        adminUserId: selectedAdmin.id,
      });
      onCreated();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, 'Failed to create school.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        {step === 'form' ? (
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add School</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>School Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lincoln High School"
              placeholderTextColor="#9ca3af"
              value={form.name}
              onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Brief description of the school…"
              placeholderTextColor="#9ca3af"
              value={form.description}
              onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.fieldLabel}>School Admin *</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, selectedAdmin && styles.pickerBtnSelected]}
              onPress={() => setStep('pick-admin')}
              activeOpacity={0.8}
            >
              {selectedAdmin ? (
                <View style={styles.pickerBtnInner}>
                  <View style={styles.adminAvatar}>
                    <Text style={styles.adminAvatarText}>
                      {selectedAdmin.firstName[0]}{selectedAdmin.lastName[0]}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.pickerBtnName}>{selectedAdmin.firstName} {selectedAdmin.lastName}</Text>
                    <Text style={styles.pickerBtnEmail}>{selectedAdmin.email}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.pickerBtnInner}>
                  <MaterialCommunityIcons name="account-plus-outline" size={20} color="#6b7280" />
                  <Text style={styles.pickerBtnPlaceholder}>
                    {loadingUsers ? 'Loading users…' : '— Tap to select a school admin —'}
                  </Text>
                </View>
              )}
              <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
            </TouchableOpacity>
            <Text style={styles.fieldHint}>This user will manage the school. Required before creating.</Text>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleCreate}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveBtnText}>Create School</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          /* ── User picker step ── */
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setStep('form')}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select School Admin</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { marginBottom: 8 }]}
              placeholder="Search by name or email…"
              placeholderTextColor="#9ca3af"
              value={userSearch}
              onChangeText={setUserSearch}
              autoFocus
            />

            {loadingUsers ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : (
              <FlatList
                data={filteredUsers}
                keyExtractor={(u) => String(u.id)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: u }) => (
                  <TouchableOpacity
                    style={[styles.userRow, selectedAdmin?.id === u.id && styles.userRowSelected]}
                    onPress={() => { setSelectedAdmin(u); setStep('form'); }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.adminAvatar}>
                      <Text style={styles.adminAvatarText}>{u.firstName[0]}{u.lastName[0]}</Text>
                    </View>
                    <View style={styles.userRowBody}>
                      <Text style={styles.userRowName}>{u.firstName} {u.lastName}</Text>
                      <Text style={styles.userRowEmail}>{u.email}</Text>
                    </View>
                    {selectedAdmin?.id === u.id && (
                      <MaterialCommunityIcons name="check-circle" size={20} color="#4f46e5" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No users match your search.</Text>
                }
              />
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f3f4f6' },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#4f46e5', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardDisabled: { backgroundColor: '#f9fafb' },
  cardIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cardBody:      { flex: 1 },
  cardTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardActions:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  schoolName:        { fontSize: 15, fontWeight: '600', color: '#111827' },
  schoolDescription: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  textMuted:         { color: '#9ca3af' },
  disabledBadge: {
    backgroundColor: '#fee2e2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  disabledBadgeText: { fontSize: 10, fontWeight: '700', color: '#dc2626' },
  tierBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tierBadgeText: { fontSize: 10, fontWeight: '700' },
  contactLink: { color: '#4f46e5', textDecorationLine: 'underline', marginTop: 6 },
  premiumBadge: { backgroundColor: '#fef3c7' },
  premiumBadgeText: { color: '#92400e' },
  standardBadge: { backgroundColor: '#f3f4f6' },
  standardBadgeText: { color: '#4b5563' },

  viewBtn: {
    backgroundColor: '#f3f4f6', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12,
  },
  viewBtnText: { fontSize: 12, fontWeight: '600', color: '#4f46e5' },
  actionBtn: {
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1,
  },
  disableBtn: { backgroundColor: '#fff5f5', borderColor: '#fecaca' },
  enableBtn:  { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  tierActionBtn: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptyText:      { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 19 },

  /* Detail modal */
  detailStatusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  enabledBadge:      { backgroundColor: '#dcfce7' },
  disabledBadgeLarge: { backgroundColor: '#fee2e2' },
  statusBadgeText:   { fontSize: 12, fontWeight: '700' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eef2ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  editBtnText: { fontSize: 12, fontWeight: '600', color: '#4f46e5' },

  descBox:   { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 16 },
  descText:  { fontSize: 14, color: '#374151', lineHeight: 20 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: '#111827' },
  addAdminBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eef2ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  addAdminBtnText: { fontSize: 12, fontWeight: '600', color: '#4f46e5' },

  adminRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f4f6',
  },
  adminRowBody:  { flex: 1 },
  adminRowName:  { fontSize: 14, fontWeight: '600', color: '#111827' },
  adminRowEmail: { fontSize: 12, color: '#6b7280' },
  removeAdminBtn: { padding: 4 },

  /* Modal */
  modalOverlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1, marginHorizontal: 8 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldHint:  { fontSize: 11, color: '#9ca3af', marginBottom: 16, marginTop: -10 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 16,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#f9fafb', marginBottom: 6,
  },
  pickerBtnSelected: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  pickerBtnInner:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  pickerBtnPlaceholder: { fontSize: 14, color: '#9ca3af' },
  pickerBtnName:  { fontSize: 14, fontWeight: '600', color: '#111827' },
  pickerBtnEmail: { fontSize: 12, color: '#6b7280' },

  adminAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center',
  },
  adminAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f4f6',
  },
  userRowSelected: { backgroundColor: '#eef2ff', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 10 },
  userRowBody:  { flex: 1 },
  userRowName:  { fontSize: 14, fontWeight: '600', color: '#111827' },
  userRowEmail: { fontSize: 12, color: '#6b7280' },

  errorText: { fontSize: 13, color: '#dc2626', marginBottom: 12 },
  saveBtn: {
    backgroundColor: '#4f46e5', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Membership management rows (admin)
  membershipActionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f4f6',
  },
  membershipActionIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  membershipActionText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },

  // User's own membership card
  myMembershipCard: {
    backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, marginTop: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  myMembershipTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  memberStatusRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberStatusText:  { fontSize: 14, fontWeight: '600' },
  joinBtn: {
    backgroundColor: '#4f46e5', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', marginTop: 4,
  },
  joinBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Pending / members list rows
  pendingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f4f6',
  },
  approveBtn: {
    width: 34, height: 34, borderRadius: 8, backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center',
  },
  rejectBtn: {
    width: 34, height: 34, borderRadius: 8, backgroundColor: '#fef2f2',
    alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
});
