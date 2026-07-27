/* ==========================================================================
   data/admin-store.js
   Live, backend-backed replacement for the ADMIN_USERS / ADMIN_LOGIN_EVENTS
   arrays that used to live in data/mock-data.js as static fixtures.

   Kept as plain mutable arrays (not re-exported getters, not a class) so
   every existing render function in pages/admin.js and pages/dashboards.js
   that does `ADMIN_USERS.filter(...)`, `.find(...)`, `.length` etc. keeps
   working completely unchanged -- loadAdminUsers()/loadAdminLoginEvents()
   below clear and refill the array IN PLACE, so the array *reference*
   every importer holds stays valid across a reload. Only the two `import
   { ADMIN_USERS, ADMIN_LOGIN_EVENTS } from ...` lines at the top of those
   files change, from data/mock-data.js to here.

   ADMIN_ASSIGNMENTS deliberately stays in data/mock-data.js, not here --
   the backend has no Project model yet (that's module M01, not built),
   so there's nothing real to assign a user to. Kept in a visibly
   separate, still-labeled-mock file so it's obvious at the import site
   which admin data is real and which is still a placeholder waiting on a
   backend module that doesn't exist yet.
   ========================================================================== */

import {
  createReferenceEntry as apiCreateReferenceEntry,
  createUser as apiCreateUser,
  deactivateUser as apiDeactivateUser,
  deleteReferenceEntry as apiDeleteReferenceEntry,
  listLoginEvents,
  listReferenceEntries,
  listUsers,
  reactivateUser as apiReactivateUser,
  unlockUser as apiUnlockUser,
  updateReferenceEntry as apiUpdateReferenceEntry,
  updateUser as apiUpdateUser,
  updateUserRole as apiUpdateUserRole,
} from '../api/admin.js';

// Backend UserRole enum values <-> the display labels the admin UI already
// used everywhere (ADMIN_ROLE_OPTIONS / ADMIN_ROLE_DEFINITIONS in
// pages/admin.js). Centralized here so an API payload and an on-screen
// label can never drift apart the way they would have if each caller
// spelled out its own mapping.
export const BACKEND_ROLE_TO_LABEL = {
  engineer: 'Launch Engineer',
  manager: 'Launch Manager',
  plant: 'Plant Manager',
  wh_lead: 'Warehouse Team Leader',
  wh_staff: 'Warehouse Personnel',
  prod_coord: 'Production & Packing Coordinator',
  admin: 'System Administrator',
};
export const LABEL_TO_BACKEND_ROLE = Object.fromEntries(
  Object.entries(BACKEND_ROLE_TO_LABEL).map(([backendRole, label]) => [label, backendRole])
);

export const ADMIN_USERS = [];
export const ADMIN_LOGIN_EVENTS = [];

// Simple "have we fetched yet / are we fetching / did it fail" flags each
// admin page checks before triggering a load -- see the usage note at the
// bottom of this file. Exported as objects (not primitives) so mutating a
// property is visible to every importer without needing setter functions.
export const adminUsersStatus = { loading: false, loaded: false, error: null };
export const adminLoginEventsStatus = { loading: false, loaded: false, error: null };

function formatTimestamp(iso) {
  if (!iso) return 'Never';
  return new Date(iso).toISOString().slice(0, 16).replace('T', ' ');
}

function shortName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : (parts[0] || '');
}

function replaceArrayContents(target, items) {
  target.length = 0;
  target.push(...items);
}

// A user's assigned-projects list still comes from the local-only
// ADMIN_ASSIGNMENTS mock in data/mock-data.js (see the module docstring
// above) -- carried over here across a reload by full name so re-fetching
// the account list doesn't wipe out assignments made earlier in the
// session. This is the one place that store and this one touch.
function mapUser(apiUser, previousByFullName) {
  const previous = previousByFullName.get(apiUser.full_name);
  return {
    id: apiUser.id,
    name: shortName(apiUser.full_name),
    fullName: apiUser.full_name,
    username: apiUser.email,
    email: apiUser.email,
    role: BACKEND_ROLE_TO_LABEL[apiUser.role] || apiUser.role,
    status: apiUser.is_active ? 'Active' : 'Inactive',
    locked: apiUser.is_locked,
    failedAttempts: apiUser.failed_login_attempts,
    lastLogin: formatTimestamp(apiUser.last_login_at),
    projects: previous ? previous.projects : [],
  };
}

/** Re-fetches the full account list from the backend and replaces
 * ADMIN_USERS in place. Call this after any mutation (create, role
 * change, activate/deactivate, unlock) instead of hand-patching the local
 * array, so what's on screen always reflects what the backend actually
 * persisted -- if a write silently failed, a stale local patch would hide
 * that; a re-fetch can't. */
export function loadAdminUsers() {
  adminUsersStatus.loading = true;
  adminUsersStatus.error = null;
  const previousByFullName = new Map(ADMIN_USERS.map(user => [user.fullName, user]));
  return listUsers()
    .then(users => {
      replaceArrayContents(ADMIN_USERS, users.map(user => mapUser(user, previousByFullName)));
      adminUsersStatus.loaded = true;
    })
    .catch(error => {
      adminUsersStatus.error = error.message || 'Could not load user accounts.';
    })
    .finally(() => {
      adminUsersStatus.loading = false;
    });
}

function mapLoginEvent(apiEvent) {
  return {
    time: formatTimestamp(apiEvent.created_at),
    username: apiEvent.username,
    result: apiEvent.result === 'success' ? 'Successful' : 'Failed',
    reason: apiEvent.reason,
    source: apiEvent.source_ip || '\u2014',
  };
}

export function loadAdminLoginEvents() {
  adminLoginEventsStatus.loading = true;
  adminLoginEventsStatus.error = null;
  return listLoginEvents()
    .then(events => {
      replaceArrayContents(ADMIN_LOGIN_EVENTS, events.map(mapLoginEvent));
      adminLoginEventsStatus.loaded = true;
    })
    .catch(error => {
      adminLoginEventsStatus.error = error.message || 'Could not load the login audit log.';
    })
    .finally(() => {
      adminLoginEventsStatus.loading = false;
    });
}

// ---- mutations -----------------------------------------------------------
// Every one of these talks to the real backend and returns a Promise;
// pages/admin.js's handlers await them, then call loadAdminUsers() to
// refresh from the source of truth rather than guessing at the new state
// locally (see loadAdminUsers's docstring above).

export function createUser(payload) {
  return apiCreateUser(payload);
}

export function updateUserIdentity(id, payload) {
  return apiUpdateUser(id, payload);
}

export function updateUserRole(id, roleLabel) {
  return apiUpdateUserRole(id, LABEL_TO_BACKEND_ROLE[roleLabel] || roleLabel);
}

export function deactivateUser(id) {
  return apiDeactivateUser(id);
}

export function reactivateUser(id) {
  return apiReactivateUser(id);
}

export function unlockUser(id) {
  return apiUnlockUser(id);
}

// ---- reference lists (SRS M00-FR-14..16) ---------------------------------
// Static UI copy (list label + the name of the field the form collects)
// -- not per-record data, so it doesn't come from the backend, same as
// BACKEND_ROLE_TO_LABEL above.
export const REFERENCE_LIST_META = {
  customers: { label: 'JIT Customers', fields: 'Customer name' },
  contacts: { label: 'Contact Names', fields: 'Contact name' },
  fgpn: { label: 'Finished Goods Part Numbers', fields: 'FGPN and project' },
  receivers: { label: 'Manufacturing Receivers', fields: 'Receiver name' },
  methods: { label: 'Delivery Methods', fields: 'Method name' },
  materialTypes: { label: 'Material Types', fields: 'Material type' },
};

// Same live-mutable-object pattern as ADMIN_USERS above: each list's
// `entries` array is cleared and refilled in place by loadReferenceEntries()
// so every importer's reference stays valid across a reload.
export const ADMIN_REFERENCE_LISTS = Object.fromEntries(
  Object.entries(REFERENCE_LIST_META).map(([key, meta]) => [key, { ...meta, entries: [] }])
);

export const adminReferenceListsStatus = { loading: false, loaded: false, error: null };

function mapReferenceEntry(apiEntry) {
  return {
    id: apiEntry.id,
    label: apiEntry.label,
    project: apiEntry.project || '',
    references: apiEntry.reference_codes || [],
    status: apiEntry.is_active ? 'Active' : 'Inactive',
  };
}

/** Re-fetches every reference entry (all six lists in one request -- see
 * listReferenceEntries's docstring) and regroups them into
 * ADMIN_REFERENCE_LISTS by list_type, in place. */
export function loadReferenceEntries() {
  adminReferenceListsStatus.loading = true;
  adminReferenceListsStatus.error = null;
  return listReferenceEntries()
    .then(entries => {
      Object.values(ADMIN_REFERENCE_LISTS).forEach(list => { list.entries.length = 0; });
      entries.forEach(entry => {
        const bucket = ADMIN_REFERENCE_LISTS[entry.list_type];
        if (bucket) bucket.entries.push(mapReferenceEntry(entry));
      });
      adminReferenceListsStatus.loaded = true;
    })
    .catch(error => {
      adminReferenceListsStatus.error = error.message || 'Could not load reference lists.';
    })
    .finally(() => {
      adminReferenceListsStatus.loading = false;
    });
}

/** listType is one of REFERENCE_LIST_META's keys. draft: { label, project?, references?: string[] } */
export function createReferenceEntry(listType, draft) {
  return apiCreateReferenceEntry({
    list_type: listType,
    label: draft.label,
    project: listType === 'fgpn' ? (draft.project || null) : null,
    reference_codes: listType === 'customers' ? (draft.references || null) : null,
  });
}

/** patch: any subset of { label, project, references, status:'Active'|'Inactive' } */
export function updateReferenceEntry(id, patch) {
  const body = {};
  if ('label' in patch) body.label = patch.label;
  if ('project' in patch) body.project = patch.project;
  if ('references' in patch) body.reference_codes = patch.references;
  if ('status' in patch) body.is_active = patch.status === 'Active';
  return apiUpdateReferenceEntry(id, body);
}

export function deleteReferenceEntry(id) {
  return apiDeleteReferenceEntry(id);
}
