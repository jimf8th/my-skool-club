import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const SchoolManagement = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [deleteModal, setDeleteModal] = useState({ show: false, school: null });

  useEffect(() => {
    fetchSchools();
  }, []);

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

  const handleDeleteClick = (school) => {
    setDeleteModal({ show: true, school });
  };

  const confirmDelete = async () => {
    if (!deleteModal.school) return;

    try {
      const response = await apiService.delete(`/schools/${deleteModal.school.id}`);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'School deleted successfully!' });
        // Remove the deleted school from the list
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
        // Update the school's status in the list
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

  const closeModal = () => {
    setDeleteModal({ show: false, school: null });
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading schools...</p>
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
              <i className="fas fa-school me-2"></i>
              School Management
            </h2>
            <button 
              className="btn btn-success"
              onClick={() => window.location.href = '/add-school'}
            >
              <i className="fas fa-plus me-2"></i>
              Add New School
            </button>
          </div>

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

          {schools.length === 0 ? (
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
                    onClick={() => window.location.href = '/add-school'}
                  >
                    <i className="fas fa-plus me-2"></i>
                    Add First School
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="fas fa-list me-2"></i>
                  Schools ({schools.length})
                </h5>
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
                                title="View Details"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              <button 
                                className="btn btn-outline-secondary"
                                title="Edit School"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              {school.active && (
                                <button 
                                  className="btn btn-outline-warning"
                                  onClick={() => handleDeactivate(school.id)}
                                  title="Deactivate School"
                                >
                                  <i className="fas fa-pause"></i>
                                </button>
                              )}
                              <button 
                                className="btn btn-outline-danger"
                                onClick={() => handleDeleteClick(school)}
                                title="Delete School"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
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
    </div>
  );
};

export default SchoolManagement;