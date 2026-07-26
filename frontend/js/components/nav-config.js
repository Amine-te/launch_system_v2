/* ==========================================================================
   nav-config.js
   ========================================================================== */

export const NAV = {
      engineer: [
        { id: 'dashboard', label: 'Launch Dashboard', icon: 'dashboard' },
        { id: 'project-list', label: 'Projects', icon: 'projects' },
        { id: 'sim-launch', label: 'Simulation', icon: 'sim' },
        {
          id: 'stock', label: 'Stock', icon: 'stock', children: [
            { id: 'stock-dashboard', label: 'Stock Dashboard' },
            { id: 'stock-reception', label: 'Reception' },
            { id: 'stock-cutman', label: 'CutMan Import' },
            { id: 'stock-transit', label: 'Transit Stock' },
            { id: 'stock-thresholds', label: 'Thresholds' },
            { id: 'stock-history', label: 'History' },
          ]
        },
        { id: 'finance-dashboard', label: 'Finance', icon: 'money' },
        { id: 'audit-logs', label: 'Audit', icon: 'audit' },
      ],
      manager: [], // filled from engineer below, same menu per spec ("Assigned" scoping applied in data, not nav)
      plant: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'project-list', label: 'Projects', icon: 'projects' },
        { id: 'stock-dashboard', label: 'Stock', icon: 'stock' },
        { id: 'finance-dashboard', label: 'Finance', icon: 'money' },
        { id: 'reports', label: 'Reports', icon: 'reports' },
        { id: 'audit-logs', label: 'Audit', icon: 'audit' },
      ],
      wh_lead: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'mfg-delivery-list', label: 'Manufacturing Deliveries', icon: 'truck' },
        { id: 'wh-stock', label: 'Warehouse Stock', icon: 'bom' },
        { id: 'wh-cutting', label: 'Cutting Transfer', icon: 'sim' },
      ],
      wh_staff: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'stock-reception', label: 'Stock Reception', icon: 'stock' },
      ],
      prod_coord: [
        { id: 'dashboard', label: 'Operations Dashboard', icon: 'dashboard' },
        { id: 'production-packing', label: 'Production & Packing', icon: 'PackageCheck' },
      ],
      admin: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        {
          id: 'admin', label: 'Administration', icon: 'audit', children: [
            { id: 'admin-users', label: 'Users' },
            { id: 'admin-project-assignments', label: 'Project Assignments' },
            { id: 'admin-reference-data', label: 'Reference Lists' },
            { id: 'admin-system-activity', label: 'Login Audit' },
            { id: 'admin-roles', label: 'Roles & Access' },
          ]
        },
      ],
    };

NAV.manager = JSON.parse(JSON.stringify(NAV.engineer));

export const ROLE_LABEL = { engineer: 'Launch Engineer', manager: 'Launch Manager', plant: 'Plant Manager', wh_lead: 'Warehouse Team Leader', wh_staff: 'Warehouse Personnel', prod_coord: 'Production & Packing Coordinator', admin: 'System Administrator' };

export const ROLE_PERSONA = {
      engineer:{ name:'Amina Rahal', initials:'AR', email:'a.rahal@launchops.example', site:'Tangier Plant 2' },
      manager:{ name:'Sara Ait Oubou', initials:'SA', email:'s.aitoubou@launchops.example', site:'Launch Department' },
      plant:{ name:'Karim Benali', initials:'KB', email:'k.benali@launchops.example', site:'Tangier Plant 2' },
      wh_lead:{ name:'Mehdi El Idrissi', initials:'ME', email:'m.elidrissi@launchops.example', site:'Main Warehouse' },
      wh_staff:{ name:'Imane Chafai', initials:'IC', email:'i.chafai@launchops.example', site:'Main Warehouse' },
      prod_coord:{ name:'Youssef Mansouri', initials:'YM', email:'y.mansouri@launchops.example', site:'Production & Packaging' },
      admin:{ name:'Rachid Benali', initials:'RB', email:'r.benali@launchops.example', site:'IT Administration' },
    };

export const READONLY_ROLES = ['plant'];

export const QUICK_ACTIONS = {
      engineer: [
        { label: 'Upload PO', icon: 'upload', page: 'po-upload' },
        { label: 'Upload BOM', icon: 'bom', page: 'bom-tree' },
        { label: 'Run Simulation', icon: 'sim', page: 'sim-launch' },
        { label: 'Import CutMan', icon: 'stock', page: 'stock-cutman' },
        { label: 'Create Project', icon: 'createProject', page: 'project-create' },
      ],
      manager: [
        { label: 'Upload PO', icon: 'upload', page: 'po-upload' },
        { label: 'Run Simulation', icon: 'sim', page: 'sim-launch' },
        { label: 'Create Project', icon: 'createProject', page: 'project-create' },
        { label: 'Create Customer Delivery', icon: 'truck', page: 'cust-delivery-list' },
        { label: 'Upload Invoice', icon: 'invoice', page: 'finance-dashboard' },
      ],
      wh_lead: [
        { label: 'Receive Stock', icon: 'upload', page: 'stock-reception' },
        { label: 'Cutting Transfer', icon: 'sim', page: 'wh-cutting' },
        { label: 'Create Delivery', icon: 'truck', page: 'mfg-delivery-list' },
      ],
      wh_staff: [
        { label: 'Receive Stock', icon: 'upload', page: 'stock-reception' },
      ],
      prod_coord: [
        { label: 'Open Production & Packing', icon: 'PackageCheck', page: 'production-packing' },
      ],
      plant: [],
      admin: [],
    };

export const NAVIGATION_HISTORY_LIMIT = 40;

export let treeOpen = { proj: true, po: true, pn100: false };

export let explorerOpen = { 'PO-00045': true, 'PO-2025-011': false };
