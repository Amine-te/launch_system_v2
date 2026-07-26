/* ==========================================================================
   router.js
   ========================================================================== */

import { PAGE_META } from '../components/breadcrumb.js';
import { pageAdminProjectAssignments, pageAdminReferenceData, pageAdminRoles, pageAdminSystemActivity, pageAdminUserDetails, pageAdminUsers } from './admin.js';
import { pageAuditDetail, pageAuditLogs, pageBusinessRules } from './audit.js';
import { pageCustDeliveryCreate, pageCustDeliveryHistory, pageCustDeliveryList, pageCustDeliveryWorkspace } from './customer-delivery.js';
import { roleDashboard } from './dashboards.js';
import { pageFinanceDashboard, pageFinanceForecast, pageFinanceInvoices, pageFinancePrices, pageFinanceRevenue } from './finance.js';
import { pageMfgDeliveryCreate, pageMfgDeliveryHistory, pageMfgDeliveryList, pageMfgDeliveryVerify, pageMfgDeliveryWorkspace } from './manufacturing-delivery.js';
import { pageMaterialDetail, pageStockCutman, pageStockDashboard, pageStockReception, pageStockTransit, pageThresholds, pageWhCutting } from './materials-stock.js';
import { pageBomPo, pageBomTree, pagePnWorkspace, pageVersionCompare } from './parts-bom.js';
import { pageHistory, pageLogin, pagePnBomUpload, pageProfile, pageReports, pageUploadWizard } from './po-intake.js';
import { pageProjectForm, pageProjectList, pageProjectWorkspace } from './projects.js';
import { pagePoList, pagePoWorkspace, pageProductionBoard } from './purchase-orders.js';
import { pageSimLaunch } from './simulation.js';
import { state } from '../state.js';
import { pageHeader, readonlyBanner } from '../utils/helpers.js';

export function renderPage() {
      const meta = PAGE_META[state.currentPage] || { title: state.currentPage };
      let html = readonlyBanner() + pageHeader(meta.title, meta.sub);

      switch (state.currentPage) {
        case 'dashboard': html += roleDashboard(); break;
        case 'project-list': html += pageProjectList(); break;
        case 'project-form': html += pageProjectForm(); break;
        case 'project-workspace': html += pageProjectWorkspace(); break;
        case 'po-list': html += pagePoList(); break;
        case 'production-packing': html += pageProductionBoard(); break;
        case 'po-upload': html += pageUploadWizard('Purchase Order'); break;
        case 'pn-bom-upload': html += pagePnBomUpload(); break;
        case 'po-workspace': html += pagePoWorkspace(); break;
        case 'pn-workspace': html += pagePnWorkspace(); break;
        case 'bom-tree': html += pageBomTree(); break;
        case 'bom-po': html += pageBomPo(); break;
        case 'po-version-compare': html += pageVersionCompare(); break;
        case 'bom-version-compare': html += pageVersionCompare(); break;
        case 'sim-launch': html += pageSimLaunch(); break;
        case 'sim-history': html += pageSimLaunch(); break;
        case 'material-detail': html += pageMaterialDetail(); break;
        case 'stock-dashboard': html += pageStockDashboard(); break;
        case 'stock-reception': html += pageStockReception(); break;
        case 'stock-cutman': html += pageStockCutman(); break;
        case 'stock-transit': html += pageStockTransit(); break;
        case 'stock-thresholds': html += pageThresholds(); break;
        case 'stock-history': html += pageHistory(); break;
        case 'wh-stock': html += pageStockDashboard(); break;
        case 'wh-cutting': html += pageWhCutting(); break;
        case 'reports': html += pageReports(); break;
        case 'profile': html += pageProfile(); break;
        case 'login': html += pageLogin(); break;

        /* ---- M08 ---- */
        case 'mfg-delivery-list': html += pageMfgDeliveryList(); break;
        case 'mfg-delivery-create': html += pageMfgDeliveryCreate(); break;
        case 'mfg-delivery-workspace': html += pageMfgDeliveryWorkspace(); break;
        case 'mfg-delivery-verify': html += pageMfgDeliveryVerify(); break;
        case 'mfg-delivery-history': html += pageMfgDeliveryHistory(); break;

        /* ---- M09 ---- */
        case 'cust-delivery-list': html += pageCustDeliveryList(); break;
        case 'cust-delivery-create': html += pageCustDeliveryCreate(); break;
        case 'cust-delivery-workspace': html += pageCustDeliveryWorkspace(); break;
        case 'cust-delivery-history': html += pageCustDeliveryHistory(); break;

        /* ---- M10 ---- */
        case 'finance-dashboard': html += pageFinanceDashboard(); break;
        case 'finance-revenue': html += pageFinanceRevenue(); break;
        case 'finance-invoices': html += pageFinanceInvoices(); break;
        case 'finance-forecast': html += pageFinanceForecast(); break;
        case 'finance-prices': html += pageFinancePrices(); break;

        /* ---- M12 ---- */
        case 'audit-logs': html += pageAuditLogs(); break;
        case 'audit-detail': html += pageAuditDetail(); break;

        /* ---- M00 Admin ---- */
        case 'admin-users': html += pageAdminUsers(); break;
        case 'admin-user-details': html += pageAdminUserDetails(); break;
        case 'admin-roles': html += pageAdminRoles(); break;
        case 'admin-project-assignments': html += pageAdminProjectAssignments(); break;
        case 'admin-reference-data': html += pageAdminReferenceData(); break;
        case 'business-rules': html += pageBusinessRules(); break;
        case 'admin-system-activity': html += pageAdminSystemActivity(); break;

        default: html += `<div class="empty-state">Page not found.</div>`;
      }
      document.getElementById('content').innerHTML = html;
    }
