import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const Members = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [members, setMembers] = useState([]);
  const [_schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [deleteModal, setDeleteModal] = useState({ show: false, member: null });
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [filterModal, setFilterModal] = useState({ show: false });
  const [filters, setFilters] = useState({
    school: '',
    memberType: '',
    gradeLevel: '',
    department: '',
    gender: '',
    city: '',
    state: ''
  });
  const [sortConfig, setSortConfig] = useState({
    field: 'lastName',
    direction: 'asc'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMember, setCurrentMember] = useState(null);
  const [inactiveMembers, setInactiveMembers] = useState([]);
  const [loadingInactive, setLoadingInactive] = useState(false);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 0,
    size: 20,
    totalCount: 0,
    totalPages: 0
  });
  
  // No longer need form state for adding members - they sign up themselves

  // Get current member from localStorage
  useEffect(() => {
    const memberData = localStorage.getItem('currentMember');
    if (memberData) {
      try {
        setCurrentMember(JSON.parse(memberData));
      } catch (error) {
        console.error('Error parsing member data:', error);
      }
    }
  }, []);

  useEffect(() => {
    fetchSchools();
  }, []);

  // Initial load when switching to list tab or when currentMember is loaded
  useEffect(() => {
    if (activeTab === 'list' && currentMember) {
      fetchMembers();
    } else if (activeTab === 'activate' && currentMember) {
      fetchInactiveMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentMember]);

  // Trigger API call when filters, search, sort, or pagination changes (debounced)
  useEffect(() => {
    if (activeTab === 'list' && currentMember) {
      const timeoutId = setTimeout(() => {
        fetchMembers(true); // Use advanced search when filters/search/sort change
      }, 300); // Debounce API calls
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortConfig, searchQuery, activeTab, currentMember, pagination.page, pagination.size]);

  const fetchSchools = async () => {
    try {
      const response = await apiService.get('/schools');
      if (response.success && response.data && Array.isArray(response.data)) {
        setSchools(response.data);
      } else {
        console.warn('Invalid schools data received:', response);
        setSchools([]);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
      setSchools([]);
    }
  };

  const fetchMembers = async (useAdvancedSearch = false) => {
    try {
      setLoading(true);
      let response;
      
      if (useAdvancedSearch || Object.values(filters).some(f => f !== '') || searchQuery.trim() || 
          sortConfig.field !== 'lastName' || sortConfig.direction !== 'asc') {
        // Use advanced search API with filters and sorting
        const params = new URLSearchParams();
        
        if (searchQuery.trim()) params.append('search', searchQuery.trim());
        if (filters.school) params.append('schoolId', filters.school);
        if (filters.memberType) params.append('memberType', filters.memberType);
        if (filters.gradeLevel) params.append('gradeLevel', filters.gradeLevel);
        if (filters.department) params.append('department', filters.department);
        if (filters.gender) params.append('gender', filters.gender);
        if (filters.city) params.append('city', filters.city);
        if (filters.state) params.append('state', filters.state);
        if (sortConfig.field) params.append('sortBy', sortConfig.field);
        if (sortConfig.direction) params.append('sortDirection', sortConfig.direction);
        
        // Add pagination parameters
        params.append('page', pagination.page);
        params.append('size', pagination.size);
        
        // For SCHOOL_ADMIN users, automatically filter by their school
        // Backend will handle filtering to show only SCHOOL_USER and SCHOOL_ADMIN members
        if (currentMember && currentMember.role === 'SCHOOL_ADMIN' && currentMember.schoolId) {
          if (!filters.school) {
            params.append('schoolId', currentMember.schoolId);
          }
        }
        
        response = await apiService.get(`/members/advanced-search?${params.toString()}`);
      } else {
        // Use standard members endpoint
        const params = new URLSearchParams();
        params.append('page', pagination.page);
        params.append('size', pagination.size);
        response = await apiService.get(`/members?${params.toString()}`);
      }
      
      if (response.success && response.data && response.data.success && Array.isArray(response.data.data)) {
        let membersData = response.data.data;
        
        // Update pagination info from response
        setPagination(prev => ({
          ...prev,
          totalCount: response.data.totalCount || membersData.length,
          totalPages: response.data.totalPages || 1
        }));
        
        // For SCHOOL_ADMIN users, filter to only show SCHOOL_USER and SCHOOL_ADMIN members from their school
        if (currentMember && currentMember.role === 'SCHOOL_ADMIN' && currentMember.schoolId) {
          membersData = membersData.filter(member => 
            member.schoolId === currentMember.schoolId && 
            (member.role === 'SCHOOL_USER' || member.role === 'SCHOOL_ADMIN')
          );
        }
        
        setMembers(membersData);
        setFilteredMembers(membersData); // Set filtered members directly from API
      } else {
        console.warn('Invalid members data received:', response);
        setMembers([]);
        setFilteredMembers([]);
        setMessage({ type: 'error', text: 'Failed to fetch members - invalid data format' });
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setMembers([]);
      setFilteredMembers([]);
      setMessage({ type: 'error', text: 'An error occurred while fetching members' });
    } finally {
      setLoading(false);
    }
  };

  const fetchInactiveMembers = async () => {
    try {
      setLoadingInactive(true);
      
      // Fetch only inactive members from the backend
      const response = await apiService.get('/members/all?isActive=false');
      
      console.log('Inactive members response:', response);
      console.log('Response data:', response.data);
      console.log('Response data.data:', response.data?.data);
      
      if (response.success && response.data && response.data.success && Array.isArray(response.data.data)) {
        // Backend already filters by school for SCHOOL_ADMIN and by isActive=false
        console.log('Setting inactive members:', response.data.data);
        setInactiveMembers(response.data.data);
      } else {
        console.warn('Invalid members data received:', response);
        setInactiveMembers([]);
        setMessage({ type: 'error', text: 'Failed to fetch inactive members' });
      }
    } catch (error) {
      console.error('Error fetching inactive members:', error);
      setInactiveMembers([]);
      setMessage({ type: 'error', text: 'An error occurred while fetching inactive members' });
    } finally {
      setLoadingInactive(false);
    }
  };

  // Member activation handler

  const handleActivateMember = async (member) => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      const response = await apiService.put(`/members/${member.id}/activate`);
      
      if (response.success) {
        setMessage({ type: 'success', text: `${member.firstName} ${member.lastName} has been activated successfully!` });
        // Refresh inactive members list to show updated status
        fetchInactiveMembers();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to activate member' });
      }
    } catch (error) {
      console.error('Error activating member:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while activating the member' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Member management handlers
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentMember');
    localStorage.removeItem('userEmail');
    window.location.href = '/';
  };

  const handleDeleteClick = (member) => {
    setDeleteModal({ show: true, member });
  };

  const confirmDelete = async () => {
    if (!deleteModal.member) return;

    try {
      const response = await apiService.delete(`/members/${deleteModal.member.id}`);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Member deleted successfully!' });
        setMembers(Array.isArray(members) ? members.filter(member => member.id !== deleteModal.member.id) : []);
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to delete member' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while deleting the member' 
      });
    } finally {
      setDeleteModal({ show: false, member: null });
    }
  };

  const resetMessage = () => {
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="text-primary">
              <i className="fas fa-users me-2"></i>
              Members Management
            </h2>
            <button 
              className="btn btn-outline-danger"
              onClick={handleLogout}
            >
              <i className="fas fa-sign-out-alt me-1"></i>
              Logout
            </button>
          </div>

          {/* Alert Messages */}
          {message.text && (
            <div className={`alert alert-${message.type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`} role="alert">
              {message.text}
              <button type="button" className="btn-close" onClick={resetMessage}></button>
            </div>
          )}

          {/* Navigation Tabs */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'list' ? 'active' : ''}`}
                onClick={() => setActiveTab('list')}
              >
                <i className="fas fa-list me-2"></i>View Members
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'activate' ? 'active' : ''}`}
                onClick={() => setActiveTab('activate')}
              >
                <i className="fas fa-user-check me-2"></i>Activate Member
              </button>
            </li>
          </ul>

          {/* Tab Content */}
          {activeTab === 'list' && (
            <div className="card">
              <div className="card-header">
                <div className="row align-items-center">
                  <div className="col-md-4">
                    <h5 className="card-title mb-0">
                      <i className="fas fa-users me-2"></i>
                      Members Directory
                    </h5>
                  </div>
                  <div className="col-md-4">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4 text-end">
                    <div className="d-flex align-items-center justify-content-end gap-2">
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => setFilterModal({ show: true })}
                      >
                        <i className="fas fa-filter me-2"></i>
                        Filters & Sort
                        {(Object.values(filters).some(f => f !== '') || sortConfig.field !== 'lastName' || sortConfig.direction !== 'asc') && (
                          <span className="badge bg-primary ms-2">Active</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading members...</p>
                  </div>
                ) : Array.isArray(filteredMembers) && filteredMembers.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>School</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Status</th>
                          <th>Details</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map(member => {
                          // Handle both 'isActive' and 'active' field names for backward compatibility
                          const isActive = member.isActive !== undefined ? member.isActive : member.active;
                          const isInactive = isActive === false;
                          
                          return (
                          <tr key={member.id} className={isInactive ? 'table-secondary opacity-75' : ''}>
                            <td>
                              <div className="d-flex align-items-center">
                                <i className={`fas ${member.memberType === 'student' ? 'fa-user-graduate' : 'fa-chalkboard-teacher'} me-2 text-${member.memberType === 'student' ? 'primary' : 'success'}`}></i>
                                <div>
                                  <strong className={isInactive ? 'text-muted' : ''}>
                                    {member.fullName || `${member.firstName} ${member.lastName}`}
                                    {isInactive && <small className="text-danger ms-2">(Inactive)</small>}
                                  </strong>
                                  {member.memberType === 'student' && member.gradeLevel && (
                                    <small className="text-muted d-block">Grade {member.gradeLevel}</small>
                                  )}
                                  {member.memberType === 'teacher' && member.department && (
                                    <small className="text-muted d-block">{member.department}</small>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`badge bg-${member.memberType === 'student' ? 'primary' : 'success'}`}>
                                {member.memberType === 'student' ? 'Student' : 'Teacher'}
                              </span>
                            </td>
                            <td>{member.schoolName}</td>
                            <td>
                              <a href={`mailto:${member.email}`} className="text-decoration-none">
                                {member.email}
                              </a>
                            </td>
                            <td>{member.phoneNumber || 'N/A'}</td>
                            <td>
                              <span className={`badge ${!isInactive ? 'bg-success' : 'bg-secondary'}`}>
                                <i className={`fas ${!isInactive ? 'fa-check-circle' : 'fa-times-circle'} me-1`}></i>
                                {!isInactive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              {member.memberType === 'student' ? (
                                <div>
                                  {member.studentId && <small className="text-muted d-block">ID: {member.studentId}</small>}
                                  {member.parentName && <small className="text-muted d-block">Parent: {member.parentName}</small>}
                                </div>
                              ) : (
                                <div>
                                  {member.employeeId && <small className="text-muted d-block">ID: {member.employeeId}</small>}
                                  {member.position && <small className="text-muted d-block">{member.position}</small>}
                                </div>
                              )}
                            </td>
                            <td>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleDeleteClick(member)}
                                title="Delete Member"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="fas fa-users fa-3x text-muted mb-3"></i>
                    <h5 className="text-muted">No members found</h5>
                    <p className="text-muted">
                      {Object.values(filters).some(f => f !== '') || searchQuery.trim() ? 
                        'No members match your current search or filters.' : 
                        'Start by adding some members to your schools.'}
                    </p>
                  </div>
                )}
                
                {/* Pagination Controls */}
                {!loading && filteredMembers.length > 0 && pagination.totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3 px-3">
                    <div className="text-muted">
                      Showing {pagination.page * pagination.size + 1} to {Math.min((pagination.page + 1) * pagination.size, pagination.totalCount)} of {pagination.totalCount} members
                    </div>
                    <nav>
                      <ul className="pagination mb-0">
                        <li className={`page-item ${pagination.page === 0 ? 'disabled' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => setPagination(prev => ({ ...prev, page: 0 }))}
                            disabled={pagination.page === 0}
                          >
                            <i className="fas fa-angle-double-left"></i>
                          </button>
                        </li>
                        <li className={`page-item ${pagination.page === 0 ? 'disabled' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            disabled={pagination.page === 0}
                          >
                            <i className="fas fa-angle-left"></i>
                          </button>
                        </li>
                        
                        {/* Page numbers */}
                        {[...Array(pagination.totalPages)].map((_, index) => {
                          // Show first page, last page, current page, and pages around current
                          const shouldShow = 
                            index === 0 || 
                            index === pagination.totalPages - 1 || 
                            (index >= pagination.page - 1 && index <= pagination.page + 1);
                          
                          const showEllipsis = 
                            (index === pagination.page - 2 && pagination.page > 2) ||
                            (index === pagination.page + 2 && pagination.page < pagination.totalPages - 3);
                          
                          if (showEllipsis) {
                            return (
                              <li key={index} className="page-item disabled">
                                <span className="page-link">...</span>
                              </li>
                            );
                          }
                          
                          if (!shouldShow) return null;
                          
                          return (
                            <li key={index} className={`page-item ${pagination.page === index ? 'active' : ''}`}>
                              <button 
                                className="page-link" 
                                onClick={() => setPagination(prev => ({ ...prev, page: index }))}
                              >
                                {index + 1}
                              </button>
                            </li>
                          );
                        })}
                        
                        <li className={`page-item ${pagination.page >= pagination.totalPages - 1 ? 'disabled' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            disabled={pagination.page >= pagination.totalPages - 1}
                          >
                            <i className="fas fa-angle-right"></i>
                          </button>
                        </li>
                        <li className={`page-item ${pagination.page >= pagination.totalPages - 1 ? 'disabled' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => setPagination(prev => ({ ...prev, page: pagination.totalPages - 1 }))}
                            disabled={pagination.page >= pagination.totalPages - 1}
                          >
                            <i className="fas fa-angle-double-right"></i>
                          </button>
                        </li>
                      </ul>
                    </nav>
                    <div>
                      <select 
                        className="form-select form-select-sm" 
                        value={pagination.size}
                        onChange={(e) => setPagination(prev => ({ ...prev, size: parseInt(e.target.value), page: 0 }))}
                        style={{ width: 'auto' }}
                      >
                        <option value="10">10 per page</option>
                        <option value="20">20 per page</option>
                        <option value="50">50 per page</option>
                        <option value="100">100 per page</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'activate' && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="fas fa-user-check me-2"></i>Pending Member Activations
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <p className="text-muted">
                    <i className="fas fa-info-circle me-2"></i>
                    New members who have signed up are listed below and require activation before they can login. 
                    Click "Activate" to approve their account.
                  </p>
                </div>
                
                {loadingInactive ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading inactive members...</p>
                  </div>
                ) : inactiveMembers.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Type</th>
                          <th>School</th>
                          <th>Registered On</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inactiveMembers.map(member => (
                          <tr key={member.id} className="table-warning">
                            <td>
                              <i className="fas fa-user me-2 text-warning"></i>
                              {member.firstName} {member.lastName}
                            </td>
                            <td>{member.email}</td>
                            <td>
                              <span className="badge bg-info">
                                {member.memberType || 'N/A'}
                              </span>
                            </td>
                            <td>{member.schoolName}</td>
                            <td>
                              {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleActivateMember(member)}
                                disabled={loading}
                              >
                                <i className="fas fa-check me-1"></i>
                                Activate
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="fas fa-user-check fa-3x text-success mb-3"></i>
                    <h5 className="text-muted">No Pending Activations</h5>
                    <p className="text-muted">
                      All members in your school have been activated.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filter and Sort Modal */}
          {filterModal.show && (
            <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="fas fa-filter me-2"></i>
                      Filter & Sort Members
                    </h5>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={() => setFilterModal({ show: false })}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="row">
                      {/* Filter Section */}
                      <div className="col-md-8">
                        <h6 className="text-primary mb-3">
                          <i className="fas fa-funnel-dollar me-2"></i>
                          Filter Options
                        </h6>
                        <div className="row">
                          <div className="col-md-12">
                            <div className="mb-3">
                              <label className="form-label text-start">Member Type</label>
                              <select 
                                className="form-select"
                                value={filters.memberType}
                                onChange={(e) => setFilters(prev => ({...prev, memberType: e.target.value}))}
                              >
                                <option value="">All Types</option>
                                <option value="student">Students</option>
                                <option value="teacher">Teachers</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Vertical Divider */}
                      <div className="col-md-1 d-flex justify-content-center align-items-center">
                        <div style={{height: '300px', borderLeft: '2px solid #6c757d', opacity: '0.5'}}></div>
                      </div>
                      
                      {/* Sort Section */}
                      <div className="col-md-3">
                        <h6 className="text-success mb-3">
                          <i className="fas fa-sort me-2"></i>
                          Sort Options
                        </h6>
                        <div className="mb-3">
                          <label className="form-label text-start">Sort By</label>
                          <select 
                            className="form-select"
                            value={sortConfig.field}
                            onChange={(e) => setSortConfig(prev => ({...prev, field: e.target.value}))}
                          >
                            <option value="lastName">Last Name</option>
                            <option value="firstName">First Name</option>
                            <option value="email">Email</option>
                            <option value="memberType">Member Type</option>
                            <option value="schoolName">School</option>
                            <option value="gradeLevel">Grade Level</option>
                            <option value="department">Department</option>
                            <option value="dateOfBirth">Date of Birth</option>
                            <option value="city">City</option>
                            <option value="state">State</option>
                          </select>
                        </div>
                        <div className="mb-3">
                          <label className="form-label text-start">Sort Direction</label>
                          <select 
                            className="form-select"
                            value={sortConfig.direction}
                            onChange={(e) => setSortConfig(prev => ({...prev, direction: e.target.value}))}
                          >
                            <option value="asc">Ascending (A-Z)</option>
                            <option value="desc">Descending (Z-A)</option>
                          </select>
                        </div>
                        
                        <div className="mt-4">
                          <button
                            className="btn btn-outline-secondary w-100"
                            onClick={() => {
                              setFilters({
                                school: '',
                                memberType: '',
                                gradeLevel: '',
                                department: '',
                                gender: '',
                                city: '',
                                state: ''
                              });
                              setSortConfig({
                                field: 'lastName',
                                direction: 'asc'
                              });
                              setSearchQuery('');
                            }}
                          >
                            <i className="fas fa-undo me-2"></i>
                            Reset All
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <div className="me-auto">
                      <small className="text-muted">
                        Showing {filteredMembers.length} of {Array.isArray(members) ? members.length : 0} members
                      </small>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setFilterModal({ show: false })}
                    >
                      Close
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={() => setFilterModal({ show: false })}
                    >
                      <i className="fas fa-check me-2"></i>
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteModal.show && (
            <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Confirm Delete</h5>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={() => setDeleteModal({ show: false, member: null })}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <p>Are you sure you want to delete the member:</p>
                    <strong>{deleteModal.member?.fullName || `${deleteModal.member?.firstName} ${deleteModal.member?.lastName}`}</strong>
                    <p className="text-muted mt-2">This action cannot be undone.</p>
                  </div>
                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setDeleteModal({ show: false, member: null })}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      onClick={confirmDelete}
                    >
                      Delete Member
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Members;