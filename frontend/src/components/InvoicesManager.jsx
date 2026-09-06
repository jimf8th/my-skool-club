import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, Lock } from 'lucide-react';
import Modal from './Modal';
import { invoicesService } from '../services/api';
import { getErrorMessage } from '../utils/errors';

const statuses = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CANCELLED'];
const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const SchoolTierContext = React.createContext('STANDARD');

export default function InvoicesManager({ clubId, schoolTier = 'STANDARD', currentUser, canCreate, canApprove, onClose }) {
  const [invoices, setInvoices] = useState([]);
  const [active, setActive] = useState(null);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setInvoices(await invoicesService.list(clubId)); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to load invoices.')); }
    finally { setLoading(false); }
  }, [clubId]);
  useEffect(() => { load(); }, [load]);

  const open = async (invoiceId) => {
    setLoading(true); setView('detail'); setError('');
    try { setActive(await invoicesService.get(clubId, invoiceId)); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to load invoice.')); }
    finally { setLoading(false); }
  };

  const run = async (action, fallback) => {
    setLoading(true); setError('');
    try { await action(); setActive(await invoicesService.get(clubId, active.id)); await load(); setView('detail'); }
    catch (requestError) { setError(getErrorMessage(requestError, fallback)); setLoading(false); }
  };

  const remove = async () => {
    if (!window.confirm('Delete this draft invoice?')) return;
    try { await invoicesService.remove(clubId, active.id); setActive(null); setView('list'); await load(); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to delete invoice.')); }
  };

  const visible = invoices.filter((invoice) => (status === 'ALL' || invoice.status === status) && invoice.title.toLowerCase().includes(search.toLowerCase()));
  const title = view === 'form' ? (editing ? 'Edit Draft' : 'New Invoice') : view === 'detail' ? active?.title || 'Invoice' : 'Invoices';
  const isOwner = active?.createdByUserId === currentUser?.id;

  return <SchoolTierContext.Provider value={schoolTier}><Modal title={title} onClose={onClose} size="max-w-4xl">
    {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {view === 'form' ? <InvoiceForm clubId={clubId} invoice={editing} onCancel={() => { setEditing(null); setView(editing ? 'detail' : 'list'); }} onSaved={() => { setEditing(null); setView('list'); load(); }} /> : view === 'detail' ? loading || !active ? <Loading /> : <div><Back onClick={() => { setActive(null); setView('list'); }} /><div className="mt-4 flex items-start justify-between gap-4"><div><Status value={active.status} /><p className="mt-3 text-sm text-gray-500">Created by {active.createdByName} on {new Date(active.createdAt).toLocaleDateString()}</p><p className="mt-1 text-sm text-gray-600">{active.paymentRequired ? 'Payment required' : 'Record only — no payment required'}</p>{active.payeeName && <p className="mt-1 text-sm">Payee: {active.payeeName}{active.payeeEmail ? ` (${active.payeeEmail})` : ''}</p>}</div><p className="text-2xl font-bold">{money(active.totalAmount)}</p></div>{active.notes && <div className="mt-4 rounded-xl bg-gray-50 p-4"><p className="text-xs font-bold uppercase text-gray-500">Notes</p><p className="mt-2 whitespace-pre-wrap text-sm">{active.notes}</p></div>}{active.rejectionReason && <Notice title="Sent back to draft" text={active.rejectionReason} />}{active.cancellationReason && <Notice title="Cancellation reason" text={active.cancellationReason} />}
      <h3 className="mt-6 font-bold">Line Items</h3><div className="mt-2 divide-y rounded-xl border">{active.lineItems.map((item) => <div key={item.id} className="flex justify-between gap-4 p-3"><div><p className="font-semibold">{item.description}</p><p className="text-xs text-gray-500">{item.quantity} × {money(item.unitPrice)}</p></div><p className="font-bold">{money(item.totalPrice)}</p></div>)}<div className="flex justify-between bg-gray-50 p-3 font-bold"><span>Total</span><span>{money(active.totalAmount)}</span></div></div>
      <h3 className="mt-6 font-bold">Audit Trail</h3><div className="mt-2 divide-y rounded-xl border">{active.auditTrail.map((entry) => <div key={entry.id} className="p-3 text-sm"><p className="font-semibold">{entry.action.replaceAll('_', ' ')} — {entry.performedByName}</p><p className="text-xs text-gray-500">{new Date(entry.performedAt).toLocaleString()}</p>{entry.note && <p className="mt-1 text-gray-600">{entry.note}</p>}</div>)}</div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">{isOwner && active.status === 'DRAFT' && <><button type="button" onClick={() => { setEditing(active); setView('form'); }} className="rounded-lg border px-4 py-2 font-semibold">Edit Draft</button><button type="button" onClick={() => window.confirm('Submit this invoice for approval?') && run(() => invoicesService.submit(clubId, active.id), 'Failed to submit invoice.')} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Submit for Approval</button><button type="button" onClick={remove} className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700">Delete Draft</button></>}{canApprove && active.status === 'SUBMITTED' && <><button type="button" onClick={() => window.confirm('Approve this invoice?') && run(() => invoicesService.approve(clubId, active.id), 'Failed to approve invoice.')} className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white">Approve</button><button type="button" onClick={() => { const reason = window.prompt('Reason for sending this invoice back to draft:'); if (reason?.trim()) run(() => invoicesService.sendBack(clubId, active.id, reason.trim()), 'Failed to send invoice back.'); }} className="rounded-lg border px-4 py-2 font-semibold">Send Back</button></>}{canApprove && active.status === 'APPROVED' && <button type="button" onClick={() => window.confirm('Confirm this invoice has been paid?') && run(() => invoicesService.markPaid(clubId, active.id), 'Failed to mark invoice paid.')} className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white">Mark Paid</button>}{(isOwner || canApprove) && ['DRAFT', 'SUBMITTED', 'APPROVED'].includes(active.status) && <button type="button" onClick={() => { const reason = window.prompt('Cancellation reason (optional):'); if (reason !== null) run(() => invoicesService.cancel(clubId, active.id, reason.trim() || null), 'Failed to cancel invoice.'); }} className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700">Cancel Invoice</button>}</div>
    </div> : <><div className="mb-4 flex flex-wrap items-center justify-between gap-3">{canCreate && <button type="button" onClick={() => { setEditing(null); setView('form'); }} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">+ New Invoice</button>}<button type="button" onClick={load} className="rounded-lg border px-4 py-2 font-semibold">Refresh</button></div>{invoices.length > 0 && <><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by description" className="mb-3 w-full rounded-lg border px-4 py-3" /><div className="mb-4 flex flex-wrap gap-2">{statuses.map((item) => <button type="button" key={item} onClick={() => setStatus(item)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status === item ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{item}</button>)}</div></>}{loading ? <Loading /> : invoices.length === 0 ? <Empty /> : visible.length === 0 ? <p className="rounded-lg bg-gray-50 p-6 text-center text-gray-500">No invoices match your filters.</p> : <div className="divide-y rounded-xl border">{visible.map((invoice) => <button type="button" key={invoice.id} onClick={() => open(invoice.id)} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-gray-50"><div><p className="font-bold">{invoice.title}</p><p className="mt-1 text-xs text-gray-500">{invoice.createdByName} · {new Date(invoice.createdAt).toLocaleDateString()}</p></div><div className="text-right"><p className="font-bold">{money(invoice.totalAmount)}</p><Status value={invoice.status} /></div></button>)}</div>}</>}
  </Modal></SchoolTierContext.Provider>;
}

function InvoiceForm({ clubId, invoice, onCancel, onSaved }) {
  const [form, setForm] = useState({ title: invoice?.title || '', notes: invoice?.notes || '', paymentRequired: invoice?.paymentRequired ?? true, payeeName: invoice?.payeeName || '', payeeEmail: invoice?.payeeEmail || '' });
  const [items, setItems] = useState(invoice?.lineItems?.map((item) => ({ description: item.description, quantity: String(item.quantity), unitPrice: String(item.unitPrice) })) || [{ description: '', quantity: '1', unitPrice: '' }]);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const isPremium = React.useContext(SchoolTierContext) === 'PREMIUM';
  const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const updateItem = (index, field, value) => setItems((values) => values.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));

  const scan = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (file.size > 7_500_000) return setError('Choose a receipt image smaller than 7.5 MB.');
    if (!window.confirm('Share this receipt with OpenAI to extract invoice details? OpenAI may retain API request data for up to 30 days for abuse monitoring. The image is not saved as an invoice attachment.')) return;
    setScanning(true); setError('');
    try {
      const dataUrl = await readFile(file);
      const result = await invoicesService.scanReceipt(clubId, dataUrl.split(',')[1]);
      setForm((value) => ({ ...value, title: value.title || result.suggestedTitle || '', payeeName: value.payeeName || result.suggestedPayeeName || '' }));
      if (result.lineItems?.length) setItems((values) => [...values.filter((item) => item.description.trim() || Number(item.unitPrice) > 0), ...result.lineItems.map((item) => ({ description: item.description, quantity: String(item.quantity), unitPrice: String(item.unitPrice) }))]);
      else setError('No line items were found. You can enter them manually.');
    } catch (requestError) { setError(getErrorMessage(requestError, 'Failed to scan receipt.')); }
    finally { setScanning(false); }
  };

  const submit = async (event) => {
    event.preventDefault();
    const lineItems = items.filter((item) => item.description.trim()).map((item) => ({ description: item.description.trim(), quantity: Number.parseInt(item.quantity, 10) || 1, unitPrice: Number.parseFloat(item.unitPrice) || 0 }));
    if (!form.title.trim() || !lineItems.length || lineItems.some((item) => item.unitPrice <= 0)) return setError('A title and at least one positively priced line item are required.');
    setSaving(true); setError('');
    const payload = { title: form.title.trim(), notes: form.notes.trim() || null, paymentRequired: form.paymentRequired, payeeName: form.payeeName.trim() || null, payeeEmail: form.payeeEmail.trim() || null, lineItems };
    try { if (invoice) await invoicesService.update(clubId, invoice.id, payload); else await invoicesService.create(clubId, payload); onSaved(); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to save invoice.')); }
    finally { setSaving(false); }
  };

  return <form onSubmit={submit} className="space-y-4"><Back onClick={onCancel} /><input ref={fileRef} type="file" accept="image/*" onChange={scan} className="hidden" /><button type="button" disabled={scanning || !isPremium} onClick={() => fileRef.current?.click()} className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-medium ${isPremium ? 'border-indigo-300 text-indigo-700' : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'}`}>{isPremium ? <Camera className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> : <Lock className="h-4 w-4" strokeWidth={2} aria-hidden="true" />} {scanning ? 'Scanning…' : 'Scan Receipt · Premium'}</button>{isPremium ? <p className="text-xs text-gray-500">Receipt scanning sends the selected image to OpenAI only after you confirm. See the <a href="/privacy" target="_blank" className="underline">Privacy Policy</a>.</p> : <p className="rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-900">AI receipt scanning comes with Premium. Enter invoice details manually, or ask an application administrator about Premium for this school.</p>}<input value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="Invoice title" className="w-full rounded-lg border px-4 py-3" /><textarea rows={3} value={form.notes} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} placeholder="Notes (optional)" className="w-full rounded-lg border px-4 py-3" /><label className="flex items-center gap-2"><input type="checkbox" checked={form.paymentRequired} onChange={(event) => setForm((value) => ({ ...value, paymentRequired: event.target.checked }))} /> Payment required</label><div className="grid gap-3 sm:grid-cols-2"><input value={form.payeeName} onChange={(event) => setForm((value) => ({ ...value, payeeName: event.target.value }))} placeholder="Payee name" className="rounded-lg border px-4 py-3" /><input type="email" value={form.payeeEmail} onChange={(event) => setForm((value) => ({ ...value, payeeEmail: event.target.value }))} placeholder="Payee email" className="rounded-lg border px-4 py-3" /></div><div className="flex items-center justify-between"><h3 className="font-bold">Line Items</h3><button type="button" onClick={() => setItems((values) => [...values, { description: '', quantity: '1', unitPrice: '' }])} className="text-sm font-semibold text-indigo-700">+ Add</button></div>{items.map((item, index) => <div key={index} className="grid gap-2 rounded-xl bg-gray-50 p-3 sm:grid-cols-[1fr_90px_130px_auto]"><input value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} placeholder="Description" className="rounded-lg border px-3 py-2" /><input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} placeholder="Qty" className="rounded-lg border px-3 py-2" /><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, 'unitPrice', event.target.value)} placeholder="Unit price" className="rounded-lg border px-3 py-2" />{items.length > 1 && <button type="button" onClick={() => setItems((values) => values.filter((_, itemIndex) => itemIndex !== index))} className="text-sm font-semibold text-red-700">Remove</button>}</div>)}<div className="flex justify-between rounded-xl bg-indigo-50 p-4 font-bold"><span>Estimated Total</span><span>{money(total)}</span></div>{error && <p className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="px-4 py-2 font-semibold">Cancel</button><button disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white">{saving ? 'Saving…' : 'Save Draft'}</button></div></form>;
}

function readFile(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
function Back({ onClick }) { return <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700"><ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> Back</button>; }
function Loading() { return <p className="py-10 text-center text-gray-500">Loading…</p>; }
function Empty() { return <p className="rounded-xl bg-gray-50 p-10 text-center text-gray-500">No invoices yet.</p>; }
function Status({ value }) { const colors = { DRAFT: 'bg-gray-100 text-gray-700', SUBMITTED: 'bg-amber-100 text-amber-700', APPROVED: 'bg-blue-100 text-blue-700', PAID: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700' }; return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${colors[value] || colors.DRAFT}`}>{value}</span>; }
function Notice({ title, text }) { return <div className="mt-4 rounded-xl bg-red-50 p-4"><p className="text-xs font-bold uppercase text-red-700">{title}</p><p className="mt-1 text-sm text-red-900">{text}</p></div>; }
