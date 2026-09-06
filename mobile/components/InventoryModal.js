import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, Modal, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, FlatList, Alert,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from './Icon';
import { inventoryAPI } from '../services/api';
import { getFriendlyErrorMessage } from '../utils/errors';
import { fuzzyFilter } from '../utils/fuzzySearch';

const STATUS_STYLES = {
  CHECKED_IN:  { bg: '#dcfce7', fg: '#16a34a', label: 'Checked In' },
  CHECKED_OUT: { bg: '#fef3c7', fg: '#d97706', label: 'Checked Out' },
  OVERDUE:     { bg: '#fee2e2', fg: '#dc2626', label: 'Overdue' },
};
const STATUS_FILTER_ORDER = ['ALL', 'CHECKED_IN', 'CHECKED_OUT', 'OVERDUE'];

function formatDate(iso) {
  if (!iso) return '';
  // due dates arrive as YYYY-MM-DD — parse as local date, not UTC
  const d = typeof iso === 'string' && iso.length === 10
    ? new Date(`${iso}T00:00:00`)
    : new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function toDueDateString(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.CHECKED_IN;
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusBadgeText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

/** Pure JS/RN month calendar (same pattern as EventsModal). Props: value (Date), onSelect(Date). */
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
 * Self-contained inventory flow for a single club: list -> detail -> form / checkout.
 * Props:
 *  - clubId, currentUser
 *  - canCheckout: bool (CHECKOUT_INVENTORY privilege)
 *  - canManage: bool (MANAGE_INVENTORY privilege)
 *  - onClose: () => void
 */
export default function InventoryModal({ clubId, currentUser, canCheckout, canManage, onClose }) {
  const [view, setView] = useState('list'); // list | detail | form | checkout
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeItemId, setActiveItemId] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // full item being edited, or null for create
  const [itemSearch, setItemSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      setItems(await inventoryAPI.list(clubId));
    } catch (e) {
      Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to load inventory.'));
    } finally {
      setLoadingList(false);
    }
  }, [clubId]);

  useEffect(() => { loadList(); }, [loadList]);

  const openDetail = (id) => { setActiveItemId(id); setView('detail'); };
  const openCreate = () => { setEditingItem(null); setView('form'); };
  const openEdit = (item) => { setEditingItem(item); setView('form'); };
  const openCheckout = (id) => { setActiveItemId(id); setView('checkout'); };

  const backToList = (shouldReload) => {
    setView('list');
    setActiveItemId(null);
    setEditingItem(null);
    if (shouldReload) loadList();
  };

  const visibleItems = fuzzyFilter(
    statusFilter === 'ALL' ? items : items.filter((it) => it.status === statusFilter),
    itemSearch,
    (it) => [it.name, it.category ?? '', it.serialNumber ?? ''],
  );

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        {view === 'list' && (
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inventory</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {canManage && (
              <TouchableOpacity style={styles.newItemBtn} onPress={openCreate} activeOpacity={0.85}>
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                <Text style={styles.newItemBtnText}>Add Item</Text>
              </TouchableOpacity>
            )}

            {items.length > 0 && (
              <>
                <TextInput
                  style={[styles.input, { marginBottom: 8 }]}
                  placeholder="Search by name, category or serial…"
                  placeholderTextColor="#9ca3af"
                  value={itemSearch}
                  onChangeText={setItemSearch}
                />
                <View style={styles.filterRow}>
                  {STATUS_FILTER_ORDER.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                      onPress={() => setStatusFilter(s)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
                        {s === 'ALL' ? 'All' : STATUS_STYLES[s].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {loadingList ? (
              <View style={styles.center}><ActivityIndicator size="small" color="#4f46e5" /></View>
            ) : items.length === 0 ? (
              <View style={styles.center}>
                <MaterialCommunityIcons name="package-variant-closed" size={40} color="#d1d5db" />
                <Text style={[styles.emptyText, { marginTop: 8 }]}>No inventory items yet.</Text>
              </View>
            ) : (
              <FlatList
                data={visibleItems}
                keyExtractor={(it) => String(it.id)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.itemRow} onPress={() => openDetail(item.id)} activeOpacity={0.7}>
                    <View style={styles.itemRowBody}>
                      <Text style={styles.itemRowTitle} numberOfLines={1}>{item.name}</Text>
                      {!!(item.category || item.serialNumber) && (
                        <Text style={styles.itemRowSub} numberOfLines={1}>
                          {[item.category, item.serialNumber].filter(Boolean).join(' · ')}
                        </Text>
                      )}
                      {item.status !== 'CHECKED_IN' && (
                        <Text style={[styles.itemRowSub, item.status === 'OVERDUE' && { color: '#dc2626' }]} numberOfLines={1}>
                          With {item.checkedOutByName}
                          {item.dueDate ? ` · due ${formatDate(item.dueDate)}` : ''}
                        </Text>
                      )}
                    </View>
                    <StatusBadge status={item.status} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={[styles.center, { marginTop: 16 }]}>
                    <Text style={styles.emptyText}>No items match your search.</Text>
                  </View>
                }
              />
            )}
          </View>
        )}

        {view === 'detail' && activeItemId != null && (
          <ItemDetail
            itemId={activeItemId}
            clubId={clubId}
            currentUser={currentUser}
            canCheckout={canCheckout}
            canManage={canManage}
            onBack={(reload) => backToList(reload)}
            onClose={onClose}
            onEdit={openEdit}
            onCheckout={openCheckout}
          />
        )}

        {view === 'form' && (
          <ItemForm
            clubId={clubId}
            item={editingItem}
            onSaved={() => backToList(true)}
            onCancel={() => (editingItem ? setView('detail') : backToList(false))}
            onClose={onClose}
          />
        )}

        {view === 'checkout' && activeItemId != null && (
          <CheckoutForm
            clubId={clubId}
            itemId={activeItemId}
            onDone={() => setView('detail')}
            onCancel={() => setView('detail')}
            onClose={onClose}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Item Detail ────────────────────────────────────────────────── */
function ItemDetail({ itemId, clubId, currentUser, canCheckout, canManage, onBack, onClose, onEdit, onCheckout }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItem(await inventoryAPI.get(clubId, itemId));
    } catch (e) {
      Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to load item.'));
    } finally {
      setLoading(false);
    }
  }, [clubId, itemId]);

  useEffect(() => { load(); }, [load]);

  const isOut = item && item.status !== 'CHECKED_IN';
  const isBorrower = item && currentUser && item.checkedOutByUserId === currentUser.id;

  const handleCheckIn = () => {
    Alert.alert('Check In', `Check "${item.name}" back in?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check In',
        onPress: async () => {
          setBusy(true);
          try {
            setItem(await inventoryAPI.checkIn(clubId, itemId, null));
            setDirty(true);
          } catch (e) {
            Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to check in.'));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Item', `Delete "${item.name}" from the inventory? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await inventoryAPI.remove(clubId, itemId);
            onBack(true);
          } catch (e) {
            Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to delete.'));
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
        <Text style={styles.modalTitle} numberOfLines={1}>{item?.name ?? 'Item'}</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {loading || !item ? (
        <View style={styles.center}><ActivityIndicator size="small" color="#4f46e5" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.detailTopRow}>
            <StatusBadge status={item.status} />
          </View>

          {!!item.category && <Text style={styles.detailMeta}>Category: {item.category}</Text>}
          {!!item.serialNumber && <Text style={styles.detailMeta}>Serial #: {item.serialNumber}</Text>}
          <Text style={styles.detailMeta}>
            Added by {item.createdByName} on {new Date(item.createdAt).toLocaleDateString()}
          </Text>

          {!!item.description && (
            <View style={styles.descBox}>
              <Text style={styles.fieldLabel}>Description</Text>
              <Text style={styles.descText}>{item.description}</Text>
            </View>
          )}

          {isOut && (
            <View style={[styles.descBox, item.status === 'OVERDUE' && { backgroundColor: '#fef2f2' }]}>
              <Text style={[styles.fieldLabel, item.status === 'OVERDUE' && { color: '#dc2626' }]}>
                {item.status === 'OVERDUE' ? 'Overdue checkout' : 'Current checkout'}
              </Text>
              <Text style={styles.descText}>
                Checked out by {item.checkedOutByName}{isBorrower ? ' (you)' : ''} on{' '}
                {new Date(item.checkedOutAt).toLocaleDateString()}
              </Text>
              {!!item.dueDate && (
                <Text style={[styles.descText, item.status === 'OVERDUE' && { color: '#991b1b', fontWeight: '600' }]}>
                  Due {formatDate(item.dueDate)}
                </Text>
              )}
              {!!item.checkoutNotes && <Text style={styles.descText}>Notes: {item.checkoutNotes}</Text>}
            </View>
          )}

          <Text style={styles.sectionTitle}>Checkout History</Text>
          {item.checkoutHistory.length === 0 ? (
            <Text style={styles.emptyText}>This item has never been checked out.</Text>
          ) : (
            item.checkoutHistory.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <MaterialCommunityIcons
                  name={entry.checkedInAt ? 'check-circle-outline' : 'arrow-up-circle-outline'}
                  size={18}
                  color={entry.checkedInAt ? '#16a34a' : '#d97706'}
                  style={{ marginTop: 1 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyAction}>
                    {entry.checkedOutByName} · out {new Date(entry.checkedOutAt).toLocaleDateString()}
                    {entry.dueDate ? ` · due ${formatDate(entry.dueDate)}` : ''}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {entry.checkedInAt
                      ? `Returned ${new Date(entry.checkedInAt).toLocaleDateString()}${entry.checkedInByName && entry.checkedInByUserId !== entry.checkedOutByUserId ? ` by ${entry.checkedInByName}` : ''}`
                      : 'Still out'}
                  </Text>
                  {!!entry.checkoutNotes && <Text style={styles.historyNote}>Out: {entry.checkoutNotes}</Text>}
                  {!!entry.checkinNotes && <Text style={styles.historyNote}>In: {entry.checkinNotes}</Text>}
                </View>
              </View>
            ))
          )}

          {/* ── Actions ── */}
          <View style={{ marginTop: 16, gap: 8 }}>
            {canCheckout && item.status === 'CHECKED_IN' && (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => onCheckout(item.id)} disabled={busy} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Check Out</Text>
              </TouchableOpacity>
            )}

            {isOut && (isBorrower || canManage) && (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCheckIn} disabled={busy} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Check In</Text>
              </TouchableOpacity>
            )}

            {canManage && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => onEdit(item)} disabled={busy} activeOpacity={0.85}>
                <Text style={styles.secondaryBtnText}>Edit Item</Text>
              </TouchableOpacity>
            )}

            {canManage && item.status === 'CHECKED_IN' && (
              <TouchableOpacity style={styles.destructiveBtn} onPress={handleDelete} disabled={busy} activeOpacity={0.85}>
                <Text style={styles.destructiveBtnText}>Delete Item</Text>
              </TouchableOpacity>
            )}

            {busy && <ActivityIndicator size="small" color="#4f46e5" />}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/* ─── Item Form (create / edit) ─────────────────────────────────── */
function ItemForm({ clubId, item, onSaved, onCancel, onClose }) {
  const isEdit = !!item;
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [serialNumber, setSerialNumber] = useState(item?.serialNumber ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      serialNumber: serialNumber.trim() || null,
    };
    try {
      if (isEdit) {
        await inventoryAPI.update(clubId, item.id, payload);
      } else {
        await inventoryAPI.create(clubId, payload);
      }
      onSaved();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, 'Failed to save item.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.modalSheet, { maxHeight: '92%' }]}>
      <View style={styles.sheetHandle} />
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onCancel}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>{isEdit ? 'Edit Item' : 'Add Item'}</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>Name *</Text>
        <TextInput style={styles.input} placeholder="e.g. Canon EOS camera" placeholderTextColor="#9ca3af" value={name} onChangeText={setName} />

        <Text style={styles.fieldLabel}>Description (optional)</Text>
        <TextInput style={[styles.input, styles.inputMulti]} placeholder="Condition, accessories, storage location…" placeholderTextColor="#9ca3af" value={description} onChangeText={setDescription} multiline numberOfLines={3} />

        <Text style={styles.fieldLabel}>Category (optional)</Text>
        <TextInput style={styles.input} placeholder="e.g. Electronics, Sports, Costumes" placeholderTextColor="#9ca3af" value={category} onChangeText={setCategory} />

        <Text style={styles.fieldLabel}>Serial Number (optional)</Text>
        <TextInput style={styles.input} placeholder="Serial or asset tag" placeholderTextColor="#9ca3af" value={serialNumber} onChangeText={setSerialNumber} autoCapitalize="characters" />

        {!!error && <Text style={styles.errorText}>{error}</Text>}
        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Item'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* ─── Checkout Form ─────────────────────────────────────────────── */
function CheckoutForm({ clubId, itemId, onDone, onCancel, onClose }) {
  const [hasDueDate, setHasDueDate] = useState(true);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // sensible default: one week out
    return d;
  });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCheckOut = async () => {
    setSaving(true); setError('');
    try {
      await inventoryAPI.checkOut(
        clubId, itemId,
        hasDueDate ? toDueDateString(dueDate) : null,
        notes.trim() || null,
      );
      onDone();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, 'Failed to check out.'));
      setSaving(false);
    }
  };

  return (
    <View style={[styles.modalSheet, { maxHeight: '92%' }]}>
      <View style={styles.sheetHandle} />
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onCancel}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Check Out</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.toggleRow} onPress={() => setHasDueDate((v) => !v)} activeOpacity={0.8}>
          <MaterialCommunityIcons
            name={hasDueDate ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={22} color="#4f46e5"
          />
          <Text style={styles.toggleLabel}>Set a due date</Text>
        </TouchableOpacity>

        {hasDueDate && (
          <>
            <Text style={styles.fieldLabel}>Due {formatDate(toDueDateString(dueDate))}</Text>
            <CalendarPicker value={dueDate} onSelect={setDueDate} />
          </>
        )}

        <Text style={styles.fieldLabel}>Notes (optional)</Text>
        <TextInput style={[styles.input, styles.inputMulti]} placeholder="e.g. Needed for Saturday's game" placeholderTextColor="#9ca3af" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

        {!!error && <Text style={styles.errorText}>{error}</Text>}
        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleCheckOut} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Check Out</Text>}
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

  newItemBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 12, marginBottom: 14 },
  newItemBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  filterRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip:           { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#fff' },
  filterChipActive:     { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  filterChipText:       { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  filterChipTextActive: { color: '#fff' },

  itemRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemRowBody:  { flex: 1, minWidth: 0, marginRight: 8 },
  itemRowTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  itemRowSub:   { fontSize: 12, color: '#6b7280', marginTop: 2 },

  statusBadge:     { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  detailTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  detailMeta:   { fontSize: 12, color: '#6b7280', marginBottom: 2 },

  descBox:    { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginTop: 10, marginBottom: 4 },
  descText:   { fontSize: 14, color: '#374151', lineHeight: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4, marginTop: 12 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', marginTop: 16, marginBottom: 6 },

  historyRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  historyAction: { fontSize: 13, fontWeight: '600', color: '#111827' },
  historyMeta:   { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  historyNote:   { fontSize: 12, color: '#4b5563', marginTop: 2, fontStyle: 'italic' },

  primaryBtn:      { backgroundColor: '#4f46e5', borderRadius: 12, padding: 13, alignItems: 'center' },
  primaryBtnText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryBtn:    { borderWidth: 1, borderColor: '#4f46e5', borderRadius: 12, padding: 13, alignItems: 'center' },
  secondaryBtnText:{ color: '#4f46e5', fontSize: 14, fontWeight: '700' },
  destructiveBtn:  { borderWidth: 1, borderColor: '#dc2626', borderRadius: 12, padding: 13, alignItems: 'center' },
  destructiveBtnText: { color: '#dc2626', fontSize: 14, fontWeight: '700' },

  toggleRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  toggleLabel: { flex: 1, fontSize: 13, color: '#374151' },

  input:           { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 2 },
  inputMulti:      { height: 70, textAlignVertical: 'top' },
  errorText:       { fontSize: 13, color: '#dc2626', marginTop: 8 },
  saveBtn:         { backgroundColor: '#4f46e5', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16, marginBottom: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },

  calendarContainer:        { backgroundColor: '#f9fafb', borderRadius: 12, padding: 10, marginBottom: 4 },
  calendarHeader:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calendarNavBtn:           { padding: 4 },
  calendarMonthLabel:       { fontSize: 14, fontWeight: '700', color: '#111827' },
  calendarWeekRow:          { flexDirection: 'row' },
  calendarWeekDayLabel:     { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#9ca3af', marginBottom: 4 },
  calendarCell:             { flex: 1, aspectRatio: 1.2, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  calendarCellSelected:     { backgroundColor: '#4f46e5' },
  calendarCellText:         { fontSize: 13, color: '#111827' },
  calendarCellTextDisabled: { color: '#d1d5db' },
  calendarCellTextSelected: { color: '#fff', fontWeight: '700' },
  calendarCellTextToday:    { color: '#4f46e5', fontWeight: '700' },
});
