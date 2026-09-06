import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, School, GraduationCap, Users, Megaphone, Calendar, ShieldAlert, Inbox, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMySchool } from '../hooks/useMySchool';

export default function Home() {
  const { user, isAppAdmin } = useAuth();

  if (isAppAdmin) return <AdminHome user={user} />;
  return <UserHome user={user} />;
}

/* ─── Admin Dashboard ──────────────────────────────────────────────── */

function AdminHome({ user }) {
  return (
    <div className="space-y-6">
      {/* Admin Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              App Administrator
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-indigo-200 mt-1 text-sm sm:text-base">
              You have full administrative access to My Skool Club.
            </p>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Admin Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AdminActionCard
            icon={School}
            title="Manage Schools"
            description="Add, edit, or remove schools from the platform"
            href="/schools"
            color="from-blue-500 to-blue-600"
          />
          <AdminActionCard
            icon={GraduationCap}
            title="Manage Clubs"
            description="Create and oversee student clubs across schools"
            href="/clubs"
            color="from-purple-500 to-purple-600"
          />
          <AdminActionCard
            icon={Users}
            title="Manage Members"
            description="View all members, roles, and membership status"
            href="/schools"
            color="from-green-500 to-green-600"
          />
          <AdminActionCard
            icon={Megaphone}
            title="Announcements"
            description="Post updates for a school"
            href="/announcements"
            color="from-orange-500 to-orange-600"
          />
          <AdminActionCard
            icon={Calendar}
            title="Events"
            description="Review and create school events"
            href="/events"
            color="from-teal-500 to-teal-600"
          />
          <AdminActionCard
            icon={ShieldAlert}
            title="Content Moderation"
            description="Review safety and abuse reports"
            href="/moderation"
            color="from-gray-500 to-gray-600"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Activity</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          <ActivityPlaceholder />
        </div>
      </div>
    </div>
  );
}

function AdminActionCard({ icon: Icon, title, description, href, color }) {
  return (
    <Link
      to={href}
      className="group flex items-start gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all"
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
        <Icon className="h-5 w-5 text-white" strokeWidth={2} aria-hidden="true" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ChevronRight className="ml-auto h-5 w-5 self-center text-gray-300 transition-colors group-hover:text-indigo-400" strokeWidth={2} aria-hidden="true" />
    </Link>
  );
}

/* ─── Regular User Dashboard ───────────────────────────────────────── */

function UserHome({ user }) {
  const { school, loading } = useMySchool(user);
  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {user?.firstName ? `Welcome back, ${user.firstName}!` : 'Welcome to My Skool Club!'}
        </h1>
        <p className="text-gray-500 text-sm sm:text-base">
          Connect with your school community, join clubs, and stay updated with announcements.
        </p>
      </div>

      {!loading && school && (
        <div className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100"><School className="h-5 w-5 text-indigo-600" strokeWidth={2} aria-hidden="true" /></div>
          <div className="flex-1"><p className="text-xs font-bold uppercase tracking-wide text-gray-400">Your School</p><p className="font-bold text-gray-900">{school.name}</p></div>{school.isAdmin && <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">Admin</span>}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionCard icon={School} title="Browse Schools" description="Find and connect with your school" href="/schools" color="bg-blue-50" accent="text-blue-600" />
          <ActionCard icon={Users} title="Join Clubs" description="Discover and join student clubs" href="/clubs" color="bg-purple-50" accent="text-purple-600" />
          <ActionCard icon={Megaphone} title="Announcements" description="Stay updated with latest news" href="/announcements" color="bg-green-50" accent="text-green-600" />
          <ActionCard icon={Calendar} title="Events" description="Check out upcoming events" href="/events" color="bg-red-50" accent="text-red-600" />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Activity</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ActivityPlaceholder />
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, description, href, color, accent }) {
  return (
    <Link to={href} className={`${color} rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer block`}>
      <div className={`mb-2 ${accent}`}><Icon className="h-7 w-7" strokeWidth={2} aria-hidden="true" /></div>
      <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{title}</h3>
      <p className="text-gray-500 text-xs leading-snug">{description}</p>
    </Link>
  );
}

function ActivityPlaceholder() {
  return (
    <div className="p-8 text-center">
      <Inbox className="mx-auto mb-2 h-8 w-8 text-gray-300" strokeWidth={2} aria-hidden="true" />
      <p className="text-gray-400 text-sm">No recent activity yet. Start exploring!</p>
    </div>
  );
}
