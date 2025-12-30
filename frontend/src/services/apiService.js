import axios from 'axios';

// Configure the base URL based on environment
const API_BASE_URL = import.meta.env.MODE === 'production' 
  ? '' // In production, frontend and backend are served from same origin
  : 'http://localhost:8080'; // In development, backend runs on port 8080

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to automatically include JWT token
apiClient.interceptors.request.use(
  (config) => {
    // Get the JWT token from localStorage
    const token = localStorage.getItem('authToken');
    
    // Add Authorization header if token exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle authentication errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If we get a 401 Unauthorized, clear the stored authentication data
    if (error.response?.status === 401) {
      console.error('Authentication failed - token may be expired or invalid');
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Authentication failed';
      
      // Check if it's specifically a token expiration issue
      if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
        console.warn('JWT Token is expired or invalid. Please log in again.');
        // Clear authentication data
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentMember');
        
        // Show a user-friendly message
        alert('Your session has expired. Please log in again.');
        
        // Optionally redirect to login page
        window.location.href = '/';
      }
    }
    
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Health check endpoints
  async getHealthStatus() {
    try {
      const response = await apiClient.get('/api/health');
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500
      };
    }
  },

  async getDatabaseHealth() {
    try {
      // Try to make the request without authentication first
      const response = await apiClient.get('/api/health/db');
      
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      // If the endpoint requires authentication, we'll skip the database health check
      // rather than making invalid login attempts
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          success: false,
          error: 'Database health check requires authentication - skipping',
          status: error.response.status
        };
      }
      
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500
      };
    }
  },



  async getApiInfo() {
    try {
      const response = await apiClient.get('/api/public/info');
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500
      };
    }
  },

  // Generic HTTP methods for API calls
  async get(endpoint) {
    try {
      const response = await apiClient.get(`/api${endpoint}`);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data
      };
    }
  },

  async post(endpoint, data) {
    try {
      const response = await apiClient.post(`/api${endpoint}`, data);
      return {
        success: true,
        data: response.data,
        status: response.status,
        ...response.data // Spread response data to top level for convenience
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  async put(endpoint, data) {
    try {
      const response = await apiClient.put(`/api${endpoint}`, data);
      return {
        success: true,
        data: response.data,
        status: response.status,
        ...response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  async delete(endpoint) {
    try {
      const response = await apiClient.delete(`/api${endpoint}`);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  // Get member club roles
  async getMemberClubRoles() {
    try {
      const response = await apiClient.get('/api/auth/club-roles');
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  // Invoice approval methods
  async approveInvoice(invoiceId) {
    try {
      const response = await apiClient.post(`/api/invoices/${invoiceId}/approve`);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  async rejectInvoice(invoiceId, rejectionReason) {
    try {
      const response = await apiClient.post(`/api/invoices/${invoiceId}/reject`, {
        rejectionReason: rejectionReason
      });
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  async submitInvoiceForApproval(invoiceId) {
    try {
      const response = await apiClient.post(`/api/invoices/${invoiceId}/submit-for-approval`);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  async getInvoicesPendingApproval(page = 0, size = 10, sortBy = 'createdAt', sortDirection = 'desc') {
    try {
      const response = await apiClient.get('/api/invoices/pending-approval', {
        params: { page, size, sortBy, sortDirection }
      });
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  // Checkout approval methods
  async approveCheckout(checkoutId) {
    try {
      const response = await apiClient.post(`/api/checkouts/${checkoutId}/approve`);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  async rejectCheckout(checkoutId, rejectionReason) {
    try {
      const response = await apiClient.post(`/api/checkouts/${checkoutId}/reject`, {
        rejectionReason: rejectionReason
      });
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  async getCheckoutsPendingApproval(page = 0, size = 10) {
    try {
      const response = await apiClient.get('/api/checkouts/pending-approval', {
        params: { page, size }
      });
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  async getCheckoutsPendingReturn(page = 0, size = 10) {
    try {
      const response = await apiClient.get('/api/checkouts/pending-returns', {
        params: { page, size }
      });
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  async markCheckoutAsReturned(checkoutId) {
    try {
      const response = await apiClient.post(`/api/checkouts/${checkoutId}/mark-returned`);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  // Announcement endpoints
  async getAnnouncements(page = 0, size = 10) {
    try {
      const response = await apiClient.get('/api/announcements', {
        params: { page, size }
      });
      return {
        success: true,
        data: response.data.data,
        count: response.data.count,
        totalCount: response.data.totalCount,
        totalPages: response.data.totalPages,
        page: response.data.page,
        size: response.data.size,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  async getAnnouncementById(id) {
    try {
      const response = await apiClient.get(`/api/announcements/${id}`);
      return {
        success: true,
        data: response.data.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  async createAnnouncement(announcementData) {
    try {
      const response = await apiClient.post('/api/announcements', announcementData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  async updateAnnouncement(id, announcementData) {
    try {
      const response = await apiClient.put(`/api/announcements/${id}`, announcementData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  },

  async deleteAnnouncement(id) {
    try {
      const response = await apiClient.delete(`/api/announcements/${id}`);
      return {
        success: true,
        message: response.data.message,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500,
        data: error.response?.data,
        message: error.response?.data?.message || error.message
      };
    }
  }
};

export default apiService;