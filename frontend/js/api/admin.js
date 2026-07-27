/* ==========================================================================
   api/admin.js
   Real network calls to the FastAPI backend's /users/* endpoints (SRS
   M00 -- account management, admin-only). Every function here goes
   through authFetch() (see api/auth.js) so the bearer token is attached
   automatically and an expired session bounces back to the login screen
   the same way it does everywhere else.

   Scope note: user accounts, login events, and reference lists are all
   backed by real endpoints now. Project Assignments is still local-only
   (see pages/admin.js) because the backend has no Project model yet --
   that's module M01, not built yet, not something this file can fake
   without lying about persistence.
   ========================================================================== */

import { authFetch } from './auth.js';

function _fail(res, body) {
  const message = (body && body.detail) ? body.detail : `Request failed (${res.status}).`;
  throw new Error(message);
}

function _handle(res) {
  return res.json()
    .catch(() => null)
    .then(body => {
      if (!res.ok) return _fail(res, body);
      return body;
    });
}

/** GET /users -- every account, active and deactivated alike. */
export function listUsers() {
  return authFetch('/users').then(_handle);
}

/** POST /users -- create an account. payload: { email, password, full_name, role } */
export function createUser(payload) {
  return authFetch('/users', { method: 'POST', body: JSON.stringify(payload) }).then(_handle);
}

/** PATCH /users/{id} -- edit full_name and/or email. payload: { full_name?, email? } */
export function updateUser(id, payload) {
  return authFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }).then(_handle);
}

/** PATCH /users/{id}/role -- SRS M00-FR-06, replaces the role outright. */
export function updateUserRole(id, role) {
  return authFetch(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }).then(_handle);
}

/** PATCH /users/{id}/deactivate -- SRS M00-FR-04. */
export function deactivateUser(id) {
  return authFetch(`/users/${id}/deactivate`, { method: 'PATCH' }).then(_handle);
}

/** PATCH /users/{id}/reactivate -- SRS M00-FR-05. */
export function reactivateUser(id) {
  return authFetch(`/users/${id}/reactivate`, { method: 'PATCH' }).then(_handle);
}

/** PATCH /users/{id}/unlock -- SRS M00-FR-12, clears a 5-failed-attempts lock. */
export function unlockUser(id) {
  return authFetch(`/users/${id}/unlock`, { method: 'PATCH' }).then(_handle);
}

/** GET /users/login-events -- SRS M00-FR-13 login audit log, newest first. */
export function listLoginEvents() {
  return authFetch('/users/login-events').then(_handle);
}

/** GET /reference-entries -- every entry across all six SRS M00-FR-14 lists. */
export function listReferenceEntries() {
  return authFetch('/reference-entries').then(_handle);
}

/** POST /reference-entries. payload: { list_type, label, project?, reference_codes? } */
export function createReferenceEntry(payload) {
  return authFetch('/reference-entries', { method: 'POST', body: JSON.stringify(payload) }).then(_handle);
}

/** PATCH /reference-entries/{id}. payload: any subset of { label, project, reference_codes, is_active } */
export function updateReferenceEntry(id, payload) {
  return authFetch(`/reference-entries/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }).then(_handle);
}

/** DELETE /reference-entries/{id} -- SRS M00-FR-16, blocked server-side if linked (see the route's docstring for why nothing is linked yet). */
export function deleteReferenceEntry(id) {
  return authFetch(`/reference-entries/${id}`, { method: 'DELETE' }).then(_handle);
}
