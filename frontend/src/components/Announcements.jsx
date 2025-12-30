import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);
  const [isSchoolAdmin, setIsSchoolAdmin] = useState(false);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 0,
    size: 10,
    totalCount: 0,
    totalPages: 0
  });
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Get current member from localStorage
    const memberData = localStorage.getItem('currentMember');
    if (memberData) {
      try {
        const member = JSON.parse(memberData);
        setCurrentMember(member);
        setIsSchoolAdmin(member.role === 'SCHOOL_ADMIN');
      } catch (error) {
        console.error('Error parsing member data:', error);
      }
    }
    
    fetchAnnouncements();
  }, [pagination.page, pagination.size]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAnnouncements(pagination.page, pagination.size);
      
      if (response.success) {
        setAnnouncements(response.data || []);
        setPagination(prev => ({
          ...prev,
          totalCount: response.totalCount || 0,
          totalPages: response.totalPages || 0
        }));
      } else {
        setError(response.message || 'Failed to load announcements');
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear all auth data
    localStorage.removeItem('token');
    localStorage.removeItem('currentMember');
    localStorage.removeItem('userEmail');
    
    // Trigger a page reload to refresh navbar state, then redirect to home
    window.location.href = '/';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!formData.content.trim()) {
      errors.content = 'Content is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      let response;
      
      if (editingId) {
        // Update existing announcement
        response = await apiService.updateAnnouncement(editingId, formData);
      } else {
        // Create new announcement
        response = await apiService.createAnnouncement(formData);
      }
      
      if (response.success) {
        // Reset form and refresh list
        setFormData({ title: '', content: '' });
        setShowForm(false);
        setEditingId(null);
        fetchAnnouncements();
        
        // Show success message
        alert(editingId ? 'Announcement updated successfully!' : 'Announcement created successfully!');
      } else {
        setError(response.message || 'Failed to save announcement');
      }
    } catch (error) {
      console.error('Error saving announcement:', error);
      setError('Failed to save announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content
    });
    setShowForm(true);
    setFormErrors({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }
    
    try {
      const response = await apiService.deleteAnnouncement(id);
      
      if (response.success) {
        fetchAnnouncements();
        alert('Announcement deleted successfully!');
      } else {
        setError(response.message || 'Failed to delete announcement');
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      setError('Failed to delete announcement');
    }
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ title: '', content: '' });
    setFormErrors({});
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="text-primary">
              <i className="fas fa-bell me-2"></i>
              Announcements
            </h2>
            <button 
              className="btn btn-outline-danger"
              onClick={handleLogout}
            >
              <i className="fas fa-sign-out-alt me-1"></i>
              Logout
            </button>
          </div>
          
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div></div>
            
            {isSchoolAdmin && !showForm && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                <i className="fas fa-plus me-2"></i>
                New Announcement
              </button>
            )}
          </div>

          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <i className="fas fa-exclamation-circle me-2"></i>
              {error}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setError(null)}
              ></button>
            </div>
          )}

          {/* Add/Edit Form */}
          {isSchoolAdmin && showForm && (
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                  {editingId ? 'Edit Announcement' : 'Create New Announcement'}
                </h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Title *</label>
                    <input
                      type="text"
                      className={`form-control ${formErrors.title ? 'is-invalid' : ''}`}
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter announcement title"
                      disabled={submitting}
                    />
                    {formErrors.title && (
                      <div className="invalid-feedback">{formErrors.title}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Content *</label>
                    <textarea
                      className={`form-control ${formErrors.content ? 'is-invalid' : ''}`}
                      name="content"
                      value={formData.content}
                      onChange={handleInputChange}
                      rows="5"
                      placeholder="Enter announcement content"
                      disabled={submitting}
                    ></textarea>
                    {formErrors.content && (
                      <div className="invalid-feedback">{formErrors.content}</div>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          {editingId ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        <>
                          <i className={`fas ${editingId ? 'fa-save' : 'fa-plus'} me-2`}></i>
                          {editingId ? 'Update' : 'Create'}
                        </>
                      )}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={handleCancelEdit}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Announcements List */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="card">
              <div className="card-body">
                <div className="text-center py-5">
                  <i className="fas fa-bell fa-4x text-muted mb-3"></i>
                  <h4 className="text-muted">No Announcements Yet</h4>
                  <p className="text-muted">
                    {isSchoolAdmin 
                      ? 'Click "New Announcement" to create your first announcement.'
                      : 'Check back later for school announcements.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="row">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="col-12 mb-3">
                    <div className="card" style={{ maxHeight: '250px' }}>
                      <div className="card-body" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1 text-start">
                            <h5 className="card-title text-primary mb-2">
                              {announcement.title}
                            </h5>
                            <p className="card-text text-muted small mb-2">
                              <i className="fas fa-user me-1"></i>
                              Posted by <strong>{announcement.createdByName}</strong>
                              {' • '}
                              <i className="fas fa-clock me-1"></i>
                              {formatDate(announcement.createdAt)}
                              {announcement.updatedAt !== announcement.createdAt && (
                                <span className="ms-2 text-info">
                                  <i className="fas fa-edit me-1"></i>
                                  (Updated: {formatDate(announcement.updatedAt)})
                                </span>
                              )}
                            </p>
                            <p className="card-text" style={{ whiteSpace: 'pre-wrap' }}>
                              {announcement.content}
                            </p>
                          </div>
                          
                          {isSchoolAdmin && currentMember && announcement.createdBy === currentMember.id && (
                            <div className="ms-3">
                              <button
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() => handleEdit(announcement)}
                                title="Edit"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(announcement.id)}
                                title="Delete"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3 px-3">
                  <div className="text-muted">
                    Showing {pagination.page * pagination.size + 1} to {Math.min((pagination.page + 1) * pagination.size, pagination.totalCount)} of {pagination.totalCount} announcements
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
                      <option value="5">5 per page</option>
                      <option value="10">10 per page</option>
                      <option value="20">20 per page</option>
                      <option value="50">50 per page</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Announcements;