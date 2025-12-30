import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

const MemberDashboard = () => {
  const [currentMember, setCurrentMember] = useState(null);
  const [availableClubs, setAvailableClubs] = useState([]);
  const [myClubs, setMyClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const memberData = localStorage.getItem('currentMember');
    if (memberData) {
      const member = JSON.parse(memberData);
      setCurrentMember(member);
      
      // Fetch clubs for SCHOOL_USER and SCHOOL_ADMIN
      if (member.role === 'SCHOOL_USER' || member.role === 'SCHOOL_ADMIN') {
        fetchSchoolClubs(member.schoolId);
        fetchMyClubs(member.id);
      }
    } else {
      // Redirect to login if not authenticated
      navigate('/member-login');
    }
  }, [navigate]);

  const fetchSchoolClubs = async (schoolId) => {
    try {
      setLoadingClubs(true);
      const response = await apiService.get(`/clubs?schoolId=${schoolId}&activeOnly=true&size=100`);
      if (response.success && response.data && response.data.data) {
        setAvailableClubs(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching school clubs:', error);
    } finally {
      setLoadingClubs(false);
    }
  };

  const fetchMyClubs = async (memberId) => {
    try {
      const response = await apiService.get(`/user-club-roles/member/${memberId}`);
      if (response.success && response.data) {
        setMyClubs(response.data);
      }
    } catch (error) {
      console.error('Error fetching my clubs:', error);
    }
  };

  const handleEnrollClub = async (clubId) => {
    try {
      const response = await apiService.post(`/clubs/${clubId}/enroll`);
      if (response.success) {
        setMessage({ type: 'success', text: 'Successfully enrolled in the club!' });
        // Refresh my clubs
        fetchMyClubs(currentMember.id);
        // Clear message after 3 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to enroll in club' });
      }
    } catch (error) {
      console.error('Error enrolling in club:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'An error occurred while enrolling' });
    }
  };

  const isEnrolled = (clubId) => {
    return Array.isArray(myClubs) && myClubs.some(clubRole => clubRole.clubId === clubId && clubRole.active);
  };

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentMember');
    
    // Trigger a page reload to refresh navbar state, then redirect to home
    window.location.href = '/';
  };

  if (!currentMember) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="text-primary">
              <i className="fas fa-tachometer-alt me-2"></i>
              Member Dashboard
            </h2>
            <button 
              className="btn btn-outline-danger"
              onClick={handleLogout}
            >
              <i className="fas fa-sign-out-alt me-1"></i>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="fas fa-user me-2"></i>
                Profile Information
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-2">
                <strong>Name:</strong> {currentMember.firstName} {currentMember.lastName}
              </div>
              <div className="mb-2">
                <strong>Email:</strong> {currentMember.email}
              </div>
              <div className="mb-2">
                <strong>Member Type:</strong> 
                <span className={`badge ms-2 ${currentMember.memberType === 'student' ? 'bg-info' : 'bg-success'}`}>
                  {currentMember.memberType}
                </span>
              </div>
              <div className="mb-2">
                <strong>School:</strong> {currentMember.schoolName}
              </div>
              {currentMember.gradeLevel && (
                <div className="mb-2">
                  <strong>Grade Level:</strong> {currentMember.gradeLevel}
                </div>
              )}
              {currentMember.createdAt && (
                <div className="mb-2">
                  <strong>Member Since:</strong> {new Date(currentMember.createdAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card mb-4">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">
                <i className="fas fa-bell me-2"></i>
                Welcome Message
              </h5>
            </div>
            <div className="card-body">
              <h4>Welcome back, {currentMember.firstName}!</h4>
              <p className="mb-3">
                You are logged in as a <strong>{currentMember.memberType}</strong> at <strong>{currentMember.schoolName}</strong>.
              </p>
              <p>
                This is your member dashboard where you can manage your profile, view announcements, 
                and access school-related features.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-header bg-secondary text-white">
              <h5 className="mb-0">
                <i className="fas fa-cogs me-2"></i>
                Quick Actions
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <button className="btn btn-outline-primary w-100" onClick={() => navigate('/profile')}>
                    <i className="fas fa-edit me-2"></i>
                    Edit Profile
                  </button>
                </div>
                <div className="col-md-6 mb-3">
                  <button className="btn btn-outline-info w-100" onClick={() => navigate('/announcements')}>
                    <i className="fas fa-eye me-2"></i>
                    View Announcements
                  </button>
                </div>
                <div className="col-md-6 mb-3">
                  <button className="btn btn-outline-success w-100" onClick={() => navigate('/members')}>
                    <i className="fas fa-users me-2"></i>
                    View Members
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Available Clubs Section - Only for SCHOOL_USER and SCHOOL_ADMIN */}
          {(currentMember.role === 'SCHOOL_USER' || currentMember.role === 'SCHOOL_ADMIN') && (
            <div className="card mt-4">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">
                  <i className="fas fa-users-cog me-2"></i>
                  Available Clubs in Your School
                </h5>
              </div>
              <div className="card-body">
                {message.text && (
                  <div className={`alert alert-${message.type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`} role="alert">
                    {message.text}
                    <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
                  </div>
                )}
                
                {loadingClubs ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading clubs...</span>
                    </div>
                    <p className="mt-2">Loading available clubs...</p>
                  </div>
                ) : availableClubs.length === 0 ? (
                  <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    No clubs available in your school at the moment.
                  </div>
                ) : (
                  <div className="row">
                    {availableClubs.map((club) => (
                      <div key={club.id} className="col-md-6 col-lg-4 mb-3">
                        <div className="card h-100 border-primary">
                          <div className="card-body d-flex flex-column">
                            <h6 className="card-title text-primary">
                              <i className="fas fa-users me-2"></i>
                              {club.name}
                            </h6>
                            {club.description && (
                              <p className="card-text small text-muted flex-grow-1">
                                {club.description.length > 100 
                                  ? `${club.description.substring(0, 100)}...` 
                                  : club.description}
                              </p>
                            )}
                            <div className="mb-2">
                              {club.category && (
                                <span className="badge bg-info me-2">{club.category}</span>
                              )}
                              {club.meetingDay && (
                                <small className="text-muted">
                                  <i className="fas fa-calendar me-1"></i>
                                  {club.meetingDay}
                                </small>
                              )}
                            </div>
                            {club.advisorName && (
                              <small className="text-muted mb-2">
                                <i className="fas fa-user-tie me-1"></i>
                                Advisor: {club.advisorName}
                              </small>
                            )}
                            <div className="mt-auto">
                              {isEnrolled(club.id) ? (
                                <button className="btn btn-sm btn-outline-success w-100" disabled>
                                  <i className="fas fa-check-circle me-2"></i>
                                  Already Enrolled
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-sm btn-primary w-100"
                                  onClick={() => handleEnrollClub(club.id)}
                                >
                                  <i className="fas fa-user-plus me-2"></i>
                                  Enroll in Club
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;