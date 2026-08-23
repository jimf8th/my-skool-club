import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Modal, RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { schoolRequestsAPI } from '../../services/api';
import { getFriendlyErrorMessage } from '../../utils/errors';

const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'];

export default function SchoolRequestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState('PENDING');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try { setRequests(await schoolRequestsAPI.list(status === 'ALL' ? undefined : status)); }
    catch (error) { Alert.alert('Error', getFriendlyErrorMessage(error, 'Could not load school requests.')); }
    finally { setLoading(false); setRefreshing(false); }
  }, [status]);

  useEffect(() => {
    if (user?.appRole !== 'APP_ADMIN') { router.replace('/'); return; }
    load();
  }, [load, router, user?.appRole]);

  const approve = (request) => Alert.alert(
    'Approve school request',
    `Create ${request.schoolName} and assign or invite ${request.adminEmail} as its administrator?`,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Approve', onPress: async () => {
      setActing(true);
      try { await schoolRequestsAPI.approve(request.id); await load(); }
      catch (error) { Alert.alert('Approval failed', getFriendlyErrorMessage(error, 'Could not approve the school request.')); }
      finally { setActing(false); }
    }}]
  );

  const reject = async () => {
    if (!reason.trim()) return Alert.alert('Reason required', 'Enter a reason that can be emailed to the requester.');
    setActing(true);
    try { await schoolRequestsAPI.reject(rejecting.id, reason.trim()); setRejecting(null); setReason(''); await load(); }
    catch (error) { Alert.alert('Rejection failed', getFriendlyErrorMessage(error, 'Could not reject the school request.')); }
    finally { setActing(false); }
  };

  if (user?.appRole !== 'APP_ADMIN') return null;
  return <View style={styles.screen}>
    <View style={styles.header}><Text style={styles.title}>School Requests</Text><Text style={styles.subtitle}>Approve a request before its school is created and activated.</Text></View>
    <View style={styles.filters}>{statuses.map((value) => <TouchableOpacity key={value} style={[styles.filter, status === value && styles.filterActive]} onPress={() => setStatus(value)}><Text style={[styles.filterText, status === value && styles.filterTextActive]}>{value}</Text></TouchableOpacity>)}</View>
    {loading ? <ActivityIndicator style={styles.loader} /> : <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={styles.list}>
      {requests.length === 0 ? <View style={styles.empty}><MaterialCommunityIcons name="inbox-outline" size={38} color="#9ca3af" /><Text style={styles.emptyText}>No school requests in this view.</Text></View> : requests.map((request) => <RequestCard key={request.id} request={request} acting={acting} onApprove={() => approve(request)} onReject={() => { setRejecting(request); setReason(''); }} />)}
    </ScrollView>}
    <Modal visible={!!rejecting} transparent animationType="fade" onRequestClose={() => setRejecting(null)}>
      <View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>Reject {rejecting?.schoolName}</Text><Text style={styles.modalText}>This reason will be emailed to {rejecting?.adminEmail}.</Text><TextInput style={styles.reasonInput} multiline value={reason} onChangeText={setReason} placeholder="Reason for rejection" placeholderTextColor="#9ca3af" /><View style={styles.modalActions}><TouchableOpacity onPress={() => setRejecting(null)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={acting} onPress={reject} style={styles.rejectButton}><Text style={styles.rejectText}>{acting ? 'Rejecting…' : 'Reject request'}</Text></TouchableOpacity></View></View></View>
    </Modal>
  </View>;
}

function RequestCard({ request, acting, onApprove, onReject }) {
  return <View style={styles.card}>
    <View style={styles.cardTop}><View style={{ flex: 1 }}><Text style={styles.schoolName}>{request.schoolName}</Text><Text style={styles.date}>Submitted {new Date(request.createdAt).toLocaleString()}</Text></View><Status value={request.status} /></View>
    <Text style={styles.sectionLabel}>PROPOSED ADMINISTRATOR</Text><Text style={styles.strong}>{request.firstName} {request.lastName}</Text><TouchableOpacity onPress={() => Linking.openURL(`mailto:${request.adminEmail}`)}><Text style={styles.link}>{request.adminEmail}</Text></TouchableOpacity><TouchableOpacity onPress={() => Linking.openURL(`tel:${request.contactPhone}`)}><Text style={styles.link}>{request.contactPhone}</Text></TouchableOpacity>
    <Text style={styles.sectionLabel}>SCHOOL DETAILS</Text><Text style={styles.body}>{request.description}</Text><Text style={styles.body}>{request.address}{'\n'}{request.city}, {request.state} {request.postalCode}</Text><TouchableOpacity onPress={() => Linking.openURL(`tel:${request.schoolPhone}`)}><Text style={styles.link}>{request.schoolPhone}</Text></TouchableOpacity><TouchableOpacity onPress={() => Linking.openURL(request.website)}><Text style={styles.link}>{request.website}</Text></TouchableOpacity>
    {!!request.rejectionReason && <Text style={styles.rejectionReason}>Rejection reason: {request.rejectionReason}</Text>}
    {!!request.createdSchoolId && <Text style={styles.created}>Created school #{request.createdSchoolId}</Text>}
    {request.status === 'PENDING' && <View style={styles.actions}><TouchableOpacity disabled={acting} onPress={onReject} style={styles.outlineReject}><Text style={styles.outlineRejectText}>Reject</Text></TouchableOpacity><TouchableOpacity disabled={acting} onPress={onApprove} style={styles.approve}><Text style={styles.approveText}>Approve</Text></TouchableOpacity></View>}
  </View>;
}

function Status({ value }) {
  const color = value === 'APPROVED' ? '#166534' : value === 'REJECTED' ? '#991b1b' : '#92400e';
  const backgroundColor = value === 'APPROVED' ? '#dcfce7' : value === 'REJECTED' ? '#fee2e2' : '#fef3c7';
  return <Text style={[styles.status, { color, backgroundColor }]}>{value}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f4f6' }, header: { padding: 18, paddingBottom: 10 },
  title: { fontSize: 26, fontWeight: '900', color: '#111827' }, subtitle: { color: '#6b7280', marginTop: 4, lineHeight: 19 },
  filters: { flexDirection: 'row', gap: 7, paddingHorizontal: 16, paddingBottom: 10 }, filter: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#e5e7eb' }, filterActive: { backgroundColor: '#4f46e5' }, filterText: { fontSize: 10, fontWeight: '800', color: '#4b5563' }, filterTextActive: { color: '#fff' },
  loader: { marginTop: 50 }, list: { padding: 16, paddingBottom: 36, gap: 13 }, empty: { backgroundColor: '#fff', borderRadius: 18, padding: 32, alignItems: 'center' }, emptyText: { color: '#6b7280', marginTop: 10 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 17 }, cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, schoolName: { fontSize: 18, fontWeight: '800', color: '#111827' }, date: { color: '#9ca3af', fontSize: 11, marginTop: 3 }, status: { fontSize: 9, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  sectionLabel: { color: '#6b7280', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 18, marginBottom: 5 }, strong: { color: '#111827', fontWeight: '700' }, body: { color: '#374151', lineHeight: 20, marginTop: 5 }, link: { color: '#4338ca', textDecorationLine: 'underline', marginTop: 4 }, rejectionReason: { color: '#991b1b', backgroundColor: '#fef2f2', padding: 10, borderRadius: 10, marginTop: 14 }, created: { color: '#166534', fontWeight: '700', marginTop: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 18 }, outlineReject: { borderWidth: 1, borderColor: '#fca5a5', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }, outlineRejectText: { color: '#b91c1c', fontWeight: '800' }, approve: { backgroundColor: '#15803d', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 }, approveText: { color: '#fff', fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 20 }, modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20 }, modalTitle: { fontSize: 20, fontWeight: '900', color: '#111827' }, modalText: { color: '#6b7280', marginTop: 6 }, reasonInput: { minHeight: 110, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 12, textAlignVertical: 'top', marginTop: 16, color: '#111827' }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 16 }, cancelButton: { padding: 11 }, cancelText: { color: '#4b5563', fontWeight: '700' }, rejectButton: { backgroundColor: '#b91c1c', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 11 }, rejectText: { color: '#fff', fontWeight: '800' },
});
