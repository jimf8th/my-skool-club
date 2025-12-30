import './App.css'
import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import Home from './components/Home'
import SchoolsManagement from './components/SchoolsManagement'
import ClubsManagement from './components/ClubsManagement'
import InvoicesManagement from './components/InvoicesManagement'
import CheckoutsManagement from './components/CheckoutsManagement'
import MemberSignup from './components/MemberSignup'
import MemberLogin from './components/MemberLogin'
import MemberDashboard from './components/MemberDashboard'
import Members from './components/Members'
import Announcements from './components/Announcements'
import ClubMembersManagement from './components/ClubMembersManagement'
import Profile from './components/Profile'
import Contact from './components/Contact'
import Footer from './components/Footer'
import PrivacyPolicy from './components/PrivacyPolicy'
import TermsOfService from './components/TermsOfService'
import apiService from './services/apiService'

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentMember, setCurrentMember] = useState(null);
  const [hasClubRoles, setHasClubRoles] = useState(false);
  const [isClubAdmin, setIsClubAdmin] = useState(false);

  // Fetch club roles for the current member
  const fetchMemberClubRoles = async () => {
    try {
      const response = await apiService.getMemberClubRoles();
      if (response.success && response.data.success) {
        const clubRoles = response.data.data || [];
        const hasRoles = response.data.hasClubRoles || false;
        const hasAdminRole = clubRoles.some(role => role.clubRole === 'CLUB_ADMIN' && role.active);
        
        setHasClubRoles(hasRoles);
        setIsClubAdmin(hasAdminRole);
        
        // Store club roles in localStorage for persistence
        localStorage.setItem('memberClubRoles', JSON.stringify({
          hasClubRoles: hasRoles,
          isClubAdmin: hasAdminRole,
          clubRoles: clubRoles
        }));
      } else {
        setHasClubRoles(false);
        setIsClubAdmin(false);
        localStorage.removeItem('memberClubRoles');
      }
    } catch (error) {
      console.error('Error fetching club roles:', error);
      setHasClubRoles(false);
      setIsClubAdmin(false);
      localStorage.removeItem('memberClubRoles');
    }
  };

  // Check for logged-in member on component mount and location changes
  useEffect(() => {
    const memberData = localStorage.getItem('currentMember');
    if (memberData) {
      try {
        const member = JSON.parse(memberData);
        setCurrentMember(member);
        
        // Skip fetching club roles for APP_ADMIN (they don't have club-level access)
        if (member.role === 'APP_ADMIN') {
          setHasClubRoles(false);
          setIsClubAdmin(false);
          localStorage.removeItem('memberClubRoles');
          return;
        }
        
        // Check for existing club roles data in localStorage
        const clubRolesData = localStorage.getItem('memberClubRoles');
        if (clubRolesData) {
          try {
            const parsedRoles = JSON.parse(clubRolesData);
            setHasClubRoles(parsedRoles.hasClubRoles || false);
            setIsClubAdmin(parsedRoles.isClubAdmin || false);
          } catch (error) {
            console.error('Error parsing club roles data:', error);
            localStorage.removeItem('memberClubRoles');
          }
        }
        
        // Fetch fresh club roles data
        fetchMemberClubRoles();
      } catch (error) {
        console.error('Error parsing member data:', error);
        localStorage.removeItem('currentMember');
        localStorage.removeItem('authToken');
        localStorage.removeItem('memberClubRoles');
      }
    } else {
      setCurrentMember(null);
      setHasClubRoles(false);
      localStorage.removeItem('memberClubRoles');
    }
  }, [location.pathname]);

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentMember');
    localStorage.removeItem('memberClubRoles');
    setCurrentMember(null);
    setHasClubRoles(false);
    setIsClubAdmin(false);
    
    // Redirect to home
    navigate('/');
  };
  
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          <i className="fas fa-graduation-cap me-2"></i>
          MySkoolClub
        </Link>
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            {/* Show Home link only when NOT logged in */}
            {!currentMember && (
              <li className="nav-item">
                <Link 
                  className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} 
                  to="/"
                >
                  Home
                </Link>
              </li>
            )}
            
            {/* Show these options only when NOT logged in */}
            {!currentMember && (
              <>
                <li className="nav-item">
                  <Link 
                    className={`nav-link ${location.pathname === '/member-signup' ? 'active' : ''}`} 
                    to="/member-signup"
                  >
                    <i className="fas fa-user-plus me-1"></i>
                    Member Signup
                  </Link>
                </li>
                <li className="nav-item">
                  <Link 
                    className={`nav-link ${location.pathname === '/member-login' ? 'active' : ''}`} 
                    to="/member-login"
                  >
                    <i className="fas fa-sign-in-alt me-1"></i>
                    Member Login
                  </Link>
                </li>
              </>
            )}

            {/* Show these options only when logged in */}
            {currentMember && (
              <>
                <li className="nav-item">
                  <Link 
                    className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`} 
                    to="/dashboard"
                  >
                    <i className="fas fa-tachometer-alt me-1"></i>
                    Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link 
                    className={`nav-link ${location.pathname === '/announcements' ? 'active' : ''}`} 
                    to="/announcements"
                  >
                    <i className="fas fa-bell me-1"></i>
                    Announcements
                  </Link>
                </li>
                
                {/* Members - only visible to SCHOOL_ADMIN and APP_ADMIN */}
                {(currentMember.role === 'SCHOOL_ADMIN' || currentMember.role === 'APP_ADMIN') && (
                  <li className="nav-item">
                    <Link 
                      className={`nav-link ${location.pathname === '/members' ? 'active' : ''}`} 
                      to="/members"
                    >
                      <i className="fas fa-users me-1"></i>
                      Members
                    </Link>
                  </li>
                )}
                
                {/* Schools - only visible to SCHOOL_ADMIN and APP_ADMIN */}
                {(currentMember.role === 'SCHOOL_ADMIN' || currentMember.role === 'APP_ADMIN') && (
                  <li className="nav-item">
                    <Link 
                      className={`nav-link ${location.pathname === '/schools' ? 'active' : ''}`} 
                      to="/schools"
                    >
                      <i className="fas fa-school me-1"></i>
                      Schools
                    </Link>
                  </li>
                )}
                {/* Clubs - visible to SCHOOL_ADMIN or members with club roles (NOT APP_ADMIN) */}
                {(currentMember.role === 'SCHOOL_ADMIN' || (currentMember.role !== 'APP_ADMIN' && hasClubRoles)) && (
                  <li className="nav-item">
                    <Link 
                      className={`nav-link ${location.pathname === '/clubs' ? 'active' : ''}`} 
                      to="/clubs"
                    >
                      <i className="fas fa-users me-1"></i>
                      Clubs
                    </Link>
                  </li>
                )}
                
                {/* Club Members - visible only to CLUB_ADMIN */}
                {isClubAdmin && (
                  <li className="nav-item">
                    <Link 
                      className={`nav-link ${location.pathname === '/club-members' ? 'active' : ''}`} 
                      to="/club-members"
                    >
                      <i className="fas fa-users-cog me-1"></i>
                      Club Members
                    </Link>
                  </li>
                )}
                
                {/* Invoices and Checkouts - visible to members with club roles (NOT APP_ADMIN) */}
                {(currentMember.role !== 'APP_ADMIN' && hasClubRoles) && (
                  <>
                    <li className="nav-item">
                      <Link 
                        className={`nav-link ${location.pathname === '/invoices' ? 'active' : ''}`} 
                        to="/invoices"
                      >
                        <i className="fas fa-file-invoice-dollar me-1"></i>
                        Invoices
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link 
                        className={`nav-link ${location.pathname === '/checkouts' ? 'active' : ''}`} 
                        to="/checkouts"
                      >
                        <i className="fas fa-clipboard-check me-1"></i>
                        Checkouts
                      </Link>
                    </li>
                  </>
                )}
                <li className="nav-item dropdown">
                  <a 
                    className="nav-link dropdown-toggle" 
                    href="#" 
                    id="navbarDropdown" 
                    role="button" 
                    data-bs-toggle="dropdown"
                  >
                    {currentMember.role === 'APP_ADMIN' ? (
                      <>
                        <i className="fas fa-user-shield me-1 text-danger"></i>
                        {currentMember.firstName}
                      </>
                    ) : currentMember.role === 'SCHOOL_ADMIN' ? (
                      <>
                        <i className="fas fa-crown me-1 text-warning"></i>
                        {currentMember.firstName}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-user-circle me-1"></i>
                        {currentMember.firstName}
                      </>
                    )}
                  </a>
                  <ul className="dropdown-menu">
                    <li>
                      <Link className="dropdown-item" to="/profile">
                        <i className="fas fa-user me-2"></i>
                        Profile
                      </Link>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button 
                        className="dropdown-item" 
                        onClick={handleLogout}
                      >
                        <i className="fas fa-sign-out-alt me-2"></i>
                        Logout
                      </button>
                    </li>
                  </ul>
                </li>
              </>
            )}

            {/* Always show Contact */}
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`} 
                to="/contact"
              >
                Contact
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

// Protected route component that restricts APP_ADMIN access to certain pages
function ProtectedRoute({ children, restrictedForAppAdmin = false }) {
  const currentMember = localStorage.getItem('currentMember');
  
  if (restrictedForAppAdmin && currentMember) {
    try {
      const member = JSON.parse(currentMember);
      if (member.role === 'APP_ADMIN') {
        // Redirect APP_ADMIN users to schools page instead
        window.location.href = '/schools';
        return null;
      }
    } catch (error) {
      console.error('Error parsing member data:', error);
    }
  }
  
  return children;
}

function App() {
  return (
    <Router>
      <div className="d-flex flex-column min-vh-100">
        <Navigation />
        
        <main className="flex-grow-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/schools" element={<SchoolsManagement />} />
            <Route path="/clubs" element={
              <ProtectedRoute restrictedForAppAdmin={true}>
                <ClubsManagement />
              </ProtectedRoute>
            } />
            <Route path="/club-members" element={
              <ProtectedRoute restrictedForAppAdmin={true}>
                <ClubMembersManagement />
              </ProtectedRoute>
            } />
            <Route path="/invoices" element={
              <ProtectedRoute restrictedForAppAdmin={true}>
                <InvoicesManagement />
              </ProtectedRoute>
            } />
            <Route path="/checkouts" element={
              <ProtectedRoute restrictedForAppAdmin={true}>
                <CheckoutsManagement />
              </ProtectedRoute>
            } />
            <Route path="/member-signup" element={<MemberSignup />} />
            <Route path="/member-login" element={<MemberLogin />} />
            <Route path="/dashboard" element={<MemberDashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/members" element={<Members />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App
