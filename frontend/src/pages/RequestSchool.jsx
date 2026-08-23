import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { schoolRequestsService } from '../services/api';
import { getErrorMessage } from '../utils/errors';

const initialForm = {
  firstName: '', lastName: '', contactPhone: '', adminEmail: '',
  schoolName: '', description: '', address: '', city: '', state: '',
  postalCode: '', website: '', schoolPhone: '',
};

export default function RequestSchool() {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const change = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      await schoolRequestsService.submit(Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value.trim()])
      ));
      setSubmitted(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not submit the school request.'));
    } finally { setSaving(false); }
  };

  if (submitted) return <PublicShell>
    <div role="status" className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
      <div className="text-4xl">✓</div>
      <h1 className="mt-3 text-2xl font-black text-green-900">Request submitted</h1>
      <p className="mt-3 text-green-800">An application administrator must review and approve your request before the school is created and becomes active. We will email {form.adminEmail} after a decision.</p>
      <Link to="/" className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white">Return home</Link>
    </div>
  </PublicShell>;

  return <PublicShell>
    <div className="mb-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">School onboarding</p>
      <h1 className="mt-2 text-3xl font-black text-gray-900">Request your school</h1>
      <p className="mt-3 text-gray-600">Submit the administrator and school information below. An application administrator must approve the request before the school is created or becomes active.</p>
    </div>
    <form onSubmit={submit} className="space-y-8">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="col-span-full mb-1 text-lg font-bold">Proposed school administrator</legend>
        <Field label="First name" name="firstName" value={form.firstName} onChange={change} autoComplete="given-name" />
        <Field label="Last name" name="lastName" value={form.lastName} onChange={change} autoComplete="family-name" />
        <Field label="Contact phone number" name="contactPhone" value={form.contactPhone} onChange={change} type="tel" autoComplete="tel" />
        <Field label="Administrator email" name="adminEmail" value={form.adminEmail} onChange={change} type="email" autoComplete="email" />
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="col-span-full mb-1 text-lg font-bold">School details</legend>
        <Field label="School name" name="schoolName" value={form.schoolName} onChange={change} className="sm:col-span-2" />
        <label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold">School description</span><textarea required maxLength={4000} rows={4} name="description" value={form.description} onChange={change} className="w-full rounded-xl border px-4 py-3" /></label>
        <Field label="Street address" name="address" value={form.address} onChange={change} className="sm:col-span-2" autoComplete="street-address" />
        <Field label="City" name="city" value={form.city} onChange={change} autoComplete="address-level2" />
        <Field label="State or region" name="state" value={form.state} onChange={change} autoComplete="address-level1" />
        <Field label="ZIP or postal code" name="postalCode" value={form.postalCode} onChange={change} autoComplete="postal-code" />
        <Field label="Main school phone" name="schoolPhone" value={form.schoolPhone} onChange={change} type="tel" />
        <Field label="School website" name="website" value={form.website} onChange={change} type="url" placeholder="https://school.example" className="sm:col-span-2" />
      </fieldset>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3"><Link to="/" className="font-semibold text-gray-600">← Cancel</Link><button disabled={saving} className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white disabled:opacity-50">{saving ? 'Submitting…' : 'Submit for approval'}</button></div>
    </form>
  </PublicShell>;
}

function Field({ label, className = '', ...props }) {
  return <label className={className}><span className="mb-1 block text-sm font-semibold">{label}</span><input required maxLength={props.name?.includes('Phone') || props.name === 'contactPhone' ? 40 : 500} {...props} className="w-full rounded-xl border px-4 py-3" /></label>;
}

function PublicShell({ children }) {
  return <div className="min-h-screen bg-slate-50 px-4 py-10"><div className="mx-auto max-w-3xl"><Link to="/" className="mb-6 inline-flex items-center gap-2 text-lg font-black text-indigo-700"><img src="/msc.png" alt="" className="h-10 w-10 object-contain" />My Skool Club</Link><main className="rounded-3xl border bg-white p-6 shadow-sm sm:p-10">{children}</main></div></div>;
}
