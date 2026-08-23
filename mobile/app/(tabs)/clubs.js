import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, RefreshControl, Modal,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
  FlatList, Alert,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { schoolsAPI, clubsAPI, invoicesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useMySchool } from '../../hooks/useMySchool';
import InvoicesModal from '../../components/InvoicesModal';
import InventoryModal from '../../components/InventoryModal';
import { fuzzyFilter } from '../../utils/fuzzySearch';
import { getFriendlyErrorMessage } from '../../utils/errors';

const INVOICE_STATUS_STYLES = {
  DRAFT:     { bg: '#f3f4f6', fg: '#4b5563', label: 'Draft' },
  SUBMITTED: { bg: '#fef3c7', fg: '#d97706', label: 'Submitted' },
  APPROVED:  { bg: '#dbeafe', fg: '#2563eb', label: 'Approved' },
  PAID:      { bg: '#dcfce7', fg: '#16a34a', label: 'Paid' },
  CANCELLED: { bg: '#fee2e2', fg: '#dc2626', label: 'Cancelled' },
};
const INVOICE_STATUS_ORDER = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CANCELLED'];

function money(n) {
  const num = Number(n ?? 0);
  return `$${num.toFixed(2)}`;
}

/* ─── Main Screen ────────────────────────────────────────────────── */
export default function ClubsScreen() {
  const { user } = useAuth();
  const isAppAdmin = user?.appRole === 'APP_ADMIN';

  // Regular members: a member can only ever belong to one school, so it's
  // auto-resolved here — no manual school picker needed.
  const { school: myFixedSchool, privileges: myFixedPrivileges, loading: loadingMySchool, reload: reloadMySchool } = useMySchool(user);

  // App admins manage many schools, so they keep the manual school picker.
  const [schools, setSchools]               = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [loadingSchools, setLoadingSchools] = useState(true);

  const [schoolPrivileges, setSchoolPrivileges] = useState(new Set()); // privilege names for the effective school
  const [clubs, setClubs]                       = useState([]);
  const [loadingClubs, setLoadingClubs]         = useState(false);
  const [refreshing, setRefreshing]             = useState(false);
  const [detailClubId, setDetailClubId]         = useState(null);
  const [addModalVisible, setAddModalVisible]   = useState(false);

  const loadSchools = useCallback(async () => {
    if (!isAppAdmin) { setLoadingSchools(false); setRefreshing(false); return; }
    try {
      const data = await schoolsAPI.getAll();
      setSchools(data);
    } catch (e) {
    } finally {
      setLoadingSchools(false);
      setRefreshing(false);
    }
  }, [isAppAdmin]);

  useEffect(() => { loadSchools(); }, [loadSchools]);

  // The school driving the clubs fetch: the admin's manual pick, or the
  // member's single auto-resolved school.
  const effectiveSchoolId = isAppAdmin ? selectedSchoolId : (myFixedSchool?.id ?? null);

  useEffect(() => {
    if (!effectiveSchoolId) {
      setSchoolPrivileges(new Set());
      setClubs([]);
      return;
    }
    let active = true;
    setLoadingClubs(true);
    (async () => {
      const [privsResult, clubsResult] = await Promise.allSettled([
        isAppAdmin ? schoolsAPI.getMyPrivileges(effectiveSchoolId) : Promise.resolve([...myFixedPrivileges]),
        clubsAPI.listClubs(effectiveSchoolId),
      ]);
      if (!active) return;
      setSchoolPrivileges(
        privsResult.status === 'fulfilled' ? new Set(privsResult.value) : new Set()
      );
      setClubs(
        clubsResult.status === 'fulfilled' ? clubsResult.value : []
      );
      setLoadingClubs(false);
    })();
    return () => { active = false; };
  }, [effectiveSchoolId, isAppAdmin, myFixedPrivileges]);

  const onRefresh = () => {
    setRefreshing(true);
    if (isAppAdmin) {
      loadSchools();
    } else {
      reloadMySchool().finally(() => setRefreshing(false));
    }
  };

  // Privilege helpers — truths from the backend, no client-side role derivation
  const canSeeClubs  = schoolPrivileges.has('VIEW_ALL_CLUBS');
  const canAddClub   = schoolPrivileges.has('ADD_CLUB');
  const canDeleteClub = schoolPrivileges.has('DELETE_CLUB');
  const selectedSchool = isAppAdmin ? schools.find((s) => s.id === selectedSchoolId) : myFixedSchool;

  const handleDeleteClub = (club) => {
    Alert.alert(
      'Delete Club',
      `Delete "${club.name}"? All club memberships will be removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await clubsAPI.deleteClub(club.schoolId, club.id);
              setClubs((prev) => prev.filter((c) => c.id !== club.id));
            } catch (e) {
              Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to delete club.'));
            }
          },
        },
      ]
    );
  };

  const loadingInitial = isAppAdmin ? loadingSchools : loadingMySchool;
  if (loadingInitial) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Clubs</Text>
          {canAddClub && effectiveSchoolId && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setAddModalVisible(true)} activeOpacity={0.8}>
              <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add Club</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* School picker — app admins only; regular members auto-use their one school */}
        {isAppAdmin && schools.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>School</Text>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingVertical: 4 }}
            >
              {schools.map((school) => (
                <TouchableOpacity
                  key={school.id}
                  style={[styles.schoolChip, selectedSchoolId === school.id && styles.schoolChipActive]}
                  onPress={() => setSelectedSchoolId(selectedSchoolId === school.id ? null : school.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.schoolChipText, selectedSchoolId === school.id && styles.schoolChipTextActive]}>
                    {school.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {!isAppAdmin && myFixedSchool && (
          <Text style={styles.sectionLabel}>{myFixedSchool.name}</Text>
        )}

        {/* Content */}
        {!effectiveSchoolId ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="account-group-outline" size={52} color="#d1d5db" />
            <Text style={styles.emptyTitle}>{isAppAdmin ? 'Select a School' : 'Join a School'}</Text>
            <Text style={styles.emptyText}>
              {isAppAdmin ? 'Choose a school above to browse its clubs.' : 'Join a school and get approved to browse its clubs.'}
            </Text>
          </View>
        ) : !canSeeClubs ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="lock-outline" size={52} color="#d1d5db" />
            <Text style={styles.emptyTitle}>Members Only</Text>
            <Text style={styles.emptyText}>
              Join {selectedSchool?.name ?? 'this school'} to browse its clubs.
            </Text>
          </View>
        ) : loadingClubs ? (
          <View style={[styles.center, { marginTop: 40 }]}>
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        ) : clubs.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="account-group-outline" size={52} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Clubs Yet</Text>
            <Text style={styles.emptyText}>
          {canAddClub ? 'Tap "Add Club" to create the first one.' : 'No clubs have been created for this school yet.'}
            </Text>
          </View>
        ) : (
          clubs.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              canDeleteClub={canDeleteClub}
              onView={() => setDetailClubId(club.id)}
              onDelete={() => handleDeleteClub(club)}
            />
          ))
        )}
      </ScrollView>

      {addModalVisible && effectiveSchoolId && (
        <AddClubModal
          visible={addModalVisible}
          schoolId={effectiveSchoolId}
          onClose={() => setAddModalVisible(false)}
          onCreated={(club) => { setAddModalVisible(false); setClubs((prev) => [...prev, club]); }}
        />
      )}

      {detailClubId != null && (
        <ClubDetailModal
          clubId={detailClubId}
          currentUser={user}
          schoolPrivileges={schoolPrivileges}
          onClose={() => setDetailClubId(null)}
          onClubUpdated={(updated) => setClubs((prev) => prev.map((c) => c.id === updated.id ? updated : c))}
          onClubDeleted={(id) => { setDetailClubId(null); setClubs((prev) => prev.filter((c) => c.id !== id)); }}
        />
      )}
    </View>
  );
}


/* ─── Club Card ──────────────────────────────────────────────────── */
function ClubCard({ club, canDeleteClub, onView, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardIconWrap}>
        <MaterialCommunityIcons name="account-group" size={22} color="#4f46e5" />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.clubName}>{club.name}</Text>
        {!!club.description && (
          <Text style={styles.clubDescription} numberOfLines={2}>{club.description}</Text>
        )}
      </View>
      <View style={styles.cardActions}>
        {canDeleteClub && (
          <TouchableOpacity style={styles.deleteIconBtn} onPress={onDelete} activeOpacity={0.7}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#dc2626" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.viewBtn} onPress={onView} activeOpacity={0.7}>
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── Club Detail Modal ──────────────────────────────────────────── */
function ClubDetailModal({ clubId, currentUser, schoolPrivileges, onClose, onClubUpdated, onClubDeleted }) {
  const [view, setView]       = useState('detail');
  const [club, setClub]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving]     = useState(false);

  const [myMembership, setMyMembership]           = useState(null);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [requestingJoin, setRequestingJoin]       = useState(false);

  // Club-level privileges fetched from the backend
  const [clubPrivileges, setClubPrivileges] = useState(new Set());

  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingPending, setLoadingPending]   = useState(false);
  const [members, setMembers]                 = useState([]);
  const [loadingMembers, setLoadingMembers]   = useState(false);
  const [memberSearch, setMemberSearch]       = useState('');
  const [invoicesModalVisible, setInvoicesModalVisible] = useState(false);
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);

  // Club dashboard (members + invoices overview, visible to all approved members)
  const [dashboardMembers, setDashboardMembers]   = useState([]);
  const [dashboardInvoices, setDashboardInvoices] = useState([]);
  const [loadingDashboard, setLoadingDashboard]   = useState(false);
  const [dashboardError, setDashboardError]       = useState('');

  // Admin picker state
  const [adminCandidates, setAdminCandidates]   = useState([]);
  const [loadingAdminPick, setLoadingAdminPick] = useState(false);
  const [adminSearch, setAdminSearch]           = useState('');
  const [addingAdmin, setAddingAdmin]           = useState(false);

  const fetchClub = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await clubsAPI.getClub(clubId);
      setClub(data); setEditName(data.name); setEditDesc(data.description ?? '');
    } catch (e) {
      setError(getFriendlyErrorMessage(e, 'Failed to load club.'));
    } finally { setLoading(false); }
  }, [clubId]);

  const fetchMyMembership = useCallback(async () => {
    setLoadingMembership(true);
    try {
      setMyMembership(await clubsAPI.getMyMembership(clubId) || null);
    } catch { setMyMembership(null); }
    finally { setLoadingMembership(false); }
  }, [clubId]);

  const fetchClubPrivileges = useCallback(async () => {
    try {
      const privs = await clubsAPI.getMyPrivileges(clubId);
      setClubPrivileges(new Set(privs));
    } catch { setClubPrivileges(new Set()); }
  }, [clubId]);

  useEffect(() => {
    fetchClub();
    fetchMyMembership();
    fetchClubPrivileges();
  }, [fetchClub, fetchMyMembership, fetchClubPrivileges]);

  // School-level: can edit/delete the club itself (MODIFY_CLUB / DELETE_CLUB)
  const canEditClub     = schoolPrivileges.has('MODIFY_CLUB');
  const canDeleteClub   = schoolPrivileges.has('DELETE_CLUB');
  // Club-level privileges from the backend
  const canViewMembers  = clubPrivileges.has('VIEW_CLUB_MEMBERS');
  const isClubAdmin     = clubPrivileges.has('ADD_CLUB_MEMBER');   // ADD_CLUB_MEMBER = club admin
  const canManageAdmins = clubPrivileges.has('MANAGE_CLUB_ADMINS');
  const canViewInvoices = clubPrivileges.has('VIEW_INVOICES');
  const canCreateInvoice = clubPrivileges.has('CREATE_INVOICE');
  const canApproveInvoice = clubPrivileges.has('APPROVE_INVOICE');
  const canViewInventory = clubPrivileges.has('VIEW_INVENTORY');
  const canCheckoutInventory = clubPrivileges.has('CHECKOUT_INVENTORY');
  const canManageInventory = clubPrivileges.has('MANAGE_INVENTORY');
  const isApprovedMember  = myMembership?.status === 'APPROVED';   // kept for status display
  // Managing via school role means no club membership row needed
  const managingViaSchool = (canEditClub || canDeleteClub) && !myMembership;

  const handleSaveEdit = async () => {
    if (!editName.trim()) { setError('Club name is required.'); return; }
    setSaving(true); setError('');
    try {
      const updated = await clubsAPI.updateClub(club.schoolId, clubId, {
        name: editName.trim(), description: editDesc.trim() || null,
      });
      onClubUpdated(updated); setClub(updated); setView('detail');
    } catch (e) { setError(getFriendlyErrorMessage(e, 'Failed to save changes.')); }
    finally { setSaving(false); }
  };

  const handleDelete = () => {
    Alert.alert('Delete Club', `Delete "${club?.name}"? All memberships will be removed. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await clubsAPI.deleteClub(club.schoolId, clubId); onClubDeleted(clubId); }
          catch (e) { Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to delete club.')); }
        },
      },
    ]);
  };

  const handleJoinRequest = async () => {
    setRequestingJoin(true);
    try { setMyMembership(await clubsAPI.requestToJoin(clubId)); }
    catch (e) { Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to send membership request.')); }
    finally { setRequestingJoin(false); }
  };

  const openPendingRequests = async () => {
    setView('pending-requests'); setLoadingPending(true);
    try { setPendingRequests(await clubsAPI.getPendingRequests(clubId)); }
    catch { setPendingRequests([]); } finally { setLoadingPending(false); }
  };

  const openMembers = async () => {
    setView('members'); setLoadingMembers(true); setMemberSearch('');
    try { setMembers(await clubsAPI.getMembers(clubId)); }
    catch { setMembers([]); } finally { setLoadingMembers(false); }
  };

  const openDashboard = async () => {
    setView('dashboard'); setLoadingDashboard(true); setDashboardError('');
    try {
      const [membersResult, invoicesResult] = await Promise.allSettled([
        clubsAPI.getMembers(clubId),
        invoicesAPI.list(clubId),
      ]);
      setDashboardMembers(membersResult.status === 'fulfilled' ? membersResult.value : []);
      setDashboardInvoices(invoicesResult.status === 'fulfilled' ? invoicesResult.value : []);
      if (membersResult.status === 'rejected' && invoicesResult.status === 'rejected') {
        setDashboardError('Failed to load dashboard data.');
      }
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleApprove = async (item) => {
    try {
      await clubsAPI.approveMember(clubId, item.userId);
      setPendingRequests((prev) => prev.filter((r) => r.userId !== item.userId));
    } catch (e) { Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to approve.')); }
  };

  const handleReject = (item) => {
    Alert.alert('Reject Request', `Reject ${item.userFirstName} ${item.userLastName}'s request?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          try {
            await clubsAPI.rejectMember(clubId, item.userId);
            setPendingRequests((prev) => prev.filter((r) => r.userId !== item.userId));
          } catch (e) { Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to reject.')); }
        },
      },
    ]);
  };

  const handleRevoke = (item) => {
    Alert.alert('Remove Member', `Remove ${item.userFirstName} ${item.userLastName} from this club?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await clubsAPI.revokeMember(clubId, item.userId);
            setMembers((prev) => prev.filter((m) => m.userId !== item.userId));
          } catch (e) { Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to remove.')); }
        },
      },
    ]);
  };

  const openAdminPicker = async () => {
    setView('pick-admin');
    setAdminSearch('');
    setLoadingAdminPick(true);
    try { setAdminCandidates(await clubsAPI.getMembers(clubId)); }
    catch { setAdminCandidates([]); }
    finally { setLoadingAdminPick(false); }
  };

  const handleAddAdmin = async (member) => {
    setAddingAdmin(true);
    try {
      await clubsAPI.addAdmin(clubId, member.userId);
      await fetchClub();
      setView('detail');
    } catch (e) { Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to add admin.')); }
    finally { setAddingAdmin(false); }
  };

  const handleRemoveAdmin = (admin) => {
    if ((club?.admins ?? []).length <= 1) {
      Alert.alert('Cannot Remove', 'A club must have at least one admin. Assign another admin first.');
      return;
    }
    Alert.alert('Remove Admin', `Remove ${admin.userFirstName} ${admin.userLastName} as club admin?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await clubsAPI.removeAdmin(clubId, admin.userId);
            await fetchClub();
          } catch (e) { Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to remove admin.')); }
        },
      },
    ]);
  };

  // Dashboard stats derived from the fetched members + invoices lists
  const dashboardTotalPaid = dashboardInvoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const dashboardOutstanding = dashboardInvoices
    .filter((inv) => inv.status === 'APPROVED')
    .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const dashboardStatusCounts = dashboardInvoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>

        {/* ── DETAIL ── */}
        {view === 'detail' && (
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{club?.name ?? 'Club'}</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.center}><ActivityIndicator size="small" color="#4f46e5" /></View>
            ) : error && !club ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* School badge + admin actions */}
                <View style={styles.detailTopRow}>
                  <View style={styles.schoolBadge}>
                    <MaterialCommunityIcons name="school-outline" size={13} color="#4f46e5" />
                    <Text style={styles.schoolBadgeText} numberOfLines={1}>{club.schoolName}</Text>
                  </View>
                  {(canEditClub || canDeleteClub) && (
                    <View style={styles.adminActionBtns}>
                      {canEditClub && (
                        <TouchableOpacity style={styles.editBtn} onPress={() => { setError(''); setView('edit'); }} activeOpacity={0.8}>
                          <MaterialCommunityIcons name="pencil-outline" size={15} color="#4f46e5" />
                          <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>
                      )}
                      {canDeleteClub && (
                        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
                          <MaterialCommunityIcons name="trash-can-outline" size={15} color="#dc2626" />
                          <Text style={styles.deleteBtnText}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                {!!club.description && (
                  <View style={styles.descBox}>
                    <Text style={styles.fieldLabel}>About</Text>
                    <Text style={styles.descText}>{club.description}</Text>
                  </View>
                )}

                {/* ── Club Admins ── */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Club Admins ({(club?.admins ?? []).length})
                  </Text>
                  {canManageAdmins && (
                    <TouchableOpacity onPress={openAdminPicker} activeOpacity={0.8} style={styles.addAdminBtn}>
                      <MaterialCommunityIcons name="account-plus-outline" size={16} color="#4f46e5" />
                      <Text style={styles.addAdminBtnText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {(club?.admins ?? []).map((admin) => (
                  <View key={admin.userId} style={styles.adminRow}>
                    <View style={styles.adminAvatar}>
                      <Text style={styles.adminAvatarText}>{admin.userFirstName[0]}{admin.userLastName[0]}</Text>
                    </View>
                    <View style={styles.adminRowBody}>
                      <Text style={styles.adminRowName}>
                        {admin.userFirstName} {admin.userLastName}
                        {admin.userId === currentUser?.id ? ' (you)' : ''}
                      </Text>
                      <Text style={styles.adminRowEmail}>{admin.userEmail}</Text>
                    </View>
                    {canManageAdmins && (club?.admins ?? []).length > 1 && (
                      <TouchableOpacity onPress={() => handleRemoveAdmin(admin)} activeOpacity={0.7} style={styles.removeAdminBtn}>
                        <MaterialCommunityIcons name="account-minus-outline" size={18} color="#dc2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {!!error && <Text style={[styles.errorText, { marginTop: 8 }]}>{error}</Text>}

                {/* ── My Membership ── */}
                <View style={styles.myMembershipCard}>
                  <Text style={styles.myMembershipTitle}>Your Membership</Text>
                  {loadingMembership ? (
                    <ActivityIndicator size="small" color="#4f46e5" style={{ marginTop: 8 }} />
                  ) : isApprovedMember ? (
                    <View style={styles.memberStatusRow}>
                      <MaterialCommunityIcons name="check-circle" size={16} color="#16a34a" />
                      <Text style={[styles.memberStatusText, { color: '#16a34a' }]}>
                        {myMembership.role === 'ADMIN' ? 'Club Admin' : 'Club Member'}
                      </Text>
                    </View>
                  ) : myMembership?.status === 'PENDING' ? (
                    <View style={styles.memberStatusRow}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color="#d97706" />
                      <Text style={[styles.memberStatusText, { color: '#d97706' }]}>Awaiting Approval</Text>
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
                        disabled={requestingJoin}
                        activeOpacity={0.85}
                      >
                        {requestingJoin
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={styles.joinBtnText}>Request Again</Text>}
                      </TouchableOpacity>
                    </View>
                  ) : managingViaSchool ? (
                    <View style={styles.memberStatusRow}>
                      <MaterialCommunityIcons name="shield-account-outline" size={16} color="#7c3aed" />
                      <Text style={[styles.memberStatusText, { color: '#7c3aed' }]}>Managing via school role</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.joinBtn} onPress={handleJoinRequest} disabled={requestingJoin} activeOpacity={0.85}>
                      {requestingJoin
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.joinBtnText}>Request to Join</Text>}
                    </TouchableOpacity>
                  )}
                </View>

                {/* ── Club management rows ── */}
                {(canViewMembers && canViewInvoices) && (
                  <TouchableOpacity style={styles.membershipActionRow} onPress={openDashboard} activeOpacity={0.7}>
                    <View style={[styles.membershipActionIcon, { backgroundColor: '#e0f2fe' }]}>
                      <MaterialCommunityIcons name="view-dashboard-outline" size={18} color="#0284c7" />
                    </View>
                    <Text style={styles.membershipActionText}>Club Dashboard</Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
                {canViewMembers && (
                  <>
                    <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                      <Text style={styles.sectionTitle}>Club Management</Text>
                    </View>
                    {isClubAdmin && (
                      <TouchableOpacity style={styles.membershipActionRow} onPress={openPendingRequests} activeOpacity={0.7}>
                        <View style={[styles.membershipActionIcon, { backgroundColor: '#fef3c7' }]}>
                          <MaterialCommunityIcons name="account-clock-outline" size={18} color="#d97706" />
                        </View>
                        <Text style={styles.membershipActionText}>Review Pending Requests</Text>
                        <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.membershipActionRow} onPress={openMembers} activeOpacity={0.7}>
                      <View style={[styles.membershipActionIcon, { backgroundColor: '#dcfce7' }]}>
                        <MaterialCommunityIcons name="account-multiple-check-outline" size={18} color="#16a34a" />
                      </View>
                      <Text style={styles.membershipActionText}>View Club Members</Text>
                      <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
                    </TouchableOpacity>
                  </>
                )}
                {canViewInvoices && (
                  <TouchableOpacity style={styles.membershipActionRow} onPress={() => setInvoicesModalVisible(true)} activeOpacity={0.7}>
                    <View style={[styles.membershipActionIcon, { backgroundColor: '#ede9fe' }]}>
                      <MaterialCommunityIcons name="receipt-text-outline" size={18} color="#4f46e5" />
                    </View>
                    <Text style={styles.membershipActionText}>Invoices</Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
                {canViewInventory && (
                  <TouchableOpacity style={styles.membershipActionRow} onPress={() => setInventoryModalVisible(true)} activeOpacity={0.7}>
                    <View style={[styles.membershipActionIcon, { backgroundColor: '#fce7f3' }]}>
                      <MaterialCommunityIcons name="package-variant-closed" size={18} color="#db2777" />
                    </View>
                    <Text style={styles.membershipActionText}>Inventory</Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        )}

        {invoicesModalVisible && (
          <InvoicesModal
            clubId={clubId}
            schoolTier={club?.schoolTier}
            currentUser={currentUser}
            canCreate={canCreateInvoice}
            canApprove={canApproveInvoice}
            onClose={() => setInvoicesModalVisible(false)}
          />
        )}

        {inventoryModalVisible && (
          <InventoryModal
            clubId={clubId}
            currentUser={currentUser}
            canCheckout={canCheckoutInventory}
            canManage={canManageInventory}
            onClose={() => setInventoryModalVisible(false)}
          />
        )}

        {/* ── EDIT ── */}
        {view === 'edit' && (
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setError(''); setView('detail'); }}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Club</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Club Name *</Text>
            <TextInput style={styles.input} placeholder="e.g. Chess Club" placeholderTextColor="#9ca3af" value={editName} onChangeText={setEditName} autoFocus />
            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput style={[styles.input, styles.inputMulti]} placeholder="Brief description…" placeholderTextColor="#9ca3af" value={editDesc} onChangeText={setEditDesc} multiline numberOfLines={3} />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSaveEdit} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── PENDING REQUESTS ── */}
        {view === 'pending-requests' && (
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setView('detail')}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Pending Requests</Text>
              <TouchableOpacity onPress={onClose} accessibilityLabel="Close add club form" testID="close-add-club-form"><MaterialCommunityIcons name="close" size={22} color="#6b7280" /></TouchableOpacity>
            </View>
            {loadingPending ? (
              <View style={styles.center}><ActivityIndicator size="small" color="#4f46e5" /></View>
            ) : pendingRequests.length === 0 ? (
              <View style={styles.center}>
                <MaterialCommunityIcons name="account-clock-outline" size={40} color="#d1d5db" />
                <Text style={[styles.emptyText, { marginTop: 8 }]}>No pending requests.</Text>
              </View>
            ) : (
              <FlatList
                data={pendingRequests} keyExtractor={(r) => String(r.userId)}
                renderItem={({ item }) => (
                  <View style={styles.pendingRow}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{item.userFirstName[0]}{item.userLastName[0]}</Text></View>
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

        {/* ── MEMBERS ── */}
        {view === 'members' && (
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setView('detail')}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Club Members</Text>
              <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close" size={22} color="#6b7280" /></TouchableOpacity>
            </View>
            {members.length > 0 && (
              <TextInput
                style={[styles.input, { marginBottom: 8 }]}
                placeholder="Search by name…"
                placeholderTextColor="#9ca3af"
                value={memberSearch}
                onChangeText={setMemberSearch}
              />
            )}
            {loadingMembers ? (
              <View style={styles.center}><ActivityIndicator size="small" color="#4f46e5" /></View>
            ) : members.length === 0 ? (
              <View style={styles.center}>
                <MaterialCommunityIcons name="account-multiple-outline" size={40} color="#d1d5db" />
                <Text style={[styles.emptyText, { marginTop: 8 }]}>No members yet.</Text>
              </View>
            ) : (
              <FlatList
                data={fuzzyFilter(members, memberSearch, (m) => [`${m.userFirstName} ${m.userLastName}`, m.userEmail])}
                keyExtractor={(m) => String(m.userId)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <View style={styles.pendingRow}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{item.userFirstName[0]}{item.userLastName[0]}</Text></View>
                    <View style={[styles.userRowBody, { flex: 1 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.userRowName}>{item.userFirstName} {item.userLastName}</Text>
                        {item.role === 'ADMIN' && (
                          <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>Admin</Text></View>
                        )}
                      </View>
                      <Text style={styles.userRowEmail}>{item.userEmail}</Text>
                    </View>
                    {isClubAdmin && item.userId !== currentUser?.id && (
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRevoke(item)} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="account-remove-outline" size={18} color="#dc2626" />
                      </TouchableOpacity>
                    )}
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

        {/* ── DASHBOARD ── */}
        {view === 'dashboard' && (
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setView('detail')}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Club Dashboard</Text>
              <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close" size={22} color="#6b7280" /></TouchableOpacity>
            </View>
            {loadingDashboard ? (
              <View style={styles.center}><ActivityIndicator size="small" color="#4f46e5" /></View>
            ) : (
              <FlatList
                data={dashboardMembers}
                keyExtractor={(m) => String(m.userId)}
                ListHeaderComponent={
                  <>
                    {!!dashboardError && <Text style={[styles.errorText, { marginBottom: 8 }]}>{dashboardError}</Text>}
                    <View style={styles.statsGrid}>
                      <View style={styles.statCard}>
                        <MaterialCommunityIcons name="account-multiple-outline" size={20} color="#4f46e5" />
                        <Text style={styles.statValue}>{dashboardMembers.length}</Text>
                        <Text style={styles.statLabel}>Members</Text>
                      </View>
                      <View style={styles.statCard}>
                        <MaterialCommunityIcons name="receipt-text-outline" size={20} color="#4f46e5" />
                        <Text style={styles.statValue}>{dashboardInvoices.length}</Text>
                        <Text style={styles.statLabel}>Invoices</Text>
                      </View>
                      <View style={styles.statCard}>
                        <MaterialCommunityIcons name="cash-check" size={20} color="#16a34a" />
                        <Text style={[styles.statValue, { color: '#16a34a' }]}>{money(dashboardTotalPaid)}</Text>
                        <Text style={styles.statLabel}>Paid</Text>
                      </View>
                      <View style={styles.statCard}>
                        <MaterialCommunityIcons name="cash-clock" size={20} color="#d97706" />
                        <Text style={[styles.statValue, { color: '#d97706' }]}>{money(dashboardOutstanding)}</Text>
                        <Text style={styles.statLabel}>Outstanding</Text>
                      </View>
                    </View>
                    <View style={styles.statusBreakdownRow}>
                      {INVOICE_STATUS_ORDER.map((s) => (
                        <View key={s} style={[styles.statusChip, { backgroundColor: INVOICE_STATUS_STYLES[s].bg }]}>
                          <Text style={[styles.statusChipText, { color: INVOICE_STATUS_STYLES[s].fg }]}>
                            {INVOICE_STATUS_STYLES[s].label}: {dashboardStatusCounts[s] ?? 0}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 6 }]}>
                      Members ({dashboardMembers.length})
                    </Text>
                  </>
                }
                renderItem={({ item }) => (
                  <View style={styles.pendingRow}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{item.userFirstName[0]}{item.userLastName[0]}</Text></View>
                    <View style={[styles.userRowBody, { flex: 1 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.userRowName}>{item.userFirstName} {item.userLastName}</Text>
                        {item.role === 'ADMIN' && (
                          <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>Admin</Text></View>
                        )}
                      </View>
                      <Text style={styles.userRowEmail}>{item.userEmail}</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={[styles.center, { marginTop: 16 }]}>
                    <Text style={styles.emptyText}>No members yet.</Text>
                  </View>
                }
              />
            )}
          </View>
        )}

        {/* ── PICK ADMIN ── */}
        {view === 'pick-admin' && (
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setView('detail')}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Club Admin</Text>
              <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close" size={22} color="#6b7280" /></TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { marginBottom: 8 }]}
              placeholder="Search members…"
              placeholderTextColor="#9ca3af"
              value={adminSearch}
              onChangeText={setAdminSearch}
              autoFocus
            />
            {loadingAdminPick ? (
              <View style={styles.center}><ActivityIndicator size="small" color="#4f46e5" /></View>
            ) : (
              <FlatList
                data={adminCandidates.filter((m) => {
                  const currentAdminIds = new Set((club?.admins ?? []).map((a) => a.userId));
                  if (currentAdminIds.has(m.userId)) return false;
                  const q = adminSearch.toLowerCase();
                  return m.userFirstName.toLowerCase().includes(q) || m.userLastName.toLowerCase().includes(q) || m.userEmail.toLowerCase().includes(q);
                })}
                keyExtractor={(m) => String(m.userId)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userRow}
                    onPress={() => handleAddAdmin(item)}
                    disabled={addingAdmin}
                    activeOpacity={0.7}
                  >
                    <View style={styles.avatar}><Text style={styles.avatarText}>{item.userFirstName[0]}{item.userLastName[0]}</Text></View>
                    <View style={styles.userRowBody}>
                      <Text style={styles.userRowName}>{item.userFirstName} {item.userLastName}</Text>
                      <Text style={styles.userRowEmail}>{item.userEmail}</Text>
                    </View>
                    <MaterialCommunityIcons name="account-plus-outline" size={20} color="#4f46e5" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={[styles.center, { marginTop: 16 }]}>
                    <Text style={styles.emptyText}>No eligible members found.</Text>
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

/* ─── Add Club Modal ─────────────────────────────────────────────── */
function AddClubModal({ visible, schoolId, onClose, onCreated }) {
  const [step, setStep]                     = useState('form');
  const [name, setName]                     = useState('');
  const [description, setDescription]       = useState('');
  const [selectedAdmin, setSelectedAdmin]   = useState(null);
  const [members, setMembers]               = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState('');
  const [memberSearch, setMemberSearch]     = useState('');

  useEffect(() => {
    if (!visible) return;
    setLoadingMembers(true);
    schoolsAPI.getMembers(schoolId)
      .then(setMembers)
      .catch(() => setError('Could not load school members.'))
      .finally(() => setLoadingMembers(false));
  }, [visible, schoolId]);

  const filteredMembers = members.filter((m) => {
    const q = memberSearch.toLowerCase();
    return m.userFirstName.toLowerCase().includes(q) || m.userLastName.toLowerCase().includes(q) || m.userEmail.toLowerCase().includes(q);
  });

  const handleCreate = async () => {
    if (!name.trim()) { setError('Club name is required.'); return; }
    if (!selectedAdmin) { setError('Please select a first club admin.'); return; }
    setSaving(true); setError('');
    try {
      const club = await clubsAPI.createClub(schoolId, {
        name: name.trim(),
        description: description.trim() || null,
        firstAdminUserId: selectedAdmin.userId,
      });
      onCreated(club);
    } catch (e) { setError(getFriendlyErrorMessage(e, 'Failed to create club.')); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        {step === 'form' ? (
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Club</Text>
              <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close" size={22} color="#6b7280" /></TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Club Name *</Text>
            <TextInput style={styles.input} placeholder="e.g. Chess Club" placeholderTextColor="#9ca3af" value={name} onChangeText={setName} autoFocus />
            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput style={[styles.input, styles.inputMulti]} placeholder="Brief description…" placeholderTextColor="#9ca3af" value={description} onChangeText={setDescription} multiline numberOfLines={3} />

            <Text style={styles.fieldLabel}>First Club Admin *</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, selectedAdmin && styles.pickerBtnSelected]}
              onPress={() => { setMemberSearch(''); setStep('pick-admin'); }}
              activeOpacity={0.8}
            >
              {selectedAdmin ? (
                <View style={styles.pickerBtnInner}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{selectedAdmin.userFirstName[0]}{selectedAdmin.userLastName[0]}</Text>
                  </View>
                  <View>
                    <Text style={styles.pickerBtnName}>{selectedAdmin.userFirstName} {selectedAdmin.userLastName}</Text>
                    <Text style={styles.pickerBtnEmail}>{selectedAdmin.userEmail}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.pickerBtnInner}>
                  <MaterialCommunityIcons name="account-plus-outline" size={20} color="#6b7280" />
                  <Text style={styles.pickerBtnPlaceholder}>Select a school member…</Text>
                </View>
              )}
              <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
            </TouchableOpacity>

            {!!error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleCreate} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Create Club</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          /* pick-admin step */
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setStep('form')}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Pick Club Admin</Text>
              <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close" size={22} color="#6b7280" /></TouchableOpacity>
            </View>
            <TextInput style={[styles.input, { marginBottom: 8 }]} placeholder="Search by name or email…" placeholderTextColor="#9ca3af" value={memberSearch} onChangeText={setMemberSearch} autoFocus />
            {loadingMembers ? (
              <View style={styles.center}><ActivityIndicator size="small" color="#4f46e5" /></View>
            ) : (
              <FlatList
                data={filteredMembers} keyExtractor={(m) => String(m.userId)} keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.userRow, selectedAdmin?.userId === item.userId && styles.userRowSelected]}
                    onPress={() => { setSelectedAdmin(item); setStep('form'); }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.avatar}><Text style={styles.avatarText}>{item.userFirstName[0]}{item.userLastName[0]}</Text></View>
                    <View style={styles.userRowBody}>
                      <Text style={styles.userRowName}>{item.userFirstName} {item.userLastName}</Text>
                      <Text style={styles.userRowEmail}>{item.userEmail}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={[styles.emptyText, { textAlign: 'center', marginTop: 16 }]}>No members found.</Text>}
              />
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f3f4f6' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  pageTitle:  { fontSize: 22, fontWeight: '700', color: '#111827' },
  addBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#4f46e5', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  sectionLabel:      { fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 },
  schoolChip:        { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' },
  schoolChipActive:  { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  schoolChipText:    { fontSize: 13, fontWeight: '500', color: '#374151' },
  schoolChipTextActive: { color: '#fff' },

  emptyCard:  { backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center', gap: 8, marginTop: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyText:  { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 19 },

  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardIconWrap:{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardBody:    { flex: 1, minWidth: 0 },
  clubName:    { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  clubDescription: { fontSize: 12, color: '#6b7280', lineHeight: 17 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  deleteIconBtn: { padding: 6 },
  viewBtn:     { backgroundColor: '#ede9fe', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  viewBtnText: { color: '#4f46e5', fontSize: 13, fontWeight: '600' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
  sheetHandle:  { alignSelf: 'center', width: 36, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, marginBottom: 16 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle:   { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1, marginHorizontal: 8 },

  detailTopRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  schoolBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ede9fe', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, flex: 1 },
  schoolBadgeText: { fontSize: 12, color: '#4f46e5', fontWeight: '500', flexShrink: 1 },
  adminActionBtns: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  editBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#4f46e5', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  editBtnText:     { fontSize: 12, color: '#4f46e5', fontWeight: '600' },
  deleteBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#dc2626', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  deleteBtnText:   { fontSize: 12, color: '#dc2626', fontWeight: '600' },

  descBox:    { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginBottom: 12 },
  descText:   { fontSize: 14, color: '#374151', lineHeight: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4, marginTop: 12 },

  myMembershipCard:  { backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  myMembershipTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  memberStatusRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberStatusText:  { fontSize: 13, fontWeight: '500' },
  joinBtn:           { backgroundColor: '#4f46e5', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center', marginTop: 4 },
  joinBtnText:       { color: '#fff', fontSize: 14, fontWeight: '600' },

  sectionHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sectionTitle:         { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase' },
  membershipActionRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  membershipActionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  membershipActionText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#111827' },

  statsGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statCard:           { flexBasis: '47%', flexGrow: 1, backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', gap: 4 },
  statValue:          { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel:          { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  statusBreakdownRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  statusChip:         { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  statusChipText:     { fontSize: 11, fontWeight: '700' },

  input:           { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 2 },
  inputMulti:      { height: 80, textAlignVertical: 'top' },
  errorText:       { fontSize: 13, color: '#dc2626', marginTop: 4 },
  saveBtn:         { backgroundColor: '#4f46e5', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },

  pickerBtn:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 12, backgroundColor: '#f9fafb', marginBottom: 2 },
  pickerBtnSelected:    { borderColor: '#4f46e5', backgroundColor: '#ede9fe' },
  pickerBtnInner:       { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  pickerBtnName:        { fontSize: 14, fontWeight: '600', color: '#111827' },
  pickerBtnEmail:       { fontSize: 12, color: '#6b7280' },
  pickerBtnPlaceholder: { fontSize: 14, color: '#9ca3af' },

  avatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: '#c7d2fe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#3730a3' },

  userRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, marginBottom: 4 },
  userRowSelected: { backgroundColor: '#ede9fe' },
  userRowBody:     { flex: 1, minWidth: 0 },
  userRowName:     { fontSize: 14, fontWeight: '600', color: '#111827' },
  userRowEmail:    { fontSize: 12, color: '#6b7280' },

  pendingRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  approveBtn:  { width: 32, height: 32, borderRadius: 16, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  rejectBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },

  roleBadge:     { backgroundColor: '#ede9fe', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
  roleBadgeText: { fontSize: 10, fontWeight: '700', color: '#4f46e5' },

  adminRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', marginBottom: 2 },
  adminAvatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#c7d2fe', alignItems: 'center', justifyContent: 'center' },
  adminAvatarText: { fontSize: 13, fontWeight: '700', color: '#3730a3' },
  adminRowBody:    { flex: 1, minWidth: 0 },
  adminRowName:    { fontSize: 14, fontWeight: '600', color: '#111827' },
  adminRowEmail:   { fontSize: 12, color: '#6b7280' },
  addAdminBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#4f46e5', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  addAdminBtnText: { fontSize: 12, color: '#4f46e5', fontWeight: '600' },
  removeAdminBtn:  { padding: 4 },
});
