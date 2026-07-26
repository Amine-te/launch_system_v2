/* ==========================================================================
   po-intake.js
   ========================================================================== */

import { openModal } from '../components/modal.js';
import { ROLE_LABEL, ROLE_PERSONA } from '../components/nav-config.js';
import { navigate } from '../components/nav-render.js';
import { canWriteProject, writableProjects } from '../components/shared-tables.js';
import { AUDIT_LOGS, PNS, POS, PO_EXTRACTION_RECORDS, PO_EXTRACTION_SAMPLE, PO_SOURCE_FILES, PRODUCTION_ORDERS, PROJECTS } from '../data/mock-data.js';
import { stockLedgerEvents } from './materials-stock.js';
import { focusedBomImportPanel } from './projects.js';
import { productionActor, recordPoLifecycleChange, traceabilityWorkspace } from './purchase-orders.js';
import { renderPage } from './router.js';
import { state } from '../state.js';
import { statusBadge } from '../utils/helpers.js';
import { icon } from '../utils/icons.js';
import { inlineJsValue, paginationBar, poDocumentDownloadButtons } from '../utils/table-helpers.js';

export function poEsc(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
    }

export function poMoney(value) {
      return new Intl.NumberFormat('en-GB', { style:'currency', currency:state.poExtraction.currency || 'EUR' }).format(Number(value) || 0);
    }

export function poStatusBadge(status) {
      const tone = status === 'Validated' ? 'success' : status === 'Corrected by user' ? 'info' : status === 'Missing' ? 'danger' : status === 'Mismatch' ? 'warning' : 'neutral';
      return statusBadge(status, tone);
    }

export function poHeaderStatus(key) {
      if (state.poIntake.correctedFields.has(key)) return 'Corrected by user';
      if (key === 'totals_match' && !state.poExtraction.totals_match) return 'Mismatch';
      if (key === 'stated_total' && !state.poExtraction.totals_match) return 'Mismatch';
      const value = state.poExtraction[key];
      return value === '' || value == null ? 'Not Applicable' : (state.poIntake.validated ? 'Validated' : 'Extracted');
    }

export function poLineStatus(index) {
      const prefix = `${index}.`;
      return [...state.poIntake.correctedLines].some(key => key.startsWith(prefix)) ? 'Corrected by user' : (state.poIntake.validated ? 'Validated' : 'Extracted');
    }

export function poRecalculateTotals() {
      state.poExtraction.lines.forEach(line => { line.total = Number(((Number(line.quantity) || 0) * (Number(line.unit_price) || 0)).toFixed(2)); });
      state.poExtraction.line_count = state.poExtraction.lines.length;
      state.poExtraction.computed_total = Number(state.poExtraction.lines.reduce((sum, line) => sum + line.total, 0).toFixed(2));
      state.poExtraction.totals_match = Math.abs(Number(state.poExtraction.stated_total) - state.poExtraction.computed_total) < .01;
    }

export function poValidationIssues() {
      const requiredHeader = ['po_number','version','order_date','supplier_name','buyer_name','delivery_contact','delivery_address','contact_name','contact_tel','contact_email','currency','jit_customer','development_level','reason_of_purchase'];
      const issues = requiredHeader.filter(key => !String(state.poExtraction[key] == null ? '' : state.poExtraction[key]).trim()).map(key => `${key.replaceAll('_',' ')} is missing`);
      state.poExtraction.lines.forEach((line, index) => {
        ['line_no','plant','due_date','part_number','description','quantity','unit_price'].forEach(key => {
          const missing = line[key] === '' || line[key] == null || ((key === 'quantity' || key === 'unit_price') && Number(line[key]) <= 0);
          if (missing) issues.push(`Line ${index + 1}: ${key.replaceAll('_',' ')} is missing`);
          else if (key === 'plant' && !/^\d{4}$/.test(String(line[key]))) issues.push(`Line ${index + 1}: plant must contain exactly four digits`);
        });
      });
      const plantCodes = new Set(state.poExtraction.lines.map(line => String(line.plant || '').trim()).filter(Boolean));
      if (plantCodes.size > 1) issues.push('All PO line items must use the same four-digit plant code');
      if (!state.poExtraction.totals_match) issues.push('Stated total does not match the computed line total');
      return issues;
    }

export function poSelectFile(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        event.target.value = '';
        openModal('Only PDF files are accepted', 'The selected file is not a PDF. Choose a Covers Purchase Order document in PDF format.');
        return;
      }
      state.poIntake.fileName = file.name;
      state.poIntake.fileSize = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
      state.poIntake.uploadedAt = new Date().toLocaleString('en-GB');
      state.poIntake.sourceFile = file;
      state.poIntake.extracted = false;
      state.poIntake.validated = false;
      renderPage();
    }

export function poUseExampleFile() {
      state.poIntake.fileName = 'Covers_PO_4500127841.pdf';
      state.poIntake.fileSize = '1.84 MB';
      state.poIntake.uploadedAt = new Date().toLocaleString('en-GB');
      state.poIntake.sourceFile = null;
      state.poIntake.extracted = false;
      state.poIntake.validated = false;
      renderPage();
    }

export function poContinueUpload() {
      if (!state.poIntake.project) { openModal('Project required', 'Select an existing project before submitting a purchase order.'); return; }
      if (!state.poIntake.fileName) { openModal('PDF required', 'Upload a purchase order PDF or load the example PDF before continuing.'); return; }
      state.poIntake.step = 2;
      renderPage();
    }

export function poStartExtraction() {
      state.poIntake.extracted = true;
      state.poIntake.validated = false;
      state.poValidationPage = 1;
      state.poIntake.step = 3;
      poRecalculateTotals();
      renderPage();
    }

export function poValidateExtraction() {
      poRecalculateTotals();
      const issues = poValidationIssues();
      state.poIntake.validated = issues.length === 0;
      state.poIntake.validationMessage = issues.length ? `${issues.length} blocking issue${issues.length === 1 ? '' : 's'} must be corrected.` : `All required header fields and ${state.poExtraction.line_count} line items are valid.`;
      if (issues.length) openModal('Validation requires attention', issues.slice(0, 5).join(' · '));
      renderPage();
    }

export function poSetHeaderField(key, value) {
      state.poExtraction[key] = key === 'stated_total' ? Number(value) : value;
      state.poIntake.correctedFields.add(key);
      state.poIntake.validated = false;
      poRecalculateTotals();
      renderPage();
    }

export function poSetLineField(index, key, value) {
      if (key === 'plant') {
        const plantCode = String(value || '').replace(/\D/g,'').slice(0,4);
        state.poExtraction.lines.forEach((line,lineIndex) => { line.plant = plantCode; state.poIntake.correctedLines.add(`${lineIndex}.plant`); });
      } else {
        state.poExtraction.lines[index][key] = key === 'quantity' || key === 'unit_price' ? Number(value) : value;
        state.poIntake.correctedLines.add(`${index}.${key}`);
      }
      state.poIntake.validated = false;
      poRecalculateTotals();
      renderPage();
    }

export function poSetReviewTab(tab) { state.poIntake.reviewTab = tab; renderPage(); }

export function poSetLineSearch(value) { state.poIntake.lineSearch = value; renderPage(); }

export function setPoValidationPage(page) {
      const totalPages = Math.max(1,Math.ceil(state.poExtraction.lines.length / 10));
      state.poValidationPage = Math.max(1,Math.min(Number(page) || 1,totalPages));
      renderPage();
    }

export function poSaveExtraction() {
      poRecalculateTotals();
      const issues = poValidationIssues();
      if (!state.poIntake.validated || issues.length) {
        openModal('Validation required', 'Validate the extracted purchase order after completing any corrections before saving it.');
        return;
      }
      const targetProject = PROJECTS.find(project => project.name === state.poIntake.project);
      if (!targetProject) {
        openModal('Project required', 'M01 requires the parent project to exist before a purchase order can be saved. Create or select a valid project first.');
        return;
      }
      if (!canWriteProject(targetProject)) {
        openModal('Project access is read-only', `You cannot save a purchase order to ${targetProject.name}. Select a project assigned to your account.`);
        return;
      }
      const storedId = `PO-${state.poExtraction.po_number}`;
      const uniqueLines = [...new Map(state.poExtraction.lines.map(line => [line.part_number, line])).values()];
      PO_EXTRACTION_RECORDS.set(storedId,JSON.parse(JSON.stringify(state.poExtraction)));
      PO_SOURCE_FILES.set(storedId,{ file:state.poIntake.sourceFile, name:state.poIntake.fileName || `${storedId}_v${state.poExtraction.version}.pdf` });
      if (!POS.some(po => po.id === storedId)) {
        POS.unshift({ id:storedId, project:state.poIntake.project, customer:state.poExtraction.jit_customer, version:`v${state.poExtraction.version}`, pnCount:uniqueLines.length, status:'Waiting BOM', statusType:'warning', date:state.poExtraction.order_date, delivery:state.poExtraction.lines[0]?.due_date || '', simStatus:'Not Run', simType:'neutral' });
        const workOrderBase = 1200 + PRODUCTION_ORDERS.length;
        uniqueLines.forEach(line => {
          if (!PNS.some(pn => pn.pn === line.part_number && pn.po === storedId)) {
            PNS.push({ pn:line.part_number, po:storedId, project:state.poIntake.project, desc:line.description, qty:Number(line.quantity || 0), unitPrice:Number(line.unit_price || 0), currency:state.poExtraction.currency || 'EUR', version:'—', status:'Waiting BOM', statusType:'warning', bom:'Missing', bomFile:'—', bomUpdated:'—' });
          }
          PRODUCTION_ORDERS.push({ id:`WO-${workOrderBase + PRODUCTION_ORDERS.filter(order => order.po === storedId).length + 1}`, po:storedId, project:state.poIntake.project, customer:state.poExtraction.jit_customer, fgpn:line.part_number, qty:Number(line.quantity || 0), produced:0, packaged:0, status:'Unplanned', due:line.due_date || 'Not set', line:'Not assigned', updatedBy:productionActor(), updatedAt:'Just now', priority:false });
        });
        recordPoLifecycleChange(storedId,null,'Unplanned',productionActor(),'Purchase order uploaded, extracted, validated and created',state.poIntake.fileName || `${storedId}.pdf`);
      } else {
        const existingPo = POS.find(po => po.id === storedId);
        const previousVersion = existingPo.version;
        const nextVersion = `v${state.poExtraction.version}`;
        existingPo.version = nextVersion;
        existingPo.pnCount = uniqueLines.length;
        existingPo.date = state.poExtraction.order_date;
        existingPo.delivery = state.poExtraction.lines[0]?.due_date || existingPo.delivery;
        uniqueLines.forEach(line => {
          let pn = PNS.find(item => item.pn === line.part_number && item.po === storedId);
          if (!pn) {
            pn = { pn:line.part_number, po:storedId, project:state.poIntake.project, desc:line.description, qty:Number(line.quantity || 0), version:'—', status:'Waiting BOM', statusType:'warning', bom:'Missing', bomFile:'—', bomUpdated:'—' };
            PNS.push(pn);
            PRODUCTION_ORDERS.push({ id:`WO-${1200 + PRODUCTION_ORDERS.length + 1}`, po:storedId, project:state.poIntake.project, customer:state.poExtraction.jit_customer, fgpn:line.part_number, qty:Number(line.quantity || 0), produced:0, packaged:0, status:'Unplanned', due:line.due_date || 'Not set', line:'Not assigned', updatedBy:productionActor(), updatedAt:'Just now', priority:false });
          } else {
            pn.desc = line.description; pn.qty = Number(line.quantity || 0); pn.unitPrice = Number(line.unit_price || 0); pn.currency = state.poExtraction.currency || 'EUR';
            const order = PRODUCTION_ORDERS.find(item => item.po === storedId && item.fgpn === line.part_number && item.status === 'Unplanned');
            if (order) { order.qty = Number(line.quantity || 0); order.due = line.due_date || order.due; order.updatedBy = productionActor(); order.updatedAt = 'Just now'; }
          }
        });
        const now = new Date().toISOString().slice(0,16).replace('T',' ');
        AUDIT_LOGS.unshift({ id:`AUD-${10300 + AUDIT_LOGS.length}`, date:now, user:productionActor(), module:'Purchase Order', action:previousVersion === nextVersion ? 'PO information updated' : 'Version Changed', entity:`${storedId} · ${nextVersion}`, project:existingPo.project, po:storedId, evidence:state.poIntake.fileName || `${storedId}_${nextVersion}.pdf`, details:`Validated PO update stored with ${uniqueLines.length} part numbers and ${state.poExtraction.line_count} extracted lines. Original PDF retained: ${state.poIntake.fileName || `${storedId}_${nextVersion}.pdf`}.`, diff:{ field:'Version', old:previousVersion, new:nextVersion } });
      }
      state.poIntake.saved = true;
      state.poIntake.storedRecordId = storedId;
      state.poIntake.step = 5;
      renderPage();
    }

export function poResetIntake() {
      const projectName = state.poIntake.project;
      resetPoIntakeState(projectName);
      renderPage();
    }

export function resetPoIntakeState(projectName = '') {
      state.poExtraction = JSON.parse(JSON.stringify(PO_EXTRACTION_SAMPLE));
      state.poValidationPage = 1;
      const project = writableProjects().find(item => item.name === projectName) || writableProjects()[0];
      state.poIntake = { step:1, project:project?.name || '', fileName:'', fileSize:'', uploadedAt:'', extracted:false, validated:false, saved:false, reviewTab:'header', lineSearch:'', correctedFields:new Set(), correctedLines:new Set(), validationMessage:'', storedRecordId:'', sourceFile:null };
    }

export function startPoUpload(projectName = '', poId = '') {
      const po = POS.find(item => item.id === poId);
      const targetProject = projectName || po?.project || writableProjects()[0]?.name || '';
      resetPoIntakeState(targetProject);
      if (po) {
        state.openContext.po = po.id;
        state.openContext.project = po.project;
        state.poExtraction.po_number = po.id.replace(/^PO-/, '');
        state.poExtraction.version = String((Number(String(po.version || 'v0').replace(/\D/g,'')) || 0) + 1);
        state.poExtraction.jit_customer = po.customer;
      } else if (targetProject) {
        state.openContext.project = targetProject;
      }
      navigate('po-upload');
    }

export function poIntakeStepper() {
      const labels = ['Upload PDF','Extract','Review','Validate','Confirm'];
      return `<div class="po-intake-stepper">${labels.map((label, index) => {
        const number = index + 1;
        const state = number < state.poIntake.step ? 'done' : number === state.poIntake.step ? 'active' : '';
        return `<div class="po-intake-step ${state}"><div class="po-intake-step-index">${number < state.poIntake.step ? '✓' : number}</div><div class="po-intake-step-label">${label}</div></div>`;
      }).join('')}</div>`;
    }

export function poFileSummary() {
      return `<div class="po-file-card"><div class="po-file-icon">${icon('FileText','')}</div><div style="min-width:0;flex:1;"><div class="po-file-name">${poEsc(state.poIntake.fileName)}</div><div class="po-file-meta">${poEsc(state.poIntake.fileSize)} · ${poEsc(state.poIntake.uploadedAt)}</div></div>${statusBadge('PDF accepted','success')}</div>`;
    }

export function poHeaderSections() {
      return [
        { title:'Order identification', fields:[['po_number','PO Number'],['version','Version'],['order_date','Order Date','date'],['change_date','Change Date','date'],['currency','Currency'],['reason_of_purchase','Reason of Purchase','wide']] },
        { title:'Supplier', fields:[['supplier_no','Supplier No.'],['supplier_name','Supplier Name','wide'],['supplier_address','Supplier Address','full']] },
        { title:'Buyer and invoicing', fields:[['buyer_name','Buyer Name','wide'],['buyer_vat','Buyer VAT'],['buyer_register_nr','Buyer Register No.'],['invoicing_party_taxid','Invoicing Party Tax ID'],['payment_terms','Payment Terms'],['incoterms','Incoterms']] },
        { title:'Delivery and contact', fields:[['delivery_contact','Delivery Contact'],['delivery_address','Delivery Address','wide'],['contact_name','Contact Name'],['contact_tel','Contact Telephone'],['contact_email','Contact Email'],['jit_customer','JIT Customer'],['development_level','Development Level'],['engineering_phase','Engineering Phase']] },
        { title:'Document text', fields:[['header_text','Header Text','full']] },
        { title:'Totals', fields:[['stated_total','Stated Total','number'],['computed_total','Computed Total','readonly'],['totals_match','Totals Match','readonly']] },
      ];
    }

export function poHeaderField(key, label, option) {
      const status = poHeaderStatus(key);
      const wideClass = option === 'wide' ? 'wide' : option === 'full' ? 'full' : '';
      const corrected = status === 'Corrected by user' ? 'corrected' : '';
      let value = state.poExtraction[key];
      if (key === 'computed_total') value = poMoney(value);
      if (key === 'totals_match') value = value ? 'Yes — totals match' : 'No — discrepancy detected';
      const readonly = option === 'readonly';
      return `<div class="po-field ${wideClass} ${corrected}"><div class="po-field-head"><label class="po-field-label">${label}</label><span class="po-field-status">${poStatusBadge(status)}</span></div><input class="po-extract-input" type="${option === 'date' ? 'date' : option === 'number' ? 'number' : 'text'}" value="${poEsc(value)}" ${readonly ? 'readonly' : `onchange="poSetHeaderField('${key}', this.value)"`}></div>`;
    }

export function poHeaderReview() {
      return poHeaderSections().map(section => `<div class="po-field-section"><div class="po-field-section-title"><span>${section.title}</span></div><div class="po-field-grid">${section.fields.map(field => poHeaderField(field[0], field[1], field[2])).join('')}</div></div>`).join('');
    }

export function poLineInput(index, key, numeric = false) {
      const line = state.poExtraction.lines[index];
      const plant = key === 'plant';
      return `<input class="po-line-input ${numeric || plant ? 'numeric' : ''}" type="${numeric ? 'number' : 'text'}" value="${poEsc(line[key])}" ${plant ? 'inputmode="numeric" maxlength="4" pattern="[0-9]{4}" title="Four-digit plant code; applies to every line"' : ''} onchange="poSetLineField(${index}, '${key}', this.value)">`;
    }

export function poLinesReview() {
      const q = state.poIntake.lineSearch.trim().toLowerCase();
      const filtered = state.poExtraction.lines.map((line, index) => ({ line, index })).filter(item => !q || Object.values(item.line).join(' ').toLowerCase().includes(q));
      return `<div class="po-lines-toolbar"><div><div class="section-title" style="margin:0;">Extracted Line Items</div><div class="hint">${filtered.length} of ${state.poExtraction.line_count}</div></div><div style="display:flex;gap:8px;"><input class="sim-select po-lines-search" value="${poEsc(state.poIntake.lineSearch)}" placeholder="Search part number or description…" onchange="poSetLineSearch(this.value)"><button class="btn sm" onclick="poSetLineSearch(document.querySelector('.po-lines-search').value)">${icon('search','')} Search</button></div></div>
      <div class="table-scroll"><table class="po-lines-table"><thead><tr><th>Line</th><th>Plant</th><th>Due Date</th><th>Material Group</th><th>Part Number</th><th>Description</th><th>Customer Ref.</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Review Status</th></tr></thead><tbody>${filtered.map(({line,index}) => `<tr><td>${poLineInput(index,'line_no')}</td><td>${poLineInput(index,'plant')}</td><td>${poLineInput(index,'due_date')}</td><td>${poLineInput(index,'material_group')}</td><td>${poLineInput(index,'part_number')}</td><td style="min-width:210px;">${poLineInput(index,'description')}</td><td>${poLineInput(index,'customer_part_ref')}</td><td>${poLineInput(index,'item_category')}</td><td>${poLineInput(index,'quantity',true)}</td><td>${poLineInput(index,'unit_price',true)}</td><td class="mono" style="text-align:right;">${poMoney(line.total)}</td><td>${poStatusBadge(poLineStatus(index))}</td></tr>`).join('')}</tbody></table></div>`;
    }

export function poUploadStep() {
      return `<div class="card" style="max-width:920px;margin:0 auto;"><div class="section-title">Step 1 — Upload Purchase Order</div><div class="sim-field"><label class="sim-field-label">Project <span style="color:var(--danger);">*</span></label><select class="sim-select" onchange="poIntake.project=this.value">${writableProjects().map(project => `<option value="${poEsc(project.name)}" ${state.poIntake.project === project.name ? 'selected' : ''}>${poEsc(project.name)} · ${poEsc(project.customer)}</option>`).join('')}</select></div><input id="poPdfInput" type="file" accept="application/pdf,.pdf" style="display:none;" onchange="poSelectFile(event)"><label class="po-dropzone" for="poPdfInput"><div class="po-dropzone-icon">${icon('upload','')}</div><div class="po-dropzone-title">Choose a purchase order PDF</div><div class="po-dropzone-copy">PDF · maximum 10 MB</div><span class="btn sm primary" style="margin-top:14px;pointer-events:none;">Browse PDF</span></label>${state.poIntake.fileName ? poFileSummary() : ''}<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:15px;"><button class="btn sm" onclick="poUseExampleFile()">Use Example PDF</button><button class="btn primary" onclick="poContinueUpload()">Continue ${icon('chevRight','')}</button></div></div>`;
    }

export function poExtractStep() {
      return `<div class="card" style="max-width:920px;margin:0 auto;"><div class="section-title">Step 2 — Extract Purchase Order</div>${poFileSummary()}<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:18px;"><button class="btn" onclick="poIntake.step=1;renderPage()">Back</button><button class="btn primary" onclick="poStartExtraction()">Run Extraction ${icon('chevRight','')}</button></div></div>`;
    }

export function poValidateStep() {
      const previewFields = [['PO Number',state.poExtraction.po_number],['Supplier',state.poExtraction.supplier_name],['Buyer',state.poExtraction.buyer_name],['Delivery Contact',state.poExtraction.delivery_contact],['Currency',state.poExtraction.currency],['Stated Total',poMoney(state.poExtraction.stated_total)]];
      const pageSize = 10;
      const totalPages = Math.max(1,Math.ceil(state.poExtraction.lines.length / pageSize));
      state.poValidationPage = Math.min(state.poValidationPage,totalPages);
      const pageLines = state.poExtraction.lines.slice((state.poValidationPage - 1) * pageSize,state.poValidationPage * pageSize);
      return `<div class="po-extract-kpis"><div class="po-extract-kpi"><div class="po-extract-kpi-label">Header fields</div><div class="po-extract-kpi-value">27</div></div><div class="po-extract-kpi"><div class="po-extract-kpi-label">Line items</div><div class="po-extract-kpi-value">${state.poExtraction.line_count}</div></div><div class="po-extract-kpi"><div class="po-extract-kpi-label">Computed total</div><div class="po-extract-kpi-value">${poMoney(state.poExtraction.computed_total)}</div></div><div class="po-extract-kpi"><div class="po-extract-kpi-label">Totals match</div><div class="po-extract-kpi-value" style="color:${state.poExtraction.totals_match ? '#16844B' : 'var(--danger)'};">${state.poExtraction.totals_match ? 'Yes' : 'No'}</div></div></div><div class="card"><div class="section-title"><span>Step 4 — Final Validation</span>${statusBadge(state.poIntake.validated ? 'Validation passed' : 'Pending validation',state.poIntake.validated ? 'success' : 'warning')}</div><div class="po-preview-grid">${previewFields.map(field => `<div class="po-preview-field"><div class="po-preview-label">${field[0]}</div><div class="po-preview-value">${poEsc(field[1])}</div></div>`).join('')}</div><div class="section-title" style="margin-top:20px;"><span>Line Items</span><span class="hint">10 rows per page</span></div><div class="table-scroll"><table id="poValidationLinesTable"><thead><tr><th>Line</th><th>Plant</th><th>Due Date</th><th>Material Group</th><th>Part Number</th><th>Description</th><th>Customer Ref.</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${pageLines.map(line => `<tr><td class="mono">${line.line_no}</td><td>${line.plant || '—'}</td><td class="mono">${line.due_date}</td><td>${line.material_group}</td><td class="mono">${line.part_number}</td><td>${line.description}</td><td class="mono">${line.customer_part_ref}</td><td>${line.item_category}</td><td class="mono">${line.quantity}</td><td class="mono">${poMoney(line.unit_price)}</td><td class="mono">${poMoney(line.total)}</td></tr>`).join('')}</tbody></table></div>${paginationBar(state.poExtraction.lines.length,state.poValidationPage,pageSize,'setPoValidationPage')}<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-top:16px;"><button class="btn" onclick="poIntake.step=3;renderPage()">Back to Review</button><div style="display:flex;flex-wrap:wrap;gap:8px;">${!state.poIntake.validated ? `<button class="btn primary" onclick="poValidateExtraction()">${icon('check','')} Run Final Validation</button>` : `${poDocumentDownloadButtons('draft',true)}<button class="btn" onclick="poValidateExtraction()">Validate Again</button><button class="btn primary" onclick="poSaveExtraction()">${icon('lock','')} Confirm & Save PO</button>`}</div></div></div>`;
    }

export function poReviewStep() {
      const tabs = [['header','Header Data'],['lines',`Line Items (${state.poExtraction.line_count})`]];
      const reviewBody = state.poIntake.reviewTab === 'lines' ? poLinesReview() : poHeaderReview();
      const corrections = state.poIntake.correctedFields.size + state.poIntake.correctedLines.size;
      return `<div class="card"><div class="section-title"><span>Step 3 — Review Extracted Information</span>${statusBadge(`${corrections} correction${corrections === 1 ? '' : 's'}`,corrections ? 'info' : 'neutral')}</div><div class="po-review-tabs">${tabs.map(tab => `<button class="po-review-tab ${state.poIntake.reviewTab === tab[0] ? 'active' : ''}" onclick="poSetReviewTab('${tab[0]}')">${tab[1]}</button>`).join('')}</div>${reviewBody}<div class="po-review-actions"><span class="hint">${state.poExtraction.line_count} extracted line items</span><div style="display:flex;flex-wrap:wrap;gap:8px;">${poDocumentDownloadButtons('draft',true)}<button class="btn" onclick="poIntake.step=2;renderPage()">Back</button><button class="btn primary" onclick="poIntake.step=4;poIntake.validated=false;renderPage()">Continue to Validation ${icon('chevRight','')}</button></div></div></div>`;
    }

export function poConfirmStep() {
      return `<div class="card po-save-success"><div class="po-save-success-icon">${icon('check','')}</div><div class="po-save-success-title">Purchase Order Saved</div><div class="po-save-success-copy">${poEsc(state.poIntake.storedRecordId)} · Version V${poEsc(state.poExtraction.version)}</div><div class="po-extract-kpis" style="max-width:760px;margin:24px auto 0;text-align:left;"><div class="po-extract-kpi"><div class="po-extract-kpi-label">Project</div><div class="po-extract-kpi-value" style="font-size:14px;">${poEsc(state.poIntake.project)}</div></div><div class="po-extract-kpi"><div class="po-extract-kpi-label">PO version</div><div class="po-extract-kpi-value">V${poEsc(state.poExtraction.version)}</div></div><div class="po-extract-kpi"><div class="po-extract-kpi-label">Line items</div><div class="po-extract-kpi-value">${state.poExtraction.line_count}</div></div><div class="po-extract-kpi"><div class="po-extract-kpi-label">Stored total</div><div class="po-extract-kpi-value" style="font-size:14px;">${poMoney(state.poExtraction.computed_total)}</div></div></div><div style="display:flex;justify-content:center;flex-wrap:wrap;gap:9px;margin-top:22px;">${poDocumentDownloadButtons(state.poIntake.storedRecordId)}<button class="btn" onclick="poResetIntake()">Upload Another PO</button><button class="btn" onclick="navigateBack('po-list')">Return</button><button class="btn primary" onclick="openPo('${inlineJsValue(state.poIntake.storedRecordId)}','Overview',{replace:true})">Open PO Workspace</button></div></div>`;
    }

export function pageUploadWizard() {
      const content = state.poIntake.step === 1 ? poUploadStep() : state.poIntake.step === 2 ? poExtractStep() : state.poIntake.step === 3 ? poReviewStep() : state.poIntake.step === 4 ? poValidateStep() : poConfirmStep();
      return `${poIntakeStepper()}${content}`;
    }

export function pagePnBomUpload() {
      const pnId = state.openContext.pn;
      return focusedBomImportPanel('pn',pnId);
    }

export function pageHistory() {
      const events = stockLedgerEvents();
      const movementCount = events.filter(event => /transfer|reception|stock updated/i.test(`${event.module} ${event.action}`)).length;
      const people = new Set(events.map(event => event.actor)).size;
      const materials = new Set(events.map(event => event.entity).filter(value => /^MAT-/i.test(value))).size;
      return `<section class="stock-shell">
  <div class="stock-command-bar"><div><span>Inventory Traceability</span><h2>Stock Movement History</h2></div><div class="stock-page-actions"><button class="btn" onclick="navigate('stock-dashboard')">${icon('chevLeft','')} Stock Dashboard</button></div></div>
  <div class="stock-mini-kpis"><div><span>Recorded events</span><strong>${events.length}</strong></div><div><span>Stock movements</span><strong>${movementCount}</strong></div><div><span>Materials</span><strong>${materials}</strong></div><div><span>People involved</span><strong>${people}</strong></div></div>
  ${traceabilityWorkspace(events,'Complete stock history','completeStockHistoryTable')}
</section>`;
    }

export function pageReports() {
      return `<div class="card"><div class="section-title">Reports <span class="hint">Read-only</span></div>
    <div class="empty-state">
      ${icon('reports', '')}
      <div class="e-title">No report generated yet</div>
      <div class="e-sub">Reports summarize project, PO, and stock activity across the plant. Select a date range to generate one.</div>
    </div>
  </div>`;
    }

export function pageProfile() {
      const person = ROLE_PERSONA[state.currentRole];
      return `<div class="card" style="max-width:420px;">
    <div style="display:flex; align-items:center; gap:14px; margin-bottom:16px;">
      <div class="avatar" style="width:48px; height:48px; font-size:16px;">${person.initials}</div>
      <div><div style="font-weight:700; font-size:15px;">${person.name}</div><div style="font-size:12.5px; color:var(--ink-faint);">${ROLE_LABEL[state.currentRole]}</div></div>
    </div>
    <div style="font-size:13px; color:var(--ink-soft); line-height:2;">
      <div><strong>Email</strong> — ${person.email}</div>
      <div><strong>Site</strong> — ${person.site}</div>
      <div><strong>Role</strong> — ${ROLE_LABEL[state.currentRole]}</div>
    </div>
  </div>`;
    }

export function pageLogin() {
      return `<div class="login-page">
    <div class="login-card">
      <div class="login-logo"><img src="./adinet-.png" alt="Adient logo"></div>
      <div class="login-title">LaunchOps PO Control</div>
      <div class="login-sub">Secure manufacturing workflow</div>
      <div class="login-field"><label>Username</label><input type="text" placeholder="Username"></div>
      <div class="login-field"><label>Password</label><input type="password" placeholder="Password"></div>
      <button class="btn primary login-button">Login</button>
    </div>
  </div>`;
    }
