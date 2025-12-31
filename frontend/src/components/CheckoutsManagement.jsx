import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiService';

const CheckoutsManagement = () => {
  // State management
  const [checkouts, setCheckouts] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [deleteModal, setDeleteModal] = useState({ show: false, checkout: null });
  const [viewModal, setViewModal] = useState({ show: false, checkout: null });
  const [editModal, setEditModal] = useState({ show: false, checkout: null });
  const [approvalModal, setApprovalModal] = useState({ show: false, checkout: null, action: '' });
  const [rejectionReason, setRejectionReason] = useState('');
  const [filteredCheckouts, setFilteredCheckouts] = useState([]);
  const [pendingCheckouts, setPendingCheckouts] = useState([]);
  const [pendingReturns, setPendingReturns] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  
  // Pagination state for pending approval tab
  const [pendingApprovalPagination, setPendingApprovalPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    size: 10,
    hasNext: false,
    hasPrevious: false
  });
  
  // Pagination state for pending returns tab
  const [pendingReturnsPagination, setPendingReturnsPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    size: 10,
    hasNext: false,
    hasPrevious: false
  });
  
  // Club selection state
  const [selectedClub, setSelectedClub] = useState(null);
  const [accessibleClubs, setAccessibleClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  
  // Form state for new checkout
  const [newCheckout, setNewCheckout] = useState({
    checkoutNumber: '',
    clubId: '',
    clubName: '',
    checkoutDate: '',
    dueDate: '',
    status: 'PENDING',
    borrowerName: '',
    borrowerEmail: '',
    borrowerPhone: '',
    borrowerAddress: '',
    notes: '',
    checkoutItems: [{ itemName: '', itemType: '', itemCode: '', quantity: 1, condition: 'GOOD', estimatedValue: 0, notes: '' }]
  });
  
  // Edit form state
  const [editCheckout, setEditCheckout] = useState({
    checkoutNumber: '',
    clubId: '',
    clubName: '',
    checkoutDate: '',
    dueDate: '',
    status: 'ACTIVE',
    borrowerName: '',
    borrowerEmail: '',
    borrowerPhone: '',
    borrowerAddress: '',
    notes: '',
    checkoutItems: [{ itemName: '', itemType: '', itemCode: '', quantity: 1, condition: 'GOOD', estimatedValue: 0, notes: '' }]
  });

  // Advanced search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [_searchLoading, setSearchLoading] = useState(false);
  const [filterModal, setFilterModal] = useState({ show: false });
  const [filters, setFilters] = useState({
    club: '',
    status: '',
    borrower: '',
    checkoutDateFrom: '',
    checkoutDateTo: '',
    dueDateFrom: '',
    dueDateTo: '',
    minValue: '',
    maxValue: ''
  });
  const [sortConfig, setSortConfig] = useState({ field: 'checkoutNumber', direction: 'asc' });
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    size: 10,
    hasNext: false,
    hasPrevious: false
  });

  const fetchCheckouts = useCallback(async (page = 0, size = 10) => {
    if (!selectedClub) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
        sortBy: sortConfig.field,
        sortDirection: sortConfig.direction,
        clubId: selectedClub.clubId
      });
      
      const response = await apiService.get(`/checkouts?${params.toString()}`);
      if (response.success && response.data && Array.isArray(response.data.data)) {
        setCheckouts(response.data.data);
        setPagination({
          currentPage: response.data.currentPage || 0,
          totalPages: response.data.totalPages || 0,
          totalElements: response.data.totalElements || 0,
          size: response.data.size || 10,
          hasNext: response.data.hasNext || false,
          hasPrevious: response.data.hasPrevious || false
        });
      } else {
        console.warn('Invalid checkouts data received:', response);
        setCheckouts([]);
        setMessage({ type: 'error', text: 'Failed to fetch checkouts - invalid data format' });
      }
    } catch (error) {
      console.error('Error fetching checkouts:', error);
      setCheckouts([]);
      setMessage({ type: 'error', text: 'An error occurred while fetching checkouts' });
    } finally {
      setLoading(false);
    }
  }, [sortConfig.field, sortConfig.direction, selectedClub]);

  // Fetch pending checkouts function
  const fetchPendingCheckouts = useCallback(async (page = 0, size = 10) => {
    try {
      setLoading(true);
      const response = await apiService.getCheckoutsPendingApproval(page, size);
      if (response.success && response.data) {
        // Check if response has pagination metadata
        if (response.data.currentPage !== undefined || response.data.totalPages !== undefined) {
          // Response has pagination fields directly (not nested)
          setPendingCheckouts(Array.isArray(response.data.data) ? response.data.data : response.data);
          setPendingApprovalPagination({
            currentPage: response.data.currentPage || page,
            totalPages: response.data.totalPages || 0,
            totalElements: response.data.totalElements || 0,
            size: response.data.size || size,
            hasNext: response.data.hasNext || false,
            hasPrevious: response.data.hasPrevious || false
          });
        } else if (Array.isArray(response.data)) {
          // Handle case where data is directly an array (non-paginated, legacy)
          setPendingCheckouts(response.data);
          setPendingApprovalPagination({
            currentPage: 0,
            totalPages: 1,
            totalElements: response.data.length,
            size: response.data.length,
            hasNext: false,
            hasPrevious: false
          });
        } else {
          console.warn('Invalid pending checkouts data received:', response);
          setPendingCheckouts([]);
          setMessage({ type: 'error', text: response.message || 'Failed to fetch pending checkouts - invalid data format' });
        }
      }
    } catch (error) {
      console.error('Error fetching pending checkouts:', error);
      setPendingCheckouts([]);
      setMessage({ type: 'error', text: 'An error occurred while fetching pending checkouts' });
    } finally {
      setLoading(false);
    }
  }, []);
  
  const fetchPendingReturns = useCallback(async (page = 0, size = 10) => {
    try {
      setLoading(true);
      const response = await apiService.getCheckoutsPendingReturn(page, size);
      if (response.success && response.data) {
        // Check if response has pagination metadata
        if (response.data.currentPage !== undefined || response.data.totalPages !== undefined) {
          // Response has pagination fields directly (not nested)
          setPendingReturns(Array.isArray(response.data.data) ? response.data.data : response.data);
          setPendingReturnsPagination({
            currentPage: response.data.currentPage || page,
            totalPages: response.data.totalPages || 0,
            totalElements: response.data.totalElements || 0,
            size: response.data.size || size,
            hasNext: response.data.hasNext || false,
            hasPrevious: response.data.hasPrevious || false
          });
        } else if (Array.isArray(response.data)) {
          // Handle case where data is directly an array (non-paginated, legacy)
          setPendingReturns(response.data);
          setPendingReturnsPagination({
            currentPage: 0,
            totalPages: 1,
            totalElements: response.data.length,
            size: response.data.length,
            hasNext: false,
            hasPrevious: false
          });
        } else {
          console.warn('Invalid pending returns data received:', response);
          setPendingReturns([]);
          setMessage({ type: 'error', text: response.message || 'Failed to fetch pending returns - invalid data format' });
        }
      }
    } catch (error) {
      console.error('Error fetching pending returns:', error);
      setPendingReturns([]);
      setMessage({ type: 'error', text: 'An error occurred while fetching pending returns' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchClubs();
    fetchAccessibleClubs();
  }, []);
  
  // Fetch checkouts when club is selected
  useEffect(() => {
    if (selectedClub && activeTab === 'list') {
      fetchCheckouts();
    } else if (activeTab === 'pending-approval') {
      fetchPendingCheckouts();
    } else if (activeTab === 'pending-returns') {
      fetchPendingReturns();
    }
  }, [selectedClub, activeTab, fetchCheckouts, fetchPendingCheckouts, fetchPendingReturns]);

  // Advanced search function
  const performAdvancedSearch = useCallback(async () => {
    if (!searchQuery && !Object.values(filters).some(filter => filter !== '')) {
      setFilteredCheckouts(Array.isArray(checkouts) ? checkouts : []);
      return;
    }

    try {
      setSearchLoading(true);
      
      if (searchQuery && !Object.values(filters).some(filter => filter !== '')) {
        // Simple keyword search
        const response = await apiService.get(`/checkouts/search?keyword=${encodeURIComponent(searchQuery)}`);
        if (response.success && response.data && response.data.data && Array.isArray(response.data.data)) {
          setFilteredCheckouts(response.data.data);
        }
      } else {
        // Advanced search with filters
        const params = new URLSearchParams();
        if (searchQuery) params.append('keyword', searchQuery);
        if (selectedClub) params.append('clubId', selectedClub.clubId);
        if (filters.club) params.append('clubId', filters.club);
        if (filters.status) params.append('status', filters.status);
        if (filters.borrower) params.append('borrowerName', filters.borrower);
        if (filters.checkoutDateFrom) params.append('checkoutDateFrom', filters.checkoutDateFrom);
        if (filters.checkoutDateTo) params.append('checkoutDateTo', filters.checkoutDateTo);
        if (filters.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
        if (filters.dueDateTo) params.append('dueDateTo', filters.dueDateTo);
        if (filters.minValue) params.append('minValue', filters.minValue);
        if (filters.maxValue) params.append('maxValue', filters.maxValue);
        if (sortConfig.field) params.append('sortBy', sortConfig.field);
        if (sortConfig.direction) params.append('sortDirection', sortConfig.direction);
        
        const response = await apiService.get(`/checkouts/advanced-search?${params.toString()}`);
        
        if (response.success && response.data && response.data.data && Array.isArray(response.data.data)) {
          setFilteredCheckouts(response.data.data);
        } else {
          console.warn('Invalid search results:', response);
          setFilteredCheckouts([]);
        }
      }
    } catch (error) {
      console.error('Error searching checkouts:', error);
      setFilteredCheckouts([]);
      setMessage({ type: 'error', text: 'An error occurred while searching checkouts' });
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, filters, checkouts, sortConfig, selectedClub]);

  // Filter and search effect - moved after performAdvancedSearch definition
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery || Object.values(filters).some(filter => filter !== '')) {
        performAdvancedSearch();
      } else {
        const checkoutsArray = Array.isArray(checkouts) ? checkouts : [];
        setFilteredCheckouts(checkoutsArray);
      }
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [checkouts, searchQuery, filters, sortConfig, performAdvancedSearch]);

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

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCheckout(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckoutItemChange = (index, field, value) => {
    const updatedItems = [...newCheckout.checkoutItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    setNewCheckout(prev => ({
      ...prev,
      checkoutItems: updatedItems
    }));
  };

  const addCheckoutItem = () => {
    setNewCheckout(prev => ({
      ...prev,
      checkoutItems: [...prev.checkoutItems, { itemName: '', itemType: '', itemCode: '', quantity: 1, condition: 'GOOD', estimatedValue: 0, notes: '' }]
    }));
  };

  const removeCheckoutItem = (index) => {
    if (newCheckout.checkoutItems.length > 1) {
      setNewCheckout(prev => ({
        ...prev,
        checkoutItems: prev.checkoutItems.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateTotalValue = () => {
    return newCheckout.checkoutItems.reduce((sum, item) => {
      return sum + ((parseFloat(item.estimatedValue) || 0) * (parseInt(item.quantity) || 0));
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const checkoutData = {
        ...newCheckout,
        checkoutItems: newCheckout.checkoutItems.map(item => ({
          ...item,
          quantity: parseInt(item.quantity) || 1,
          estimatedValue: parseFloat(item.estimatedValue) || 0
        }))
      };
      
      const response = await apiService.post('/checkouts', checkoutData);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Checkout created successfully!' });
        // Reset form
        setNewCheckout({
          checkoutNumber: '',
          clubId: '',
          clubName: '',
          checkoutDate: '',
          dueDate: '',
          status: 'ACTIVE',
          borrowerName: '',
          borrowerEmail: '',
          borrowerPhone: '',
          borrowerAddress: '',
          notes: '',
          checkoutItems: [{ itemName: '', itemType: '', itemCode: '', quantity: 1, condition: 'GOOD', estimatedValue: 0, notes: '' }]
        });
        // Refresh the checkouts list
        fetchCheckouts();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to create checkout' });
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while creating the checkout' 
      });
    } finally {
      setFormLoading(false);
    }
  };

  // Edit form handlers
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditCheckout(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditCheckoutItemChange = (index, field, value) => {
    const updatedItems = [...editCheckout.checkoutItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    setEditCheckout(prev => ({
      ...prev,
      checkoutItems: updatedItems
    }));
  };

  const addEditCheckoutItem = () => {
    setEditCheckout(prev => ({
      ...prev,
      checkoutItems: [...prev.checkoutItems, { itemName: '', itemType: '', itemCode: '', quantity: 1, condition: 'GOOD', estimatedValue: 0, notes: '' }]
    }));
  };

  const removeEditCheckoutItem = (index) => {
    if (editCheckout.checkoutItems.length > 1) {
      setEditCheckout(prev => ({
        ...prev,
        checkoutItems: prev.checkoutItems.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateEditTotalValue = () => {
    return editCheckout.checkoutItems.reduce((sum, item) => {
      return sum + ((parseFloat(item.estimatedValue) || 0) * (parseInt(item.quantity) || 0));
    }, 0);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const checkoutData = {
        ...editCheckout,
        checkoutItems: editCheckout.checkoutItems.map(item => ({
          ...item,
          quantity: parseInt(item.quantity) || 1,
          estimatedValue: parseFloat(item.estimatedValue) || 0
        }))
      };
      
      const response = await apiService.put(`/checkouts/${editCheckout.id}`, checkoutData);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Checkout updated successfully!' });
        fetchCheckouts();
        closeModal();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to update checkout' });
      }
    } catch (error) {
      console.error('Error updating checkout:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while updating the checkout' 
      });
    } finally {
      setFormLoading(false);
    }
  };

  // Checkout management handlers
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentMember');
    localStorage.removeItem('userEmail');
    window.location.href = '/';
  };

  const handleViewClick = (checkout) => {
    setViewModal({ show: true, checkout });
  };

  const handleEditClick = (checkout) => {
    setEditCheckout({
      id: checkout.id,
      checkoutNumber: checkout.checkoutNumber || '',
      clubId: checkout.clubId || '',
      clubName: checkout.clubName || '',
      checkoutDate: checkout.checkoutDate || '',
      dueDate: checkout.dueDate || '',
      status: checkout.status || 'ACTIVE',
      borrowerName: checkout.borrowerName || '',
      borrowerEmail: checkout.borrowerEmail || '',
      borrowerPhone: checkout.borrowerPhone || '',
      borrowerAddress: checkout.borrowerAddress || '',
      notes: checkout.notes || '',
      checkoutItems: checkout.checkoutItems && checkout.checkoutItems.length > 0 
        ? checkout.checkoutItems.map(item => ({
            itemName: item.itemName || '',
            itemType: item.itemType || '',
            itemCode: item.itemCode || '',
            quantity: item.quantity || 1,
            condition: item.condition || 'GOOD',
            estimatedValue: item.estimatedValue || 0,
            notes: item.notes || ''
          }))
        : [{ itemName: '', itemType: '', itemCode: '', quantity: 1, condition: 'GOOD', estimatedValue: 0, notes: '' }]
    });
    setEditModal({ show: true, checkout });
  };

  const handleDeleteClick = (checkout) => {
    setDeleteModal({ show: true, checkout });
  };

  const confirmDelete = async () => {
    if (!deleteModal.checkout) return;

    try {
      const response = await apiService.delete(`/checkouts/${deleteModal.checkout.id}`);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Checkout deleted successfully!' });
        setCheckouts(Array.isArray(checkouts) ? checkouts.filter(checkout => checkout.id !== deleteModal.checkout.id) : []);
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to delete checkout' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while deleting the checkout' 
      });
    } finally {
      closeModal();
    }
  };

  const closeModal = () => {
    setDeleteModal({ show: false, checkout: null });
    setViewModal({ show: false, checkout: null });
    setEditModal({ show: false, checkout: null });
    setApprovalModal({ show: false, checkout: null, action: '' });
    setRejectionReason('');
  };

  // Approval handlers
  const handleApproveClick = (checkout) => {
    setApprovalModal({ show: true, checkout, action: 'approve' });
  };

  const handleRejectClick = (checkout) => {
    setApprovalModal({ show: true, checkout, action: 'reject' });
    setRejectionReason('');
  };

  const confirmApproval = async () => {
    try {
      setLoading(true);
      const response = await apiService.post(`/checkouts/${approvalModal.checkout.id}/approve`);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Checkout approved successfully!' });
        setApprovalModal({ show: false, checkout: null, action: '' });
        
        // Refresh the appropriate list based on current tab
        if (activeTab === 'pending-approval') {
          fetchPendingCheckouts();
        } else {
          fetchCheckouts();
        }
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to approve checkout.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error approving checkout.' });
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
      const response = await apiService.post(`/checkouts/${approvalModal.checkout.id}/reject`, {
        rejectionReason: rejectionReason
      });
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Checkout rejected successfully!' });
        setApprovalModal({ show: false, checkout: null, action: '' });
        setRejectionReason('');
        
        // Refresh the appropriate list based on current tab
        if (activeTab === 'pending-approval') {
          fetchPendingCheckouts();
        } else {
          fetchCheckouts();
        }
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to reject checkout.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error rejecting checkout.' });
    } finally {
      setLoading(false);
    }
  };

  // Mark as returned handler
  const handleMarkAsReturned = async (checkoutId) => {
    if (!window.confirm('Are you sure you want to mark this checkout as returned?')) {
      return;
    }

    try {
      setLoading(true);
      
      // Debug: Check if token exists
      const token = localStorage.getItem('authToken');
      console.log('Auth token exists:', !!token);
      if (!token) {
        setMessage({ type: 'error', text: 'Authentication token not found. Please log in again.' });
        return;
      }
      
      const response = await apiService.markCheckoutAsReturned(checkoutId);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Checkout marked as returned successfully!' });
        
        // Refresh pending returns list
        fetchPendingReturns();
      } else {
        console.error('Error response:', response);
        setMessage({ type: 'error', text: response.message || 'Failed to mark checkout as returned.' });
      }
    } catch (error) {
      console.error('Error marking checkout as returned:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error marking checkout as returned.' });
    } finally {
      setLoading(false);
    }
  };

  // Check if current user can approve checkouts for a specific club
  const canApproveCheckout = (checkout) => {
    const currentMember = JSON.parse(localStorage.getItem('currentMember') || '{}');
    
    // APP_ADMIN can approve any checkout
    if (currentMember.role === 'APP_ADMIN') {
      return true;
    }
    
    // Check if user is CLUB_ADMIN for this checkout's club
    return accessibleClubs.some(clubRole => 
      clubRole.clubId === checkout.clubId && clubRole.clubRole === 'CLUB_ADMIN'
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      console.warn('Invalid date format:', dateString, error.message);
      return 'Invalid Date';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING': return 'bg-warning';
      case 'APPROVED': return 'bg-success';
      case 'REJECTED': return 'bg-danger';
      case 'ACTIVE': return 'bg-info';
      case 'RETURNED': return 'bg-primary';
      case 'OVERDUE': return 'bg-danger';
      case 'CANCELLED': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="text-primary">
              <i className="fas fa-clipboard-check me-2"></i>
              Checkouts Management
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
                              Click to manage checkouts
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
                  Managing checkouts for: <strong>{selectedClub.clubName}</strong>
                  {selectedClub.clubRole === 'CLUB_ADMIN' && (
                    <span className="badge bg-primary ms-2">Admin</span>
                  )}
                </div>
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => {
                    setSelectedClub(null);
                    setActiveTab('list');
                    setCheckouts([]);
                    setFilteredCheckouts([]);
                    setPendingCheckouts([]);
                    setPendingReturns([]);
                  }}
                >
                  <i className="fas fa-exchange-alt me-1"></i>
                  Change Club
                </button>
              </div>

              {/* Tab Navigation */}
              <ul className="nav nav-tabs mb-4" id="checkoutsTabs" role="tablist">
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link ${activeTab === 'list' ? 'active' : ''}`}
                    onClick={() => setActiveTab('list')}
                    type="button" 
                    role="tab"
                  >
                    <i className="fas fa-list me-2"></i>
                    Manage Checkouts
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
                    className={`nav-link ${activeTab === 'pending-returns' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending-returns')}
                    type="button" 
                    role="tab"
                  >
                    <i className="fas fa-undo me-2"></i>
                    Pending Returns
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link ${activeTab === 'add' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('add');
                      // Pre-populate club info when switching to add tab
                      if (selectedClub) {
                        setNewCheckout(prev => ({
                          ...prev,
                          clubId: selectedClub.clubId,
                          clubName: selectedClub.clubName
                        }));
                      }
                    }}
                    type="button" 
                    role="tab"
                  >
                    <i className="fas fa-plus me-2"></i>
                    Add New Checkout
                  </button>
                </li>
              </ul>
            </>
          )}

          {/* Tab Content */}
          {selectedClub && (
            <div className="tab-content" id="checkoutsTabContent">
            
            {/* Checkouts List Tab */}
            {activeTab === 'list' && (
              <div className="tab-pane fade show active">
                {/* Search and Filter Bar - Always visible */}
                <div className="card mb-3">
                  <div className="card-header">
                    <div className="row align-items-center">
                      <div className="col-md-4">
                        <h5 className="card-title mb-0">
                          <i className="fas fa-clipboard-check me-2"></i>
                          Checkouts Directory
                        </h5>
                      </div>
                      <div className="col-md-4">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search checkouts..."
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
                          {(Object.values(filters).some(f => f !== '') || sortConfig.field !== 'checkoutNumber' || sortConfig.direction !== 'asc') && (
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
                    <p className="mt-2">Loading checkouts...</p>
                  </div>
                ) : filteredCheckouts.length === 0 ? (
                  <div className="card">
                    <div className="card-body">
                      <div className="text-center py-5">
                        <i className="fas fa-clipboard-check fa-4x text-muted mb-3"></i>
                        <h4 className="text-muted">No Checkouts Found</h4>
                        <p className="text-muted">
                          {(searchQuery || filters.club || filters.status || filters.borrower || filters.checkoutDateFrom || filters.checkoutDateTo || filters.dueDateFrom || filters.dueDateTo || filters.minValue || filters.maxValue)
                            ? 'No checkouts found matching your search criteria. Try adjusting your filters.'
                            : 'No checkouts have been created yet. Add your first checkout to get started.'
                          }
                        </p>
                        <button 
                          className="btn btn-primary"
                          onClick={() => setActiveTab('add')}
                        >
                          <i className="fas fa-plus me-2"></i>
                          Add First Checkout
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
                              <th>Checkout #</th>
                              <th>Club</th>
                              <th>Borrower</th>
                              <th>Checkout Date</th>
                              <th>Due Date</th>
                              <th>Status</th>
                              <th>Items</th>
                              <th>Total Value</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredCheckouts.map((checkout) => (
                              <tr key={checkout.id}>
                                <td>
                                  <strong className="text-primary">{checkout.checkoutNumber}</strong>
                                </td>
                                <td>{checkout.clubName}</td>
                                <td>
                                  <div>
                                    <strong>{checkout.borrowerName}</strong>
                                    <br />
                                    <small className="text-muted">{checkout.borrowerEmail}</small>
                                  </div>
                                </td>
                                <td>{formatDate(checkout.checkoutDate)}</td>
                                <td>{formatDate(checkout.dueDate)}</td>
                                <td>
                                  <span className={`badge ${getStatusBadgeClass(checkout.status)}`}>
                                    {checkout.status || 'ACTIVE'}
                                  </span>
                                </td>
                                <td>
                                  <span className="badge bg-info">
                                    {checkout.checkoutItems ? checkout.checkoutItems.length : 0} items
                                  </span>
                                </td>
                                <td>
                                  <strong>{formatCurrency(checkout.totalEstimatedValue)}</strong>
                                </td>
                                <td>
                                  <div className="btn-group" role="group">
                                    <button 
                                      className="btn btn-sm btn-outline-primary"
                                      title="View Checkout"
                                      onClick={() => handleViewClick(checkout)}
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                    {!['APPROVED', 'REJECTED', 'RETURNED'].includes(checkout.status) && (
                                      <>
                                        <button 
                                          className="btn btn-sm btn-outline-secondary"
                                          title="Edit Checkout"
                                          onClick={() => handleEditClick(checkout)}
                                        >
                                          <i className="fas fa-edit"></i>
                                        </button>
                                        <button 
                                          className="btn btn-sm btn-outline-danger"
                                          onClick={() => handleDeleteClick(checkout)}
                                          title="Delete Checkout"
                                        >
                                          <i className="fas fa-trash"></i>
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
                    
                    {/* Pagination Controls */}
                    {filteredCheckouts.length > 0 && !searchQuery && !Object.values(filters).some(f => f !== '') && pagination.totalPages > 0 && (
                      <div className="card-footer">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <small className="text-muted">
                              Showing {pagination.currentPage * pagination.size + 1} to {Math.min((pagination.currentPage + 1) * pagination.size, pagination.totalElements)} of {pagination.totalElements} checkouts
                            </small>
                          </div>
                          <div>
                            <nav aria-label="Checkouts pagination">
                              <ul className="pagination mb-0">
                                {/* First page button */}
                                <li className={`page-item ${pagination.currentPage === 0 ? 'disabled' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => fetchCheckouts(0, pagination.size)}
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
                                    onClick={() => fetchCheckouts(pagination.currentPage - 1, pagination.size)}
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
                                        onClick={() => fetchCheckouts(0, pagination.size)}
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
                                          onClick={() => fetchCheckouts(i, pagination.size)}
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
                                          onClick={() => fetchCheckouts(totalPages - 1, pagination.size)}
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
                                    onClick={() => fetchCheckouts(pagination.currentPage + 1, pagination.size)}
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
                                    onClick={() => fetchCheckouts(pagination.totalPages - 1, pagination.size)}
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
                              onChange={(e) => fetchCheckouts(0, parseInt(e.target.value))}
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
                    
                    {/* Search Results Count */}
                    {filteredCheckouts.length > 0 && (searchQuery || Object.values(filters).some(f => f !== '')) && (
                      <div className="card-footer">
                        <div className="d-flex justify-content-center">
                          <small className="text-muted">
                            <i className="fas fa-search me-2"></i>
                            Found {filteredCheckouts.length} checkout{filteredCheckouts.length !== 1 ? 's' : ''} matching your search criteria
                          </small>
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
                    <p className="mt-2">Loading pending checkouts...</p>
                  </div>
                ) : pendingCheckouts.length === 0 ? (
                  <div className="card">
                    <div className="card-body">
                      <div className="text-center py-5">
                        <i className="fas fa-clock fa-4x text-muted mb-3"></i>
                        <h4 className="text-muted">No Pending Approvals</h4>
                        <p className="text-muted">
                          No checkouts are currently waiting for approval.
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
                            Checkouts Pending Approval
                          </h5>
                          <small className="text-muted">
                            Review and approve checkouts for clubs you manage
                          </small>
                        </div>
                        <div className="col-md-4 text-end">
                          <span className="badge bg-warning text-dark fs-6">
                            {pendingCheckouts.length} pending
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Checkout #</th>
                              <th>Club</th>
                              <th>Borrower</th>
                              <th>Checkout Date</th>
                              <th>Due Date</th>
                              <th>Total Value</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingCheckouts.map((checkout) => (
                              <tr key={checkout.id}>
                                <td>
                                  <strong>{checkout.checkoutNumber}</strong>
                                  {checkout.notes && (
                                    <div className="small text-muted">{checkout.notes.substring(0, 50)}...</div>
                                  )}
                                </td>
                                <td>
                                  <small className="text-muted">{checkout.clubName}</small>
                                </td>
                                <td>
                                  {checkout.borrowerName ? (
                                    <div>
                                      <div>{checkout.borrowerName}</div>
                                      {checkout.borrowerEmail && (
                                        <small className="text-muted">{checkout.borrowerEmail}</small>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>{formatDate(checkout.checkoutDate)}</td>
                                <td>{formatDate(checkout.dueDate)}</td>
                                <td>
                                  <strong>{formatCurrency(checkout.totalEstimatedValue)}</strong>
                                </td>
                                <td>
                                  <div className="btn-group" role="group">
                                    <button 
                                      className="btn btn-sm btn-outline-primary"
                                      title="View Checkout"
                                      onClick={() => handleViewClick(checkout)}
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                    
                                    {canApproveCheckout(checkout) && (
                                      <>
                                        <button 
                                          className="btn btn-sm btn-success"
                                          title="Approve Checkout"
                                          onClick={() => handleApproveClick(checkout)}
                                        >
                                          <i className="fas fa-check me-1"></i>
                                          Approve
                                        </button>
                                        <button 
                                          className="btn btn-sm btn-warning"
                                          title="Reject Checkout"
                                          onClick={() => handleRejectClick(checkout)}
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
                    {pendingCheckouts.length > 0 && pendingApprovalPagination.totalElements > pendingApprovalPagination.size && (
                      <div className="card-footer">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <small className="text-muted">
                              Showing {pendingApprovalPagination.currentPage * pendingApprovalPagination.size + 1} to {Math.min((pendingApprovalPagination.currentPage + 1) * pendingApprovalPagination.size, pendingApprovalPagination.totalElements)} of {pendingApprovalPagination.totalElements} pending checkouts
                            </small>
                          </div>
                          <div>
                            <nav aria-label="Pending approval pagination">
                              <ul className="pagination mb-0">
                                {/* First page button */}
                                <li className={`page-item ${pendingApprovalPagination.currentPage === 0 ? 'disabled' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => fetchPendingCheckouts(0, pendingApprovalPagination.size)}
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
                                    onClick={() => fetchPendingCheckouts(pendingApprovalPagination.currentPage - 1, pendingApprovalPagination.size)}
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
                                        onClick={() => fetchPendingCheckouts(0, pendingApprovalPagination.size)}
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
                                          onClick={() => fetchPendingCheckouts(i, pendingApprovalPagination.size)}
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
                                          onClick={() => fetchPendingCheckouts(totalPages - 1, pendingApprovalPagination.size)}
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
                                    onClick={() => fetchPendingCheckouts(pendingApprovalPagination.currentPage + 1, pendingApprovalPagination.size)}
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
                                    onClick={() => fetchPendingCheckouts(pendingApprovalPagination.totalPages - 1, pendingApprovalPagination.size)}
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
                              onChange={(e) => fetchPendingCheckouts(0, parseInt(e.target.value))}
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

            {/* Pending Returns Tab */}
            {activeTab === 'pending-returns' && (
              <div className="tab-pane fade show active">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading pending returns...</p>
                  </div>
                ) : pendingReturns.length === 0 ? (
                  <div className="card">
                    <div className="card-body">
                      <div className="text-center py-5">
                        <i className="fas fa-undo fa-4x text-muted mb-3"></i>
                        <h4 className="text-muted">No Pending Returns</h4>
                        <p className="text-muted">
                          All approved checkouts have been returned.
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
                            <i className="fas fa-undo me-2"></i>
                            Checkouts Pending Return
                          </h5>
                          <small className="text-muted">
                            Mark checkouts as returned when items are returned by borrowers
                          </small>
                        </div>
                        <div className="col-md-4 text-end">
                          <span className="badge bg-info text-dark fs-6">
                            {pendingReturns.length} pending return
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Checkout #</th>
                              <th>Club</th>
                              <th>Borrower</th>
                              <th>Checkout Date</th>
                              <th>Due Date</th>
                              <th>Total Value</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingReturns.map((checkout) => {
                              const dueDate = new Date(checkout.dueDate);
                              const today = new Date();
                              const isOverdue = dueDate < today;
                              
                              return (
                                <tr key={checkout.id} className={isOverdue ? 'table-danger' : ''}>
                                  <td>
                                    <strong>{checkout.checkoutNumber}</strong>
                                    {checkout.notes && (
                                      <div className="small text-muted">{checkout.notes.substring(0, 50)}...</div>
                                    )}
                                  </td>
                                  <td>
                                    <small className="text-muted">{checkout.clubName}</small>
                                  </td>
                                  <td>
                                    {checkout.borrowerName ? (
                                      <div>
                                        <div>{checkout.borrowerName}</div>
                                        {checkout.borrowerEmail && (
                                          <small className="text-muted">{checkout.borrowerEmail}</small>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )}
                                  </td>
                                  <td>{formatDate(checkout.checkoutDate)}</td>
                                  <td>
                                    {formatDate(checkout.dueDate)}
                                    {isOverdue && (
                                      <div>
                                        <span className="badge bg-danger">OVERDUE</span>
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    <strong>{formatCurrency(checkout.totalEstimatedValue)}</strong>
                                  </td>
                                  <td>
                                    <span className={`badge ${getStatusBadgeClass(checkout.status)}`}>
                                      {checkout.status}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="btn-group" role="group">
                                      <button 
                                        className="btn btn-sm btn-outline-primary"
                                        title="View Checkout"
                                        onClick={() => handleViewClick(checkout)}
                                      >
                                        <i className="fas fa-eye"></i>
                                      </button>
                                      
                                      <button 
                                        className="btn btn-sm btn-success"
                                        title="Mark as Returned"
                                        onClick={() => handleMarkAsReturned(checkout.id)}
                                      >
                                        <i className="fas fa-check me-1"></i>
                                        Mark Returned
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Pagination Controls for Pending Returns */}
                    {pendingReturns.length > 0 && pendingReturnsPagination.totalPages > 0 && (
                      <div className="card-footer">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <small className="text-muted">
                              Showing {pendingReturnsPagination.currentPage * pendingReturnsPagination.size + 1} to {Math.min((pendingReturnsPagination.currentPage + 1) * pendingReturnsPagination.size, pendingReturnsPagination.totalElements)} of {pendingReturnsPagination.totalElements} pending returns
                            </small>
                          </div>
                          <div>
                            <nav aria-label="Pending returns pagination">
                              <ul className="pagination mb-0">
                                {/* First page button */}
                                <li className={`page-item ${pendingReturnsPagination.currentPage === 0 ? 'disabled' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => fetchPendingReturns(0, pendingReturnsPagination.size)}
                                    disabled={pendingReturnsPagination.currentPage === 0}
                                    aria-label="First page"
                                  >
                                    <i className="fas fa-angle-double-left"></i>
                                  </button>
                                </li>
                                
                                {/* Previous page button */}
                                <li className={`page-item ${!pendingReturnsPagination.hasPrevious ? 'disabled' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => fetchPendingReturns(pendingReturnsPagination.currentPage - 1, pendingReturnsPagination.size)}
                                    disabled={!pendingReturnsPagination.hasPrevious}
                                    aria-label="Previous page"
                                  >
                                    <i className="fas fa-angle-left"></i>
                                  </button>
                                </li>
                                
                                {/* Page numbers with ellipsis */}
                                {(() => {
                                  const pages = [];
                                  const totalPages = pendingReturnsPagination.totalPages;
                                  const currentPage = pendingReturnsPagination.currentPage;
                                  
                                  // Always show first page
                                  pages.push(
                                    <li key={0} className={`page-item ${currentPage === 0 ? 'active' : ''}`}>
                                      <button 
                                        className="page-link" 
                                        onClick={() => fetchPendingReturns(0, pendingReturnsPagination.size)}
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
                                          onClick={() => fetchPendingReturns(i, pendingReturnsPagination.size)}
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
                                          onClick={() => fetchPendingReturns(totalPages - 1, pendingReturnsPagination.size)}
                                        >
                                          {totalPages}
                                        </button>
                                      </li>
                                    );
                                  }
                                  
                                  return pages;
                                })()}
                                
                                {/* Next page button */}
                                <li className={`page-item ${!pendingReturnsPagination.hasNext ? 'disabled' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => fetchPendingReturns(pendingReturnsPagination.currentPage + 1, pendingReturnsPagination.size)}
                                    disabled={!pendingReturnsPagination.hasNext}
                                    aria-label="Next page"
                                  >
                                    <i className="fas fa-angle-right"></i>
                                  </button>
                                </li>
                                
                                {/* Last page button */}
                                <li className={`page-item ${pendingReturnsPagination.currentPage === pendingReturnsPagination.totalPages - 1 ? 'disabled' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => fetchPendingReturns(pendingReturnsPagination.totalPages - 1, pendingReturnsPagination.size)}
                                    disabled={pendingReturnsPagination.currentPage === pendingReturnsPagination.totalPages - 1}
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
                              value={pendingReturnsPagination.size}
                              onChange={(e) => fetchPendingReturns(0, parseInt(e.target.value))}
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

            {/* Add New Checkout Tab */}
            {activeTab === 'add' && (
              <div className="tab-pane fade show active">
                {/* Create New Checkout Form */}
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="fas fa-plus me-2"></i>
                Create New Checkout
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Checkout Information */}
                  <div className="col-md-6">
                    <h6 className="text-primary mb-3">Checkout Information</h6>
                    <div className="mb-3">
                      <label className="form-label">Club *</label>
                      <input
                        type="text"
                        className="form-control"
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
                    <div className="row">
                      <div className="col-6">
                        <div className="mb-3">
                          <label className="form-label">Checkout Date *</label>
                          <input
                            type="date"
                            className="form-control"
                            name="checkoutDate"
                            value={newCheckout.checkoutDate}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="mb-3">
                          <label className="form-label">Due Date *</label>
                          <input
                            type="date"
                            className="form-control"
                            name="dueDate"
                            value={newCheckout.dueDate}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Borrower Information */}
                  <div className="col-md-6">
                    <h6 className="text-primary mb-3">Borrower Information</h6>
                    <div className="mb-3">
                      <label className="form-label">Borrower Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="borrowerName"
                        value={newCheckout.borrowerName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Borrower Email *</label>
                      <input
                        type="email"
                        className="form-control"
                        name="borrowerEmail"
                        value={newCheckout.borrowerEmail}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        name="borrowerPhone"
                        value={newCheckout.borrowerPhone}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Address</label>
                      <textarea
                        className="form-control"
                        name="borrowerAddress"
                        value={newCheckout.borrowerAddress}
                        onChange={handleInputChange}
                        rows="3"
                      />
                    </div>
                  </div>
                </div>

                {/* Checkout Items */}
                <div className="row mt-4">
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="text-primary mb-0">Items to Checkout *</h6>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={addCheckoutItem}
                      >
                        <i className="fas fa-plus me-1"></i>
                        Add Item
                      </button>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th>Item Name *</th>
                            <th>Type</th>
                            <th>Code</th>
                            <th>Qty</th>
                            <th>Condition</th>
                            <th>Est. Value</th>
                            <th>Notes</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {newCheckout.checkoutItems.map((item, index) => (
                            <tr key={index}>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.itemName}
                                  onChange={(e) => handleCheckoutItemChange(index, 'itemName', e.target.value)}
                                  placeholder="Item name"
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.itemType}
                                  onChange={(e) => handleCheckoutItemChange(index, 'itemType', e.target.value)}
                                  placeholder="Type"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.itemCode}
                                  onChange={(e) => handleCheckoutItemChange(index, 'itemCode', e.target.value)}
                                  placeholder="Code"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.quantity}
                                  onChange={(e) => handleCheckoutItemChange(index, 'quantity', e.target.value)}
                                  min="1"
                                  required
                                />
                              </td>
                              <td>
                                <select
                                  className="form-select form-select-sm"
                                  value={item.condition}
                                  onChange={(e) => handleCheckoutItemChange(index, 'condition', e.target.value)}
                                >
                                  <option value="EXCELLENT">Excellent</option>
                                  <option value="GOOD">Good</option>
                                  <option value="FAIR">Fair</option>
                                  <option value="POOR">Poor</option>
                                  <option value="DAMAGED">Damaged</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.estimatedValue}
                                  onChange={(e) => handleCheckoutItemChange(index, 'estimatedValue', e.target.value)}
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.notes}
                                  onChange={(e) => handleCheckoutItemChange(index, 'notes', e.target.value)}
                                  placeholder="Notes"
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeCheckoutItem(index)}
                                  disabled={newCheckout.checkoutItems.length === 1}
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
                            <td colSpan="7" className="text-end"><strong>Total Estimated Value:</strong></td>
                            <td><strong>{formatCurrency(calculateTotalValue())}</strong></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="row mt-3">
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-control"
                        name="notes"
                        value={newCheckout.notes}
                        onChange={handleInputChange}
                        rows="3"
                        placeholder="Optional notes about this checkout..."
                      />
                    </div>
                  </div>
                </div>

                <div className="text-end">
                  <button type="submit" className="btn btn-primary" disabled={formLoading}>
                    {formLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        Create Checkout
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
      )}

      {/* Advanced Filter Modal */}
      {filterModal.show && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-filter me-2"></i>
                  Filter & Sort Checkouts
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
                            <option value="ACTIVE">Active</option>
                            <option value="RETURNED">Returned</option>
                            <option value="OVERDUE">Overdue</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label text-start">Borrower Name</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Search by borrower name"
                            value={filters.borrower}
                            onChange={(e) => setFilters(prev => ({...prev, borrower: e.target.value}))}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label text-start">Checkout Date From</label>
                          <input
                            type="date"
                            className="form-control"
                            value={filters.checkoutDateFrom}
                            onChange={(e) => setFilters(prev => ({...prev, checkoutDateFrom: e.target.value}))}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label text-start">Checkout Date To</label>
                          <input
                            type="date"
                            className="form-control"
                            value={filters.checkoutDateTo}
                            onChange={(e) => setFilters(prev => ({...prev, checkoutDateTo: e.target.value}))}
                          />
                        </div>
                      </div>
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
                    </div>
                    
                    <div className="row">
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
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label text-start">Min Value</label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="0.00"
                            value={filters.minValue}
                            onChange={(e) => setFilters(prev => ({...prev, minValue: e.target.value}))}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label text-start">Max Value</label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="1000.00"
                            value={filters.maxValue}
                            onChange={(e) => setFilters(prev => ({...prev, maxValue: e.target.value}))}
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
                        <option value="checkoutNumber">Checkout Number</option>
                        <option value="clubname">Club Name</option>
                        <option value="borrowerName">Borrower Name</option>
                        <option value="status">Status</option>
                        <option value="checkoutdate">Checkout Date</option>
                        <option value="duedate">Due Date</option>
                        <option value="totalEstimatedValue">Total Value</option>
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
                            borrower: '',
                            checkoutDateFrom: '',
                            checkoutDateTo: '',
                            dueDateFrom: '',
                            dueDateTo: '',
                            minValue: '',
                            maxValue: ''
                          });
                          setSortConfig({
                            field: 'checkoutNumber',
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
                    Showing {filteredCheckouts.length} of {Array.isArray(checkouts) ? checkouts.length : 0} checkouts
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

      {/* View Checkout Modal */}
      {viewModal.show && viewModal.checkout && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-clipboard-check me-2"></i>
                  Checkout Details - {viewModal.checkout.checkoutNumber}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {/* Checkout Information */}
                  <div className="col-md-6">
                    <h6 className="text-primary mb-3">Checkout Information</h6>
                    <table className="table table-sm table-borderless">
                      <tbody>
                        <tr>
                          <td><strong>Checkout Number:</strong></td>
                          <td>{viewModal.checkout.checkoutNumber}</td>
                        </tr>
                        <tr>
                          <td><strong>Club:</strong></td>
                          <td>{viewModal.checkout.clubName}</td>
                        </tr>
                        <tr>
                          <td><strong>Checkout Date:</strong></td>
                          <td>{formatDate(viewModal.checkout.checkoutDate)}</td>
                        </tr>
                        <tr>
                          <td><strong>Due Date:</strong></td>
                          <td>{formatDate(viewModal.checkout.dueDate)}</td>
                        </tr>
                        <tr>
                          <td><strong>Return Date:</strong></td>
                          <td>{formatDate(viewModal.checkout.returnDate)}</td>
                        </tr>
                        <tr>
                          <td><strong>Status:</strong></td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(viewModal.checkout.status)}`}>
                              {viewModal.checkout.status || 'ACTIVE'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Borrower Information */}
                  <div className="col-md-6">
                    <h6 className="text-primary mb-3">Borrower Information</h6>
                    <table className="table table-sm table-borderless">
                      <tbody>
                        <tr>
                          <td><strong>Name:</strong></td>
                          <td>{viewModal.checkout.borrowerName}</td>
                        </tr>
                        <tr>
                          <td><strong>Email:</strong></td>
                          <td>{viewModal.checkout.borrowerEmail}</td>
                        </tr>
                        <tr>
                          <td><strong>Phone:</strong></td>
                          <td>{viewModal.checkout.borrowerPhone || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Address:</strong></td>
                          <td>{viewModal.checkout.borrowerAddress || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Created:</strong></td>
                          <td>{formatDate(viewModal.checkout.createdAt)}</td>
                        </tr>
                        <tr>
                          <td><strong>Updated:</strong></td>
                          <td>{formatDate(viewModal.checkout.updatedAt)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Checkout Items */}
                <div className="row mt-4">
                  <div className="col-12">
                    <h6 className="text-primary mb-3">Checked Out Items</h6>
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th>Item Name</th>
                            <th>Type</th>
                            <th>Code</th>
                            <th>Qty</th>
                            <th>Condition</th>
                            <th>Est. Value</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewModal.checkout.checkoutItems && viewModal.checkout.checkoutItems.map((item, index) => (
                            <tr key={index}>
                              <td><strong>{item.itemName}</strong></td>
                              <td>{item.itemType || 'N/A'}</td>
                              <td>{item.itemCode || 'N/A'}</td>
                              <td className="text-center">{item.quantity}</td>
                              <td>
                                <span className={`badge ${item.condition === 'EXCELLENT' ? 'bg-success' : 
                                  item.condition === 'GOOD' ? 'bg-primary' : 
                                  item.condition === 'FAIR' ? 'bg-warning' : 'bg-danger'}`}>
                                  {item.condition || 'N/A'}
                                </span>
                              </td>
                              <td className="text-end">{formatCurrency(item.estimatedValue || 0)}</td>
                              <td>{item.notes || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="table-light">
                          <tr>
                            <td colSpan="6" className="text-end"><strong>Total Estimated Value:</strong></td>
                            <td className="text-end"><strong>{formatCurrency(viewModal.checkout.totalEstimatedValue)}</strong></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {viewModal.checkout.notes && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <h6 className="text-primary mb-2">Notes</h6>
                      <div className="alert alert-light">
                        {viewModal.checkout.notes}
                      </div>
                    </div>
                  </div>
                )}

                {/* Return Notes */}
                {viewModal.checkout.returnNotes && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <h6 className="text-primary mb-2">Return Notes</h6>
                      <div className="alert alert-info">
                        {viewModal.checkout.returnNotes}
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

      {/* Edit Checkout Modal */}
      {editModal.show && editModal.checkout && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-edit me-2"></i>
                  Edit Checkout - {editCheckout.checkoutNumber}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body">
                  <div className="row">
                    {/* Checkout Information */}
                    <div className="col-md-6">
                      <h6 className="text-primary mb-3">Checkout Information</h6>
                      <div className="mb-3">
                        <label className="form-label">Checkout Number</label>
                        <input
                          type="text"
                          className="form-control"
                          name="checkoutNumber"
                          value={editCheckout.checkoutNumber}
                          onChange={handleEditInputChange}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Club</label>
                        <select
                          className="form-select"
                          name="clubId"
                          value={editCheckout.clubId}
                          onChange={(e) => {
                            const selectedClub = clubs.find(club => club.id === e.target.value);
                            setEditCheckout(prev => ({
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
                            <label className="form-label">Checkout Date</label>
                            <input
                              type="date"
                              className="form-control"
                              name="checkoutDate"
                              value={editCheckout.checkoutDate}
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
                              value={editCheckout.dueDate}
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
                          value={editCheckout.status}
                          onChange={handleEditInputChange}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="RETURNED">Returned</option>
                          <option value="OVERDUE">Overdue</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    {/* Borrower Information */}
                    <div className="col-md-6">
                      <h6 className="text-primary mb-3">Borrower Information</h6>
                      <div className="mb-3">
                        <label className="form-label">Borrower Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="borrowerName"
                          value={editCheckout.borrowerName}
                          onChange={handleEditInputChange}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Borrower Email</label>
                        <input
                          type="email"
                          className="form-control"
                          name="borrowerEmail"
                          value={editCheckout.borrowerEmail}
                          onChange={handleEditInputChange}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Phone Number</label>
                        <input
                          type="tel"
                          className="form-control"
                          name="borrowerPhone"
                          value={editCheckout.borrowerPhone}
                          onChange={handleEditInputChange}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Address</label>
                        <textarea
                          className="form-control"
                          name="borrowerAddress"
                          value={editCheckout.borrowerAddress}
                          onChange={handleEditInputChange}
                          rows="3"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Checkout Items */}
                  <div className="row mt-4">
                    <div className="col-12">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="text-primary mb-0">Checkout Items</h6>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={addEditCheckoutItem}
                        >
                          <i className="fas fa-plus me-1"></i>
                          Add Item
                        </button>
                      </div>
                      <div className="table-responsive">
                        <table className="table table-bordered">
                          <thead className="table-light">
                            <tr>
                              <th>Item Name</th>
                              <th>Type</th>
                              <th>Code</th>
                              <th>Qty</th>
                              <th>Condition</th>
                              <th>Est. Value</th>
                              <th>Notes</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {editCheckout.checkoutItems.map((item, index) => (
                              <tr key={index}>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={item.itemName}
                                    onChange={(e) => handleEditCheckoutItemChange(index, 'itemName', e.target.value)}
                                    placeholder="Item name"
                                    required
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={item.itemType}
                                    onChange={(e) => handleEditCheckoutItemChange(index, 'itemType', e.target.value)}
                                    placeholder="Type"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={item.itemCode}
                                    onChange={(e) => handleEditCheckoutItemChange(index, 'itemCode', e.target.value)}
                                    placeholder="Code"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={item.quantity}
                                    onChange={(e) => handleEditCheckoutItemChange(index, 'quantity', e.target.value)}
                                    min="1"
                                    required
                                  />
                                </td>
                                <td>
                                  <select
                                    className="form-select form-select-sm"
                                    value={item.condition}
                                    onChange={(e) => handleEditCheckoutItemChange(index, 'condition', e.target.value)}
                                  >
                                    <option value="EXCELLENT">Excellent</option>
                                    <option value="GOOD">Good</option>
                                    <option value="FAIR">Fair</option>
                                    <option value="POOR">Poor</option>
                                    <option value="DAMAGED">Damaged</option>
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={item.estimatedValue}
                                    onChange={(e) => handleEditCheckoutItemChange(index, 'estimatedValue', e.target.value)}
                                    min="0"
                                    step="0.01"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={item.notes}
                                    onChange={(e) => handleEditCheckoutItemChange(index, 'notes', e.target.value)}
                                    placeholder="Notes"
                                  />
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => removeEditCheckoutItem(index)}
                                    disabled={editCheckout.checkoutItems.length === 1}
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
                              <td colSpan="7" className="text-end"><strong>Total Estimated Value:</strong></td>
                              <td><strong>{formatCurrency(calculateEditTotalValue())}</strong></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="row mt-3">
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label">Notes</label>
                        <textarea
                          className="form-control"
                          name="notes"
                          value={editCheckout.notes}
                          onChange={handleEditInputChange}
                          rows="3"
                          placeholder="Optional notes..."
                        />
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
                        Update Checkout
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
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this checkout?</p>
                <div className="alert alert-warning">
                  <strong>Checkout:</strong> {deleteModal.checkout?.checkoutNumber}<br />
                  <strong>Club:</strong> {deleteModal.checkout?.clubName}<br />
                  <strong>Borrower:</strong> {deleteModal.checkout?.borrowerName}
                </div>
                <p><strong>This action cannot be undone!</strong></p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                  <i className="fas fa-trash me-2"></i>
                  Delete Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval/Rejection Modal */}
      {approvalModal.show && approvalModal.checkout && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {approvalModal.action === 'approve' ? (
                    <>
                      <i className="fas fa-check-circle text-success me-2"></i>
                      Approve Checkout
                    </>
                  ) : (
                    <>
                      <i className="fas fa-times-circle text-danger me-2"></i>
                      Reject Checkout
                    </>
                  )}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info">
                  <strong>Checkout:</strong> {approvalModal.checkout?.checkoutNumber}<br />
                  <strong>Club:</strong> {approvalModal.checkout?.clubName}<br />
                  <strong>Borrower:</strong> {approvalModal.checkout?.borrowerName}<br />
                  <strong>Checkout Date:</strong> {approvalModal.checkout?.checkoutDate}
                </div>
                
                {approvalModal.action === 'approve' ? (
                  <p>Are you sure you want to approve this checkout?</p>
                ) : (
                  <div>
                    <p>Please provide a reason for rejecting this checkout:</p>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter rejection reason..."
                      required
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                {approvalModal.action === 'approve' ? (
                  <button 
                    type="button" 
                    className="btn btn-success"
                    onClick={confirmApproval}
                  >
                    <i className="fas fa-check me-2"></i>
                    Approve Checkout
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="btn btn-danger"
                    onClick={confirmRejection}
                    disabled={!rejectionReason.trim()}
                  >
                    <i className="fas fa-times me-2"></i>
                    Reject Checkout
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

export default CheckoutsManagement;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         