import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

// Utility function to hash password using Web Crypto API
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

const MemberSignup = () => {
  const navigate = useNavigate();
  const [member, setMember] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    memberType: '',
    schoolId: '',
    schoolName: ''
  });

  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentMember, setCurrentMember] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    const memberData = localStorage.getItem('currentMember');
    if (memberData) {
      try {
        const parsedMember = JSON.parse(memberData);
        setCurrentMember(parsedMember);
      } catch (error) {
        console.error('Error parsing member data:', error);
      }
    }
  }, []);

  // Fetch schools for dropdown
  useEffect(() => {
    fetchSchools();
  }, []);

    const fetchSchools = async () => {
    try {
      const response = await apiService.get('/schools/public');
      console.log('Schools response:', response);
      if (response.success && response.data && Array.isArray(response.data)) {
        setSchools(response.data);
      } else if (Array.isArray(response)) {
        // Direct array response (fallback)
        setSchools(response);
      } else {
        console.warn('Invalid schools data:', response);
        setSchools([]);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
      setSchools([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for school selection to set both schoolId and schoolName
    if (name === 'schoolId') {
      const selectedSchool = schools.find(school => school.id === value);
      setMember(prev => ({
        ...prev,
        schoolId: value,
        schoolName: selectedSchool ? selectedSchool.name : ''
      }));
    } else {
      setMember(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Member signup form submitted with data:', member);
    
    // Validate required fields
    if (!member.firstName.trim()) {
      setMessage({ type: 'error', text: 'First name is required' });
      return;
    }
    
    if (!member.lastName.trim()) {
      setMessage({ type: 'error', text: 'Last name is required' });
      return;
    }
    
    if (!member.email.trim()) {
      setMessage({ type: 'error', text: 'Email is required' });
      return;
    }

    if (!member.memberType.trim()) {
      setMessage({ type: 'error', text: 'Member type is required' });
      return;
    }

    if (!member.schoolId.trim()) {
      setMessage({ type: 'error', text: 'School selection is required' });
      return;
    }

    if (!member.password.trim()) {
      setMessage({ type: 'error', text: 'Password is required' });
      return;
    }

    if (member.password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    if (member.password !== member.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(member.email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Hash the password before sending
      const passwordHash = await hashPassword(member.password);
      
      // Prepare data
      const memberData = {
        firstName: member.firstName.trim(),
        lastName: member.lastName.trim(),
        email: member.email.trim().toLowerCase(),
        memberType: member.memberType,
        passwordHash: passwordHash,
        schoolId: member.schoolId,
        schoolName: member.schoolName
      };

      console.log('Sending member data:', memberData);
      
      const response = await apiService.post('/members', memberData);
      
      console.log('API response:', response);
      
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: 'Registration successful! Your account is pending activation by a school administrator. You will be able to login once your account is activated.' 
        });
        // Reset form
        setMember({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
          memberType: '',
          schoolId: '',
          schoolName: ''
        });
      } else {
        console.error('API error:', response);
        setMessage({ type: 'error', text: response.message || 'Failed to register member' });
      }
    } catch (error) {
      console.error('Exception caught:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while registering the member' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('currentMember');
    localStorage.removeItem('token');
    setCurrentMember(null);
    setMessage({ type: 'success', text: 'Signed out successfully. You can now register a new member.' });
  };

  // If user is already logged in, show message to sign out first
  if (currentMember) {
    return (
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header bg-warning text-dark">
                <h4 className="mb-0">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Already Logged In
                </h4>
              </div>
              <div className="card-body">
                <div className="alert alert-info" role="alert">
                  <h5 className="alert-heading">
                    <i className="fas fa-info-circle me-2"></i>
                    You are currently logged in
                  </h5>
                  <p className="mb-3">
                    You are currently logged in as <strong>{currentMember.email}</strong>.
                  </p>
                  <p className="mb-3">
                    To register a new member, please sign out of your current account first.
                  </p>
                  <hr />
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-danger"
                      onClick={handleSignOut}
                    >
                      <i className="fas fa-sign-out-alt me-2"></i>
                      Sign Out
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => navigate('/dashboard')}
                    >
                      <i className="fas fa-tachometer-alt me-2"></i>
                      Go to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">
                <i className="fas fa-user-plus me-2"></i>
                Member Signup
              </h4>
            </div>
            <div className="card-body">
              {message.text && (
                <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'} alert-dismissible fade show`} role="alert">
                  {message.text}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setMessage({ type: '', text: '' })}
                  ></button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Basic Information */}
                <div className="row mb-3">
                  <div className="col-12">
                    <h5 className="text-primary border-bottom pb-2">Registration Information</h5>
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="firstName" className="col-sm-3 col-form-label">
                    First Name <span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="firstName"
                      name="firstName"
                      value={member.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="lastName" className="col-sm-3 col-form-label">
                    Last Name <span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="lastName"
                      name="lastName"
                      value={member.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="email" className="col-sm-3 col-form-label">
                    Email <span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-9">
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={member.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="memberType" className="col-sm-3 col-form-label">
                    Member Type <span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-9">
                    <select
                      className="form-control"
                      id="memberType"
                      name="memberType"
                      value={member.memberType}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Member Type</option>
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="password" className="col-sm-3 col-form-label">
                    Password <span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-9">
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      name="password"
                      value={member.password}
                      onChange={handleInputChange}
                      required
                      minLength="8"
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="confirmPassword" className="col-sm-3 col-form-label">
                    Confirm Password <span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-9">
                    <input
                      type="password"
                      className="form-control"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={member.confirmPassword}
                      onChange={handleInputChange}
                      required
                      placeholder="Re-enter your password"
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="schoolId" className="col-sm-3 col-form-label">
                    School <span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-9">
                    <select
                      className="form-control"
                      id="schoolId"
                      name="schoolId"
                      value={member.schoolId}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select School</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="row">
                  <div className="col-12">
                    <button 
                      type="submit" 
                      className="btn btn-primary btn-lg w-100"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Registering Member...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user-plus me-2"></i>
                          Register Member
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="row mt-3">
                  <div className="col-12 text-center">
                    <small className="text-muted">
                      <span className="text-danger">*</span> All fields are required
                    </small>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberSignup;