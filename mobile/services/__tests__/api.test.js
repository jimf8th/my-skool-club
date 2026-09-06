jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { hostUri: '192.168.10.20:8081' },
  manifest2: undefined,
  manifest: undefined,
}));

jest.mock('../../utils/authStorage', () => ({
  clearAuthSession: jest.fn(),
}));

import axios from 'axios';
import Constants from 'expo-constants';
import { clearAuthSession } from '../../utils/authStorage';
import { currentIdToken } from '../firebase';
import {
  accountAPI,
  announcementsAPI,
  authAPI,
  clubsAPI,
  contentReportsAPI,
  eventsAPI,
  getAppEnvironment,
  getApiUrl,
  inventoryAPI,
  invoicesAPI,
  invitationsAPI,
  schoolsAPI,
  setOnUnauthorized,
  usersAPI,
} from '../api';

const mockAxiosCreate = axios.create;
const mockApi = mockAxiosCreate.mock.results[0].value;
const mockRequestUse = mockApi.interceptors.request.use;
const mockResponseUse = mockApi.interceptors.response.use;
const mockClearAuthSession = clearAuthSession;
const mockCurrentIdToken = currentIdToken;
const mockConstants = Constants;
const apiCreateConfig = mockAxiosCreate.mock.calls[0][0];
const requestFulfilled = mockRequestUse.mock.calls[0][0];
const requestRejected = mockRequestUse.mock.calls[0][1];
const responseFulfilled = mockResponseUse.mock.calls[0][0];
const responseRejected = mockResponseUse.mock.calls[0][1];

const schoolData = { name: 'North Valley', description: 'Test school' };
const clubData = { name: 'Robotics', description: 'Build things' };
const invoiceData = { title: 'Supplies', lineItems: [{ description: 'Wire', quantity: 2, unitPrice: 5 }] };
const itemData = { name: 'Camera', category: 'Electronics' };
const eventData = { title: 'Fundraiser', location: 'Gym', eventTime: '2030-01-01T18:00:00' };
const announcementData = { title: 'Welcome', body: 'Welcome back' };

const endpointCases = [
  { name: 'auth.syncSession', method: 'post', args: ['/auth/session', {}], invoke: () => authAPI.syncSession() },
  { name: 'auth.getInvitationDetails', method: 'post', args: ['/auth/invitations/details', { token: 'invite-token' }], invoke: () => authAPI.getInvitationDetails('invite-token') },
  { name: 'auth.acceptInvitation', method: 'post', args: ['/auth/invitations/accept', { token: 'invite-token', ageConfirmed: true, acceptedTerms: true }], invoke: () => authAPI.acceptInvitation('invite-token', { ageConfirmed: true, acceptedTerms: true }) },
  { name: 'invitations.inviteFriend', method: 'post', args: ['/invitations', { firstName: 'Maya', lastName: 'Member', email: 'maya@example.com' }], invoke: () => invitationsAPI.inviteFriend({ firstName: 'Maya', lastName: 'Member', email: 'maya@example.com' }) },

  { name: 'contentReports.create', method: 'post', args: ['/content-reports', { contentType: 'EVENT', contentId: 40, reason: 'SPAM', details: 'Repeated post' }], invoke: () => contentReportsAPI.create('EVENT', 40, 'SPAM', 'Repeated post') },
  { name: 'contentReports.mine', method: 'get', args: ['/content-reports/mine'], invoke: () => contentReportsAPI.mine() },

  { name: 'account.getCurrentAccount', method: 'get', args: ['/account'], invoke: () => accountAPI.getCurrentAccount() },
  { name: 'account.deleteAccount', method: 'delete', args: ['/account'], invoke: () => accountAPI.deleteAccount(), noDataReturn: true },

  { name: 'schools.getAll', method: 'get', args: ['/schools'], invoke: () => schoolsAPI.getAll() },
  { name: 'schools.getById', method: 'get', args: ['/schools/10'], invoke: () => schoolsAPI.getById(10) },
  { name: 'schools.create', method: 'post', args: ['/schools', schoolData], invoke: () => schoolsAPI.create(schoolData) },
  { name: 'schools.setEnabled', method: 'patch', args: ['/schools/10/enabled?value=false'], invoke: () => schoolsAPI.setEnabled(10, false) },
  { name: 'schools.setTier', method: 'patch', args: ['/schools/10/tier', { tier: 'PREMIUM' }], invoke: () => schoolsAPI.setTier(10, 'PREMIUM') },
  { name: 'schools.update', method: 'put', args: ['/schools/10', schoolData], invoke: () => schoolsAPI.update(10, schoolData) },
  { name: 'schools.delete', method: 'delete', args: ['/schools/10'], invoke: () => schoolsAPI.delete(10), noDataReturn: true },
  { name: 'schools.addAdmin', method: 'post', args: ['/schools/10/admins', { userId: 101 }], invoke: () => schoolsAPI.addAdmin(10, 101) },
  { name: 'schools.removeAdmin', method: 'delete', args: ['/schools/10/admins/101'], invoke: () => schoolsAPI.removeAdmin(10, 101) },
  { name: 'schools.requestToJoin', method: 'post', args: ['/schools/10/memberships/request'], invoke: () => schoolsAPI.requestToJoin(10) },
  { name: 'schools.getMyMembership', method: 'get', args: ['/schools/10/memberships/me'], invoke: () => schoolsAPI.getMyMembership(10) },
  { name: 'schools.getMyPrivileges', method: 'get', args: ['/schools/10/my-privileges'], invoke: () => schoolsAPI.getMyPrivileges(10) },
  { name: 'schools.getPendingRequests', method: 'get', args: ['/schools/10/memberships/pending'], invoke: () => schoolsAPI.getPendingRequests(10) },
  { name: 'schools.getMembers', method: 'get', args: ['/schools/10/memberships'], invoke: () => schoolsAPI.getMembers(10) },
  { name: 'schools.approveMember', method: 'post', args: ['/schools/10/memberships/101/approve'], invoke: () => schoolsAPI.approveMember(10, 101) },
  { name: 'schools.rejectMember', method: 'post', args: ['/schools/10/memberships/101/reject'], invoke: () => schoolsAPI.rejectMember(10, 101) },
  { name: 'schools.revokeMember', method: 'delete', args: ['/schools/10/memberships/101'], invoke: () => schoolsAPI.revokeMember(10, 101), noDataReturn: true },

  { name: 'users.getAll', method: 'get', args: ['/users'], invoke: () => usersAPI.getAll() },

  { name: 'clubs.listClubs', method: 'get', args: ['/schools/10/clubs'], invoke: () => clubsAPI.listClubs(10) },
  { name: 'clubs.createClub', method: 'post', args: ['/schools/10/clubs', clubData], invoke: () => clubsAPI.createClub(10, clubData) },
  { name: 'clubs.updateClub', method: 'put', args: ['/schools/10/clubs/20', clubData], invoke: () => clubsAPI.updateClub(10, 20, clubData) },
  { name: 'clubs.deleteClub', method: 'delete', args: ['/schools/10/clubs/20'], invoke: () => clubsAPI.deleteClub(10, 20), noDataReturn: true },
  { name: 'clubs.getClub', method: 'get', args: ['/clubs/20'], invoke: () => clubsAPI.getClub(20) },
  { name: 'clubs.getMyMembership', method: 'get', args: ['/clubs/20/memberships/me'], invoke: () => clubsAPI.getMyMembership(20) },
  { name: 'clubs.getMyPrivileges', method: 'get', args: ['/clubs/20/my-privileges'], invoke: () => clubsAPI.getMyPrivileges(20) },
  { name: 'clubs.requestToJoin', method: 'post', args: ['/clubs/20/memberships/request'], invoke: () => clubsAPI.requestToJoin(20) },
  { name: 'clubs.getPendingRequests', method: 'get', args: ['/clubs/20/memberships/pending'], invoke: () => clubsAPI.getPendingRequests(20) },
  { name: 'clubs.getMembers', method: 'get', args: ['/clubs/20/memberships'], invoke: () => clubsAPI.getMembers(20) },
  { name: 'clubs.approveMember', method: 'post', args: ['/clubs/20/memberships/101/approve'], invoke: () => clubsAPI.approveMember(20, 101) },
  { name: 'clubs.rejectMember', method: 'post', args: ['/clubs/20/memberships/101/reject'], invoke: () => clubsAPI.rejectMember(20, 101) },
  { name: 'clubs.revokeMember', method: 'delete', args: ['/clubs/20/memberships/101'], invoke: () => clubsAPI.revokeMember(20, 101), noDataReturn: true },
  { name: 'clubs.getAdmins', method: 'get', args: ['/clubs/20/admins'], invoke: () => clubsAPI.getAdmins(20) },
  { name: 'clubs.addAdmin', method: 'post', args: ['/clubs/20/admins', { userId: 101 }], invoke: () => clubsAPI.addAdmin(20, 101) },
  { name: 'clubs.removeAdmin', method: 'delete', args: ['/clubs/20/admins/101'], invoke: () => clubsAPI.removeAdmin(20, 101), noDataReturn: true },

  { name: 'invoices.list', method: 'get', args: ['/clubs/20/invoices'], invoke: () => invoicesAPI.list(20) },
  { name: 'invoices.get', method: 'get', args: ['/clubs/20/invoices/30'], invoke: () => invoicesAPI.get(20, 30) },
  { name: 'invoices.create', method: 'post', args: ['/clubs/20/invoices', invoiceData], invoke: () => invoicesAPI.create(20, invoiceData) },
  { name: 'invoices.update', method: 'put', args: ['/clubs/20/invoices/30', invoiceData], invoke: () => invoicesAPI.update(20, 30, invoiceData) },
  { name: 'invoices.remove', method: 'delete', args: ['/clubs/20/invoices/30'], invoke: () => invoicesAPI.remove(20, 30), noDataReturn: true },
  { name: 'invoices.submit', method: 'post', args: ['/clubs/20/invoices/30/submit'], invoke: () => invoicesAPI.submit(20, 30) },
  { name: 'invoices.cancel', method: 'post', args: ['/clubs/20/invoices/30/cancel', { reason: 'Duplicate' }], invoke: () => invoicesAPI.cancel(20, 30, 'Duplicate') },
  { name: 'invoices.approve', method: 'post', args: ['/clubs/20/invoices/30/approve'], invoke: () => invoicesAPI.approve(20, 30) },
  { name: 'invoices.sendBack', method: 'post', args: ['/clubs/20/invoices/30/send-back', { reason: 'Missing receipt' }], invoke: () => invoicesAPI.sendBack(20, 30, 'Missing receipt') },
  { name: 'invoices.markPaid', method: 'post', args: ['/clubs/20/invoices/30/mark-paid'], invoke: () => invoicesAPI.markPaid(20, 30) },
  { name: 'invoices.scanReceipt', method: 'post', args: ['/clubs/20/invoices/scan', { imageBase64: 'base64-image' }], invoke: () => invoicesAPI.scanReceipt(20, 'base64-image') },

  { name: 'inventory.list', method: 'get', args: ['/clubs/20/inventory'], invoke: () => inventoryAPI.list(20) },
  { name: 'inventory.get', method: 'get', args: ['/clubs/20/inventory/50'], invoke: () => inventoryAPI.get(20, 50) },
  { name: 'inventory.create', method: 'post', args: ['/clubs/20/inventory', itemData], invoke: () => inventoryAPI.create(20, itemData) },
  { name: 'inventory.update', method: 'put', args: ['/clubs/20/inventory/50', itemData], invoke: () => inventoryAPI.update(20, 50, itemData) },
  { name: 'inventory.remove', method: 'delete', args: ['/clubs/20/inventory/50'], invoke: () => inventoryAPI.remove(20, 50), noDataReturn: true },
  { name: 'inventory.checkOut', method: 'post', args: ['/clubs/20/inventory/50/check-out', { dueDate: '2030-01-10', notes: 'Tournament' }], invoke: () => inventoryAPI.checkOut(20, 50, '2030-01-10', 'Tournament') },
  { name: 'inventory.checkIn', method: 'post', args: ['/clubs/20/inventory/50/check-in', { notes: 'Good condition' }], invoke: () => inventoryAPI.checkIn(20, 50, 'Good condition') },

  { name: 'events.list', method: 'get', args: ['/schools/10/events'], invoke: () => eventsAPI.list(10) },
  { name: 'events.get', method: 'get', args: ['/schools/10/events/40'], invoke: () => eventsAPI.get(10, 40) },
  { name: 'events.create', method: 'post', args: ['/schools/10/events', eventData], invoke: () => eventsAPI.create(10, eventData) },
  { name: 'events.remove', method: 'delete', args: ['/schools/10/events/40'], invoke: () => eventsAPI.remove(10, 40), noDataReturn: true },
  { name: 'events.rsvp', method: 'post', args: ['/schools/10/events/40/rsvp', { response: 'YES' }], invoke: () => eventsAPI.rsvp(10, 40, 'YES') },

  { name: 'announcements.list', method: 'get', args: ['/schools/10/announcements'], invoke: () => announcementsAPI.list(10) },
  { name: 'announcements.create', method: 'post', args: ['/schools/10/announcements', announcementData], invoke: () => announcementsAPI.create(10, announcementData) },
  { name: 'announcements.remove', method: 'delete', args: ['/schools/10/announcements/60'], invoke: () => announcementsAPI.remove(10, 60), noDataReturn: true },
];

describe('API client configuration', () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_APP_ENV;
    delete process.env.EXPO_PUBLIC_API_URL;
    mockConstants.expoConfig = { hostUri: '192.168.10.20:8081' };
    mockConstants.manifest2 = undefined;
    mockConstants.manifest = undefined;
  });

  it('creates a JSON client using the Metro host during development', () => {
    expect(apiCreateConfig).toEqual({
      baseURL: 'http://192.168.10.20:8080/api',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('uses each supported Expo host source in priority order', () => {
    mockConstants.expoConfig = undefined;
    mockConstants.manifest2 = { extra: { expoClient: { hostUri: '10.0.0.2:8081' } } };
    mockConstants.manifest = { debuggerHost: '10.0.0.3:8081' };
    expect(getApiUrl()).toBe('http://10.0.0.2:8080/api');

    mockConstants.manifest2 = undefined;
    expect(getApiUrl()).toBe('http://10.0.0.3:8080/api');
  });

  it('falls back to localhost in development when Expo has no host', () => {
    mockConstants.expoConfig = undefined;
    mockConstants.manifest2 = undefined;
    mockConstants.manifest = undefined;

    expect(getApiUrl()).toBe('http://localhost:8080/api');
  });

  it.each(['test', 'prod'])('pins the %s environment to the deployed API even in a dev bundle', (environment) => {
    process.env.EXPO_PUBLIC_APP_ENV = environment;
    process.env.EXPO_PUBLIC_API_URL = 'https://myskoolclub.com/api/';

    expect(getAppEnvironment()).toBe(environment);
    expect(getApiUrl()).toBe('https://myskoolclub.com/api');
  });

  it('reads the test environment and API from the Expo manifest', () => {
    mockConstants.expoConfig = {
      hostUri: '192.168.10.20:8081',
      extra: { appEnvironment: 'test', apiUrl: 'https://myskoolclub.com/api' },
    };

    expect(getAppEnvironment()).toBe('test');
    expect(getApiUrl()).toBe('https://myskoolclub.com/api');
  });

  it('rejects an unsafe API override for test and production', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'test';
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080/api';

    expect(() => getApiUrl()).toThrow(
      'test builds must use https://myskoolclub.com/api; received http://localhost:8080/api.'
    );
  });

  it('allows an explicit local API URL in dev and removes trailing slashes', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'dev';
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8080/api///';
    expect(getApiUrl()).toBe('http://10.0.2.2:8080/api');
  });

  it('rejects a remote API override in dev', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'dev';
    process.env.EXPO_PUBLIC_API_URL = 'https://myskoolclub.com/api';
    expect(() => getApiUrl()).toThrow(
      'dev builds must use a local http://…/api endpoint; received https://myskoolclub.com/api.'
    );
  });

  it('rejects a malformed API override in dev', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'dev';
    process.env.EXPO_PUBLIC_API_URL = 'not-a-url';
    expect(() => getApiUrl()).toThrow(
      'dev builds must use a local http://…/api endpoint; received not-a-url.'
    );
  });

  it('always uses the production API outside development', () => {
    const previousDev = global.__DEV__;
    global.__DEV__ = false;

    try {
      expect(getApiUrl()).toBe('https://myskoolclub.com/api');
    } finally {
      global.__DEV__ = previousDev;
    }
  });
});

describe('request interceptor', () => {
  beforeEach(() => {
    mockCurrentIdToken.mockReset().mockResolvedValue(null);
  });

  it('adds the firebase bearer token', async () => {
    mockCurrentIdToken.mockResolvedValue('firebase-token');
    const config = { headers: { Accept: 'application/json' } };

    await expect(requestFulfilled(config)).resolves.toBe(config);

    expect(config.headers).toEqual({ Accept: 'application/json', Authorization: 'Bearer firebase-token' });
  });

  it('leaves headers unchanged without a token', async () => {
    const config = { headers: {} };

    await expect(requestFulfilled(config)).resolves.toBe(config);
    expect(config.headers).toEqual({});
  });

  it('passes request setup failures through unchanged', async () => {
    const error = new Error('request setup failed');
    await expect(requestRejected(error)).rejects.toBe(error);
  });
});

describe('response interceptor', () => {
  let consoleError;

  beforeEach(() => {
    mockClearAuthSession.mockReset().mockResolvedValue(undefined);
    setOnUnauthorized(null);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => setOnUnauthorized(null));

  it('passes successful responses through unchanged', () => {
    const response = { status: 200, data: { ok: true } };
    expect(responseFulfilled(response)).toBe(response);
  });

  it('clears the session and notifies AuthContext for protected 401 responses', async () => {
    const onUnauthorized = jest.fn();
    const error = {
      response: { status: 401, data: { message: 'Expired' } },
      config: { method: 'get', url: '/account' },
    };
    setOnUnauthorized(onUnauthorized);

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(mockClearAuthSession).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('still clears a protected 401 session before AuthContext registers a callback', async () => {
    const error = {
      response: { status: 401, data: { message: 'Expired' } },
      config: { method: 'get', url: '/schools' },
    };

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(mockClearAuthSession).toHaveBeenCalledTimes(1);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('does not clear the current session for public authentication 401 responses', async () => {
    const onUnauthorized = jest.fn();
    const error = {
      response: { status: 401, data: { message: 'Bad credentials' } },
      config: { method: 'post', url: '/auth/login' },
    };
    setOnUnauthorized(onUnauthorized);

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(mockClearAuthSession).not.toHaveBeenCalled();
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('does not show expected public-auth validation errors in the development overlay', async () => {
    const error = {
      response: { status: 403, data: { message: 'Verify email' } },
      config: { method: 'post', url: '/auth/login' },
    };

    await expect(responseRejected(error)).rejects.toBe(error);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('suppresses response details from the development error overlay', async () => {
    const error = {
      response: { status: 500, data: { message: 'Server error' } },
      config: { method: 'post', url: '/auth/login' },
    };

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('suppresses network failure details from the development error overlay', async () => {
    const error = {
      request: {},
      message: 'Network Error',
      config: { method: 'get', baseURL: 'http://localhost:8080/api', url: '/schools' },
    };

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('suppresses request setup details from the development error overlay', async () => {
    const error = { message: 'Invalid configuration', config: {} };

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('API endpoint adapters', () => {
  beforeEach(() => {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      mockApi[method].mockReset();
    }
  });

  it.each(endpointCases)('$name uses the expected HTTP contract', async ({ method, args, invoke, noDataReturn }) => {
    const responseData = { endpoint: args[0] };
    mockApi[method].mockResolvedValue({ data: responseData });

    const result = await invoke();

    expect(mockApi[method]).toHaveBeenCalledTimes(1);
    expect(mockApi[method]).toHaveBeenCalledWith(...args);
    expect(result).toEqual(noDataReturn ? undefined : responseData);
  });

  it.each([
    ['school membership', () => schoolsAPI.getMyMembership(10)],
    ['club membership', () => clubsAPI.getMyMembership(20)],
  ])('normalizes an empty %s response to null', async (_label, invoke) => {
    mockApi.get.mockResolvedValue({ data: undefined });
    await expect(invoke()).resolves.toBeNull();
  });

  it.each([
    ['school privileges', () => schoolsAPI.getMyPrivileges(10)],
    ['club privileges', () => clubsAPI.getMyPrivileges(20)],
  ])('normalizes an empty %s response to an array', async (_label, invoke) => {
    mockApi.get.mockResolvedValue({ data: null });
    await expect(invoke()).resolves.toEqual([]);
  });
});
