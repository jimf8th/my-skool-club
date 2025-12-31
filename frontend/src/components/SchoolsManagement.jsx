import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/apiService';

const SchoolsManagement = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [deleteModal, setDeleteModal] = useState({ show: false, school: null });
  const [viewModal, setViewModal] = useState({ show: false, school: null });
  const [editModal, setEditModal] = useState({ show: false, school: null });
  
  // Form state for adding new school
  const [newSchool, setNewSchool] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phoneNumber: '',
    email: '',
    website: '',
    principalName: '',
    principalEmail: '',
    type: '',
    establishedYear: '',
    studentCapacity: '',
    adminEmails: ['']
  });
  
  // Form state for editing school
  const [editSchool, setEditSchool] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phoneNumber: '',
    email: '',
    website: '',
    principalName: '',
    principalEmail: '',
    type: '',
    establishedYear: '',
    studentCapacity: '',
    adminEmails: ['']
  });
  
  const [formLoading, setFormLoading] = useState(false);
  
  // Suggestions for admin email typeahead when editing an existing school
  const [editSuggestions, setEditSuggestions] = useState({}); // { index: [member...] }
  const [visibleSuggestionIndex, setVisibleSuggestionIndex] = useState(null);
  const suggestionDebounceRef = useRef(null);
  const suggestionContainerRef = useRef(null);

  // Get user role from localStorage
  useEffect(() => {
    const memberData = localStorage.getItem('currentMember');
    if (memberData) {
      try {
        const member = JSON.parse(memberData);
        setUserRole(member.role);
      } catch (error) {
        console.error('Error parsing member data:', error);
      }
    }
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionContainerRef.current && !suggestionContainerRef.current.contains(event.target)) {
        setVisibleSuggestionIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchSchools();
    }
  }, [activeTab]);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/schools');
      if (response.success && response.data) {
        setSchools(response.data);
      } else {
        setMessage({ type: 'error', text: 'Failed to fetch schools' });
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
      setMessage({ type: 'error', text: 'An error occurred while fetching schools' });
    } finally {
      setLoading(false);
    }
  };

  // Form handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setNewSchool(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const _handleAdminEmailChange = (index, value) => {
    setNewSchool(prev => ({
      ...prev,
      adminEmails: prev.adminEmails.map((email, i) => i === index ? value : email)
    }));
  };

  const _addAdminEmail = () => {
    setNewSchool(prev => ({
      ...prev,
      adminEmails: [...prev.adminEmails, '']
    }));
  };

  const _removeAdminEmail = (index) => {
    setNewSchool(prev => ({
      ...prev,
      adminEmails: prev.adminEmails.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newSchool.name.trim()) {
      setMessage({ type: 'error', text: 'School name is required' });
      return;
    }

    setFormLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const schoolData = {
        ...newSchool,
        name: newSchool.name.trim(),
        establishedYear: newSchool.establishedYear ? parseInt(newSchool.establishedYear) : null,
        studentCapacity: newSchool.studentCapacity ? parseInt(newSchool.studentCapacity) : null,
        adminEmails: newSchool.adminEmails.map(email => email.trim()).filter(email => email.length > 0)
      };

      const response = await apiService.post('/schools', schoolData);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'School created successfully!' });
        // Reset form
        setNewSchool({
          name: '',
          description: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          phoneNumber: '',
          email: '',
          website: '',
          principalName: '',
          principalEmail: '',
          type: '',
          establishedYear: '',
          studentCapacity: '',
          adminEmails: ['']
        });
        // Refresh the schools list if we're on the list tab
        if (activeTab === 'list') {
          fetchSchools();
        }
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to create school' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while creating the school' 
      });
    } finally {
      setFormLoading(false);
    }
  };

  // School management handlers
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentMember');
    localStorage.removeItem('userEmail');
    window.location.href = '/';
  };

  const handleDeleteClick = (school) => {
    setDeleteModal({ show: true, school });
  };

  const confirmDelete = async () => {
    if (!deleteModal.school) return;

    try {
      const response = await apiService.delete(`/schools/${deleteModal.school.id}`);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'School deleted successfully!' });
        setSchools(schools.filter(school => school.id !== deleteModal.school.id));
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to delete school' });
      }
    } catch (error) {
      console.error('Error deleting school:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while deleting the school' 
      });
    } finally {
      setDeleteModal({ show: false, school: null });
    }
  };

  const handleDeactivate = async (schoolId) => {
    try {
      const response = await apiService.put(`/schools/${schoolId}/deactivate`);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'School deactivated successfully!' });
        setSchools(schools.map(school => 
          school.id === schoolId ? { ...school, active: false } : school
        ));
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to deactivate school' });
      }
    } catch (error) {
      console.error('Error deactivating school:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while deactivating the school' 
      });
    }
  };

  const handleActivate = async (schoolId) => {
    try {
      const response = await apiService.put(`/schools/${schoolId}/activate`);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'School activated successfully!' });
        setSchools(schools.map(school => 
          school.id === schoolId ? { ...school, active: true } : school
        ));
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to activate school' });
      }
    } catch (error) {
      console.error('Error activating school:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while activating the school' 
      });
    }
  };

  const handleViewClick = (school) => {
    setViewModal({ show: true, school });
  };

  const closeViewModal = () => {
    setViewModal({ show: false, school: null });
  };

  const handleEditClick = (school) => {
    setEditSchool({
      name: school.name || '',
      description: school.description || '',
      address: school.address || '',
      city: school.city || '',
      state: school.state || '',
      zipCode: school.zipCode || '',
      country: school.country || '',
      phoneNumber: school.phoneNumber || '',
      email: school.email || '',
      website: school.website || '',
      principalName: school.principalName || '',
      principalEmail: school.principalEmail || '',
      type: school.type || '',
      establishedYear: school.establishedYear || '',
      studentCapacity: school.studentCapacity || '',
      adminEmails: school.adminEmails && school.adminEmails.length > 0 ? school.adminEmails : ['']
    });
    setEditModal({ show: true, school });
  };

  const closeEditModal = () => {
    setEditModal({ show: false, school: null });
    setEditSchool({
      name: '',
      description: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      phoneNumber: '',
      email: '',
      website: '',
      principalName: '',
      principalEmail: '',
      type: '',
      establishedYear: '',
      studentCapacity: '',
      adminEmails: ['']
    });
    
    // Clear suggestions state
    setEditSuggestions({});
    setVisibleSuggestionIndex(null);
    if (suggestionDebounceRef.current) {
      clearTimeout(suggestionDebounceRef.current);
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditSchool(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditAdminEmailChange = (index, value) => {
    const updatedEmails = [...editSchool.adminEmails];
    updatedEmails[index] = value;
    setEditSchool(prev => ({
      ...prev,
      adminEmails: updatedEmails
    }));

    // Only search for suggestions when editing an existing school
    if (editModal && editModal.school && editModal.school.id) {
      scheduleFetchMemberSuggestions(editModal.school.id, value, index);
    }
  };

  const addEditAdminEmailField = () => {
    setEditSchool(prev => ({
      ...prev,
      adminEmails: [...prev.adminEmails, '']
    }));
  };

  const removeEditAdminEmailField = (index) => {
    if (editSchool.adminEmails.length > 1) {
      const updatedEmails = editSchool.adminEmails.filter((_, i) => i !== index);
      setEditSchool(prev => ({
        ...prev,
        adminEmails: updatedEmails
      }));
      // Remove suggestions for this index
      const newSuggestions = { ...editSuggestions };
      delete newSuggestions[index];
      setEditSuggestions(newSuggestions);
      if (visibleSuggestionIndex === index) {
        setVisibleSuggestionIndex(null);
      }
    }
  };

  // Debounced search for member suggestions
  const scheduleFetchMemberSuggestions = (schoolId, query, index) => {
    if (suggestionDebounceRef.current) {
      clearTimeout(suggestionDebounceRef.current);
    }

    // Clear suggestions if query is too short
    if (query.trim().length < 2) {
      setEditSuggestions(prev => {
        const newSuggestions = { ...prev };
        delete newSuggestions[index];
        return newSuggestions;
      });
      setVisibleSuggestionIndex(null);
      return;
    }

    suggestionDebounceRef.current = setTimeout(async () => {
      try {
        const response = await apiService.get(`/members/search-by-school?schoolId=${schoolId}&query=${encodeURIComponent(query)}`);
        if (response.success && response.data) {
          setEditSuggestions(prev => ({
            ...prev,
            [index]: response.data
          }));
          setVisibleSuggestionIndex(index);
        }
      } catch (error) {
        console.error('Error fetching member suggestions:', error);
      }
    }, 300);
  };

  const selectSuggestion = (index, member) => {
    const updatedEmails = [...editSchool.adminEmails];
    updatedEmails[index] = member.email;
    setEditSchool(prev => ({
      ...prev,
      adminEmails: updatedEmails
    }));
    setVisibleSuggestionIndex(null);
    setEditSuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[index];
      return newSuggestions;
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!editModal.school) return;

    try {
      setFormLoading(true);

      const schoolData = {
        ...editSchool,
        adminEmails: editSchool.adminEmails.filter(email => email.trim() !== ''),
        establishedYear: editSchool.establishedYear ? parseInt(editSchool.establishedYear) : null,
        studentCapacity: editSchool.studentCapacity ? parseInt(editSchool.studentCapacity) : null
      };

      const response = await apiService.put(`/schools/${editModal.school.id}`, schoolData);
      
      if (response.success || response.school) {
        let successMessage = 'School updated successfully!';
        
        // Add role promotion/demotion information to the message
        if (response.promotedAdmins && response.promotedAdmins.length > 0) {
          successMessage += ` Promoted ${response.promotedAdmins.length} member(s) to School Admin role.`;
        }
        if (response.demotedAdmins && response.demotedAdmins.length > 0) {
          successMessage += ` Demoted ${response.demotedAdmins.length} member(s) from School Admin role.`;
        }
        
        setMessage({ type: 'success', text: successMessage });
        const updatedSchool = response.school || response.data;
        setSchools(schools.map(school => 
          school.id === editModal.school.id ? updatedSchool : school
        ));
        closeEditModal();
      } else {
        setMessage({
          type: 'error',
          text: response.message || 'Failed to update school'
        });
      }
    } catch (error) {
      console.error('Error updating school:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || error.message || 'An error occurred while updating the school'
      });
    } finally {
      setFormLoading(false);
    }
  };

  const closeModal = () => {
    setDeleteModal({ show: false, school: null });
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="text-primary">
              <i className="fas fa-school me-2"></i>
              Schools Management
            </h2>
            <button 
              className="btn btn-outline-danger"
              onClick={handleLogout}
            >
              <i className="fas fa-sign-out-alt me-1"></i>
              Logout
            </button>
          </div>

          {/* Message Display */}
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

          {/* Tab Navigation */}
          <ul className="nav nav-tabs mb-4" id="schoolsTabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'list' ? 'active' : ''}`}
                onClick={() => setActiveTab('list')}
                type="button" 
                role="tab"
              >
                <i className="fas fa-list me-2"></i>
                Manage Schools
              </button>
            </li>
            {userRole === 'APP_ADMIN' && (
              <li className="nav-item" role="presentation">
                <button 
                  className={`nav-link ${activeTab === 'add' ? 'active' : ''}`}
                  onClick={() => setActiveTab('add')}
                  type="button" 
                  role="tab"
                >
                  <i className="fas fa-plus me-2"></i>
                  Add New School
                </button>
              </li>
            )}
          </ul>

          {/* Tab Content */}
          <div className="tab-content" id="schoolsTabContent">
            
            {/* Schools List Tab */}
            {activeTab === 'list' && (
              <div className="tab-pane fade show active">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading schools...</p>
                  </div>
                ) : schools.length === 0 ? (
                  <div className="card">
                    <div className="card-body">
                      <div className="text-center py-5">
                        <i className="fas fa-school fa-4x text-muted mb-3"></i>
                        <h4 className="text-muted">No Schools Found</h4>
                        <p className="text-muted">
                          No schools have been added yet. Add your first school to get started.
                        </p>
                        <button 
                          className="btn btn-primary"
                          onClick={() => setActiveTab('add')}
                        >
                          <i className="fas fa-plus me-2"></i>
                          Add First School
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">
                        <i className="fas fa-list me-2"></i>
                        Schools ({schools.length})
                      </h5>
                      {userRole === 'APP_ADMIN' && (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => setActiveTab('add')}
                        >
                          <i className="fas fa-plus me-2"></i>
                          Add New
                        </button>
                      )}
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>School Name</th>
                              <th>Type</th>
                              <th>City</th>
                              <th>State</th>
                              <th>Status</th>
                              <th>Created</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {schools.map((school) => (
                              <tr key={school.id}>
                                <td>
                                  <strong>{school.name}</strong>
                                  {school.description && (
                                    <div className="small text-muted">{school.description}</div>
                                  )}
                                </td>
                                <td>
                                  <span className="badge bg-info">
                                    {school.type || 'Not specified'}
                                  </span>
                                </td>
                                <td>{school.city || '-'}</td>
                                <td>{school.state || '-'}</td>
                                <td>
                                  <span className={`badge ${school.active ? 'bg-success' : 'bg-danger'}`}>
                                    {school.active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td>
                                  {school.createdAt ? new Date(school.createdAt).toLocaleDateString() : '-'}
                                </td>
                                <td>
                                  <div className="btn-group btn-group-sm" role="group">
                                    <button 
                                      className="btn btn-outline-primary"
                                      onClick={() => handleViewClick(school)}
                                      title="View Details"
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                    <button 
                                      className="btn btn-outline-secondary"
                                      onClick={() => handleEditClick(school)}
                                      title="Edit School"
                                    >
                                      <i className="fas fa-edit"></i>
                                    </button>
                                    {school.active ? (
                                      <button 
                                        className="btn btn-outline-warning"
                                        onClick={() => handleDeactivate(school.id)}
                                        title="Deactivate School"
                                      >
                                        <i className="fas fa-pause"></i>
                                      </button>
                                    ) : (
                                      <button 
                                        className="btn btn-outline-success"
                                        onClick={() => handleActivate(school.id)}
                                        title="Activate School"
                                      >
                                        <i className="fas fa-play"></i>
                                      </button>
                                    )}
                                    {userRole === 'APP_ADMIN' && (
                                      <button 
                                        className="btn btn-outline-danger"
                                        onClick={() => handleDeleteClick(school)}
                                        title="Delete School"
                                      >
                                        <i className="fas fa-trash"></i>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Add School Tab */}
            {activeTab === 'add' && userRole === 'APP_ADMIN' && (
              <div className="tab-pane fade show active">
                <div className="row justify-content-center">
                  <div className="col-md-8">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="mb-0">School Information</h5>
                      </div>
                      <div className="card-body">
                        <form onSubmit={handleSubmit}>
                          {/* Required Field */}
                          <div className="mb-3 row">
                            <label htmlFor="name" className="col-sm-3 col-form-label">
                              School Name <span className="text-danger">*</span>
                            </label>
                            <div className="col-sm-9">
                              <input
                                type="text"
                                className="form-control"
                                id="name"
                                name="name"
                                value={newSchool.name}
                                onChange={handleFormChange}
                                placeholder="Enter school name"
                                required
                              />
                            </div>
                          </div>

                          {/* Description */}
                          <div className="mb-3 row">
                            <label htmlFor="description" className="col-sm-3 col-form-label">Description</label>
                            <div className="col-sm-9">
                              <textarea
                                className="form-control"
                                id="description"
                                name="description"
                                value={newSchool.description}
                                onChange={handleFormChange}
                                rows="3"
                                placeholder="Brief description of the school"
                              ></textarea>
                            </div>
                          </div>

                          {/* School Type */}
                          <div className="mb-3 row">
                            <label htmlFor="type" className="col-sm-3 col-form-label">School Type</label>
                            <div className="col-sm-9">
                              <select
                                className="form-select"
                                id="type"
                                name="type"
                                value={newSchool.type}
                                onChange={handleFormChange}
                              >
                                <option value="">Select school type</option>
                                <option value="Elementary">Elementary School</option>
                                <option value="Middle">Middle School</option>
                                <option value="High">High School</option>
                                <option value="K-12">K-12 School</option>
                                <option value="Private">Private School</option>
                                <option value="Charter">Charter School</option>
                                <option value="Magnet">Magnet School</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>

                          {/* Location Fields */}
                          <div className="mb-3 row">
                            <label htmlFor="address" className="col-sm-3 col-form-label">Address</label>
                            <div className="col-sm-9">
                              <input
                                type="text"
                                className="form-control"
                                id="address"
                                name="address"
                                value={newSchool.address}
                                onChange={handleFormChange}
                                placeholder="Street address"
                              />
                            </div>
                          </div>

                          <div className="mb-3 row">
                            <label htmlFor="city" className="col-sm-3 col-form-label">City</label>
                            <div className="col-sm-4">
                              <input
                                type="text"
                                className="form-control"
                                id="city"
                                name="city"
                                value={newSchool.city}
                                onChange={handleFormChange}
                                placeholder="City"
                              />
                            </div>
                            <label htmlFor="state" className="col-sm-1 col-form-label">State</label>
                            <div className="col-sm-4">
                              <input
                                type="text"
                                className="form-control"
                                id="state"
                                name="state"
                                value={newSchool.state}
                                onChange={handleFormChange}
                                placeholder="State"
                              />
                            </div>
                          </div>

                          <div className="mb-3 row">
                            <label htmlFor="zipCode" className="col-sm-3 col-form-label">Zip Code</label>
                            <div className="col-sm-4">
                              <input
                                type="text"
                                className="form-control"
                                id="zipCode"
                                name="zipCode"
                                value={newSchool.zipCode}
                                onChange={handleFormChange}
                                placeholder="Zip code"
                              />
                            </div>
                            <label htmlFor="country" className="col-sm-1 col-form-label">Country</label>
                            <div className="col-sm-4">
                              <input
                                type="text"
                                className="form-control"
                                id="country"
                                name="country"
                                value={newSchool.country}
                                onChange={handleFormChange}
                                placeholder="Country"
                              />
                            </div>
                          </div>

                          {/* Contact Information */}
                          <div className="mb-3 row">
                            <label htmlFor="phoneNumber" className="col-sm-3 col-form-label">Phone</label>
                            <div className="col-sm-4">
                              <input
                                type="tel"
                                className="form-control"
                                id="phoneNumber"
                                name="phoneNumber"
                                value={newSchool.phoneNumber}
                                onChange={handleFormChange}
                                placeholder="Phone number"
                              />
                            </div>
                            <label htmlFor="email" className="col-sm-1 col-form-label">Email</label>
                            <div className="col-sm-4">
                              <input
                                type="email"
                                className="form-control"
                                id="email"
                                name="email"
                                value={newSchool.email}
                                onChange={handleFormChange}
                                placeholder="School email"
                              />
                            </div>
                          </div>

                          <div className="mb-3 row">
                            <label htmlFor="website" className="col-sm-3 col-form-label">Website</label>
                            <div className="col-sm-9">
                              <input
                                type="url"
                                className="form-control"
                                id="website"
                                name="website"
                                value={newSchool.website}
                                onChange={handleFormChange}
                                placeholder="https://www.schoolwebsite.com"
                              />
                            </div>
                          </div>

                          {/* Principal Information */}
                          <div className="mb-3 row">
                            <label htmlFor="principalName" className="col-sm-3 col-form-label">Principal Name</label>
                            <div className="col-sm-4">
                              <input
                                type="text"
                                className="form-control"
                                id="principalName"
                                name="principalName"
                                value={newSchool.principalName}
                                onChange={handleFormChange}
                                placeholder="Principal's name"
                              />
                            </div>
                            <label htmlFor="principalEmail" className="col-sm-1 col-form-label">Email</label>
                            <div className="col-sm-4">
                              <input
                                type="email"
                                className="form-control"
                                id="principalEmail"
                                name="principalEmail"
                                value={newSchool.principalEmail}
                                onChange={handleFormChange}
                                placeholder="Principal's email"
                              />
                            </div>
                          </div>

                          {/* School Details */}
                          <div className="mb-3 row">
                            <label htmlFor="establishedYear" className="col-sm-3 col-form-label">Established Year</label>
                            <div className="col-sm-4">
                              <input
                                type="number"
                                className="form-control"
                                id="establishedYear"
                                name="establishedYear"
                                value={newSchool.establishedYear}
                                onChange={handleFormChange}
                                placeholder="e.g., 1995"
                                min="1800"
                                max={new Date().getFullYear()}
                              />
                            </div>
                            <label htmlFor="studentCapacity" className="col-sm-1 col-form-label">Capacity</label>
                            <div className="col-sm-4">
                              <input
                                type="number"
                                className="form-control"
                                id="studentCapacity"
                                name="studentCapacity"
                                value={newSchool.studentCapacity}
                                onChange={handleFormChange}
                                placeholder="Max students"
                                min="1"
                              />
                            </div>
                          </div>

                          {/* Admin Emails */}
                          <div className="mb-3">
                            <label className="form-label">Admin Emails</label>
                            <div className="alert alert-info mb-2">
                              <i className="fas fa-info-circle me-2"></i>
                              Admin emails cannot be added when creating a new school. First create the school and add members, then you can assign them as admins by editing the school.
                            </div>
                          </div>

                          <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                            <button
                              type="button"
                              className="btn btn-outline-secondary me-2"
                              onClick={() => setActiveTab('list')}
                            >
                              <i className="fas fa-list me-2"></i>
                              View All Schools
                            </button>
                            <button
                              type="submit"
                              className="btn btn-primary"
                              disabled={formLoading}
                            >
                              {formLoading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-plus me-2"></i>
                                  Add School
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle text-danger me-2"></i>
                  Confirm Delete
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={closeModal}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to permanently delete the school 
                  <strong> "{deleteModal.school?.name}"</strong>?
                </p>
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Warning:</strong> This action cannot be undone. All data associated with this school will be permanently removed.
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={confirmDelete}
                >
                  <i className="fas fa-trash me-2"></i>
                  Delete School
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View School Modal */}
      {viewModal.show && viewModal.school && (
        <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-eye me-2"></i>
                  School Details - {viewModal.school.name}
                </h5>
                <button type="button" className="btn-close" onClick={closeViewModal}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {/* Basic Information */}
                  <div className="col-md-6">
                    <h6 className="text-primary mb-3">Basic Information</h6>
                    <table className="table table-sm table-borderless">
                      <tbody>
                        <tr>
                          <td><strong>School Name:</strong></td>
                          <td>{viewModal.school.name}</td>
                        </tr>
                        <tr>
                          <td><strong>Type:</strong></td>
                          <td>{viewModal.school.type || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td><strong>Established:</strong></td>
                          <td>{viewModal.school.establishedYear || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td><strong>Status:</strong></td>
                          <td>
                            <span className={`badge ${viewModal.school.active ? 'bg-success' : 'bg-danger'}`}>
                              {viewModal.school.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Student Capacity:</strong></td>
                          <td>{viewModal.school.studentCapacity || 'Not specified'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Contact Information */}
                  <div className="col-md-6">
                    <h6 className="text-primary mb-3">Contact Information</h6>
                    <table className="table table-sm table-borderless">
                      <tbody>
                        <tr>
                          <td><strong>Address:</strong></td>
                          <td>{viewModal.school.address || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td><strong>Phone:</strong></td>
                          <td>{viewModal.school.phoneNumber || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td><strong>Email:</strong></td>
                          <td>{viewModal.school.email || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td><strong>Website:</strong></td>
                          <td>
                            {viewModal.school.website ? (
                              <a href={viewModal.school.website} target="_blank" rel="noopener noreferrer">
                                {viewModal.school.website}
                              </a>
                            ) : 'Not specified'}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Principal:</strong></td>
                          <td>{viewModal.school.principalName || 'Not specified'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Description */}
                <div className="row mt-4">
                  <div className="col-12">
                    <h6 className="text-primary mb-3">Description</h6>
                    <div className="card">
                      <div className="card-body">
                        <p className="card-text">
                          {viewModal.school.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Emails */}
                {viewModal.school.adminEmails && viewModal.school.adminEmails.length > 0 && viewModal.school.adminEmails.filter(email => email.trim()).length > 0 && (
                  <div className="row mt-4">
                    <div className="col-12">
                      <h6 className="text-primary mb-3">Admin Emails</h6>
                      <div className="card">
                        <div className="card-body">
                          {viewModal.school.adminEmails.filter(email => email.trim()).map((email, index) => (
                            <span key={index} className="badge bg-secondary me-2 mb-2">
                              <i className="fas fa-envelope me-1"></i>
                              {email}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline Information */}
                <div className="row mt-4">
                  <div className="col-12">
                    <h6 className="text-primary mb-3">Timeline</h6>
                    <table className="table table-sm table-borderless">
                      <tbody>
                        <tr>
                          <td><strong>Created:</strong></td>
                          <td>{viewModal.school.createdAt ? new Date(viewModal.school.createdAt).toLocaleString() : 'Not available'}</td>
                        </tr>
                        <tr>
                          <td><strong>Last Updated:</strong></td>
                          <td>{viewModal.school.updatedAt ? new Date(viewModal.school.updatedAt).toLocaleString() : 'Not available'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={closeViewModal}
                >
                  <i className="fas fa-times me-2"></i>
                  Close
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => {
                    closeViewModal();
                    handleEditClick(viewModal.school);
                  }}
                >
                  <i className="fas fa-edit me-2"></i>
                  Edit School
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      {editModal.show && (
        <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-edit me-2"></i>
                  Edit School: {editModal.school?.name}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={closeEditModal}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleEditSubmit}>
                  {/* Required Fields */}
                  <div className="mb-3 row">
                    <label htmlFor="editName" className="col-sm-3 col-form-label">
                      School Name <span className="text-danger">*</span>
                    </label>
                    <div className="col-sm-9">
                      <input
                        type="text"
                        className="form-control"
                        id="editName"
                        name="name"
                        value={editSchool.name}
                        onChange={handleEditInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label htmlFor="editDescription" className="col-sm-3 col-form-label">
                      Description <span className="text-danger">*</span>
                    </label>
                    <div className="col-sm-9">
                      <textarea
                        className="form-control"
                        id="editDescription"
                        name="description"
                        rows="3"
                        value={editSchool.description}
                        onChange={handleEditInputChange}
                        required
                      ></textarea>
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label htmlFor="editType" className="col-sm-3 col-form-label">
                      School Type <span className="text-danger">*</span>
                    </label>
                    <div className="col-sm-9">
                      <select
                        className="form-control"
                        id="editType"
                        name="type"
                        value={editSchool.type}
                        onChange={handleEditInputChange}
                        required
                      >
                        <option value="">Select school type</option>
                        <option value="ELEMENTARY">Elementary School</option>
                        <option value="MIDDLE_SCHOOL">Middle School</option>
                        <option value="HIGH_SCHOOL">High School</option>
                        <option value="UNIVERSITY">University</option>
                        <option value="COLLEGE">College</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Optional Fields */}
                  <div className="mb-3 row">
                    <label htmlFor="editAddress" className="col-sm-3 col-form-label">Address</label>
                    <div className="col-sm-9">
                      <input
                        type="text"
                        className="form-control"
                        id="editAddress"
                        name="address"
                        value={editSchool.address}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label htmlFor="editPhoneNumber" className="col-sm-3 col-form-label">Phone Number</label>
                    <div className="col-sm-9">
                      <input
                        type="tel"
                        className="form-control"
                        id="editPhoneNumber"
                        name="phoneNumber"
                        value={editSchool.phoneNumber}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label htmlFor="editEmail" className="col-sm-3 col-form-label">Email</label>
                    <div className="col-sm-9">
                      <input
                        type="email"
                        className="form-control"
                        id="editEmail"
                        name="email"
                        value={editSchool.email}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label htmlFor="editWebsite" className="col-sm-3 col-form-label">Website</label>
                    <div className="col-sm-9">
                      <input
                        type="url"
                        className="form-control"
                        id="editWebsite"
                        name="website"
                        value={editSchool.website}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label htmlFor="editPrincipalName" className="col-sm-3 col-form-label">Principal Name</label>
                    <div className="col-sm-9">
                      <input
                        type="text"
                        className="form-control"
                        id="editPrincipalName"
                        name="principalName"
                        value={editSchool.principalName}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label htmlFor="editPrincipalEmail" className="col-sm-3 col-form-label">Principal Email</label>
                    <div className="col-sm-9">
                      <input
                        type="email"
                        className="form-control"
                        id="editPrincipalEmail"
                        name="principalEmail"
                        value={editSchool.principalEmail}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label htmlFor="editEstablishedYear" className="col-sm-3 col-form-label">Established Year</label>
                    <div className="col-sm-9">
                      <input
                        type="number"
                        className="form-control"
                        id="editEstablishedYear"
                        name="establishedYear"
                        value={editSchool.establishedYear}
                        onChange={handleEditInputChange}
                        min="1800"
                        max="2030"
                      />
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label htmlFor="editStudentCapacity" className="col-sm-3 col-form-label">Student Capacity</label>
                    <div className="col-sm-9">
                      <input
                        type="number"
                        className="form-control"
                        id="editStudentCapacity"
                        name="studentCapacity"
                        value={editSchool.studentCapacity}
                        onChange={handleEditInputChange}
                        min="1"
                      />
                    </div>
                  </div>

                  {/* Admin Emails */}
                  <div className="mb-3">
                    <label className="form-label">Admin Emails</label>
                    <div className="alert alert-info mb-2">
                      <i className="fas fa-info-circle me-2"></i>
                      Type at least 2 characters to search for existing members of this school. Only members already registered to this school can be assigned as admins.
                    </div>
                    {editSchool.adminEmails.map((email, index) => (
                      <div key={index} className="mb-2 position-relative">
                        <div className="input-group">
                          <input
                            type="email"
                            className="form-control"
                            value={email}
                            onChange={(e) => handleEditAdminEmailChange(index, e.target.value)}
                            placeholder="Type to search for school members..."
                          />
                          {editSchool.adminEmails.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => removeEditAdminEmailField(index)}
                              title="Remove this email"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                        
                        {/* Typeahead Suggestions */}
                        {editSuggestions[index] && editSuggestions[index].length > 0 && visibleSuggestionIndex === index && (
                          <div ref={suggestionContainerRef} className="position-absolute w-100" style={{zIndex: 1050}}>
                            <div className="list-group mt-1 shadow-sm">
                              {editSuggestions[index].map((member, memberIndex) => (
                                <button
                                  key={memberIndex}
                                  type="button"
                                  className="list-group-item list-group-item-action d-flex align-items-center"
                                  onClick={() => selectSuggestion(index, member)}
                                >
                                  <div className="flex-grow-1">
                                    <div className="fw-bold">{member.name}</div>
                                    <small className="text-muted">{member.email}</small>
                                    <small className="text-info ms-2">({member.memberType})</small>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={addEditAdminEmailField}
                    >
                      <i className="fas fa-plus me-2"></i>
                      Add Another Email
                    </button>
                    
                    <div className="form-text mt-2">
                      <i className="fas fa-info-circle me-1"></i>
                      Start typing to search for existing members in this school. Select from suggestions to ensure valid admin access.
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={closeEditModal}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleEditSubmit}
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-2"></i>
                      Update School
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolsManagement;