export const regularUser = Object.freeze({
  id: 101,
  email: 'member@example.com',
  firstName: 'Maya',
  lastName: 'Member',
  appRole: 'USER',
});

export const appAdminUser = Object.freeze({
  id: 1,
  email: 'admin@example.com',
  firstName: 'Avery',
  lastName: 'Admin',
  appRole: 'APP_ADMIN',
});

export const schoolFixture = Object.freeze({
  id: 10,
  name: 'North Valley High School',
  description: 'A fixture school used by the mobile test suite.',
  enabled: true,
  admins: [],
});

export const clubFixture = Object.freeze({
  id: 20,
  schoolId: schoolFixture.id,
  schoolName: schoolFixture.name,
  name: 'Robotics Club',
  description: 'Build, test, and compete.',
  admins: [],
});

export const approvedSchoolMembership = Object.freeze({
  schoolId: schoolFixture.id,
  userId: regularUser.id,
  status: 'APPROVED',
  role: 'MEMBER',
});

export const approvedClubMembership = Object.freeze({
  clubId: clubFixture.id,
  userId: regularUser.id,
  status: 'APPROVED',
  role: 'MEMBER',
});

export const schoolPrivileges = Object.freeze([
  'VIEW_ALL_CLUBS',
  'VIEW_EVENTS',
  'VIEW_ANNOUNCEMENTS',
]);

export const clubPrivileges = Object.freeze([
  'VIEW_CLUB_MEMBERS',
  'VIEW_INVOICES',
  'VIEW_INVENTORY',
]);

export function buildFixture(base, overrides = {}) {
  return { ...base, ...overrides };
}

export function createApiError(status, message) {
  return Object.assign(new Error(message), {
    response: { status, data: { message } },
  });
}

export function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
