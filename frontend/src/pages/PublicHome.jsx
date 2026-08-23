import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  ['👥', 'Find your people', 'Join your school, discover clubs, and turn shared interests into a real community.'],
  ['📅', 'Never miss a moment', 'See announcements, explore upcoming events, and RSVP while plans are still fresh.'],
  ['📊', 'Run clubs with clarity', 'Manage members, invoices, receipts, and inventory with permission-based tools.'],
];

export default function PublicHome() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <section className="overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-800 to-blue-600 text-white">
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3 text-lg font-bold">
              <img src="/msc.png" alt="" className="h-11 w-11 rounded-xl bg-white/10 object-contain p-1" />
              My Skool Club
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-white/10">Sign In</Link>
              <Link to="/register" className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-indigo-800 shadow">Create Account</Link>
            </div>
          </header>

          <div className="grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
            <div>
              <p className="mb-4 text-xs font-bold tracking-[0.25em] text-blue-200">YOUR SCHOOL, IN SYNC</p>
              <h1 className="text-4xl font-black leading-tight sm:text-6xl">School life,<br />beautifully organized.</h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-indigo-100">One welcoming place for the people, clubs, events, and everyday details that make a school community feel alive.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="rounded-xl bg-white px-6 py-3 font-bold text-indigo-900 shadow-lg">Get Started</Link>
                <Link to="/login" className="rounded-xl border border-white/40 px-6 py-3 font-bold text-white">Sign In</Link>
                <Link to="/request-school" className="rounded-xl border border-blue-200/50 bg-blue-300/10 px-6 py-3 font-bold text-white">Request Your School</Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur">
              <p className="text-xs font-bold tracking-widest text-blue-200">THIS WEEK</p>
              <h2 className="mt-1 text-xl font-bold">Your school, at a glance</h2>
              <div className="mt-5 rounded-2xl bg-white p-4 text-slate-900">
                <p className="font-bold">Fall Club Fair</p>
                <p className="mt-1 text-sm text-slate-500">Main courtyard · 3:30 PM</p>
                <span className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">Going</span>
              </div>
              <div className="mt-3 rounded-2xl bg-white p-4 text-slate-900">
                <p className="text-xs font-bold text-violet-700">NEW ANNOUNCEMENT</p>
                <p className="mt-1 font-bold">Volunteer sign-ups are open</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-indigo-600">MORE THAN A NOTICEBOARD</p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">A calmer way to stay connected.</h2>
          <p className="mt-4 leading-7 text-slate-600">Everything your community needs is easy to find and simple to manage, so everyone can spend less time chasing updates and more time participating.</p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {features.map(([icon, title, body], index) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between"><span className="text-3xl">{icon}</span><span className="text-xs font-black text-slate-300">0{index + 1}</span></div>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </article>
          ))}
        </div>

        <section className="mt-12 rounded-3xl bg-indigo-950 p-8 text-white sm:p-12">
          <p className="text-xs font-bold tracking-[0.2em] text-indigo-300">ONE COMMUNITY. EVERY ROLE.</p>
          <h2 className="mt-3 text-3xl font-black">Simple for members. Powerful for organizers.</h2>
          <p className="mt-4 max-w-3xl leading-7 text-indigo-100">Members see what matters to them. School and club leaders get role-aware tools for memberships, events, accounting, and assets.</p>
        </section>

        <section className="mt-12 text-center">
          <h2 className="text-3xl font-black">Your community is waiting.</h2>
          <p className="mt-3 text-slate-600">Create an account, find your school, and discover where you belong.</p>
          <Link to="/register" className="mt-6 inline-flex rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white shadow">Create Account</Link>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-5 px-5 py-8 text-sm font-semibold text-slate-600">
          <Link to="/about">About</Link><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><Link to="/community-standards">Community Standards</Link><Link to="/support">Support</Link>
        </div>
        <p className="pb-8 text-center text-xs text-slate-400">Made for school communities, ages 13 and up.</p>
      </footer>
    </div>
  );
}
