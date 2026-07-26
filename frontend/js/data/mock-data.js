/* ==========================================================================
   mock-data.js
   ========================================================================== */

import { MFG_DELIVERY_RECEIVERS, THRESHOLD_DEFAULTS } from '../utils/table-state.js';

export const PROJECTS = [
      { id: 'PRJ-001', name: 'BMW X5', customer: 'BMW Group', customerRef: 'G05 LCI', engineer: 'A. Haddad', site: 'Tangier Plant 2', startDate: '2026-01-12', targetDate: '2026-10-15', description: 'Launch readiness and series preparation for the BMW X5 seat program.', status: 'On Track', statusType: 'success', pos: 3, progress: 72, health: 88 },
      { id: 'PRJ-002', name: 'Renault Clio V', customer: 'Renault', customerRef: 'BJA Phase 2', engineer: 'S. Amrani', site: 'Tangier Plant 2', startDate: '2026-02-02', targetDate: '2026-09-30', description: 'Controlled launch preparation for the Clio V program.', status: 'At Risk', statusType: 'warning', pos: 2, progress: 41, health: 54 },
      { id: 'PRJ-003', name: 'Peugeot 208', customer: 'Stellantis', customerRef: 'P21', engineer: 'A. Haddad', site: 'Kenitra Plant', startDate: '2026-03-09', targetDate: '2026-11-20', description: 'Industrial launch project for the Peugeot 208 program.', status: 'Blocked', statusType: 'danger', pos: 1, progress: 18, health: 22 },
      { id: 'PRJ-004', name: 'Dacia Sandero', customer: 'Renault', customerRef: 'DJF', engineer: 'M. Idrissi', site: 'Tangier Plant 2', startDate: '2025-11-17', targetDate: '2026-08-22', description: 'Launch and ramp-up governance for the Sandero program.', status: 'On Track', statusType: 'success', pos: 4, progress: 88, health: 96 },
    ];

export const POS = [
      { id: 'PO-00045', project: 'BMW X5', customer: 'BMW Group', version: 'v3', pnCount: 3, status: 'Ready', statusType: 'success', date: '2026-07-08', delivery: '2026-08-15', simStatus: 'Passed', simType: 'success' },
      { id: 'PO-00046', project: 'BMW X5', customer: 'BMW Group', version: 'v1', pnCount: 2, status: 'Ready', statusType: 'success', date: '2026-07-10', delivery: '2026-08-22', simStatus: 'Passed', simType: 'success' },
      { id: 'PO-00047', project: 'BMW X5', customer: 'BMW Group', version: 'v2', pnCount: 2, status: 'Waiting BOM', statusType: 'warning', date: '2026-07-12', delivery: '2026-08-29', simStatus: 'Not Run', simType: 'neutral' },
      { id: 'PO-2025-013', project: 'Renault Clio V', customer: 'Renault', version: 'v1', pnCount: 2, status: 'Waiting BOM', statusType: 'warning', date: '2026-07-06', delivery: '2026-08-02', simStatus: 'Not Run', simType: 'neutral' },
      { id: 'PO-2025-012', project: 'Peugeot 208', customer: 'Stellantis', version: 'v2', pnCount: 1, status: 'Missing Stock', statusType: 'danger', date: '2026-07-02', delivery: '2026-07-28', simStatus: 'Failed', simType: 'danger' },
      { id: 'PO-2025-011', project: 'Dacia Sandero', customer: 'Renault', version: 'v1', pnCount: 4, status: 'Ready', statusType: 'success', date: '2026-06-29', delivery: '2026-07-20', simStatus: 'Passed', simType: 'success' },
    ];

export const PO_LINE_SEED = [
      ['00001','2026-08-03','SEAT-HARNESS','FG-BX5-100','Front seat wiring harness LH','BMW-7451001',120,145.50],
      ['00002','2026-08-03','SEAT-HARNESS','FG-BX5-101','Front seat wiring harness RH','BMW-7451002',80,142.25],
      ['00003','2026-08-05','SEAT-TRIM','FG-BX5-102','Driver seat cushion trim','BMW-7451003',150,89.40],
      ['00004','2026-08-05','SEAT-TRIM','FG-BX5-103','Passenger seat cushion trim','BMW-7451004',200,74.80],
      ['00005','2026-08-07','SEAT-FRAME','FG-BX5-104','Driver seat back frame','BMW-7451005',60,188.00],
      ['00006','2026-08-07','SEAT-FRAME','FG-BX5-105','Passenger seat back frame','BMW-7451006',90,132.75],
      ['00007','2026-08-10','SEAT-MOTOR','FG-BX5-106','Seat adjustment motor assembly','BMW-7451007',25,245.00],
      ['00008','2026-08-10','SEAT-MOTOR','FG-BX5-107','Lumbar support motor assembly','BMW-7451008',40,198.50],
      ['00009','2026-08-12','SEAT-FOAM','FG-BX5-108','Front seat cushion foam','BMW-7451009',75,96.20],
      ['00010','2026-08-12','SEAT-FOAM','FG-BX5-109','Front seat back foam','BMW-7451010',55,116.80],
      ['00011','2026-08-14','SEAT-HEAT','FG-BX5-110','Heated seat control module','BMW-7451011',30,215.40],
      ['00012','2026-08-14','SEAT-HEAT','FG-BX5-111','Seat heating element','BMW-7451012',110,84.60],
      ['00013','2026-08-17','SEAT-BELT','FG-BX5-112','Seat belt buckle assembly','BMW-7451013',95,102.40],
      ['00014','2026-08-17','SEAT-SENSOR','FG-BX5-113','Occupant detection sensor','BMW-7451014',48,171.50],
      ['00015','2026-08-19','SEAT-TRIM','FG-BX5-114','Rear bench trim cover','BMW-7451015',72,128.90],
      ['00016','2026-08-19','SEAT-FOAM','FG-BX5-115','Rear bench cushion foam','BMW-7451016',100,92.75],
      ['00017','2026-08-21','SEAT-FRAME','FG-BX5-116','Rear seat back frame','BMW-7451017',45,154.20],
      ['00018','2026-08-21','SEAT-HARNESS','FG-BX5-117','Rear seat wiring harness','BMW-7451018',88,107.60],
      ['00019','2026-08-24','SEAT-TRIM','FG-BX5-118','Headrest trim set','BMW-7451019',64,139.30],
      ['00020','2026-08-24','SEAT-FOAM','FG-BX5-119','Headrest foam set','BMW-7451020',130,76.50],
      ['00021','2026-08-26','SEAT-MECH','FG-BX5-120','Seat rail mechanism','BMW-7451021',36,204.80],
      ['00022','2026-08-26','SEAT-MECH','FG-BX5-121','Seat recliner mechanism','BMW-7451022',52,167.90],
      ['00023','2026-08-28','SEAT-TRIM','FG-BX5-122','Armrest leather cover','BMW-7451023',70,121.40],
      ['00024','2026-08-28','SEAT-MECH','FG-BX5-123','Center armrest assembly','BMW-7451024',42,182.60],
    ];

export const PO_EXTRACTION_SAMPLE = {
      po_number: '4500127841',
      version: '1',
      order_date: '2026-07-14',
      change_date: '2026-07-15',
      supplier_no: '100483',
      supplier_name: 'Covers Automotive Components SARL',
      supplier_address: "Zone Franche d'Exportation, Lot 23, Tangier, Morocco",
      buyer_name: 'Adient Automotive Seating Morocco',
      buyer_vat: 'MA40487126',
      buyer_register_nr: 'RC 186245',
      invoicing_party_taxid: 'MA100347829',
      delivery_contact: 'Olivier Martin',
      delivery_address: 'Adient Trim Plant, Tanger Automotive City, Tangier, Morocco',
      payment_terms: 'Immediate payment',
      incoterms: 'DAP Tangier',
      contact_name: 'Olivier Martin',
      contact_tel: '+212 539 40 18 76',
      contact_email: 'olivier.martin@example.com',
      header_text: 'Launch order for BMW X5 pilot-series seating components.',
      currency: 'EUR',
      jit_customer: 'BMW Group',
      development_level: 'DV2',
      engineering_phase: 'Pilot Series',
      reason_of_purchase: 'Launch manufacturing validation',
      stated_total: 0,
      computed_total: 0,
      totals_match: true,
      line_count: 24,
      lines: PO_LINE_SEED.map(row => ({
        line_no: row[0], plant: '1000', due_date: row[1], material_group: row[2], part_number: row[3],
        description: row[4], customer_part_ref: row[5], item_category: 'Standard', quantity: row[6],
        unit_price: row[7], total: Number((row[6] * row[7]).toFixed(2))
      })),
    };

PO_EXTRACTION_SAMPLE.computed_total = Number(PO_EXTRACTION_SAMPLE.lines.reduce((sum, line) => sum + line.total, 0).toFixed(2));

PO_EXTRACTION_SAMPLE.stated_total = PO_EXTRACTION_SAMPLE.computed_total;

export const PO_SOURCE_FILES = new Map();

export const PO_EXTRACTION_RECORDS = new Map();

export const PO_STATUS_FLOW = ['Unplanned', 'In Progress', 'Done', 'Packaged', 'Delivered'];

export const PO_STATUS_OWNER = {
      'Unplanned': 'System · PO intake',
      'In Progress': 'Launch Engineer · manufacturing launch',
      'Done': 'Production & Packing Coordinator',
      'Packaged': 'Production & Packing Coordinator',
      'Delivered': 'Launch Engineer · customer evidence',
    };

export const PO_STATUS_TRIGGER = {
      'Unplanned': 'PO uploaded and created',
      'In Progress': 'First manufacturing launch created',
      'Done': 'Production completion confirmed',
      'Packaged': 'Packaging completion confirmed',
      'Delivered': 'Final customer delivery confirmed with evidence',
    };

export const PRODUCTION_ORDERS = [
      { id:'WO-1048', po:'PO-00045', project:'BMW X5', customer:'BMW Group', fgpn:'FG-BX5-100', qty:1200, produced:1200, packaged:1200, status:'Packaged', due:'15 Aug', line:'Line A3', updatedBy:'Y. Mansouri', updatedAt:'Today, 08:42', priority:true },
      { id:'WO-1047', po:'PO-00045', project:'BMW X5', customer:'BMW Group', fgpn:'FG-BX5-101', qty:980, produced:760, packaged:0, status:'In Progress', due:'15 Aug', line:'Line A2', updatedBy:'Y. Mansouri', updatedAt:'Today, 08:18', priority:false },
      { id:'WO-1044', po:'PO-2025-011', project:'Dacia Sandero', customer:'Renault', fgpn:'FG-DS-210', qty:2400, produced:2400, packaged:0, status:'Done', due:'20 Jul', line:'Line B1', updatedBy:'N. El Fassi', updatedAt:'Yesterday, 17:26', priority:true },
      { id:'WO-1042', po:'PO-2025-012', project:'Peugeot 208', customer:'Stellantis', fgpn:'FG-P208-050', qty:600, produced:600, packaged:600, status:'Packaged', due:'28 Jul', line:'Line C2', updatedBy:'S. Alaoui', updatedAt:'12 Jul, 15:04', priority:false },
      { id:'WO-1038', po:'PO-2025-013', project:'Renault Clio V', customer:'Renault', fgpn:'FG-RCV-330', qty:640, produced:0, packaged:0, status:'Unplanned', due:'02 Aug', line:'Not assigned', updatedBy:'A. Rahal', updatedAt:'11 Jul, 09:40', priority:false },
      { id:'WO-1031', po:'PO-00045', project:'BMW X5', customer:'BMW Group', fgpn:'FG-BX5-101', qty:300, produced:300, packaged:300, status:'Delivered', due:'28 Jun', line:'Line A1', updatedBy:'A. Haddad', updatedAt:'30 Jun, 14:12', priority:false },
    ];

export const PO_STATUS_HISTORY = [
      { id:'PSH-0014', po:'PO-2025-013', from:null, to:'Unplanned', date:'2026-07-06 17:30', user:'A. Rahal', reason:'PO uploaded and created', evidence:'PO-2025-013_v1.pdf' },
      { id:'PSH-0013', po:'PO-2025-012', from:'Done', to:'Packaged', date:'2026-07-12 15:04', user:'S. Alaoui', reason:'Finished goods packaging completed', evidence:'Packaging confirmation' },
      { id:'PSH-0012', po:'PO-2025-012', from:'In Progress', to:'Done', date:'2026-07-12 11:42', user:'Y. Mansouri', reason:'Production quantity completed', evidence:'Shop floor confirmation' },
      { id:'PSH-0011', po:'PO-2025-012', from:'Unplanned', to:'In Progress', date:'2026-07-08 08:25', user:'M. El Idrissi', reason:'Signed manufacturing reception document uploaded', evidence:'MD-0027_signed.pdf' },
      { id:'PSH-0010', po:'PO-2025-011', from:'In Progress', to:'Done', date:'2026-07-18 17:26', user:'N. El Fassi', reason:'Production completed', evidence:'Shop floor confirmation' },
      { id:'PSH-0009', po:'PO-00045', from:'Unplanned', to:'In Progress', date:'2026-07-11 08:42', user:'M. El Idrissi', reason:'Signed manufacturing reception document uploaded', evidence:'MD-0031_signed.pdf' },
      { id:'PSH-0008', po:'PO-00045', from:null, to:'Unplanned', date:'2026-06-18 11:02', user:'A. Haddad', reason:'PO uploaded and created', evidence:'PO-00045_v1.pdf' },
    ];

export const BUSINESS_RULES = [
      { id:'OP-01', title:'FGPN format', decision:'Store 12 normalized alphanumeric characters; display the customer mask with separators. Keep the validation pattern configurable per customer.', owner:'Launch Manager · Master Data' },
      { id:'OP-02', title:'Launch Manager scope', decision:'Read all projects; write only on explicitly assigned projects. Emergency override is excluded from the baseline.', owner:'Plant Manager · Department Head' },
      { id:'OP-03', title:'Plant Manager access', decision:'Read-only access to all operational dashboards, PO records and audit documents. No business actions or exports containing edit controls.', owner:'Plant Manager · IT Security' },
      { id:'OP-04', title:'Warehouse roles', decision:'Keep distinct accounts. Warehouse Personnel record receptions only; Warehouse Team Leader owns corrections within 24 hours, transfer codes and signed documents.', owner:'Warehouse Manager' },
      { id:'OP-05', title:'Backward status changes', decision:'Only the assigned Launch Engineer may move a PO backward by one reachable status. A written reason is mandatory and the transition, actor, timestamp and reason are stored immutably in status history.', owner:'Launch Manager' },
      { id:'OP-06', title:'Multi-PO priority', decision:'Earliest committed delivery date first, then customer priority class, then PO creation timestamp as the deterministic tie-breaker.', owner:'Launch Manager · Planning' },
      { id:'OP-07', title:'Delivery confirmation', decision:'Accept a signed POD PDF or verified carrier electronic confirmation. Customer email may support the record but is not sufficient on its own.', owner:'Logistics · Launch Manager' },
      { id:'OP-08', title:'Delivery methods', decision:'Seed Truck, DHL and Van as active reference data. The System Administrator may add or deactivate methods without software changes.', owner:'Logistics' },
      { id:'OP-09', title:'Safety coefficient', decision:'Default to 2.0, versioned by project and material class. Any override requires an effective date, reason and Launch Manager approval.', owner:'Launch · Quality · Production' },
      { id:'OP-10', title:'Signed transfer validation', decision:'The assigned Launch Engineer validates the uploaded signed document; Launch Manager is the fallback. Stock updates only after validation.', owner:'Launch Manager · Warehouse Manager' },
      { id:'OP-11', title:'Invoice requirement', decision:'Require an invoice for every confirmed customer delivery unless the delivery is explicitly marked non-invoiceable with a Finance-approved reason.', owner:'Finance' },
      { id:'OP-12', title:'Future-stock draft retention', decision:'Persist every draft as an immutable project audit artifact using the same retention policy as the project audit record.', owner:'Audit · Finance' },
      { id:'OP-13', title:'Delivery code lifetime', decision:'Use a 48-hour, single-use delivery code. The Launch Engineer may regenerate it; each generation and failed access is audited.', owner:'Warehouse Manager · Launch Manager' },
    ];

export const PNS = [
      { pn:'PN100', po:'PO-00045', project:'BMW X5', desc:'Front wiring harness', qty:1200, unitPrice:145.50, currency:'EUR', version:'v3', status:'Ready', statusType:'success', bom:'Uploaded', bomFile:'PN100_BOM_v3.xlsx', bomUpdated:'2026-07-10' },
      { pn:'PN101', po:'PO-00045', project:'BMW X5', desc:'Rear light connector set', qty:640, unitPrice:142.25, currency:'EUR', version:'—', status:'Waiting BOM', statusType:'warning', bom:'Missing', bomFile:'—', bomUpdated:'—' },
      { pn:'PN102', po:'PO-00045', project:'BMW X5', desc:'Dashboard harness', qty:980, unitPrice:89.40, currency:'EUR', version:'v3', status:'In Simulation', statusType:'info', bom:'Uploaded', bomFile:'PN102_BOM_v3.xlsx', bomUpdated:'2026-07-10' },
      { pn:'PN103', po:'PO-00046', project:'BMW X5', desc:'Seat module interface harness', qty:400, unitPrice:118.60, currency:'EUR', version:'v1', status:'Ready', statusType:'success', bom:'Uploaded', bomFile:'PN103_BOM_v1.xlsx', bomUpdated:'2026-07-11' },
      { pn:'PN104', po:'PO-00046', project:'BMW X5', desc:'Battery cable assembly', qty:300, unitPrice:134.20, currency:'EUR', version:'v1', status:'Ready', statusType:'success', bom:'Uploaded', bomFile:'PN104_BOM_v1.xlsx', bomUpdated:'2026-07-11' },
      { pn:'PN105', po:'PO-00047', project:'BMW X5', desc:'Occupant sensor harness', qty:520, unitPrice:156.75, currency:'EUR', version:'v1', status:'Ready', statusType:'success', bom:'Uploaded', bomFile:'PN105_BOM_v1.xlsx', bomUpdated:'2026-07-13' },
      { pn:'PN106', po:'PO-00047', project:'BMW X5', desc:'Console power cable', qty:280, unitPrice:97.90, currency:'EUR', version:'—', status:'Waiting BOM', statusType:'warning', bom:'Missing', bomFile:'—', bomUpdated:'—' },
      { pn:'PN201', po:'PO-2025-013', project:'Renault Clio V', desc:'Door harness assembly', qty:760, unitPrice:121.80, currency:'EUR', version:'v1', status:'Ready', statusType:'success', bom:'Uploaded', bomFile:'PN201_BOM_v1.xlsx', bomUpdated:'2026-07-06' },
      { pn:'PN202', po:'PO-2025-013', project:'Renault Clio V', desc:'Console connector kit', qty:640, unitPrice:98.75, currency:'EUR', version:'—', status:'Waiting BOM', statusType:'warning', bom:'Missing', bomFile:'—', bomUpdated:'—' },
      { pn:'PN301', po:'PO-2025-012', project:'Peugeot 208', desc:'Cockpit harness', qty:600, unitPrice:160.00, currency:'EUR', version:'v2', status:'Missing Stock', statusType:'danger', bom:'Uploaded', bomFile:'PN301_BOM_v2.xlsx', bomUpdated:'2026-07-03' },
      { pn:'PN401', po:'PO-2025-011', project:'Dacia Sandero', desc:'Main body harness', qty:2400, unitPrice:62.00, currency:'EUR', version:'v2', status:'Ready', statusType:'success', bom:'Uploaded', bomFile:'PN401_BOM_v2.xlsx', bomUpdated:'2026-06-30' },
      { pn:'PN402', po:'PO-2025-011', project:'Dacia Sandero', desc:'Rear lamp harness', qty:1800, unitPrice:58.50, currency:'EUR', version:'v1', status:'Ready', statusType:'success', bom:'Uploaded', bomFile:'PN402_BOM_v1.xlsx', bomUpdated:'2026-06-30' },
      { pn:'PN403', po:'PO-2025-011', project:'Dacia Sandero', desc:'Door connector set', qty:1800, unitPrice:44.25, currency:'EUR', version:'v1', status:'Ready', statusType:'success', bom:'Uploaded', bomFile:'PN403_BOM_v1.xlsx', bomUpdated:'2026-07-01' },
      { pn:'PN404', po:'PO-2025-011', project:'Dacia Sandero', desc:'Battery cable kit', qty:2400, unitPrice:76.80, currency:'EUR', version:'v3', status:'Ready', statusType:'success', bom:'Uploaded', bomFile:'PN404_BOM_v3.xlsx', bomUpdated:'2026-07-02' },
    ];

export const PO_BOM_FILES = [
      { po:'PO-2025-011', file:'PO-2025-011_BOM_v2.xlsx', version:'v2', fgpnCount:4, materialCount:18, uploadedBy:'M. Idrissi', uploadedAt:'2026-07-02', status:'Validated' },
    ];

export const BOM_IMPORT_RECORDS = [];

export const PO_VERSION_HISTORY = [
      { version: 'v3', current: true, date: '2026-07-08', uploadedBy: 'A. Haddad', comment: 'Updated PN102 quantity and committed delivery dates', status: 'Current', file:'PO-00045_v3.pdf' },
      { version: 'v2', current: false, date: '2026-06-20', uploadedBy: 'A. Haddad', comment: 'Added PN102 and adjusted PN101 quantity', status: 'Previous', file:'PO-00045_v2.pdf' },
      { version: 'v1', current: false, date: '2026-06-01', uploadedBy: 'S. Amrani', comment: 'Initial validated purchase order', status: 'Archived', file:'PO-00045_v1.pdf' },
    ];

export const BOM_VERSION_HISTORY = [
      { version: 'v3', current: true, date: '2026-07-10', uploadedBy: 'A. Haddad', comment: 'Updated wire usage and clip description', status: 'Current', file:'PN100_BOM_v3.xlsx' },
      { version: 'v2', current: false, date: '2026-07-05', uploadedBy: 'A. Haddad', comment: 'Added terminal pin and adjusted wire usage', status: 'Previous', file:'PN100_BOM_v2.xlsx' },
      { version: 'v1', current: false, date: '2026-06-01', uploadedBy: 'S. Amrani', comment: 'Initial validated PN BOM', status: 'Archived', file:'PN100_BOM_v1.xlsx' },
    ];

export const PO_VERSION_SNAPSHOTS = {
      v1: [
        { pn:'PN100', description:'Front wiring harness', quantity:1100, unit:'PCS', dueDate:'2026-08-15', customerRef:'BMW-7451001' },
        { pn:'PN101', description:'Rear light connector set', quantity:600, unit:'PCS', dueDate:'2026-08-15', customerRef:'BMW-7451002' },
      ],
      v2: [
        { pn:'PN100', description:'Front wiring harness', quantity:1200, unit:'PCS', dueDate:'2026-08-15', customerRef:'BMW-7451001' },
        { pn:'PN101', description:'Rear light connector set', quantity:640, unit:'PCS', dueDate:'2026-08-15', customerRef:'BMW-7451002' },
        { pn:'PN102', description:'Dashboard harness', quantity:900, unit:'PCS', dueDate:'2026-08-20', customerRef:'BMW-7451003' },
      ],
      v3: [
        { pn:'PN100', description:'Front wiring harness', quantity:1200, unit:'PCS', dueDate:'2026-08-15', customerRef:'BMW-7451001' },
        { pn:'PN101', description:'Rear light connector set', quantity:640, unit:'PCS', dueDate:'2026-08-15', customerRef:'BMW-7451002' },
        { pn:'PN102', description:'Dashboard harness', quantity:980, unit:'PCS', dueDate:'2026-08-18', customerRef:'BMW-7451003' },
      ],
    };

export const BOM_VERSION_SNAPSHOTS = {
      v1: [
        { material:'MAT-4471', description:'Harness retention clip', materialType:'Connector', usageQty:1, unit:'PCS', supplier:'Amphenol', revision:'A' },
        { material:'MAT-3390', description:'Cable sleeve 8mm', materialType:'Tube', usageQty:1, unit:'M', supplier:'Sumitomo', revision:'A' },
        { material:'MAT-2208', description:'Primary wire 0.5mm red', materialType:'Wire', usageQty:1.8, unit:'M', supplier:'Leoni', revision:'A' },
      ],
      v2: [
        { material:'MAT-4471', description:'Harness retention clip', materialType:'Connector', usageQty:1, unit:'PCS', supplier:'Amphenol', revision:'A' },
        { material:'MAT-3390', description:'Cable sleeve 8mm', materialType:'Tube', usageQty:1, unit:'M', supplier:'Sumitomo', revision:'A' },
        { material:'MAT-2208', description:'Primary wire 0.5mm red', materialType:'Wire', usageQty:2, unit:'M', supplier:'Leoni', revision:'B' },
        { material:'MAT-1207', description:'Terminal pin, gold', materialType:'Terminal', usageQty:1, unit:'PCS', supplier:'Yazaki', revision:'A' },
      ],
      v3: [
        { material:'MAT-4471', description:'Wiring harness clip', materialType:'Connector', usageQty:1, unit:'PCS', supplier:'Amphenol', revision:'B' },
        { material:'MAT-3390', description:'Cable sleeve 8mm', materialType:'Tube', usageQty:1, unit:'M', supplier:'Sumitomo', revision:'A' },
        { material:'MAT-2208', description:'Primary wire 0.5mm red', materialType:'Wire', usageQty:2.2, unit:'M', supplier:'Leoni', revision:'C' },
        { material:'MAT-1207', description:'Terminal pin, gold', materialType:'Terminal', usageQty:1, unit:'PCS', supplier:'Yazaki', revision:'A' },
      ],
    };

export const PO_VERSION_DIFFS = [
      { pn: 'PN101', field: 'Quantity', old: '50', new: '70', change: 'Modified' },
      { pn: 'PN105', field: 'Added', old: '—', new: 'New PN', change: 'Added' },
      { pn: 'PN108', field: 'Description', old: 'Rear dash', new: 'Rear dash with sensor ring', change: 'Modified' },
      { pn: 'PN110', field: 'Removed', old: 'Legacy bracket', new: '—', change: 'Removed' },
      { pn: 'PN115', field: 'Order', old: '4', new: '3', change: 'Moved' },
    ];

export const BOM_VERSION_DIFFS = [
      { material: 'Foam A', field: 'Material', old: 'Foam A', new: 'Foam B', change: 'Modified' },
      { material: 'Clip C', field: 'Added', old: '—', new: 'Clip C', change: 'Added' },
      { material: 'Glue A', field: 'Quantity', old: '5', new: '6', change: 'Modified' },
      { material: 'Tape A', field: 'Removed', old: 'Tape A', new: '—', change: 'Removed' },
      { material: 'Cable D', field: 'Sequence', old: 'Line 3', new: 'Line 1', change: 'Moved' },
    ];

export const PROJECT_BOM_META = { version: 'v3', materialsCount: 24, lastUpload: '2026-07-08', uploadedBy: 'A. Haddad' };

export const SIM_META = { date: '2026-07-10 14:22', executedBy: 'A. Haddad', safetyCoefficient: '2.0 (governed default)', cutmanVersion: 'CM-2026-07-09' };

export const MATERIALS = [
      { code: 'MAT-4471', desc: 'Wiring harness clip', type: 'Connector', supplier: 'Amphenol', required: 1200, warehouse: 820, cutman: 180, wip: 200, missing: 180, threshold: 500, transit: 120, projects: ['BMW X5', 'Peugeot 208'], pns: ['PN100', 'PN102'] },
      { code: 'MAT-3390', desc: 'Cable sleeve 8mm', type: 'Tube', supplier: 'Sumitomo', required: 640, warehouse: 640, cutman: 0, wip: 0, missing: 0, threshold: 300, transit: 0, projects: ['BMW X5'], pns: ['PN100'] },
      { code: 'MAT-5512', desc: 'Connector housing 4-pin', type: 'Connector', supplier: 'TE Connectivity', required: 980, warehouse: 410, cutman: 0, wip: 300, missing: 270, threshold: 600, transit: 200, projects: ['BMW X5', 'Renault Clio V'], pns: ['PN101', 'PN102'] },
      { code: 'MAT-1207', desc: 'Terminal pin, gold', type: 'Terminal', supplier: 'Yazaki', required: 2400, warehouse: 2400, cutman: 0, wip: 0, missing: 0, threshold: 1000, transit: 0, projects: ['Dacia Sandero'], pns: ['PN100'] },
      { code: 'MAT-2208', desc: 'Primary wire 0.5mm red', type: 'Wire', supplier: 'Leoni', required: 3000, warehouse: 1900, cutman: 400, wip: 0, missing: 700, threshold: 1500, transit: 300, projects: ['BMW X5'], pns: ['PN100'] },
      { code: 'MAT-6630', desc: 'PVC tape black 19mm', type: 'Tape', supplier: '3M', required: 180, warehouse: 210, cutman: 0, wip: 0, missing: 0, threshold: 100, transit: 0, projects: ['Renault Clio V'], pns: ['PN101'] },
    ];

MATERIALS.forEach(m => { THRESHOLD_DEFAULTS[m.code] = m.threshold; });

export const BOM_USAGE = {
      'PN100': { 'MAT-4471': 1, 'MAT-3390': 1, 'MAT-2208': 2, 'MAT-1207': 1 },
      'PN101': { 'MAT-6630': 1, 'MAT-5512': 1 },
      'PN102': { 'MAT-4471': 1, 'MAT-5512': 1 },
    };

export const PO_LAUNCH_PROGRESS = {
      'PO-00045': { qty: 1200, pn: 'PN100', alreadyLaunched: 300, enteredToManufacturing: 150 },
      'PO-2025-013': { qty: 640, pn: 'PN101', alreadyLaunched: 0, enteredToManufacturing: 0 },
      'PO-2025-012': { qty: 980, pn: 'PN102', alreadyLaunched: 0, enteredToManufacturing: 100 },
      'PO-2025-011': { qty: 2400, pn: 'PN100', alreadyLaunched: 1000, enteredToManufacturing: 400 },
    };

export const SIM_PRIORITY_RULES = {
      earliest_delivery: { label: 'Earliest delivery date first', sort: (a, b) => new Date(a.delivery) - new Date(b.delivery) },
      highest_value: { label: 'Highest PO value first (by quantity, as a proxy)', sort: (a, b) => (PO_LAUNCH_PROGRESS[b.id]?.qty || 0) - (PO_LAUNCH_PROGRESS[a.id]?.qty || 0) },
    };

export const STOCK_ALERTS = [
      { code: 'MAT-5512', desc: 'Connector housing 4-pin', level: 'Critical', statusType: 'danger' },
      { code: 'MAT-4471', desc: 'Wiring harness clip', level: 'Low', statusType: 'warning' },
    ];

export const HISTORY_STEPS = [
      { title: 'Project created', time: 'Jun 12, 2026 — 09:14', done: true },
      { title: 'PO-00045 uploaded', time: 'Jun 18, 2026 — 11:02', done: true },
      { title: 'BOM validated', time: 'Jun 22, 2026 — 14:37', done: true },
      { title: 'Launch simulation run', time: 'Jul 05, 2026 — 10:20', done: true },
      { title: 'Warehouse allocation', time: 'Jul 09, 2026 — 08:45', done: true },
      { title: 'Production start', time: 'Pending', done: false },
      { title: 'Delivery', time: 'Pending', done: false },
    ];

export const DIFF_MATERIALS = [
      { code: 'MAT-4471', v2: 1000, v3: 1200, changed: true },
      { code: 'MAT-3390', v2: 640, v3: 640, changed: false },
      { code: 'MAT-5512', v2: 750, v3: 980, changed: true },
      { code: 'MAT-1207', v2: 2400, v3: 2100, changed: true },
    ];

export const SIMULATION_HISTORY = [
      { id: 'SIM-0091', date: '2026-07-10 14:22', project: 'BMW X5', pos: ['PO-00045'], executedBy: 'A. Haddad', sources: { warehouse: true, wip: true, transit: false }, safety: 2, result: 'YES', resultType: 'success', maxQty: 150, missingCount: 3 },
      { id: 'SIM-0088', date: '2026-07-08 09:47', project: 'BMW X5', pos: ['PO-00045', 'PO-2025-011'], executedBy: 'A. Haddad', sources: { warehouse: true, wip: true, transit: true }, safety: 2, result: 'YES', resultType: 'success', maxQty: 210, missingCount: 1 },
      { id: 'SIM-0084', date: '2026-07-05 16:03', project: 'Peugeot 208', pos: ['PO-2025-012'], executedBy: 'A. Haddad', sources: { warehouse: true, wip: false, transit: false }, safety: 2, result: 'NO', resultType: 'danger', maxQty: 0, missingCount: 6 },
      { id: 'SIM-0079', date: '2026-07-02 11:15', project: 'Renault Clio V', pos: ['PO-2025-013'], executedBy: 'S. Amrani', sources: { warehouse: true, wip: true, transit: false }, safety: 2, result: 'NO', resultType: 'danger', maxQty: 40, missingCount: 2 },
      { id: 'SIM-0073', date: '2026-06-29 08:30', project: 'Dacia Sandero', pos: ['PO-2025-011'], executedBy: 'M. Idrissi', sources: { warehouse: true, wip: true, transit: true }, safety: 2, result: 'YES', resultType: 'success', maxQty: 320, missingCount: 0 },
    ];

export const MFG_DELIVERIES = [
      {
        code:'MD-0032', project:'BMW X5', po:'PO-00046', receiver:'Cell 4 — Final Assembly', date:'2026-07-16', status:'Delivered', statusType:'success', lifecycleStatus:'In Progress',
        fgpn:'FG-BX5-103', fgpns:['FG-BX5-103','FG-BX5-104'], fgpnQuantities:[
          { fgpn:'FG-BX5-103', qty:200, ordered:400, status:'In Progress', producedQty:0, packagedQty:0, customerDeliveredQty:0 },
          { fgpn:'FG-BX5-104', qty:300, ordered:300, status:'Done', producedQty:300, packagedQty:0, customerDeliveredQty:0 },
        ],
        materials:[
          { code:'MAT-4471', desc:'Wiring harness clip', required:500, warehouse:820, qty:500, unit:'PCS', fgpns:['FG-BX5-103','FG-BX5-104'], requiredTime:'2026-07-16T08:00' },
        ], docUploaded:true, signedFileName:'MD-0032_signed.pdf', signedBy:'M. El Idrissi', signedAt:'2026-07-16 07:45', notes:'Active split launch for production and packing coordination.'
      },
      {
        code: 'MD-0031', project: 'BMW X5', po: 'PO-00045', receiver: 'Cell 3 — Harness Assembly', date: '2026-07-11', status: 'Delivered', statusType: 'success',
        lifecycleStatus: 'Packaged', fgpn: 'FG-BX5-100', fgpns: ['FG-BX5-100','FG-BX5-101'], fgpnQuantities: [
          { fgpn:'FG-BX5-100', qty:800, ordered:1200, status:'Packaged', producedQty:800, packagedQty:800, customerDeliveredQty:0 },
          { fgpn:'FG-BX5-101', qty:640, ordered:640, status:'Packaged', producedQty:640, packagedQty:640, customerDeliveredQty:0 },
        ],
        materials: [
          { code: 'MAT-4471', desc: 'Wiring harness clip', required: 1200, warehouse: 820, qty: 800 },
          { code: 'MAT-3390', desc: 'Cable sleeve 8mm', required: 640, warehouse: 640, qty: 640 },
        ], docUploaded: true, notes: 'Delivered ahead of schedule for line trial.'
      },
      {
        code: 'MD-0030', project: 'BMW X5', po: 'PO-00045', receiver: 'Cell 1 — Cutting Line', date: '2026-07-09', status: 'In Transit', statusType: 'info',
        lifecycleStatus: 'Unplanned', fgpn: 'FG-BX5-100', fgpns: ['FG-BX5-100'], fgpnQuantities: [
          { fgpn:'FG-BX5-100', qty:400, ordered:1200, status:'Unplanned', producedQty:0, packagedQty:0, customerDeliveredQty:0 },
        ],
        materials: [
          { code: 'MAT-2208', desc: 'Primary wire 0.5mm red', required: 3000, warehouse: 1900, qty: 1500 },
        ], docUploaded: false, notes: ''
      },
      {
        code: 'MD-0029', project: 'Dacia Sandero', po: 'PO-2025-011', receiver: 'Cell 2 — Terminal Crimping', date: '2026-07-06', status: 'Pending Approval', statusType: 'warning',
        lifecycleStatus: 'Unplanned', fgpn: 'FG-DS-210', fgpns: ['FG-DS-210'], fgpnQuantities: [
          { fgpn:'FG-DS-210', qty:2000, ordered:2400, status:'Unplanned', producedQty:0, packagedQty:0, customerDeliveredQty:0 },
        ],
        materials: [
          { code: 'MAT-1207', desc: 'Terminal pin, gold', required: 2400, warehouse: 2400, qty: 2000 },
        ], docUploaded: false, notes: 'Awaiting manager sign-off.'
      },
      {
        code: 'MD-0028', project: 'Renault Clio V', po: 'PO-2025-013', receiver: 'Cell 3 — Harness Assembly', date: '2026-07-01', status: 'Cancelled', statusType: 'danger',
        lifecycleStatus: 'Unplanned', fgpn: 'FG-RCV-330', fgpns: ['FG-RCV-330'], fgpnQuantities: [
          { fgpn:'FG-RCV-330', qty:0, ordered:760, status:'Unplanned', producedQty:0, packagedQty:0, customerDeliveredQty:0 },
        ],
        materials: [
          { code: 'MAT-5512', desc: 'Connector housing 4-pin', required: 980, warehouse: 410, qty: 0 },
        ], docUploaded: false, notes: 'Cancelled — PO version changed after request.'
      },
      {
        code: 'MD-0027', project: 'Peugeot 208', po: 'PO-2025-012', receiver: 'Cell 1 — Cutting Line', date: '2026-06-27', status: 'Delivered', statusType: 'success',
        lifecycleStatus: 'Packaged', fgpn: 'FG-P208-050', fgpns: ['FG-P208-050'], fgpnQuantities: [
          { fgpn:'FG-P208-050', qty:600, ordered:600, status:'Packaged', producedQty:600, packagedQty:600, customerDeliveredQty:0 },
        ],
        materials: [
          { code: 'MAT-6630', desc: 'PVC tape black 19mm', required: 180, warehouse: 210, qty: 180 },
        ], docUploaded: true, notes: ''
      },
    ];

export const DELIVERY_METHOD_COSTS = { 'Truck': 4500, 'DHL': 1800, 'Van': 2200 };

export function transportCostFor(method) { return DELIVERY_METHOD_COSTS[method] != null ? DELIVERY_METHOD_COSTS[method] : 0; }

export const CUST_DELIVERIES = [
      { code: 'CD-0018', customer: 'BMW Group', project: 'BMW X5', po: 'PO-00045', fgpn: 'FG-BX5-100', qty: 900, delivered: 900, method: 'Truck', tracking: 'TRK-88213-MA', date: '2026-07-15', status: 'Delivered', statusType: 'success', transportCost: 4500, unitValue: 145,
        shipments: [
          { id: 'SH-1', date: '2026-07-10', week: 'W28', po: 'PO-00045', fgpn: 'FG-BX5-100', description: '', level: 'Partial', qty: 900, method: 'Truck', value: 900 * 145, status: 'Delivered', statusType: 'success',
            confirmation: { date: '2026-07-12', method: 'Signed POD', confirmedBy: 'H. Vogel (BMW Group)', reference: 'POD-2026-3401', evidence: 'POD-2026-3401.pdf', comments: 'First batch received in full.' } },
        ] },
      { code: 'CD-0017', customer: 'Renault', project: 'Dacia Sandero', po: 'PO-2025-011', fgpn: 'FG-DS-210', qty: 2400, delivered: 2400, method: 'DHL', tracking: 'TRK-77410-CT', date: '2026-07-05', status: 'Awaiting Confirmation', statusType: 'warning', transportCost: 1800, unitValue: 62,
        shipments: [
          { id: 'SH-1', date: '2026-07-01', week: 'W27', po: 'PO-2025-011', fgpn: 'FG-DS-210', description: '', level: 'Partial', qty: 1200, method: 'DHL', value: 1200 * 62, status: 'Shipped', statusType: 'info', confirmation: null },
          { id: 'SH-2', date: '2026-07-05', week: 'W27', po: 'PO-2025-011', fgpn: 'FG-DS-210', description: '', level: 'Partial', qty: 1200, method: 'DHL', value: 1200 * 62, status: 'Shipped', statusType: 'info', confirmation: null },
        ] },
      { code: 'CD-0016', customer: 'Stellantis', project: 'Peugeot 208', po: 'PO-2025-012', fgpn: 'FG-P208-050', qty: 600, delivered: 0, method: 'Truck', tracking: '—', date: '2026-07-20', status: 'Created', statusType: 'neutral', transportCost: 4500, unitValue: 88,
        shipments: [] },
      { code: 'CD-0015', customer: 'Renault', project: 'Renault Clio V', po: 'PO-2025-013', fgpn: 'FG-RCV-330', qty: 640, delivered: 0, method: 'Van', tracking: '—', date: '2026-07-25', status: 'Packed', statusType: 'warning', transportCost: 2200, unitValue: 121,
        shipments: [] },
      { code: 'CD-0014', customer: 'BMW Group', project: 'BMW X5', po: 'PO-00045', fgpn: 'FG-BX5-102', qty: 980, delivered: 980, method: 'Truck', tracking: 'TRK-65302-MA', date: '2026-06-28', status: 'Delivered', statusType: 'success', transportCost: 4500, unitValue: 89.4,
        shipments: [
          { id: 'SH-1', date: '2026-06-28', week: 'W26', po: 'PO-00045', fgpn: 'FG-BX5-102', description: '', level: 'Full', qty: 980, method: 'Truck', value: 980 * 89.4, status: 'Delivered', statusType: 'success',
            confirmation: { date: '2026-06-30', method: 'Signed POD', confirmedBy: 'H. Vogel (BMW Group)', reference: 'POD-2026-3391', evidence: 'POD-2026-3391.pdf', comments: 'Received in full, no damage reported.' } },
        ] },
    ];

export const CUST_DELIVERY_STEPS = ['Created', 'Packed', 'Shipped', 'Partially Delivered', 'Awaiting Confirmation', 'Delivered'];

export const CONFIRMATION_METHODS = ['Signed POD', 'Customer Email', 'Courier Confirmation', 'Electronic Signature', 'Other'];

export const REVENUE_ROWS = [
      { project: 'BMW X5', customer: 'BMW Group', revenue: 842000, forecast: 900000 },
      { project: 'Renault Clio V', customer: 'Renault', revenue: 311000, forecast: 410000 },
      { project: 'Peugeot 208', customer: 'Stellantis', revenue: 96000, forecast: 280000 },
      { project: 'Dacia Sandero', customer: 'Renault', revenue: 604000, forecast: 590000 },
    ];

export const INVOICES = [
      { id: 'INV-2026-0142', project: 'BMW X5', customer: 'BMW Group', amount: 212500, status: 'Paid', statusType: 'success', date: '2026-06-30' },
      { id: 'INV-2026-0143', project: 'Dacia Sandero', customer: 'Renault', amount: 151000, status: 'Paid', statusType: 'success', date: '2026-07-02' },
      { id: 'INV-2026-0144', project: 'Renault Clio V', customer: 'Renault', amount: 77500, status: 'Outstanding', statusType: 'warning', date: '2026-07-08' },
      { id: 'INV-2026-0145', project: 'Peugeot 208', customer: 'Stellantis', amount: 96000, status: 'Overdue', statusType: 'danger', date: '2026-06-15' },
      { id: 'INV-2026-0146', project: 'BMW X5', customer: 'BMW Group', amount: 210000, status: 'Draft', statusType: 'neutral', date: '2026-07-11' },
    ];

export const PRICES = [
      { fgpn: 'FG-BX5-100', customer: 'BMW Group', price: 702, updated: '2026-05-12' },
      { fgpn: 'FG-BX5-101', customer: 'BMW Group', price: 615, updated: '2026-05-12' },
      { fgpn: 'FG-DS-210', customer: 'Renault', price: 251, updated: '2026-04-02' },
      { fgpn: 'FG-P208-050', customer: 'Stellantis', price: 160, updated: '2026-03-18' },
      { fgpn: 'FG-RCV-330', customer: 'Renault', price: 121, updated: '2026-06-01' },
    ];

export const FORECAST_ROWS = [
      { month: 'Feb 2026', forecast: 520000, actual: 498000 },
      { month: 'Mar 2026', forecast: 560000, actual: 571000 },
      { month: 'Apr 2026', forecast: 590000, actual: 552000 },
      { month: 'May 2026', forecast: 610000, actual: 634000 },
      { month: 'Jun 2026', forecast: 640000, actual: 611000 },
      { month: 'Jul 2026', forecast: 670000, actual: null },
    ];

export const AUDIT_LOGS = [
      { id: 'AUD-10231', date: '2026-07-11 16:42', user: 'A. Haddad', module: 'Manufacturing Delivery', action: 'Confirmed', entity: 'MD-0031', project: 'BMW X5', po: 'PO-00045', details: 'Delivery MD-0031 confirmed as delivered to Cell 3.' },
      { id: 'AUD-10230', date: '2026-07-11 09:03', user: 'A. Haddad', module: 'Simulation', action: 'Executed', entity: 'SIM-0091', project: 'BMW X5', po: 'PO-00045', details: 'Simulation run with versioned safety coefficient 2.0 — result YES.' },
      { id: 'AUD-10229', date: '2026-07-10 14:22', user: 'S. Amrani', module: 'Purchase Order', action: 'Version Changed', entity: 'PO-2025-012', project: 'Peugeot 208', po: 'PO-2025-012', details: 'PO version bumped from v1 to v2.', diff: { field: 'Version', old: 'v1', new: 'v2' } },
      { id: 'AUD-10228', date: '2026-07-09 11:15', user: 'A. Haddad', module: 'BOM', action: 'Uploaded', entity: 'PO-00045 BOM v3', project: 'BMW X5', po: 'PO-00045', details: 'Project BOM updated to version 3, 24 materials.' },
      { id: 'AUD-10227', date: '2026-07-08 08:51', user: 'M. Idrissi', module: 'Stock', action: 'Threshold Modified', entity: 'MAT-4471', project: '—', po: '—', details: 'Low-stock threshold changed from 500 to 650.', diff: { field: 'Threshold', old: '500', new: '650' } },
      { id: 'AUD-10226', date: '2026-07-06 17:30', user: 'S. Amrani', module: 'Finance', action: 'Invoice Uploaded', entity: 'INV-2026-0144', project: 'Renault Clio V', po: 'PO-2025-013', details: 'Invoice INV-2026-0144 uploaded, amount €77,500.00.' },
      { id: 'AUD-10225', date: '2026-07-05 10:02', user: 'A. Haddad', module: 'Customer Delivery', action: 'Shipped', entity: 'CD-0018', project: 'BMW X5', po: 'PO-00045', details: 'Customer delivery CD-0018 marked as shipped, tracking TRK-88213-MA.' },
      { id: 'AUD-10224', date: '2026-06-29 08:30', user: 'M. Idrissi', module: 'Simulation', action: 'Executed', entity: 'SIM-0073', project: 'Dacia Sandero', po: 'PO-2025-011', details: 'Simulation run — result YES, max qty 320.' },
    ];

export const AUDIT_ENTITY_TIMELINE = [
      { title: 'Project Created', done: true },
      { title: 'PO Uploaded', done: true },
      { title: 'BOM Uploaded', done: true },
      { title: 'Simulation Executed', done: true },
      { title: 'Stock Updated', done: true },
      { title: 'Manufacturing Delivery', done: true },
      { title: 'Customer Delivery', done: false },
      { title: 'Invoice Uploaded', done: false },
    ];

export const ADMIN_USERS = [
      { id:'ADM-001', name:'R. Benali', fullName:'Rachid Benali', username:'r.benali', email:'r.benali@launchops.example', role:'System Administrator', status:'Active', locked:false, failedAttempts:0, lastLogin:'2026-07-21 08:30', projects:[], phone:'+212 6 12 34 56 78', auth:'Password', location:'IT Administration' },
      { id:'ADM-002', name:'S. Ait Oubou', fullName:'Sara Ait Oubou', username:'s.aitoubou', email:'s.aitoubou@launchops.example', role:'Launch Manager', status:'Active', locked:false, failedAttempts:0, lastLogin:'2026-07-20 16:10', projects:['Peugeot 208'], phone:'+212 6 11 22 33 44', auth:'Password', location:'Launch Department' },
      { id:'ADM-003', name:'M. El Idrissi', fullName:'Mehdi El Idrissi', username:'m.elidrissi', email:'m.elidrissi@launchops.example', role:'Warehouse Team Leader', status:'Active', locked:true, failedAttempts:5, lastLogin:'2026-07-20 07:05', projects:[], phone:'+212 6 44 55 66 77', auth:'Password', location:'Main Warehouse' },
      { id:'ADM-004', name:'A. Rahal', fullName:'Amina Rahal', username:'a.rahal', email:'a.rahal@launchops.example', role:'Launch Engineer', status:'Active', locked:false, failedAttempts:1, lastLogin:'2026-07-20 18:40', projects:['Renault Clio V','BMW X5'], phone:'+212 6 98 76 54 32', auth:'Password', location:'Tangier Plant 2' },
      { id:'ADM-005', name:'Y. Mansouri', fullName:'Youssef Mansouri', username:'y.mansouri', email:'y.mansouri@launchops.example', role:'Production & Packing Coordinator', status:'Active', locked:false, failedAttempts:0, lastLogin:'2026-07-21 06:52', projects:[], phone:'+212 6 33 18 21 40', auth:'Password', location:'Tangier Production & Packaging' },
      { id:'ADM-006', name:'S. Alaoui', fullName:'Salma Alaoui', username:'s.alaoui', email:'s.alaoui@launchops.example', role:'Production & Packing Coordinator', status:'Active', locked:false, failedAttempts:0, lastLogin:'2026-07-21 07:14', projects:[], phone:'+212 6 71 42 16 83', auth:'Password', location:'Tangier Production & Packaging' },
      { id:'ADM-007', name:'I. Chafai', fullName:'Imane Chafai', username:'i.chafai', email:'i.chafai@launchops.example', role:'Warehouse Personnel', status:'Inactive', locked:false, failedAttempts:0, lastLogin:'2026-06-28 15:22', projects:[], phone:'+212 6 44 70 18 91', auth:'Password', location:'Main Warehouse' },
      { id:'ADM-008', name:'K. Benali', fullName:'Karim Benali', username:'k.benali', email:'k.benali@launchops.example', role:'Plant Manager', status:'Active', locked:false, failedAttempts:0, lastLogin:'2026-07-20 17:45', projects:[], phone:'+212 6 18 30 44 62', auth:'Password', location:'Tangier Plant 2' },
    ];

export const ADMIN_ASSIGNMENTS = [
      { user:'S. Ait Oubou',project:'Peugeot 208',role:'Responsible Manager' },
      { user:'A. Rahal',project:'Renault Clio V',role:'Responsible Engineer' },
      { user:'A. Rahal',project:'BMW X5',role:'Responsible Engineer' },
    ];

export const ADMIN_REFERENCE_LISTS = {
      customers:{ label:'JIT Customers', fields:'Customer name', entries:[
        { id:'CUS-001',label:'BMW Group',references:['G05 LCI'],status:'Active',linkedRecords:3,project:'' },{ id:'CUS-002',label:'Renault',references:['BJA Phase 2','DJF'],status:'Active',linkedRecords:3,project:'' },{ id:'CUS-003',label:'Stellantis',references:['P21'],status:'Active',linkedRecords:1,project:'' },
      ]},
      contacts:{ label:'Contact Names', fields:'Contact name', entries:[
        { id:'CON-001',label:'Olivier Martin',status:'Active',linkedRecords:2,project:'' },{ id:'CON-002',label:'Nadia Bennis',status:'Active',linkedRecords:1,project:'' },{ id:'CON-003',label:'Former Customer Contact',status:'Inactive',linkedRecords:4,project:'' },
      ]},
      fgpn:{ label:'Finished Goods Part Numbers', fields:'FGPN and project', entries:[
        { id:'FG-BX5-100',label:'FG-BX5-100',status:'Active',linkedRecords:2,project:'BMW X5' },{ id:'FG-BX5-101',label:'FG-BX5-101',status:'Active',linkedRecords:1,project:'BMW X5' },{ id:'FG-RCV-330',label:'FG-RCV-330',status:'Active',linkedRecords:1,project:'Renault Clio V' },
      ]},
      receivers:{ label:'Manufacturing Receivers', fields:'Receiver name', entries:MFG_DELIVERY_RECEIVERS.map((label,index) => ({ id:`RCV-${String(index+1).padStart(3,'0')}`,label,status:'Active',linkedRecords:index < 3 ? index+1 : 0,project:'' })) },
      methods:{ label:'Delivery Methods', fields:'Method name', entries:[
        { id:'MET-001',label:'Truck',status:'Active',linkedRecords:4,project:'' },{ id:'MET-002',label:'DHL',status:'Active',linkedRecords:2,project:'' },{ id:'MET-003',label:'Van',status:'Active',linkedRecords:1,project:'' },
      ]},
      materialTypes:{ label:'Material Types', fields:'Material type', entries:[
        { id:'MT-001',label:'Wire',status:'Active',linkedRecords:8,project:'' },{ id:'MT-002',label:'Connector',status:'Active',linkedRecords:6,project:'' },{ id:'MT-003',label:'Tape',status:'Active',linkedRecords:3,project:'' },{ id:'MT-004',label:'Tube',status:'Active',linkedRecords:2,project:'' },
      ]},
    };

export const ADMIN_ACTIVITY = [];

export const ADMIN_LOGIN_EVENTS = [
      { time:'2026-07-21 08:31',username:'r.benali',result:'Successful',source:'10.24.8.14',reason:'Authenticated' },
      { time:'2026-07-21 08:12',username:'y.mansouri',result:'Successful',source:'10.24.22.31',reason:'Authenticated' },
      { time:'2026-07-21 07:58',username:'m.elidrissi',result:'Failed',source:'10.24.8.90',reason:'Account locked after 5 failed attempts' },
      { time:'2026-07-21 07:57',username:'m.elidrissi',result:'Failed',source:'10.24.8.90',reason:'Incorrect password · attempt 5 of 5' },
      { time:'2026-07-21 07:55',username:'m.elidrissi',result:'Failed',source:'10.24.8.90',reason:'Incorrect password · attempt 4 of 5' },
      { time:'2026-07-21 07:42',username:'s.alaoui',result:'Successful',source:'10.24.24.17',reason:'Authenticated' },
      { time:'2026-07-20 16:05',username:'i.chafai',result:'Failed',source:'10.24.18.42',reason:'Account inactive' },
    ];

export function buildSearchIndex() {
      const idx = [];
      PROJECTS.forEach(p => idx.push({ type: 'Project', label: p.name, sub: p.customer, action: `openProject('${p.id}')` }));
      POS.forEach(p => idx.push({ type: 'Purchase Order', label: p.id, sub: p.project, action: `openPo('${p.id}')` }));
      PNS.forEach(p => idx.push({ type: 'PN', label: p.pn, sub: p.desc, action: `openPn('${p.pn}')` }));
      MATERIALS.forEach(m => idx.push({ type: 'Material', label: m.code, sub: m.desc, action: `navigate('material-detail')` }));
      MFG_DELIVERIES.forEach(d => idx.push({ type: 'Manufacturing Delivery', label: d.code, sub: d.project, action: `openMfgDelivery('${d.code}')` }));
      CUST_DELIVERIES.forEach(d => idx.push({ type: 'Customer Delivery', label: d.code, sub: d.customer, action: `openCustDelivery('${d.code}')` }));
      INVOICES.forEach(i => idx.push({ type: 'Invoice', label: i.id, sub: i.project, action: `navigate('finance-invoices')` }));
      return idx;
    }

export const SEARCH_INDEX = buildSearchIndex();

export const NOTIFICATIONS = [
      { icon: 'danger', title: 'PO waiting validation', sub: 'PO-2025-013 — Renault Clio V needs review', time: '8 min ago' },
      { icon: 'warning', title: 'BOM missing', sub: 'PN101 — Renault Clio V has no BOM uploaded', time: '12 min ago' },
      { icon: 'danger', title: 'Stock below threshold', sub: 'MAT-5512 — Connector housing 4-pin', time: '1 hr ago' },
      { icon: 'success', title: 'Simulation completed', sub: 'PO-00045 — Launch: YES', time: 'Yesterday' },
      { icon: 'success', title: 'Manufacturing Delivery created', sub: 'MD-0031 delivered to Cell 3', time: 'Yesterday' },
      { icon: 'warning', title: 'Customer Delivery fully shipped', sub: 'CD-0017 awaiting confirmation from Renault', time: '2 days ago' },
      { icon: 'purple', title: 'Invoice uploaded', sub: 'INV-2026-0144 — Renault Clio V, €77,500.00', time: '3 days ago' },
      { icon: 'brown', title: 'Forecast updated', sub: 'July 2026 forecast revised to €670,000.00', time: '4 days ago' },
    ];

export const NOTIF_ICON_COLOR = { danger: 'var(--danger)', warning: 'var(--warning)', success: 'var(--success)', info: 'var(--info)', purple: 'var(--purple)', brown: 'var(--brown)' };
