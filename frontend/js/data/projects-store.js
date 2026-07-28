/* ==========================================================================
   data/projects-store.js
   Live, backend-backed replacement for:
     - PROJECTS (used to be a static array in data/mock-data.js)
     - ADMIN_ASSIGNMENTS (used to be a static, local-only array in
       data/mock-data.js, mutated directly by pages/admin.js's project-
       assignments section)

   Same live-mutable-array pattern as data/admin-store.js's ADMIN_USERS:
   PROJECTS/PROJECT_ASSIGNMENTS are kept as plain arrays (not re-exported
   getters) so every existing `PROJECTS.find(...)`, `.filter(...)` etc.
   across the app keeps working unchanged after the import path switches
   from data/mock-data.js to here -- loadProjects()/loadProjectAssignments()
   below clear and refill the array IN PLACE, so the array *reference*
   every importer holds stays valid across a reload.

   Field-mapping notes:
   - `id` on a mapped project is the backend's display `code`
     ("PRJ-004"), not the numeric primary key -- every existing call site
     across the app (openProject('PRJ-004'), onclick handlers built from
     template strings, etc.) already works with that string id, so
     nothing else has to change. `backendId` (the real numeric id) is
     the one field every mutation function below actually sends to the
     API.
   - `canWrite` comes straight from the backend's per-request `can_write`
     flag (SRS M01-FR-02/06/07 access control, enforced server-side --
     see backend/app/api/routes/projects.py). components/shared-tables.js's
     canWriteProject()/assignedProjectNames() now just read this flag
     instead of reimplementing the access rule against a hardcoded
     display-name mapping the way the old mock version did.
   - `progress`/`health` are NOT real backend fields (see Project's model
     docstring: the roadmap explicitly said not to fake fields with no
     real source, and nothing that would make a genuine progress/health
     number meaningful -- POs, BOM, simulation -- exists as a real table
     yet). Both are computed here from start_date/target_date as an
     honest, derivable "how far through the scheduled window are we"
     percentage, so pages/dashboards.js (out of scope for this step)
     keeps rendering without modification. Once PO/BOM data is real,
     these should be revisited to reflect actual production completion.
   ========================================================================== */

import {
  createProject as apiCreateProject,
  createProjectAssignment as apiCreateProjectAssignment,
  deleteProject as apiDeleteProject,
  deleteProjectAssignment as apiDeleteProjectAssignment,
  listAssignableEngineers,
  listProjectAssignments,
  listProjects,
  updateProject as apiUpdateProject,
} from '../api/projects.js';

export const PROJECTS = [];
export const projectsStatus = { loading: false, loaded: false, error: null };

export const PROJECT_ASSIGNMENTS = [];
export const projectAssignmentsStatus = { loading: false, loaded: false, error: null };

export const ASSIGNABLE_ENGINEERS = [];
export const assignableEngineersStatus = { loading: false, loaded: false, error: null };

function replaceArrayContents(target, items) {
  target.length = 0;
  target.push(...items);
}

export function projectStatusType(status) {
  return status === 'On Track' ? 'success' : status === 'At Risk' ? 'warning' : status === 'Blocked' ? 'danger' : 'neutral';
}

// Honest, derivable stand-in for progress/health -- see the module
// docstring above. 0 with no dates at all (nothing scheduled yet); 100
// once past the target date (schedule window fully elapsed, whether or
// not the work itself is actually done -- that distinction needs real PO/
// production data this step doesn't have).
function scheduleProgress(startDate, targetDate) {
  if (!startDate || !targetDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(targetDate).getTime();
  const now = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
}

function mapProject(apiProject) {
  const progress = scheduleProgress(apiProject.start_date, apiProject.target_date);
  return {
    id: apiProject.code,
    backendId: apiProject.id,
    name: apiProject.name,
    customer: apiProject.customer,
    customerRef: apiProject.customer_ref || '',
    engineer: apiProject.owner_name,
    ownerUserId: apiProject.owner_user_id,
    site: apiProject.site || '',
    startDate: apiProject.start_date || '',
    targetDate: apiProject.target_date || '',
    description: apiProject.description || '',
    status: apiProject.status,
    statusType: projectStatusType(apiProject.status),
    canWrite: Boolean(apiProject.can_write),
    // See the module docstring -- both fields intentionally share the
    // same honest, schedule-based number rather than one of them being
    // faked from nothing.
    progress,
    health: progress,
    createdAt: apiProject.created_at,
  };
}

/** Re-fetches the project list (scoped server-side per SRS M01-FR-06 for
 * a Launch Engineer) and replaces PROJECTS in place. Call this after any
 * mutation instead of hand-patching the local array -- same reasoning as
 * loadAdminUsers() in data/admin-store.js. */
export function loadProjects() {
  projectsStatus.loading = true;
  projectsStatus.error = null;
  return listProjects()
    .then(projects => {
      replaceArrayContents(PROJECTS, projects.map(mapProject));
      projectsStatus.loaded = true;
    })
    .catch(error => {
      projectsStatus.error = error.message || 'Could not load projects.';
    })
    .finally(() => {
      projectsStatus.loading = false;
    });
}

export function projectByAnyId(idOrName) {
  return PROJECTS.find(project => project.id === idOrName || project.name === idOrName);
}

/** payload: { name, customer, customerRef?, ownerUserId, site?, description?, status?, startDate?, targetDate? }
 * (camelCase -- translated to the API's snake_case body here so callers
 * never have to think about the wire format, matching admin-store.js's
 * updateReferenceEntry convention). */
export function createProject(payload) {
  return apiCreateProject({
    name: payload.name,
    customer: payload.customer,
    customer_ref: payload.customerRef || null,
    owner_user_id: payload.ownerUserId,
    site: payload.site || '',
    description: payload.description || '',
    status: payload.status || 'Draft',
    start_date: payload.startDate || null,
    target_date: payload.targetDate || null,
  });
}

/** patch: any subset of createProject's payload keys. */
export function updateProject(backendId, patch) {
  const body = {};
  if ('name' in patch) body.name = patch.name;
  if ('customer' in patch) body.customer = patch.customer;
  if ('customerRef' in patch) body.customer_ref = patch.customerRef || null;
  if ('ownerUserId' in patch) body.owner_user_id = patch.ownerUserId;
  if ('site' in patch) body.site = patch.site;
  if ('description' in patch) body.description = patch.description;
  if ('status' in patch) body.status = patch.status;
  if ('startDate' in patch) body.start_date = patch.startDate || null;
  if ('targetDate' in patch) body.target_date = patch.targetDate || null;
  return apiUpdateProject(backendId, body);
}

export function deleteProject(backendId) {
  return apiDeleteProject(backendId);
}

/** Engineers eligible to be assigned as a project's owner (Launch Manager
 * / System Administrator only -- see the API route's docstring). Lazily
 * loaded the same on-demand way ADMIN_USERS is (ensureXLoaded() pattern in
 * pages/projects.js / pages/admin.js), since only the project form and
 * Admin's assignment page ever need this list. */
export function loadAssignableEngineers() {
  assignableEngineersStatus.loading = true;
  assignableEngineersStatus.error = null;
  return listAssignableEngineers()
    .then(engineers => {
      replaceArrayContents(ASSIGNABLE_ENGINEERS, engineers.map(engineer => ({ id: engineer.id, fullName: engineer.full_name })));
      assignableEngineersStatus.loaded = true;
    })
    .catch(error => {
      assignableEngineersStatus.error = error.message || 'Could not load Launch Engineers.';
    })
    .finally(() => {
      assignableEngineersStatus.loading = false;
    });
}

// ---- project assignments (Admin > Project Assignments) --------------------
// Replaces the old ADMIN_ASSIGNMENTS mock (data/mock-data.js), which
// pages/admin.js documented as "not persisted server-side, resets on
// reload" -- this is now real, via /project-assignments.

function mapAssignment(apiAssignment) {
  return {
    id: apiAssignment.id,
    projectId: apiAssignment.project_code,
    projectBackendId: apiAssignment.project_id,
    projectName: apiAssignment.project_name,
    userId: apiAssignment.user_id,
    userFullName: apiAssignment.user_full_name,
    userEmail: apiAssignment.user_email,
    role: apiAssignment.role,
    roleLabel: apiAssignment.role === 'manager' ? 'Responsible Manager' : 'Responsible Engineer',
  };
}

export function loadProjectAssignments() {
  projectAssignmentsStatus.loading = true;
  projectAssignmentsStatus.error = null;
  return listProjectAssignments()
    .then(assignments => {
      replaceArrayContents(PROJECT_ASSIGNMENTS, assignments.map(mapAssignment));
      projectAssignmentsStatus.loaded = true;
    })
    .catch(error => {
      projectAssignmentsStatus.error = error.message || 'Could not load project assignments.';
    })
    .finally(() => {
      projectAssignmentsStatus.loading = false;
    });
}

/** role: 'engineer' | 'manager' */
export function createProjectAssignment(projectBackendId, userId, role) {
  return apiCreateProjectAssignment({ project_id: projectBackendId, user_id: userId, role });
}

export function deleteProjectAssignment(assignmentId) {
  return apiDeleteProjectAssignment(assignmentId);
}
