/* ==========================================================================
   table-state.js
   ========================================================================== */

export const PAGE_SIZE = 10;

export let projectSort = { key: null, dir: 1 };

export let poSort = { key: null, dir: 1 };

export let poSelected = new Set();

export let poColumns = { version: true, pnCount: true, delivery: true, simulation: true, status: true, lifecycle: true };

export const SAFETY_COEFFICIENT = 2;

export let simSources = { warehouse: true, wip: true, transit: false };

export let simSafetyCoef = SAFETY_COEFFICIENT;

export let stockReceipts = [
      { material: 'MAT-5512', qty: 120, supplier: 'TE Connectivity', received: '2026-07-12', status: 'Received' },
      { material: 'MAT-2208', qty: 300, supplier: 'Leoni', received: '2026-07-11', status: 'In Transit' },
    ];

export let transitMaterials = [
      { code: 'MAT-4471', desc: 'Wiring harness clip', qty: 500, supplier: 'Supplier A', arrival: '2026-06-15', notes: 'Expected to arrive next week', status: 'In Transit' },
      { code: 'MAT-5512', desc: 'Connector housing 4-pin', qty: 100, supplier: 'Supplier B', arrival: '2026-06-13', notes: 'Priority shipment', status: 'In Transit' },
    ];

export let cutmanImports = [
      { file: 'cutman-20260712.csv', date: '2026-07-12', records: 34, status: 'Imported' },
    ];

export let stockTransferDraft = { code: 'MAT-5512', qty: 30, destination: 'Cutting' };

export let stockTransferLogs = [
      { code: 'MAT-5512', qty: 40, from: 'WIP', to: 'Cutting', date: '2026-07-12', by: 'S. Amrani' },
    ];

export let versionCompareFilters = { Added: true, Modified: true, Removed: true, Moved: true, Unchanged: false };

export let thresholdOverrides = {};

export const THRESHOLD_DEFAULTS = {};

export let mfgSort = { key: null, dir: 1 };

export let mfgWizard = {
      project: 'BMW X5',
      po: 'PO-00045',
      fgpn: 'FG-BX5-100',
      fgpns: ['FG-BX5-100'],
      fgpnQtys: { 'FG-BX5-100': 0 },
      selectedMaterials: {},
      qtys: {},
      itemTimes: {},
      receiver: '',
      deliveryDate: '2026-07-18',
      deliveryTime: '09:00',
      priority: 'Normal',
      notes: '',
      code: '',
      generatedAt: '',
      expiresAt: '',
      approval: null,
    };

export const MFG_DELIVERY_RECEIVERS = ['Cell 1 — Cutting Line', 'Cell 2 — Terminal Crimping', 'Cell 3 — Harness Assembly', 'Cell 4 — Final Assembly'];

export let custSort = { key: null, dir: 1 };

export let financeTab = 'dashboard';

export let revenueFilters = { project: '', customer: '', month: '', year: '2026' };

export let auditSort = { key: null, dir: 1 };

export let adminSelectedRole = 'System Administrator';

export let adminUserFilters = { search:'', role:'', status:'', security:'' };

export let adminAssignmentDraft = { project:'BMW X5', userId:'ADM-004' };

export let adminLoginFilters = { search:'', result:'' };
