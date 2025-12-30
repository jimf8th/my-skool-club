import React, { useState } from 'react';
import apiService from '../services/apiService';

const DeleteSchoolButton = ({ 
  school, 
  onSuccess, 
  onError, 
  size = 'sm', 
  variant = 'outline-danger',
  showText = false 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await apiService.delete(`/schools/${school.id}`);
      
      if (response.success) {
        if (onSuccess) {
          onSuccess(school.id, 'School deleted successfully!');
        }
        setShowModal(false);
      } else {
        if (onError) {
          onError(response.message || 'Failed to delete school');
        }
      }
    } catch (error) {
      console.error('Error deleting school:', error);
      if (onError) {
        onError(error.response?.data?.message || error.message || 'An error occurred while deleting the school');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className={`btn btn-${variant} ${size !== 'normal' ? `btn-${size}` : ''}`}
        onClick={() => setShowModal(true)}
        disabled={loading}
        title="Delete School"
      >
        <i className="fas fa-trash"></i>
        {showText && <span className="ms-1">Delete</span>}
      </button>

      {/* Delete Confirmation Modal */}
      {showModal && (
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
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to permanently delete the school 
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
                  onClick={() => setShowModal(false)}
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

export default DeleteSchoolButton;