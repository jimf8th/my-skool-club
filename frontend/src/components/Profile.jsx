import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

const Profile = () => {
  const navigate = useNavigate();
  const [currentMember, setCurrentMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    gradeLevel: '',
    studentId: '',
    memberType: ''
  });

  useEffect(() => {
    // Check if user is logged in
    const memberData = localStorage.getItem('currentMember');
    if (!memberData) {
      navigate('/member-login');
      return;
    }

    try {
      const member = JSON.parse(memberData);
      setCurrentMember(member);
      
      // Populate form with current member data
      setProfile({
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        middleName: member.middleName || '',
        phoneNumber: member.phoneNumber || '',
        dateOfBirth: member.dateOfBirth || '',
        gender: member.gender || '',
        address: member.address || '',
        city: member.city || '',
        state: member.state || '',
        zipCode: member.zipCode || '',
        country: member.country || '',
        parentName: member.parentName || '',
        parentEmail: member.parentEmail || '',
        parentPhone: member.parentPhone || '',
        emergencyContactName: member.emergencyContactName || '',
        emergencyContactPhone: member.emergencyContactPhone || '',
        gradeLevel: member.gradeLevel || '',
        studentId: member.studentId || '',
        memberType: member.memberType || ''
      });
    } catch (error) {
      console.error('Error parsing member data:', error);
      navigate('/member-login');
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!profile.firstName.trim()) {
      setMessage({ type: 'error', text: 'First name is required' });
      return;
    }
    
    if (!profile.lastName.trim()) {
      setMessage({ type: 'error', text: 'Last name is required' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Prepare update data (exclude email and school which cannot be changed)
      const updateData = {
        ...profile,
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        middleName: profile.middleName?.trim() || null,
        phoneNumber: profile.phoneNumber?.trim() || null,
        address: profile.address?.trim() || null,
        city: profile.city?.trim() || null,
        state: profile.state?.trim() || null,
        zipCode: profile.zipCode?.trim() || null,
        country: profile.country?.trim() || null,
        parentName: profile.parentName?.trim() || null,
        parentEmail: profile.parentEmail?.trim() || null,
        parentPhone: profile.parentPhone?.trim() || null,
        emergencyContactName: profile.emergencyContactName?.trim() || null,
        emergencyContactPhone: profile.emergencyContactPhone?.trim() || null,
        studentId: profile.studentId?.trim() || null
      };

      console.log('Updating profile with data:', updateData);
      
      const response = await apiService.put(`/members/${currentMember.id}`, updateData);
      
      console.log('API response:', response);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        
        // Update localStorage with new member data
        const updatedMember = {
          ...currentMember,
          ...profile
        };
        localStorage.setItem('currentMember', JSON.stringify(updatedMember));
        setCurrentMember(updatedMember);
        
        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        console.error('API error:', response);
        setMessage({ type: 'error', text: response.message || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Exception caught:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while updating profile' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentMember) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-10">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">
                <i className="fas fa-user-edit me-2"></i>
                Edit Profile
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
                {/* Read-only Information */}
                <div className="row mb-3">
                  <div className="col-12">
                    <h5 className="text-primary border-bottom pb-2">Account Information (Read-Only)</h5>
                  </div>
                </div>

                <div className="mb-3 row">
                  <label className="col-sm-3 col-form-label">Email</label>
                  <div className="col-sm-9">
                    <input
                      type="email"
                      className="form-control"
                      value={currentMember.email}
                      disabled
                    />
                    <small className="text-muted">Email cannot be changed</small>
                  </div>
                </div>

                <div className="mb-3 row">
                  <label className="col-sm-3 col-form-label">School</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      value={currentMember.schoolName}
                      disabled
                    />
                    <small className="text-muted">School cannot be changed</small>
                  </div>
                </div>

                <div className="mb-3 row">
                  <label className="col-sm-3 col-form-label">Member Type</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      value={currentMember.memberType || 'N/A'}
                      disabled
                    />
                  </div>
                </div>

                {currentMember.role && (
                  <div className="mb-3 row">
                    <label className="col-sm-3 col-form-label">Role</label>
                    <div className="col-sm-9">
                      <input
                        type="text"
                        className="form-control"
                        value={currentMember.role}
                        disabled
                      />
                    </div>
                  </div>
                )}

                {/* Editable Basic Information */}
                <div className="row mb-3 mt-4">
                  <div className="col-12">
                    <h5 className="text-primary border-bottom pb-2">Basic Information</h5>
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
                      value={profile.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="middleName" className="col-sm-3 col-form-label">Middle Name</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="middleName"
                      name="middleName"
                      value={profile.middleName}
                      onChange={handleInputChange}
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
                      value={profile.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="phoneNumber" className="col-sm-3 col-form-label">Phone Number</label>
                  <div className="col-sm-9">
                    <input
                      type="tel"
                      className="form-control"
                      id="phoneNumber"
                      name="phoneNumber"
                      value={profile.phoneNumber}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="dateOfBirth" className="col-sm-3 col-form-label">Date of Birth</label>
                  <div className="col-sm-9">
                    <input
                      type="date"
                      className="form-control"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={profile.dateOfBirth}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="gender" className="col-sm-3 col-form-label">Gender</label>
                  <div className="col-sm-9">
                    <select
                      className="form-control"
                      id="gender"
                      name="gender"
                      value={profile.gender}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="gradeLevel" className="col-sm-3 col-form-label">Grade Level</label>
                  <div className="col-sm-9">
                    <select
                      className="form-control"
                      id="gradeLevel"
                      name="gradeLevel"
                      value={profile.gradeLevel}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Grade</option>
                      <option value="9">9th Grade</option>
                      <option value="10">10th Grade</option>
                      <option value="11">11th Grade</option>
                      <option value="12">12th Grade</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="studentId" className="col-sm-3 col-form-label">Student/Member ID</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="studentId"
                      name="studentId"
                      value={profile.studentId}
                      onChange={handleInputChange}
                      placeholder="e.g., M2024001"
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div className="row mb-3 mt-4">
                  <div className="col-12">
                    <h5 className="text-primary border-bottom pb-2">Address Information</h5>
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="address" className="col-sm-3 col-form-label">Address</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="address"
                      name="address"
                      value={profile.address}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="city" className="col-sm-3 col-form-label">City</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="city"
                      name="city"
                      value={profile.city}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="state" className="col-sm-3 col-form-label">State</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="state"
                      name="state"
                      value={profile.state}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="zipCode" className="col-sm-3 col-form-label">ZIP Code</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="zipCode"
                      name="zipCode"
                      value={profile.zipCode}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="country" className="col-sm-3 col-form-label">Country</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="country"
                      name="country"
                      value={profile.country}
                      onChange={handleInputChange}
                      placeholder="e.g., United States"
                    />
                  </div>
                </div>

                {/* Parent/Guardian Information */}
                <div className="row mb-3 mt-4">
                  <div className="col-12">
                    <h5 className="text-primary border-bottom pb-2">Parent/Guardian Information</h5>
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="parentName" className="col-sm-3 col-form-label">Parent/Guardian Name</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="parentName"
                      name="parentName"
                      value={profile.parentName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="parentEmail" className="col-sm-3 col-form-label">Parent Email</label>
                  <div className="col-sm-9">
                    <input
                      type="email"
                      className="form-control"
                      id="parentEmail"
                      name="parentEmail"
                      value={profile.parentEmail}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="parentPhone" className="col-sm-3 col-form-label">Parent Phone</label>
                  <div className="col-sm-9">
                    <input
                      type="tel"
                      className="form-control"
                      id="parentPhone"
                      name="parentPhone"
                      value={profile.parentPhone}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="row mb-3 mt-4">
                  <div className="col-12">
                    <h5 className="text-primary border-bottom pb-2">Emergency Contact</h5>
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="emergencyContactName" className="col-sm-3 col-form-label">Emergency Contact Name</label>
                  <div className="col-sm-9">
                    <input
                      type="text"
                      className="form-control"
                      id="emergencyContactName"
                      name="emergencyContactName"
                      value={profile.emergencyContactName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="mb-3 row">
                  <label htmlFor="emergencyContactPhone" className="col-sm-3 col-form-label">Emergency Contact Phone</label>
                  <div className="col-sm-9">
                    <input
                      type="tel"
                      className="form-control"
                      id="emergencyContactPhone"
                      name="emergencyContactPhone"
                      value={profile.emergencyContactPhone}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="row mt-4">
                  <div className="col-12">
                    <div className="d-flex gap-2">
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Updating Profile...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save me-2"></i>
                            Update Profile
                          </>
                        )}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => navigate('/dashboard')}
                      >
                        <i className="fas fa-times me-2"></i>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>

                <div className="row mt-3">
                  <div className="col-12">
                    <small className="text-muted">
                      <span className="text-danger">*</span> Required fields
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

export default Profile;
