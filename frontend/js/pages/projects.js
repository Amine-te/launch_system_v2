/* ==========================================================================
   projects.js
   ========================================================================== */

import { openModal } from '../components/modal.js';
import { ROLE_PERSONA, explorerOpen } from '../components/nav-config.js';
import { navigate, navigateBack } from '../components/nav-render.js';
import { assignedProjectNames, bomCoverageHtml, bomImportCell, bomImportExampleRows, bomImportLevelLabel, bomImportStats, bomReadinessForPns, canWriteProject, ensureBomImport, latestBomImportRecord, pnsForPo, pnsForProject, poBomReadiness, posForProject, projectBomReadiness, projectForContext, uniqueValues, visibleProjects } from '../components/shared-tables.js';
import { ADMIN_REFERENCE_LISTS, ADMIN_USERS } from '../data/admin-store.js';
import { ADMIN_ASSIGNMENTS, AUDIT_LOGS, BOM_VERSION_HISTORY, CUST_DELIVERIES, MATERIALS, MFG_DELIVERIES, PNS, POS, PO_STATUS_FLOW, PROJECTS, PROJECT_BOM_META, SEARCH_INDEX } from '../data/mock-data.js';
import { custEffectiveStatus, custTable } from './customer-delivery.js';
import { mfgEligibleOrders, mfgTable } from './manufacturing-delivery.js';
import { getThreshold, materialStockState, materialTransitQuantity } from './materials-stock.js';
import { poEsc } from './po-intake.js';
import { FGPN_MASTER_MAP, auditContextEvents, customerEligibleOrders, poLifecycle, poStatusEvents, productionStatusType, projectSelectedPo, traceabilityWorkspace } from './purchase-orders.js';
import { renderPage } from './router.js';
import { state } from '../state.js';
import { financeMoney, healthRing, statusBadge } from '../utils/helpers.js';
import { icon } from '../utils/icons.js';
import { can, permBtn, permIconBtn } from '../utils/permissions.js';
import { emptyStateBlock, filterChips, inlineJsValue, paginationBar, rowCountLabel, sortRows, sortTh, tableExportActions } from '../utils/table-helpers.js';
import { PAGE_SIZE, projectSort } from '../utils/table-state.js';

export function projectExplorer(highlightType, highlightId) {
      const project = projectForContext();
      const projectPos = posForProject(project.name);
      return `<div class="explorer-panel">
    <div class="explorer-title">Project Explorer</div>
    <div class="explorer-tree">
      <div class="exp-row ${highlightType === 'project' ? 'active' : ''}" onclick="openProject('${project.id}')">
        ${icon('FolderOpen', 'exp-ic')}<span>${project.name}</span>
      </div>
      <div class="exp-children open">
        ${projectPos.map(po => {
        const isOpen = explorerOpen[po.id] ?? false;
        const poPns = pnsForPo(po.id);
        const poReady = poBomReadiness(po.id);
        return `
          <div class="exp-row" onclick="toggleExplorer('${po.id}')">
            <svg class="exp-chev ${isOpen ? 'open' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M9 6l6 6-6 6"/></svg>
            ${icon('FileText', 'exp-ic')}
            <span onclick="event.stopPropagation(); openPo('${po.id}')" style="${highlightType === 'po' && highlightId === po.id ? 'font-weight:700; color:var(--primary-dark);' : ''}">${po.id}</span>
            <span class="exp-status" style="color:${poReady.ready ? 'var(--success)' : 'var(--warning)'}" title="${poReady.ready ? 'PO BOM ready' : poReady.missing.length + ' PN BOM missing'}">${poReady.ready ? '✔' : '⚠'}</span>
          </div>
          <div class="exp-children ${isOpen ? 'open' : ''}">
            ${poPns.map(pn => {
          const isActive = highlightType === 'pn' && highlightId === pn.pn;
          const mark = pn.bom === 'Uploaded' ? '✔' : '⚠';
          const markColor = pn.bom === 'Uploaded' ? 'var(--success)' : 'var(--warning)';
          return `<div class="exp-row ${isActive ? 'active' : ''}" onclick="openPn('${pn.pn}')">
                ${icon('Package', 'exp-ic')}<span>${pn.pn}</span>
                <span class="exp-status" style="color:${markColor}" title="${pn.bom === 'Uploaded' ? pn.bomFile : 'Required PN BOM missing'}">${mark}</span>
              </div>`;
        }).join('')}
          </div>`;
      }).join('')}
      </div>
    </div>
  </div>`;
    }

export function projectActorShortName() {
      return state.currentRole === 'engineer' ? 'A. Rahal' : state.currentRole === 'manager' ? 'S. Ait Oubou' : ROLE_PERSONA[state.currentRole]?.name || '';
    }

export function nextProjectId() {
      const highest = Math.max(0, ...PROJECTS.map(project => Number(String(project.id).replace(/\D/g, '')) || 0));
      return `PRJ-${String(highest + 1).padStart(3, '0')}`;
    }

export function projectStatusType(status) {
      return status === 'On Track' ? 'success' : status === 'At Risk' ? 'warning' : status === 'Blocked' ? 'danger' : 'neutral';
    }

export function projectHtmlValue(value) {
      return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

export function projectCustomerReference(customer) {
      const entry = ADMIN_REFERENCE_LISTS.customers.entries.find(item => item.label === customer);
      return Array.isArray(entry?.references) ? entry.references.join(', ') : '';
    }

export function setProjectFormCustomer(customer) {
      state.projectForm.draft.customer = customer;
      state.projectForm.draft.customerRef = projectCustomerReference(customer);
    }

export function openProjectForm(mode, projectId) {
      const isEdit = mode === 'edit';
      const project = isEdit ? PROJECTS.find(item => item.id === projectId || item.name === projectId) : null;
      if (!isEdit && can('newProject') !== true) {
        openModal('Project creation not permitted', 'Only Launch Engineers and Launch Managers can create projects.');
        return;
      }
      if (isEdit && (!project || !canWriteProject(project))) {
        openModal('Project editing not permitted', 'You can edit only projects assigned to you.');
        return;
      }
      const defaultEngineer = state.currentRole === 'engineer' ? 'A. Rahal' : 'A. Haddad';
      state.projectForm = {
        mode: isEdit ? 'edit' : 'create',
        projectId: project?.id || '',
        errors: {},
        draft: project ? {
          id: project.id,
          name: project.name,
          customer: project.customer,
          customerRef: project.customerRef || projectCustomerReference(project.customer),
          engineer: project.engineer || defaultEngineer,
          site: project.site || '',
          status: project.status || 'Draft',
          startDate: project.startDate || '',
          targetDate: project.targetDate || '',
          description: project.description || '',
        } : {
          id: nextProjectId(),
          name: '',
          customer: '',
          customerRef: '',
          engineer: defaultEngineer,
          site: '',
          status: 'Draft',
          startDate: '',
          targetDate: '',
          description: '',
        },
      };
      navigate('project-form');
    }

export function cancelProjectForm() {
      navigateBack('project-list');
    }

export function validateProjectForm() {
      const draft = state.projectForm.draft;
      const errors = {};
      ['name', 'customer', 'engineer'].forEach(key => {
        if (!String(draft[key] || '').trim()) errors[key] = 'This field is required.';
      });
      const duplicate = PROJECTS.find(project => project.id !== state.projectForm.projectId && project.name.trim().toLowerCase() === String(draft.name || '').trim().toLowerCase());
      if (duplicate) errors.name = 'A project with this name already exists.';
      state.projectForm.errors = errors;
      return Object.keys(errors).length === 0;
    }

export function saveProjectForm() {
      if (!validateProjectForm()) {
        renderPage();
        const firstInvalid = document.querySelector('.project-input.invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      const draft = Object.fromEntries(Object.entries(state.projectForm.draft).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
      const isEdit = state.projectForm.mode === 'edit';
      const existing = isEdit ? PROJECTS.find(project => project.id === state.projectForm.projectId) : null;
      const previousProject = existing ? { ...existing } : null;
      const linkedPos = existing ? posForProject(existing.name) : [];
      if (isEdit && (!existing || !canWriteProject(existing))) {
        openModal('Project editing not permitted', 'The project could not be saved because it is outside your assignment.');
        return;
      }

      let savedProject;
      let oldName = '';
      if (existing) {
        oldName = existing.name;
        const identityLocked = linkedPos.length > 0;
        Object.assign(existing, {
          name: identityLocked ? existing.name : draft.name,
          customer: identityLocked ? existing.customer : draft.customer,
          customerRef: draft.customerRef,
          engineer: state.currentRole === 'manager' ? draft.engineer : existing.engineer,
          site: draft.site,
          status: draft.status,
          statusType: projectStatusType(draft.status),
          startDate: draft.startDate,
          targetDate: draft.targetDate,
          description: draft.description,
        });
        if (oldName !== existing.name) {
          ADMIN_ASSIGNMENTS.forEach(assignment => { if (assignment.project === oldName) assignment.project = existing.name; });
          ADMIN_USERS.forEach(user => { user.projects = user.projects.map(name => name === oldName ? existing.name : name); });
          const searchRecord = SEARCH_INDEX.find(item => item.type === 'Project' && item.label === oldName);
          if (searchRecord) { searchRecord.label = existing.name; searchRecord.sub = existing.customer; searchRecord.action = `openProject('${existing.id}')`; }
        }
        savedProject = existing;
      } else {
        savedProject = {
          id: draft.id || nextProjectId(),
          name: draft.name,
          customer: draft.customer,
          customerRef: draft.customerRef,
          engineer: draft.engineer,
          site: draft.site,
          status: draft.status,
          statusType: projectStatusType(draft.status),
          startDate: draft.startDate,
          targetDate: draft.targetDate,
          description: draft.description,
          pos: 0,
          progress: 0,
          health: 100,
        };
        PROJECTS.push(savedProject);
        const actor = projectActorShortName();
        if (actor && !ADMIN_ASSIGNMENTS.some(item => item.user === actor && item.project === savedProject.name)) {
          ADMIN_ASSIGNMENTS.push({ user: actor, project: savedProject.name, role: 'Owner' });
        }
        const actorUser = ADMIN_USERS.find(user => user.name === actor);
        if (actorUser && !actorUser.projects.includes(savedProject.name)) actorUser.projects.push(savedProject.name);
        SEARCH_INDEX.push({ type: 'Project', label: savedProject.name, sub: savedProject.customer, action: `openProject('${savedProject.id}')` });
      }

      const changedProjectFields = previousProject ? ['name','customer','customerRef','engineer','site','status','startDate','targetDate','description'].filter(key => String(previousProject[key] || '') !== String(savedProject[key] || '')).map(key => `${key}: ${previousProject[key] || '—'} → ${savedProject[key] || '—'}`) : [];
      AUDIT_LOGS.unshift({
        id: `AUD-${10400 + AUDIT_LOGS.length}`,
        date: new Date().toISOString().slice(0,16).replace('T',' '),
        user: ROLE_PERSONA[state.currentRole].name,
        module: 'Projects',
        action: isEdit ? 'Project updated' : 'Project created',
        entity: `${savedProject.id} · ${savedProject.name}`,
        project: savedProject.name,
        po: '',
        evidence:'Project master record',
        details: isEdit ? `Project record updated. ${changedProjectFields.length ? changedProjectFields.join('; ') : 'No field value changed.'}` : `New project created for ${savedProject.customer}; assigned Launch Engineer ${savedProject.engineer}.`,
      });
      openProject(savedProject.id,{ replace:true });
      openModal(isEdit ? 'Project updated' : 'Project created', `${savedProject.id} · ${savedProject.name} was saved successfully and is ready for purchase orders and BOM governance.`);
    }

export function pageProjectForm() {
      const draft = state.projectForm.draft || {};
      const errors = state.projectForm.errors || {};
      const isEdit = state.projectForm.mode === 'edit';
      const project = isEdit ? PROJECTS.find(item => item.id === state.projectForm.projectId) : null;
      const linkedPos = project ? posForProject(project.name) : [];
      const identityLocked = isEdit && linkedPos.length > 0;
      const engineerLocked = state.currentRole !== 'manager';
      const errorClass = key => errors[key] ? 'invalid' : '';
      const errorMessage = key => errors[key] ? `<div class="project-field-error">${errors[key]}</div>` : '';
      const engineerOptions = [...new Set(['A. Rahal', 'A. Haddad', 'S. Amrani', 'M. Idrissi', draft.engineer].filter(Boolean))];
      const activeCustomers = ADMIN_REFERENCE_LISTS.customers.entries.filter(item => item.status === 'Active');
      const customerOptions = activeCustomers.some(item => item.label === draft.customer)
        ? activeCustomers
        : [{ label:draft.customer, status:'Inactive', references:[draft.customerRef].filter(Boolean) }, ...activeCustomers].filter(item => item.label);
      return `<div class="project-editor-shell">
        <header class="project-editor-header">
          <div><h2>${isEdit ? `Edit Project` : 'Create Project'}</h2><span class="mono">${projectHtmlValue(draft.id || 'New project')}</span></div>
        </header>

        ${identityLocked ? `<div class="project-editor-lock">${icon('lock','')}<span>Project name and customer are locked because ${linkedPos.length} purchase order${linkedPos.length === 1 ? '' : 's'} already reference this project.</span></div>` : ''}

        <section class="card project-editor-card">
          <div class="project-editor-section-title"><h3>Project Information</h3></div>
          <div class="project-editor-grid">
            <div class="project-editor-field">
              <label>Project ID</label>
              <input class="project-input" value="${projectHtmlValue(draft.id)}" readonly aria-label="Project ID"/>
            </div>
            <div class="project-editor-field">
              <label>Project Name <em>*</em></label>
              <input class="project-input ${errorClass('name')}" value="${projectHtmlValue(draft.name)}" ${identityLocked ? 'readonly' : ''} oninput="projectForm.draft.name=this.value" placeholder="Enter project name" aria-label="Project name"/>
              ${errorMessage('name')}
            </div>
            <div class="project-editor-field">
              <label>Customer <em>*</em></label>
              <select class="project-input ${errorClass('customer')}" ${identityLocked ? 'disabled' : ''} onchange="setProjectFormCustomer(this.value)" aria-label="Customer">
                <option value="">Select customer</option>
                ${customerOptions.map(item => `<option value="${projectHtmlValue(item.label)}" ${draft.customer === item.label ? 'selected' : ''}>${projectHtmlValue(item.label)}${item.status === 'Inactive' ? ' (Inactive)' : ''}</option>`).join('')}
              </select>
              ${errorMessage('customer')}
            </div>
            <div class="project-editor-field">
              <label>Launch Engineer <em>*</em></label>
              <select class="project-input ${errorClass('engineer')}" ${engineerLocked ? 'disabled' : ''} onchange="projectForm.draft.engineer=this.value" aria-label="Assigned Launch Engineer">
                ${engineerOptions.map(value => `<option value="${projectHtmlValue(value)}" ${draft.engineer === value ? 'selected' : ''}>${projectHtmlValue(value)}</option>`).join('')}
              </select>
              ${errorMessage('engineer')}
            </div>
            <div class="project-editor-field full">
              <label>Project Description</label>
              <textarea class="project-input" oninput="projectForm.draft.description=this.value" placeholder="Enter project description" aria-label="Project description">${projectHtmlValue(draft.description)}</textarea>
            </div>
          </div>
        </section>

        <footer class="project-editor-actions">
          <button class="btn" onclick="cancelProjectForm()">Cancel</button>
          <button class="btn primary" onclick="saveProjectForm()">${icon('check','')} ${isEdit ? 'Save Project' : 'Create Project'}</button>
        </footer>
      </div>`;
    }

export function setProjectSearch(v) { state.projectFilters.search = v; state.projectPage = 1; renderPage(); restoreFocus('#projSearchInput'); }

export function setProjectFilter(key, v) { state.projectFilters[key] = v; state.projectPage = 1; renderPage(); }

export function clearProjectFilter(key) { state.projectFilters[key] = ''; state.projectPage = 1; renderPage(); }

export function resetProjectFilters() { state.projectFilters = { search: '', customer: '', engineer: '', status: '' }; state.projectPage = 1; renderPage(); }

export function sortProjects(key) { projectSort.dir = (projectSort.key === key) ? -projectSort.dir : 1; projectSort.key = key; renderPage(); }

export function setProjectPage(n) { state.projectPage = Math.max(1, n); renderPage(); }

export function filterProjects() {
      const f = state.projectFilters;
      return visibleProjects().filter(p => {
        if (f.search && !(`${p.name} ${p.id} ${p.customer}`.toLowerCase().includes(f.search.toLowerCase()))) return false;
        if (f.customer && p.customer !== f.customer) return false;
        if (state.currentRole === 'manager' && f.engineer && p.engineer !== f.engineer) return false;
        return true;
      });
    }

export function pageProjectList() {
      const scopeProjects = visibleProjects();
      const scopeNames = new Set(scopeProjects.map(p => p.name));
      const scopePos = POS.filter(po => scopeNames.has(po.project));
      const scopePns = PNS.filter(pn => scopeNames.has(pn.project));
      let rows = filterProjects().map(p => {
        const projectPos = posForProject(p.name);
        const readiness = projectBomReadiness(p.name);
        const lifecycleCounts = Object.fromEntries(PO_STATUS_FLOW.map(status => [status,0]));
        projectPos.forEach(po => { lifecycleCounts[poLifecycle(po.id)] += 1; });
        return { ...p, pos: projectPos.length, pnCount: readiness.total, bomCoverage: readiness.percent, poBomReady: projectPos.filter(po => poBomReadiness(po.id).ready).length, lifecycleCounts };
      });
      rows = sortRows(rows, projectSort);
      const total = rows.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      state.projectPage = Math.min(state.projectPage, totalPages);
      const pageRows = rows.slice((state.projectPage - 1) * PAGE_SIZE, state.projectPage * PAGE_SIZE);

      const portfolioReadiness = bomReadinessForPns(scopePns);
      const bomBlocked = scopeProjects.filter(p => !projectBomReadiness(p.name).ready).length;
      const onTrackProjects = scopeProjects.filter(p => p.status === 'On Track').length;
      const showOwner = state.currentRole === 'manager';

      const visibleProjectFilters = { search:state.projectFilters.search, customer:state.projectFilters.customer, engineer:showOwner ? state.projectFilters.engineer : '' };
      const chips = filterChips(visibleProjectFilters, { customer: 'Customer', engineer: 'Engineer' }, 'clearProjectFilter', 'resetProjectFilters');

      const tableBody = pageRows.length ? `<div class="project-list-table-wrap"><table id="projectPortfolioTable" class="project-portfolio-table">
    <thead><tr>
      ${sortTh('Project', 'name', projectSort, 'sortProjects')}
      ${showOwner ? sortTh('Owner / Plant', 'engineer', projectSort, 'sortProjects') : ''}
      ${sortTh('Purchase Orders', 'pos', projectSort, 'sortProjects')}
      ${sortTh('BOM Coverage', 'bomCoverage', projectSort, 'sortProjects')}
      <th data-export="false">Actions</th>
    </tr></thead>
    <tbody>${pageRows.map(p => {
      const stateClass = p.statusType === 'danger' ? 'danger' : p.statusType === 'warning' ? 'warning' : '';
      const lifecycleBadges = PO_STATUS_FLOW.filter(status => p.lifecycleCounts[status]).map(status => statusBadge(`${p.lifecycleCounts[status]} ${status}`,productionStatusType(status))).join('');
      return `<tr class="clickable-row" onclick="openProject('${p.id}')">
      <td><div class="project-identity-cell"><div class="project-row-icon ${stateClass}">${icon('projects','')}</div><div class="project-identity-copy"><strong>${p.name}</strong><span class="mono">${p.id} · ${p.customer}</span></div></div></td>
      ${showOwner ? `<td><div class="project-owner-cell"><strong>${p.engineer}</strong><span>${p.site}</span></div></td>` : ''}
      <td><div class="project-po-cell"><div class="project-po-total"><strong>${p.pos}</strong><span>purchase order${p.pos === 1 ? '' : 's'}</span></div><div class="project-po-stages">${lifecycleBadges || statusBadge('No PO','neutral')}</div></div></td>
      <td><div class="project-bom-cell"><div class="project-bom-head"><strong>${p.bomCoverage}%</strong><span>${p.pnCount} PN${p.pnCount === 1 ? '' : 's'}</span></div><div class="project-bom-track"><div class="project-bom-fill ${p.bomCoverage === 100 ? 'ready' : ''}" style="width:${p.bomCoverage}%"></div></div><div class="project-bom-foot">${p.poBomReady}/${p.pos} PO BOMs ready</div></div></td>
      <td>${projectActionIcons(p.id, p.name)}</td>
    </tr>`; }).join('')}</tbody>
  </table></div>` : `<div style="padding:0 20px 20px;">${emptyStateBlock('No projects found', 'Try adjusting or resetting your filters.', 'resetProjectFilters')}</div>`;

      return `
  <div class="project-portfolio-summary">
    <div class="project-summary-metric"><div class="project-summary-icon">${icon('projects','')}</div><div class="project-summary-copy"><span>Projects</span><strong>${scopeProjects.length}</strong><small>${onTrackProjects} on track</small></div></div>
    <div class="project-summary-metric"><div class="project-summary-icon">${icon('po','')}</div><div class="project-summary-copy"><span>Purchase Orders</span><strong>${scopePos.length}</strong><small>${scopePns.length} finished-good part numbers</small></div></div>
    <div class="project-summary-metric ${portfolioReadiness.ready ? 'good' : 'warn'}"><div class="project-summary-icon">${icon('bom','')}</div><div class="project-summary-copy"><span>PN BOM Coverage</span><strong>${portfolioReadiness.percent}%</strong><small>${bomBlocked} project${bomBlocked === 1 ? '' : 's'} requiring BOM</small></div></div>
  </div>
  <div class="card project-list-card">
    <div class="project-list-card-head"><div><h3>All Projects</h3></div><div class="project-list-card-tools">${pageRows.length ? tableExportActions('projectPortfolioTable','Project Portfolio') : ''}${permBtn('newProject', 'New Project', 'plus', "openProjectForm('create')", "primary")}</div></div>
    <div class="project-list-toolbar">${projectToolbarHtml()}</div>
    ${chips}
    <div class="project-list-count">${rowCountLabel(total, 'project')}</div>
    ${tableBody}
    ${pageRows.length ? paginationBar(total, state.projectPage, PAGE_SIZE, 'setProjectPage') : ''}
  </div>`;
    }

export function projectToolbarHtml() {
      const scopedProjects = visibleProjects();
      const custOpts = uniqueValues(scopedProjects, 'customer');
      const engOpts = uniqueValues(scopedProjects, 'engineer');
      return `<div class="table-toolbar">
    <div class="tt-search">
      ${icon('search', '')}
      <input id="projSearchInput" type="text" placeholder="Search project name or customer…" value="${state.projectFilters.search}" oninput="setProjectSearch(this.value)"/>
    </div>
    <select class="tt-select" onchange="setProjectFilter('customer', this.value)">
      <option value="">Customer</option>
      ${custOpts.map(c => `<option value="${c}" ${state.projectFilters.customer === c ? 'selected' : ''}>${c}</option>`).join('')}
    </select>
    ${state.currentRole === 'manager' ? `<select class="tt-select" onchange="setProjectFilter('engineer', this.value)">
      <option value="">Engineer</option>
      ${engOpts.map(c => `<option value="${c}" ${state.projectFilters.engineer === c ? 'selected' : ''}>${c}</option>`).join('')}
    </select>` : ''}
    <div class="tt-spacer"></div>
  </div>`;
    }

export function restoreFocus(selector) {
      const raf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : (fn) => setTimeout(fn, 0);
      raf(() => {
        const el = document.querySelector(selector);
        if (el) { el.focus(); const v = el.value; el.value = ''; el.value = v; }
      });
    }

export function workspaceTabs(tabs, active, handlerFnName) {
      return `<div class="tabs">${tabs.map(t => `<div class="tab ${t === active ? 'active' : ''}" onclick="${handlerFnName}('${t}')">${t}</div>`).join('')}</div>`;
    }

export function poActionIcons(poId) {
      const po = POS.find(item => item.id === poId);
      const project = PROJECTS.find(item => item.name === po?.project);
      const writable = project && canWriteProject(project);
      return `<div class="icon-actions">
    ${writable ? permIconBtn('editRecord', 'Edit', 'edit', `stop(event); openModal('Edit ${poId}', 'This opens the purchase order edit form — customer, version, delivery date.')`) : ''}
    <div class="icon-btn" title="Manufacturing Delivery" onclick="stop(event); openPoDeliveryTab('${poId}')">${icon('truck', '')}</div>
    <div class="icon-btn" title="Delivery History" onclick="stop(event); openPoDeliveryHistory('${poId}')">${icon('history', '')}</div>
    ${writable ? permIconBtn('deleteRecord', 'Delete', 'trash', `stop(event); confirmDeletePo('${poId}')`, 'danger-hover') : ''}
  </div>`;
    }

export function poSummaryActionIcons(poId) {
      const po = POS.find(item => item.id === poId);
      const project = PROJECTS.find(item => item.name === po?.project);
      const writable = project && canWriteProject(project);
      return `<div class="icon-actions compact-actions">
        ${writable ? permIconBtn('editRecord', 'Edit', 'edit', `stop(event); startPoUpload('${inlineJsValue(po.project)}','${poId}')`) : ''}
        ${writable ? permIconBtn('deleteRecord', 'Delete', 'trash', `stop(event); confirmDeletePo('${poId}')`, 'danger-hover') : ''}
      </div>`;
    }

export function openPoDeliveryTab(poId) {
      const po = POS.find(item => item.id === poId);
      state.openContext.po = poId; if (po) state.openContext.project = po.project;
      state.activeTab.po = 'Manufacturing';
      navigate('po-workspace');
    }

export function openPoDeliveryHistory(poId) {
      const po = POS.find(item => item.id === poId);
      state.openContext.po = poId; if (po) state.openContext.project = po.project;
      state.activeTab.po = 'History';
      navigate('po-workspace');
    }

export function projectActionIcons(projectId, projectName) {
      const project = PROJECTS.find(p => p.id === projectId || p.name === projectName);
      const writable = project && canWriteProject(project);
      return `<div class="icon-actions">
    ${writable ? permIconBtn('editRecord', 'Edit', 'edit', `stop(event); openProjectForm('edit', '${projectId}')`) : ''}
    ${writable ? permIconBtn('deleteRecord', 'Delete', 'trash', `stop(event); confirmDeleteProject('${projectId}')`, 'danger-hover') : ''}
  </div>`;
    }

export function openProject(projectId, navOptions = {}) {
      const project = PROJECTS.find(p => p.id === projectId || p.name === projectId) || PROJECTS[0];
      if (state.currentRole === 'engineer' && !assignedProjectNames().has(project.name)) {
        openModal('Project outside your assignment', `${project.name} is not assigned to ${ROLE_PERSONA.engineer.name}. The SRS limits Launch Engineers to their own projects.`);
        return;
      }
      const projectPo = POS.find(p => p.project === project.name);
      state.openContext.project = project.name;
      state.openContext.po = projectPo ? projectPo.id : '';
      state.openContext.pn = projectPo ? (pnsForPo(projectPo.id)[0]?.pn || '') : '';
      state.projectBomFilters = { search:'', fgpn:'', type:'' };
      state.projectBomPage = 1;
      state.activeTab.project = 'Overview';
      navigate('project-workspace',navOptions);
    }

export function openProjectBomVersionCompare() {
      state.openContext.compareType = 'bom';
      state.openContext.pn = '';
      const currentBom = BOM_VERSION_HISTORY.find(v => v.current)?.version || 'v4';
      const previousBom = BOM_VERSION_HISTORY.filter(v => !v.current).slice(-1)[0]?.version || 'v3';
      state.bomVersionCompareA = previousBom;
      state.bomVersionCompareB = currentBom;
      navigate('bom-version-compare');
    }

export function poTableRich(list, compactActions = false, tableId = '') {
      if (!list.length) return emptyStateBlock('No purchase orders yet', 'Create the first PO after the project record has been saved.', null);
      return `<div class="po-readiness-table-wrap"><table${tableId ? ` id="${tableId}"` : ''} class="po-readiness-table ${compactActions ? 'summary-table' : ''}"><thead><tr><th>PO Number</th><th>Version</th><th>Part Numbers</th><th>PN BOM Coverage</th><th>PO BOM</th><th>Delivery Date</th><th>Status</th><th class="po-actions-col" data-export="false">Actions</th></tr></thead>
    <tbody>${list.map(po => { const readiness = poBomReadiness(po.id); return `<tr class="clickable-row" onclick="openPo('${po.id}')">
      <td class="mono">${po.id}</td>
      <td class="mono">${po.version}</td>
      <td class="mono">${readiness.total}</td>
      <td style="min-width:140px;">${bomCoverageHtml(readiness, true)}</td>
      <td>${statusBadge(readiness.ready ? 'Ready to generate' : `${readiness.missing.length} BOM missing`, readiness.ready ? 'success' : 'warning')}</td>
      <td>${po.delivery}</td>
      <td>${statusBadge(po.status, po.statusType)}</td>
      <td class="po-actions-cell">${compactActions ? poSummaryActionIcons(po.id) : poActionIcons(po.id)}</td>
    </tr>`; }).join('')}</tbody></table></div>`;
    }

export function pnActionIcons(pn) {
      const item = PNS.find(p => p.pn === pn);
      const project = PROJECTS.find(p => p.name === item?.project);
      const writable = project && canWriteProject(project);
      return `<div class="icon-actions">
    <div class="icon-btn" title="View PN" onclick="stop(event); openPn('${pn}')">${icon('view', '')}</div>
    ${writable ? permIconBtn('uploadBom', 'Upload BOM', 'upload', `stop(event); openPnBomUpload('${pn}')`) : ''}
    <div class="icon-btn" title="Simulation" onclick="stop(event); openPn('${pn}','Simulation'); navigate('sim-launch')">${icon('sim', '')}</div>
    <div class="icon-btn" title="History" onclick="stop(event); openPn('${pn}','History')">${icon('history', '')}</div>
  </div>`;
    }

export function setPnSearch(v) { state.pnFilters.search = v; renderPage(); }

export function setPnFilter(key, v) { state.pnFilters[key] = v; renderPage(); }

export function clearPnFilter(key) { state.pnFilters[key] = ''; renderPage(); }

export function resetPnFilters() { state.pnFilters = { search: '', status: '', version: '', bom: '', simulation: '' }; renderPage(); }

export function filterPNs(source = PNS) {
      const f = state.pnFilters;
      return source.filter(p => {
        if (f.search && !(`${p.pn} ${p.desc}`.toLowerCase().includes(f.search.toLowerCase()))) return false;
        if (f.status && p.status !== f.status) return false;
        if (f.version && p.version !== f.version) return false;
        if (f.bom && p.bom !== f.bom) return false;
        return true;
      });
    }

export function pnToolbarHtml(source = PNS) {
      const opt = (key, list, placeholder) => `<select class="tt-select" onchange="setPnFilter('${key}', this.value)">
    <option value="">${placeholder}</option>
    ${list.map(v => `<option value="${v}" ${state.pnFilters[key] === v ? 'selected' : ''}>${v}</option>`).join('')}
  </select>`;
      return `<div class="table-toolbar">
    <div class="tt-search">${icon('search', '')}<input type="text" placeholder="Search PN…" value="${state.pnFilters.search}" oninput="setPnSearch(this.value)"/></div>
    ${opt('status', uniqueValues(source, 'status'), 'Status')}
    ${opt('version', uniqueValues(source, 'version'), 'Version')}
    ${opt('bom', uniqueValues(source, 'bom'), 'BOM')}
    <div class="tt-spacer"></div>
    <div class="tt-icon-btn" title="Refresh" onclick="refreshNotice()">${icon('refresh', '')}</div>
    <div class="tt-icon-btn" title="Export" onclick="exportNotice()">${icon('download', '')}</div>
  </div>`;
    }

export function projectPoBomState(poId) {
      const readiness = poBomReadiness(poId);
      if (readiness.poBomFile?.status === 'Validated') {
        return { label:'Validated', type:'success', detail:readiness.poBomFile.file };
      }
      if (readiness.missing.length) {
        const count = readiness.missing.length;
        return { label:`${count} BOM missing`, type:'warning', detail:readiness.missing.map(part => part.pn).join(', ') };
      }
      if (readiness.ready) {
        return { label:'Ready', type:'info', detail:'All PN BOMs available' };
      }
      return { label:'Not available', type:'neutral', detail:'No PN BOM data' };
    }

export function projectOverviewPoList(project, projectPos) {
      if (!projectPos.length) return `<div class="card project-po-overview"><div class="project-po-overview-head"><div><h3>Purchase Orders</h3></div>${canWriteProject(project) ? permBtn('uploadPo','Add Purchase Order','plus',`startPoUpload('${inlineJsValue(project.name)}')`,'primary') : ''}</div>${emptyStateBlock('No purchase orders', 'Upload the first purchase order for this project.', null)}</div>`;
      return `<div class="card project-po-overview">
        <div class="project-po-overview-head"><div><h3>Purchase Orders</h3></div><div class="table-heading-actions">${tableExportActions('projectPoOverviewTable',`${project.name} Purchase Orders`)}${canWriteProject(project) ? permBtn('uploadPo','Add Purchase Order','plus',`startPoUpload('${inlineJsValue(project.name)}')`,'primary') : ''}</div></div>
        <div class="table-scroll"><table id="projectPoOverviewTable" class="project-po-table"><thead><tr><th>PO Number</th><th>Version</th><th>Part Numbers</th><th>PO BOM</th><th>Order Date</th><th>Delivery Date</th><th>Current Status</th><th>Last Activity</th><th data-export="false">Actions</th></tr></thead><tbody>${projectPos.map(po => { const status = poLifecycle(po.id); const last = poStatusEvents(po.id)[0]; const bomState = projectPoBomState(po.id); return `<tr onclick="openPo('${po.id}','Overview')"><td><div class="project-po-number"><strong>${po.id}</strong><span>${po.customer}</span></div></td><td class="mono">${po.version}</td><td class="mono">${pnsForPo(po.id).length || po.pnCount || 0}</td><td><div class="project-po-bom-state">${statusBadge(bomState.label,bomState.type)}<small>${bomState.detail}</small></div></td><td class="mono">${po.date || '—'}</td><td class="mono">${po.delivery || '—'}</td><td class="po-status-primary">${statusBadge(status,productionStatusType(status))}</td><td><div class="po-last-activity"><strong>${last?.reason || 'PO record created'}</strong><span>${last ? `${last.date} · ${last.user}` : po.date || '—'}</span></div></td><td>${poSummaryActionIcons(po.id)}</td></tr>`; }).join('')}</tbody></table></div>
      </div>`;
    }

export function projectOverviewDashboard(project, projectPos) {
      const projectPns = pnsForProject(project.name);
      const bomReadiness = projectBomReadiness(project.name);
      const projectMaterials = MATERIALS.filter(material => material.projects.includes(project.name));
      const manufacturingLaunches = MFG_DELIVERIES.filter(delivery => delivery.project === project.name && delivery.status !== 'Cancelled');
      const customerDeliveries = CUST_DELIVERIES.filter(delivery => delivery.project === project.name && delivery.status !== 'Cancelled');
      const confirmedCustomerDeliveries = customerDeliveries.filter(delivery => custEffectiveStatus(delivery).label === 'Delivered').length;
      const projectValue = projectPos.flatMap(po => poFinanceRows(po.id)).reduce((sum,row) => sum + row.lineTotal,0);

      const kpis = [
        { label:'Purchase Orders', value:projectPos.length, icon:'po' },
        { label:'BOM Coverage', value:`${bomReadiness.percent}%`, icon:'bom' },
        { label:'Materials', value:projectMaterials.length, icon:'stock' },
        { label:'Active Deliveries', value:customerDeliveries.length, icon:'truck' },
        { label:'Active Launches', value:manufacturingLaunches.length, icon:'Package' },
        { label:'Project Value', value:financeMoney(projectValue), icon:'money' },
      ];

      const snapshot = [
        { label:'Finished-good part numbers', value:projectPns.length },
        { label:'Uploaded BOMs', value:`${bomReadiness.uploaded}/${bomReadiness.total}` },
        { label:'Manufacturing launches', value:manufacturingLaunches.length },
        { label:'Customer deliveries', value:`${confirmedCustomerDeliveries}/${customerDeliveries.length}` },
      ];

      return `<div class="project-overview-dashboard">
        <div class="project-overview-kpis">
          ${kpis.map(item => `<div class="project-overview-kpi">
            <span class="project-overview-kpi-icon">${icon(item.icon,'')}</span>
            <span><small>${item.label}</small><strong>${item.value}</strong></span>
          </div>`).join('')}
        </div>

        <div class="project-overview-main">
          <section class="project-overview-panel project-overview-panel-wide">
            <div class="project-overview-panel-head"><h3>Execution Snapshot</h3></div>
            <div class="project-execution-grid">
              ${snapshot.map(item => `<div><span>${item.label}</span><strong>${item.value}</strong></div>`).join('')}
            </div>
          </section>
        </div>
      </div>`;
    }

export function projectManufacturingDeliveryPanel(project) {
      const projectPos = posForProject(project.name);
      if (!projectPos.length) return '';
      const selected = projectSelectedPo(project);
      const eligible = selected ? mfgEligibleOrders(selected.id).length > 0 : false;
      const canCreate = selected && eligible && canWriteProject(project) && can('createMfgDelivery') === true;
      return `<div class="card project-mfg-simple">
        <div class="project-mfg-simple-head"><div><h3>New manufacturing delivery</h3></div></div>
        <div class="project-mfg-simple-controls"><div><label class="sim-field-label">Purchase order</label><select class="sim-select" onchange="setProjectOpsPo(this.value)">${projectPos.map(po => `<option value="${po.id}" ${selected?.id === po.id ? 'selected' : ''}>${po.id} · ${mfgEligibleOrders(po.id).length} eligible PNs</option>`).join('')}</select></div>${canCreate ? permBtn('createMfgDelivery','Select PNs & Launch Qty','plus',`startProjectMfgDelivery('${selected.id}')`,'primary') : `<button class="btn primary" disabled>No Eligible PNs</button>`}</div>
      </div>`;
    }

export function projectCustomerDeliveryPanel(project) {
      const projectPos = posForProject(project.name);
      if (!projectPos.length) return '';
      const selected = projectSelectedPo(project);
      const eligibleCount = selected ? customerEligibleOrders(selected.id).length : 0;
      const canCreate = selected && eligibleCount > 0 && canWriteProject(project) && can('createCustDelivery') === true;
      return `<div class="card project-mfg-simple">
        <div class="project-mfg-simple-head"><div><h3>Customer delivery</h3></div></div>
        <div class="project-mfg-simple-controls"><div><label class="sim-field-label">Purchase order</label><select class="sim-select" onchange="setProjectOpsPo(this.value)">${projectPos.map(po => `<option value="${po.id}" ${selected?.id === po.id ? 'selected' : ''}>${po.id} · ${customerEligibleOrders(po.id).length} packaged PNs</option>`).join('')}</select></div>${canCreate ? permBtn('createCustDelivery','Select PNs & Quantities','plus',`startProjectCustomerDelivery('${selected.id}','','project')`,'primary') : `<button class="btn primary" disabled>No Packaged Quantity</button>`}</div>
      </div>`;
    }

export function poFinanceRows(poId) {
      return pnsForPo(poId).map((pn,index) => {
        const quantity = Number(pn.qty || 0);
        const unitPrice = Number(pn.unitPrice || 0);
        return { lineNo:String(index + 1).padStart(3,'0'), po:poId, pn:pn.pn, description:pn.desc, quantity, unitPrice, currency:pn.currency || 'EUR', lineTotal:Number((quantity * unitPrice).toFixed(2)) };
      });
    }

export function financeTotals(rows) {
      return { quantity:rows.reduce((sum,row) => sum + Number(row.quantity || 0),0), value:Number(rows.reduce((sum,row) => sum + Number(row.lineTotal || 0),0).toFixed(2)), partNumbers:rows.length };
    }

export function poFinanceWorkspace(po) {
      const rows = poFinanceRows(po.id);
      const totals = financeTotals(rows);
      return `<div class="finance-workspace">
        <div class="finance-head"><div class="finance-head-title"><div class="finance-head-icon">${icon('finance','')}</div><div><span>PO Financial Value</span><h3>${po.id}</h3></div></div><div class="table-heading-actions">${statusBadge('Current PO Version','success')}${statusBadge('Currency · EUR','info')}</div></div>
        <div class="finance-summary"><div class="finance-metric"><span>Part numbers</span><strong>${totals.partNumbers}</strong></div><div class="finance-metric"><span>Ordered quantity</span><strong>${totals.quantity.toLocaleString()} units</strong></div><div class="finance-metric"><span>PO version</span><strong>${po.version}</strong></div><div class="finance-metric total"><span>Total PO value</span><strong>${financeMoney(totals.value)}</strong></div></div>
        <div class="card finance-table-card"><div class="finance-table-head"><div><h3>Part-number pricing</h3><p>Unit prices and quantities extracted from the current purchase-order version.</p></div>${rows.length ? tableExportActions('poFinanceTable',`${po.id} Financial Detail`) : ''}</div><div class="table-scroll finance-table-wrap">${rows.length ? `<table id="poFinanceTable" class="finance-table"><thead><tr><th>Line</th><th>Part Number</th><th>Description</th><th class="finance-number">Quantity</th><th class="finance-number">Unit Price</th><th class="finance-number">Line Total</th></tr></thead><tbody>${rows.map(row => `<tr><td class="mono">${row.lineNo}</td><td class="mono"><strong>${row.pn}</strong></td><td>${row.description}</td><td class="finance-number">${row.quantity.toLocaleString()}</td><td class="finance-number">${financeMoney(row.unitPrice,row.currency)}</td><td class="finance-number"><strong>${financeMoney(row.lineTotal,row.currency)}</strong></td></tr>`).join('')}</tbody><tfoot><tr><td>PO Total</td><td></td><td></td><td class="finance-number">${totals.quantity.toLocaleString()}</td><td></td><td class="finance-number">${financeMoney(totals.value)}</td></tr></tfoot></table>` : emptyStateBlock('No priced part numbers','The PO must contain extracted quantities and unit prices before its financial value can be calculated.',null)}</div></div>
      </div>`;
    }

export function projectFinanceWorkspace(project) {
      const projectPos = posForProject(project.name);
      const lineRows = projectPos.flatMap(po => poFinanceRows(po.id));
      const totals = financeTotals(lineRows);
      const poRows = projectPos.map(po => { const rows = poFinanceRows(po.id); return { po, rows, totals:financeTotals(rows) }; });
      return `<div class="finance-workspace">
        <div class="finance-head"><div class="finance-head-title"><div class="finance-head-icon">${icon('finance','')}</div><div><span>Project Financial Consolidation</span><h3>${project.name}</h3></div></div><div class="table-heading-actions">${statusBadge(`${projectPos.length} purchase order${projectPos.length === 1 ? '' : 's'}`,'info')}${statusBadge('Currency · EUR','success')}</div></div>
        <div class="finance-summary"><div class="finance-metric"><span>Purchase orders</span><strong>${projectPos.length}</strong></div><div class="finance-metric"><span>Part-number lines</span><strong>${totals.partNumbers}</strong></div><div class="finance-metric"><span>Combined quantity</span><strong>${totals.quantity.toLocaleString()} units</strong></div><div class="finance-metric total"><span>Total project value</span><strong>${financeMoney(totals.value)}</strong></div></div>
        <div class="card finance-table-card"><div class="finance-table-head"><div><h3>Purchase-order totals</h3><p>Combined value of every current PO version in this project.</p></div>${poRows.length ? tableExportActions('projectFinancePoTable',`${project.name} PO Financial Summary`) : ''}</div><div class="table-scroll finance-table-wrap">${poRows.length ? `<table id="projectFinancePoTable" class="finance-table"><thead><tr><th>Purchase Order</th><th>Version</th><th>Part Numbers</th><th class="finance-number">Quantity</th><th class="finance-number">PO Total</th></tr></thead><tbody>${poRows.map(item => `<tr><td><span class="finance-po-link mono" onclick="openPo('${item.po.id}','Finance')">${item.po.id}</span></td><td class="mono">${item.po.version}</td><td>${item.totals.partNumbers}</td><td class="finance-number">${item.totals.quantity.toLocaleString()}</td><td class="finance-number"><strong>${financeMoney(item.totals.value)}</strong></td></tr>`).join('')}</tbody><tfoot><tr><td>Project Total</td><td></td><td>${totals.partNumbers}</td><td class="finance-number">${totals.quantity.toLocaleString()}</td><td class="finance-number">${financeMoney(totals.value)}</td></tr></tfoot></table>` : emptyStateBlock('No purchase orders','Add a purchase order to begin project financial consolidation.',null)}</div></div>
        <div class="card finance-table-card"><div class="finance-table-head"><div><h3>Consolidated part-number detail</h3><p>All priced PO lines combined without losing their purchase-order reference.</p></div>${lineRows.length ? tableExportActions('projectFinanceLinesTable',`${project.name} Consolidated Part Pricing`) : ''}</div><div class="table-scroll finance-table-wrap">${lineRows.length ? `<table id="projectFinanceLinesTable" class="finance-table"><thead><tr><th>Purchase Order</th><th>Part Number</th><th>Description</th><th class="finance-number">Quantity</th><th class="finance-number">Unit Price</th><th class="finance-number">Line Total</th></tr></thead><tbody>${lineRows.map(row => `<tr><td class="mono">${row.po}</td><td class="mono"><strong>${row.pn}</strong></td><td>${row.description}</td><td class="finance-number">${row.quantity.toLocaleString()}</td><td class="finance-number">${financeMoney(row.unitPrice,row.currency)}</td><td class="finance-number"><strong>${financeMoney(row.lineTotal,row.currency)}</strong></td></tr>`).join('')}</tbody><tfoot><tr><td>Project Total</td><td></td><td></td><td class="finance-number">${totals.quantity.toLocaleString()}</td><td></td><td class="finance-number">${financeMoney(totals.value)}</td></tr></tfoot></table>` : ''}</div></div>
      </div>`;
    }

export function projectStockWorkspace(project) {
      const rows = MATERIALS.filter(material => material.projects.includes(project.name));
      const warehouse = rows.reduce((sum,item) => sum + item.warehouse,0);
      const wip = rows.reduce((sum,item) => sum + item.wip,0);
      const transit = rows.reduce((sum,item) => sum + materialTransitQuantity(item.code),0);
      const low = rows.filter(item => item.warehouse < getThreshold(item.code)).length;
      return `<section class="stock-shell project-stock-shell">
        <div class="stock-command-bar"><div><span>${project.name}</span><h2>Project Material Stock</h2></div><div class="stock-page-actions"><button class="btn" onclick="navigate('stock-history')">${icon('history','')} Stock History</button><button class="btn primary" onclick="navigate('stock-dashboard')">${icon('stock','')} Stock Dashboard</button></div></div>
        <div class="stock-kpi-grid"><div class="stock-kpi"><span>Warehouse stock</span><strong>${warehouse.toLocaleString()}</strong><small>Project materials</small></div><div class="stock-kpi"><span>Work in progress</span><strong>${wip.toLocaleString()}</strong><small>Production quantity</small></div><div class="stock-kpi"><span>In transit</span><strong>${transit.toLocaleString()}</strong><small>Expected inbound</small></div><div class="stock-kpi ${low ? 'danger' : 'accent'}"><span>Low-stock materials</span><strong>${low}</strong><small>${rows.length} controlled materials</small></div></div>
        <div class="card stock-panel"><div class="stock-panel-head"><div><h3>Committed Materials</h3></div>${rows.length ? tableExportActions('projectStockTable',`${project.name} Project Stock`) : ''}</div><div class="table-scroll"><table id="projectStockTable" class="stock-table"><thead><tr><th>Material</th><th>Type / Supplier</th><th>Required</th><th>Warehouse</th><th>WIP</th><th>Transit</th><th>Missing</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(item => { const state=materialStockState(item); return `<tr onclick="openMaterialDetail('${item.code}')"><td><strong class="mono">${item.code}</strong><span>${item.desc}</span></td><td><strong>${item.type}</strong><span>${item.supplier}</span></td><td class="mono">${item.required.toLocaleString()}</td><td class="mono stock-qty-primary">${item.warehouse.toLocaleString()}</td><td class="mono">${item.wip.toLocaleString()}</td><td class="mono">${materialTransitQuantity(item.code).toLocaleString()}</td><td class="mono ${item.missing ? 'stock-danger-text' : ''}">${item.missing.toLocaleString()}</td><td>${statusBadge(state.label,state.type)}</td><td><button class="icon-btn" onclick="stop(event);openMaterialDetail('${item.code}')">${icon('view','')}</button></td></tr>`; }).join('')}</tbody></table></div></div>
      </section>`;
    }

export function pageProjectWorkspace() {
      const project = projectForContext();
      const projectPos = posForProject(project.name);
      const tab = state.activeTab.project;
      let tabContent = '';
      if (tab === 'Overview') {
        tabContent = projectOverviewDashboard(project,projectPos);
      } else if (tab === 'Purchase Orders') {
        tabContent = projectOverviewPoList(project,projectPos);
      } else if (tab === 'Project BOM') {
        tabContent = pageBomProjectInline();
      } else if (tab === 'Stock') {
        tabContent = projectStockWorkspace(project);
      } else if (tab === 'Simulation') {
        tabContent = `<div class="card">
      <div class="section-title">Latest Simulation</div>
      <div class="empty-state" style="padding:24px;">
        ${icon('sim', '')}
        <div class="e-title">Run a simulation from the Simulation Workspace</div>
        <div class="e-sub">Simulations can be scoped to this entire project, to selected POs, or to a single PO. Set the scope on the Simulation Workspace.</div>
      </div>
      <button class="btn primary" onclick="simProject='${project.name}'; simScope='project'; navigate('sim-launch')" style="margin-top:6px;">Go to Simulation Workspace</button>
    </div>`;
      } else if (tab === 'Manufacturing Deliveries') {
        const projectMfgRows = MFG_DELIVERIES.filter(d => d.project === project.name);
        tabContent = `${projectManufacturingDeliveryPanel(project)}<div class="card">
      <div class="section-title"><span>Manufacturing Deliveries <span class="hint">${project.name}</span></span>${projectMfgRows.length ? tableExportActions('projectMfgDeliveriesTable',`${project.name} Manufacturing Deliveries`) : ''}</div>
      ${mfgTable(projectMfgRows,'projectMfgDeliveriesTable',true)}
    </div>`;
      } else if (tab === 'Customer Deliveries') {
        const projectCustomerRows = CUST_DELIVERIES.filter(d => d.project === project.name);
        tabContent = `${projectCustomerDeliveryPanel(project)}<div class="card">
      <div class="section-title"><span>Customer Deliveries <span class="hint">${project.name}</span></span>${projectCustomerRows.length ? tableExportActions('projectCustomerDeliveriesTable',`${project.name} Customer Deliveries`) : ''}</div>
      ${custTable(projectCustomerRows,'projectCustomerDeliveriesTable',true)}
    </div>`;
      } else if (tab === 'Finance') {
        const financeAccess = can('viewFinance');
        if (financeAccess === false) {
          tabContent = `<div class="card">${emptyStateBlock('No finance access', 'Your role does not have access to financial data for this project.', null)}</div>`;
        } else {
          tabContent = projectFinanceWorkspace(project);
        }
      } else if (tab === 'History') {
        tabContent = traceabilityWorkspace(auditContextEvents({ project:project.name }),`${project.name} project history`,'projectCompleteHistoryTable');
      }

      return `
  <div class="workspace-layout">
    ${projectExplorer('project')}
    <div>
      <div class="workspace-header">
        <div class="ws-header-grid" style="width:100%;">
          <div style="display:flex; gap:18px; align-items:flex-start;">
            ${healthRing(project.health)}
            <div>
              <span class="ws-id">${project.id}</span>
              <div class="ws-title">${project.name}</div>
              <div class="ws-meta">
                <div class="ws-meta-item"><span class="l">Customer</span><span class="v">${project.customer}</span></div>
                <div class="ws-meta-item"><span class="l">Engineer</span><span class="v">${project.engineer}</span></div>
              </div>
            </div>
          </div>
          <div class="ws-actions-row">
            <button class="btn" onclick="showProjectTab('Project BOM')">${icon('bom','')} Open Project BOM</button>
            ${canWriteProject(project) ? permBtn('editRecord', 'Edit Project', null, `openProjectForm('edit', '${project.id}')`, "primary") : ''}
          </div>
        </div>
      </div>
      ${workspaceTabs(['Overview', 'Purchase Orders', 'Project BOM', 'Stock', 'Simulation', 'Manufacturing Deliveries', 'Customer Deliveries', 'Finance', 'History'], tab, 'showProjectTab')}
      ${tabContent}
    </div>
  </div>`;
    }

export function projectBomDisplayRows(projectName) {
      const imported = latestBomImportRecord('project',projectName);
      return imported?.rows?.length ? imported.rows : bomImportExampleRows('project',projectName).map(row => ({ ...row, approved:true }));
    }

export function projectBomPoId(projectName, fgpn) {
      const part = PNS.find(item => item.project === projectName && (item.pn === fgpn || FGPN_MASTER_MAP[item.pn] === fgpn));
      return part?.po || '—';
    }

export function setProjectBomFilter(key, value) {
      state.projectBomFilters[key] = value;
      state.projectBomPage = 1;
      renderPage();
    }

export function setProjectBomPage(page) {
      state.projectBomPage = Math.max(1,page);
      renderPage();
    }

export function clearProjectBomFilters() {
      state.projectBomFilters = { search:'', fgpn:'', type:'' };
      state.projectBomPage = 1;
      renderPage();
    }

export function focusedBomImportPanel(level, target) {
      ensureBomImport(level,target);
      const levelLabel = bomImportLevelLabel(level);
      const stats = bomImportStats();
      const allApproved = state.bomImport.rows.length > 0 && state.bomImport.approvedRows.size === state.bomImport.rows.length;
      if (state.bomImport.stage === 'imported' && state.bomImport.importedRecord) {
        const record = state.bomImport.importedRecord;
        return `<div class="card project-bom-import"><div class="project-bom-import-head"><div><h3>${levelLabel} imported</h3><p>${record.file} is now the validated ${record.version} ${levelLabel}.</p></div><button class="btn" onclick="closeBomImport()">Close</button></div><div class="project-bom-upload-body"><div class="po-audit-summary" style="margin:0;"><div class="po-audit-metric"><span>FGPNs</span><strong>${record.fgpnCount}</strong></div><div class="po-audit-metric"><span>Material rows</span><strong>${record.rows.length}</strong></div><div class="po-audit-metric"><span>Validated fields</span><strong>${record.validatedFields}</strong></div><div class="po-audit-metric"><span>Status</span><strong>Validated</strong></div></div></div></div>`;
      }
      if (!state.bomImport.rows.length) {
        return `<div class="card project-bom-import"><div class="project-bom-import-head"><div><h3>Upload ${levelLabel}</h3><p>${target} · Excel workbook</p></div><button class="btn" onclick="closeBomImport()">Cancel</button></div><div class="project-bom-upload-body"><input id="focusedBomFileInput" type="file" accept=".xlsx,.xls" style="display:none" onchange="bomImportSelectFile(event)"><label class="project-bom-single-upload" for="focusedBomFileInput"><strong>Select ${levelLabel} workbook</strong><span>.xlsx or .xls · maximum 10 MB</span><span class="btn primary" style="display:inline-flex;margin-top:15px;pointer-events:none;">Browse Workbook</span></label><div class="project-bom-upload-actions"><button class="btn" onclick="closeBomImport()">Cancel</button><div><button class="btn" onclick="downloadBomExample()">Download Template</button><button class="btn" onclick="bomImportUseExample()">Use Example Workbook</button></div></div></div></div>`;
      }
      return `<div class="card project-bom-import">
        <div class="project-bom-import-head"><div><h3>Review ${levelLabel}</h3><p>${poEsc(state.bomImport.fileName)} · ${poEsc(state.bomImport.fileSize)}</p></div>${statusBadge(state.bomImport.stage === 'validated' ? 'Validated' : 'Review required',state.bomImport.stage === 'validated' ? 'success' : 'warning')}</div>
        <div class="project-bom-review-meta"><div><span>Finished Good PNs</span><strong>${stats.fgpnCount}</strong></div><div><span>Material rows</span><strong>${state.bomImport.rows.length}</strong></div><div><span>Approved rows</span><strong>${state.bomImport.approvedRows.size}/${state.bomImport.rows.length}</strong></div></div>
        <div class="project-bom-review-table"><div class="bom-import-table-wrap"><table class="bom-import-table"><thead><tr><th>Row</th><th>Finished Good PN</th><th>Material PN</th><th>Description</th><th>Type</th><th>Usage Qty</th><th>Unit</th><th>Supplier</th><th>Scrap %</th><th>Effective Date</th><th>Revision</th><th>Approval</th></tr></thead><tbody>${state.bomImport.rows.map((row,index) => `<tr><td class="mono">${row.excelRow}</td><td>${bomImportCell(row,index,'fgpn')}</td><td>${bomImportCell(row,index,'material')}</td><td>${bomImportCell(row,index,'description','text',true)}</td><td>${bomImportCell(row,index,'materialType')}</td><td>${bomImportCell(row,index,'usageQty','number')}</td><td>${bomImportCell(row,index,'unit')}</td><td>${bomImportCell(row,index,'supplier','text',true)}</td><td>${bomImportCell(row,index,'scrapPct','number')}</td><td>${bomImportCell(row,index,'effectiveDate','date')}</td><td>${bomImportCell(row,index,'revision')}</td><td><button class="btn sm ${state.bomImport.approvedRows.has(index) ? 'primary' : ''}" onclick="toggleBomImportRow(${index})" ${state.bomImport.stage === 'validated' ? '' : 'disabled'}>${state.bomImport.approvedRows.has(index) ? 'Approved' : 'Approve'}</button></td></tr>`).join('')}</tbody></table></div></div>
        <div class="project-bom-review-footer"><button class="btn" onclick="closeBomImport()">Cancel</button><div><button class="btn" onclick="validateBomImportFields()">Validate Fields</button>${state.bomImport.stage === 'validated' ? `<button class="btn" onclick="approveAllBomImportRows()">Approve All</button><button class="btn primary" onclick="importValidatedBom()" ${allApproved ? '' : 'disabled'}>Import ${levelLabel}</button>` : ''}</div></div>
      </div>`;
    }

export function projectBomImportPanel(projectName) { return focusedBomImportPanel('project',projectName); }

export function poBomFocusedImportPanel(poId) { return focusedBomImportPanel('po',poId); }

export function pageBomProjectInline() {
      const project = projectForContext();
      if (state.bomImport.open && state.bomImport.level === 'project' && state.bomImport.target === project.name) return projectBomImportPanel(project.name);
      const record = latestBomImportRecord('project',project.name);
      const rows = projectBomDisplayRows(project.name);
      const version = record?.version || PROJECT_BOM_META.version;
      const fgpnCount = new Set(rows.map(row => row.fgpn)).size;
      const materialCount = new Set(rows.map(row => row.material)).size;
      const enrichedRows = rows.map(row => ({ ...row, poId:projectBomPoId(project.name,row.fgpn) }));
      const fgpnOptions = [...new Set(enrichedRows.map(row => row.fgpn))].sort();
      const typeOptions = [...new Set(enrichedRows.map(row => row.materialType))].sort();
      const query = state.projectBomFilters.search.trim().toLowerCase();
      const filteredRows = enrichedRows.filter(row => {
        if (state.projectBomFilters.fgpn && row.fgpn !== state.projectBomFilters.fgpn) return false;
        if (state.projectBomFilters.type && row.materialType !== state.projectBomFilters.type) return false;
        if (query && !`${row.poId} ${row.fgpn} ${row.material} ${row.description} ${row.materialType} ${row.supplier}`.toLowerCase().includes(query)) return false;
        return true;
      });
      const pageSize = 10;
      const totalPages = Math.max(1,Math.ceil(filteredRows.length / pageSize));
      state.projectBomPage = Math.min(state.projectBomPage,totalPages);
      const pageRows = filteredRows.slice((state.projectBomPage - 1) * pageSize,state.projectBomPage * pageSize);
      return `<div class="card project-bom-clean">
        <div class="project-bom-clean-head"><div class="project-bom-clean-title"><div class="project-bom-file-icon">${icon('FileText','')}</div><div><h3>Project BOM</h3></div></div><div class="project-bom-clean-actions">${tableExportActions('projectBomMaterialsTable',`${project.name} Project BOM`)}</div></div>
        <div class="project-bom-meta"><div class="project-bom-meta-item"><span>Version</span><strong>${version}</strong></div><div class="project-bom-meta-item"><span>Finished Good PNs</span><strong>${fgpnCount}</strong></div><div class="project-bom-meta-item"><span>Unique Materials</span><strong>${materialCount}</strong></div><div class="project-bom-meta-item"><span>Material Rows</span><strong>${rows.length}</strong></div></div>
        <div class="project-bom-table-wrap">
          <div class="project-bom-table-head">
            <h4>Project BOM Materials</h4>
          </div>
          <div class="project-bom-table-filters">
            <div class="tt-search">${icon('search','')}<input value="${poEsc(state.projectBomFilters.search)}" placeholder="Search material, description, supplier…" onchange="setProjectBomFilter('search',this.value)"></div>
            <select class="tt-select" onchange="setProjectBomFilter('fgpn',this.value)"><option value="">All finished-good PNs</option>${fgpnOptions.map(value => `<option value="${poEsc(value)}" ${state.projectBomFilters.fgpn === value ? 'selected' : ''}>${poEsc(value)}</option>`).join('')}</select>
            <select class="tt-select" onchange="setProjectBomFilter('type',this.value)"><option value="">All material types</option>${typeOptions.map(value => `<option value="${poEsc(value)}" ${state.projectBomFilters.type === value ? 'selected' : ''}>${poEsc(value)}</option>`).join('')}</select>
            ${(state.projectBomFilters.search || state.projectBomFilters.fgpn || state.projectBomFilters.type) ? `<button class="btn sm" onclick="clearProjectBomFilters()">Clear</button>` : ''}
          </div>
          <div class="table-scroll"><table id="projectBomMaterialsTable" class="project-bom-table"><thead><tr><th>PO ID</th><th>Finished Good PN</th><th>Material PN</th><th>Description</th><th>Type</th><th>Usage Qty</th><th>Unit</th><th>Supplier</th><th>Revision</th></tr></thead><tbody>${pageRows.length ? pageRows.map(row => `<tr><td class="mono"><strong>${row.poId}</strong></td><td class="mono">${row.fgpn}</td><td class="mono">${row.material}</td><td>${row.description}</td><td>${row.materialType}</td><td class="mono">${row.usageQty}</td><td>${row.unit}</td><td>${row.supplier}</td><td class="mono">${row.revision}</td></tr>`).join('') : `<tr><td colspan="9"><div class="project-bom-filter-empty">No materials match the selected filters.</div></td></tr>`}</tbody></table></div>
          ${paginationBar(filteredRows.length,state.projectBomPage,pageSize,'setProjectBomPage')}
        </div>
      </div>`;
    }
