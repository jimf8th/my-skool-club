import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiService';

const InvoicesManagement = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [invoices, setInvoices] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [memberClubRoles, setMemberClubRoles] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [accessibleClubs, setAccessibleClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, invoice: null });
  const [viewModal, setViewModal] = useState({ show: false, invoice: null });
  const [editModal, setEditModal] = useState({ show: false, invoice: null });
  const [approvalModal, setApprovalModal] = useState({ show: false, invoice: null, action: '' });
  const [rejectionReason, setRejectionReason] = useState('');
  const [editInvoice, setEditInvoice] = useState({
    invoiceNumber: '',
    clubId: '',
    clubName: '',
    issueDate: '',
    dueDate: '',
    status: 'DRAFT',
    billToName: '',
    billToEmail: '',
    billToAddress: '',
    notes: '',
    lineItems: [{ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]
  });
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  
  // Advanced search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [_searchLoading, setSearchLoading] = useState(false);
  const [filterModal, setFilterModal] = useState({ show: false });
  const [filters, setFilters] = useState({
    club: '',
    status: '',
    issueDateFrom: '',
    issueDateTo: '',
    dueDateFrom: '',
    dueDateTo: '',
    minAmount: '',
    maxAmount: ''
  });
  const [sortConfig, setSortConfig] = useState({
    field: 'invoiceNumber',
    direction: 'asc'
  });
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    size: 10,
    hasNext: false,
    hasPrevious: false
  });
  
  // Pagination state for pending approval tab
  const [pendingApprovalPagination, setPendingApprovalPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    size: 10,
    hasNext: false,
    hasPrevious: false
  });
  
  // Form state for adding new invoice
  const [newInvoice, setNewInvoice] = useState({
    invoiceNumber: '',
    clubId: '',
    clubName: '',
    issueDate: '',
    dueDate: '',
    status: 'DRAFT',
    billToName: '',
    billToEmail: '',
    billToAddress: '',
    notes: '',
    lineItems: [{ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]
  });
  const [formLoading, setFormLoading] = useState(false);

  // Fetch invoices function with pagination
  const fetchInvoices = useCallback(async (page = 0, size = 10) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
        sortBy: sortConfig.field,
        sortDirection: sortConfig.direction
      });
      
      const response = await apiService.get(`/invoices?${params.toString()}`);
      if (response.success && response.data && Array.isArray(response.data.data)) {
        setInvoices(response.data.data);
        setPagination({
          currentPage: response.data.currentPage || 0,
          totalPages: response.data.totalPages || 0,
          totalElements: response.data.totalElements || 0,
          size: response.data.size || 10,
          hasNext: response.data.hasNext || false,
          hasPrevious: response.data.hasPrevious || false
        });
      } else {
        console.warn('Invalid invoices data received:', response);
        setInvoices([]);
        setMessage({ type: 'error', text: 'Failed to fetch invoices - invalid data format' });
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
      setMessage({ type: 'error', text: 'An error occurred while fetching invoices' });
    } finally {
      setLoading(false);
    }
  }, [sortConfig.field, sortConfig.direction]);

  // Fetch pending invoices function
  const fetchPendingInvoices = useCallback(async (page = 0, size = 10) => {
    try {
      setLoading(true);
      const response = await apiService.getInvoicesPendingApproval(page, size);
      if (response.success && response.data) {
        // Check if response has pagination metadata
        if (response.data.currentPage !== undefined || response.data.totalPages !== undefined) {
          // Response has pagination fields directly
          setPendingInvoices(Array.isArray(response.data.data) ? response.data.data : response.data);
          setPendingApprovalPagination({
            currentPage: response.data.currentPage || page,
            totalPages: response.data.totalPages || 0,
            totalElements: response.data.totalElements || 0,
            size: response.data.size || size,
            hasNext: response.data.hasNext || false,
            hasPrevious: response.data.hasPrevious || false
          });
        } else if (Array.isArray(response.data)) {
          // Handle case where data is directly an array (legacy, non-paginated)
          setPendingInvoices(response.data);
          setPendingApprovalPagination({
            currentPage: 0,
            totalPages: 1,
            totalElements: response.data.length,
            size: response.data.length,
            hasNext: false,
            hasPrevious: false
          });
        } else {
          console.warn('Invalid pending invoices data received:', response);
          setPendingInvoices([]);
          setMessage({ type: 'error', text: response.data?.message || 'Failed to fetch pending invoices - invalid data format' });
        }
      }
    } catch (error) {
      console.error('Error fetching pending invoices:', error);
      setPendingInvoices([]);
      setMessage({ type: 'error', text: 'An error occurred while fetching pending invoices' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClubs();
    fetchMemberClubRoles();
    fetchAccessibleClubs();
    if (selectedClub && activeTab === 'list') {
      fetchInvoices();
    } else if (selectedClub && activeTab === 'pending-approval') {
      fetchPendingInvoices();
    }
  }, [activeTab, selectedClub, fetchInvoices, fetchPendingInvoices]);

  useEffect(() => {
    // Debounce search to avoid triggering on every keystroke
    const timer = setTimeout(() => {
      // If any advanced filters are applied, use advanced search
      const hasAdvancedFilters = searchQuery.trim() || filters.club || filters.status || 
                                filters.issueDateFrom || filters.issueDateTo || filters.dueDateFrom || 
                                filters.dueDateTo || filters.minAmount || filters.maxAmount ||
                                sortConfig.field !== 'invoiceNumber' || sortConfig.direction !== 'asc';
                                
      if (hasAdvancedFilters) {
        // Advanced search invoices function
        const searchInvoices = async () => {
          try {
            setSearchLoading(true);
            
            const params = new URLSearchParams();
            if (searchQuery.trim()) params.append('search', searchQuery.trim());
          if (filters.club) params.append('clubId', filters.club);
          if (filters.status) params.append('status', filters.status);
          if (filters.issueDateFrom) params.append('issueDateFrom', filters.issueDateFrom);
          if (filters.issueDateTo) params.append('issueDateTo', filters.issueDateTo);
          if (filters.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
          if (filters.dueDateTo) params.append('dueDateTo', filters.dueDateTo);
          if (filters.minAmount) params.append('minAmount', filters.minAmount);
          if (filters.maxAmount) params.append('maxAmount', filters.maxAmount);
          if (sortConfig.field) params.append('sortBy', sortConfig.field);
          if (sortConfig.direction) params.append('sortDirection', sortConfig.direction);
          
          const response = await apiService.get(`/invoices/advanced-search?${params.toString()}`);
          
          if (response.success && response.data && response.data.data && Array.isArray(response.data.data)) {
            setFilteredInvoices(response.data.data);
          } else {
            console.warn('Invalid search results:', response);
            setFilteredInvoices([]);
          }
        } catch (error) {
          console.error('Error searching invoices:', error);
          setFilteredInvoices([]);
          setMessage({ type: 'error', text: 'An error occurred while searching invoices' });
        } finally {
          setSearchLoading(false);
        }
      };
      
      searchInvoices();
      } else {
        // Default behavior - show all invoices
        const invoicesArray = Array.isArray(invoices) ? invoices : [];
        setFilteredInvoices(invoicesArray);
      }
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [invoices, searchQuery, filters, sortConfig]);

  const fetchClubs = async () => {
    try {
      const response = await apiService.get('/clubs');
      if (response.success && response.data && response.data.success && Array.isArray(response.data.data)) {
        setClubs(response.data.data);
      } else {
        console.warn('Invalid clubs data received:', response);
        setClubs([]);
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
      setClubs([]);
    }
  };

  const fetchMemberClubRoles = async () => {
    try {
      const response = await apiService.getMemberClubRoles();
      if (response.success && response.data && response.data.data) {
        setMemberClubRoles(response.data.data);
      } else {
        setMemberClubRoles([]);
      }
    } catch (error) {
      console.error('Error fetching member club roles:', error);
      setMemberClubRoles([]);
    }
  };

  const fetchAccessibleClubs = async () => {
    try {
      setLoadingClubs(true);
      const currentMember = JSON.parse(localStorage.getItem('currentMember') || '{}');
      
      if (!currentMember || !currentMember.id) {
        setAccessibleClubs([]);
        return;
      }

      // Fetch clubs where user is admin or member
      const response = await apiService.get(`/user-club-roles/member/${currentMember.id}`);
      const rolesData = response.data?.data || response.data;
      
      if (response.success && rolesData && Array.isArray(rolesData)) {
        setAccessibleClubs(rolesData);
      } else {
        setAccessibleClubs([]);
      }
    } catch (error) {
      console.error('Error fetching accessible clubs:', error);
      setAccessibleClubs([]);
    } finally {
      setLoadingClubs(false);
    }
  };

  // Check if current user can approve invoices for a specific club
  const canApproveInvoice = (invoice) => {
    const currentMember = JSON.parse(localStorage.getItem('currentMember') || '{}');
    
    if (!currentMember || !invoice) return false;
    
    // APP_ADMIN can approve all invoices
    if (currentMember.role === 'APP_ADMIN') return true;
    
    // Check if user has CLUB_ADMIN role for this specific club
    if (Array.isArray(memberClubRoles)) {
      const clubRole = memberClubRoles.find(role => role.clubId === invoice.clubId);
      if (clubRole && clubRole.clubRole === 'CLUB_ADMIN') {
        return true;
      }
    }
    
    return false;
  };

  // Form handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'clubId') {
      const selectedClubObj = Array.isArray(clubs) ? 
        clubs.find(club => club.id === value) : null;
      setNewInvoice(prev => ({
        ...prev,
        clubId: value,
        clubName: selectedClubObj ? selectedClubObj.name : ''
      }));
    } else {
      setNewInvoice(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleLineItemChange = (index, field, value) => {
    const updatedLineItems = [...newInvoice.lineItems];
    updatedLineItems[index][field] = value;
    
    // Calculate total price for this line item
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = parseFloat(updatedLineItems[index].quantity) || 0;
      const unitPrice = parseFloat(updatedLineItems[index].unitPrice) || 0;
      updatedLineItems[index].totalPrice = quantity * unitPrice;
    }
    
    setNewInvoice(prev => ({
      ...prev,
      lineItems: updatedLineItems
    }));
  };

  const addLineItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]
    }));
  };

  const removeLineItem = (index) => {
    if (newInvoice.lineItems.length > 1) {
      setNewInvoice(prev => ({
        ...prev,
        lineItems: prev.lineItems.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateInvoiceTotal = () => {
    return newInvoice.lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };

  // Edit form handlers
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditInvoice(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditLineItemChange = (index, field, value) => {
    const updatedLineItems = [...editInvoice.lineItems];
    updatedLineItems[index] = {
      ...updatedLineItems[index],
      [field]: value
    };
    
    // Auto-calculate total price when quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = parseFloat(updatedLineItems[index].quantity) || 0;
      const unitPrice = parseFloat(updatedLineItems[index].unitPrice) || 0;
      updatedLineItems[index].totalPrice = quantity * unitPrice;
    }
    
    setEditInvoice(prev => ({
      ...prev,
      lineItems: updatedLineItems
    }));
  };

  const addEditLineItem = () => {
    setEditInvoice(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]
    }));
  };

  const removeEditLineItem = (index) => {
    if (editInvoice.lineItems.length > 1) {
      setEditInvoice(prev => ({
        ...prev,
        lineItems: prev.lineItems.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateEditInvoiceTotal = () => {
    return editInvoice.lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      // Calculate totals before submitting
      const invoiceData = {
        ...editInvoice,
        lineItems: editInvoice.lineItems.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
          totalPrice: parseFloat(item.totalPrice) || 0
        }))
      };
      
      const response = await apiService.put(`/invoices/${editInvoice.id}`, invoiceData);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Invoice updated successfully!' });
        // Refresh the invoices list
        fetchInvoices();
        closeModal();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to update invoice' });
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while updating the invoice' 
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      // Calculate totals before submitting
      const invoiceData = {
        ...newInvoice,
        lineItems: newInvoice.lineItems.map(item => ({
          ...item,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          totalPrice: parseFloat(item.totalPrice)
        }))
      };
      
      const response = await apiService.post('/invoices', invoiceData);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Invoice created successfully!' });
        // Reset form
        setNewInvoice({
          invoiceNumber: '',
          clubId: '',
          clubName: '',
          issueDate: '',
          dueDate: '',
          status: 'PENDING',
          billToName: '',
          billToEmail: '',
          billToAddress: '',
          notes: '',
          lineItems: [{ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]
        });
        // Refresh the invoices list
        if (activeTab === 'list') {
          fetchInvoices();
        }
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to create invoice' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while creating the invoice' 
      });
    } finally {
      setFormLoading(false);
    }
  };

  // Invoice management handlers
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentMember');
    localStorage.removeItem('userEmail');
    window.location.href = '/';
  };

  const handleViewClick = (invoice) => {
    setViewModal({ show: true, invoice });
  };

  const handleEditClick = (invoice) => {
    setEditInvoice({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber || '',
      clubId: invoice.clubId || '',
      clubName: invoice.clubName || '',
      issueDate: invoice.issueDate || '',
      dueDate: invoice.dueDate || '',
      status: invoice.status || 'DRAFT',
      billToName: invoice.billToName || '',
      billToEmail: invoice.billToEmail || '',
      billToAddress: invoice.billToAddress || '',
      notes: invoice.notes || '',
      lineItems: invoice.lineItems && invoice.lineItems.length > 0 
        ? invoice.lineItems.map(item => ({
            description: item.description || '',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || 0
          }))
        : [{ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]
    });
    setEditModal({ show: true, invoice });
  };

  const handleDeleteClick = (invoice) => {
    setDeleteModal({ show: true, invoice });
  };

  // Approval handlers
  const handleApproveClick = (invoice) => {
    setApprovalModal({ show: true, invoice, action: 'approve' });
  };

  const handleRejectClick = (invoice) => {
    setApprovalModal({ show: true, invoice, action: 'reject' });
    setRejectionReason('');
  };

  const handleSubmitForApproval = async (invoice) => {
    try {
      setLoading(true);
      const response = await apiService.submitInvoiceForApproval(invoice.id);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Invoice submitted for approval successfully!' });
        fetchInvoices(); // Refresh the list
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to submit invoice for approval.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error submitting invoice for approval.' });
    } finally {
      setLoading(false);
    }
  };

  const confirmApproval = async () => {
    try {
      setLoading(true);
      const response = await apiService.approveInvoice(approvalModal.invoice.id);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Invoice approved successfully!' });
        setApprovalModal({ show: false, invoice: null, action: '' });
        
        // Refresh the appropriate list based on current tab
        if (activeTab === 'pending-approval') {
          fetchPendingInvoices();
        } else {
          fetchInvoices();
        }
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to approve invoice.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error approving invoice.' });
    } finally {
      setLoading(false);
    }
  };

  const confirmRejection = async () => {
    if (!rejectionReason.trim()) {
      setMessage({ type: 'error', text: 'Please provide a reason for rejection.' });
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.rejectInvoice(approvalModal.invoice.id, rejectionReason);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Invoice rejected successfully!' });
        setApprovalModal({ show: false, invoice: null, action: '' });
        setRejectionReason('');
        
        // Refresh the appropriate list based on current tab
        if (activeTab === 'pending-approval') {
          fetchPendingInvoices();
        } else {
          fetchInvoices();
        }
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to reject invoice.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error rejecting invoice.' });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.invoice) return;

    try {
      const response = await apiService.delete(`/invoices/${deleteModal.invoice.id}`);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Invoice deleted successfully!' });
        setInvoices(Array.isArray(invoices) ? invoices.filter(invoice => invoice.id !== deleteModal.invoice.id) : []);
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to delete invoice' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while deleting the invoice' 
      });
    } finally {
      closeModal();
    }
  };

  const closeModal = () => {
    setDeleteModal({ show: false, invoice: null });
    setViewModal({ show: false, invoice: null });
    setEditModal({ show: false, invoice: null });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'DRAFT': return 'bg-secondary';
      case 'PENDING': return 'bg-warning';
      case 'PENDING_APPROVAL': return 'bg-warning';
      case 'APPROVED': return 'bg-success';
      case 'REJECTED': return 'bg-danger';
      case 'SENT': return 'bg-primary';
      case 'PAID': return 'bg-success';
      case 'OVERDUE': return 'bg-danger';
      case 'CANCELLED': return 'bg-dark';
      default: return 'bg-secondary';
    }
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="text-primary">
              <i className="fas fa-file-invoice-dollar me-2"></i>
              Invoices Management
            </h2>
            <button 
              className="btn btn-outline-danger"
              onClick={handleLogout}
            >
              <i className="fas fa-sign-out-alt me-1"></i>
              Logout
            </button>
          </div>

          {/* Success/Error Messages */}
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

          {/* Club Selection View */}
          {!selectedClub ? (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="fas fa-users me-2"></i>
                  Select a Club
                </h5>
              </div>
              <div className="card-body">
                {loadingClubs ? (
                  <div className="text-center py-5">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading your clubs...</p>
                  </div>
                ) : accessibleClubs.length === 0 ? (
                  <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    You don't have access to any clubs yet.
                  </div>
                ) : (
                  <div className="row">
                    {accessibleClubs.map(clubRole => (
                      <div key={clubRole.id} className="col-md-6 col-lg-4 mb-3">
                        <div 
                          className={`card h-100 ${clubRole.clubRole === 'CLUB_ADMIN' ? 'border-primary' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedClub(clubRole)}
                        >
                          {clubRole.clubRole === 'CLUB_ADMIN' && (
                            <div className="card-header bg-primary text-white py-1">
                              <small>
                                <i className="fas fa-star me-1"></i>
                                Admin Access
                              </small>
                            </div>
                          )}
                          <div className="card-body">
                            <h5 className="card-title">
                              {clubRole.clubRole === 'CLUB_ADMIN' && (
                                <i className="fas fa-shield-alt text-primary me-2"></i>
                              )}
                              {clubRole.clubName}
                            </h5>
                            <p className="text-muted mb-2">
                              <i className="fas fa-school me-1"></i>
                              {clubRole.schoolName}
                            </p>
                            <span className={`badge ${clubRole.clubRole === 'CLUB_ADMIN' ? 'bg-primary' : 'bg-secondary'}`}>
                              {clubRole.clubRole === 'CLUB_ADMIN' ? 'Admin' : 'Member'}
                            </span>
                          </div>
                          <div className="card-footer text-center">
                            <small className="text-primary">
                              <i className="fas fa-arrow-right me-1"></i>
                              Click to manage invoices
                            </small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Selected Club Header */}
              <div className="alert alert-info d-flex justify-content-between align-items-center">
                <div>
                  <i className="fas fa-info-circle me-2"></i>
                  Managing invoices for: <strong>{selectedClub.clubName}</strong>
                  {selectedClub.clubRole === 'CLUB_ADMIN' && (
                    <span className="badge bg-primary ms-2">Admin</span>
                  )}
                </div>
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => {
                    setSelectedClub(null);
                    setActiveTab('list');
                  }}
                >
                  <i className="fas fa-exchange-alt me-1"></i>
                  Change Club
                </button>
              </div>

              {/* Tab Navigation */}
              <ul className="nav nav-tabs mb-4" id="invoicesTabs" role="tablist">
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link ${activeTab === 'list' ? 'active' : ''}`}
                    onClick={() => setActiveTab('list')}
                    type="button" 
                    role="tab"
                  >
                    <i className="fas fa-list me-2"></i>
                    Manage Invoices
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link ${activeTab === 'pending-approval' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending-approval')}
                    type="button" 
                    role="tab"
                  >
                    <i className="fas fa-clock me-2"></i>
                    Pending Approval
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link ${activeTab === 'add' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('add');
                      // Pre-populate club info when switching to add tab
                      if (selectedClub) {
                        setNewInvoice(prev => ({
                          ...prev,
                          status: 'PENDING',
                          clubId: selectedClub.clubId,
                          clubName: selectedClub.clubName
                        }));
                      }
                    }}
                    type="button" 
                    role="tab"
                  >
                    <i className="fas fa-plus me-2"></i>
                    Add New Invoice
                  </button>
            </li>
          </ul>

          {/* Tab Content */}
          <div className="tab-content" id="invoicesTabContent">
            
            {/* Invoices List Tab */}
            {activeTab === 'list' && (
              <div className="tab-pane fade show active">
                {/* Search and Filter Bar - Always visible */}
                <div className="card mb-3">
                  <div className="card-header">
                    <div className="row align-items-center">
                      <div className="col-md-4">
                        <h5 className="card-title mb-0">
                          <i className="fas fa-file-invoice me-2"></i>
                          Invoices Directory
                        </h5>
                      </div>
                      <div className="col-md-4">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search invoices..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="col-md-4 text-end">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => setFilterModal({ show: true })}
                        >
                          <i className="fas fa-filter me-2"></i>
                          Filters & Sort
                          {(Object.values(filters).some(f => f !== '') || sortConfig.field !== 'invoiceNumber' || sortConfig.direction !== 'asc') && (
                            <span className="badge bg-primary ms-2">Active</span>
                          )}
                        </button>
                        <button 
                          className="btn btn-primary btn-sm ms-2"
                          onClick={() => setActiveTab('add')}
                        >
                          <i className="fas fa-plus me-2"></i>
                          Add New
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading invoices...</p>
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="card">
                    <div className="card-body">
                      <div className="text-center py-5">
                        <i className="fas fa-file-invoice fa-4x text-muted mb-3"></i>
                        <h4 className="text-muted">No Invoices Found</h4>
                        <p className="text-muted">
                          {(searchQuery || filters.club || filters.status || filters.issueDateFrom || filters.issueDateTo || filters.dueDateFrom || filters.dueDateTo || filters.minAmount || filters.maxAmount)
                            ? 'No invoices found matching your search criteria. Try adjusting your filters.'
                            : 'No invoices have been created yet. Add your first invoice to get started.'
                          }
                        </p>
                        <button 
                          className="btn btn-primary"
                          onClick={() => setActiveTab('add')}
                        >
                          <i className="fas fa-plus me-2"></i>
                          Add First Invoice
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card">
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Invoice #</th>
                              <th>Club</th>
                              <th>Bill To</th>
                              <th>Issue Date</th>
                              <th>Due Date</th>
                              <th>Status</th>
                              <th>Total</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(filteredInvoices) && filteredInvoices.map((invoice) => (
                              <tr key={invoice.id}>
                                <td>
                                  <strong>{invoice.invoiceNumber}</strong>
                                  {invoice.notes && (
                                    <div className="small text-muted">{invoice.notes.substring(0, 50)}...</div>
                                  )}
                                </td>
                                <td>
                                  <small className="text-muted">{invoice.clubName}</small>
                                </td>
                                <td>
                                  {invoice.billToName ? (
                                    <div>
                                      <div>{invoice.billToName}</div>
                                      {invoice.billToEmail && (
                                        <small className="text-muted">{invoice.billToEmail}</small>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>{formatDate(invoice.issueDate)}</td>
                                <td>{formatDate(invoice.dueDate)}</td>
                                <td>
                                  <span className={`badge ${getStatusBadgeClass(invoice.status)}`}>
                                    {invoice.status || 'DRAFT'}
                                  </span>
                                </td>
                                <td>
                                  <strong>{formatCurrency(invoice.totalAmount)}</strong>
                                </td>
                                <td>
                                  <div className="btn-group" role="group">
                                    <button 
                                      className="btn btn-sm btn-outline-primary"
                                      title="View Invoice"
                                      onClick={() => handleViewClick(invoice)}
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                    
                                    {/* Edit button - only show if not APPROVED or REJECTED */}
                                    {invoice.status !== 'APPROVED' && invoice.status !== 'REJECTED' && (
                                      <button 
                                        className="btn btn-sm btn-outline-secondary"
                                        title="Edit Invoice"
                                        onClick={() => handleEditClick(invoice)}
                                      >
                                        <i className="fas fa-edit"></i>
                                      </button>
                                    )}

                                    {/* Approval buttons - only show for appropriate statuses and permissions */}
                                    {invoice.status === 'DRAFT' && (
                                      <button 
                                        className="btn btn-sm btn-outline-info"
                                        title="Submit for Approval"
                                        onClick={() => handleSubmitForApproval(invoice)}
                                      >
                                        <i className="fas fa-paper-plane"></i>
                                      </button>
                                    )}

                                    {invoice.approvalStatus === 'PENDING_APPROVAL' && canApproveInvoice(invoice) && (
                                      <>
                                        <button 
                                          className="btn btn-sm btn-outline-success"
                                          title="Approve Invoice"
                                          onClick={() => handleApproveClick(invoice)}
                                        >
                                          <i className="fas fa-check"></i>
                                        </button>
                                        <button 
                                          className="btn btn-sm btn-outline-warning"
                                          title="Reject Invoice"
                                          onClick={() => handleRejectClick(invoice)}
                                        >
                                          <i className="fas fa-times"></i>
                                        </button>
                                      </>
                                    )}

                                    {/* Delete button - only show if not APPROVED or REJECTED */}
                                    {invoice.status !== 'APPROVED' && invoice.status !== 'REJECTED' && (
                                      <button 
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => handleDeleteClick(invoice)}
                                        title="Delete Invoice"
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
                    
                    {/* Pagination Controls */}
                    {filteredInvoices.length > 0 && pagination.totalPages > 0 && (
                      <div className="card-footer">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <small className="text-muted">
                              Showing {pagination.currentPage * pagination.size + 1} to {Math.min((pagination.currentPage + 1) * pagination.size, pagination.totalElements)} of {pagination.totalElements} invoices
                            </small>
                          </div>
                          <div>
                            <nav aria-label="Invoices pagination">
                              <ul className="pagination mb-0">
                                {/* First page button */}
                                <li className={`page-item ${pagination.currentPage === 0 ? 'disabled' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => fetchInvoices(0, pagination.size)}
                                    disabled={pagination.currentPage === 0}
                                    aria-label="First page"
                                  >
                                    <i className="fas fa-angle-double-left"></i>
                                  </button>
                                </li>
                                
                                {/* Previous page button */}
                                <li className={`page-item ${!pagination.hasPrevious ? 'disabled' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => fetchInvoices(pagination.currentPage - 1, pagination.size)}
                                    disabled={!pagination.hasPrevious}
                                    aria-label="Previous page"
                                  >
                                    <i className="fas fa-angle-left"></i>
                                  </button>
                                </li>
                                
                                {/* Page numbers with ellipsis */}
                                {(() => {
                                  const pages = [];
                                  const totalPages = pagination.totalPages;
                                  const currentPage = pagination.currentPage;
                                  
                                  // Always show first page
                                  pages.push(
                                    <li key={0} className={`page-item ${currentPage === 0 ? 'active' : ''}`}>
                                      <button 
                                        className="page-link" 
                                        onClick={() => fetchInvoices(0, pagination.size)}
                                      >
                                        1
                                      </button>
                                    </li>
                                  );
                                  
                                  // Show ellipsis if needed
                                  if (currentPage > 2) {
                                    pages.push(
                                      <li key="ellipsis-start" className="page-item disabled">
                                        <span className="page-link">...</span>
                                      </li>
                                    );
                                  }
                                  
                                  // Show pages around current page
                                  for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages - 2, currentPage + 1); i++) {
                                    pages.push(
                                      <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                                        <button 
                                          className="page-link" 
                                          onClick={() => fetchInvoices(i, pagination.size)}
                                        >
                                          {i + 1}
                                        </button>
                                      </li>
                                    );
                                  }
                                  
                                  // Show ellipsis if needed
                                  if (currentPage < totalPages - 3) {
                                    pages.push(
                                      <li key="ellipsis-end" className="page-item disabled">
                                        <span className="page-link">...</span>
                                      </li>
                                    );
                                  }
                                  
                                  // Always show last page if more than 1 page
                                  if (totalPages > 1) {
                                    pages.push(
                                      <li key={totalPages - 1} className={`page-item ${currentPage === totalPages - 1 ? 'active' : ''}`}>
                                        <button 
                                          className="page-link" 
                                          onClick={() => fetchInvoices(totalPages - 1, pagination.size)}
                                        >
                                          {totalPages}
                                        </button>
                                      </li>
                                    );
                                  }
                                  
                                  return pages;
                                })()}
                                
                                {/* Next page button */}
                                <li className={`page-item ${!pagination.hasNext ? 'disabled' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => fetchInvoices(pagination.currentPage + 1, pagination.size)}
                                    disabled={!pagination.hasNext}
                                    aria-label="Next page"
                                  >
                                    <i className="fas fa-angle-right"></i>
                                  </button>
                                </li>
                                
                                {/* Last page button */}
                                <li className={`page-item ${pagination.currentPage === pagination.totalPages - 1 ? 'disabled' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => fetchInvoices(pagination.totalPages - 1, pagination.size)}
                                    disabled={pagination.currentPage === pagination.totalPages - 1}
                                    aria-label="Last page"
                                  >
                                    <i className="fas fa-angle-double-right"></i>
                                  </button>
                                </li>
                              </ul>
                            </nav>
                          </div>
                          <div>
                            <select 
                              className="form-select form-select-sm" 
                              value={pagination.size}
                              onChange={(e) => fetchInvoices(0, parseInt(e.target.value))}
                              style={{ width: 'auto' }}
                            >
                              <option value="5">5 per page</option>
                              <option value="10">10 per page</option>
                              <option value="20">20 per page</option>
                              <option value="50">50 per page</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Pending Approval Tab */}
            {activeTab === 'pending-approval' && (
              <div className="tab-pane fade show active">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading pending invoices...</p>
                  </div>
                ) : pendingInvoices.length === 0 ? (
                  <div className="card">
                    <div className="card-body">
                      <div className="text-center py-5">
                        <i className="fas fa-clock fa-4x text-muted mb-3"></i>
                        <h4 className="text-muted">No Pending Approvals</h4>
                        <p className="text-muted">
                          No invoices are currently waiting for approval.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card">
                    <div className="card-header">
                      <div className="row align-items-center">
                        <div className="col-md-8">
                          <h5 className="card-title mb-0">
                            <i className="fas fa-clock me-2"></i>
                            Invoices Pending Approval
                          </h5>
                          <small className="text-muted">
                            Review and approve invoices for clubs you manage
                          </small>
                        </div>
                        <div className="col-md-4 text-end">
                          <span className="badge bg-warning text-dark fs-6">
                            {pendingInvoices.length} pending
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Invoice #</th>
                              <th>Club</th>
                              <th>Bill To</th>
                              <th>Issue Date</th>
                              <th>Due Date</th>
                              <th>Total</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingInvoices.map((invoice) => (
                              <tr key={invoice.id}>
                                <td>
                                  <strong>{invoice.invoiceNumber}</strong>
                                  {invoice.notes && (
                                    <div className="small text-muted">{invoice.notes.substring(0, 50)}...</div>
                                  )}
                                </td>
                                <td>
                                  <small className="text-muted">{invoice.clubName}</small>
                                </td>
                                <td>
                                  {invoice.billToName ? (
                                    <div>
                                      <div>{invoice.billToName}</div>
                                      {invoice.billToEmail && (
                                        <small className="text-muted">{invoice.billToEmail}</small>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>{formatDate(invoice.issueDate)}</td>
                                <td>{formatDate(invoice.dueDate)}</td>
                                <td>
                                  <strong>{formatCurrency(invoice.totalAmount)}</strong>
                                </td>
                                <td>
                                  <div className="btn-group" role="group">
                                    <button 
                                      className="btn btn-sm btn-outline-primary"
                                      title="View Invoice"
                                      onClick={() => handleViewClick(invoice)}
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                    
                                    {canApproveInvoice(invoice) && (
                                      <>
                                        <button 
                                          className="btn btn-sm btn-success"
                                          title="Approve Invoice"
                                          onClick={() => handleApproveClick(invoice)}
                                        >
                                          <i className="fas fa-check me-1"></i>
                                          Approve
                                        </button>
                                        <button 
                                          className="btn btn-sm btn-warning"
                                          title="Reject Invoice"
                                          onClick={() => handleRejectClick(invoice)}
                                        >
                                          <i className="fas fa-times me-1"></i>
                                          Reject
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Pagination Controls for Pending Approval */}
                    {pendingInvoices.length > 0 && pendingApprovalPagination.totalElements > pendingApprovalPagination.size && (
                      <div className="card-footer">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <small className="text-muted">
                              Showing {pendingApprovalPagination.currentPage * pendingApprovalPagination.size + 1} to {Math.min((pendingApprovalPagination.currentPage + 1) * pendingApprovalPagination.size, pendingApprovalPagination.totalElements)} of {pendingApprovalPagination.totalElements} pending invoices
                            </small>
                          </div>
                          <div>
                            <nav aria-label="Pending approval pagination">
                              <ul className="pagination mb-0">
                                {/* First page button */}
                                <li className={`page-item ${pendingApprovalPagination.currentPage === 0 ? 'disabled' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => fetchPendingInvoices(0, pendingApprovalPagination.size)}
                                    disabled={pendingApprovalPagination.currentPage === 0}
                                    aria-label="First page"
                                  >
                                    <i className="fas fa-angle-double-left"></i>
                                  </button>
                                </li>
                                
                                {/* Previous page button */}
                                <li className={`page-item ${!pendingApprovalPagination.hasPrevious ? 'disabled' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => fetchPendingInvoices(pendingApprovalPagination.currentPage - 1, pendingApprovalPagination.size)}
                                    disabled={!pendingApprovalPagination.hasPrevious}
                                    aria-label="Previous page"
                                  >
                                    <i className="fas fa-angle-left"></i>
                                  </button>
                                </li>
                                
                                {/* Page numbers with ellipsis */}
                                {(() => {
                                  const pages = [];
                                  const totalPages = pendingApprovalPagination.totalPages;
                                  const currentPage = pendingApprovalPagination.currentPage;
                                  
                                  // Always show first page
                                  pages.push(
                                    <li key={0} className={`page-item ${currentPage === 0 ? 'active' : ''}`}>
                                      <button 
                                        className="page-link" 
                                        onClick={() => fetchPendingInvoices(0, pendingApprovalPagination.size)}
                                      >
                                        1
                                      </button>
                                    </li>
                                  );
                                  
                                  // Show ellipsis if needed
                                  if (currentPage > 2) {
                                    pages.push(
                                      <li key="ellipsis-start" className="page-item disabled">
                                        <span className="page-link">...</span>
                                      </li>
                                    );
                                  }
                                  
                                  // Show pages around current page
                                  for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages - 2, currentPage + 1); i++) {
                                    pages.push(
                                      <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                                        <button 
                                          className="page-link" 
                                          onClick={() => fetchPendingInvoices(i, pendingApprovalPagination.size)}
                                        >
                                          {i + 1}
                                        </button>
                                      </li>
                                    );
                                  }
                                  
                                  // Show ellipsis if needed
                                  if (currentPage < totalPages - 3) {
                                    pages.push(
                                      <li key="ellipsis-end" className="page-item disabled">
                                        <span className="page-link">...</span>
                                      </li>
                                    );
                                  }
                                  
                                  // Always show last page if more than 1 page
                                  if (totalPages > 1) {
                                    pages.push(
                                      <li key={totalPages - 1} className={`page-item ${currentPage === totalPages - 1 ? 'active' : ''}`}>
                                        <button 
                                          className="page-link" 
                                          onClick={() => fetchPendingInvoices(totalPages - 1, pendingApprovalPagination.size)}
                                        >
                                          {totalPages}
                                        </button>
                                      </li>
                                    );
                                  }
                                  
                                  return pages;
                                })()}
                                
                                {/* Next page button */}
                                <li className={`page-item ${!pendingApprovalPagination.hasNext ? 'disabled' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => fetchPendingInvoices(pendingApprovalPagination.currentPage + 1, pendingApprovalPagination.size)}
                                    disabled={!pendingApprovalPagination.hasNext}
                                    aria-label="Next page"
                                  >
                                    <i className="fas fa-angle-right"></i>
                                  </button>
                                </li>
                                
                                {/* Last page button */}
                                <li className={`page-item ${pendingApprovalPagination.currentPage === pendingApprovalPagination.totalPages - 1 ? 'disabled' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => fetchPendingInvoices(pendingApprovalPagination.totalPages - 1, pendingApprovalPagination.size)}
                                    disabled={pendingApprovalPagination.currentPage === pendingApprovalPagination.totalPages - 1}
                                    aria-label="Last page"
                                  >
                                    <i className="fas fa-angle-double-right"></i>
                                  </button>
                                </li>
                              </ul>
                            </nav>
                          </div>
                          <div>
                            <select 
                              className="form-select form-select-sm" 
                              value={pendingApprovalPagination.size}
                              onChange={(e) => fetchPendingInvoices(0, parseInt(e.target.value))}
                              style={{ width: 'auto' }}
                            >
                              <option value="5">5 per page</option>
                              <option value="10">10 per page</option>
                              <option value="20">20 per page</option>
                              <option value="50">50 per page</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Add Invoice Tab */}
            {activeTab === 'add' && (
              <div className="tab-pane fade show active">
                <div className="card">
                  <div className="card-header">
                    <h5 className="card-title mb-0">
                      <i className="fas fa-plus me-2"></i>
                      Create New Invoice
                    </h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleSubmit}>
                      <div className="row">
                        {/* Invoice Details */}
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="clubName" className="form-label text-start">Club</label>
                            <input
                              type="text"
                              className="form-control"
                              id="clubName"
                              value={selectedClub?.clubName || ''}
                              disabled
                              readOnly
                            />
                            <input
                              type="hidden"
                              name="clubId"
                              value={selectedClub?.clubId || ''}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="issueDate" className="form-label text-start">Issue Date</label>
                            <input
                              type="date"
                              className="form-control"
                              id="issueDate"
                              name="issueDate"
                              value={newInvoice.issueDate}
                              onChange={handleFormChange}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="dueDate" className="form-label text-start">Due Date</label>
                            <input
                              type="date"
                              className="form-control"
                              id="dueDate"
                              name="dueDate"
                              value={newInvoice.dueDate}
                              onChange={handleFormChange}
                            />
                          </div>
                        </div>

                        {/* Bill To Information */}
                        <div className="col-12">
                          <h6 className="text-primary mb-3 mt-3">
                            <i className="fas fa-address-book me-2"></i>
                            Bill To Information
                          </h6>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="billToName" className="form-label text-start">Name</label>
                            <input
                              type="text"
                              className="form-control"
                              id="billToName"
                              name="billToName"
                              value={newInvoice.billToName}
                              onChange={handleFormChange}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="billToEmail" className="form-label text-start">Email</label>
                            <input
                              type="email"
                              className="form-control"
                              id="billToEmail"
                              name="billToEmail"
                              value={newInvoice.billToEmail}
                              onChange={handleFormChange}
                            />
                          </div>
                        </div>
                        <div className="col-12">
                          <div className="mb-3">
                            <label htmlFor="billToAddress" className="form-label text-start">Address</label>
                            <textarea
                              className="form-control"
                              id="billToAddress"
                              name="billToAddress"
                              value={newInvoice.billToAddress}
                              onChange={handleFormChange}
                              rows="2"
                            />
                          </div>
                        </div>

                        {/* Line Items */}
                        <div className="col-12">
                          <h6 className="text-primary mb-3 mt-3">
                            <i className="fas fa-list me-2"></i>
                            Line Items
                          </h6>
                          {newInvoice.lineItems.map((item, index) => (
                            <div key={index} className="row mb-3 p-3 border rounded">
                              <div className="col-md-4">
                                <label className="form-label text-start">Description *</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={item.description}
                                  onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                                  required
                                />
                              </div>
                              <div className="col-md-2">
                                <label className="form-label text-start">Quantity *</label>
                                <input
                                  type="number"
                                  className="form-control"
                                  value={item.quantity}
                                  onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                                  min="1"
                                  required
                                />
                              </div>
                              <div className="col-md-2">
                                <label className="form-label text-start">Unit Price *</label>
                                <input
                                  type="number"
                                  className="form-control"
                                  value={item.unitPrice}
                                  onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                                  min="0"
                                  step="0.01"
                                  required
                                />
                              </div>
                              <div className="col-md-2">
                                <label className="form-label text-start">Total</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={formatCurrency(item.totalPrice)}
                                  readOnly
                                />
                              </div>
                              <div className="col-md-2 d-flex align-items-end">
                                {newInvoice.lineItems.length > 1 && (
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() => removeLineItem(index)}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="btn btn-outline-primary mb-3"
                            onClick={addLineItem}
                          >
                            <i className="fas fa-plus me-2"></i>
                            Add Line Item
                          </button>
                          
                          {/* Invoice Total */}
                          <div className="row">
                            <div className="col-md-6 offset-md-6">
                              <div className="card">
                                <div className="card-body">
                                  <div className="d-flex justify-content-between">
                                    <strong>Total: </strong>
                                    <strong>{formatCurrency(calculateInvoiceTotal())}</strong>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="col-12">
                          <div className="mb-3">
                            <label htmlFor="notes" className="form-label text-start">Notes</label>
                            <textarea
                              className="form-control"
                              id="notes"
                              name="notes"
                              value={newInvoice.notes}
                              onChange={handleFormChange}
                              rows="3"
                              placeholder="Any additional notes or terms..."
                            />
                          </div>
                        </div>
                      </div>

                      <div className="d-flex justify-content-between">
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          onClick={() => setActiveTab('list')}
                        >
                          <i className="fas fa-arrow-left me-2"></i>
                          Back to List
                        </button>
                        <button 
                          type="submit" 
                          className="btn btn-primary"
                          disabled={formLoading}
                        >
                          {formLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                              Creating...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save me-2"></i>
                              Create Invoice
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
          </>
        )}

      {/* View Invoice Modal */}
      {viewModal.show && viewModal.invoice && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-file-invoice-dollar me-2"></i>
                  Invoice Details - {viewModal.invoice.invoiceNumber}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {/* Invoice Header Information */}
                  <div className="col-md-6">
                    <h6 className="text-primary mb-3">Invoice Information</h6>
                    <table className="table table-sm table-borderless">
                      <tbody>
                        <tr>
                          <td><strong>Invoice Number:</strong></td>
                          <td>{viewModal.invoice.invoiceNumber}</td>
                        </tr>
                        <tr>
                          <td><strong>Club:</strong></td>
                          <td>{viewModal.invoice.clubName}</td>
                        </tr>
                        <tr>
                          <td><strong>Issue Date:</strong></td>
                          <td>{formatDate(viewModal.invoice.issueDate)}</td>
                        </tr>
                        <tr>
                          <td><strong>Due Date:</strong></td>
                          <td>{formatDate(viewModal.invoice.dueDate)}</td>
                        </tr>
                        <tr>
                          <td><strong>Status:</strong></td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(viewModal.invoice.status)}`}>
                              {viewModal.invoice.status || 'DRAFT'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Billing Information */}
                  <div className="col-md-6">
                    <h6 className="text-primary mb-3">Billing Information</h6>
                    <table className="table table-sm table-borderless">
                      <tbody>
                        <tr>
                          <td><strong>Bill To:</strong></td>
                          <td>{viewModal.invoice.billToName}</td>
                        </tr>
                        <tr>
                          <td><strong>Email:</strong></td>
                          <td>{viewModal.invoice.billToEmail}</td>
                        </tr>
                        <tr>
                          <td><strong>Address:</strong></td>
                          <td>{viewModal.invoice.billToAddress}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* User Tracking Information */}
                <div className="row mt-3">
                  <div className="col-12">
                    <h6 className="text-primary mb-3">
                      <i className="fas fa-user-clock me-2"></i>
                      Tracking Information
                    </h6>
                    <table className="table table-sm table-bordered">
                      <tbody>
                        <tr>
                          <td><strong>Created By:</strong></td>
                          <td>
                            {viewModal.invoice.createdByName || 'N/A'}
                            {viewModal.invoice.createdAt && (
                              <span className="text-muted ms-2">
                                ({formatDate(viewModal.invoice.createdAt)})
                              </span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Last Updated By:</strong></td>
                          <td>
                            {viewModal.invoice.updatedByName || 'N/A'}
                            {viewModal.invoice.updatedAt && (
                              <span className="text-muted ms-2">
                                ({formatDate(viewModal.invoice.updatedAt)})
                              </span>
                            )}
                          </td>
                        </tr>
                        {(viewModal.invoice.status === 'APPROVED' || viewModal.invoice.status === 'REJECTED') && viewModal.invoice.approvedByName && (
                          <tr className={viewModal.invoice.status === 'APPROVED' ? 'table-success' : 'table-danger'}>
                            <td>
                              <strong>
                                {viewModal.invoice.status === 'APPROVED' ? 'Approved By:' : 'Rejected By:'}
                              </strong>
                            </td>
                            <td>
                              {viewModal.invoice.approvedByName}
                              {viewModal.invoice.approvedAt && (
                                <span className="text-muted ms-2">
                                  ({formatDate(viewModal.invoice.approvedAt)})
                                </span>
                              )}
                            </td>
                          </tr>
                        )}
                        {viewModal.invoice.status === 'REJECTED' && viewModal.invoice.rejectionReason && (
                          <tr className="table-warning">
                            <td><strong>Rejection Reason:</strong></td>
                            <td>{viewModal.invoice.rejectionReason}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Line Items */}
                <div className="row mt-4">
                  <div className="col-12">
                    <h6 className="text-primary mb-3">Line Items</h6>
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th>Description</th>
                            <th className="text-center">Quantity</th>
                            <th className="text-end">Unit Price</th>
                            <th className="text-end">Total Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewModal.invoice.lineItems && viewModal.invoice.lineItems.map((item, index) => (
                            <tr key={index}>
                              <td>{item.description}</td>
                              <td className="text-center">{item.quantity}</td>
                              <td className="text-end">{formatCurrency(item.unitPrice)}</td>
                              <td className="text-end">{formatCurrency(item.totalPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="table-light">
                          <tr>
                            <td colSpan="3" className="text-end"><strong>Subtotal:</strong></td>
                            <td className="text-end"><strong>{formatCurrency(viewModal.invoice.subtotal)}</strong></td>
                          </tr>
                          <tr>
                            <td colSpan="3" className="text-end"><strong>Tax:</strong></td>
                            <td className="text-end"><strong>{formatCurrency(viewModal.invoice.taxAmount)}</strong></td>
                          </tr>
                          <tr className="table-primary">
                            <td colSpan="3" className="text-end"><strong>Total Amount:</strong></td>
                            <td className="text-end"><strong>{formatCurrency(viewModal.invoice.totalAmount)}</strong></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {viewModal.invoice.notes && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <h6 className="text-primary mb-2">Notes</h6>
                      <div className="alert alert-light">
                        {viewModal.invoice.notes}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {editModal.show && editModal.invoice && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-edit me-2"></i>
                  Edit Invoice - {editInvoice.invoiceNumber}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body">
                  <div className="row">
                    {/* Invoice Information */}
                    <div className="col-md-6">
                      <h6 className="text-primary mb-3">Invoice Information</h6>
                      <div className="mb-3">
                        <label className="form-label">Invoice Number</label>
                        <input
                          type="text"
                          className="form-control"
                          name="invoiceNumber"
                          value={editInvoice.invoiceNumber}
                          onChange={handleEditInputChange}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Club</label>
                        <select
                          className="form-select"
                          name="clubId"
                          value={editInvoice.clubId}
                          onChange={(e) => {
                            const selectedClub = clubs.find(club => club.id === e.target.value);
                            setEditInvoice(prev => ({
                              ...prev,
                              clubId: e.target.value,
                              clubName: selectedClub ? selectedClub.name : ''
                            }));
                          }}
                          required
                        >
                          <option value="">Select a club</option>
                          {clubs.map(club => (
                            <option key={club.id} value={club.id}>{club.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="row">
                        <div className="col-6">
                          <div className="mb-3">
                            <label className="form-label">Issue Date</label>
                            <input
                              type="date"
                              className="form-control"
                              name="issueDate"
                              value={editInvoice.issueDate}
                              onChange={handleEditInputChange}
                              required
                            />
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="mb-3">
                            <label className="form-label">Due Date</label>
                            <input
                              type="date"
                              className="form-control"
                              name="dueDate"
                              value={editInvoice.dueDate}
                              onChange={handleEditInputChange}
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <select
                          className="form-select"
                          name="status"
                          value={editInvoice.status}
                          onChange={handleEditInputChange}
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="SENT">Sent</option>
                          <option value="PAID">Paid</option>
                          <option value="OVERDUE">Overdue</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    {/* Billing Information */}
                    <div className="col-md-6">
                      <h6 className="text-primary mb-3">Billing Information</h6>
                      <div className="mb-3">
                        <label className="form-label">Bill To Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="billToName"
                          value={editInvoice.billToName}
                          onChange={handleEditInputChange}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Bill To Email</label>
                        <input
                          type="email"
                          className="form-control"
                          name="billToEmail"
                          value={editInvoice.billToEmail}
                          onChange={handleEditInputChange}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Bill To Address</label>
                        <textarea
                          className="form-control"
                          name="billToAddress"
                          value={editInvoice.billToAddress}
                          onChange={handleEditInputChange}
                          rows="3"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Notes</label>
                        <textarea
                          className="form-control"
                          name="notes"
                          value={editInvoice.notes}
                          onChange={handleEditInputChange}
                          rows="3"
                          placeholder="Optional notes..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="row mt-4">
                    <div className="col-12">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="text-primary mb-0">Line Items</h6>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={addEditLineItem}
                        >
                          <i className="fas fa-plus me-1"></i>
                          Add Item
                        </button>
                      </div>
                      <div className="table-responsive">
                        <table className="table table-bordered">
                          <thead className="table-light">
                            <tr>
                              <th style={{width: '40%'}}>Description</th>
                              <th style={{width: '15%'}}>Quantity</th>
                              <th style={{width: '20%'}}>Unit Price</th>
                              <th style={{width: '20%'}}>Total</th>
                              <th style={{width: '5%'}}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {editInvoice.lineItems.map((item, index) => (
                              <tr key={index}>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={item.description}
                                    onChange={(e) => handleEditLineItemChange(index, 'description', e.target.value)}
                                    placeholder="Item description"
                                    required
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={item.quantity}
                                    onChange={(e) => handleEditLineItemChange(index, 'quantity', e.target.value)}
                                    min="1"
                                    step="1"
                                    required
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={item.unitPrice}
                                    onChange={(e) => handleEditLineItemChange(index, 'unitPrice', e.target.value)}
                                    min="0"
                                    step="0.01"
                                    required
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={formatCurrency(item.totalPrice)}
                                    readOnly
                                  />
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => removeEditLineItem(index)}
                                    disabled={editInvoice.lineItems.length === 1}
                                    title="Remove item"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="table-light">
                            <tr>
                              <td colSpan="3" className="text-end"><strong>Total Amount:</strong></td>
                              <td><strong>{formatCurrency(calculateEditInvoiceTotal())}</strong></td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={formLoading}>
                    {formLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        Update Invoice
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle text-warning me-2"></i>
                  Confirm Delete
                </h5>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this invoice?</p>
                <div className="alert alert-info">
                  <strong>Invoice:</strong> {deleteModal.invoice?.invoiceNumber}<br />
                  <strong>Club:</strong> {deleteModal.invoice?.clubName}<br />
                  <strong>Total:</strong> {formatCurrency(deleteModal.invoice?.totalAmount)}
                </div>
                <p className="text-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  This action cannot be undone.
                </p>
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
                  Delete Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filter Modal */}
      {filterModal.show && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-filter me-2"></i>
                  Filter & Sort Invoices
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
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label text-start">Club</label>
                          <select 
                            className="form-select"
                            value={filters.club}
                            onChange={(e) => setFilters(prev => ({...prev, club: e.target.value}))}
                          >
                            <option value="">All Clubs</option>
                            {Array.isArray(clubs) && clubs.map(club => (
                              <option key={club.id} value={club.id}>
                                {club.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label text-start">Status</label>
                          <select 
                            className="form-select"
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))}
                          >
                            <option value="">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="DRAFT">Draft</option>
                            <option value="SENT">Sent</option>
                            <option value="PAID">Paid</option>
                            <option value="OVERDUE">Overdue</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label text-start">Issue Date From</label>
                          <input
                            type="date"
                            className="form-control"
                            value={filters.issueDateFrom}
                            onChange={(e) => setFilters(prev => ({...prev, issueDateFrom: e.target.value}))}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label text-start">Issue Date To</label>
                          <input
                            type="date"
                            className="form-control"
                            value={filters.issueDateTo}
                            onChange={(e) => setFilters(prev => ({...prev, issueDateTo: e.target.value}))}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label text-start">Due Date From</label>
                          <input
                            type="date"
                            className="form-control"
                            value={filters.dueDateFrom}
                            onChange={(e) => setFilters(prev => ({...prev, dueDateFrom: e.target.value}))}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label text-start">Due Date To</label>
                          <input
                            type="date"
                            className="form-control"
                            value={filters.dueDateTo}
                            onChange={(e) => setFilters(prev => ({...prev, dueDateTo: e.target.value}))}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label text-start">Min Amount</label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="0.00"
                            value={filters.minAmount}
                            onChange={(e) => setFilters(prev => ({...prev, minAmount: e.target.value}))}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label text-start">Max Amount</label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="1000.00"
                            value={filters.maxAmount}
                            onChange={(e) => setFilters(prev => ({...prev, maxAmount: e.target.value}))}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Vertical Divider */}
                  <div className="col-md-1 d-flex justify-content-center align-items-center">
                    <div style={{height: '400px', borderLeft: '2px solid #6c757d', opacity: '0.5'}}></div>
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
                        <option value="invoiceNumber">Invoice Number</option>
                        <option value="clubname">Club Name</option>
                        <option value="status">Status</option>
                        <option value="issuedate">Issue Date</option>
                        <option value="duedate">Due Date</option>
                        <option value="totalamount">Total Amount</option>
                        <option value="createdat">Created Date</option>
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
                            club: '',
                            status: '',
                            issueDateFrom: '',
                            issueDateTo: '',
                            dueDateFrom: '',
                            dueDateTo: '',
                            minAmount: '',
                            maxAmount: ''
                          });
                          setSortConfig({
                            field: 'invoiceNumber',
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
                    Showing {filteredInvoices.length} of {Array.isArray(invoices) ? invoices.length : 0} invoices
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

      {/* Approval Modal */}
      {approvalModal.show && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {approvalModal.action === 'approve' ? 'Approve Invoice' : 'Reject Invoice'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setApprovalModal({ show: false, invoice: null, action: '' })}
                ></button>
              </div>
              <div className="modal-body">
                {approvalModal.action === 'approve' ? (
                  <div>
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle me-2"></i>
                      Are you sure you want to approve this invoice?
                    </div>
                    <p><strong>Invoice:</strong> {approvalModal.invoice?.invoiceNumber}</p>
                    <p><strong>Club:</strong> {approvalModal.invoice?.clubName}</p>
                    <p><strong>Amount:</strong> {formatCurrency(approvalModal.invoice?.totalAmount)}</p>
                  </div>
                ) : (
                  <div>
                    <div className="alert alert-warning">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      Please provide a reason for rejecting this invoice:
                    </div>
                    <p><strong>Invoice:</strong> {approvalModal.invoice?.invoiceNumber}</p>
                    <p><strong>Club:</strong> {approvalModal.invoice?.clubName}</p>
                    <p><strong>Amount:</strong> {formatCurrency(approvalModal.invoice?.totalAmount)}</p>
                    <div className="mb-3">
                      <label className="form-label">Rejection Reason <span className="text-danger">*</span></label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please explain why this invoice is being rejected..."
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setApprovalModal({ show: false, invoice: null, action: '' })}
                >
                  Cancel
                </button>
                {approvalModal.action === 'approve' ? (
                  <button 
                    type="button" 
                    className="btn btn-success"
                    onClick={confirmApproval}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Approving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check me-2"></i>
                        Approve Invoice
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="btn btn-warning"
                    onClick={confirmRejection}
                    disabled={loading || !rejectionReason.trim()}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-times me-2"></i>
                        Reject Invoice
                      </>
                    )}
                  </button>
                )}
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

export default InvoicesManagement;