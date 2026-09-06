import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Support() {
  useEffect(() => { document.title = 'Support | My Skool Club'; }, []);
  return <div className="min-h-screen bg-slate-50 text-slate-800">
    <header className="border-b bg-white"><div className="mx-auto max-w-3xl px-5 py-4"><Link to="/" className="font-bold text-blue-700">My Skool Club</Link></div></header>
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold text-slate-950">Help & Support</h1>
      <p className="mt-3 leading-7 text-slate-600">For account help, technical problems, privacy requests, or content-moderation questions, email us. Include the email on your account and a short description, but never send your password or verification code.</p>
      <a href="mailto:support@myskoolclub.com?subject=My%20Skool%20Club%20Support" className="mt-7 inline-flex rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white">Email support@myskoolclub.com</a>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Link to="/privacy" className="rounded-xl border bg-white p-4 font-semibold text-blue-700">Privacy Policy</Link>
        <Link to="/terms" className="rounded-xl border bg-white p-4 font-semibold text-blue-700">Terms of Service</Link>
        <Link to="/community-standards" className="rounded-xl border bg-white p-4 font-semibold text-blue-700">Community Standards</Link>
      </div>
      <p className="mt-10 text-sm text-slate-500">We aim to review safety and abuse reports promptly. If anyone is in immediate danger, contact local emergency services.</p>
    </main>
  </div>;
}
