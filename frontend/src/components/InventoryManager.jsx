import React, { useCallback, useEffect, useState } from 'react';
import Modal from './Modal';
import { inventoryService } from '../services/api';
import { getErrorMessage } from '../utils/errors';

const statuses = ['ALL', 'CHECKED_IN', 'CHECKED_OUT', 'OVERDUE'];

export default function InventoryManager({ clubId, currentUser, canCheckout, canManage, onClose }) {
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await inventoryService.list(clubId)); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to load inventory.')); }
    finally { setLoading(false); }
  }, [clubId]);
  useEffect(() => { load(); }, [load]);

  const open = async (itemId) => {
    setLoading(true); setView('detail'); setError('');
    try { setActive(await inventoryService.get(clubId, itemId)); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to load item.')); }
    finally { setLoading(false); }
  };

  const refreshActive = async () => { setActive(await inventoryService.get(clubId, active.id)); await load(); setView('detail'); };

  const checkIn = async () => {
    if (!window.confirm(`Check "${active.name}" back in?`)) return;
    setLoading(true);
    try { await inventoryService.checkIn(clubId, active.id, null); await refreshActive(); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to check item in.')); setLoading(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${active.name}" from inventory?`)) return;
    try { await inventoryService.remove(clubId, active.id); setActive(null); setView('list'); await load(); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to delete item.')); }
  };

  const visible = items.filter((item) => {
    const matchesStatus = status === 'ALL' || item.status === status;
    const haystack = `${item.name} ${item.category || ''} ${item.serialNumber || ''}`.toLowerCase();
    return matchesStatus && haystack.includes(search.toLowerCase());
  });
  const title = view === 'form' ? (editing ? 'Edit Item' : 'Add Item') : view === 'checkout' ? 'Check Out' : view === 'detail' ? active?.name || 'Item' : 'Inventory';
  const isOut = active && active.status !== 'CHECKED_IN';
  const isBorrower = active?.checkedOutByUserId === currentUser?.id;

  return <Modal title={title} onClose={onClose} size="max-w-4xl">
    {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {view === 'form' ? <ItemForm clubId={clubId} item={editing} onCancel={() => setView(editing ? 'detail' : 'list')} onSaved={() => { setEditing(null); setView('list'); load(); }} /> : view === 'checkout' ? <CheckoutForm clubId={clubId} itemId={active.id} onCancel={() => setView('detail')} onSaved={refreshActive} /> : view === 'detail' ? loading || !active ? <Loading /> : <div><Back onClick={() => { setActive(null); setView('list'); }} /><div className="mt-4 flex items-start justify-between gap-4"><div><Status value={active.status} />{active.category && <p className="mt-3 text-sm">Category: {active.category}</p>}{active.serialNumber && <p className="mt-1 text-sm">Serial #: {active.serialNumber}</p>}<p className="mt-2 text-xs text-gray-500">Added by {active.createdByName} on {new Date(active.createdAt).toLocaleDateString()}</p></div></div>{active.description && <div className="mt-4 rounded-xl bg-gray-50 p-4"><p className="text-xs font-bold uppercase text-gray-500">Description</p><p className="mt-2 whitespace-pre-wrap text-sm">{active.description}</p></div>}{isOut && <div className={`mt-4 rounded-xl p-4 ${active.status === 'OVERDUE' ? 'bg-red-50 text-red-900' : 'bg-amber-50'}`}><p className="font-bold">{active.status === 'OVERDUE' ? 'Overdue checkout' : 'Current checkout'}</p><p className="mt-1 text-sm">Checked out by {active.checkedOutByName}{isBorrower ? ' (you)' : ''} on {new Date(active.checkedOutAt).toLocaleDateString()}</p>{active.dueDate && <p className="mt-1 text-sm">Due {new Date(`${active.dueDate}T00:00:00`).toLocaleDateString()}</p>}{active.checkoutNotes && <p className="mt-1 text-sm">Notes: {active.checkoutNotes}</p>}</div>}
      <h3 className="mt-6 font-bold">Checkout History</h3><div className="mt-2 divide-y rounded-xl border">{active.checkoutHistory.length === 0 ? <p className="p-4 text-sm text-gray-500">This item has never been checked out.</p> : active.checkoutHistory.map((entry) => <div key={entry.id} className="p-3 text-sm"><p className="font-semibold">{entry.checkedOutByName} · out {new Date(entry.checkedOutAt).toLocaleDateString()}{entry.dueDate ? ` · due ${new Date(`${entry.dueDate}T00:00:00`).toLocaleDateString()}` : ''}</p><p className="text-xs text-gray-500">{entry.checkedInAt ? `Returned ${new Date(entry.checkedInAt).toLocaleDateString()}${entry.checkedInByName && entry.checkedInByUserId !== entry.checkedOutByUserId ? ` by ${entry.checkedInByName}` : ''}` : 'Still out'}</p>{entry.checkoutNotes && <p className="mt-1 text-gray-600">Out: {entry.checkoutNotes}</p>}{entry.checkinNotes && <p className="mt-1 text-gray-600">In: {entry.checkinNotes}</p>}</div>)}</div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">{canCheckout && active.status === 'CHECKED_IN' && <button type="button" onClick={() => setView('checkout')} className="rounded-lg bg-pink-600 px-4 py-2 font-semibold text-white">Check Out</button>}{isOut && (isBorrower || canManage) && <button type="button" onClick={checkIn} className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white">Check In</button>}{canManage && <button type="button" onClick={() => { setEditing(active); setView('form'); }} className="rounded-lg border px-4 py-2 font-semibold">Edit Item</button>}{canManage && active.status === 'CHECKED_IN' && <button type="button" onClick={remove} className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700">Delete Item</button>}</div>
    </div> : <><div className="mb-4 flex flex-wrap items-center justify-between gap-3">{canManage && <button type="button" onClick={() => { setEditing(null); setView('form'); }} className="rounded-lg bg-pink-600 px-4 py-2 font-semibold text-white">+ Add Item</button>}<button type="button" onClick={load} className="rounded-lg border px-4 py-2 font-semibold">Refresh</button></div>{items.length > 0 && <><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, category, or serial number" className="mb-3 w-full rounded-lg border px-4 py-3" /><div className="mb-4 flex flex-wrap gap-2">{statuses.map((item) => <button type="button" key={item} onClick={() => setStatus(item)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status === item ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{item.replace('_', ' ')}</button>)}</div></>}{loading ? <Loading /> : items.length === 0 ? <Empty /> : visible.length === 0 ? <p className="rounded-xl bg-gray-50 p-8 text-center text-gray-500">No items match your filters.</p> : <div className="divide-y rounded-xl border">{visible.map((item) => <button type="button" key={item.id} onClick={() => open(item.id)} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-gray-50"><div><p className="font-bold">{item.name}</p><p className="mt-1 text-xs text-gray-500">{[item.category, item.serialNumber].filter(Boolean).join(' · ')}</p>{item.status !== 'CHECKED_IN' && <p className={`mt-1 text-xs ${item.status === 'OVERDUE' ? 'text-red-700' : 'text-gray-500'}`}>With {item.checkedOutByName}{item.dueDate ? ` · due ${new Date(`${item.dueDate}T00:00:00`).toLocaleDateString()}` : ''}</p>}</div><Status value={item.status} /></button>)}</div>}</>}
  </Modal>;
}

function ItemForm({ clubId, item, onCancel, onSaved }) {
  const [form, setForm] = useState({ name: item?.name || '', description: item?.description || '', category: item?.category || '', serialNumber: item?.serialNumber || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); if (!form.name.trim()) return setError('Name is required.');
    setSaving(true); setError(''); const payload = { name: form.name.trim(), description: form.description.trim() || null, category: form.category.trim() || null, serialNumber: form.serialNumber.trim() || null };
    try { if (item) await inventoryService.update(clubId, item.id, payload); else await inventoryService.create(clubId, payload); onSaved(); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to save item.')); }
    finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="space-y-4"><Back onClick={onCancel} /><input value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="Item name" className="w-full rounded-lg border px-4 py-3" /><textarea rows={3} value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} placeholder="Condition, accessories, storage location…" className="w-full rounded-lg border px-4 py-3" /><div className="grid gap-3 sm:grid-cols-2"><input value={form.category} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))} placeholder="Category" className="rounded-lg border px-4 py-3" /><input value={form.serialNumber} onChange={(event) => setForm((value) => ({ ...value, serialNumber: event.target.value }))} placeholder="Serial number / asset tag" className="rounded-lg border px-4 py-3" /></div>{error && <p className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="px-4 py-2 font-semibold">Cancel</button><button disabled={saving} className="rounded-lg bg-pink-600 px-5 py-2.5 font-semibold text-white">{saving ? 'Saving…' : item ? 'Save Changes' : 'Add Item'}</button></div></form>;
}

function CheckoutForm({ clubId, itemId, onCancel, onSaved }) {
  const defaultDate = new Date(); defaultDate.setDate(defaultDate.getDate() + 7);
  const [hasDueDate, setHasDueDate] = useState(true);
  const [dueDate, setDueDate] = useState(defaultDate.toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await inventoryService.checkOut(clubId, itemId, hasDueDate ? dueDate : null, notes.trim() || null); await onSaved(); }
    catch (requestError) { setError(getErrorMessage(requestError, 'Failed to check item out.')); setSaving(false); }
  };
  return <form onSubmit={submit} className="space-y-4"><Back onClick={onCancel} /><label className="flex items-center gap-2"><input type="checkbox" checked={hasDueDate} onChange={(event) => setHasDueDate(event.target.checked)} /> Set a due date</label>{hasDueDate && <input type="date" min={new Date().toISOString().slice(0, 10)} value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="w-full rounded-lg border px-4 py-3" />}<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Checkout notes (optional)" className="w-full rounded-lg border px-4 py-3" />{error && <p className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="px-4 py-2 font-semibold">Cancel</button><button disabled={saving} className="rounded-lg bg-pink-600 px-5 py-2.5 font-semibold text-white">{saving ? 'Checking out…' : 'Check Out'}</button></div></form>;
}

function Back({ onClick }) { return <button type="button" onClick={onClick} className="text-sm font-semibold text-pink-700">← Back</button>; }
function Loading() { return <p className="py-10 text-center text-gray-500">Loading…</p>; }
function Empty() { return <p className="rounded-xl bg-gray-50 p-10 text-center text-gray-500">No inventory items yet.</p>; }
function Status({ value }) { const colors = { CHECKED_IN: 'bg-green-100 text-green-700', CHECKED_OUT: 'bg-amber-100 text-amber-700', OVERDUE: 'bg-red-100 text-red-700' }; return <span className={`rounded-full px-2 py-1 text-xs font-bold ${colors[value] || colors.CHECKED_IN}`}>{value.replace('_', ' ')}</span>; }
