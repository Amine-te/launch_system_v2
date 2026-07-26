/* ==========================================================================
   permissions.js
   ========================================================================== */

import { state } from '../state.js';
import { icon } from './icons.js';

export const PERMISSIONS = {
      // Core (existing modules)
      newProject: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false, prod_coord: false, admin: false },
      uploadPo: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false, prod_coord: false, admin: false },
      uploadBom: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false, prod_coord: false, admin: false },
      // M05 — Launch Manufacturing Simulation. Plant Manager: No. Launch Manager/Engineer: Yes (own). Wh TL/Personnel: No.
      runSimulation: { engineer: true, manager: true, plant: 'view', wh_lead: false, wh_staff: false, prod_coord: false, admin: false },
      exportMissingMaterialList: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false },
      uploadMeetingMinutes: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false },
      editThresholds: { engineer: true, manager: true, plant: 'view', wh_lead: false, wh_staff: false },
      editRecord: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false }, // generic edit (project/po)
      deleteRecord: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false },

      // M08 – Manufacturing Delivery
      viewMfgDelivery: { engineer: true, manager: true, plant: true, wh_lead: true, wh_staff: false, prod_coord: false, admin: false },
      requestMfgDelivery: { engineer: false, manager: false, plant: false, wh_lead: false, wh_staff: false },
      approveMfgDelivery: { engineer: false, manager: true, plant: false, wh_lead: false, wh_staff: false },
      createMfgDelivery: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false }, // Engineer/Manager can create delivery instructions
      editMfgDelivery: { engineer: false, manager: false, plant: false, wh_lead: false, wh_staff: false },
      deleteMfgDelivery: { engineer: false, manager: false, plant: false, wh_lead: false, wh_staff: false },
      confirmMfgDelivery: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false, prod_coord: false, admin: false },
      updateMfgStatus: { engineer: false, manager: false, plant: false, wh_lead: true, wh_staff: false, prod_coord: false, admin: false },
      uploadSignedDoc: { engineer: false, manager: false, plant: false, wh_lead: true, wh_staff: false, prod_coord: false, admin: false },
      printDeliveryNote: { engineer: true, manager: true, plant: true, wh_lead: true, wh_staff: false },

      // M09 – Customer Delivery
      // Launch Engineer: can create delivery, generate delivery instruction, record confirmation, view deliveries for assigned projects. Cannot change transport cost or manage delivery methods.
      // Plant Manager: can view all deliveries and monitor progress. Cannot create or modify deliveries.
      // Warehouse Team Leader: read-only, can view delivery instructions related to shipments already sent.
      // Warehouse Personnel: no access.
      // System Administrator: manages delivery methods and transport costs, and confirmation methods.
      viewCustDelivery: { engineer: true, manager: true, plant: true, wh_lead: false, wh_staff: false, prod_coord: false, admin: false },
      createCustDelivery: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false, admin: false },
      generateDeliveryInstruction: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false, admin: false },
      editCustDelivery: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false, admin: false },
      deleteCustDelivery: { engineer: false, manager: true, plant: false, wh_lead: false, wh_staff: false, admin: true },
      // (confirmCustDelivery superseded — see recordDeliveryConfirmation, the single FR-07-compliant confirmation path)
      recordDeliveryConfirmation: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false, admin: false },
      prepareFG: { engineer: false, manager: false, plant: false, wh_lead: false, wh_staff: false, prod_coord: true, admin: false },
      confirmShipment: { engineer: false, manager: false, plant: false, wh_lead: false, wh_staff: false, prod_coord: false, admin: false },
      changeTransportCost: { engineer: false, manager: false, plant: false, wh_lead: false, wh_staff: false, admin: true },
      manageDeliveryMethods: { engineer: false, manager: false, plant: false, wh_lead: false, wh_staff: false, admin: true },

      // M10 – Finance
      viewFinance: { engineer: 'summary', manager: true, plant: true, wh_lead: false, wh_staff: false, prod_coord: false, admin: false },
      uploadInvoice: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false, prod_coord: false, admin: false },
      editInvoice: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false, prod_coord: false, admin: false },
      deleteInvoice: { engineer: false, manager: false, plant: false, wh_lead: false, wh_staff: false, prod_coord: false, admin: false },
      editPrice: { engineer: true, manager: true, plant: false, wh_lead: false, wh_staff: false, prod_coord: false, admin: false },

      // M12 – Audit
      viewAudit: { engineer: 'assigned', manager: 'all', plant: 'all', wh_lead: false, wh_staff: false, prod_coord: false, admin: false },
      deleteAuditLog: { engineer: false, manager: false, plant: false, wh_lead: false, wh_staff: false, prod_coord: false, admin: false },
      viewProduction: { engineer: true, manager: true, plant: true, wh_lead: false, wh_staff: false, prod_coord: true, admin: false },
      markProductionDone: { engineer: false, manager: false, plant: false, wh_lead: false, wh_staff: false, prod_coord: true, admin: false },
      markPackaged: { engineer: false, manager: false, plant: false, wh_lead: false, wh_staff: false, prod_coord: true, admin: false },
      rollbackPoStatus: { engineer: true, manager: false, plant: false, wh_lead: false, wh_staff: false, prod_coord: false, admin: false },
      createUser: { admin: true },
      editUser: { admin: true },
      deleteUser: { admin: false },
      lockUser: { admin: true },
      unlockUser: { admin: true },
      resetPassword: { admin: true },
      assignProjects: { admin: true },
      manageCustomers: { admin: true },
      manageFGPN: { admin: true },
      manageMaterialTypes: { admin: true },
      manageManufacturingReceivers: { admin: true },
      viewSystemActivity: { admin: true },
      configureSystem: { admin: true },
    };

export function can(actionKey) {
      const rule = PERMISSIONS[actionKey];
      if (!rule) return true; // unmodeled actions default open (existing behavior preserved)
      return Object.prototype.hasOwnProperty.call(rule, state.currentRole) ? rule[state.currentRole] : false;
    }

export function permBtn(actionKey, label, iconName, onClick, extraClass) {
      const state = can(actionKey);
      if (state === false) return '';
      const cls = `btn sm ${extraClass || ''}`.trim();
      if (state === 'view') {
        return `<span class="btn-tip-wrap"><button class="${cls} disabled" disabled>${iconName ? icon(iconName, '') : ''} ${label}</button><span class="btn-tip">Insufficient permissions</span></span>`;
      }
      return `<button class="${cls}" onclick="${onClick}">${iconName ? icon(iconName, '') : ''} ${label}</button>`;
    }

export function permIconBtn(actionKey, title, iconName, onClick, extraClass) {
      const state = can(actionKey);
      if (state === false) return '';
      if (state === 'view') {
        return `<div class="icon-btn disabled ${extraClass || ''}" title="">${icon(iconName, '')}<span class="btn-tip">Insufficient permissions</span></div>`;
      }
      return `<div class="icon-btn ${extraClass || ''}" title="${title}" onclick="${onClick}">${icon(iconName, '')}<span class="btn-tip">${title}</span></div>`;
    }
