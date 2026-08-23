import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, Modal, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, FlatList, Alert,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { eventsAPI } from '../services/api';
import { getFriendlyErrorMessage } from '../utils/errors';
import ReportContentModal from './ReportContentModal';

const RSVP_STYLES = {
  YES:   { bg: '#dcfce7', fg: '#16a34a', label: 'Yes' },
  NO:    { bg: '#fee2e2', fg: '#dc2626', label: 'No' },
  MAYBE: { bg: '#fef3c7', fg: '#d97706', label: 'Maybe' },
};

function formatEventTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function RsvpBadge({ response }) {
  if (!response) return null;
  const s = RSVP_STYLES[response];
  return (
    <View style={[styles.rsvpBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.rsvpBadgeText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

/**
 * Pure JS/RN calendar grid — no native modules, works in Expo Go.
 * Props: value (Date), onSelect(Date)
 */
function CalendarPicker({ value, onSelect }) {
  const [viewDate, setViewDate] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks = [];
  let day = 1 - firstDayOfWeek;
  while (day <= daysInMonth) {
    const week = [];
    for (let i = 0; i < 7; i++) { week.push(day >= 1 && day <= daysInMonth ? day : null); day++; }
    weeks.push(week);
  }

  const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const canGoPrev = new Date(year, month, 0) >= new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          onPress={() => canGoPrev && setViewDate(new Date(year, month - 1, 1))}
          style={styles.calendarNavBtn}
          disabled={!canGoPrev}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={canGoPrev ? '#4f46e5' : '#d1d5db'} />
        </TouchableOpacity>
        <Text style={styles.calendarMonthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => setViewDate(new Date(year, month + 1, 1))} style={styles.calendarNavBtn}>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarWeekRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={i} style={styles.calendarWeekDayLabel}>{d}</Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.calendarWeekRow}>
          {week.map((d, di) => {
            if (d == null) return <View key={di} style={styles.calendarCell} />;
            const cellDate = new Date(year, month, d);
            const past = cellDate < today;
            const selected = value.getFullYear() === year && value.getMonth() === month && value.getDate() === d;
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
            return (
              <TouchableOpacity
                key={di}
                style={[styles.calendarCell, selected && styles.calendarCellSelected]}
                disabled={past}
                onPress={() => onSelect(cellDate)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.calendarCellText,
                  past && styles.calendarCellTextDisabled,
                  selected && styles.calendarCellTextSelected,
                  isToday && !selected && styles.calendarCellTextToday,
                ]}>
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * Pure JS/RN scrollable time list (15-min increments) — no native modules.
 * Props: value (Date), onSelect(hour, minute)
 */
function TimePicker({ value, onSelect }) {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) times.push({ h, m });
  }
  const formatTime = (h, m) => {
    const period = h < 12 ? 'AM' : 'PM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  };
  const selectedIndex = Math.max(0, times.findIndex((t) => t.h === value.getHours() && t.m === value.getMinutes()));
  const scrollRef = useRef(null);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.timeList}
      nestedScrollEnabled
      onLayout={() => scrollRef.current?.scrollTo({ y: selectedIndex * 44, animated: false })}
    >
      {times.map((item) => {
        const isSel = item.h === value.getHours() && item.m === value.getMinutes();
        return (
          <TouchableOpacity
            key={`${item.h}-${item.m}`}
            style={[styles.timeRow, isSel && styles.timeRowSelected]}
            onPress={() => onSelect(item.h, item.m)}
            activeOpacity={0.7}
          >
            <Text style={[styles.timeRowText, isSel && styles.timeRowTextSelected]}>{formatTime(item.h, item.m)}</Text>
            {isSel && <MaterialCommunityIcons name="check" size={18} color="#4f46e5" />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/**
 * Self-contained events flow for a single school: list -> detail -> form.
 * Props:
 *  - schoolId, currentUser
 *  - canCreate: bool (CREATE_EVENT privilege)
 *  - isSchoolAdmin: bool (may delete any event, not just their own)
 *  - initialView: 'list' | 'form' (default 'list') — 'form' jumps straight to the create screen
 *  - onClose: () => void
 */
export default function EventsModal({ schoolId, currentUser, canCreate, isSchoolAdmin, initialView, onClose }) {
  const [view, setView] = useState(initialView === 'form' ? 'form' : 'list'); // list | detail | form
  const [events, setEvents] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeEventId, setActiveEventId] = useState(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      setEvents(await eventsAPI.list(schoolId));
    } catch (e) {
      Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to load events.'));
    } finally {
      setLoadingList(false);
    }
  }, [schoolId]);

  useEffect(() => { loadList(); }, [loadList]);

  const openDetail = (id) => { setActiveEventId(id); setView('detail'); };
  const openCreate = () => setView('form');

  const backToList = (shouldReload) => {
    setView('list');
    setActiveEventId(null);
    if (shouldReload) loadList();
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        {view === 'list' && (
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Events</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {canCreate && (
              <TouchableOpacity style={styles.newEventBtn} onPress={openCreate} activeOpacity={0.85}>
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                <Text style={styles.newEventBtnText}>New Event</Text>
              </TouchableOpacity>
            )}

            {loadingList ? (
              <View style={styles.center}><ActivityIndicator size="small" color="#4f46e5" /></View>
            ) : events.length === 0 ? (
              <View style={styles.center}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={40} color="#d1d5db" />
                <Text style={[styles.emptyText, { marginTop: 8 }]}>No events yet.</Text>
              </View>
            ) : (
              <FlatList
                data={events}
                keyExtractor={(ev) => String(ev.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.eventRow} onPress={() => openDetail(item.id)} activeOpacity={0.7}>
                    <View style={styles.eventRowBody}>
                      <Text style={styles.eventRowTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.eventRowSub} numberOfLines={1}>
                        {formatEventTime(item.eventTime)} · {item.location}
                      </Text>
                      <Text style={styles.eventRowCounts}>
                        {item.yesCount} yes · {item.noCount} no · {item.maybeCount} maybe
                      </Text>
                    </View>
                    <RsvpBadge response={item.myResponse} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}

        {view === 'detail' && activeEventId != null && (
          <EventDetail
            eventId={activeEventId}
            schoolId={schoolId}
            currentUser={currentUser}
            isSchoolAdmin={isSchoolAdmin}
            onBack={(reload) => backToList(reload)}
            onClose={onClose}
          />
        )}

        {view === 'form' && (
          <EventForm
            schoolId={schoolId}
            onSaved={() => backToList(true)}
            onCancel={() => backToList(false)}
            onClose={onClose}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Event Detail ───────────────────────────────────────────────── */
function EventDetail({ eventId, schoolId, currentUser, isSchoolAdmin, onBack, onClose }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvent(await eventsAPI.get(schoolId, eventId));
    } catch (e) {
      Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to load event.'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, eventId]);

  useEffect(() => { load(); }, [load]);

  const isOwner = event && currentUser && event.createdByUserId === currentUser.id;
  const canDelete = isOwner || isSchoolAdmin;

  const handleRsvp = async (response) => {
    setBusy(true);
    try {
      setEvent(await eventsAPI.rsvp(schoolId, eventId, response));
      setDirty(true);
    } catch (e) {
      Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to save your RSVP.'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Event', 'Delete this event? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await eventsAPI.remove(schoolId, eventId);
            onBack(true);
          } catch (e) {
            Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to delete event.'));
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.modalSheet, { maxHeight: '92%' }]}>
      <View style={styles.sheetHandle} />
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={() => onBack(dirty)}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
        </TouchableOpacity>
        <Text style={styles.modalTitle} numberOfLines={1}>{event?.title ?? 'Event'}</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {loading || !event ? (
        <View style={styles.center}><ActivityIndicator size="small" color="#4f46e5" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#6b7280" />
            <Text style={styles.detailMeta}>{formatEventTime(event.eventTime)}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={16} color="#6b7280" />
            <Text style={styles.detailMeta}>{event.location}</Text>
          </View>
          <Text style={[styles.detailMeta, { marginTop: 4 }]}>Created by {event.createdByName}</Text>

          <Text style={styles.sectionTitle}>Your RSVP</Text>
          <View style={styles.rsvpChoiceRow}>
            {['YES', 'MAYBE', 'NO'].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.rsvpChoiceBtn, event.myResponse === r && styles.rsvpChoiceBtnActive]}
                onPress={() => handleRsvp(r)}
                disabled={busy}
                activeOpacity={0.8}
              >
                <Text style={[styles.rsvpChoiceText, event.myResponse === r && styles.rsvpChoiceTextActive]}>
                  {RSVP_STYLES[r].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>
            Responses ({event.yesCount + event.noCount + event.maybeCount})
          </Text>
          {event.rsvps.length === 0 ? (
            <Text style={styles.emptyText}>No responses yet.</Text>
          ) : (
            event.rsvps.map((r) => (
              <View key={r.userId} style={styles.attendeeRow}>
                <Text style={styles.attendeeName}>{r.userFirstName} {r.userLastName}</Text>
                <RsvpBadge response={r.response} />
              </View>
            ))
          )}

          {canDelete && (
            <TouchableOpacity style={[styles.destructiveBtn, { marginTop: 16 }]} onPress={handleDelete} disabled={busy} activeOpacity={0.85}>
              <Text style={styles.destructiveBtnText}>Delete Event</Text>
            </TouchableOpacity>
          )}
          {!canDelete && (
            <TouchableOpacity style={[styles.destructiveBtn, { marginTop: 16, borderColor: '#d1d5db' }]} onPress={() => setReportVisible(true)} activeOpacity={0.85}>
              <Text style={[styles.destructiveBtnText, { color: '#4b5563' }]}>Report Event</Text>
            </TouchableOpacity>
          )}
          {busy && <ActivityIndicator size="small" color="#4f46e5" style={{ marginTop: 12 }} />}
        </ScrollView>
      )}
      <ReportContentModal visible={reportVisible} contentType="EVENT" contentId={eventId} onClose={() => setReportVisible(false)} onSubmitted={() => Alert.alert('Report submitted', 'An app administrator will review it.')} />
    </View>
  );
}

/* ─── Event Form (create) ───────────────────────────────────────── */
function EventForm({ schoolId, onSaved, onCancel, onClose }) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [eventDateTime, setEventDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onSelectDate = (selectedDate) => {
    setEventDateTime((prev) => new Date(
      selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(),
      prev.getHours(), prev.getMinutes()
    ));
    setShowDatePicker(false);
  };

  const onSelectTime = (hour, minute) => {
    setEventDateTime((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate(), hour, minute));
    setShowTimePicker(false);
  };

  const formatDateDisplay = (dt) => dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const formatTimeDisplay = (dt) => dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const handleCreate = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!location.trim()) { setError('Location is required.'); return; }
    if (eventDateTime < new Date()) { setError('Event time must be in the future.'); return; }

    const eventTime = eventDateTime.toISOString().replace('Z', '');
    setSaving(true); setError('');
    try {
      await eventsAPI.create(schoolId, { title: title.trim(), location: location.trim(), eventTime });
      onSaved();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, 'Failed to create event.'));
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
        <Text style={styles.modalTitle}>New Event</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>Title *</Text>
        <TextInput style={styles.input} placeholder="e.g. Fall Fundraiser" placeholderTextColor="#9ca3af" value={title} onChangeText={setTitle} autoFocus />

        <Text style={styles.fieldLabel}>Location *</Text>
        <TextInput style={styles.input} placeholder="e.g. School Gymnasium" placeholderTextColor="#9ca3af" value={location} onChangeText={setLocation} />

        <Text style={styles.fieldLabel}>Date & Time *</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[styles.input, styles.pickerButton]} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
            <MaterialCommunityIcons name="calendar" size={16} color="#4f46e5" />
            <Text style={styles.pickerButtonText}>{formatDateDisplay(eventDateTime)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.input, styles.pickerButton]} onPress={() => setShowTimePicker(true)} activeOpacity={0.7}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#4f46e5" />
            <Text style={styles.pickerButtonText}>{formatTimeDisplay(eventDateTime)}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <View style={styles.pickerSheet}>
            <View style={styles.pickerSheetHeader}>
              <Text style={styles.pickerSheetTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <CalendarPicker value={eventDateTime} onSelect={onSelectDate} />
          </View>
        )}

        {showTimePicker && (
          <View style={styles.pickerSheet}>
            <View style={styles.pickerSheetHeader}>
              <Text style={styles.pickerSheetTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <TimePicker value={eventDateTime} onSelect={onSelectTime} />
          </View>
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}
        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleCreate} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Create Event</Text>}
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

  newEventBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 12, marginBottom: 14 },
  newEventBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  eventRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  eventRowBody:   { flex: 1, minWidth: 0, marginRight: 8 },
  eventRowTitle:  { fontSize: 14, fontWeight: '600', color: '#111827' },
  eventRowSub:    { fontSize: 12, color: '#6b7280', marginTop: 2 },
  eventRowCounts: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  rsvpBadge:     { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  rsvpBadgeText: { fontSize: 11, fontWeight: '700' },

  detailRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  detailMeta: { fontSize: 13, color: '#374151' },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },

  rsvpChoiceRow: { flexDirection: 'row', gap: 8 },
  rsvpChoiceBtn: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  rsvpChoiceBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  rsvpChoiceText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  rsvpChoiceTextActive: { color: '#fff' },

  attendeeRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  attendeeName: { fontSize: 14, color: '#111827' },

  destructiveBtn:     { borderWidth: 1, borderColor: '#dc2626', borderRadius: 12, padding: 13, alignItems: 'center' },
  destructiveBtnText: { color: '#dc2626', fontSize: 14, fontWeight: '700' },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4, marginTop: 12 },
  input:      { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 2 },
  pickerButton:     { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingHorizontal: 12 },
  pickerButtonText: { fontSize: 14, color: '#111827', fontWeight: '600' },

  pickerSheet:       { marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden' },
  pickerSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerSheetTitle:  { fontSize: 13, fontWeight: '700', color: '#374151' },

  calendarContainer:  { padding: 12 },
  calendarHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calendarNavBtn:     { padding: 6 },
  calendarMonthLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  calendarWeekRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  calendarWeekDayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#9ca3af', paddingVertical: 4 },
  calendarCell:         { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  calendarCellSelected: { backgroundColor: '#4f46e5' },
  calendarCellText:         { fontSize: 13, color: '#111827' },
  calendarCellTextDisabled: { color: '#d1d5db' },
  calendarCellTextSelected: { color: '#fff', fontWeight: '700' },
  calendarCellTextToday:    { color: '#4f46e5', fontWeight: '700' },

  timeList: { maxHeight: 260 },
  timeRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 16, height: 44, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  timeRowSelected: { backgroundColor: '#eef2ff' },
  timeRowText:     { fontSize: 14, color: '#111827' },
  timeRowTextSelected: { color: '#4f46e5', fontWeight: '700' },

  errorText:  { fontSize: 13, color: '#dc2626', marginTop: 8 },
  saveBtn:         { backgroundColor: '#4f46e5', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16, marginBottom: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
});
