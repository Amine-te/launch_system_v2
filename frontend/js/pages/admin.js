/* ==========================================================================
   admin.js
   ========================================================================== */

import { openModal } from '../components/modal.js';
import { ROLE_PERSONA } from '../components/nav-config.js';
import { navigate } from '../components/nav-render.js';
import {
  ADMIN_LOGIN_EVENTS, ADMIN_REFERENCE_LISTS, ADMIN_USERS, LABEL_TO_BACKEND_ROLE,
  adminLoginEventsStatus, adminReferenceListsStatus, adminUsersStatus,
  createReferenceEntry, createUser, deactivateUser, deleteReferenceEntry,
  loadAdminLoginEvents, loadAdminUsers, loadReferenceEntries,
  reactivateUser, unlockUser, updateReferenceEntry, updateUserIdentity, updateUserRole,
} from '../data/admin-store.js';
import { ADMIN_ACTIVITY, ADMIN_ASSIGNMENTS, AUDIT_LOGS, PROJECTS } from '../data/mock-data.js';
import { poEsc } from './po-intake.js';
import { renderPage } from './router.js';
import { state } from '../state.js';
import { statusBadge } from '../utils/helpers.js';
import { icon } from '../utils/icons.js';
import { adminAssignmentDraft, adminLoginFilters, adminUserFilters } from '../utils/table-state.js';

export const ADMIN_ROLE_OPTIONS = ['Plant Manager','Launch Manager','Launch Engineer','Warehouse Team Leader','Warehouse Personnel','Production & Packing Coordinator','System Administrator'];

export const ADMIN_ROLE_DEFINITIONS = {
      'System Administrator':{ scope:'Administration only', permissions:['User accounts','Project assignments','Reference lists','Login audit'] },
      'Plant Manager':{ scope:'All projects · read only', permissions:['Plant dashboard','PO status','Delivery records','Audit documents'] },
      'Launch Manager':{ scope:'All projects; write assigned', permissions:['Projects and POs','Simulation','Deliveries','Finance'] },
      'Launch Engineer':{ scope:'Assigned projects only', permissions:['Projects and POs','BOM','Simulation','Delivery instructions'] },
      'Warehouse Team Leader':{ scope:'Warehouse delivery control', permissions:['Delivery code','Receiver selection','Delivery PDF','Signed PDF upload'] },
      'Warehouse Personnel':{ scope:'Stock reception only', permissions:['Receive materials','View own receptions'] },
      'Production & Packing Coordinator':{ scope:'Production and packaging queue', permissions:['View production','Mark production Done','Mark PO Packaged'] },
    };

export function adminNow() { return new Date().toISOString().slice(0,16).replace('T',' '); }

export function adminInitials(name) { return String(name || '').split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]).join('').toUpperCase(); }

// Backend ids are numbers; anything coming out of an onclick="..." HTML
// attribute is a string -- compare loosely so both work.
export function adminUserById(id) { return ADMIN_USERS.find(user => String(user.id) === String(id)); }

export function adminIsLaunchRole(role) { return ['Launch Engineer','Launch Manager'].includes(role); }

export function adminAudit(title,detail) {
      const time = adminNow();
      ADMIN_ACTIVITY.unshift({ title,detail,time });
      AUDIT_LOGS.unshift({ id:`AUD-${15000 + AUDIT_LOGS.length}`,date:time,user:ROLE_PERSONA.admin.name,module:'Administration',action:title,entity:'System administration',project:'—',po:'—',evidence:'Administrator audit record',details:detail });
    }

export function adminShortName(fullName) { const parts=String(fullName).trim().split(/\s+/); return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : parts[0]; }

// No `status` field on create -- the backend always creates an account
// Active (SRS M00-AC-01), so there's nothing for the form to send there;
// deactivating is a separate, explicit action (adminToggleUserStatus)
// once the account exists. No `username`/`phone`/`location`/`auth`
// fields either -- the User model backing this only has email, full
// name, and role, so a form field with nowhere real to persist it is
// exactly the kind of placeholder this was cleaned up to remove.
export function adminDefaultUserDraft() { return { fullName:'',email:'',role:'Launch Engineer',password:'' }; }

// ---- one-time-load helpers -------------------------------------------
// Render functions can't `await` (renderPage() needs the HTML back
// synchronously), so the pattern here is: kick off the fetch if it hasn't
// started, return the current status, and let the caller render a loading
///error skeleton until status.loaded flips true -- the fetch's own
// .then(renderPage) re-renders with real data once it lands.

export function ensureAdminUsersLoaded() {
      if (!adminUsersStatus.loaded && !adminUsersStatus.loading) loadAdminUsers().then(renderPage);
      return adminUsersStatus;
    }

export function ensureAdminLoginEventsLoaded() {
      if (!adminLoginEventsStatus.loaded && !adminLoginEventsStatus.loading) loadAdminLoginEvents().then(renderPage);
      return adminLoginEventsStatus;
    }

export function adminLoadingHtml(title,status) {
      if (status.loading || (!status.loaded && !status.error)) return `<div class="admin-shell"><div class="admin-head"><h2>${title}</h2></div><div class="empty-state" style="padding:40px;"><div class="e-title">Loading…</div></div></div>`;
      return `<div class="admin-shell"><div class="admin-head"><h2>${title}</h2></div><div class="empty-state" style="padding:40px;"><div class="e-title">Could not load this data</div><p>${poEsc(status.error)}</p><button class="btn" onclick="renderPage()">Retry</button></div></div>`;
    }

export function adminOpenUserForm(mode,id='') {
      const user = adminUserById(id);
      state.adminUserForm = { open:true,mode,editingId:user?.id ?? '',saving:false,errors:{},draft:user ? { fullName:user.fullName,email:user.email,role:user.role,password:'' } : adminDefaultUserDraft() };
      if (state.currentPage !== 'admin-users') navigate('admin-users'); else renderPage();
    }

export function adminCloseUserForm() { state.adminUserForm = { open:false,mode:'create',editingId:'',saving:false,draft:{},errors:{} }; renderPage(); }

export function adminSetUserDraft(key,value) { state.adminUserForm.draft[key]=value; delete state.adminUserForm.errors[key]; delete state.adminUserForm.errors._form; }

export async function adminSaveUser() {
      const draft=state.adminUserForm.draft, errors={};
      if (!draft.fullName?.trim()) errors.fullName='Full name is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email || '')) errors.email='Enter a valid email address.';
      if (!ADMIN_ROLE_OPTIONS.includes(draft.role)) errors.role='Select one role.';
      if (state.adminUserForm.mode === 'create' && String(draft.password || '').length < 8) errors.password='Temporary password must contain at least 8 characters.';
      state.adminUserForm.errors=errors;
      if (Object.keys(errors).length) return renderPage();

      state.adminUserForm.saving=true; renderPage();

      try {
        if (state.adminUserForm.mode === 'edit') {
          const id=state.adminUserForm.editingId, existing=adminUserById(id);
          const oldRole=existing?.role, oldName=existing?.name;
          await updateUserIdentity(id,{ full_name:draft.fullName.trim(), email:draft.email.trim() });
          if (existing && draft.role !== oldRole) await updateUserRole(id,draft.role);
          await loadAdminUsers();
          const updated=adminUserById(id);
          if (updated) {
            if (!adminIsLaunchRole(updated.role)) {
              for (let index=ADMIN_ASSIGNMENTS.length-1; index>=0; index--) if (ADMIN_ASSIGNMENTS[index].user === oldName || ADMIN_ASSIGNMENTS[index].user === updated.name) ADMIN_ASSIGNMENTS.splice(index,1);
              updated.projects=[];
            } else if (oldName && oldName !== updated.name) {
              ADMIN_ASSIGNMENTS.forEach(assignment => { if (assignment.user === oldName) { assignment.user=updated.name; assignment.role=updated.role === 'Launch Manager' ? 'Responsible Manager' : 'Responsible Engineer'; } });
            }
          }
          adminAudit('User account updated',`${draft.fullName.trim()} updated${existing && draft.role !== oldRole ? `; role ${oldRole} to ${draft.role}` : ''}.`);
        } else {
          await createUser({ email:draft.email.trim(), password:draft.password, full_name:draft.fullName.trim(), role:LABEL_TO_BACKEND_ROLE[draft.role] });
          await loadAdminUsers();
          adminAudit('User account created',`${draft.fullName.trim()} created as ${draft.role}.`);
        }
        state.adminUserForm={ open:false,mode:'create',editingId:'',saving:false,draft:{},errors:{} };
      } catch (error) {
        state.adminUserForm.saving=false;
        state.adminUserForm.errors={ _form: error?.message || 'Could not save this account. Please try again.' };
      }
      renderPage();
    }

export async function adminToggleUserStatus(id) {
      const user=adminUserById(id); if (!user) return;
      try {
        if (user.status === 'Active') await deactivateUser(id); else await reactivateUser(id);
      } catch (error) {
        return openModal('Could not update account', error?.message || 'Please try again.');
      }
      await loadAdminUsers();
      const updated=adminUserById(id);
      adminAudit(updated?.status === 'Active' ? 'User account reactivated' : 'User account deactivated',`${updated?.fullName || user.fullName} is now ${(updated?.status || '').toLowerCase()}. Historical actions remain unchanged.`);
      renderPage();
    }

export async function adminUnlockUser(id) {
      const user=adminUserById(id); if (!user || !user.locked) return;
      try {
        await unlockUser(id);
      } catch (error) {
        return openModal('Could not unlock account', error?.message || 'Please try again.');
      }
      await loadAdminUsers();
      const updated=adminUserById(id);
      adminAudit('User account unlocked',`${updated?.fullName || user.fullName} unlocked after Administrator review.`);
      renderPage();
    }

export function adminSetUserFilter(key,value) { adminUserFilters[key]=value; renderPage(); }

export function adminFilteredUsers() {
      const search=adminUserFilters.search.toLowerCase();
      return ADMIN_USERS.filter(user => (!search || [user.fullName,user.email,user.role].some(value => String(value).toLowerCase().includes(search))) && (!adminUserFilters.role || user.role === adminUserFilters.role) && (!adminUserFilters.status || user.status === adminUserFilters.status) && (!adminUserFilters.security || (adminUserFilters.security === 'Locked' ? user.locked : !user.locked)));
    }

export function adminUserFormHtml() {
      if (!state.adminUserForm.open) return '';
      const draft=state.adminUserForm.draft, errors=state.adminUserForm.errors, saving=Boolean(state.adminUserForm.saving);
      const field=(key,label,input) => `<div class="admin-field"><label>${label}</label>${input}${errors[key] ? `<span class="admin-field-error">${errors[key]}</span>` : ''}</div>`;
      return `<div class="card admin-user-form"><div class="admin-form-head"><h3>${state.adminUserForm.mode === 'create' ? 'Create User Account' : 'Edit User Account'}</h3><button class="btn sm" onclick="adminCloseUserForm()">${icon('close','')} Close</button></div><div class="admin-form-body">${errors._form ? `<div class="admin-field-error" style="margin-bottom:12px;">${poEsc(errors._form)}</div>` : ''}<div class="admin-form-grid">
        ${field('fullName','Full Name',`<input value="${poEsc(draft.fullName)}" oninput="adminSetUserDraft('fullName',this.value)" placeholder="Full legal name" ${saving ? 'disabled' : ''}>`)}
        ${field('email','Email',`<input type="email" value="${poEsc(draft.email)}" oninput="adminSetUserDraft('email',this.value)" placeholder="name@company.com" ${saving ? 'disabled' : ''}>`)}
        ${field('role','Single Role Assignment',`<select onchange="adminSetUserDraft('role',this.value)" ${saving ? 'disabled' : ''}>${ADMIN_ROLE_OPTIONS.map(role => `<option value="${role}" ${draft.role === role ? 'selected' : ''}>${role}</option>`).join('')}</select>`)}
        ${state.adminUserForm.mode === 'create' ? field('password','Temporary Password',`<input type="password" value="${poEsc(draft.password)}" oninput="adminSetUserDraft('password',this.value)" placeholder="Minimum 8 characters" ${saving ? 'disabled' : ''}>`) : ''}
      </div><div class="admin-form-actions"><button class="btn" onclick="adminCloseUserForm()" ${saving ? 'disabled' : ''}>Cancel</button><button class="btn primary" onclick="adminSaveUser()" ${saving ? 'disabled' : ''}>${icon('check','')} ${saving ? 'Saving…' : (state.adminUserForm.mode === 'create' ? 'Create Account' : 'Save Changes')}</button></div></div></div>`;
    }

export function pageAdminUsers() {
      const status=ensureAdminUsersLoaded();
      if (!status.loaded) return adminLoadingHtml('User Accounts',status);
      const users=adminFilteredUsers(), active=ADMIN_USERS.filter(user => user.status === 'Active').length, inactive=ADMIN_USERS.length-active, locked=ADMIN_USERS.filter(user => user.locked).length;
      return `<div class="admin-shell"><div class="admin-head"><h2>User Accounts</h2><div class="admin-head-actions"><button class="btn primary" onclick="adminOpenUserForm('create')">${icon('plus','')} Create User</button></div></div>
      ${adminUserFormHtml()}
      <div class="admin-kpis"><div class="admin-kpi"><div class="admin-kpi-label">Total Accounts</div><div class="admin-kpi-value">${ADMIN_USERS.length}</div></div><div class="admin-kpi"><div class="admin-kpi-label">Active</div><div class="admin-kpi-value">${active}</div></div><div class="admin-kpi"><div class="admin-kpi-label">Inactive</div><div class="admin-kpi-value">${inactive}</div></div><div class="admin-kpi"><div class="admin-kpi-label">Locked</div><div class="admin-kpi-value" style="color:${locked ? 'var(--danger)' : '#000'};">${locked}</div></div></div>
      <div class="card admin-card" style="padding:0;overflow:hidden;"><div class="admin-toolbar"><div class="admin-search">${icon('search','')}<input value="${poEsc(adminUserFilters.search)}" oninput="adminSetUserFilter('search',this.value)" placeholder="Search name or email"></div><select class="admin-filter" onchange="adminSetUserFilter('role',this.value)"><option value="">All roles</option>${ADMIN_ROLE_OPTIONS.map(role => `<option value="${role}" ${adminUserFilters.role === role ? 'selected' : ''}>${role}</option>`).join('')}</select><select class="admin-filter" onchange="adminSetUserFilter('status',this.value)"><option value="">All statuses</option><option ${adminUserFilters.status === 'Active' ? 'selected' : ''}>Active</option><option ${adminUserFilters.status === 'Inactive' ? 'selected' : ''}>Inactive</option></select><select class="admin-filter" onchange="adminSetUserFilter('security',this.value)"><option value="">All security states</option><option ${adminUserFilters.security === 'Unlocked' ? 'selected' : ''}>Unlocked</option><option ${adminUserFilters.security === 'Locked' ? 'selected' : ''}>Locked</option></select><span class="admin-sub">${users.length} account${users.length === 1 ? '' : 's'}</span></div>
      <div class="table-scroll"><table><thead><tr><th>User</th><th>Role</th><th>Account</th><th>Security</th><th>Project Access</th><th>Last Login</th><th style="text-align:right;">Actions</th></tr></thead><tbody>${users.length ? users.map(user => `<tr><td><div class="admin-user-cell"><span class="admin-avatar">${adminInitials(user.fullName)}</span><div><strong>${user.fullName}</strong><span>${user.email}</span></div></div></td><td>${user.role}</td><td>${statusBadge(user.status,user.status === 'Active' ? 'success' : 'neutral')}</td><td><div class="admin-security-state"><span class="admin-security-dot ${user.locked ? 'locked' : ''}"></span>${user.locked ? `Locked · ${user.failedAttempts}/5 attempts` : 'Unlocked'}</div></td><td><div class="admin-project-tags">${user.projects.length ? user.projects.map(project => `<span class="admin-project-tag">${project}</span>`).join('') : '<span class="admin-sub">No project assignment</span>'}</div></td><td class="mono">${user.lastLogin}</td><td><div class="admin-row-actions"><button class="btn sm" onclick="openAdminUser('${user.id}')">View</button><button class="btn sm" onclick="adminOpenUserForm('edit','${user.id}')">Edit</button>${user.locked ? `<button class="btn sm" onclick="adminUnlockUser('${user.id}')">Unlock</button>` : ''}<button class="btn sm" onclick="adminToggleUserStatus('${user.id}')">${user.status === 'Active' ? 'Deactivate' : 'Reactivate'}</button></div></td></tr>`).join('') : `<tr><td colspan="7"><div class="empty-state" style="padding:28px;"><div class="e-title">No matching accounts</div></div></td></tr>`}</tbody></table></div></div></div>`;
    }

export function pageAdminUserDetails() {
      const usersStatus=ensureAdminUsersLoaded();
      if (!usersStatus.loaded) return adminLoadingHtml('Account Details',usersStatus);
      const eventsStatus=ensureAdminLoginEventsLoaded();
      if (!eventsStatus.loaded) return adminLoadingHtml('Account Details',eventsStatus);
      const user=adminUserById(state.adminSelectedUserId) || ADMIN_USERS[0];
      if (!user) return `<div class="admin-shell"><div class="admin-head"><h2>Account Details</h2></div><div class="empty-state" style="padding:40px;"><div class="e-title">No user accounts yet</div><button class="btn sm" onclick="navigate('admin-users')">Back to Users</button></div></div>`;
      const definition=ADMIN_ROLE_DEFINITIONS[user.role] || {scope:'Role-scoped access',permissions:[]};
      const loginEvents=ADMIN_LOGIN_EVENTS.filter(event => event.username === user.email).slice(0,8);
      return `<div class="admin-shell"><div class="admin-head"><div><button class="btn sm" onclick="navigate('admin-users')" style="margin-bottom:10px;">${icon('chevLeft','')} Users</button><h2>${user.fullName}</h2><p class="mono">${user.email} · ${user.id}</p></div><div class="admin-head-actions">${user.locked ? `<button class="btn" onclick="adminUnlockUser('${user.id}')">${icon('check','')} Unlock</button>` : ''}<button class="btn" onclick="adminToggleUserStatus('${user.id}')">${user.status === 'Active' ? 'Deactivate' : 'Reactivate'}</button><button class="btn primary" onclick="adminOpenUserForm('edit','${user.id}')">${icon('edit','')} Edit Account</button></div></div>
      <div class="admin-user-overview"><div class="card admin-card"><div class="admin-card-head"><h3>Account Information</h3><div style="display:flex;gap:7px;">${statusBadge(user.status,user.status === 'Active' ? 'success' : 'neutral')}${user.locked ? statusBadge('Locked','danger') : statusBadge('Unlocked','success')}</div></div><div class="admin-detail-grid"><div class="admin-detail-item"><span>Full Name</span><strong>${user.fullName}</strong></div><div class="admin-detail-item"><span>Email</span><strong class="mono">${user.email}</strong></div><div class="admin-detail-item"><span>Authentication</span><strong>Username and password</strong></div><div class="admin-detail-item"><span>Failed Attempts</span><strong>${user.failedAttempts}/5</strong></div><div class="admin-detail-item"><span>Last Login</span><strong class="mono">${user.lastLogin}</strong></div></div></div>
      <div class="card admin-card"><div class="admin-card-head"><h3>Role & Access</h3>${statusBadge(user.role,'info')}</div><div class="admin-access-list"><div class="admin-access-row"><span>Access scope</span><strong>${definition.scope}</strong></div>${definition.permissions.map(permission => `<div class="admin-access-row"><span>${permission}</span>${statusBadge('Allowed','success')}</div>`).join('')}</div>${adminIsLaunchRole(user.role) ? `<div class="admin-card-head" style="margin:20px 0 10px;"><h3>Assigned Projects</h3><button class="btn sm" onclick="navigate('admin-project-assignments')">Manage</button></div><div class="admin-project-tags">${user.projects.length ? user.projects.map(project => `<span class="admin-project-tag">${project}</span>`).join('') : '<span class="admin-sub">No project access assigned</span>'}</div>` : ''}</div></div>
      <div class="card admin-card"><div class="admin-card-head"><h3>Login History</h3><button class="btn sm" onclick="navigate('admin-system-activity')">Full Login Audit</button></div><div class="table-scroll"><table><thead><tr><th>Timestamp</th><th>Result</th><th>Reason</th><th>Source</th></tr></thead><tbody>${loginEvents.length ? loginEvents.map(event => `<tr><td class="mono">${event.time}</td><td>${statusBadge(event.result,event.result === 'Successful' ? 'success' : 'danger')}</td><td>${event.reason}</td><td class="mono">${event.source}</td></tr>`).join('') : `<tr><td colspan="4"><span class="admin-sub">No login events recorded.</span></td></tr>`}</tbody></table></div></div></div>`;
    }

export function pageAdminRoles() {
      const status=ensureAdminUsersLoaded();
      if (!status.loaded) return adminLoadingHtml('Roles & Access',status);
      return `<div class="admin-shell"><div class="admin-head"><h2>Roles & Access</h2></div><div class="admin-role-grid">${ADMIN_ROLE_OPTIONS.map(role => { const definition=ADMIN_ROLE_DEFINITIONS[role],count=ADMIN_USERS.filter(user => user.role === role).length; return `<div class="admin-role-card"><div class="admin-role-card-head"><div><h3>${role}</h3><p>${definition.scope}</p></div>${statusBadge(`${count} user${count === 1 ? '' : 's'}`,'neutral')}</div><div class="admin-role-perms">${definition.permissions.map(permission => `<span class="admin-role-perm">${permission}</span>`).join('')}</div></div>`; }).join('')}</div></div>`;
    }

// ---- project assignments -----------------------------------------------
// Still local-only (mutates the ADMIN_ASSIGNMENTS mock from
// data/mock-data.js): the backend has no Project model or
// project-assignment table yet (that's SRS M01 / M00-FR-07..09), so
// there's no real endpoint to wire this to. The user list it reads from
// (ADMIN_USERS) is real; the assignment records themselves are not
// persisted server-side and will reset on a full page reload.

export function adminEligibleProjectUsers() { return ADMIN_USERS.filter(user => adminIsLaunchRole(user.role) && user.status === 'Active' && !user.locked); }

export function adminSetAssignmentDraft(key,value) { adminAssignmentDraft[key]=value; renderPage(); }

export function adminAssignProject() {
      const user=adminUserById(adminAssignmentDraft.userId), project=PROJECTS.find(item => item.name === adminAssignmentDraft.project);
      if (!user || !project || !adminIsLaunchRole(user.role) || user.status !== 'Active' || user.locked) return openModal('Assignment unavailable','Select an active, unlocked Launch Engineer or Launch Manager.');
      if (ADMIN_ASSIGNMENTS.some(item => item.user === user.name && item.project === project.name)) return openModal('Already assigned',`${user.fullName} already has access to ${project.name}.`);
      ADMIN_ASSIGNMENTS.push({ user:user.name,project:project.name,role:user.role === 'Launch Manager' ? 'Responsible Manager' : 'Responsible Engineer' });
      if (!user.projects.includes(project.name)) user.projects.push(project.name);
      adminAudit('Project access assigned',`${user.fullName} assigned to ${project.name} as ${user.role}.`); renderPage();
    }

export function adminUnassignProject(userName,projectName) {
      const user=ADMIN_USERS.find(item => item.name === userName), index=ADMIN_ASSIGNMENTS.findIndex(item => item.user === userName && item.project === projectName);
      if (index < 0) return; ADMIN_ASSIGNMENTS.splice(index,1);
      if (user) user.projects=user.projects.filter(project => project !== projectName);
      adminAudit('Project access removed',`${user?.fullName || userName} immediately lost access to ${projectName}; historical actions were retained.`); renderPage();
    }

export function pageAdminProjectAssignments() {
      const status=ensureAdminUsersLoaded();
      if (!status.loaded) return adminLoadingHtml('Project Assignments',status);
      const eligible=adminEligibleProjectUsers();
      if (!eligible.some(user => user.id === adminAssignmentDraft.userId)) adminAssignmentDraft.userId=eligible[0]?.id || '';
      return `<div class="admin-shell"><div class="admin-head"><h2>Project Assignments</h2></div><div class="admin-assignment-layout"><div class="card admin-card admin-assignment-form"><div class="admin-card-head"><h3>Assign Project Access</h3></div><div class="admin-field"><label>Project</label><select onchange="adminSetAssignmentDraft('project',this.value)">${PROJECTS.map(project => `<option value="${project.name}" ${adminAssignmentDraft.project === project.name ? 'selected' : ''}>${project.name}</option>`).join('')}</select></div><div class="admin-field" style="margin-top:16px;"><label>Responsible User</label><select onchange="adminSetAssignmentDraft('userId',this.value)">${eligible.map(user => `<option value="${user.id}" ${adminAssignmentDraft.userId === user.id ? 'selected' : ''}>${user.fullName} · ${user.role}</option>`).join('')}</select></div><button class="btn primary" style="width:100%;justify-content:center;margin-top:18px;" onclick="adminAssignProject()">${icon('plus','')} Assign Access</button></div><div class="admin-project-access">${PROJECTS.map(project => { const assignments=ADMIN_ASSIGNMENTS.filter(item => item.project === project.name && ADMIN_USERS.some(user => user.name === item.user && adminIsLaunchRole(user.role))); return `<div class="admin-project-access-card"><div class="admin-project-access-head"><strong>${project.name}</strong>${statusBadge(`${assignments.length} assigned`,assignments.length ? 'info' : 'warning')}</div><div class="admin-assignee-list">${assignments.length ? assignments.map(assignment => { const user=ADMIN_USERS.find(item => item.name === assignment.user); return `<div class="admin-assignee"><div><strong>${user?.fullName || assignment.user}</strong><span>${user?.role || assignment.role} · ${user?.email || 'unknown'}</span></div><button class="btn sm" onclick="adminUnassignProject('${assignment.user}','${project.name}')">Unassign</button></div>`; }).join('') : '<div class="admin-sub">No assigned user</div>'}</div></div>`; }).join('')}</div></div></div>`;
    }

// ---- reference lists (SRS M00-FR-14..16) ---------------------------------
// Backed by the real /reference-entries API now (see data/admin-store.js).

export function ensureAdminReferenceListsLoaded() {
      if (!adminReferenceListsStatus.loaded && !adminReferenceListsStatus.loading) loadReferenceEntries().then(renderPage);
      return adminReferenceListsStatus;
    }

export function adminSelectReferenceModule(key) { state.adminReferenceModule=key; state.adminReferenceForm={ open:false,mode:'create',editingId:'',saving:false,draft:{label:'',project:'',references:'',status:'Active'} }; renderPage(); }

export function adminOpenReferenceForm(mode,id='') { const list=ADMIN_REFERENCE_LISTS[state.adminReferenceModule],entry=list.entries.find(item => item.id === id); state.adminReferenceForm={ open:true,mode,editingId:entry?.id ?? '',saving:false,draft:entry ? {label:entry.label,project:entry.project || '',references:(entry.references || []).join(', '),status:entry.status} : {label:'',project:state.adminReferenceModule === 'fgpn' ? PROJECTS[0].name : '',references:'',status:'Active'} }; renderPage(); }

export function adminCloseReferenceForm() { state.adminReferenceForm={ open:false,mode:'create',editingId:'',saving:false,draft:{label:'',project:'',references:'',status:'Active'} }; renderPage(); }

export function adminSetReferenceDraft(key,value) { state.adminReferenceForm.draft[key]=value; }

export async function adminSaveReferenceEntry() {
      const list=ADMIN_REFERENCE_LISTS[state.adminReferenceModule],draft=state.adminReferenceForm.draft,label=String(draft.label || '').trim();
      const references=String(draft.references || '').split(',').map(value => value.trim()).filter(Boolean);
      if (!label) return openModal('Name required',`Enter the ${list.fields.toLowerCase()}.`);
      if (state.adminReferenceModule === 'fgpn' && !draft.project) return openModal('Project required','Select the project for this Finished Goods Part Number.');
      if (list.entries.some(entry => entry.label.toLowerCase() === label.toLowerCase() && entry.id !== state.adminReferenceForm.editingId)) return openModal('Duplicate entry',`${label} already exists in ${list.label}.`);

      state.adminReferenceForm.saving=true; renderPage();
      try {
        if (state.adminReferenceForm.mode === 'edit') {
          await updateReferenceEntry(state.adminReferenceForm.editingId,{ label,project:draft.project || '',references:state.adminReferenceModule === 'customers' ? references : undefined,status:draft.status });
          adminAudit('Reference entry updated',`${list.label}: ${label} updated.`);
        } else {
          await createReferenceEntry(state.adminReferenceModule,{ label,project:draft.project || '',references });
          adminAudit('Reference entry created',`${label} added to ${list.label}.`);
        }
        await loadReferenceEntries();
        state.adminReferenceForm={ open:false,mode:'create',editingId:'',saving:false,draft:{label:'',project:'',references:'',status:'Active'} };
      } catch (error) {
        state.adminReferenceForm.saving=false;
        openModal('Could not save this entry', error?.message || 'Please try again.');
      }
      renderPage();
    }

export async function adminToggleReferenceEntry(id) {
      const list=ADMIN_REFERENCE_LISTS[state.adminReferenceModule],entry=list.entries.find(item => item.id === id);
      if (!entry) return;
      const nextStatus=entry.status === 'Active' ? 'Inactive' : 'Active';
      try {
        await updateReferenceEntry(id,{ status:nextStatus });
      } catch (error) {
        return openModal('Could not update this entry', error?.message || 'Please try again.');
      }
      await loadReferenceEntries();
      adminAudit(`Reference entry ${nextStatus === 'Active' ? 'reactivated' : 'deactivated'}`,`${entry.label} in ${list.label}.`);
      renderPage();
    }

export function adminDeleteReferenceEntry(id) {
      const list=ADMIN_REFERENCE_LISTS[state.adminReferenceModule],entry=list.entries.find(item => item.id === id);
      if (!entry) return;
      openModal(`Delete ${entry.label}?`,`This will permanently remove it from ${list.label}. This cannot be undone.`, async () => {
        try {
          await deleteReferenceEntry(id);
        } catch (error) {
          return openModal('Could not delete this entry', error?.message || 'It may be linked to existing records -- deactivate it instead to preserve historical references.');
        }
        await loadReferenceEntries();
        adminAudit('Reference entry deleted',`${entry.label} removed from ${list.label}.`);
        renderPage();
      },'Delete');
    }

export function pageAdminReferenceData() {
      const status=ensureAdminReferenceListsLoaded();
      if (!status.loaded) return adminLoadingHtml('Reference Lists',status);
      const list=ADMIN_REFERENCE_LISTS[state.adminReferenceModule] || ADMIN_REFERENCE_LISTS.customers;
      const saving=Boolean(state.adminReferenceForm.saving);
      return `<div class="admin-shell"><div class="admin-head"><h2>Reference Lists</h2><div class="admin-head-actions"><button class="btn primary" onclick="adminOpenReferenceForm('create')">${icon('plus','')} Add Entry</button></div></div><div class="admin-ref-layout"><div class="card admin-ref-nav">${Object.entries(ADMIN_REFERENCE_LISTS).map(([key,value]) => `<button class="admin-ref-link ${state.adminReferenceModule === key ? 'active' : ''}" onclick="adminSelectReferenceModule('${key}')"><span>${value.label}</span><span>${value.entries.length}</span></button>`).join('')}</div><div><div class="card admin-card" style="padding:0;overflow:hidden;">${state.adminReferenceForm.open ? `<div class="admin-form-head"><h3>${state.adminReferenceForm.mode === 'create' ? 'Add' : 'Edit'} ${list.label} Entry</h3><button class="btn sm" onclick="adminCloseReferenceForm()" ${saving ? 'disabled' : ''}>Close</button></div><div class="admin-form-body"><div class="admin-form-grid"><div class="admin-field"><label>${list.fields}</label><input value="${poEsc(state.adminReferenceForm.draft.label)}" oninput="adminSetReferenceDraft('label',this.value)" ${saving ? 'disabled' : ''}></div>${state.adminReferenceModule === 'customers' ? `<div class="admin-field"><label>Customer References</label><input value="${poEsc(state.adminReferenceForm.draft.references)}" oninput="adminSetReferenceDraft('references',this.value)" placeholder="Comma-separated references" ${saving ? 'disabled' : ''}></div>` : ''}${state.adminReferenceModule === 'fgpn' ? `<div class="admin-field"><label>Project</label><select onchange="adminSetReferenceDraft('project',this.value)" ${saving ? 'disabled' : ''}>${PROJECTS.map(project => `<option value="${project.name}" ${state.adminReferenceForm.draft.project === project.name ? 'selected' : ''}>${project.name}</option>`).join('')}</select></div>` : ''}<div class="admin-field"><label>Status</label><select onchange="adminSetReferenceDraft('status',this.value)" ${saving ? 'disabled' : ''}><option ${state.adminReferenceForm.draft.status === 'Active' ? 'selected' : ''}>Active</option><option ${state.adminReferenceForm.draft.status === 'Inactive' ? 'selected' : ''}>Inactive</option></select></div></div><div class="admin-form-actions"><button class="btn" onclick="adminCloseReferenceForm()" ${saving ? 'disabled' : ''}>Cancel</button><button class="btn primary" onclick="adminSaveReferenceEntry()" ${saving ? 'disabled' : ''}>${saving ? 'Saving…' : 'Save Entry'}</button></div></div>` : `<div class="admin-card-head" style="padding:20px 22px;margin:0;"><div><h3>${list.label}</h3><span>${list.entries.filter(entry => entry.status === 'Active').length} active · ${list.entries.filter(entry => entry.status === 'Inactive').length} inactive</span></div><button class="btn sm primary" onclick="adminOpenReferenceForm('create')">${icon('plus','')} Add</button></div>`}<div class="table-scroll"><table><thead><tr><th>ID</th><th>Name</th>${state.adminReferenceModule === 'customers' ? '<th>References</th>' : ''}${state.adminReferenceModule === 'fgpn' ? '<th>Project</th>' : ''}<th>Status</th><th style="text-align:right;">Actions</th></tr></thead><tbody>${list.entries.length ? list.entries.map(entry => `<tr><td class="mono">${entry.id}</td><td><strong style="color:#000;font-weight:600;">${entry.label}</strong></td>${state.adminReferenceModule === 'customers' ? `<td>${(entry.references || []).join(', ') || '—'}</td>` : ''}${state.adminReferenceModule === 'fgpn' ? `<td>${entry.project}</td>` : ''}<td>${statusBadge(entry.status,entry.status === 'Active' ? 'success' : 'neutral')}</td><td><div class="admin-row-actions"><button class="btn sm" onclick="adminOpenReferenceForm('edit','${entry.id}')">Edit</button><button class="btn sm" onclick="adminToggleReferenceEntry('${entry.id}')">${entry.status === 'Active' ? 'Deactivate' : 'Reactivate'}</button><button class="btn sm" onclick="adminDeleteReferenceEntry('${entry.id}')">Delete</button></div></td></tr>`).join('') : `<tr><td colspan="5"><div class="empty-state" style="padding:28px;"><div class="e-title">No entries yet</div></div></td></tr>`}</tbody></table></div></div></div></div></div>`;
    }

export function adminSetLoginFilter(key,value) { adminLoginFilters[key]=value; renderPage(); }

export function adminFilteredLoginEvents() {
      const search=adminLoginFilters.search.toLowerCase();
      return ADMIN_LOGIN_EVENTS.filter(event => (!search || [event.username,event.reason,event.source,event.time].some(value => String(value).toLowerCase().includes(search))) && (!adminLoginFilters.result || event.result === adminLoginFilters.result));
    }

export function pageAdminSystemActivity() {
      const eventsStatus=ensureAdminLoginEventsLoaded();
      if (!eventsStatus.loaded) return adminLoadingHtml('Login Audit',eventsStatus);
      const usersStatus=ensureAdminUsersLoaded();
      if (!usersStatus.loaded) return adminLoadingHtml('Login Audit',usersStatus);
      const events=adminFilteredLoginEvents();
      const successful=ADMIN_LOGIN_EVENTS.filter(event => event.result === 'Successful').length;
      const failed=ADMIN_LOGIN_EVENTS.filter(event => event.result === 'Failed').length;
      const locked=ADMIN_USERS.filter(user => user.locked).length;
      return `<div class="admin-shell"><div class="admin-head"><h2>Login Audit</h2></div>
      <div class="admin-login-summary"><div class="admin-login-metric"><span>Successful Events</span><strong>${successful}</strong></div><div class="admin-login-metric"><span>Failed Events</span><strong style="color:${failed ? 'var(--danger)' : '#000'};">${failed}</strong></div><div class="admin-login-metric"><span>Locked Accounts</span><strong style="color:${locked ? 'var(--danger)' : '#000'};">${locked}</strong></div></div>
      <div class="card admin-card" style="padding:0;overflow:hidden;"><div class="admin-toolbar"><div class="admin-search">${icon('search','')}<input value="${poEsc(adminLoginFilters.search)}" oninput="adminSetLoginFilter('search',this.value)" placeholder="Search username, reason or source"></div><select class="admin-filter" onchange="adminSetLoginFilter('result',this.value)"><option value="">All results</option><option value="Successful" ${adminLoginFilters.result === 'Successful' ? 'selected' : ''}>Successful</option><option value="Failed" ${adminLoginFilters.result === 'Failed' ? 'selected' : ''}>Failed</option></select><span class="admin-sub">${events.length} event${events.length === 1 ? '' : 's'}</span></div><div class="table-scroll"><table><thead><tr><th>Timestamp</th><th>Username</th><th>Result</th><th>Reason</th><th>Source</th></tr></thead><tbody>${events.length ? events.map(event => `<tr><td class="mono">${event.time}</td><td><strong style="color:#000;font-weight:650;">${event.username}</strong></td><td>${statusBadge(event.result,event.result === 'Successful' ? 'success' : 'danger')}</td><td>${event.reason}</td><td class="mono">${event.source}</td></tr>`).join('') : '<tr><td colspan="5"><div class="empty-state" style="padding:28px;"><div class="e-title">No matching login events</div></div></td></tr>'}</tbody></table></div></div></div>`;
    }
