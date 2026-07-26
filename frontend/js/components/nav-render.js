/* ==========================================================================
   nav-render.js
   ========================================================================== */

import { PAGE_META } from './breadcrumb.js';
import { openModal } from './modal.js';
import { NAV, NAVIGATION_HISTORY_LIMIT, ROLE_PERSONA, explorerOpen } from './nav-config.js';
import { assignedProjectNames, beginBomImport, canWriteProject, pnsForPo, posForProject, visibleProjects, writableProjects } from './shared-tables.js';
import { AUDIT_LOGS, BOM_IMPORT_RECORDS, CUST_DELIVERIES, MFG_DELIVERIES, PNS, POS, PO_BOM_FILES, PRODUCTION_ORDERS, PROJECTS } from '../data/mock-data.js';
import { renderAll } from '../main.js';
import { openProjectForm } from '../pages/projects.js';
import { productionActor } from '../pages/purchase-orders.js';
import { renderPage } from '../pages/router.js';
import { state } from '../state.js';
import { chevIcon, icon } from '../utils/icons.js';
import { poSelected } from '../utils/table-state.js';

export function renderNav() {
      const items = NAV[state.currentRole] || [];
      let html = '';
      items.forEach(item => {
        if (item.children) {
          const isExpanded = state.expandedGroups[item.id] ?? item.children.some(c => c.id === state.currentPage);
          const groupActive = item.children.some(c => c.id === state.currentPage);
          html += `<div class="nav-group">
        <div class="nav-item ${isExpanded ? 'expanded' : ''} ${groupActive && !isExpanded ? 'active' : ''}" onclick="toggleGroup('${item.id}')">
          ${icon(item.icon)} <span>${item.label}</span> ${chevIcon}
        </div>
        <div class="nav-children ${isExpanded ? 'open' : ''}">
          ${item.children.map(c => `<div class="nav-sub ${c.id === state.currentPage ? 'active' : ''}" onclick="navigate('${c.id}')">${c.label}</div>`).join('')}
        </div>
      </div>`;
        } else {
          const sectionPages = {
            'project-list': ['project-list','project-workspace','project-form'],
            'mfg-delivery-list': ['mfg-delivery-list','mfg-delivery-create','mfg-delivery-workspace','mfg-delivery-verify','mfg-delivery-history'],
            'cust-delivery-list': ['cust-delivery-list','cust-delivery-create','cust-delivery-workspace','cust-delivery-history'],
            'finance-dashboard': ['finance-dashboard','finance-revenue','finance-invoices','finance-forecast','finance-prices'],
            'audit-logs': ['audit-logs','audit-detail'],
          };
          const directActive = (sectionPages[item.id] || [item.id]).includes(state.currentPage);
          html += `<div class="nav-item ${directActive ? 'active' : ''}" onclick="navigate('${item.id}')">${icon(item.icon)} <span>${item.label}</span></div>`;
        }
      });
      document.getElementById('navScroll').innerHTML = html;
    }

export function toggleGroup(id) { state.expandedGroups[id] = !(state.expandedGroups[id] ?? true); renderNav(); }

export function toggleSidebar() {
      const sidebar = document.querySelector('.sidebar');
      const isMobile = window.innerWidth <= 980;
      if (isMobile) {
        sidebar.classList.toggle('mobile-open');
        return;
      }
      state.sidebarCollapsed = !state.sidebarCollapsed;
      sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
      localStorage.setItem('sidebarCollapsed', JSON.stringify(state.sidebarCollapsed));
    }

export function initSidebarState() {
      const sidebar = document.querySelector('.sidebar');
      const isMobile = window.innerWidth <= 980;
      if (isMobile) {
        sidebar.classList.remove('collapsed');
      } else {
        sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
      }
    }

window.addEventListener('resize', initSidebarState);

export function captureNavigationState() {
      return {
        page: state.currentPage,
        openContext: { ...state.openContext },
        activeTab: { ...state.activeTab },
        openMfgDeliveryId: state.openMfgDeliveryId,
        mfgActiveTab: state.mfgActiveTab,
        openCustDeliveryId: state.openCustDeliveryId,
        custActiveTab: state.custActiveTab,
        projectOpsSelectedPo: state.projectOpsSelectedPo,
        scrollY: window.scrollY || 0,
      };
    }

export function restoreNavigationState(state) {
      state.currentPage = state.page === 'sim-history' ? 'sim-launch' : (state.page === 'production-board' ? 'po-list' : state.page);
      state.openContext = { ...state.openContext, ...(state.openContext || {}) };
      state.activeTab = { ...state.activeTab, ...(state.activeTab || {}) };
      state.openMfgDeliveryId = state.openMfgDeliveryId || state.openMfgDeliveryId;
      state.mfgActiveTab = state.mfgActiveTab || 'Overview';
      state.openCustDeliveryId = state.openCustDeliveryId || state.openCustDeliveryId;
      state.custActiveTab = state.custActiveTab || 'Overview';
      state.projectOpsSelectedPo = state.projectOpsSelectedPo || '';
      state.notifOpen = false; state.qaOpen = false; state.gsOpen = false;
      renderAll();
      requestAnimationFrame(() => window.scrollTo({ top:Number(state.scrollY || 0), behavior:'auto' }));
    }

export function navigationStateLabel(state) {
      if (!state) return 'previous page';
      const context = state.openContext || {};
      return ({
        dashboard:'Dashboard',
        'project-list':'Projects',
        'project-workspace':`${context.project || 'Project'} workspace`,
        'po-list':'Purchase Orders',
        'po-workspace':`${context.po || 'PO'} workspace`,
        'pn-workspace':`${context.pn || 'PN'} workspace`,
        'po-upload':'PO upload',
        'mfg-delivery-list':'Manufacturing Deliveries',
        'mfg-delivery-create':'Manufacturing Delivery',
        'cust-delivery-list':'Customer Deliveries',
        'cust-delivery-create':'Customer Delivery',
        'sim-launch':'Simulation',
      })[state.page] || (PAGE_META[state.page]?.crumb?.slice(-1)[0]?.l || 'previous page');
    }

export function restorePreviousNavigation(fallbackPage = 'dashboard') {
      const previous = state.navigationHistory.pop();
      if (previous) return restoreNavigationState(previous);
      navigate(fallbackPage,{ replace:true });
    }

export function navigateBack(fallbackPage = 'dashboard') {
      state.navigationBackFallback = fallbackPage;
      if (state.navigationBrowserDepth > 0) {
        window.history.back();
        return;
      }
      restorePreviousNavigation(fallbackPage);
    }

export function resetBrowserNavigationState() {
      state.navigationBrowserDepth = 0;
      try { window.history.replaceState({ launchOpsNavigation:true, depth:0 },'',window.location.href); } catch (error) { /* file preview fallback */ }
    }

window.addEventListener('popstate',event => {
      const previousDepth = state.navigationBrowserDepth;
      state.navigationBrowserDepth = Math.max(0,Number(event.state?.depth || 0));
      if (state.navigationBrowserDepth < previousDepth) restorePreviousNavigation(state.navigationBackFallback);
      state.navigationBackFallback = 'dashboard';
    });

resetBrowserNavigationState();

export function applyAccountChange(account) {
      // Logged-out state now also fires onAccountChange (with null), since
      // account-switcher.js's logout() is a real thing now, not a stub.
      // There's no role to switch to in that case -- leave whatever the
      // user was last looking at alone rather than crashing on
      // account.role.
      if (!account) return;
      state.currentRole = account.role; state.expandedGroups = {}; state.currentPage = 'dashboard'; state.navigationHistory = []; resetBrowserNavigationState(); state.productionStatusFilter = 'All'; poSelected.clear(); renderAll(); }

export function navigate(page, options = {}) {
      if (page === 'sim-history') page = 'sim-launch';
      if (page === 'production-board') page = 'po-list';
      if (page === 'project-create') {
        openProjectForm('create');
        return;
      }
      const administratorPages = new Set(['admin-users', 'admin-roles', 'admin-project-assignments', 'admin-reference-data', 'admin-system-activity', 'admin-user-details']);
      if (administratorPages.has(page) && state.currentRole !== 'admin') {
        openModal('Administrator access required', 'This workspace is available only to the System Administrator.');
        return;
      }
      const adminAllowedPages = new Set(['dashboard', 'profile', 'admin-users', 'admin-roles', 'admin-project-assignments', 'admin-reference-data', 'admin-system-activity', 'admin-user-details']);
      if (state.currentRole === 'admin' && !adminAllowedPages.has(page)) {
        openModal('Restricted workspace', 'Administrators access the administration workspace only. Engineering, warehouse, and finance workflows remain unavailable for this role.');
        state.currentPage = 'admin-users';
        renderAll();
        return;
      }
      if (state.currentRole === 'engineer' && ['project-workspace','po-workspace','pn-workspace','pn-bom-upload','bom-tree'].includes(page)) {
        const assigned = assignedProjectNames();
        if (!assigned.has(state.openContext.project)) {
          const project = visibleProjects()[0];
          const po = project ? posForProject(project.name)[0] : null;
          const pn = po ? pnsForPo(po.id)[0] : null;
          if (project) state.openContext.project = project.name;
          if (po) state.openContext.po = po.id;
          if (pn) state.openContext.pn = pn.pn;
        }
      }
      if (page === 'po-upload' && !writableProjects().some(project => project.name === state.poIntake.project)) {
        state.poIntake.project = writableProjects()[0]?.name || '';
      }
      if (options.clearHistory) state.navigationHistory = [];
      if (!options.replace && page !== state.currentPage) {
        state.navigationHistory.push(captureNavigationState());
        if (state.navigationHistory.length > NAVIGATION_HISTORY_LIMIT) state.navigationHistory.shift();
        state.navigationBrowserDepth += 1;
        try { window.history.pushState({ launchOpsNavigation:true, depth:state.navigationBrowserDepth },'',window.location.href); } catch (error) { state.navigationBrowserDepth = 0; }
      }
      state.currentPage = page; state.notifOpen = false; state.qaOpen = false; state.gsOpen = false; renderAll();
      if (!options.preserveScroll) requestAnimationFrame(() => window.scrollTo({ top:0, behavior:'auto' }));
    }

export function openPo(poId, tab, navOptions = {}) {
      const po = POS.find(item => item.id === poId);
      if (po && state.currentRole === 'engineer' && !assignedProjectNames().has(po.project)) {
        openModal('Purchase order outside your assignment', `${po.id} belongs to ${po.project}, which is not assigned to ${ROLE_PERSONA.engineer.name}.`);
        return;
      }
      state.openContext.po = poId;
      if (po) {
        state.openContext.project = po.project;
        const firstPn = PNS.find(item => item.po === poId);
        if (firstPn) state.openContext.pn = firstPn.pn;
      }
      state.activeTab.po = tab || 'Overview';
      navigate('po-workspace',navOptions);
    }

export function openPn(pnId, tab, navOptions = {}) {
      const pn = PNS.find(item => item.pn === pnId);
      if (pn && state.currentRole === 'engineer' && !assignedProjectNames().has(pn.project)) {
        openModal('Part Number outside your assignment', `${pn.pn} belongs to ${pn.project}, which is not assigned to ${ROLE_PERSONA.engineer.name}.`);
        return;
      }
      state.openContext.pn = pnId;
      if (pn) { state.openContext.po = pn.po; state.openContext.project = pn.project; }
      if (tab) state.activeTab.pn = tab;
      navigate('pn-workspace',navOptions);
    }

export function openPoVersionCompare(poId, versionA, versionB) {
      state.openContext.po = poId;
      state.openContext.compareType = 'po';
      state.poVersionCompareA = versionA;
      state.poVersionCompareB = versionB;
      state.versionCompareSearch = '';
      state.activeTab.po = 'PO Versions';
      navigate('po-version-compare');
    }

export function openBomVersionCompare(pnId, versionA, versionB) {
      state.openContext.pn = pnId;
      state.openContext.compareType = 'bom';
      state.bomVersionCompareA = versionA;
      state.bomVersionCompareB = versionB;
      state.versionCompareSearch = '';
      state.activeTab.pn = 'BOM Versions';
      navigate('bom-version-compare');
    }

export function showProjectTab(tab) { state.activeTab.project = tab; renderPage(); }

export function showPoTab(tab) { state.activeTab.po = tab; renderPage(); }

export function showPnTab(tab) { state.activeTab.pn = tab; renderPage(); }

export function toggleExplorer(key) { explorerOpen[key] = !explorerOpen[key]; renderPage(); }

export function openPnBomUpload(pnId) {
      const pn = PNS.find(item => item.pn === pnId);
      if (pn && state.currentRole === 'engineer' && !assignedProjectNames().has(pn.project)) {
        openModal('BOM upload not permitted', `${pn.pn} belongs to a project outside your assignment.`);
        return;
      }
      const project = PROJECTS.find(item => item.name === pn?.project);
      if (project && !canWriteProject(project)) {
        openModal('BOM upload not permitted', `Your role has read-only access to ${project.name}. Only an assigned Launch Engineer or Launch Manager may upload a BOM version.`);
        return;
      }
      state.openContext.pn = pnId;
      if (pn) { state.openContext.po = pn.po; state.openContext.project = pn.project; }
      beginBomImport('pn', pnId, false);
      navigate('pn-bom-upload');
    }

export function confirmDeletePo(poId) {
      const po = POS.find(item => item.id === poId);
      if (!po) return openModal('Purchase order not found', `${poId} is no longer available.`);
      const manufacturingCount = MFG_DELIVERIES.filter(delivery => delivery.po === poId).length;
      const customerCount = CUST_DELIVERIES.filter(delivery => delivery.po === poId).length;
      if (manufacturingCount || customerCount) {
        openModal('Purchase order deletion blocked', `${poId} has ${manufacturingCount} manufacturing and ${customerCount} customer delivery record${manufacturingCount + customerCount === 1 ? '' : 's'}. These traceability records must be retained.`);
        return;
      }
      openModal(`Delete ${poId}?`, 'The purchase order, its part numbers and its BOM working records will be removed. The deletion event remains in the audit history.', () => deletePoRecord(poId), 'Delete');
    }

export function deletePoRecord(poId) {
      const poIndex = POS.findIndex(item => item.id === poId);
      if (poIndex < 0) return;
      const [po] = POS.splice(poIndex,1);
      for (let index = PNS.length - 1; index >= 0; index -= 1) if (PNS[index].po === poId) PNS.splice(index,1);
      for (let index = PRODUCTION_ORDERS.length - 1; index >= 0; index -= 1) if (PRODUCTION_ORDERS[index].po === poId) PRODUCTION_ORDERS.splice(index,1);
      for (let index = PO_BOM_FILES.length - 1; index >= 0; index -= 1) if (PO_BOM_FILES[index].po === poId) PO_BOM_FILES.splice(index,1);
      for (let index = BOM_IMPORT_RECORDS.length - 1; index >= 0; index -= 1) {
        if (BOM_IMPORT_RECORDS[index].level === 'po' && BOM_IMPORT_RECORDS[index].target === poId) BOM_IMPORT_RECORDS.splice(index,1);
      }
      AUDIT_LOGS.unshift({
        id:`AUD-${14000 + AUDIT_LOGS.length}`,
        date:new Date().toISOString().slice(0,16).replace('T',' '),
        user:productionActor(),
        module:'Purchase Order',
        action:'Purchase order deleted',
        entity:poId,
        project:po.project,
        po:poId,
        details:`${poId} and its linked working records were deleted before any delivery record was created.`,
        evidence:'Deletion confirmation',
      });
      if (state.openContext.po === poId) state.openContext.po = posForProject(po.project)[0]?.id || '';
      renderPage();
    }

export function confirmDeleteProject(projectId) {
      const project = PROJECTS.find(p => p.id === projectId || p.name === projectId);
      const linked = project ? POS.filter(po => po.project === project.name) : [];
      if (linked.length) {
        openModal('Project deletion blocked', `${project.name} contains ${linked.length} purchase order${linked.length === 1 ? '' : 's'}. M01-AC-05 requires every linked PO to be archived or reassigned before the project can be deleted.`);
        return;
      }
      openModal('Delete ' + (project?.name || projectId) + '?', 'This empty project can be deleted after confirmation. The action will be written to the audit history.');
    }

export function stop(e) { e.stopPropagation(); }
