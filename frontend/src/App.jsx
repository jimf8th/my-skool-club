import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Home from './pages/Home';
import Schools from './pages/Schools';
import Clubs from './pages/Clubs';
import Profile from './pages/Profile';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CommunityStandards from './pages/CommunityStandards';
import Support from './pages/Support';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Moderation from './pages/Moderation';
import Layout from './components/Layout';
import PublicHome from './pages/PublicHome';
import Events from './pages/Events';
import Announcements from './pages/Announcements';
import AcceptInvite from './pages/AcceptInvite';
import RequestSchool from './pages/RequestSchool';
import SchoolRequests from './pages/SchoolRequests';
import About from './pages/About';

function RootRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (isAuthenticated) return <Layout />;
  if (location.pathname === '/') return <PublicHome />;
  return <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

function AppAdminRoute({ children }) {
  const { isAppAdmin, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return isAppAdmin ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/community-standards" element={<CommunityStandards />} />
          <Route path="/support" element={<Support />} />
          <Route path="/about" element={<About />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/request-school" element={<RequestSchool />} />
          <Route
            path="/"
            element={<RootRoute />}
          >
            <Route index element={<Home />} />
            <Route path="schools" element={<Schools />} />
            <Route path="clubs" element={<Clubs />} />
            <Route path="events" element={<Events />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="profile" element={<Profile />} />
            <Route
              path="moderation"
              element={
                <AppAdminRoute>
                  <Moderation />
                </AppAdminRoute>
              }
            />
            <Route path="school-requests" element={<AppAdminRoute><SchoolRequests /></AppAdminRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
