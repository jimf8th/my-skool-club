import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const ClubMembersManagement = () => {
  const [currentMember, setCurrentMember] = useState(null);
  const [adminClubs, setAdminClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [clubMembers, setClubMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    action: null,
    actionText: '',
    variant: 'danger' // danger, warning, primary
  });
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 0,
    size: 20,
    totalCount: 0,
    totalPages: 0
  });

  useEffect(() => {
    const memberData = localStorage.getItem('currentMember');
    if (memberData) {
      const member = JSON.parse(memberData);
      setCurrentMember(member);
      fetchAdminClubs(member.id);
    }
  }, []);

  const fetchAdminClubs = async (memberId) => {
    try {
      setLoading(true);
      const response = await apiService.get(`/user-club-roles/member/${memberId}/admin-clubs`);
      if (response.success && response.data) {
        // The response structure is { success, data: [...], count }
        // So we need to access response.data.data for the actual array
        const clubs = Array.isArray(response.data.data) ? response.data.data : (Array.isArray(response.data) ? response.data : []);
        setAdminClubs(clubs);
        // Don't auto-select - let user choose
      } else {
        setAdminClubs([]);
      }
    } catch (error) {
      console.error('Error fetching admin clubs:', error);
      setAdminClubs([]);
      setMessage({ type: 'error', text: 'Failed to load your clubs' });
    } finally {
      setLoading(false);
    }
  };

  const handleClubSelect = async (clubId) => {
    try {
      setLoading(true);
      setSelectedClub(clubId);
      setPagination(prev => ({ ...prev, page: 0 })); // Reset to first page
      
      // Fetch club details
      const clubResponse = await apiService.get(`/clubs/${clubId}`);
      
      // Fetch club members with pagination
      await fetchClubMembers(clubId, 0, pagination.size);
    } catch (error) {
      console.error('Error fetching club members:', error);
      setClubMembers([]);
      setMessage({ type: 'error', text: 'Failed to load club members' });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchClubMembers = async (clubId, page, size) => {
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('size', size);
      
      const membersResponse = await apiService.get(`/user-club-roles/club/${clubId}?${params.toString()}`);
      
      if (membersResponse.success && membersResponse.data) {
        // The response structure is { success, data: [...], count, totalCount, page, size, totalPages }
        const members = Array.isArray(membersResponse.data.data) ? membersResponse.data.data : (Array.isArray(membersResponse.data) ? membersResponse.data : []);
        setClubMembers(members);
        
        // Update pagination info
        setPagination({
          page: membersResponse.data.page || 0,
          size: membersResponse.data.size || size,
          totalCount: membersResponse.data.totalCount || members.length,
          totalPages: membersResponse.data.totalPages || 1
        });
      } else {
        setClubMembers([]);
        setPagination(prev => ({ ...prev, totalCount: 0, totalPages: 0 }));
      }
    } catch (error) {
      console.error('Error fetching club members:', error);
      setClubMembers([]);
      throw error;
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    setModalConfig({
      title: 'Remove Member',
      message: `Are you sure you want to remove ${memberName} from this club? This action cannot be undone.`,
      action: async () => {
        try {
          const response = await apiService.delete(`/user-club-roles/${memberId}/${selectedClub}`);
          if (response.success) {
            setMessage({ type: 'success', text: 'Member removed successfully' });
            // Refresh members list - stay on current page
            await fetchClubMembers(selectedClub, pagination.page, pagination.size);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
          } else {
            setMessage({ type: 'error', text: response.message || 'Failed to remove member' });
          }
        } catch (error) {
          console.error('Error removing member:', error);
          setMessage({ type: 'error', text: 'An error occurred while removing the member' });
        }
      },
      actionText: 'Remove Member',
      variant: 'danger'
    });
    setShowModal(true);
  };

  const handlePromoteToAdmin = async (memberId, memberName) => {
    setModalConfig({
      title: 'Promote to Admin',
      message: `Are you sure you want to promote ${memberName} to CLUB_ADMIN? They will have full administrative privileges for this club.`,
      action: async () => {
        try {
          const response = await apiService.put(`/user-club-roles/${memberId}/${selectedClub}`, {
            clubRole: 'CLUB_ADMIN'
          });
          
          if (response.success) {
            setMessage({ type: 'success', text: 'Member promoted to admin successfully' });
            // Refresh members list
            await fetchClubMembers(selectedClub, pagination.page, pagination.size);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
          } else {
            setMessage({ type: 'error', text: response.message || 'Failed to promote member' });
          }
        } catch (error) {
          console.error('Error promoting member:', error);
          setMessage({ type: 'error', text: 'An error occurred while promoting the member' });
        }
      },
      actionText: 'Promote to Admin',
      variant: 'primary'
    });
    setShowModal(true);
  };

  const handleDemoteToUser = async (memberId, memberName) => {
    setModalConfig({
      title: 'Demote to User',
      message: `Are you sure you want to demote ${memberName} to CLUB_USER? They will lose their administrative privileges.`,
      action: async () => {
        try {
          const response = await apiService.put(`/user-club-roles/${memberId}/${selectedClub}`, {
            clubRole: 'CLUB_USER'
          });
          
          if (response.success) {
            setMessage({ type: 'success', text: 'Member demoted to user successfully' });
            // Refresh members list
            await fetchClubMembers(selectedClub, pagination.page, pagination.size);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
          } else {
            setMessage({ type: 'error', text: response.message || 'Failed to demote member' });
          }
        } catch (error) {
          console.error('Error demoting member:', error);
          setMessage({ type: 'error', text: 'An error occurred while demoting the member' });
        }
      },
      actionText: 'Demote to User',
      variant: 'warning'
    });
    setShowModal(true);
  };

  const getSelectedClubName = () => {
    const club = adminClubs.find(c => c.clubId === selectedClub);
    return club ? club.clubName : '';
  };

  if (!currentMember) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Please log in to access this page.
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          <h2 className="text-primary mb-4">
            <i className="fas fa-users-cog me-2"></i>
            Club Members Management
          </h2>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`} role="alert">
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
        </div>
      )}

      {loading && adminClubs.length === 0 ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading your clubs...</p>
        </div>
      ) : adminClubs.length === 0 ? (
        <div className="alert alert-info">
          <i className="fas fa-info-circle me-2"></i>
          You are not an admin of any clubs. You need CLUB_ADMIN privileges to manage club members.
        </div>
      ) : !selectedClub ? (
        // Step 1: Club Selection
        <div className="row">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">
                  <i className="fas fa-hand-pointer me-2"></i>
                  Step 1: Select a Club to Manage
                </h4>
              </div>
              <div className="card-body">
                <p className="text-muted mb-4">
                  Choose one of your clubs below to view and manage its members.
                </p>
                <div className="row g-3">
                  {adminClubs.map((club) => (
                    <div key={club.clubId} className="col-md-4">
                      <div 
                        className="card h-100 club-card-hover" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleClubSelect(club.clubId)}
                      >
                        <div className="card-body text-center">
                          <div className="mb-3">
                            <i className="fas fa-users fa-3x text-primary"></i>
                          </div>
                          <h5 className="card-title">{club.clubName}</h5>
                          <p className="card-text text-muted small">
                            <i className="fas fa-school me-1"></i>
                            {club.schoolName}
                          </p>
                          <button className="btn btn-primary btn-sm mt-2">
                            <i className="fas fa-arrow-right me-1"></i>
                            Manage Members
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Step 2: Members Management
        <div className="row">
          <div className="col-12">
            <button 
              className="btn btn-outline-secondary mb-3"
              onClick={() => {
                setSelectedClub(null);
                setClubMembers([]);
                setPagination({ page: 0, size: 20, totalCount: 0, totalPages: 0 });
              }}
            >
              <i className="fas fa-arrow-left me-2"></i>
              Back to Club Selection
            </button>
          </div>
          <div className="col-12">
            {selectedClub && (
              <div className="card">
                <div className="card-header bg-success text-white">
                  <h5 className="mb-0">
                    <i className="fas fa-users me-2"></i>
                    Members of {getSelectedClubName()}
                  </h5>
                </div>
                <div className="card-body">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading members...</span>
                      </div>
                    </div>
                  ) : clubMembers.length === 0 ? (
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle me-2"></i>
                      No members in this club yet.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Member Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Member Type</th>
                            <th>Status</th>
                            <th>Joined Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clubMembers.map((member) => (
                            <tr key={member.id}>
                              <td>
                                <i className="fas fa-user me-2 text-muted"></i>
                                {member.memberName}
                              </td>
                              <td>{member.memberEmail}</td>
                              <td>
                                <span className={`badge ${member.clubRole === 'CLUB_ADMIN' ? 'bg-danger' : 'bg-info'}`}>
                                  {member.clubRole}
                                </span>
                              </td>
                              <td>
                                <span className="badge bg-secondary">
                                  {member.memberType}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${member.active ? 'bg-success' : 'bg-warning'}`}>
                                  {member.active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td>
                                {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '-'}
                              </td>
                              <td>
                                <div className="btn-group btn-group-sm" role="group">
                                  {member.clubRole === 'CLUB_USER' ? (
                                    <button
                                      className="btn btn-outline-danger"
                                      onClick={() => handleRemoveMember(member.memberId, member.memberName)}
                                      title="Remove from Club"
                                    >
                                      <i className="fas fa-user-times"></i>
                                    </button>
                                  ) : (
                                    <span className="badge bg-secondary" title="Admins cannot be removed from this page">
                                      <i className="fas fa-shield-alt me-1"></i>
                                      Admin
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {/* Pagination Controls */}
                  {!loading && clubMembers.length > 0 && pagination.totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3 px-3">
                      <div className="text-muted">
                        Showing {pagination.page * pagination.size + 1} to {Math.min((pagination.page + 1) * pagination.size, pagination.totalCount)} of {pagination.totalCount} members
                      </div>
                      <nav>
                        <ul className="pagination mb-0">
                          <li className={`page-item ${pagination.page === 0 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => {
                                setPagination(prev => ({ ...prev, page: 0 }));
                                fetchClubMembers(selectedClub, 0, pagination.size);
                              }}
                              disabled={pagination.page === 0}
                            >
                              <i className="fas fa-angle-double-left"></i>
                            </button>
                          </li>
                          <li className={`page-item ${pagination.page === 0 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => {
                                const newPage = pagination.page - 1;
                                setPagination(prev => ({ ...prev, page: newPage }));
                                fetchClubMembers(selectedClub, newPage, pagination.size);
                              }}
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
                                  onClick={() => {
                                    setPagination(prev => ({ ...prev, page: index }));
                                    fetchClubMembers(selectedClub, index, pagination.size);
                                  }}
                                >
                                  {index + 1}
                                </button>
                              </li>
                            );
                          })}
                          
                          <li className={`page-item ${pagination.page >= pagination.totalPages - 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => {
                                const newPage = pagination.page + 1;
                                setPagination(prev => ({ ...prev, page: newPage }));
                                fetchClubMembers(selectedClub, newPage, pagination.size);
                              }}
                              disabled={pagination.page >= pagination.totalPages - 1}
                            >
                              <i className="fas fa-angle-right"></i>
                            </button>
                          </li>
                          <li className={`page-item ${pagination.page >= pagination.totalPages - 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => {
                                const lastPage = pagination.totalPages - 1;
                                setPagination(prev => ({ ...prev, page: lastPage }));
                                fetchClubMembers(selectedClub, lastPage, pagination.size);
                              }}
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
                          onChange={(e) => {
                            const newSize = parseInt(e.target.value);
                            setPagination(prev => ({ ...prev, size: newSize, page: 0 }));
                            fetchClubMembers(selectedClub, 0, newSize);
                          }}
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
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showModal && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
          onClick={() => setShowModal(false)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`fas ${
                    modalConfig.variant === 'danger' ? 'fa-exclamation-triangle text-danger' :
                    modalConfig.variant === 'warning' ? 'fa-exclamation-circle text-warning' :
                    'fa-check-circle text-primary'
                  } me-2`}></i>
                  {modalConfig.title}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">{modalConfig.message}</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowModal(false)}
                >
                  <i className="fas fa-times me-1"></i>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className={`btn btn-${modalConfig.variant}`}
                  onClick={async () => {
                    setShowModal(false);
                    if (modalConfig.action) {
                      await modalConfig.action();
                    }
                  }}
                >
                  <i className={`fas ${
                    modalConfig.variant === 'danger' ? 'fa-trash' :
                    modalConfig.variant === 'warning' ? 'fa-arrow-down' :
                    'fa-arrow-up'
                  } me-1`}></i>
                  {modalConfig.actionText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .club-card-hover {
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }
        .club-card-hover:hover {
          transform: translateY(-5px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          border-color: #0d6efd;
        }
      `}</style>
    </div>
  );
};

export default ClubMembersManagement;
