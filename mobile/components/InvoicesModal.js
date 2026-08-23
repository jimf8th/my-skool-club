import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, Modal, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, FlatList, Alert,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { invoicesAPI } from '../services/api';
import { getFriendlyErrorMessage } from '../utils/errors';
import { fuzzyFilter } from '../utils/fuzzySearch';
import { openPrivacyPolicy } from '../utils/legalLinks';

const STATUS_STYLES = {
  DRAFT:     { bg: '#f3f4f6', fg: '#4b5563', label: 'Draft' },
  SUBMITTED: { bg: '#fef3c7', fg: '#d97706', label: 'Submitted' },
  APPROVED:  { bg: '#dbeafe', fg: '#2563eb', label: 'Approved' },
  PAID:      { bg: '#dcfce7', fg: '#16a34a', label: 'Paid' },
  CANCELLED: { bg: '#fee2e2', fg: '#dc2626', label: 'Cancelled' },
};
const STATUS_FILTER_ORDER = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CANCELLED'];

function confirmReceiptAiSharing() {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (value) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    Alert.alert(
      'Share receipt with OpenAI?',
      'To extract invoice details, My Skool Club will send this receipt image to OpenAI. The image is not saved as an invoice attachment, but OpenAI may retain API request data for up to 30 days for abuse monitoring. Nothing is added to your invoice until you review and save it.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => finish(false) },
        {
          text: 'Privacy Policy',
          onPress: () => {
            finish(false);
            openPrivacyPolicy();
          },
        },
        { text: 'Agree & Scan', onPress: () => finish(true) },
      ],
      { cancelable: true, onDismiss: () => finish(false) }
    );
  });
}

function money(n) {
  const num = Number(n ?? 0);
  return `$${num.toFixed(2)}`;
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusBadgeText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

/**
 * Self-contained invoices flow for a single club: list -> detail -> form.
 * Props:
 *  - clubId, currentUser
 *  - canCreate: bool (CREATE_INVOICE privilege)
 *  - canApprove: bool (APPROVE_INVOICE privilege)
 *  - onClose: () => void
 */
export default function InvoicesModal({ clubId, schoolTier = 'STANDARD', currentUser, canCreate, canApprove, onClose }) {
  const [view, setView] = useState('list'); // list | detail | form
  const [invoices, setInvoices] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeInvoiceId, setActiveInvoiceId] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null); // full invoice being edited, or null for create
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      setInvoices(await invoicesAPI.list(clubId));
    } catch (e) {
      Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to load invoices.'));
    } finally {
      setLoadingList(false);
    }
  }, [clubId]);

  useEffect(() => { loadList(); }, [loadList]);

  const openDetail = (id) => { setActiveInvoiceId(id); setView('detail'); };
  const openCreate = () => { setEditingInvoice(null); setView('form'); };
  const openEdit = (invoice) => { setEditingInvoice(invoice); setView('form'); };

  const backToList = (shouldReload) => {
    setView('list');
    setActiveInvoiceId(null);
    setEditingInvoice(null);
    if (shouldReload) loadList();
  };

  const visibleInvoices = fuzzyFilter(
    statusFilter === 'ALL' ? invoices : invoices.filter((inv) => inv.status === statusFilter),
    invoiceSearch,
    (inv) => [inv.title],
  );

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        {view === 'list' && (
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invoices</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {canCreate && (
              <TouchableOpacity style={styles.newInvoiceBtn} onPress={openCreate} activeOpacity={0.85}>
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                <Text style={styles.newInvoiceBtnText}>New Invoice</Text>
              </TouchableOpacity>
            )}

            {invoices.length > 0 && (
              <>
                <TextInput
                  style={[styles.input, { marginBottom: 8 }]}
                  placeholder="Search by description…"
                  placeholderTextColor="#9ca3af"
                  value={invoiceSearch}
                  onChangeText={setInvoiceSearch}
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
            ) : invoices.length === 0 ? (
              <View style={styles.center}>
                <MaterialCommunityIcons name="receipt-text-outline" size={40} color="#d1d5db" />
                <Text style={[styles.emptyText, { marginTop: 8 }]}>No invoices yet.</Text>
              </View>
            ) : (
              <FlatList
                data={visibleInvoices}
                keyExtractor={(inv) => String(inv.id)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.invoiceRow} onPress={() => openDetail(item.id)} activeOpacity={0.7}>
                    <View style={styles.invoiceRowBody}>
                      <Text style={styles.invoiceRowTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.invoiceRowSub}>
                        {item.createdByName} · {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.invoiceRowRight}>
                      <Text style={styles.invoiceRowAmount}>{money(item.totalAmount)}</Text>
                      <StatusBadge status={item.status} />
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={[styles.center, { marginTop: 16 }]}>
                    <Text style={styles.emptyText}>No invoices match your search.</Text>
                  </View>
                }
              />
            )}
          </View>
        )}

        {view === 'detail' && activeInvoiceId != null && (
          <InvoiceDetail
            invoiceId={activeInvoiceId}
            clubId={clubId}
            currentUser={currentUser}
            canApprove={canApprove}
            onBack={(reload) => backToList(reload)}
            onClose={onClose}
            onEdit={openEdit}
          />
        )}

        {view === 'form' && (
          <InvoiceForm
            clubId={clubId}
            schoolTier={schoolTier}
            invoice={editingInvoice}
            onSaved={() => backToList(true)}
            onCancel={() => (editingInvoice ? setView('detail') : backToList(false))}
            onClose={onClose}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Invoice Detail ─────────────────────────────────────────────── */
function InvoiceDetail({ invoiceId, clubId, currentUser, canApprove, onBack, onClose, onEdit }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInvoice(await invoicesAPI.get(clubId, invoiceId));
    } catch (e) {
      Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to load invoice.'));
    } finally {
      setLoading(false);
    }
  }, [clubId, invoiceId]);

  useEffect(() => { load(); }, [load]);

  const isOwner = invoice && currentUser && invoice.createdByUserId === currentUser.id;

  const run = async (action) => {
    setBusy(true);
    try {
      await action();
      setDirty(true);
      await load();
    } catch (e) {
      Alert.alert('Error', getFriendlyErrorMessage(e, 'Action failed.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = () => {
    Alert.alert('Submit Invoice', 'Submit this invoice for admin approval?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', onPress: () => run(() => invoicesAPI.submit(clubId, invoiceId)) },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Draft', 'Delete this draft invoice? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await invoicesAPI.remove(clubId, invoiceId);
            onBack(true);
          } catch (e) {
            Alert.alert('Error', getFriendlyErrorMessage(e, 'Failed to delete.'));
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleApprove = () => {
    Alert.alert('Approve Invoice', 'Approve this invoice?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => run(() => invoicesAPI.approve(clubId, invoiceId)) },
    ]);
  };

  const handleMarkPaid = () => {
    Alert.alert('Mark as Paid', 'Confirm this invoice has been paid?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Paid', onPress: () => run(() => invoicesAPI.markPaid(clubId, invoiceId)) },
    ]);
  };

  const handleSendBack = () => {
    promptForText('Send Back to Draft', 'Reason (required):', (reason) => {
      if (!reason || !reason.trim()) { Alert.alert('Reason required', 'Please provide a reason.'); return; }
      run(() => invoicesAPI.sendBack(clubId, invoiceId, reason.trim()));
    });
  };

  const handleCancel = () => {
    promptForText('Cancel Invoice', 'Reason (optional):', (reason) => {
      run(() => invoicesAPI.cancel(clubId, invoiceId, reason?.trim() || null));
    });
  };

  const promptForText = (title, message, onSubmit) => {
    if (Platform.OS === 'ios') {
      Alert.prompt(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: onSubmit },
      ], 'plain-text');
    } else {
      // Alert.prompt is iOS-only — fall back to a simple confirmation without free text on Android.
      Alert.alert(title, message + '\n(Enter reason on next screen not supported on Android yet — proceeding without one.)', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => onSubmit('') },
      ]);
    }
  };

  const canCancel = invoice && (isOwner || canApprove) &&
    ['DRAFT', 'SUBMITTED', 'APPROVED'].includes(invoice.status);

  return (
    <View style={[styles.modalSheet, { maxHeight: '92%' }]}>
      <View style={styles.sheetHandle} />
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={() => onBack(dirty)}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
        </TouchableOpacity>
        <Text style={styles.modalTitle} numberOfLines={1}>{invoice?.title ?? 'Invoice'}</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {loading || !invoice ? (
        <View style={styles.center}><ActivityIndicator size="small" color="#4f46e5" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.detailTopRow}>
            <StatusBadge status={invoice.status} />
            <Text style={styles.detailAmount}>{money(invoice.totalAmount)}</Text>
          </View>

          <Text style={styles.detailMeta}>
            Created by {invoice.createdByName} on {new Date(invoice.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.detailMeta}>
            {invoice.paymentRequired ? 'Payment required' : 'No payment required (record only)'}
          </Text>
          {!!invoice.payeeName && <Text style={styles.detailMeta}>Payee: {invoice.payeeName}</Text>}
          {!!invoice.payeeEmail && <Text style={styles.detailMeta}>Payee email: {invoice.payeeEmail}</Text>}
          {!!invoice.notes && (
            <View style={styles.descBox}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <Text style={styles.descText}>{invoice.notes}</Text>
            </View>
          )}
          {!!invoice.rejectionReason && invoice.status === 'DRAFT' && (
            <View style={[styles.descBox, { backgroundColor: '#fef2f2' }]}>
              <Text style={[styles.fieldLabel, { color: '#dc2626' }]}>Sent back — reason</Text>
              <Text style={[styles.descText, { color: '#991b1b' }]}>{invoice.rejectionReason}</Text>
            </View>
          )}
          {!!invoice.cancellationReason && (
            <View style={[styles.descBox, { backgroundColor: '#fef2f2' }]}>
              <Text style={[styles.fieldLabel, { color: '#dc2626' }]}>Cancellation reason</Text>
              <Text style={[styles.descText, { color: '#991b1b' }]}>{invoice.cancellationReason}</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Line Items</Text>
          {invoice.lineItems.map((li) => (
            <View key={li.id} style={styles.lineItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineItemDesc}>{li.description}</Text>
                <Text style={styles.lineItemSub}>{li.quantity} × {money(li.unitPrice)}</Text>
              </View>
              <Text style={styles.lineItemTotal}>{money(li.totalPrice)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{money(invoice.totalAmount)}</Text>
          </View>

          <Text style={styles.sectionTitle}>Audit Trail</Text>
          {invoice.auditTrail.map((entry) => (
            <View key={entry.id} style={styles.auditRow}>
              <MaterialCommunityIcons name="circle-small" size={20} color="#9ca3af" />
              <View style={{ flex: 1 }}>
                <Text style={styles.auditAction}>
                  {formatAction(entry.action)} — {entry.performedByName}
                </Text>
                <Text style={styles.auditMeta}>{new Date(entry.performedAt).toLocaleString()}</Text>
                {!!entry.note && <Text style={styles.auditNote}>{entry.note}</Text>}
              </View>
            </View>
          ))}

          {/* ── Actions ── */}
          <View style={{ marginTop: 16, gap: 8 }}>
            {isOwner && invoice.status === 'DRAFT' && (
              <>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => onEdit(invoice)} disabled={busy} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>Edit Draft</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={busy} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>Submit for Approval</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.destructiveBtn} onPress={handleDelete} disabled={busy} activeOpacity={0.85}>
                  <Text style={styles.destructiveBtnText}>Delete Draft</Text>
                </TouchableOpacity>
              </>
            )}

            {canApprove && invoice.status === 'SUBMITTED' && (
              <>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleApprove} disabled={busy} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleSendBack} disabled={busy} activeOpacity={0.85}>
                  <Text style={styles.secondaryBtnText}>Send Back to Draft</Text>
                </TouchableOpacity>
              </>
            )}

            {canApprove && invoice.status === 'APPROVED' && (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleMarkPaid} disabled={busy} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Mark as Paid</Text>
              </TouchableOpacity>
            )}

            {canCancel && (
              <TouchableOpacity style={styles.destructiveBtn} onPress={handleCancel} disabled={busy} activeOpacity={0.85}>
                <Text style={styles.destructiveBtnText}>Cancel Invoice</Text>
              </TouchableOpacity>
            )}

            {busy && <ActivityIndicator size="small" color="#4f46e5" />}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function formatAction(action) {
  const map = {
    CREATED: 'Created',
    UPDATED: 'Updated',
    SUBMITTED: 'Submitted',
    SENT_BACK_TO_DRAFT: 'Sent back to draft',
    APPROVED: 'Approved',
    MARKED_PAID: 'Marked paid',
    CANCELLED: 'Cancelled',
  };
  return map[action] ?? action;
}

/* ─── Invoice Form (create / edit draft) ────────────────────────── */
function InvoiceForm({ clubId, schoolTier, invoice, onSaved, onCancel, onClose }) {
  const isEdit = !!invoice;
  const [title, setTitle] = useState(invoice?.title ?? '');
  const [notes, setNotes] = useState(invoice?.notes ?? '');
  const [paymentRequired, setPaymentRequired] = useState(invoice?.paymentRequired ?? true);
  const [payeeName, setPayeeName] = useState(invoice?.payeeName ?? '');
  const [payeeEmail, setPayeeEmail] = useState(invoice?.payeeEmail ?? '');
  const [lineItems, setLineItems] = useState(
    invoice?.lineItems?.length
      ? invoice.lineItems.map((li) => ({ description: li.description, quantity: String(li.quantity), unitPrice: String(li.unitPrice) }))
      : [{ description: '', quantity: '1', unitPrice: '' }]
  );
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const isPremium = schoolTier === 'PREMIUM';

  const updateLineItem = (index, field, value) => {
    setLineItems((prev) => prev.map((li, i) => (i === index ? { ...li, [field]: value } : li)));
  };
  const addLineItem = () => setLineItems((prev) => [...prev, { description: '', quantity: '1', unitPrice: '' }]);
  const removeLineItem = (index) => setLineItems((prev) => prev.filter((_, i) => i !== index));

  const estimatedTotal = lineItems.reduce((sum, li) => {
    const qty = parseFloat(li.quantity) || 0;
    const price = parseFloat(li.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const pickAndScan = async (fromCamera) => {
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow access to continue.');
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6 });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      if (result.assets[0].base64.length > 10_000_000) {
        Alert.alert('Receipt Too Large', 'Choose a receipt image smaller than 7.5 MB. You can also enter the items manually.');
        return;
      }

      // Apple requires explicit permission before personal data is shared with
      // a third-party AI provider. Ask after the user chooses the exact image,
      // but before any image bytes leave the device.
      const consented = await confirmReceiptAiSharing();
      if (!consented) return;

      setScanning(true);
      setError('');
      const scanResult = await invoicesAPI.scanReceipt(clubId, result.assets[0].base64);

      if (scanResult.suggestedTitle && !title.trim()) setTitle(scanResult.suggestedTitle);
      if (scanResult.suggestedPayeeName && !payeeName.trim()) setPayeeName(scanResult.suggestedPayeeName);
      if (scanResult.lineItems?.length) {
        const scanned = scanResult.lineItems.map((li) => ({
          description: li.description,
          quantity: String(li.quantity),
          unitPrice: String(li.unitPrice),
        }));
        setLineItems((prev) => {
          const nonEmpty = prev.filter((li) => li.description.trim() || parseFloat(li.unitPrice) > 0);
          return [...nonEmpty, ...scanned];
        });
      } else {
        Alert.alert('No items found', 'Could not read any line items from this receipt. Please enter them manually.');
      }
    } catch (e) {
      setError(getFriendlyErrorMessage(e, 'Failed to scan receipt.'));
    } finally {
      setScanning(false);
    }
  };

  const handleScanReceipt = () => {
    Alert.alert('Scan Receipt', 'Choose a photo source', [
      { text: 'Take Photo', onPress: () => pickAndScan(true) },
      { text: 'Choose from Library', onPress: () => pickAndScan(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    const cleanedItems = lineItems
      .filter((li) => li.description.trim())
      .map((li) => ({
        description: li.description.trim(),
        quantity: parseInt(li.quantity, 10) || 1,
        unitPrice: parseFloat(li.unitPrice) || 0,
      }));
    if (cleanedItems.length === 0) { setError('Add at least one line item.'); return; }
    if (cleanedItems.some((li) => li.unitPrice <= 0)) { setError('Each line item needs a unit price greater than 0.'); return; }

    setSaving(true); setError('');
    const payload = {
      title: title.trim(),
      notes: notes.trim() || null,
      paymentRequired,
      payeeName: payeeName.trim() || null,
      payeeEmail: payeeEmail.trim() || null,
      lineItems: cleanedItems,
    };
    try {
      if (isEdit) {
        await invoicesAPI.update(clubId, invoice.id, payload);
      } else {
        await invoicesAPI.create(clubId, payload);
      }
      onSaved();
    } catch (e) {
      setError(getFriendlyErrorMessage(e, 'Failed to save invoice.'));
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
        <Text style={styles.modalTitle}>{isEdit ? 'Edit Draft' : 'New Invoice'}</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.scanBtn, !isPremium && styles.scanBtnDisabled]}
          onPress={handleScanReceipt}
          disabled={scanning || !isPremium}
          activeOpacity={0.85}
        >
          {scanning ? (
            <ActivityIndicator size="small" color="#4f46e5" />
          ) : (
            <>
              <MaterialCommunityIcons name={isPremium ? 'camera-outline' : 'lock-outline'} size={18} color={isPremium ? '#4f46e5' : '#9ca3af'} />
              <Text style={[styles.scanBtnText, !isPremium && styles.scanBtnTextDisabled]}>Scan Receipt · Premium</Text>
            </>
          )}
        </TouchableOpacity>
        {!isPremium && (
          <Text style={styles.premiumNotice}>
            AI receipt scanning comes with Premium. Enter invoice details manually, or ask an application administrator about Premium for this school.
          </Text>
        )}

        <Text style={styles.fieldLabel}>Title *</Text>
        <TextInput style={styles.input} placeholder="e.g. Craft supplies for club event" placeholderTextColor="#9ca3af" value={title} onChangeText={setTitle} />

        <Text style={styles.fieldLabel}>Notes (optional)</Text>
        <TextInput style={[styles.input, styles.inputMulti]} placeholder="Additional context…" placeholderTextColor="#9ca3af" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

        <TouchableOpacity style={styles.toggleRow} onPress={() => setPaymentRequired((v) => !v)} activeOpacity={0.8}>
          <MaterialCommunityIcons
            name={paymentRequired ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={22} color="#4f46e5"
          />
          <Text style={styles.toggleLabel}>Payment required (reimbursement or external bill)</Text>
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>Payee Name (optional)</Text>
        <TextInput style={styles.input} placeholder="Who should be paid" placeholderTextColor="#9ca3af" value={payeeName} onChangeText={setPayeeName} />

        <Text style={styles.fieldLabel}>Payee Email (optional)</Text>
        <TextInput style={styles.input} placeholder="payee@example.com" placeholderTextColor="#9ca3af" value={payeeEmail} onChangeText={setPayeeEmail} autoCapitalize="none" keyboardType="email-address" />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          <TouchableOpacity onPress={addLineItem} style={styles.addAdminBtn} activeOpacity={0.8}>
            <MaterialCommunityIcons name="plus" size={16} color="#4f46e5" />
            <Text style={styles.addAdminBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {lineItems.map((li, index) => (
          <View key={index} style={styles.lineItemForm}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 6 }]}
              placeholder="Description"
              placeholderTextColor="#9ca3af"
              value={li.description}
              onChangeText={(v) => updateLineItem(index, 'description', v)}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Qty"
                placeholderTextColor="#9ca3af"
                value={li.quantity}
                onChangeText={(v) => updateLineItem(index, 'quantity', v)}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Unit Price"
                placeholderTextColor="#9ca3af"
                value={li.unitPrice}
                onChangeText={(v) => updateLineItem(index, 'unitPrice', v)}
                keyboardType="decimal-pad"
              />
              {lineItems.length > 1 && (
                <TouchableOpacity onPress={() => removeLineItem(index)} style={styles.removeLineItemBtn} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color="#dc2626" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Estimated Total</Text>
          <Text style={styles.totalValue}>{money(estimatedTotal)}</Text>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}
        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Draft</Text>}
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

  newInvoiceBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 12, marginBottom: 14 },
  newInvoiceBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  filterRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip:           { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#fff' },
  filterChipActive:     { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  filterChipText:       { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  filterChipTextActive: { color: '#fff' },

  invoiceRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  invoiceRowBody:  { flex: 1, minWidth: 0, marginRight: 8 },
  invoiceRowTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  invoiceRowSub:   { fontSize: 12, color: '#6b7280', marginTop: 2 },
  invoiceRowRight: { alignItems: 'flex-end', gap: 4 },
  invoiceRowAmount:{ fontSize: 14, fontWeight: '700', color: '#111827' },

  statusBadge:     { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  detailTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  detailAmount: { fontSize: 20, fontWeight: '800', color: '#111827' },
  detailMeta:   { fontSize: 12, color: '#6b7280', marginBottom: 2 },

  descBox:    { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginTop: 10, marginBottom: 4 },
  descText:   { fontSize: 14, color: '#374151', lineHeight: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4, marginTop: 12 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 6 },
  sectionTitle:  { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', marginTop: 16, marginBottom: 6 },

  lineItemRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  lineItemDesc: { fontSize: 14, color: '#111827', fontWeight: '500' },
  lineItemSub:  { fontSize: 12, color: '#6b7280', marginTop: 2 },
  lineItemTotal:{ fontSize: 14, fontWeight: '700', color: '#111827' },

  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#111827' },

  auditRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  auditAction:{ fontSize: 13, fontWeight: '600', color: '#111827' },
  auditMeta:  { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  auditNote:  { fontSize: 12, color: '#4b5563', marginTop: 2, fontStyle: 'italic' },

  primaryBtn:      { backgroundColor: '#4f46e5', borderRadius: 12, padding: 13, alignItems: 'center' },
  primaryBtnText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryBtn:    { borderWidth: 1, borderColor: '#4f46e5', borderRadius: 12, padding: 13, alignItems: 'center' },
  secondaryBtnText:{ color: '#4f46e5', fontSize: 14, fontWeight: '700' },
  destructiveBtn:  { borderWidth: 1, borderColor: '#dc2626', borderRadius: 12, padding: 13, alignItems: 'center' },
  destructiveBtnText: { color: '#dc2626', fontSize: 14, fontWeight: '700' },

  scanBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#4f46e5', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, marginBottom: 8, backgroundColor: '#f5f3ff' },
  scanBtnText: { color: '#4f46e5', fontSize: 14, fontWeight: '700' },
  scanBtnDisabled: { borderColor: '#d1d5db', backgroundColor: '#f3f4f6' },
  scanBtnTextDisabled: { color: '#9ca3af' },
  premiumNotice: { color: '#92400e', backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, fontSize: 12, lineHeight: 17, marginBottom: 8 },

  toggleRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  toggleLabel: { flex: 1, fontSize: 13, color: '#374151' },

  addAdminBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#4f46e5', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  addAdminBtnText: { fontSize: 12, color: '#4f46e5', fontWeight: '600' },

  lineItemForm: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 10, marginBottom: 8 },
  removeLineItemBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },

  input:           { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 2 },
  inputMulti:      { height: 70, textAlignVertical: 'top' },
  errorText:       { fontSize: 13, color: '#dc2626', marginTop: 8 },
  saveBtn:         { backgroundColor: '#4f46e5', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16, marginBottom: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
});
