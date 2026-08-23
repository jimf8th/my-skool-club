import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, Alert,
  RefreshControl, Modal,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { schoolsAPI, eventsAPI } from '../../services/api';
import EventsModal from '../../components/EventsModal';
import ReportContentModal from '../../components/ReportContentModal';
import { getFriendlyErrorMessage } from '../../utils/errors';

const RSVP_STYLES = {
  YES:   { bg: '#dcfce7', fg: '#16a34a', label: 'Going' },
  NO:    { bg: '#fee2e2', fg: '#dc2626', label: 'Not Going' },
  MAYBE: { bg: '#fef3c7', fg: '#d97706', label: 'Maybe' },
};

function formatEventTime(iso) {
  const d = new Date(iso);
  const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const now = new Date();
  const diffDays = Math.ceil((d - now) / 86400000);
  if (diffDays === 0) return `Today at ${timeStr}`;
  if (diffDays === 1) return `Tomorrow at ${timeStr}`;
  return `${dateStr} at ${timeStr}`;
}

export default function EventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [mySchools, setMySchools] = useState([]);   // [{id, name, isAdmin, canCreate}]
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rsvpBusy, setRsvpBusy] = useState(null);
  const [eventsModalSchool, setEventsModalSchool] = useState(null);
  const [modalInitialView, setModalInitialView] = useState('list');
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const allSchools = await schoolsAPI.getAll();
      const isAppAdmin = user?.appRole === 'APP_ADMIN';

      const results = await Promise.allSettled(
        allSchools.map(async (school) => {
          // APP_ADMIN can see all schools; regular users need approved membership
          if (!isAppAdmin) {
            const membership = await schoolsAPI.getMyMembership(school.id).catch(() => null);
            if (!membership || membership.status !== 'APPROVED') return null;
          }

          // Fetch privileges and events in parallel
          const [privs, schoolEvents] = await Promise.all([
            schoolsAPI.getMyPrivileges(school.id).catch(() => []),
            eventsAPI.list(school.id).catch(() => []),
          ]);

          return {
            school: {
              id: school.id,
              name: school.name,
              isAdmin: isAppAdmin || privs.includes('MANAGE_SCHOOL_MEMBERS'),
              canCreate: isAppAdmin || privs.includes('CREATE_EVENT'),
            },
            events: schoolEvents.map((ev) => ({ ...ev, schoolName: school.name })),
          };
        })
      );

      const schoolList = [];
      const allEvents = [];
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          schoolList.push(r.value.school);
          allEvents.push(...r.value.events);
        }
      }

      // Sort: upcoming first, then past
      allEvents.sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime));

      setMySchools(schoolList);
      setEvents(allEvents);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadEvents();
    }, [loadEvents])
  );

  const onRefresh = () => { setRefreshing(true); loadEvents(); };

  const handleRsvp = async (event, response) => {
    setRsvpBusy(event.id);
    try {
      const updated = await eventsAPI.rsvp(event.schoolId, event.id, response);
      setEvents((prev) => prev.map((e) =>
        e.id === event.id
          ? { ...e, myResponse: updated.myResponse, yesCount: updated.yesCount, noCount: updated.noCount, maybeCount: updated.maybeCount }
          : e
      ));
    } catch (e) {
      Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to save your RSVP.'));
    } finally {
      setRsvpBusy(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  // Separate upcoming vs past
  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.eventTime) >= now);
  const past     = events.filter((e) => new Date(e.eventTime) < now);
  const creatableSchools = mySchools.filter((s) => s.canCreate);

  const openCreateFlow = (school) => {
    setEventsModalSchool(school);
    setModalInitialView('form');
  };

  const handleFabPress = () => {
    if (creatableSchools.length === 0) {
      Alert.alert(
        'Cannot Create Events',
        'You need to be an approved member with event-creation permission in a school to create events.'
      );
      return;
    }
    if (creatableSchools.length === 1) {
      openCreateFlow(creatableSchools[0]);
      return;
    }
    setShowSchoolPicker(true);
  };

  const chooseSchoolForCreate = (school) => {
    setShowSchoolPicker(false);
    openCreateFlow(school);
  };

  const closeEventsModal = () => {
    setEventsModalSchool(null);
    setModalInitialView('list');
    loadEvents();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <FlatList
        data={upcoming}
        keyExtractor={(ev) => `${ev.schoolId}-${ev.id}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Empty states */}
            {mySchools.length === 0 && (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="school-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No school memberships yet</Text>
                <Text style={styles.emptySub}>Join a school and get approved to see and create events.</Text>
              </View>
            )}

            {mySchools.length > 0 && events.length === 0 && (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No upcoming events</Text>
                <Text style={styles.emptySub}>
                  {creatableSchools.length > 0
                    ? 'Tap the + button below to schedule the first event for your school.'
                    : 'Check back later for upcoming events from your school.'}
                </Text>
              </View>
            )}

            {upcoming.length > 0 && <Text style={styles.sectionHeader}>Upcoming</Text>}
          </>
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            busy={rsvpBusy === item.id}
            onRsvp={(r) => handleRsvp(item, r)}
            currentUser={user}
          />
        )}
        ListFooterComponent={
          past.length > 0 ? (
            <>
              <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Past</Text>
              {past.map((item) => (
                <EventCard
                  key={`${item.schoolId}-${item.id}`}
                  event={item}
                  busy={rsvpBusy === item.id}
                  onRsvp={(r) => handleRsvp(item, r)}
                  isPast
                  currentUser={user}
                />
              ))}
            </>
          ) : null
        }
      />

      {/* Floating action button — create a new event */}
      <TouchableOpacity style={styles.fab} onPress={handleFabPress} activeOpacity={0.85}>
        <MaterialCommunityIcons name="plus" size={26} color="#fff" />
      </TouchableOpacity>

      {/* School picker sheet — shown when the user can create events in more than one school */}
      <Modal visible={showSchoolPicker} animationType="slide" transparent onRequestClose={() => setShowSchoolPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheetCard}>
            <View style={styles.pickerSheetHandle} />
            <Text style={styles.pickerSheetTitle}>Create Event For…</Text>
            {creatableSchools.map((s) => (
              <TouchableOpacity key={s.id} style={styles.pickerSheetRow} onPress={() => chooseSchoolForCreate(s)} activeOpacity={0.7}>
                <MaterialCommunityIcons name="school" size={18} color="#4f46e5" />
                <Text style={styles.pickerSheetRowText}>{s.name}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#d1d5db" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.pickerSheetCancel} onPress={() => setShowSchoolPicker(false)} activeOpacity={0.7}>
              <Text style={styles.pickerSheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {eventsModalSchool && (
        <EventsModal
          schoolId={eventsModalSchool.id}
          currentUser={user}
          canCreate={eventsModalSchool.canCreate}
          isSchoolAdmin={eventsModalSchool.isAdmin}
          initialView={modalInitialView}
          onClose={closeEventsModal}
        />
      )}
    </View>
  );
}

/* ─── Single event card with inline RSVP ──────────────────────────── */
function EventCard({ event, busy, onRsvp, isPast, currentUser }) {
  const [reportVisible, setReportVisible] = useState(false);
  return (
    <>
    <View style={[styles.card, isPast && styles.cardPast]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
          <View style={styles.cardMeta}>
            <MaterialCommunityIcons name="clock-outline" size={13} color="#6b7280" />
            <Text style={styles.cardMetaText}>{formatEventTime(event.eventTime)}</Text>
          </View>
          <View style={styles.cardMeta}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color="#6b7280" />
            <Text style={styles.cardMetaText} numberOfLines={1}>{event.location}</Text>
          </View>
          <Text style={styles.cardSchool}>{event.schoolName}</Text>
        </View>
      </View>

      <View style={styles.cardCounts}>
        <Text style={styles.cardCountText}>{event.yesCount} going</Text>
        <Text style={styles.cardCountDot}>·</Text>
        <Text style={styles.cardCountText}>{event.maybeCount} maybe</Text>
        <Text style={styles.cardCountDot}>·</Text>
        <Text style={styles.cardCountText}>{event.noCount} not going</Text>
      </View>

      {!isPast && (
        busy ? (
          <ActivityIndicator size="small" color="#4f46e5" style={{ marginTop: 10 }} />
        ) : (
          <View style={styles.rsvpRow}>
            {['YES', 'MAYBE', 'NO'].map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.rsvpBtn,
                  event.myResponse === r && { backgroundColor: RSVP_STYLES[r].bg, borderColor: RSVP_STYLES[r].fg },
                ]}
                onPress={() => onRsvp(r)}
                activeOpacity={0.75}
              >
                <Text style={[styles.rsvpBtnText, event.myResponse === r && { color: RSVP_STYLES[r].fg }]}>
                  {RSVP_STYLES[r].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )
      )}
      {event.createdByUserId !== currentUser?.id && (
        <TouchableOpacity style={styles.reportBtn} onPress={() => setReportVisible(true)} accessibilityLabel={`Report ${event.title}`}>
          <MaterialCommunityIcons name="flag-outline" size={14} color="#6b7280" />
          <Text style={styles.reportBtnText}>Report</Text>
        </TouchableOpacity>
      )}
    </View>
    <ReportContentModal visible={reportVisible} contentType="EVENT" contentId={event.id} onClose={() => setReportVisible(false)} onSubmitted={() => Alert.alert('Report submitted', 'An app administrator will review it.')} />
    </>
  );
}

const styles = StyleSheet.create({
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 96 },

  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  pickerOverlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  pickerSheetCard:  { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  pickerSheetHandle:{ alignSelf: 'center', width: 36, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, marginBottom: 16 },
  pickerSheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  pickerSheetRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerSheetRowText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  pickerSheetCancel: { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
  pickerSheetCancelText: { fontSize: 14, fontWeight: '700', color: '#6b7280' },

  emptyBox:  { alignItems: 'center', paddingTop: 60, paddingBottom: 20, gap: 8 },
  emptyTitle:{ fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub:  { fontSize: 13, color: '#6b7280', textAlign: 'center', maxWidth: 280, lineHeight: 20 },

  sectionHeader: {
    fontSize: 12, fontWeight: '700', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardPast:     { opacity: 0.6 },
  cardHeader:   { flexDirection: 'row', marginBottom: 8 },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 5 },
  cardMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  cardMetaText: { fontSize: 13, color: '#6b7280' },
  cardSchool:   { fontSize: 11, fontWeight: '600', color: '#4f46e5', marginTop: 4 },

  cardCounts:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  cardCountText:{ fontSize: 12, color: '#9ca3af' },
  cardCountDot: { fontSize: 12, color: '#d1d5db' },

  rsvpRow: { flexDirection: 'row', gap: 8 },
  rsvpBtn: {
    flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingVertical: 8, alignItems: 'center',
  },
  rsvpBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  reportBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 5, marginTop: 12, paddingVertical: 4, paddingHorizontal: 2 },
  reportBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
});
