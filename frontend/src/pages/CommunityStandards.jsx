import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CommunityStandards() {
  useEffect(() => { document.title = 'Community Standards | My Skool Club'; }, []);
  return <LegalPage title="Community Standards" updated="August 8, 2026">
    <p>My Skool Club is for constructive school and club coordination. These standards apply to names, descriptions, announcements, events, and any other content submitted to the service.</p>
    <Section title="Be respectful and safe">
      <p>Do not harass, bully, threaten, shame, stalk, or encourage harm toward yourself or another person. Hate speech or discrimination based on protected or personal characteristics is prohibited.</p>
    </Section>
    <Section title="Protect minors and personal information">
      <p>Sexual or exploitative content involving minors is never permitted. Do not share private addresses, phone numbers, credentials, financial details, or other identifying information without authorization.</p>
    </Section>
    <Section title="Keep content lawful and authentic">
      <p>Do not post illegal content, graphic violence, explicit sexual content, scams, spam, impersonation, malicious links, or false organizational or financial records.</p>
    </Section>
    <Section title="Reporting and enforcement">
      <p>Use the Report option next to content that may violate these standards. Reports are sent to My Skool Club app administrators. They may dismiss a report, remove or disable content, restrict an account, or contact relevant authorities when required for safety or law. Repeated false reports may also result in restrictions.</p>
      <p className="mt-3">For urgent safety concerns, contact local emergency services. For moderation questions, email <a className="font-semibold text-blue-700 underline" href="mailto:support@myskoolclub.com">support@myskoolclub.com</a>.</p>
    </Section>
  </LegalPage>;
}

function LegalPage({ title, updated, children }) {
  return <div className="min-h-screen bg-slate-50 text-slate-800">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4"><Link to="/" className="font-bold text-blue-700">My Skool Club</Link><Link to="/support" className="text-sm font-semibold text-blue-700">Support</Link></div></header>
    <main className="mx-auto max-w-4xl px-5 py-10"><article className="rounded-2xl border bg-white p-6 shadow-sm sm:p-10"><h1 className="text-3xl font-bold text-slate-950">{title}</h1><p className="mt-2 text-sm text-slate-500">Last updated: {updated}</p><div className="mt-8 space-y-8 leading-7">{children}</div></article></main>
  </div>;
}

function Section({ title, children }) { return <section><h2 className="mb-2 text-xl font-bold text-slate-950">{title}</h2>{children}</section>; }
