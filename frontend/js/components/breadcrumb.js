/* ==========================================================================
   breadcrumb.js
   ========================================================================== */

import { navigationStateLabel } from './nav-render.js';
import { projectForContext } from './shared-tables.js';
import { CUST_DELIVERIES, MFG_DELIVERIES } from '../data/mock-data.js';
import { PROJECTS } from '../data/projects-store.js';
import { state } from '../state.js';
import { icon } from '../utils/icons.js';
import { exportHtmlValue } from '../utils/table-helpers.js';
import { mfgWizard } from '../utils/table-state.js';

export const PAGE_META = {
      dashboard: { crumb: [{ l: 'Dashboard' }], title: null },
      'project-list': { crumb: [{ l: 'Projects', p: 'project-list' }, { l: 'Project List' }], title: 'Projects', sub: null },
      'project-form': { crumb: [{ l: 'Projects', p: 'project-list' }, { l: 'Project Form' }], title: null },
      'project-workspace': { crumb: [{ l: 'Projects', p: 'project-list' }, { l: 'BMW X5' }], title: null },
      'po-list': { crumb: [{ l: 'Purchase Orders', p: 'po-list' }, { l: 'All Purchase Orders' }], title: 'Purchase Orders', sub: 'Every PO across all projects' },
      'production-packing': { crumb: [{ l: 'Production & Packing' }], title: null, sub: null },
      'po-upload': { crumb: [{ l: 'Purchase Orders', p: 'po-list' }, { l: 'Upload Purchase Order' }], title: 'Upload Purchase Order', sub: 'A guided five-step wizard' },
      'pn-bom-upload': { crumb: [{ l: 'Projects', p: 'project-list' }, { l: 'BMW X5', p: 'project-workspace' }, { l: 'PO-00045', p: 'po-workspace' }, { l: 'Upload PN BOM' }], title: null },
      'po-workspace': { crumb: [{ l: 'Projects', p: 'project-list' }, { l: 'BMW X5', p: 'project-workspace' }, { l: 'PO-00045' }], title: null },
      'pn-workspace': { crumb: [{ l: 'Projects', p: 'project-list' }, { l: 'BMW X5', p: 'project-workspace' }, { l: 'PO-00045', p: 'po-workspace' }, { l: 'PN100' }], title: null },
      'bom-tree': { crumb: [{ l: 'BOM', p: 'bom-tree' }, { l: 'BOM Hierarchy' }], title: 'BOM Hierarchy', sub: 'Project → PO → PN → Materials' },
      'bom-po': { crumb: [{ l: 'BOM', p: 'bom-tree' }, { l: 'PO BOM' }], title: 'PO BOM', sub: 'Upload a multi-FGPN workbook or generate from PN BOMs' },
      'po-version-compare': { crumb: [{ l: 'Purchase Orders', p: 'po-list' }, { l: 'Purchase Order Version Comparison' }], title: 'Purchase Order Version Comparison', sub: 'Compare saved PO versions and trace changes' },
      'bom-version-compare': { crumb: [{ l: 'BOM', p: 'bom-tree' }, { l: 'BOM Version Comparison' }], title: 'BOM Version Comparison', sub: 'Compare saved BOM versions and trace material changes' },
      'sim-launch': { crumb: [{ l: 'Simulation' }], title: null },
      'sim-history': { crumb: [{ l: 'Simulation' }], title: null },
      'material-detail': { crumb: [{ l: 'Stock', p: 'stock-dashboard' }, { l: 'MAT-5512' }], title: null },
      'stock-dashboard': { crumb: [{ l: 'Stock', p: 'stock-dashboard' }, { l: 'Dashboard' }], title: null, sub: null },
      'stock-reception': { crumb: [{ l: 'Stock', p: 'stock-dashboard' }, { l: 'Reception' }], title: null, sub: null },
      'stock-cutman': { crumb: [{ l: 'Stock', p: 'stock-dashboard' }, { l: 'CutMan Import' }], title: null, sub: null },
      'stock-transit': { crumb: [{ l: 'Stock', p: 'stock-dashboard' }, { l: 'Transit Stock' }], title: null, sub: null },
      'stock-thresholds': { crumb: [{ l: 'Stock', p: 'stock-dashboard' }, { l: 'Thresholds' }], title: null, sub: null },
      'stock-history': { crumb: [{ l: 'Stock', p: 'stock-dashboard' }, { l: 'History' }], title: null, sub: null },
      'wh-stock': { crumb: [{ l: 'Warehouse Stock' }], title: null, sub: null },
      'wh-cutting': { crumb: [{ l: 'CutMan', p: 'stock-cutman' }, { l: 'WIP Transfer' }], title: null, sub: null },
      'login': { crumb: [{ l: 'Login' }], title: 'Login', sub: 'Sign in to Adient Launch Management ERP' },
      'reports': { crumb: [{ l: 'Reports' }], title: 'Reports', sub: 'Read-only summaries' },
      profile: { crumb: [{ l: 'Profile' }], title: 'Profile', sub: null },

      /* ---- M08 ---- */
      'mfg-delivery-list': { crumb: [{ l: 'Manufacturing Deliveries', p: 'mfg-delivery-list' }, { l: 'Deliveries' }], title: 'Manufacturing Deliveries', sub: 'Warehouse-to-manufacturing delivery requests' },
      'mfg-delivery-create': { crumb: [{ l: 'Manufacturing Deliveries', p: 'mfg-delivery-list' }, { l: 'Create Delivery' }], title: 'Create Manufacturing Delivery', sub: null },
      'mfg-delivery-workspace': { crumb: [{ l: 'Manufacturing Deliveries', p: 'mfg-delivery-list' }, { l: 'MD-0031' }], title: null },
      'mfg-delivery-verify': { crumb: [{ l: 'Manufacturing Deliveries', p: 'mfg-delivery-list' }, { l: 'Verify Delivery Code' }], title: 'Verify Delivery Code', sub: 'Warehouse Team Leader code entry for delivery access' },
      'mfg-delivery-history': { crumb: [{ l: 'Manufacturing Deliveries', p: 'mfg-delivery-list' }, { l: 'Delivery History' }], title: 'Manufacturing Delivery History', sub: 'Every delivery ever recorded' },

      /* ---- M09 ---- */
      'cust-delivery-list': { crumb: [{ l: 'Customer Deliveries', p: 'cust-delivery-list' }, { l: 'Deliveries' }], title: 'Customer Deliveries', sub: 'Finished goods delivered to customers' },
      'cust-delivery-create': { crumb: [{ l: 'Customer Deliveries', p: 'cust-delivery-list' }, { l: 'Create Delivery' }], title: null },
      'cust-delivery-workspace': { crumb: [{ l: 'Customer Deliveries', p: 'cust-delivery-list' }, { l: 'CD-0018' }], title: null },
      'cust-delivery-history': { crumb: [{ l: 'Customer Deliveries', p: 'cust-delivery-list' }, { l: 'Delivery History' }], title: 'Customer Delivery History', sub: 'Every customer delivery ever recorded' },

      /* ---- M10 ---- */
      'finance-dashboard': { crumb: [{ l: 'Finance', p: 'finance-dashboard' }, { l: 'Overview' }], title: null },
      'finance-revenue': { crumb: [{ l: 'Finance', p: 'finance-dashboard' }, { l: 'Revenue' }], title: 'Revenue', sub: 'Revenue and forecast by project and customer' },
      'finance-invoices': { crumb: [{ l: 'Finance', p: 'finance-dashboard' }, { l: 'Invoices' }], title: 'Invoice Management', sub: 'Track and manage customer invoices' },
      'finance-forecast': { crumb: [{ l: 'Finance', p: 'finance-dashboard' }, { l: 'Forecast' }], title: 'Forecast', sub: 'Monthly forecast vs actual revenue' },
      'finance-prices': { crumb: [{ l: 'Finance', p: 'finance-dashboard' }, { l: 'Prices' }], title: 'Price Management', sub: 'Unit prices per finished good, per customer' },

      /* ---- M12 ---- */
      'audit-logs': { crumb: [{ l: 'Audit', p: 'audit-logs' }, { l: 'Activity Logs' }], title: 'Audit Logs', sub: 'Every recorded action across the plant' },
      'audit-detail': { crumb: [{ l: 'Audit', p: 'audit-logs' }, { l: 'Entity Detail' }], title: null },

      /* ---- M00 Admin ---- */
      'admin-users': { crumb: [{ l: 'Administration', p: 'admin-users' }, { l: 'Users' }], title: null },
      'admin-user-details': { crumb: [{ l: 'Administration', p: 'admin-users' }, { l: 'User Details' }], title: null },
      'admin-roles': { crumb: [{ l: 'Administration', p: 'admin-users' }, { l: 'Roles & Access' }], title: null },
      'admin-project-assignments': { crumb: [{ l: 'Administration', p: 'admin-users' }, { l: 'Project Assignments' }], title: null },
      'admin-reference-data': { crumb: [{ l: 'Administration', p: 'admin-users' }, { l: 'Reference Lists' }], title: null },
      'business-rules': { crumb: [{ l: 'Administration', p: 'admin-users' }, { l: 'Business Rules' }], title: 'Business Rule Register', sub: 'Recommended resolutions for the SRS open points' },
      'admin-system-activity': { crumb: [{ l: 'Administration', p: 'admin-users' }, { l: 'Login Audit' }], title: null },
    };

export function renderBreadcrumb() {
      let meta = PAGE_META[state.currentPage] || { crumb: [{ l: state.currentPage }] };
      if (state.currentPage === 'project-form') {
        meta = { ...meta, crumb:[{ l:'Projects', p:'project-list' }, { l:state.projectForm.mode === 'edit' ? 'Edit Project' : 'New Project' }] };
      }
      if (['project-workspace','po-workspace','pn-workspace','pn-bom-upload'].includes(state.currentPage)) {
        const project = projectForContext();
        const dynamic = [{ l:'Projects', p:'project-list' }, { l:project.name, p:'project-workspace' }];
        if (state.currentPage !== 'project-workspace') dynamic.push({ l:state.openContext.po, p:'po-workspace' });
        if (state.currentPage === 'pn-workspace') dynamic.push({ l:state.openContext.pn });
        if (state.currentPage === 'pn-bom-upload') dynamic.push({ l:'Upload PN BOM' });
        meta = { ...meta, crumb:dynamic };
      }
      if (state.currentPage === 'po-upload' && ['project-workspace','po-workspace'].includes(state.navigationHistory.at(-1)?.page)) {
        const project = PROJECTS.find(item => item.name === state.poIntake.project) || projectForContext();
        meta = { ...meta, crumb:[{ l:'Projects',p:'project-list' },{ l:project.name,p:'project-workspace' },{ l:'Add Purchase Order' }] };
      }
      if (['mfg-delivery-create','mfg-delivery-workspace','cust-delivery-create','cust-delivery-workspace'].includes(state.currentPage)) {
        const manufacturing = state.currentPage.startsWith('mfg-');
        const delivery = manufacturing ? MFG_DELIVERIES.find(item => item.code === state.openMfgDeliveryId) : CUST_DELIVERIES.find(item => item.code === state.openCustDeliveryId);
        const projectName = state.currentPage.endsWith('-create') ? (manufacturing ? mfgWizard.project : state.custWizard.project) : delivery?.project;
        const poId = state.currentPage.endsWith('-create') ? (manufacturing ? mfgWizard.po : state.custWizard.po) : delivery?.po;
        const finalLabel = state.currentPage.endsWith('-create') ? `Create ${manufacturing ? 'Manufacturing' : 'Customer'} Delivery` : (delivery?.code || 'Delivery');
        if (projectName && poId) meta = { ...meta, crumb:[{ l:'Projects',p:'project-list' },{ l:projectName,p:'project-workspace' },{ l:poId,p:'po-workspace' },{ l:finalLabel }] };
      }
      const html = meta.crumb.map((seg, i) => {
        const isLast = i === meta.crumb.length - 1;
        return `${i > 0 ? '<span class="sep">/</span>' : ''}<span class="seg ${isLast ? 'current' : ''}" ${seg.p && !isLast ? `onclick="navigate('${seg.p}')"` : ''}>${seg.l}</span>`;
      }).join('');
      const previous = state.navigationHistory.at(-1);
      const backLabel = previous ? exportHtmlValue(navigationStateLabel(previous)) : '';
      const back = previous ? `<button class="nav-back-btn" onclick="navigateBack()" title="Back to ${backLabel}" aria-label="Back to ${backLabel}">${icon('chevLeft','')}<span>Back</span></button>` : '';
      document.getElementById('breadcrumb').innerHTML = back + html;
    }
