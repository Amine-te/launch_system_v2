/* ==========================================================================
   state.js
   Single shared mutable-state object for the whole app.

   WHY THIS EXISTS: dozens of functions across every page/component module
   reassign these variables directly (e.g. `currentPage = 'dashboard'`).
   Plain ES modules only allow the module that DECLARES a variable to
   reassign it -- other modules can only read it. Wrapping all reassigned
   values as properties on one exported object sidesteps that limitation
   with zero behavior change: `currentPage = x` becomes `state.currentPage = x`,
   which works fine from any module since we're mutating a property, not
   rebinding the variable itself.
   ========================================================================== */

import { PO_EXTRACTION_SAMPLE } from './data/mock-data.js';

export const state = {
  currentRole: 'engineer',
  currentPage: 'dashboard',
  navigationHistory: [],
  navigationBrowserDepth: 0,
  navigationBackFallback: 'dashboard',
  expandedGroups: {},
  sidebarCollapsed: JSON.parse(localStorage.getItem('sidebarCollapsed') || 'false'),
  notifOpen: false,
  qaOpen: false,
  gsOpen: false,
  globalSearchQuery: '',
  activeTab: {
      project: 'Overview',
      po: 'Overview',
      pn: 'BOM',
    },
  openContext: { project: 'BMW X5', po: 'PO-00045', pn: 'PN100', material: 'MAT-5512', compareType: 'po' },
  projectFilters: { search: '', customer: '', engineer: '', status: '' },
  projectPage: 1,
  projectForm: { mode: 'create', projectId: '', draft: {}, errors: {} },
  projectOpsSelectedPo: '',
  poRollback: { open:false, po:'', reason:'' },
  poFilters: { search: '', project: '', customer: '', status: '', version: '', simulation: '' },
  poPage: 1,
  productionStatusFilter: 'All',
  colMenuOpen: false,
  pnFilters: { search: '', status: '', version: '', bom: '', simulation: '' },
  materialFilters: { search: '', type: '', warehouse: '', missing: '' },
  poBomUpload: { open:false, po:'', fileName:'', fileSize:'', validated:false, imported:false },
  bomImport: { open:false, level:'', target:'', stage:'upload', fileName:'', fileSize:'', rows:[], validationRun:false, approvedRows:new Set(), importedRecord:null },
  projectBomFilters: { search:'', fgpn:'', type:'' },
  projectBomPage: 1,
  simScope: 'project',
  simProject: 'BMW X5',
  simSelectedPOs: new Set(['PO-2025-012', 'PO-2025-011']),
  simSinglePO: 'PO-00045',
  simMode: 'current',
  simPriorityRule: 'earliest_delivery',
  simIncomingMaterials: [
      { material: 'MAT-4471', qty: 300, arrival: '2026-07-20', supplier: 'Amphenol', status: 'Expected' },
      { material: 'MAT-5512', qty: 400, arrival: '2026-07-22', supplier: 'TE Connectivity', status: 'Confirmed' },
    ],
  simMeetingSaved: false,
  simMeetingDate: '2026-07-15',
  simMeetingParticipants: 'A. Haddad, M. Idrissi',
  simMeetingMinutes: '',
  simIncomingMaterialDraft: { material: 'MAT-4471', qty: 0, arrival: '2026-07-20', supplier: '', status: 'Expected' },
  simResult: null,
  simPoVersion: 'v3',
  simBomVersion: 'v3',
  simUseCurrentVersions: true,
  stockReceptionDraft: { material:'MAT-5512', qty:0, supplier:'TE Connectivity', received:new Date().toISOString().slice(0,10), destination:'Warehouse', reference:'' },
  transitDraft: { code: '', desc: '', qty: 0, supplier: '', arrival: '', notes: '', status: 'In Transit' },
  poVersionSelected: 'v3',
  bomVersionSelected: 'v3',
  poVersionCompareA: 'v2',
  poVersionCompareB: 'v3',
  bomVersionCompareA: 'v2',
  bomVersionCompareB: 'v3',
  versionCompareSearch: '',
  thresholdEditing: null,
  mfgFilters: { search: '', project: '', po: '', status: '', receiver: '', date: '' },
  mfgPage: 1,
  mfgWizardStep: 1,
  mfgSimulationContext: { active:false,returnStep:4 },
  mfgLaunchSimulationResult: null,
  mfgCodeVerification: { code: '', message: '', validDelivery: null },
  openMfgDeliveryId: 'MD-0031',
  mfgActiveTab: 'Overview',
  custFilters: { search: '', customer: '', project: '', po: '', status: '', date: '' },
  custPage: 1,
  custWizardStep: 1,
  custWizard: { project: 'BMW X5', po: 'PO-00045', fgpn: '', fgpns: [], fgpnQtys: {}, method: 'Truck', tracking: '', deliveryDate: '', address: 'BMW Group Receiving Center', source: 'global' },
  openCustDeliveryId: 'CD-0018',
  custActiveTab: 'Overview',
  invoiceFilters: { search: '', project: '', customer: '', status: '' },
  auditFilters: { search: '', module: '', project: '', po: '', pn: '', user: '', evidence: '', date: '' },
  auditPage: 1,
  openAuditId: null,
  adminSelectedUserId: 'ADM-001',
  adminReferenceModule: 'customers',
  adminUserForm: { open:false, mode:'create', editingId:'', draft:{}, errors:{} },
  adminReferenceForm: { open:false, mode:'create', editingId:'', draft:{ label:'', project:'', references:'', status:'Active' } },
  poExtraction: JSON.parse(JSON.stringify(PO_EXTRACTION_SAMPLE)),
  poIntake: {
      step: 1, project: 'BMW X5', fileName: '', fileSize: '', uploadedAt: '', extracted: false,
      validated: false, saved: false, reviewTab: 'header', lineSearch: '', correctedFields: new Set(),
      correctedLines: new Set(), validationMessage: '', storedRecordId: '', sourceFile: null
    },
  poValidationPage: 1,
  SIM_DRAFT_DOCUMENTS: [],
  modalConfirmAction: null,
};

