/* ==========================================================================
   api/projects.js
   Real network calls to the FastAPI backend's /projects/* and
   /project-assignments/* endpoints (SRS M01 -- Project Management).
   Every function here goes through authFetch() (see api/auth.js), same
   convention as api/admin.js.
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

// DELETE endpoints return 204 No Content -- res.json() would reject on an
// empty body, so these skip straight past it instead of going through
// _handle().
function _handleNoContent(res) {
  if (res.ok) return null;
  return res.json().catch(() => null).then(body => _fail(res, body));
}

/** GET /projects -- SRS M01-FR-04 monitoring view, scoped per-role
 * server-side (a Launch Engineer only gets their own assigned projects
 * back -- see the route's docstring). */
export function listProjects() {
  return authFetch('/projects').then(_handle);
}

/** GET /projects/{id} */
export function getProject(id) {
  return authFetch(`/projects/${id}`).then(_handle);
}

/** POST /projects. payload: { name, customer, customer_ref?, owner_user_id, site?, description?, status?, start_date?, target_date? } */
export function createProject(payload) {
  return authFetch('/projects', { method: 'POST', body: JSON.stringify(payload) }).then(_handle);
}

/** PATCH /projects/{id} -- any subset of the create payload's fields. */
export function updateProject(id, payload) {
  return authFetch(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }).then(_handle);
}

/** DELETE /projects/{id} -- SRS M01-AC-05, blocked server-side if linked
 * purchase orders exist (currently always succeeds -- see the route's
 * docstring for why). */
export function deleteProject(id) {
  return authFetch(`/projects/${id}`, { method: 'DELETE' }).then(_handleNoContent);
}

/** GET /projects/assignable-engineers -- backs the project form's Launch
 * Engineer picker (Launch Manager and System Administrator only). */
export function listAssignableEngineers() {
  return authFetch('/projects/assignable-engineers').then(_handle);
}

/** GET /project-assignments -- System Administrator only, every
 * assignment across every project. */
export function listProjectAssignments() {
  return authFetch('/project-assignments').then(_handle);
}

/** POST /project-assignments. payload: { project_id, user_id, role } */
export function createProjectAssignment(payload) {
  return authFetch('/project-assignments', { method: 'POST', body: JSON.stringify(payload) }).then(_handle);
}

/** DELETE /project-assignments/{id} */
export function deleteProjectAssignment(id) {
  return authFetch(`/project-assignments/${id}`, { method: 'DELETE' }).then(_handleNoContent);
}
