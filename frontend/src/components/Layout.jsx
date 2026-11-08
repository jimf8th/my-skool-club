import React, { useState } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, School, Users, Calendar, Inbox, ShieldAlert, UserCog, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAppAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Home', icon: HomeIcon },
    { to: '/schools', label: 'Schools', icon: School },
    { to: '/clubs', label: 'Clubs', icon: Users },
    { to: '/events', label: 'Events', icon: Calendar },
    ...(isAppAdmin
      ? [
        { to: '/school-requests', label: 'School Requests', icon: Inbox },
        { to: '/moderation', label: 'Moderation', icon: ShieldAlert },
        { to: '/accounts', label: 'Accounts', icon: UserCog },
      ]
      : []),
    { to: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              to="/"
              className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-blue-600"
              aria-label="My Skool Club home"
            >
              <img
                src="/msc.png"
                alt=""
                className="h-11 w-11 object-contain"
              />
              <span>My Skool Club</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
              {navLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <link.icon className="mr-2 h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
                  {link.label}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="ml-2 flex items-center px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="mr-2 h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
                Log Out
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? (
                <X className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <nav className="px-2 pt-2 pb-3 space-y-1">
              {navLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-base font-medium ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <link.icon className="mr-2 h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
                  {link.label}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="flex w-full items-center px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="mr-2 h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
                Log Out
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex justify-around items-center h-16">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`
              }
            >
              <link.icon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
              <span className="text-xs mt-1">{link.label}</span>
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center flex-1 h-full text-red-500"
          >
            <LogOut className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
            <span className="text-xs mt-1">Log Out</span>
          </button>
        </div>
      </nav>

      {/* Bottom padding to prevent content from being hidden behind mobile nav */}
      <div className="md:hidden h-16"></div>
    </div>
  );
}
