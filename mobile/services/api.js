import axios from 'axios';
import Constants from 'expo-constants';
import { clearAuthSession } from '../utils/authStorage';
import { currentIdToken } from './firebase';
import environmentConfig from '../config/environments';

const { REMOTE_API_URL, normalizeAppEnvironment } = environmentConfig;

function trimTrailingSlashes(value) {
  return value?.trim().replace(/\/+$/, '') || null;
}

function isLocalApiUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname;
    const isPrivateHost = host === 'localhost'
      || host === '127.0.0.1'
      || host.startsWith('10.')
      || host.startsWith('192.168.')
      || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
      || host.endsWith('.local');
    return url.protocol === 'http:' && url.pathname === '/api' && isPrivateHost;
  } catch {
    return false;
  }
}

export function getAppEnvironment() {
  const configuredEnvironment = process.env.EXPO_PUBLIC_APP_ENV
    || Constants.expoConfig?.extra?.appEnvironment;
  return normalizeAppEnvironment(configuredEnvironment, __DEV__ ? 'dev' : 'prod');
}

// On a physical device "localhost" is the phone, not the dev Mac.
// Expo exposes the Metro bundler host (your Mac's LAN IP) via Constants,
// so we derive the backend URL from that in dev mode.
export function getApiUrl() {
  const environment = getAppEnvironment();
  const configuredUrl = trimTrailingSlashes(
    process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl
  );

  if (environment === 'test' || environment === 'prod') {
    if (configuredUrl && configuredUrl !== REMOTE_API_URL) {
      throw new Error(
        `${environment} builds must use ${REMOTE_API_URL}; received ${configuredUrl}.`
      );
    }
    return REMOTE_API_URL;
  }

  if (configuredUrl) {
    if (!isLocalApiUrl(configuredUrl)) {
      throw new Error(
        `dev builds must use a local http://…/api endpoint; received ${configuredUrl}.`
      );
    }
    return configuredUrl;
  }

  // expoConfig.hostUri looks like "192.168.x.x:8081" (Metro port)
  const metroHost = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoClient?.hostUri
    ?? Constants.manifest?.debuggerHost;

  if (metroHost) {
    // Strip the Metro port and use the backend port 8080
    const ip = metroHost.split(':')[0];
    return `http://${ip}:8080/api`;
  }

  // Fallback for simulators where localhost works fine
  return 'http://localhost:8080/api';
}

const API_URL = getApiUrl();

// Callback registered by AuthContext so the interceptor can trigger a full
// logout (clearing both AsyncStorage and React state) on a 401 response.
let _onUnauthorized = null;
export function setOnUnauthorized(handler) {
  _onUnauthorized = handler;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  async (error) => {
    const unauthorized = error.response?.status === 401;
    const isPublicAuthRequest = error.config?.url?.startsWith('/auth/');

    if (unauthorized && !isPublicAuthRequest) {
      await clearAuthSession();
      if (_onUnauthorized) _onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  // Creates or refreshes the local account for the signed-in Firebase user.
  syncSession: async (consent) => {
    const response = await api.post('/auth/session', consent || {});
    return response.data;
  },
  getInvitationDetails: async (token) => {
    const response = await api.post('/auth/invitations/details', { token });
    return response.data;
  },
  acceptInvitation: async (token, consent) => {
    const response = await api.post('/auth/invitations/accept', { token, ...(consent || {}) });
    return response.data;
  },
};

export const invitationsAPI = {
  inviteFriend: async (data) => {
    const response = await api.post('/invitations', data);
    return response.data;
  },
};

export const schoolRequestsAPI = {
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

export const contentReportsAPI = {
  create: async (contentType, contentId, reason, details) => {
    const response = await api.post('/content-reports', { contentType, contentId, reason, details });
    return response.data;
  },
  mine: async () => {
    const response = await api.get('/content-reports/mine');
    return response.data;
  },
};

export const accountAPI = {
  getCurrentAccount: async () => {
    const response = await api.get('/account');
    return response.data;
  },
  deleteAccount: async () => {
    await api.delete('/account');
  },
};

export const schoolsAPI = {
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
  delete: async (id) => {
    await api.delete(`/schools/${id}`);
  },
  addAdmin: async (schoolId, userId) => {
    const response = await api.post(`/schools/${schoolId}/admins`, { userId });
    return response.data;
  },
  removeAdmin: async (schoolId, userId) => {
    const response = await api.delete(`/schools/${schoolId}/admins/${userId}`);
    return response.data;
  },

  // Membership methods
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
    await api.delete(`/schools/${schoolId}/memberships/${userId}`);
  },
};

export const usersAPI = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },
};

export const accountsAdminAPI = {
  search: async (query) => {
    const response = await api.get('/users/accounts', { params: query ? { query } : {} });
    return response.data;
  },
  resetSignIn: async (userId) => {
    const response = await api.post(`/users/${userId}/reset-sign-in`);
    return response.data;
  },
};

export const clubsAPI = {
  listClubs: async (schoolId) => {
    const response = await api.get(`/schools/${schoolId}/clubs`);
    return response.data;
  },
  createClub: async (schoolId, data) => {
    const response = await api.post(`/schools/${schoolId}/clubs`, data);
    return response.data;
  },
  updateClub: async (schoolId, clubId, data) => {
    const response = await api.put(`/schools/${schoolId}/clubs/${clubId}`, data);
    return response.data;
  },
  deleteClub: async (schoolId, clubId) => {
    await api.delete(`/schools/${schoolId}/clubs/${clubId}`);
  },
  getClub: async (clubId) => {
    const response = await api.get(`/clubs/${clubId}`);
    return response.data;
  },
  getMyMembership: async (clubId) => {
    const response = await api.get(`/clubs/${clubId}/memberships/me`);
    return response.data || null;
  },
  getMyPrivileges: async (clubId) => {
    const response = await api.get(`/clubs/${clubId}/my-privileges`);
    return response.data ?? [];
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
    await api.delete(`/clubs/${clubId}/memberships/${userId}`);
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
    await api.delete(`/clubs/${clubId}/admins/${userId}`);
  },
};

export const invoicesAPI = {
  list: async (clubId) => {
    const response = await api.get(`/clubs/${clubId}/invoices`);
    return response.data;
  },
  get: async (clubId, invoiceId) => {
    const response = await api.get(`/clubs/${clubId}/invoices/${invoiceId}`);
    return response.data;
  },
  create: async (clubId, data) => {
    const response = await api.post(`/clubs/${clubId}/invoices`, data);
    return response.data;
  },
  update: async (clubId, invoiceId, data) => {
    const response = await api.put(`/clubs/${clubId}/invoices/${invoiceId}`, data);
    return response.data;
  },
  remove: async (clubId, invoiceId) => {
    await api.delete(`/clubs/${clubId}/invoices/${invoiceId}`);
  },
  submit: async (clubId, invoiceId) => {
    const response = await api.post(`/clubs/${clubId}/invoices/${invoiceId}/submit`);
    return response.data;
  },
  cancel: async (clubId, invoiceId, reason) => {
    const response = await api.post(`/clubs/${clubId}/invoices/${invoiceId}/cancel`, { reason });
    return response.data;
  },
  approve: async (clubId, invoiceId) => {
    const response = await api.post(`/clubs/${clubId}/invoices/${invoiceId}/approve`);
    return response.data;
  },
  sendBack: async (clubId, invoiceId, reason) => {
    const response = await api.post(`/clubs/${clubId}/invoices/${invoiceId}/send-back`, { reason });
    return response.data;
  },
  markPaid: async (clubId, invoiceId) => {
    const response = await api.post(`/clubs/${clubId}/invoices/${invoiceId}/mark-paid`);
    return response.data;
  },
  scanReceipt: async (clubId, imageBase64) => {
    const response = await api.post(`/clubs/${clubId}/invoices/scan`, { imageBase64 });
    return response.data;
  },
};

export const inventoryAPI = {
  list: async (clubId) => {
    const response = await api.get(`/clubs/${clubId}/inventory`);
    return response.data;
  },
  get: async (clubId, itemId) => {
    const response = await api.get(`/clubs/${clubId}/inventory/${itemId}`);
    return response.data;
  },
  create: async (clubId, data) => {
    const response = await api.post(`/clubs/${clubId}/inventory`, data);
    return response.data;
  },
  update: async (clubId, itemId, data) => {
    const response = await api.put(`/clubs/${clubId}/inventory/${itemId}`, data);
    return response.data;
  },
  remove: async (clubId, itemId) => {
    await api.delete(`/clubs/${clubId}/inventory/${itemId}`);
  },
  checkOut: async (clubId, itemId, dueDate, notes) => {
    const response = await api.post(`/clubs/${clubId}/inventory/${itemId}/check-out`, { dueDate, notes });
    return response.data;
  },
  checkIn: async (clubId, itemId, notes) => {
    const response = await api.post(`/clubs/${clubId}/inventory/${itemId}/check-in`, { notes });
    return response.data;
  },
};

export const eventsAPI = {
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
    await api.delete(`/schools/${schoolId}/events/${eventId}`);
  },
  rsvp: async (schoolId, eventId, response_) => {
    const response = await api.post(`/schools/${schoolId}/events/${eventId}/rsvp`, { response: response_ });
    return response.data;
  },
};

export const announcementsAPI = {
  list: async (schoolId) => {
    const response = await api.get(`/schools/${schoolId}/announcements`);
    return response.data;
  },
  create: async (schoolId, data) => {
    const response = await api.post(`/schools/${schoolId}/announcements`, data);
    return response.data;
  },
  remove: async (schoolId, announcementId) => {
    await api.delete(`/schools/${schoolId}/announcements/${announcementId}`);
  },
};

export default api;
