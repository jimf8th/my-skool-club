import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const linkedinUrl = 'https://www.linkedin.com/in/jim-faith-edward-5b15a242a/';
const githubUrl = 'https://github.com/jimf8th/my-skool-club';

export default function About() {
  useEffect(() => { document.title = 'About | My Skool Club'; }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3 font-black text-white">
            <img src="/msc.png" alt="" className="h-10 w-10 rounded-xl bg-white/10 object-contain p-1" />
            My Skool Club
          </Link>
          <Link to="/" className="text-sm font-medium text-indigo-200 hover:text-white inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> Return home</Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-5 py-14 sm:px-8 lg:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-300">About the app</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">Built for stronger school communities.</h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              My Skool Club brings school memberships, clubs, events, announcements, invoices, and inventory into one organized place. It is designed to help students and school communities participate, communicate, and manage their work more easily.
            </p>

            <div className="mt-9 rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-indigo-300">Created by</p>
              <h2 className="mt-2 text-2xl font-bold">Jim Edward</h2>
              <p className="mt-1 text-slate-300">High School Student · Arizona</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href="mailto:jim.edward@myskoolclub.com" className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-indigo-50">Email Jim</a>
                <a href={linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300/40 px-4 py-2.5 text-sm font-bold text-indigo-100 hover:bg-white/10">LinkedIn <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden="true" /></a>
              </div>
              <a href="mailto:jim.edward@myskoolclub.com" className="mt-4 block break-all text-sm text-indigo-200 underline decoration-indigo-400/60 underline-offset-4">jim.edward@myskoolclub.com</a>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-indigo-950/50">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
            <div className="grid items-center gap-7 rounded-3xl border border-indigo-300/15 bg-indigo-500/10 p-7 sm:p-9 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-300">Open source</p>
                <h2 className="mt-3 text-3xl font-bold">Contributions are welcome.</h2>
                <p className="mt-3 max-w-3xl leading-7 text-slate-300">My Skool Club is open source. Developers, designers, students, educators, and community members are invited to review the work, report issues, and contribute improvements.</p>
              </div>
              <a href={githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-500 px-6 py-3 font-bold text-white shadow-lg shadow-indigo-950/30 hover:bg-indigo-400">View on GitHub <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-5 py-8 text-center text-sm text-slate-400">
        <Link to="/privacy" className="hover:text-white">Privacy</Link>
        <span className="mx-3">·</span>
        <Link to="/terms" className="hover:text-white">Terms</Link>
        <span className="mx-3">·</span>
        <Link to="/support" className="hover:text-white">Support</Link>
      </footer>
    </div>
  );
}
