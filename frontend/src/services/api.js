import axios from 'axios';
import { currentIdToken } from './firebase';

// Use relative URL so requests go to whatever port the app is served from.
// In production and when served via Spring Boot on :8080 this resolves correctly.
// Set VITE_API_URL only when you need an explicit override.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let onUnauthorized = null;

function clearStoredSession() {
  localStorage.removeItem('authUser');
}

export function setOnUnauthorized(handler) {
  onUnauthorized = handler;
}

// Request interceptor attaches the current Firebase ID token.
api.interceptors.request.use(
  async (config) => {
    const token = await currentIdToken().catch(() => null);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const unauthorized = error.response?.status === 401;
    const isPublicAuthRequest = error.config?.url?.startsWith('/auth/');

    if (unauthorized && !isPublicAuthRequest && localStorage.getItem('authUser')) {
      clearStoredSession();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export const accountService = {
  getCurrentAccount: async () => {
    const response = await api.get('/account');
    return response.data;
  },
  deleteAccount: async () => {
    await api.delete('/account');
  },
};

export const invitationsService = {
  inviteFriend: async (data) => {
    const response = await api.post('/invitations', data);
    return response.data;
  },
};

export const schoolRequestsService = {
  submit: async (data) => {
    const response = await api.post('/school-requests', data);
    return response.data;
  },
  list: async (status) => {
    const response = await api.get('/school-requests', { params: status ? { status } : {} });
    return response.data;
  },
  approve: async (id) => {
    const response = await api.post(`/school-requests/${id}/approve`);
    return response.data;
  },
  reject: async (id, reason) => {
    const response = await api.post(`/school-requests/${id}/reject`, { reason });
    return response.data;
  },
};

export const authService = {
  // Creates or refreshes the local account for the signed-in Firebase user.
  syncSession: async (consent) => {
    const response = await api.post('/auth/session', consent || {});
    authService.updateStoredUser(response.data);
    return response.data;
  },

  getInvitationDetails: async (token) => {
    const response = await api.post('/auth/invitations/details', { token });
    return response.data;
  },

  acceptInvitation: async (token, consent) => {
    const response = await api.post('/auth/invitations/accept', { token, ...(consent || {}) });
    authService.updateStoredUser(response.data);
    return response.data;
  },

  logout: () => {
    clearStoredSession();
  },

  getUser: () => {
    const raw = localStorage.getItem('authUser');
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem('authUser');
      return null;
    }
  },

  updateStoredUser: (user) => {
    localStorage.setItem('authUser', JSON.stringify(user));
  },
};

export const schoolsService = {
  getAll: async () => {
    const response = await api.get('/schools');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/schools/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/schools', data);
    return response.data;
  },

  setEnabled: async (id, enabled) => {
    const response = await api.patch(`/schools/${id}/enabled?value=${enabled}`);
    return response.data;
  },

  setTier: async (id, tier) => {
    const response = await api.patch(`/schools/${id}/tier`, { tier });
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/schools/${id}`, data);
    return response.data;
  },

  addAdmin: async (schoolId, userId) => {
    const response = await api.post(`/schools/${schoolId}/admins`, { userId });
    return response.data;
  },

  removeAdmin: async (schoolId, userId) => {
    const response = await api.delete(`/schools/${schoolId}/admins/${userId}`);
    return response.data;
  },

  requestToJoin: async (schoolId) => {
    const response = await api.post(`/schools/${schoolId}/memberships/request`);
    return response.data;
  },

  getMyMembership: async (schoolId) => {
    const response = await api.get(`/schools/${schoolId}/memberships/me`);
    return response.data || null;
  },

  getMyPrivileges: async (schoolId) => {
    const response = await api.get(`/schools/${schoolId}/my-privileges`);
    return response.data ?? [];
  },

  getPendingRequests: async (schoolId) => {
    const response = await api.get(`/schools/${schoolId}/memberships/pending`);
    return response.data;
  },

  getMembers: async (schoolId) => {
    const response = await api.get(`/schools/${schoolId}/memberships`);
    return response.data;
  },

  approveMember: async (schoolId, userId) => {
    const response = await api.post(`/schools/${schoolId}/memberships/${userId}/approve`);
    return response.data;
  },

  rejectMember: async (schoolId, userId) => {
    const response = await api.post(`/schools/${schoolId}/memberships/${userId}/reject`);
    return response.data;
  },

  revokeMember: async (schoolId, userId) => {
    const response = await api.delete(`/schools/${schoolId}/memberships/${userId}`);
    return response.data;
  },
};

export const usersService = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },
};

export const clubsService = {
  getBySchool: async (schoolId) => {
    const response = await api.get(`/schools/${schoolId}/clubs`);
    return response.data;
  },

  getById: async (clubId) => {
    const response = await api.get(`/clubs/${clubId}`);
    return response.data;
  },

  create: async (schoolId, data) => {
    const response = await api.post(`/schools/${schoolId}/clubs`, data);
    return response.data;
  },

  getMyPrivileges: async (clubId) => {
    const response = await api.get(`/clubs/${clubId}/my-privileges`);
    return response.data ?? [];
  },

  update: async (schoolId, clubId, data) => {
    const response = await api.put(`/schools/${schoolId}/clubs/${clubId}`, data);
    return response.data;
  },

  remove: async (schoolId, clubId) => {
    const response = await api.delete(`/schools/${schoolId}/clubs/${clubId}`);
    return response.data;
  },

  getMyMembership: async (clubId) => {
    const response = await api.get(`/clubs/${clubId}/memberships/me`);
    return response.data || null;
  },

  requestToJoin: async (clubId) => {
    const response = await api.post(`/clubs/${clubId}/memberships/request`);
    return response.data;
  },

  getPendingRequests: async (clubId) => {
    const response = await api.get(`/clubs/${clubId}/memberships/pending`);
    return response.data;
  },

  getMembers: async (clubId) => {
    const response = await api.get(`/clubs/${clubId}/memberships`);
    return response.data;
  },

  approveMember: async (clubId, userId) => {
    const response = await api.post(`/clubs/${clubId}/memberships/${userId}/approve`);
    return response.data;
  },

  rejectMember: async (clubId, userId) => {
    const response = await api.post(`/clubs/${clubId}/memberships/${userId}/reject`);
    return response.data;
  },

  revokeMember: async (clubId, userId) => {
    const response = await api.delete(`/clubs/${clubId}/memberships/${userId}`);
    return response.data;
  },

  getAdmins: async (clubId) => {
    const response = await api.get(`/clubs/${clubId}/admins`);
    return response.data;
  },

  addAdmin: async (clubId, userId) => {
    const response = await api.post(`/clubs/${clubId}/admins`, { userId });
    return response.data;
  },

  removeAdmin: async (clubId, userId) => {
    const response = await api.delete(`/clubs/${clubId}/admins/${userId}`);
    return response.data;
  },
};

export const contentReportsService = {
  create: async (contentType, contentId, reason, details) => {
    const response = await api.post('/content-reports', {
      contentType,
      contentId,
      reason,
      details,
    });
    return response.data;
  },
};

export const eventsService = {
  list: async (schoolId) => {
    const response = await api.get(`/schools/${schoolId}/events`);
    return response.data;
  },
  get: async (schoolId, eventId) => {
    const response = await api.get(`/schools/${schoolId}/events/${eventId}`);
    return response.data;
  },
  create: async (schoolId, data) => {
    const response = await api.post(`/schools/${schoolId}/events`, data);
    return response.data;
  },
  remove: async (schoolId, eventId) => {
    const response = await api.delete(`/schools/${schoolId}/events/${eventId}`);
    return response.data;
  },
  rsvp: async (schoolId, eventId, response) => {
    const result = await api.post(`/schools/${schoolId}/events/${eventId}/rsvp`, { response });
    return result.data;
  },
};

export const announcementsService = {
  list: async (schoolId) => {
    const response = await api.get(`/schools/${schoolId}/announcements`);
    return response.data;
  },
  create: async (schoolId, data) => {
    const response = await api.post(`/schools/${schoolId}/announcements`, data);
    return response.data;
  },
  remove: async (schoolId, announcementId) => {
    const response = await api.delete(`/schools/${schoolId}/announcements/${announcementId}`);
    return response.data;
  },
};

export const invoicesService = {
  list: async (clubId) => (await api.get(`/clubs/${clubId}/invoices`)).data,
  get: async (clubId, invoiceId) => (await api.get(`/clubs/${clubId}/invoices/${invoiceId}`)).data,
  create: async (clubId, data) => (await api.post(`/clubs/${clubId}/invoices`, data)).data,
  update: async (clubId, invoiceId, data) => (await api.put(`/clubs/${clubId}/invoices/${invoiceId}`, data)).data,
  remove: async (clubId, invoiceId) => (await api.delete(`/clubs/${clubId}/invoices/${invoiceId}`)).data,
  submit: async (clubId, invoiceId) => (await api.post(`/clubs/${clubId}/invoices/${invoiceId}/submit`)).data,
  cancel: async (clubId, invoiceId, reason) => (await api.post(`/clubs/${clubId}/invoices/${invoiceId}/cancel`, { reason })).data,
  approve: async (clubId, invoiceId) => (await api.post(`/clubs/${clubId}/invoices/${invoiceId}/approve`)).data,
  sendBack: async (clubId, invoiceId, reason) => (await api.post(`/clubs/${clubId}/invoices/${invoiceId}/send-back`, { reason })).data,
  markPaid: async (clubId, invoiceId) => (await api.post(`/clubs/${clubId}/invoices/${invoiceId}/mark-paid`)).data,
  scanReceipt: async (clubId, imageBase64) => (await api.post(`/clubs/${clubId}/invoices/scan`, { imageBase64 })).data,
};

export const inventoryService = {
  list: async (clubId) => (await api.get(`/clubs/${clubId}/inventory`)).data,
  get: async (clubId, itemId) => (await api.get(`/clubs/${clubId}/inventory/${itemId}`)).data,
  create: async (clubId, data) => (await api.post(`/clubs/${clubId}/inventory`, data)).data,
  update: async (clubId, itemId, data) => (await api.put(`/clubs/${clubId}/inventory/${itemId}`, data)).data,
  remove: async (clubId, itemId) => (await api.delete(`/clubs/${clubId}/inventory/${itemId}`)).data,
  checkOut: async (clubId, itemId, dueDate, notes) => (
    await api.post(`/clubs/${clubId}/inventory/${itemId}/check-out`, { dueDate, notes })
  ).data,
  checkIn: async (clubId, itemId, notes) => (
    await api.post(`/clubs/${clubId}/inventory/${itemId}/check-in`, { notes })
  ).data,
};

export const moderationService = {
  list: async (status) => {
    const response = await api.get('/content-reports/moderation', { params: status ? { status } : {} });
    return response.data;
  },
  decide: async (id, status, resolution) => {
    const response = await api.patch(`/content-reports/${id}`, { status, resolution });
    return response.data;
  },
  removeContent: async (id) => {
    const response = await api.post(`/content-reports/${id}/remove-content`);
    return response.data;
  },
  suspendAuthor: async (id, reason) => {
    const response = await api.post(`/content-reports/${id}/suspend-author`, { reason });
    return response.data;
  },
  restoreUser: async (userId) => {
    const response = await api.post(`/content-reports/moderation/users/${userId}/restore`);
    return response.data;
  },
};

export const accountsAdminService = {
  search: async (query) => {
    const response = await api.get('/users/accounts', { params: query ? { query } : {} });
    return response.data;
  },
  resetSignIn: async (userId) => {
    const response = await api.post(`/users/${userId}/reset-sign-in`);
    return response.data;
  },
};

export default api;
