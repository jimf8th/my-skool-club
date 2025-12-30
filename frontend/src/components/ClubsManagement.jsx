import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiService';

const ClubsManagement = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [clubs, setClubs] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentMember, setCurrentMember] = useState(null);
  const [memberClubRoles, setMemberClubRoles] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ show: false, club: null });
  const [editModal, setEditModal] = useState({ show: false, club: null });
  const [viewModal, setViewModal] = useState({ show: false, club: null });
  const [filteredClubs, setFilteredClubs] = useState([]);
  
  // Advanced search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [filterModal, setFilterModal] = useState({ show: false });
  const [filters, setFilters] = useState({
    category: '',
    meetingDay: '',
    advisorName: '',
    status: ''
  });
  const [sortConfig, setSortConfig] = useState({
    field: 'name',
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
  
  // Form state for adding new club
  const [newClub, setNewClub] = useState({
    name: '',
    schoolId: '',
    schoolName: '',
    description: '',
    category: '',
    advisorName: '',
    advisorEmail: '',
    meetingLocation: '',
    meetingTime: '',
    meetingDay: '',
    maxMembers: '',
    adminMemberIds: [],
    tags: []
  });
  const [formLoading, setFormLoading] = useState(false);
  
  // Admin selection state
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedAdminEmails, setSelectedAdminEmails] = useState([]);
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Edit modal admin selection state
  const [editAvailableMembers, setEditAvailableMembers] = useState([]);
  const [editSelectedAdminEmails, setEditSelectedAdminEmails] = useState([]);
  const [editAdminEmailInput, setEditAdminEmailInput] = useState('');
  const [editShowAdminDropdown, setEditShowAdminDropdown] = useState(false);
  const [editFilteredMembers, setEditFilteredMembers] = useState([]);
  const [editLoadingMembers, setEditLoadingMembers] = useState(false);
  const [currentClubAdmins, setCurrentClubAdmins] = useState([]);
  const [clubAdminsList, setClubAdminsList] = useState([]);
  const [loadingClubAdmins, setLoadingClubAdmins] = useState(false);
  const [addAdminEmail, setAddAdminEmail] = useState('');
  const [addAdminDropdown, setAddAdminDropdown] = useState(false);
  const [addAdminFilteredMembers, setAddAdminFilteredMembers] = useState([]);
  const [schoolMembers, setSchoolMembers] = useState([]);
  const [loadingSchoolMembers, setLoadingSchoolMembers] = useState(false);
  const [allClubMembers, setAllClubMembers] = useState([]); // All members in the club (admins + users)
  
  // My Clubs state
  const [myClubs, setMyClubs] = useState([]);
  const [loadingMyClubs, setLoadingMyClubs] = useState(false);
  
  // Edit form state
  const [editClub, setEditClub] = useState({
    name: '',
    schoolId: '',
    schoolName: '',
    description: '',
    category: '',
    advisorName: '',
    advisorEmail: '',
    meetingLocation: '',
    meetingTime: '',
    meetingDay: '',
    maxMembers: '',
    tags: []
  });

  useEffect(() => {
    // If any advanced filters are applied, use advanced search
    const hasAdvancedFilters = searchQuery.trim() || filters.category || 
                              filters.meetingDay || filters.advisorName || filters.status ||
                              sortConfig.field !== 'name' || sortConfig.direction !== 'asc';
                              
    if (hasAdvancedFilters) {
      // Advanced search clubs function
      const searchClubs = async () => {
        try {
          setLoading(true);
          
          const params = new URLSearchParams();
          if (searchQuery.trim()) params.append('search', searchQuery.trim());
          if (filters.category) params.append('category', filters.category);
          if (filters.meetingDay) params.append('meetingDay', filters.meetingDay);
          if (filters.advisorName) params.append('advisorName', filters.advisorName);
          if (filters.status) params.append('status', filters.status);
          if (sortConfig.field) params.append('sortBy', sortConfig.field);
          if (sortConfig.direction) params.append('sortDirection', sortConfig.direction);
          params.append('activeOnly', 'false');
          
          const response = await apiService.get(`/clubs/advanced-search?${params.toString()}`);
          
          if (response.success && response.data && Array.isArray(response.data.data)) {
            setFilteredClubs(response.data.data);
          } else {
            console.warn('Invalid search results:', response);
            setFilteredClubs([]);
          }
        } catch (error) {
          console.error('Error searching clubs:', error);
          setFilteredClubs([]);
          setMessage({ type: 'error', text: 'An error occurred while searching clubs' });
        } finally {
          setLoading(false);
        }
      };
      
      searchClubs();
    } else {
      // Default behavior - show all clubs
      const clubsArray = Array.isArray(clubs) ? clubs : [];
      setFilteredClubs(clubsArray);
    }
  }, [clubs, searchQuery, filters, sortConfig]);

  const fetchClubs = useCallback(async (page = 0, size = 10) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
        sortBy: sortConfig.field,
        sortDirection: sortConfig.direction,
        activeOnly: 'false'
      });
      
      const response = await apiService.get(`/clubs?${params.toString()}`);
      if (response.success && response.data && Array.isArray(response.data.data)) {
        setClubs(response.data.data);
        setPagination({
          currentPage: response.data.currentPage || 0,
          totalPages: response.data.totalPages || 0,
          totalElements: response.data.totalElements || 0,
          size: response.data.size || 10,
          hasNext: response.data.hasNext || false,
          hasPrevious: response.data.hasPrevious || false
        });
      } else {
        console.warn('Invalid clubs data received:', response);
        setClubs([]);
        setMessage({ type: 'error', text: 'Failed to fetch clubs - invalid data format' });
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
      setClubs([]);
      setMessage({ type: 'error', text: 'An error occurred while fetching clubs' });
    } finally {
      setLoading(false);
    }
  }, [sortConfig.field, sortConfig.direction]);

  useEffect(() => {
    // Load current member data
    const memberData = localStorage.getItem('currentMember');
    if (memberData) {
      try {
        const member = JSON.parse(memberData);
        setCurrentMember(member);
        
        // Fetch member club roles for all authenticated users
        fetchMemberClubRoles();
        
        // Only fetch schools if user can manage clubs (APP_ADMIN or SCHOOL_ADMIN)
        if (member.role === 'APP_ADMIN' || member.role === 'SCHOOL_ADMIN') {
          fetchSchools();
        }
      } catch (error) {
        console.error('Error parsing member data:', error);
      }
    }
    
    if (activeTab === 'list') {
      fetchClubs();
    }
  }, [activeTab, fetchClubs]);

  // Auto-populate school for SCHOOL_ADMIN users
  useEffect(() => {
    if (currentMember && currentMember.role === 'SCHOOL_ADMIN') {
      const selectedSchool = schools.find(school => school.id === currentMember.schoolId);
      if (selectedSchool) {
        setNewClub(prev => ({
          ...prev,
          schoolId: currentMember.schoolId,
          schoolName: selectedSchool.name
        }));
        // Fetch members for admin selection
        fetchSchoolMembers(currentMember.schoolId);
      }
    }
  }, [currentMember, schools]);

  useEffect(() => {
    // Debounce search to avoid triggering on every keystroke
    const timer = setTimeout(() => {
      // If any advanced filters are applied, use advanced search
      const hasAdvancedFilters = searchQuery.trim() || filters.category || 
                                filters.meetingDay || filters.advisorName || filters.status ||
                                sortConfig.field !== 'name' || sortConfig.direction !== 'asc';
                                
      if (hasAdvancedFilters) {
        // Advanced search clubs function
        const searchClubs = async () => {
          try {
            setSearchLoading(true);
            
            const params = new URLSearchParams();
            if (searchQuery.trim()) params.append('search', searchQuery.trim());
            if (filters.category) params.append('category', filters.category);
            if (filters.meetingDay) params.append('meetingDay', filters.meetingDay);
            if (filters.advisorName) params.append('advisorName', filters.advisorName);
            if (filters.status) params.append('status', filters.status);
            if (sortConfig.field) params.append('sortBy', sortConfig.field);
            if (sortConfig.direction) params.append('sortDirection', sortConfig.direction);
            params.append('activeOnly', 'false');
            
            const response = await apiService.get(`/clubs/advanced-search?${params.toString()}`);
            
            if (response.success && response.data && Array.isArray(response.data.data)) {
              setFilteredClubs(response.data.data);
            } else {
              console.warn('Invalid search results:', response);
              setFilteredClubs([]);
            }
          } catch (error) {
            console.error('Error searching clubs:', error);
            setFilteredClubs([]);
            setMessage({ type: 'error', text: 'An error occurred while searching clubs' });
          } finally {
            setSearchLoading(false);
          }
        };
        
        searchClubs();
      } else {
        // Default behavior - show all clubs
        const clubsArray = Array.isArray(clubs) ? clubs : [];
        setFilteredClubs(clubsArray);
      }
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [clubs, searchQuery, filters, sortConfig]);

  const fetchSchools = async () => {
    try {
      const response = await apiService.get('/schools');
      // Schools API returns array directly, not wrapped in response object
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

  const fetchMyClubs = async (memberId) => {
    try {
      setLoadingMyClubs(true);
      const response = await apiService.get(`/user-club-roles/member/${memberId}`);
      
      const rolesData = response.data?.data || response.data;
      
      if (response.success && rolesData && Array.isArray(rolesData)) {
        // Sort clubs to show admin clubs first
        const sortedClubs = rolesData.sort((a, b) => {
          if (a.clubRole === 'CLUB_ADMIN' && b.clubRole !== 'CLUB_ADMIN') return -1;
          if (a.clubRole !== 'CLUB_ADMIN' && b.clubRole === 'CLUB_ADMIN') return 1;
          return a.clubName.localeCompare(b.clubName);
        });
        
        setMyClubs(sortedClubs);
      } else {
        setMyClubs([]);
      }
    } catch (error) {
      console.error('Error fetching my clubs:', error);
      setMyClubs([]);
      setMessage({ type: 'error', text: 'Failed to load your clubs' });
    } finally {
      setLoadingMyClubs(false);
    }
  };

  useEffect(() => {
    // If any advanced filters are applied, use advanced search
    const hasAdvancedFilters = searchQuery.trim() || filters.category || 
                              filters.meetingDay || filters.advisorName || filters.status ||
                              sortConfig.field !== 'name' || sortConfig.direction !== 'asc';
                              
    if (hasAdvancedFilters) {
      // Advanced search clubs function
      const searchClubs = async () => {
        try {
          setLoading(true);
          
          const params = new URLSearchParams();
          if (searchQuery.trim()) params.append('search', searchQuery.trim());
          if (filters.category) params.append('category', filters.category);
          if (filters.meetingDay) params.append('meetingDay', filters.meetingDay);
          if (filters.advisorName) params.append('advisorName', filters.advisorName);
          if (filters.status) params.append('status', filters.status);
          if (sortConfig.field) params.append('sortBy', sortConfig.field);
          if (sortConfig.direction) params.append('sortDirection', sortConfig.direction);
          params.append('activeOnly', 'false');
          
          const response = await apiService.get(`/clubs/advanced-search?${params.toString()}`);
          
          if (response.success && response.data && Array.isArray(response.data.data)) {
            setFilteredClubs(response.data.data);
          } else {
            console.warn('Invalid search results:', response);
            setFilteredClubs([]);
          }
        } catch (error) {
          console.error('Error searching clubs:', error);
          setFilteredClubs([]);
          setMessage({ type: 'error', text: 'An error occurred while searching clubs' });
        } finally {
          setLoading(false);
        }
      };
      
      searchClubs();
    } else {
      // Default behavior - show all clubs
      const clubsArray = Array.isArray(clubs) ? clubs : [];
      setFilteredClubs(clubsArray);
    }
  }, [clubs, searchQuery, filters, sortConfig]);

  // Form handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'schoolId') {
      const selectedSchoolObj = Array.isArray(schools) ? 
        schools.find(school => school.id === value) : null;
      setNewClub(prev => ({
        ...prev,
        schoolId: value,
        schoolName: selectedSchoolObj ? selectedSchoolObj.name : ''
      }));
      // Fetch members when school is selected
      if (value) {
        fetchSchoolMembers(value);
      } else {
        setAvailableMembers([]);
        setSelectedAdminEmails([]);
        setAdminEmailInput('');
      }
    } else {
      setNewClub(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Fetch school members for admin selection
  const fetchSchoolMembers = async (schoolId) => {
    try {
      setLoadingMembers(true);
      const response = await apiService.get(`/members/school/${schoolId}`);
      if (response.success && response.data && Array.isArray(response.data)) {
        setAvailableMembers(response.data);
      } else {
        setAvailableMembers([]);
      }
    } catch (error) {
      console.error('Error fetching school members:', error);
      setAvailableMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Handle admin email input change with typeahead
  const handleAdminEmailChange = (value) => {
    setAdminEmailInput(value);
    
    if (value.trim().length >= 2) {
      const filtered = availableMembers.filter(member => 
        !selectedAdminEmails.includes(member.email.toLowerCase()) &&
        (
          member.email.toLowerCase().includes(value.toLowerCase()) ||
          member.firstName.toLowerCase().includes(value.toLowerCase()) ||
          member.lastName.toLowerCase().includes(value.toLowerCase()) ||
          `${member.firstName} ${member.lastName}`.toLowerCase().includes(value.toLowerCase())
        )
      );
      setFilteredMembers(filtered);
      setShowAdminDropdown(filtered.length > 0);
    } else {
      setFilteredMembers([]);
      setShowAdminDropdown(false);
    }
  };

  // Add admin email
  const handleAddAdminEmail = (email = null) => {
    const emailToAdd = email || adminEmailInput.trim().toLowerCase();
    
    if (!emailToAdd) {
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToAdd)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }
    
    // Check if already added
    if (selectedAdminEmails.includes(emailToAdd)) {
      setMessage({ type: 'error', text: 'This email has already been added' });
      return;
    }
    
    setSelectedAdminEmails(prev => [...prev, emailToAdd]);
    setAdminEmailInput('');
    setShowAdminDropdown(false);
    setFilteredMembers([]);
    setMessage({ type: '', text: '' });
  };

  // Remove admin email
  const handleRemoveAdminEmail = (email) => {
    setSelectedAdminEmails(prev => prev.filter(e => e !== email));
  };

  // Select from typeahead dropdown
  const selectFromDropdown = (member) => {
    handleAddAdminEmail(member.email.toLowerCase());
  };

  // Handle Enter key
  const handleAdminEmailKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAdminEmail();
    }
  };

  // Edit modal admin functions
  const fetchEditSchoolMembers = async (schoolId) => {
    try {
      setEditLoadingMembers(true);
      const response = await apiService.get(`/members/school/${schoolId}`);
      if (response.success && response.data && Array.isArray(response.data)) {
        setEditAvailableMembers(response.data);
      } else {
        setEditAvailableMembers([]);
      }
    } catch (error) {
      console.error('Error fetching school members:', error);
      setEditAvailableMembers([]);
    } finally {
      setEditLoadingMembers(false);
    }
  };

  const fetchClubAdminsList = async (clubId) => {
    try {
      setLoadingClubAdmins(true);
      const response = await apiService.get(`/user-club-roles/club/${clubId}`);
      
      const rolesData = response.data?.data || response.data;
      
      if (response.success && rolesData && Array.isArray(rolesData)) {
        // Store all club members (both admins and users)
        setAllClubMembers(rolesData);
        // Filter and store only admins
        const admins = rolesData.filter(role => role.clubRole === 'CLUB_ADMIN');
        setClubAdminsList(admins);
      } else {
        setAllClubMembers([]);
        setClubAdminsList([]);
      }
    } catch (error) {
      console.error('Error fetching club admins list:', error);
      setAllClubMembers([]);
      setClubAdminsList([]);
    } finally {
      setLoadingClubAdmins(false);
    }
  };

  const handleDemoteAdmin = async (adminId, clubId) => {
    // Check if this is the last admin
    if (clubAdminsList.length <= 1) {
      setMessage({ 
        type: 'error', 
        text: 'Cannot remove the last club admin. Every club must have at least one admin.' 
      });
      return;
    }

    if (!window.confirm('Are you sure you want to remove this admin? They will be changed to a regular club member.')) {
      return;
    }

    try {
      setLoadingClubAdmins(true);
      const response = await apiService.put(`/user-club-roles/${adminId}/role`, {
        role: 'CLUB_USER'
      });

      if (response.success) {
        setMessage({ type: 'success', text: 'Admin demoted to club member successfully!' });
        await fetchClubAdminsList(clubId);
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to demote admin' });
      }
    } catch (error) {
      console.error('Error demoting admin:', error);
      setMessage({ type: 'error', text: 'An error occurred while demoting admin' });
    } finally {
      setLoadingClubAdmins(false);
    }
  };

  const fetchSchoolMembersForAddAdmin = async (schoolId) => {
    try {
      setLoadingSchoolMembers(true);
      const response = await apiService.get(`/members/school/${schoolId}`);
      if (response.success && response.data && Array.isArray(response.data)) {
        setSchoolMembers(response.data);
      } else {
        setSchoolMembers([]);
      }
    } catch (error) {
      console.error('Error fetching school members:', error);
      setSchoolMembers([]);
    } finally {
      setLoadingSchoolMembers(false);
    }
  };

  const handleAddAdminEmailChange = (value) => {
    setAddAdminEmail(value);
    
    if (value.trim().length >= 2) {
      const filtered = schoolMembers.filter(member => {
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
        const email = member.email.toLowerCase();
        const searchTerm = value.toLowerCase();
        
        // Check if member is already a club admin
        const isAlreadyAdmin = clubAdminsList.some(admin => 
          admin.memberEmail.toLowerCase() === member.email.toLowerCase()
        );
        
        return !isAlreadyAdmin && (fullName.includes(searchTerm) || email.includes(searchTerm));
      });
      
      // Enhance each member with their current club role status
      const enhancedFiltered = filtered.map(member => {
        const existingRole = allClubMembers.find(clubMember => 
          clubMember.memberEmail.toLowerCase() === member.email.toLowerCase()
        );
        return {
          ...member,
          currentClubRole: existingRole?.clubRole || null
        };
      });
      
      setAddAdminFilteredMembers(enhancedFiltered);
      setAddAdminDropdown(enhancedFiltered.length > 0);
    } else {
      setAddAdminFilteredMembers([]);
      setAddAdminDropdown(false);
    }
  };

  const handleAddNewAdmin = async (email = null) => {
    const emailToAdd = email || addAdminEmail.trim();
    
    if (!emailToAdd) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToAdd)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    // Check if the member is already a club user (will be elevated)
    const existingMember = allClubMembers.find(member => 
      member.memberEmail.toLowerCase() === emailToAdd.toLowerCase()
    );
    const isElevating = existingMember && existingMember.clubRole === 'CLUB_USER';

    try {
      setLoadingClubAdmins(true);
      const response = await apiService.post('/user-club-roles/by-email', {
        email: emailToAdd.toLowerCase(),
        clubId: editModal.club.id,
        role: 'CLUB_ADMIN'
      });

      if (response.success) {
        const successMessage = isElevating 
          ? 'Member elevated to Club Admin!' 
          : 'Admin added successfully!';
        setMessage({ type: 'success', text: successMessage });
        setAddAdminEmail('');
        setAddAdminDropdown(false);
        await fetchClubAdminsList(editModal.club.id);
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to add admin' });
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'An error occurred while adding admin' });
    } finally {
      setLoadingClubAdmins(false);
    }
  };

  const selectFromAddAdminDropdown = (member) => {
    setAddAdminEmail(member.email);
    setAddAdminDropdown(false);
    handleAddNewAdmin(member.email);
  };

  const handleAddAdminKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNewAdmin();
    }
  };

  const fetchCurrentClubAdmins = async (clubId) => {
    try {
      console.log('Fetching club admins for clubId:', clubId);
      const response = await apiService.get(`/user-club-roles/club/${clubId}`);
      console.log('Club admins API response:', response);
      
      // The response structure is: { success: true, data: { count: X, data: [...] } }
      const rolesData = response.data?.data || response.data;
      
      if (response.success && rolesData && Array.isArray(rolesData)) {
        console.log('Club roles data:', rolesData);
        const admins = rolesData
          .filter(role => role.clubRole === 'CLUB_ADMIN')
          .map(role => role.memberEmail.toLowerCase());
        console.log('Filtered admins:', admins);
        setCurrentClubAdmins(admins);
        setEditSelectedAdminEmails(admins);
      } else {
        console.log('No valid data in response');
        setCurrentClubAdmins([]);
        setEditSelectedAdminEmails([]);
      }
    } catch (error) {
      console.error('Error fetching club admins:', error);
      setCurrentClubAdmins([]);
      setEditSelectedAdminEmails([]);
    }
  };

  const handleEditAdminEmailChange = (value) => {
    setEditAdminEmailInput(value);
    
    if (value.trim().length >= 2) {
      const filtered = editAvailableMembers.filter(member => 
        !editSelectedAdminEmails.includes(member.email.toLowerCase()) &&
        (
          member.email.toLowerCase().includes(value.toLowerCase()) ||
          member.firstName.toLowerCase().includes(value.toLowerCase()) ||
          member.lastName.toLowerCase().includes(value.toLowerCase()) ||
          `${member.firstName} ${member.lastName}`.toLowerCase().includes(value.toLowerCase())
        )
      );
      setEditFilteredMembers(filtered);
      setEditShowAdminDropdown(filtered.length > 0);
    } else {
      setEditFilteredMembers([]);
      setEditShowAdminDropdown(false);
    }
  };

  const handleEditAddAdminEmail = (email = null) => {
    const emailToAdd = email || editAdminEmailInput.trim().toLowerCase();
    
    if (!emailToAdd) {
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToAdd)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }
    
    if (editSelectedAdminEmails.includes(emailToAdd)) {
      setMessage({ type: 'error', text: 'This email has already been added' });
      return;
    }
    
    setEditSelectedAdminEmails(prev => [...prev, emailToAdd]);
    setEditAdminEmailInput('');
    setEditShowAdminDropdown(false);
    setEditFilteredMembers([]);
    setMessage({ type: '', text: '' });
  };

  const handleEditRemoveAdminEmail = (email) => {
    setEditSelectedAdminEmails(prev => prev.filter(e => e !== email));
  };

  const selectFromEditDropdown = (member) => {
    handleEditAddAdminEmail(member.email.toLowerCase());
  };

  const handleEditAdminEmailKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditAddAdminEmail();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newClub.name.trim()) {
      setMessage({ type: 'error', text: 'Club name is required' });
      return;
    }
    if (!newClub.schoolId) {
      setMessage({ type: 'error', text: 'School is required' });
      return;
    }
    if (selectedAdminEmails.length === 0) {
      setMessage({ type: 'error', text: 'At least one club admin email is required' });
      return;
    }

    setFormLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const clubData = {
        ...newClub,
        name: newClub.name.trim(),
        maxMembers: newClub.maxMembers ? parseInt(newClub.maxMembers) : null,
        adminEmails: selectedAdminEmails
      };

      const response = await apiService.post('/clubs', clubData);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Club created successfully!' });
        // Reset form
        setNewClub({
          name: '',
          schoolId: '',
          schoolName: '',
          description: '',
          category: '',
          advisorName: '',
          advisorEmail: '',
          meetingLocation: '',
          meetingTime: '',
          meetingDay: '',
          maxMembers: '',
          tags: []
        });
        setSelectedAdminEmails([]);
        setAdminEmailInput('');
        setAvailableMembers([]);
        // Refresh the clubs list
        if (activeTab === 'list') {
          fetchClubs();
        }
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to create club' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while creating the club' 
      });
    } finally {
      setFormLoading(false);
    }
  };

  // Club management handlers
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentMember');
    localStorage.removeItem('userEmail');
    window.location.href = '/';
  };

  const handleDeleteClick = (club) => {
    setDeleteModal({ show: true, club });
  };

  const handleEditClick = async (club) => {
    setEditClub({
      name: club.name || '',
      schoolId: club.schoolId || '',
      schoolName: club.schoolName || '',
      description: club.description || '',
      category: club.category || '',
      advisorName: club.advisorName || '',
      advisorEmail: club.advisorEmail || '',
      meetingLocation: club.meetingLocation || '',
      meetingTime: club.meetingTime || '',
      meetingDay: club.meetingDay || '',
      maxMembers: club.maxMembers || '',
      tags: club.tags || []
    });
    
    setEditModal({ show: true, club });
    
    // Fetch club admins list and school members
    if (club.id) {
      await fetchClubAdminsList(club.id);
    }
    if (club.schoolId) {
      await fetchSchoolMembersForAddAdmin(club.schoolId);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.club) return;

    try {
      const response = await apiService.delete(`/clubs/${deleteModal.club.id}`);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Club deleted successfully!' });
        setClubs(Array.isArray(clubs) ? clubs.filter(club => club.id !== deleteModal.club.id) : []);
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to delete club' });
      }
    } catch (error) {
      console.error('Error deleting club:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while deleting the club' 
      });
    } finally {
      setDeleteModal({ show: false, club: null });
    }
  };

  const handleDeactivate = async (clubId) => {
    try {
      const response = await apiService.put(`/clubs/${clubId}/deactivate`);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Club deactivated successfully!' });
        setClubs(Array.isArray(clubs) ? clubs.map(club => 
          club.id === clubId ? { ...club, active: false } : club
        ) : []);
        // Refresh the data to ensure pagination totals are accurate
        fetchClubs(pagination.currentPage, pagination.size);
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to deactivate club' });
      }
    } catch (error) {
      console.error('Error deactivating club:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while deactivating the club' 
      });
    }
  };

  const handleActivate = async (clubId) => {
    try {
      const response = await apiService.put(`/clubs/${clubId}/activate`);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Club activated successfully!' });
        setClubs(Array.isArray(clubs) ? clubs.map(club => 
          club.id === clubId ? { ...club, active: true } : club
        ) : []);
        // Refresh the data to ensure pagination totals are accurate
        fetchClubs(pagination.currentPage, pagination.size);
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to activate club' });
      }
    } catch (error) {
      console.error('Error activating club:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.message || 'An error occurred while activating the club' 
      });
    }
  };

  const closeModal = () => {
    setDeleteModal({ show: false, club: null });
  };

  const handleViewClick = (club) => {
    setViewModal({ show: true, club });
  };

  const closeViewModal = () => {
    setViewModal({ show: false, club: null });
  };

  const closeEditModal = () => {
    setEditModal({ show: false, club: null });
    setEditClub({
      name: '',
      schoolId: '',
      schoolName: '',
      description: '',
      category: '',
      advisorName: '',
      advisorEmail: '',
      meetingLocation: '',
      meetingTime: '',
      meetingDay: '',
      maxMembers: '',
      tags: []
    });
    // Clear admin states
    setEditSelectedAdminEmails([]);
    setEditAdminEmailInput('');
    setEditAvailableMembers([]);
    setEditFilteredMembers([]);
    setEditShowAdminDropdown(false);
    setCurrentClubAdmins([]);
    setClubAdminsList([]);
    setAddAdminEmail('');
    setAddAdminDropdown(false);
    setAddAdminFilteredMembers([]);
    setSchoolMembers([]);
    setAllClubMembers([]);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditClub(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Check if current user can manage clubs
  const canManageClubs = () => {
    if (!currentMember) return false;
    return currentMember.role === 'SCHOOL_ADMIN';
  };

  // Check if current user can manage a specific club (activate/deactivate)
  const canManageSpecificClub = (club) => {
    if (!currentMember || !club) return false;
    
    // SCHOOL_ADMIN can manage clubs from their school
    if (currentMember.role === 'SCHOOL_ADMIN' && club.schoolId === currentMember.schoolId) {
      return true;
    }
    
    // CLUB_ADMIN can manage their specific club (based on user_club_roles table)
    if (Array.isArray(memberClubRoles)) {
      const clubRole = memberClubRoles.find(role => role.clubId === club.id);
      if (clubRole && clubRole.clubRole === 'CLUB_ADMIN') {
        return true;
      }
    }
    
    return false;
  };

  // Check if current user can delete a club (only SCHOOL_ADMIN)
  const canDeleteClub = (club) => {
    if (!currentMember || !club) return false;
    
    // Only SCHOOL_ADMIN can delete clubs from their school
    return currentMember.role === 'SCHOOL_ADMIN' && club.schoolId === currentMember.schoolId;
  };

  // Check if current user can edit club details (only CLUB_ADMIN based on user_club_roles)
  const canEditClub = (club) => {
    if (!currentMember || !club) return false;
    
    // CLUB_ADMIN can edit their specific club (based on user_club_roles table)
    if (Array.isArray(memberClubRoles)) {
      const clubRole = memberClubRoles.find(role => role.clubId === club.id);
      if (clubRole && clubRole.clubRole === 'CLUB_ADMIN') {
        return true;
      }
    }
    
    return false;
  };

  const handleEditTagsChange = (e) => {
    const value = e.target.value;
    const tagsArray = value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    setEditClub(prev => ({
      ...prev,
      tags: tagsArray
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!editModal.club) return;
    
    try {
      setFormLoading(true);
      
      const clubData = {
        ...editClub,
        maxMembers: editClub.maxMembers ? parseInt(editClub.maxMembers) : null
      };
      
      const response = await apiService.put(`/clubs/${editModal.club.id}`, clubData);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Club updated successfully!' });
        
        setClubs(prevClubs => 
          Array.isArray(prevClubs) 
            ? prevClubs.map(club => 
                club.id === editModal.club.id ? response.data : club
              )
            : []
        );
        
        setFilteredClubs(prevFiltered => 
          Array.isArray(prevFiltered) 
            ? prevFiltered.map(club => 
                club.id === editModal.club.id ? response.data : club
              )
            : []
        );
        
        closeEditModal();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to update club' });
      }
    } catch (error) {
      console.error('Error updating club:', error);
      setMessage({ type: 'error', text: 'An error occurred while updating the club' });
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="text-primary">
              <i className="fas fa-users me-2"></i>
              Clubs Management
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
          <ul className="nav nav-tabs mb-4" id="clubsTabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'list' ? 'active' : ''}`}
                onClick={() => setActiveTab('list')}
                type="button" 
                role="tab"
              >
                <i className="fas fa-list me-2"></i>
                Manage Clubs
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'myclubs' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('myclubs');
                  if (currentMember) fetchMyClubs(currentMember.id);
                }}
                type="button" 
                role="tab"
              >
                <i className="fas fa-users me-2"></i>
                My Clubs
              </button>
            </li>
            {canManageClubs() && (
              <li className="nav-item" role="presentation">
                <button 
                  className={`nav-link ${activeTab === 'add' ? 'active' : ''}`}
                  onClick={() => setActiveTab('add')}
                  type="button" 
                  role="tab"
                >
                  <i className="fas fa-plus me-2"></i>
                  Add New Club
                </button>
              </li>
            )}
          </ul>

          {/* Tab Content */}
          <div className="tab-content" id="clubsTabContent">
            
            {/* Clubs List Tab */}
            {activeTab === 'list' && (
              <div className="tab-pane fade show active">
                {/* Search and Filter Bar - Always visible */}
                <div className="card mb-3">
                  <div className="card-header">
                    <div className="row align-items-center">
                      <div className="col-md-4">
                        <h5 className="card-title mb-0">
                          <i className="fas fa-users me-2"></i>
                          Clubs Directory
                        </h5>
                      </div>
                      <div className="col-md-4">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search clubs..."
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
                          {(Object.values(filters).some(f => f !== '') || sortConfig.field !== 'name' || sortConfig.direction !== 'asc') && (
                            <span className="badge bg-primary ms-2">Active</span>
                          )}
                        </button>
                        {canManageClubs() && (
                          <button 
                            className="btn btn-primary btn-sm ms-2"
                            onClick={() => setActiveTab('add')}
                          >
                            <i className="fas fa-plus me-2"></i>
                            Add New
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading clubs...</p>
                  </div>
                ) : filteredClubs.length === 0 ? (
                  <div className="card">
                    <div className="card-body">
                      <div className="text-center py-5">
                        <i className="fas fa-users fa-4x text-muted mb-3"></i>
                        <h4 className="text-muted">No Clubs Found</h4>
                        <p className="text-muted">
                          {(searchQuery || filters.category || filters.meetingDay || filters.advisorName || filters.status)
                            ? 'No clubs found matching your search criteria. Try adjusting your filters.'
                            : 'No clubs have been added yet. Add your first club to get started.'
                          }
                        </p>
                        <button 
                          className="btn btn-primary"
                          onClick={() => setActiveTab('add')}
                        >
                          <i className="fas fa-plus me-2"></i>
                          Add First Club
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
                              <th>Club Name</th>
                              <th>School</th>
                              <th>Category</th>
                              <th>Advisor</th>
                              <th>Status</th>
                              <th>Created</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(filteredClubs) && filteredClubs.map((club) => (
                              <tr key={club.id}>
                                <td>
                                  <strong>{club.name}</strong>
                                  {club.description && (
                                    <div className="small text-muted">{club.description}</div>
                                  )}
                                </td>
                                <td>
                                  <small className="text-muted">{club.schoolName}</small>
                                </td>
                                <td>
                                  <span className="badge bg-info">
                                    {club.category || 'Uncategorized'}
                                  </span>
                                </td>
                                <td>
                                  {club.advisorName ? (
                                    <div>
                                      <div>{club.advisorName}</div>
                                      {club.advisorEmail && (
                                        <small className="text-muted">{club.advisorEmail}</small>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>
                                  <span className={`badge ${club.active ? 'bg-success' : 'bg-danger'}`}>
                                    {club.active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td>
                                  {club.createdAt ? new Date(club.createdAt).toLocaleDateString() : '-'}
                                </td>
                                <td>
                                  <div className="btn-group btn-group-sm" role="group">
                                    <button 
                                      className="btn btn-outline-primary"
                                      onClick={() => handleViewClick(club)}
                                      title="View Details"
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                    {canEditClub(club) && (
                                      <button 
                                        className="btn btn-outline-secondary"
                                        onClick={() => handleEditClick(club)}
                                        title="Edit Club"
                                      >
                                        <i className="fas fa-edit"></i>
                                      </button>
                                    )}
                                    {canManageSpecificClub(club) && (
                                      club.active ? (
                                        <button 
                                          className="btn btn-outline-warning"
                                          onClick={() => handleDeactivate(club.id)}
                                          title="Deactivate Club"
                                        >
                                          <i className="fas fa-pause"></i>
                                        </button>
                                      ) : (
                                        <button 
                                          className="btn btn-outline-success"
                                          onClick={() => handleActivate(club.id)}
                                          title="Activate Club"
                                        >
                                          <i className="fas fa-play"></i>
                                        </button>
                                      )
                                    )}
                                    {canDeleteClub(club) && (
                                      <button 
                                        className="btn btn-outline-danger"
                                        onClick={() => handleDeleteClick(club)}
                                        title="Delete Club"
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
                      
                      {/* Pagination Controls */}
                      {pagination.totalPages > 1 && (
                        <div className="card-footer">
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="text-muted">
                              Showing {pagination.currentPage * pagination.size + 1} to{' '}
                              {Math.min((pagination.currentPage + 1) * pagination.size, pagination.totalElements)} of{' '}
                              {pagination.totalElements} clubs
                            </div>
                            <nav aria-label="Clubs pagination">
                              <ul className="pagination pagination-sm mb-0">
                                {/* First page */}
                                <li className={`page-item ${!pagination.hasPrevious ? 'disabled' : ''}`}>
                                  <button
                                    className="page-link"
                                    onClick={() => fetchClubs(0, pagination.size)}
                                    disabled={!pagination.hasPrevious}
                                  >
                                    <i className="fas fa-angle-double-left"></i>
                                  </button>
                                </li>
                                
                                {/* Previous page */}
                                <li className={`page-item ${!pagination.hasPrevious ? 'disabled' : ''}`}>
                                  <button
                                    className="page-link"
                                    onClick={() => fetchClubs(pagination.currentPage - 1, pagination.size)}
                                    disabled={!pagination.hasPrevious}
                                  >
                                    <i className="fas fa-angle-left"></i>
                                  </button>
                                </li>

                                {/* Page numbers */}
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                  const startPage = Math.max(0, Math.min(pagination.currentPage - 2, pagination.totalPages - 5));
                                  const pageNum = startPage + i;
                                  return (
                                    <li key={pageNum} className={`page-item ${pageNum === pagination.currentPage ? 'active' : ''}`}>
                                      <button
                                        className="page-link"
                                        onClick={() => fetchClubs(pageNum, pagination.size)}
                                      >
                                        {pageNum + 1}
                                      </button>
                                    </li>
                                  );
                                })}

                                {/* Next page */}
                                <li className={`page-item ${!pagination.hasNext ? 'disabled' : ''}`}>
                                  <button
                                    className="page-link"
                                    onClick={() => fetchClubs(pagination.currentPage + 1, pagination.size)}
                                    disabled={!pagination.hasNext}
                                  >
                                    <i className="fas fa-angle-right"></i>
                                  </button>
                                </li>
                                
                                {/* Last page */}
                                <li className={`page-item ${!pagination.hasNext ? 'disabled' : ''}`}>
                                  <button
                                    className="page-link"
                                    onClick={() => fetchClubs(pagination.totalPages - 1, pagination.size)}
                                    disabled={!pagination.hasNext}
                                  >
                                    <i className="fas fa-angle-double-right"></i>
                                  </button>
                                </li>
                              </ul>
                            </nav>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* My Clubs Tab */}
            {activeTab === 'myclubs' && (
              <div className="tab-pane fade show active">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="fas fa-users me-2"></i>
                      My Clubs
                    </h5>
                  </div>
                  <div className="card-body">
                    {loadingMyClubs ? (
                      <div className="text-center py-5">
                        <div className="spinner-border" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading your clubs...</p>
                      </div>
                    ) : myClubs.length === 0 ? (
                      <div className="alert alert-info">
                        <i className="fas fa-info-circle me-2"></i>
                        You are not a member of any clubs yet.
                      </div>
                    ) : (
                      <div className="row">
                        {myClubs.map(clubRole => (
                          <div key={clubRole.id} className="col-md-6 mb-3">
                            <div className={`card h-100 ${clubRole.clubRole === 'CLUB_ADMIN' ? 'border-primary' : ''}`}>
                              {clubRole.clubRole === 'CLUB_ADMIN' && (
                                <div className="card-header bg-primary text-white py-1">
                                  <small>
                                    <i className="fas fa-star me-1"></i>
                                    You are an admin of this club
                                  </small>
                                </div>
                              )}
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <h5 className="card-title mb-0">
                                    {clubRole.clubRole === 'CLUB_ADMIN' && (
                                      <i className="fas fa-shield-alt text-primary me-2"></i>
                                    )}
                                    {clubRole.clubName}
                                  </h5>
                                  <span className={`badge ${clubRole.clubRole === 'CLUB_ADMIN' ? 'bg-primary' : 'bg-secondary'}`}>
                                    {clubRole.clubRole === 'CLUB_ADMIN' ? 'Admin' : 'Member'}
                                  </span>
                                </div>
                                <p className="text-muted mb-2">
                                  <i className="fas fa-school me-1"></i>
                                  {clubRole.schoolName}
                                </p>
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                  <small className="text-muted">
                                    Joined: {clubRole.createdAt ? new Date(clubRole.createdAt).toLocaleDateString() : 'N/A'}
                                  </small>
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => {
                                      setActiveTab('list');
                                      // Could add view modal here if needed
                                    }}
                                  >
                                    <i className="fas fa-eye me-1"></i>
                                    View Details
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Add Club Tab */}
            {activeTab === 'add' && canManageClubs() && (
              <div className="tab-pane fade show active">
                <div className="row justify-content-center">
                  <div className="col-md-8">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="mb-0">Club Information</h5>
                      </div>
                      <div className="card-body">
                        <form onSubmit={handleSubmit}>
                          {/* Required Fields */}
                          <div className="mb-3 row">
                            <label htmlFor="name" className="col-sm-3 col-form-label">
                              Club Name <span className="text-danger">*</span>
                            </label>
                            <div className="col-sm-9">
                              <input
                                type="text"
                                className="form-control"
                                id="name"
                                name="name"
                                value={newClub.name}
                                onChange={handleFormChange}
                                placeholder="Enter club name"
                                required
                              />
                            </div>
                          </div>

                          <div className="mb-3 row">
                            <label htmlFor="schoolId" className="col-sm-3 col-form-label">
                              School <span className="text-danger">*</span>
                            </label>
                            <div className="col-sm-9">
                              <select
                                className="form-select"
                                id="schoolId"
                                name="schoolId"
                                value={newClub.schoolId}
                                onChange={handleFormChange}
                                required
                                disabled={currentMember?.role === 'SCHOOL_ADMIN'}
                              >
                                <option value="">Select a school</option>
                                {Array.isArray(schools) && schools.map(school => (
                                  <option key={school.id} value={school.id}>{school.name}</option>
                                ))}
                              </select>
                              {currentMember?.role === 'SCHOOL_ADMIN' && (
                                <div className="form-text text-info">
                                  <i className="fas fa-info-circle me-1"></i>
                                  As a School Admin, you can only create clubs in your own school.
                                </div>
                              )}
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
                                value={newClub.description}
                                onChange={handleFormChange}
                                rows="3"
                                placeholder="Brief description of the club"
                              ></textarea>
                            </div>
                          </div>

                          {/* Category */}
                          <div className="mb-3 row">
                            <label htmlFor="category" className="col-sm-3 col-form-label">Category</label>
                            <div className="col-sm-9">
                              <select
                                className="form-select"
                                id="category"
                                name="category"
                                value={newClub.category}
                                onChange={handleFormChange}
                              >
                                <option value="">Select category</option>
                                <option value="Academic">Academic</option>
                                <option value="Sports">Sports</option>
                                <option value="Arts">Arts</option>
                                <option value="Music">Music</option>
                                <option value="Community Service">Community Service</option>
                                <option value="Technology">Technology</option>
                                <option value="Science">Science</option>
                                <option value="Language">Language</option>
                                <option value="Culture">Culture</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>

                          {/* Advisor Information */}
                          <div className="mb-3 row">
                            <label htmlFor="advisorName" className="col-sm-3 col-form-label">Advisor Name</label>
                            <div className="col-sm-4">
                              <input
                                type="text"
                                className="form-control"
                                id="advisorName"
                                name="advisorName"
                                value={newClub.advisorName}
                                onChange={handleFormChange}
                                placeholder="Advisor's name"
                              />
                            </div>
                            <label htmlFor="advisorEmail" className="col-sm-1 col-form-label">Email</label>
                            <div className="col-sm-4">
                              <input
                                type="email"
                                className="form-control"
                                id="advisorEmail"
                                name="advisorEmail"
                                value={newClub.advisorEmail}
                                onChange={handleFormChange}
                                placeholder="Advisor's email"
                              />
                            </div>
                          </div>

                          {/* Meeting Information */}
                          <div className="mb-3 row">
                            <label htmlFor="meetingDay" className="col-sm-3 col-form-label">Meeting Day</label>
                            <div className="col-sm-4">
                              <select
                                className="form-select"
                                id="meetingDay"
                                name="meetingDay"
                                value={newClub.meetingDay}
                                onChange={handleFormChange}
                              >
                                <option value="">Select day</option>
                                <option value="Monday">Monday</option>
                                <option value="Tuesday">Tuesday</option>
                                <option value="Wednesday">Wednesday</option>
                                <option value="Thursday">Thursday</option>
                                <option value="Friday">Friday</option>
                                <option value="Saturday">Saturday</option>
                                <option value="Sunday">Sunday</option>
                              </select>
                            </div>
                            <label htmlFor="meetingTime" className="col-sm-1 col-form-label">Time</label>
                            <div className="col-sm-4">
                              <input
                                type="text"
                                className="form-control"
                                id="meetingTime"
                                name="meetingTime"
                                value={newClub.meetingTime}
                                onChange={handleFormChange}
                                placeholder="e.g., 3:00 PM"
                              />
                            </div>
                          </div>

                          <div className="mb-3 row">
                            <label htmlFor="meetingLocation" className="col-sm-3 col-form-label">Meeting Location</label>
                            <div className="col-sm-6">
                              <input
                                type="text"
                                className="form-control"
                                id="meetingLocation"
                                name="meetingLocation"
                                value={newClub.meetingLocation}
                                onChange={handleFormChange}
                                placeholder="Room or location"
                              />
                            </div>
                            <label htmlFor="maxMembers" className="col-sm-1 col-form-label">Max Members</label>
                            <div className="col-sm-2">
                              <input
                                type="number"
                                className="form-control"
                                id="maxMembers"
                                name="maxMembers"
                                value={newClub.maxMembers}
                                onChange={handleFormChange}
                                placeholder="50"
                                min="1"
                              />
                            </div>
                          </div>

                          {/* Club Admins Section */}
                          <div className="mb-3">
                            <label className="form-label">
                              <i className="fas fa-user-shield me-2"></i>
                              Club Admins <span className="text-danger">*</span>
                            </label>
                            
                            {!newClub.schoolId && (
                              <div className="alert alert-info">
                                <i className="fas fa-info-circle me-2"></i>
                                Please select a school first to add club admins.
                              </div>
                            )}
                            
                            {newClub.schoolId && (
                              <>
                                {/* Selected Admin Emails */}
                                {selectedAdminEmails.length > 0 && (
                                  <div className="mb-3">
                                    <div className="d-flex flex-wrap gap-2">
                                      {selectedAdminEmails.map(email => (
                                        <span key={email} className="badge bg-primary d-flex align-items-center py-2 px-3">
                                          <i className="fas fa-envelope me-2"></i>
                                          {email}
                                          <button
                                            type="button"
                                            className="btn-close btn-close-white ms-2"
                                            style={{ fontSize: '0.65rem' }}
                                            onClick={() => handleRemoveAdminEmail(email)}
                                            aria-label="Remove"
                                          ></button>
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Email Input with Typeahead */}
                                <div className="input-group position-relative">
                                  <input
                                    type="email"
                                    className="form-control"
                                    placeholder="Type email or name to search members..."
                                    value={adminEmailInput}
                                    onChange={(e) => handleAdminEmailChange(e.target.value)}
                                    onKeyPress={handleAdminEmailKeyPress}
                                    onFocus={() => {
                                      if (adminEmailInput.trim().length >= 2 && filteredMembers.length > 0) {
                                        setShowAdminDropdown(true);
                                      }
                                    }}
                                    onBlur={() => {
                                      // Delay to allow clicking on dropdown
                                      setTimeout(() => setShowAdminDropdown(false), 200);
                                    }}
                                    disabled={loadingMembers}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => handleAddAdminEmail()}
                                    disabled={!adminEmailInput.trim() || loadingMembers}
                                  >
                                    <i className="fas fa-plus"></i>
                                  </button>
                                  
                                  {/* Typeahead Dropdown */}
                                  {showAdminDropdown && filteredMembers.length > 0 && (
                                    <div 
                                      className="position-absolute w-100 bg-white border rounded shadow-sm" 
                                      style={{ 
                                        zIndex: 1000, 
                                        top: '100%',
                                        left: 0,
                                        maxHeight: '250px',
                                        overflowY: 'auto',
                                        marginTop: '2px'
                                      }}
                                    >
                                      {filteredMembers.map(member => (
                                        <div
                                          key={member.id}
                                          className="p-3 border-bottom"
                                          style={{ cursor: 'pointer' }}
                                          onClick={() => selectFromDropdown(member)}
                                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                        >
                                          <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                              <div className="fw-semibold">{member.firstName} {member.lastName}</div>
                                              <small className="text-muted">{member.email}</small>
                                            </div>
                                            <span className="badge bg-secondary">{member.role}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {loadingMembers && (
                                    <div className="position-absolute end-0 top-50 translate-middle-y" style={{ right: '60px' }}>
                                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="form-text mt-2">
                                  <i className="fas fa-info-circle me-1"></i>
                                  Type at least 2 characters to see suggestions. You can add members from the school or enter any email address.
                                </div>
                              </>
                            )}
                          </div>

                          <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                            <button
                              type="button"
                              className="btn btn-outline-secondary me-2"
                              onClick={() => setActiveTab('list')}
                            >
                              <i className="fas fa-list me-2"></i>
                              View All Clubs
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
                                  Add Club
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
                  Are you sure you want to permanently delete the club 
                  <strong> "{deleteModal.club?.name}"</strong>?
                </p>
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Warning:</strong> This action cannot be undone. All data associated with this club will be permanently removed.
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
                  Delete Club
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Club Modal */}
      {editModal.show && (
        <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-edit me-2"></i>
                  Edit Club: {editModal.club?.name}
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
                      Club Name <span className="text-danger">*</span>
                    </label>
                    <div className="col-sm-9">
                      <input
                        type="text"
                        className="form-control"
                        id="editName"
                        name="name"
                        value={editClub.name}
                        onChange={handleEditInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label className="col-sm-3 col-form-label">
                      School
                    </label>
                    <div className="col-sm-9">
                      <p className="form-control-plaintext">{editClub.schoolName}</p>
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
                        value={editClub.description}
                        onChange={handleEditInputChange}
                        required
                      ></textarea>
                    </div>
                  </div>

                  {/* Optional Fields */}
                  <div className="mb-3 row">
                    <label htmlFor="editCategory" className="col-sm-3 col-form-label">Category</label>
                    <div className="col-sm-9">
                      <select
                        className="form-control"
                        id="editCategory"
                        name="category"
                        value={editClub.category}
                        onChange={handleEditInputChange}
                      >
                        <option value="">Select a category</option>
                        <option value="Academic">Academic</option>
                        <option value="Arts">Arts</option>
                        <option value="Sports">Sports</option>
                        <option value="STEM">STEM</option>
                        <option value="Community Service">Community Service</option>
                        <option value="Technology">Technology</option>
                        <option value="Cultural">Cultural</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label htmlFor="editAdvisorName" className="col-sm-3 col-form-label">Advisor Name</label>
                    <div className="col-sm-9">
                      <input
                        type="text"
                        className="form-control"
                        id="editAdvisorName"
                        name="advisorName"
                        value={editClub.advisorName}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label htmlFor="editAdvisorEmail" className="col-sm-3 col-form-label">Advisor Email</label>
                    <div className="col-sm-9">
                      <input
                        type="email"
                        className="form-control"
                        id="editAdvisorEmail"
                        name="advisorEmail"
                        value={editClub.advisorEmail}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label htmlFor="editMeetingLocation" className="col-sm-3 col-form-label">Meeting Location</label>
                    <div className="col-sm-9">
                      <input
                        type="text"
                        className="form-control"
                        id="editMeetingLocation"
                        name="meetingLocation"
                        value={editClub.meetingLocation}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label htmlFor="editMeetingTime" className="col-sm-3 col-form-label">Meeting Time</label>
                    <div className="col-sm-9">
                      <input
                        type="text"
                        className="form-control"
                        id="editMeetingTime"
                        name="meetingTime"
                        value={editClub.meetingTime}
                        onChange={handleEditInputChange}
                        placeholder="e.g., 3:30 PM - 5:00 PM"
                      />
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label htmlFor="editMeetingDay" className="col-sm-3 col-form-label">Meeting Day</label>
                    <div className="col-sm-9">
                      <select
                        className="form-control"
                        id="editMeetingDay"
                        name="meetingDay"
                        value={editClub.meetingDay}
                        onChange={handleEditInputChange}
                      >
                        <option value="">Select a day</option>
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3 row">
                    <label htmlFor="editMaxMembers" className="col-sm-3 col-form-label">Max Members</label>
                    <div className="col-sm-9">
                      <input
                        type="number"
                        className="form-control"
                        id="editMaxMembers"
                        name="maxMembers"
                        value={editClub.maxMembers}
                        onChange={handleEditInputChange}
                        min="1"
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="mb-3 row">
                    <label htmlFor="editTags" className="col-sm-3 col-form-label">Tags</label>
                    <div className="col-sm-9">
                      <input
                        type="text"
                        className="form-control"
                        id="editTags"
                        value={editClub.tags.join(', ')}
                        onChange={handleEditTagsChange}
                        placeholder="Enter tags separated by commas"
                      />
                      <div className="form-text">Separate tags with commas (e.g., academic, competition, fun)</div>
                    </div>
                  </div>

                  {/* Club Admins List */}
                  <div className="mb-3 row">
                    <label className="col-sm-3 col-form-label">
                      <i className="fas fa-user-shield me-2"></i>
                      Club Admins
                    </label>
                    <div className="col-sm-9">
                      {loadingClubAdmins ? (
                        <div className="text-center py-3">
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Loading admins...
                        </div>
                      ) : clubAdminsList.length === 0 ? (
                        <div className="alert alert-warning mb-0">
                          <i className="fas fa-exclamation-triangle me-2"></i>
                          No club admins found
                        </div>
                      ) : (
                        <div className="list-group">
                          {clubAdminsList.map((admin) => (
                            <div key={admin.id} className="list-group-item d-flex justify-content-between align-items-center">
                              <div>
                                <div className="fw-semibold">{admin.memberName}</div>
                                <small className="text-muted">{admin.memberEmail}</small>
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDemoteAdmin(admin.id, editModal.club?.id)}
                                disabled={loadingClubAdmins || clubAdminsList.length <= 1}
                                title={clubAdminsList.length <= 1 ? "Cannot remove last admin" : "Remove admin (demote to club member)"}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="form-text mt-2">
                        <i className="fas fa-info-circle me-1"></i>
                        {clubAdminsList.length <= 1 
                          ? 'Every club must have at least one admin'
                          : 'Removing an admin will change them to a regular club member'
                        }
                      </div>
                      
                      {/* Add Admin Section */}
                      <div className="mt-3 border-top pt-3">
                        <label className="form-label fw-semibold">Add Club Admin</label>
                        <div className="input-group position-relative">
                          <input
                            type="email"
                            className="form-control"
                            placeholder="Type email or name to search members..."
                            value={addAdminEmail}
                            onChange={(e) => handleAddAdminEmailChange(e.target.value)}
                            onKeyPress={handleAddAdminKeyPress}
                            onFocus={() => {
                              if (addAdminEmail.trim().length >= 2 && addAdminFilteredMembers.length > 0) {
                                setAddAdminDropdown(true);
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => setAddAdminDropdown(false), 200);
                            }}
                            disabled={loadingSchoolMembers || loadingClubAdmins}
                          />
                          <button
                            type="button"
                            className="btn btn-success"
                            onClick={() => handleAddNewAdmin()}
                            disabled={!addAdminEmail.trim() || loadingSchoolMembers || loadingClubAdmins}
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                          
                          {/* Typeahead Dropdown */}
                          {addAdminDropdown && addAdminFilteredMembers.length > 0 && (
                            <div 
                              className="position-absolute w-100 bg-white border rounded shadow-sm" 
                              style={{ 
                                zIndex: 1000, 
                                top: '100%',
                                left: 0,
                                maxHeight: '200px',
                                overflowY: 'auto',
                                marginTop: '2px'
                              }}
                            >
                              {addAdminFilteredMembers.map(member => (
                                <div
                                  key={member.id}
                                  className="p-2 border-bottom"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => selectFromAddAdminDropdown(member)}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                >
                                  <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                      <div className="fw-semibold">{member.firstName} {member.lastName}</div>
                                      <small className="text-muted">{member.email}</small>
                                    </div>
                                    {member.currentClubRole === 'CLUB_USER' ? (
                                      <span className="badge bg-info text-dark">
                                        <i className="fas fa-arrow-up me-1"></i>
                                        Will Elevate
                                      </span>
                                    ) : (
                                      <span className="badge bg-success">
                                        <i className="fas fa-plus me-1"></i>
                                        New Admin
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {loadingSchoolMembers && (
                            <div className="position-absolute end-0 top-50 translate-middle-y" style={{ right: '60px' }}>
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            </div>
                          )}
                        </div>
                        <div className="form-text">
                          <i className="fas fa-info-circle me-1"></i>
                          Type at least 2 characters to search for members. Existing club members can be elevated to admins.
                        </div>
                      </div>
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
                      Update Club
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filter Modal */}
      {filterModal.show && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-filter me-2"></i>
                  Filter & Sort Clubs
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
                          <label className="form-label text-start">Category</label>
                          <select 
                            className="form-select"
                            value={filters.category}
                            onChange={(e) => setFilters(prev => ({...prev, category: e.target.value}))}
                          >
                            <option value="">All Categories</option>
                            <option value="Academic">Academic</option>
                            <option value="Sports">Sports</option>
                            <option value="Arts">Arts</option>
                            <option value="Music">Music</option>
                            <option value="Science">Science</option>
                            <option value="Technology">Technology</option>
                            <option value="Community Service">Community Service</option>
                            <option value="Leadership">Leadership</option>
                            <option value="Cultural">Cultural</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label text-start">Meeting Day</label>
                          <select 
                            className="form-select"
                            value={filters.meetingDay}
                            onChange={(e) => setFilters(prev => ({...prev, meetingDay: e.target.value}))}
                          >
                            <option value="">Any Day</option>
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="Friday">Friday</option>
                            <option value="Saturday">Saturday</option>
                            <option value="Sunday">Sunday</option>
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
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label text-start">Advisor Name</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Filter by advisor name"
                            value={filters.advisorName}
                            onChange={(e) => setFilters(prev => ({...prev, advisorName: e.target.value}))}
                          />
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
                        <option value="name">Club Name</option>
                        <option value="schoolName">School Name</option>
                        <option value="category">Category</option>
                        <option value="advisorName">Advisor Name</option>
                        <option value="meetingDay">Meeting Day</option>
                        <option value="createdAt">Created Date</option>
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
                            category: '',
                            meetingDay: '',
                            advisorName: '',
                            status: ''
                          });
                          setSortConfig({
                            field: 'name',
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
                    Showing {filteredClubs.length} of {Array.isArray(clubs) ? clubs.length : 0} clubs
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

      {/* Advanced Filter Modal */}
      {filterModal.show && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-filter me-2"></i>
                  Filter & Sort Clubs
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
                          <label className="form-label text-start">Category</label>
                          <select 
                            className="form-select"
                            value={filters.category}
                            onChange={(e) => setFilters(prev => ({...prev, category: e.target.value}))}
                          >
                            <option value="">All Categories</option>
                            <option value="Academic">Academic</option>
                            <option value="Sports">Sports</option>
                            <option value="Arts">Arts</option>
                            <option value="Music">Music</option>
                            <option value="Technology">Technology</option>
                            <option value="Community Service">Community Service</option>
                            <option value="Leadership">Leadership</option>
                            <option value="Cultural">Cultural</option>
                            <option value="Religious">Religious</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label text-start">Meeting Day</label>
                          <select 
                            className="form-select"
                            value={filters.meetingDay}
                            onChange={(e) => setFilters(prev => ({...prev, meetingDay: e.target.value}))}
                          >
                            <option value="">Any Day</option>
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="Friday">Friday</option>
                            <option value="Saturday">Saturday</option>
                            <option value="Sunday">Sunday</option>
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
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label text-start">Advisor Name</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Search by advisor name..."
                            value={filters.advisorName}
                            onChange={(e) => setFilters(prev => ({...prev, advisorName: e.target.value}))}
                          />
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
                        <option value="name">Club Name</option>
                        <option value="schoolname">School Name</option>
                        <option value="category">Category</option>
                        <option value="advisorname">Advisor Name</option>
                        <option value="meetingday">Meeting Day</option>
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
                            school: '',
                            category: '',
                            meetingDay: '',
                            advisorName: '',
                            status: ''
                          });
                          setSortConfig({
                            field: 'name',
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
                    Showing {filteredClubs.length} of {Array.isArray(clubs) ? clubs.length : 0} clubs
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

      {/* View Club Modal */}
      {viewModal.show && viewModal.club && (
        <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-eye me-2"></i>
                  Club Details - {viewModal.club.name}
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
                          <td><strong>Club Name:</strong></td>
                          <td>{viewModal.club.name}</td>
                        </tr>
                        <tr>
                          <td><strong>School:</strong></td>
                          <td>{viewModal.club.schoolName}</td>
                        </tr>
                        <tr>
                          <td><strong>Category:</strong></td>
                          <td>{viewModal.club.category || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td><strong>Status:</strong></td>
                          <td>
                            <span className={`badge ${viewModal.club.active ? 'bg-success' : 'bg-danger'}`}>
                              {viewModal.club.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Max Members:</strong></td>
                          <td>{viewModal.club.maxMembers || 'Unlimited'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Meeting & Contact Information */}
                  <div className="col-md-6">
                    <h6 className="text-primary mb-3">Meeting & Contact</h6>
                    <table className="table table-sm table-borderless">
                      <tbody>
                        <tr>
                          <td><strong>Meeting Day:</strong></td>
                          <td>{viewModal.club.meetingDay || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td><strong>Meeting Time:</strong></td>
                          <td>{viewModal.club.meetingTime || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td><strong>Meeting Location:</strong></td>
                          <td>{viewModal.club.meetingLocation || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td><strong>Advisor:</strong></td>
                          <td>{viewModal.club.advisorName || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td><strong>Advisor Email:</strong></td>
                          <td>{viewModal.club.advisorEmail || 'Not specified'}</td>
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
                          {viewModal.club.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {viewModal.club.tags && viewModal.club.tags.length > 0 && (
                  <div className="row mt-4">
                    <div className="col-12">
                      <h6 className="text-primary mb-3">Tags</h6>
                      <div className="card">
                        <div className="card-body">
                          {viewModal.club.tags.map((tag, index) => (
                            <span key={index} className="badge bg-info me-2 mb-2">
                              <i className="fas fa-tag me-1"></i>
                              {tag}
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
                          <td>{viewModal.club.createdAt ? new Date(viewModal.club.createdAt).toLocaleString() : 'Not available'}</td>
                        </tr>
                        <tr>
                          <td><strong>Last Updated:</strong></td>
                          <td>{viewModal.club.updatedAt ? new Date(viewModal.club.updatedAt).toLocaleString() : 'Not available'}</td>
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
                {canEditClub(viewModal.club) && (
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={() => {
                      closeViewModal();
                      handleEditClick(viewModal.club);
                    }}
                  >
                    <i className="fas fa-edit me-2"></i>
                    Edit Club
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubsManagement;