import React, { useState } from 'react';
import apiService from '../services/apiService';

const SchoolCard = ({ school, onDelete, onUpdate }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await apiService.delete(`/schools/${school.id}`);
      
      if (response.success) {
        onDelete(school.id);
        setShowDeleteModal(false);
      } else {
        alert(response.message || 'Failed to delete school');
      }
    } catch (error) {
      console.error('Error deleting school:', error);
      alert('An error occurred while deleting the school');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setLoading(true);
    try {
      const response = await apiService.put(`/schools/${school.id}/deactivate`);
      
      if (response.success) {
        onUpdate({ ...school, active: false });
      } else {
        alert(response.message || 'Failed to deactivate school');
      }
    } catch (error) {
      console.error('Error deactivating school:', error);
      alert('An error occurred while deactivating the school');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="card h-100">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h5 className="card-title text-primary">{school.name}</h5>
            <span className={`badge ${school.active ? 'bg-success' : 'bg-danger'}`}>
              {school.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          {school.description && (
            <p className="card-text">{school.description}</p>
          )}
          
          <div className="row text-muted small mb-3">
            {school.type && (
              <div className="col-12 mb-1">
                <i className="fas fa-tag me-2"></i>
                Type: {school.type}
              </div>
            )}
            {school.city && school.state && (
              <div className="col-12 mb-1">
                <i className="fas fa-map-marker-alt me-2"></i>
                {school.city}, {school.state}
              </div>
            )}
            {school.email && (
              <div className="col-12 mb-1">
                <i className="fas fa-envelope me-2"></i>
                {school.email}
              </div>
            )}
            {school.phoneNumber && (
              <div className="col-12 mb-1">
                <i className="fas fa-phone me-2"></i>
                {school.phoneNumber}
              </div>
            )}
          </div>
        </div>
        
        <div className="card-footer bg-transparent">
          <div className="d-flex justify-content-between">
            <div className="btn-group btn-group-sm">
              <button className="btn btn-outline-primary" title="View Details">
                <i className="fas fa-eye"></i>
              </button>
              <button className="btn btn-outline-secondary" title="Edit">
                <i className="fas fa-edit"></i>
              </button>
            </div>
            
            <div className="btn-group btn-group-sm">
              {school.active && (
                <button 
                  className="btn btn-outline-warning"
                  onClick={handleDeactivate}
                  disabled={loading}
                  title="Deactivate School"
                >
                  <i className="fas fa-pause"></i>
                </button>
              )}
              <button 
                className="btn btn-outline-danger"
                onClick={() => setShowDeleteModal(true)}
                disabled={loading}
                title="Delete School"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to permanently delete 
                  <strong> "{school.name}"</strong>?
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
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-trash me-2"></i>
                      Delete School
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SchoolCard;