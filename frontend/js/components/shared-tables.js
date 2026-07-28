/* ==========================================================================
   shared-tables.js
   ========================================================================== */

import { openModal } from './modal.js';
import { ROLE_PERSONA } from './nav-config.js';
import { navigate } from './nav-render.js';
import { AUDIT_LOGS, BOM_IMPORT_RECORDS, BOM_USAGE, MATERIALS, PNS, POS, PO_BOM_FILES, PROJECT_BOM_META } from '../data/mock-data.js';
import { PROJECTS } from '../data/projects-store.js';
import { poEsc } from '../pages/po-intake.js';
import { renderPage } from '../pages/router.js';
import { state } from '../state.js';
import { statusBadge } from '../utils/helpers.js';
import { icon } from '../utils/icons.js';
import { can } from '../utils/permissions.js';
import { emptyStateBlock, exportFileName, filterChips, inlineJsValue, rowCountLabel, tableExportActions } from '../utils/table-helpers.js';
import { THRESHOLD_DEFAULTS } from '../utils/table-state.js';

export function poTable(list) {
      return `<table><thead><tr><th>PO</th><th>Project</th><th>Customer</th><th>Version</th><th>Status</th><th>Delivery</th></tr></thead>
    <tbody>${list.map(po => `<tr class="clickable-row" onclick="navigate('po-workspace')">
      <td class="mono">${po.id}</td><td>${po.project}</td><td>${po.customer}</td>
      <td class="mono">${po.version}</td><td>${statusBadge(po.status, po.statusType)}</td><td>${po.delivery}</td>
    </tr>`).join('')}</tbody></table>`;
    }

export function timelineHtml(steps) {
      return `<div class="timeline">${steps.map(s => `<div class="tl-item">
    <div class="tl-dot ${s.done ? 'done' : ''}"></div><div class="tl-title">${s.title}</div><div class="tl-time">${s.time}</div>
  </div>`).join('')}</div>`;
    }

export function bomMaterialTable(cols, rows, tableId = '') {
      cols = cols || ['code', 'desc', 'required', 'warehouse', 'wip', 'missing'];
      rows = rows || MATERIALS;
      const headers = { code: 'Material', desc: 'Description', required: 'Required', warehouse: 'Warehouse', wip: 'WIP', missing: 'Missing', cutman: 'CutMan', transit: 'Transit', supplier: 'Supplier', type: 'Type' };
      if (rows.length === 0) return emptyStateBlock('No materials found', 'Try adjusting or resetting your filters.', 'resetMaterialFilters');
      return `<table${tableId ? ` id="${tableId}"` : ''}><thead><tr>${cols.map(c => `<th>${headers[c]}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(m => `<tr class="clickable-row" onclick="openMaterialDetail('${inlineJsValue(m.code)}')">
      ${cols.map(c => {
        const val = m[c];
        if (c === 'code') return `<td class="mono">${val}</td>`;
        if (c === 'desc') return `<td>${val}</td>`;
        if (c === 'type') return `<td>${val}</td>`;
        if (c === 'supplier') return `<td>${val}</td>`;
        if (c === 'missing') return `<td class="mono" style="color:${val > 0 ? 'var(--danger)' : 'var(--ink-soft)'}; font-weight:700;">${val}</td>`;
        return `<td class="mono">${val}</td>`;
      }).join('')}
    </tr>`).join('')}</tbody></table>`;
    }

export function setMaterialSearch(v) { state.materialFilters.search = v; renderPage(); }

export function setMaterialFilter(key, v) { state.materialFilters[key] = v; renderPage(); }

export function clearMaterialFilter(key) { state.materialFilters[key] = ''; renderPage(); }

export function resetMaterialFilters() { state.materialFilters = { search: '', type: '', warehouse: '', missing: '' }; renderPage(); }

export function filterMaterials() {
      const f = state.materialFilters;
      return MATERIALS.filter(m => {
        if (f.search && !(`${m.code} ${m.desc}`.toLowerCase().includes(f.search.toLowerCase()))) return false;
        if (f.type && m.type !== f.type) return false;
        if (f.warehouse === 'Available' && m.warehouse <= 0) return false;
        if (f.warehouse === 'Missing' && m.missing <= 0) return false;
        if (f.warehouse === 'Transit' && m.transit <= 0) return false;
        if (f.warehouse === 'WIP' && m.wip <= 0) return false;
        if (f.missing === 'Low Stock' && m.warehouse >= m.threshold) return false;
        if (f.missing === 'Missing Only' && m.missing <= 0) return false;
        return true;
      });
    }

export function uniqueValues(arr, key) { return [...new Set(arr.map(x => x[key]))].sort(); }

export function materialsToolbarHtml() {
      const opt = (key, list, placeholder) => `<select class="tt-select" onchange="setMaterialFilter('${key}', this.value)">
    <option value="">${placeholder}</option>
    ${list.map(v => `<option value="${v.value}" ${state.materialFilters[key] === v.value ? 'selected' : ''}>${v.label}</option>`).join('')}
  </select>`;
      return `<div class="table-toolbar">
    <div class="tt-search">${icon('search', '')}<input type="text" placeholder="Search material…" value="${state.materialFilters.search}" oninput="setMaterialSearch(this.value)"/></div>
    ${opt('type', uniqueValues(MATERIALS, 'type').map(v => ({ value: v, label: v })), 'Material Type')}
    ${opt('warehouse', [{ value: 'Available', label: 'Available' }, { value: 'Missing', label: 'Missing' }, { value: 'Transit', label: 'Transit' }, { value: 'WIP', label: 'WIP' }], 'Warehouse')}
    ${opt('missing', [{ value: 'Low Stock', label: 'Low Stock' }, { value: 'Missing Only', label: 'Missing Only' }], 'Missing')}
    <div class="tt-spacer"></div>
    <div class="tt-icon-btn" title="Refresh" onclick="refreshNotice()">${icon('refresh', '')}</div>
    <div class="tt-icon-btn" title="Export" onclick="exportNotice()">${icon('download', '')}</div>
  </div>`;
    }

export function materialsBlock(cols) {
      const rows = filterMaterials();
      return `${materialsToolbarHtml()}
    ${filterChips(state.materialFilters, { type: 'Type', warehouse: 'Warehouse', missing: 'Missing' }, 'clearMaterialFilter', 'resetMaterialFilters')}
    <div class="table-head-row">${rowCountLabel(rows.length, 'material')}</div>
    ${bomMaterialTable(cols, rows)}`;
    }

export function assignedProjectNames() {
      // Used elsewhere in the app (e.g. openPnBomUpload's own-project
      // check) as "projects this user can write to". Now driven by the
      // backend's real per-request can_write flag (SRS M01-FR-02/06/07,
      // enforced server-side -- see backend/app/api/routes/projects.py)
      // instead of matching a hardcoded persona display name against the
      // old ADMIN_ASSIGNMENTS mock.
      return new Set(PROJECTS.filter(project => project.canWrite).map(project => project.name));
    }

export function visibleProjects() {
      // PROJECTS is already scoped server-side for a Launch Engineer
      // (SRS M01-FR-06/M01-AC-01 -- their GET /projects response only
      // ever contains their own assigned projects), so there's nothing
      // left to filter here -- every other role already gets the full
      // list back from the API too.
      return PROJECTS;
    }

export function canWriteProject(project) {
      return Boolean(project?.canWrite);
    }

export function writableProjects() { return PROJECTS.filter(project => canWriteProject(project)); }

export function projectForContext() {
      const contextual = PROJECTS.find(p => p.name === state.openContext.project || p.id === state.openContext.project)
        || PROJECTS.find(p => p.name === POS.find(po => po.id === state.openContext.po)?.project)
        || PROJECTS[0];
      return contextual;
    }

export function posForProject(projectName) { return POS.filter(po => po.project === projectName); }

export function pnsForPo(poId) { return PNS.filter(pn => pn.po === poId); }

export function pnsForProject(projectName) { return PNS.filter(pn => pn.project === projectName); }

export function bomReadinessForPns(pns) {
      const total = pns.length;
      const uploaded = pns.filter(pn => pn.bom === 'Uploaded').length;
      const missing = pns.filter(pn => pn.bom !== 'Uploaded');
      const percent = total ? Math.round(uploaded / total * 100) : 0;
      return { total, uploaded, missing, percent, ready: total > 0 && missing.length === 0 };
    }

export function poBomFileFor(poId) {
      return PO_BOM_FILES.filter(file => file.po === poId).slice(-1)[0] || null;
    }

export function poBomReadiness(poId) {
      return { ...bomReadinessForPns(pnsForPo(poId)), poBomFile:poBomFileFor(poId) };
    }

export function projectBomReadiness(projectName) { return bomReadinessForPns(pnsForProject(projectName)); }

export function bomImportScopePns(level, target) {
      if (level === 'pn') return PNS.filter(item => item.pn === target);
      if (level === 'po') return pnsForPo(target);
      return pnsForProject(target);
    }

export function bomImportProject(level, target) {
      if (level === 'project') return PROJECTS.find(item => item.name === target);
      if (level === 'po') return PROJECTS.find(item => item.name === POS.find(po => po.id === target)?.project);
      return PROJECTS.find(item => item.name === PNS.find(pn => pn.pn === target)?.project);
    }

export function bomImportLevelLabel(level) {
      return level === 'pn' ? 'PN BOM' : level === 'po' ? 'PO BOM' : 'Project BOM';
    }

export function bomImportTargetLabel(level, target) {
      return level === 'project' ? target : target;
    }

export function emptyBomImport(level, target) {
      return { open:true, level, target, stage:'upload', fileName:'', fileSize:'', rows:[], validationRun:false, approvedRows:new Set(), importedRecord:null };
    }

export function ensureBomImport(level, target) {
      if (!state.bomImport.open || state.bomImport.level !== level || state.bomImport.target !== target) state.bomImport = emptyBomImport(level, target);
    }

export function beginBomImport(level, target, renderNow = true) {
      const project = bomImportProject(level, target);
      if (!project || !canWriteProject(project)) {
        openModal('BOM upload not permitted', 'Only an assigned Launch Engineer or Launch Manager can import and validate this BOM.');
        return false;
      }
      state.bomImport = emptyBomImport(level, target);
      if (renderNow) renderPage();
      return true;
    }

export function closeBomImport() {
      const level = state.bomImport.level;
      if (level === 'po') state.poBomUpload = { open:false, po:'', fileName:'', fileSize:'', validated:false, imported:false };
      state.bomImport = { open:false, level:'', target:'', stage:'upload', fileName:'', fileSize:'', rows:[], validationRun:false, approvedRows:new Set(), importedRecord:null };
      if (level === 'pn' && state.currentPage === 'pn-bom-upload') navigate('pn-workspace'); else renderPage();
    }

export function bomImportExampleRows(level, target) {
      const scoped = bomImportScopePns(level, target);
      const fgpns = scoped.length ? scoped.map(item => item.pn) : [target];
      const shared = { material:'MAT-6630', description:'PVC tape black 19 mm', materialType:'Tape', usageQty:'0.35', unit:'M', supplier:'3M', scrapPct:'2.0' };
      const templates = [
        { material:'MAT-5512', description:'Connector housing 4-pin', materialType:'Connector', usageQty:'1', unit:'PCS', supplier:'TE Connectivity', scrapPct:'0.5' },
        { material:'MAT-4471', description:'Harness retention clip', materialType:'Clip', usageQty:'4', unit:'PCS', supplier:'Amphenol', scrapPct:'1.0' },
        { material:'MAT-2208', description:'Primary wire 0.5 mm red', materialType:'Wire', usageQty:'2.40', unit:'M', supplier:'Leoni', scrapPct:'3.0' },
        { material:'MAT-3390', description:'Cable sleeve 8 mm', materialType:'Tube', usageQty:'0.80', unit:'M', supplier:'Sumitomo', scrapPct:'1.5' },
        { material:'MAT-1207', description:'Terminal pin, gold plated', materialType:'Terminal', usageQty:'2', unit:'PCS', supplier:'Yazaki', scrapPct:'0.8' },
      ];
      let excelRow = 2;
      return fgpns.flatMap((fgpn, fgIndex) => {
        const materials = level === 'pn' ? [shared, templates[0], templates[1], templates[2]] : [shared, templates[(fgIndex + 1) % templates.length], templates[(fgIndex + 3) % templates.length]];
        return materials.map((material, index) => ({
          fgpn,
          material: material.material,
          description: material.description,
          materialType: material.materialType,
          usageQty: material.usageQty,
          unit: material.unit,
          supplier: material.supplier,
          scrapPct: material.scrapPct,
          effectiveDate: `2026-07-${String(1 + fgIndex).padStart(2,'0')}`,
          revision: `R${1 + fgIndex}`,
          sheet: 'BOM_Data',
          excelRow: excelRow++,
          approved: false,
        }));
      });
    }

export function bomImportUseExample() {
      const safeTarget = String(state.bomImport.target).replace(/[^A-Za-z0-9_-]+/g, '_');
      state.bomImport.fileName = `${safeTarget}_${state.bomImport.level.toUpperCase()}_BOM_example.xlsx`;
      state.bomImport.fileSize = '42 KB';
      state.bomImport.rows = bomImportExampleRows(state.bomImport.level, state.bomImport.target);
      state.bomImport.stage = 'extracted';
      state.bomImport.validationRun = false;
      state.bomImport.approvedRows = new Set();
      renderPage();
    }

export function bomImportSelectFile(event) {
      const file = event?.target?.files?.[0];
      if (!file) return;
      if (!/\.xlsx?$/i.test(file.name)) {
        openModal('Invalid BOM format', 'Select an Excel workbook in .xlsx or .xls format.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        openModal('BOM workbook is too large', 'The maximum accepted workbook size is 10 MB.');
        return;
      }
      state.bomImport.fileName = file.name;
      state.bomImport.fileSize = `${Math.max(1, Math.round(file.size / 1024))} KB`;
      state.bomImport.rows = bomImportExampleRows(state.bomImport.level, state.bomImport.target);
      state.bomImport.stage = 'extracted';
      state.bomImport.validationRun = false;
      state.bomImport.approvedRows = new Set();
      renderPage();
    }

export function bomImportAllowedFgpns() {
      return new Set(bomImportScopePns(state.bomImport.level, state.bomImport.target).map(item => item.pn));
    }

export function bomImportCellIssue(row, rowIndex, field) {
      const value = String(row[field] ?? '').trim();
      if (field === 'fgpn') {
        if (!value) return 'FGPN is required.';
        if (!bomImportAllowedFgpns().has(value)) return `FGPN is outside this ${bomImportLevelLabel(state.bomImport.level)} scope.`;
      }
      if (field === 'material') {
        if (!value) return 'Material PN is required.';
        if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,}$/.test(value)) return 'Use a valid material part number.';
        const duplicate = state.bomImport.rows.findIndex((other, index) => index !== rowIndex && String(other.fgpn).trim() === String(row.fgpn).trim() && String(other.material).trim().toLowerCase() === value.toLowerCase());
        if (duplicate >= 0) return `Duplicate of Excel row ${state.bomImport.rows[duplicate].excelRow}.`;
      }
      if (field === 'description' && value.length < 3) return 'Description is required.';
      if (field === 'materialType' && !value) return 'Material type is required.';
      if (field === 'usageQty' && (!(Number(value) > 0) || !Number.isFinite(Number(value)))) return 'Usage quantity must be greater than 0.';
      if (field === 'unit' && !['PCS','M','KG','L'].includes(value)) return 'Unit must be PCS, M, KG or L.';
      if (field === 'supplier' && value.length < 2) return 'Supplier is required.';
      if (field === 'scrapPct' && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100)) return 'Scrap must be between 0 and 100.';
      if (field === 'effectiveDate' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Use YYYY-MM-DD.';
      if (field === 'revision' && !value) return 'Revision is required.';
      return '';
    }

export const BOM_IMPORT_FIELDS = ['fgpn','material','description','materialType','usageQty','unit','supplier','scrapPct','effectiveDate','revision'];

export function bomImportRowIssues(row, index) {
      return BOM_IMPORT_FIELDS.map(field => ({ field, issue:bomImportCellIssue(row,index,field) })).filter(item => item.issue);
    }

export function bomImportStats() {
      const totalCells = state.bomImport.rows.length * BOM_IMPORT_FIELDS.length;
      const invalidCells = state.bomImport.rows.reduce((sum,row,index) => sum + bomImportRowIssues(row,index).length, 0);
      const fgpnCount = new Set(state.bomImport.rows.map(row => row.fgpn)).size;
      const materialCount = new Set(state.bomImport.rows.map(row => row.material)).size;
      const sharedMaterials = [...new Set(state.bomImport.rows.map(row => row.material))].filter(material => new Set(state.bomImport.rows.filter(row => row.material === material).map(row => row.fgpn)).size > 1).length;
      return { totalCells, invalidCells, validCells:totalCells-invalidCells, fgpnCount, materialCount, sharedMaterials };
    }

export function updateBomImportCell(index, field, value) {
      if (!state.bomImport.rows[index]) return;
      state.bomImport.rows[index][field] = value;
      state.bomImport.stage = 'extracted';
      state.bomImport.validationRun = true;
      state.bomImport.approvedRows.delete(index);
      renderPage();
    }

export function validateBomImportFields() {
      if (!state.bomImport.rows.length) {
        openModal('Extract a workbook first', 'Choose an Excel BOM file or load the example workbook before validation.');
        return;
      }
      state.bomImport.validationRun = true;
      const stats = bomImportStats();
      state.bomImport.stage = stats.invalidCells === 0 ? 'validated' : 'extracted';
      if (stats.invalidCells > 0) state.bomImport.approvedRows = new Set();
      renderPage();
      openModal(stats.invalidCells ? 'BOM fields need correction' : 'All extracted fields are valid', stats.invalidCells ? `${stats.invalidCells} extracted field${stats.invalidCells === 1 ? '' : 's'} must be corrected before row approval.` : `${stats.validCells} fields across ${state.bomImport.rows.length} BOM rows passed validation. Review and approve the rows before import.`);
    }

export function toggleBomImportRow(index) {
      if (state.bomImport.stage !== 'validated' || bomImportRowIssues(state.bomImport.rows[index],index).length) return;
      if (state.bomImport.approvedRows.has(index)) state.bomImport.approvedRows.delete(index); else state.bomImport.approvedRows.add(index);
      renderPage();
    }

export function approveAllBomImportRows() {
      if (state.bomImport.stage !== 'validated') return;
      state.bomImport.approvedRows = new Set(state.bomImport.rows.map((row,index) => index).filter(index => bomImportRowIssues(state.bomImport.rows[index],index).length === 0));
      renderPage();
    }

export function latestBomImportRecord(level, target) {
      return BOM_IMPORT_RECORDS.filter(record => record.level === level && record.target === target).slice(-1)[0] || null;
    }

export function importValidatedBom() {
      const stats = bomImportStats();
      if (state.bomImport.stage !== 'validated' || stats.invalidCells) {
        openModal('Field validation required', 'Validate every extracted field before importing the BOM.');
        return;
      }
      if (state.bomImport.approvedRows.size !== state.bomImport.rows.length) {
        openModal('Row approval required', `Approve all ${state.bomImport.rows.length} extracted BOM rows before the final import.`);
        return;
      }
      const level = state.bomImport.level;
      const target = state.bomImport.target;
      const scopedPns = bomImportScopePns(level, target);
      const currentVersions = level === 'po'
        ? PO_BOM_FILES.filter(file => file.po === target).map(file => Number(String(file.version).replace(/\D/g,'')) || 0)
        : level === 'project'
          ? [Number(String(PROJECT_BOM_META.version).replace(/\D/g,'')) || 0]
          : [Number(String(scopedPns[0]?.version).replace(/\D/g,'')) || 0];
      const version = `v${Math.max(0,...currentVersions) + 1}`;
      const now = new Date().toISOString().slice(0,10);
      const record = {
        id:`BOM-IMP-${String(BOM_IMPORT_RECORDS.length + 1).padStart(4,'0')}`,
        level,
        target,
        file:state.bomImport.fileName,
        fileSize:state.bomImport.fileSize,
        version,
        importedAt:now,
        importedBy:ROLE_PERSONA[state.currentRole].name,
        rows:state.bomImport.rows.map(row => ({ ...row, approved:true })),
        fgpnCount:stats.fgpnCount,
        materialCount:stats.materialCount,
        sharedMaterials:stats.sharedMaterials,
        validatedFields:stats.validCells,
        status:'Validated',
      };
      BOM_IMPORT_RECORDS.push(record);
      const uniqueFgpns = [...new Set(record.rows.map(row => row.fgpn))];
      uniqueFgpns.forEach(fgpn => { BOM_USAGE[fgpn] = {}; });
      record.rows.forEach(row => {
        BOM_USAGE[row.fgpn][row.material] = Number(row.usageQty);
        let material = MATERIALS.find(item => item.code === row.material);
        if (!material) {
          material = { code:row.material, desc:row.description, type:row.materialType, supplier:row.supplier, required:0, warehouse:0, cutman:0, wip:0, missing:0, threshold:0, transit:0, projects:[], pns:[] };
          MATERIALS.push(material);
          THRESHOLD_DEFAULTS[material.code] = 0;
        }
        if (!material.pns.includes(row.fgpn)) material.pns.push(row.fgpn);
        const pnProject = PNS.find(item => item.pn === row.fgpn)?.project;
        if (pnProject && !material.projects.includes(pnProject)) material.projects.push(pnProject);
      });
      scopedPns.forEach(pn => {
        pn.bom = 'Uploaded';
        pn.bomFile = `${record.file} · ${pn.pn}`;
        pn.bomUpdated = now;
        pn.version = version;
        pn.bomSource = `${bomImportLevelLabel(level)} Excel import`;
        if (pn.status === 'Waiting BOM') { pn.status = 'Ready'; pn.statusType = 'success'; }
      });
      if (level === 'po') {
        PO_BOM_FILES.push({ po:target, file:record.file, version, fgpnCount:record.fgpnCount, materialCount:record.rows.length, uploadedBy:record.importedBy, uploadedAt:now, status:'Validated' });
        const po = POS.find(item => item.id === target);
        if (po && po.status === 'Waiting BOM') { po.status = 'Ready'; po.statusType = 'success'; }
      }
      if (level === 'project') {
        PROJECT_BOM_META.version = version;
        PROJECT_BOM_META.materialsCount = record.materialCount;
        PROJECT_BOM_META.lastUpload = now;
        PROJECT_BOM_META.uploadedBy = record.importedBy;
      }
      const project = bomImportProject(level,target);
      AUDIT_LOGS.unshift({ id:`AUD-${10400 + AUDIT_LOGS.length}`, date:new Date().toISOString().slice(0,16).replace('T',' '), user:record.importedBy, module:'BOM', action:`${bomImportLevelLabel(level)} Excel imported`, entity:`${target} · ${version}`, project:project?.name || '', po:level === 'po' ? target : '', details:`${record.file}: ${record.fgpnCount} FGPNs, ${record.rows.length} rows and ${record.validatedFields} validated fields.` });
      state.bomImport.stage = 'imported';
      state.bomImport.importedRecord = record;
      renderPage();
      openModal(`${bomImportLevelLabel(level)} imported`, `${record.file} was stored as ${version}. Every extracted field and all ${record.rows.length} BOM rows were validated and approved.`);
    }

export function downloadBomExample() {
      const rows = state.bomImport.rows.length ? state.bomImport.rows : bomImportExampleRows(state.bomImport.level,state.bomImport.target);
      const headers = ['Finished Good PN','Material PN','Material Description','Material Type','Usage Quantity','Unit','Supplier','Scrap %','Effective Date','Revision'];
      const html = `<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${headers.map(value => `<th>${value}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${[row.fgpn,row.material,row.description,row.materialType,row.usageQty,row.unit,row.supplier,row.scrapPct,row.effectiveDate,row.revision].map(value => `<td>${poEsc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
      const blob = new Blob([html], { type:'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${String(state.bomImport.target).replace(/[^A-Za-z0-9_-]+/g,'_')}_BOM_Excel_example.xls`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    }

export function bomImportCell(row, index, field, type = 'text', wide = false) {
      const issue = bomImportCellIssue(row,index,field);
      const stateClass = state.bomImport.validationRun ? (issue ? 'invalid' : 'valid') : '';
      const mark = state.bomImport.validationRun ? `<span class="bom-cell-mark">${issue ? '!' : '✓'}</span>` : '';
      let control = '';
      if (field === 'unit') {
        control = `<select class="bom-cell-input" onchange="updateBomImportCell(${index},'${field}',this.value)">${['PCS','M','KG','L'].map(value => `<option ${row[field] === value ? 'selected' : ''}>${value}</option>`).join('')}</select>`;
      } else if (field === 'materialType') {
        control = `<select class="bom-cell-input" onchange="updateBomImportCell(${index},'${field}',this.value)">${['Connector','Terminal','Wire','Tape','Tube','Clip','Other'].map(value => `<option ${row[field] === value ? 'selected' : ''}>${value}</option>`).join('')}</select>`;
      } else {
        control = `<input class="bom-cell-input" type="${type}" value="${poEsc(row[field])}" onchange="updateBomImportCell(${index},'${field}',this.value)"/>`;
      }
      return `<div class="bom-cell ${wide ? 'wide' : ''} ${stateClass}">${control}${mark}${issue && state.bomImport.validationRun ? `<div class="bom-cell-issue">${issue}</div>` : ''}</div>`;
    }

export function bomImportPanel(level, target) {
      ensureBomImport(level,target);
      const stats = bomImportStats();
      const stageIndex = state.bomImport.stage === 'upload' ? 0 : state.bomImport.stage === 'extracted' ? 1 : state.bomImport.stage === 'validated' ? 2 : 3;
      const levelLabel = bomImportLevelLabel(level);
      const allApproved = state.bomImport.rows.length > 0 && state.bomImport.approvedRows.size === state.bomImport.rows.length;
      const steps = ['Upload Excel','Review extraction','Validate & approve','Imported'];
      if (state.bomImport.stage === 'imported' && state.bomImport.importedRecord) {
        return `<div class="bom-import-shell"><div class="bom-import-header"><div><span class="ws-id">${levelLabel.toUpperCase()} IMPORT</span><strong>${poEsc(target)} · ${state.bomImport.importedRecord.version}</strong><span>Validated Excel extraction is now the current controlled BOM version.</span></div><button class="icon-btn" onclick="closeBomImport()">${icon('close','')}</button></div><div class="bom-import-body"><div class="bom-import-success">${icon('check','')}<strong>${state.bomImport.importedRecord.file} imported successfully</strong><span>${state.bomImport.importedRecord.fgpnCount} FGPNs · ${state.bomImport.importedRecord.rows.length} material rows · ${state.bomImport.importedRecord.validatedFields} validated fields</span></div>${bomImportedDashboard(level,target,state.bomImport.importedRecord)}</div></div>`;
      }
      return `<div class="bom-import-shell">
        <div class="bom-import-header">
          <div><span class="ws-id">${levelLabel.toUpperCase()} EXCEL IMPORT</span><strong>Extract, review and validate ${poEsc(target)}</strong><span>${level === 'pn' ? 'This workbook must contain one FGPN.' : `This workbook may contain multiple FGPNs; the same material may be reused by different FGPNs.`}</span></div>
          <button class="icon-btn" onclick="closeBomImport()" title="Close">${icon('close','')}</button>
        </div>
        <div class="bom-import-body">
          <div class="bom-import-steps">${steps.map((step,index) => `<div class="bom-import-step ${index < stageIndex ? 'done' : index === stageIndex ? 'active' : ''}"><b>${index < stageIndex ? '✓' : index + 1}</b>${step}</div>`).join('')}</div>
          <div class="bom-import-upload-grid">
            <div>
              <input id="bomImportFileInput" type="file" accept=".xlsx,.xls" style="display:none" onchange="bomImportSelectFile(event)"/>
              <label class="po-bom-dropzone" for="bomImportFileInput">${icon('upload','')}<strong>${state.bomImport.fileName ? poEsc(state.bomImport.fileName) : 'Choose Excel BOM workbook'}</strong><span>${state.bomImport.fileName ? `${poEsc(state.bomImport.fileSize)} · extraction completed` : '.xlsx or .xls · maximum 10 MB'}</span><span class="btn sm" style="margin-top:10px;pointer-events:none;">Browse workbook</span></label>
              <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px;"><button class="btn sm" onclick="bomImportUseExample()">${icon('FileText','')} Use example Excel</button><button class="btn sm" onclick="downloadBomExample()">${icon('download','')} Download Excel example</button></div>
            </div>
            <div class="bom-import-rules"><strong>Expected Excel columns</strong><p>Every extracted cell is editable and checked before import. Required fields cannot be empty.</p><div class="po-bom-column-chips"><span>Finished Good PN</span><span>Material PN</span><span>Description</span><span>Material Type</span><span>Usage Qty</span><span>Unit</span><span>Supplier</span><span>Scrap %</span><span>Effective Date</span><span>Revision</span></div><div class="bom-shared-note">${icon('bom','')}<div><strong>Controlled duplicate rule</strong><span>FGPN + Material PN must be unique. A Material PN may legitimately appear under several different FGPNs in PO and Project workbooks.</span></div></div></div>
          </div>
          ${state.bomImport.rows.length ? `
            <div class="bom-import-summary">
              <div class="kpi-card"><div class="kpi-label">FGPNs</div><div class="kpi-value">${stats.fgpnCount}</div></div>
              <div class="kpi-card"><div class="kpi-label">Material rows</div><div class="kpi-value">${state.bomImport.rows.length}</div></div>
              <div class="kpi-card"><div class="kpi-label">Validated fields</div><div class="kpi-value" style="color:${state.bomImport.validationRun ? (stats.invalidCells ? 'var(--warning)' : 'var(--success)') : 'var(--ink-faint)'}">${state.bomImport.validationRun ? stats.validCells : 0}/${stats.totalCells}</div></div>
              <div class="kpi-card"><div class="kpi-label">Shared materials</div><div class="kpi-value">${stats.sharedMaterials}</div></div>
              <div class="kpi-card"><div class="kpi-label">Approved rows</div><div class="kpi-value">${state.bomImport.approvedRows.size}/${state.bomImport.rows.length}</div></div>
            </div>
            <div class="bom-import-table-wrap"><table class="bom-import-table"><thead><tr><th>Excel row</th><th>Finished Good PN</th><th>Material PN</th><th>Description</th><th>Material Type</th><th>Usage Qty</th><th>Unit</th><th>Supplier</th><th>Scrap %</th><th>Effective Date</th><th>Revision</th><th>Row approval</th></tr></thead><tbody>${state.bomImport.rows.map((row,index) => `<tr><td class="mono">${row.sheet}!${row.excelRow}</td><td>${bomImportCell(row,index,'fgpn')}</td><td>${bomImportCell(row,index,'material')}</td><td>${bomImportCell(row,index,'description','text',true)}</td><td>${bomImportCell(row,index,'materialType')}</td><td>${bomImportCell(row,index,'usageQty','number')}</td><td>${bomImportCell(row,index,'unit')}</td><td>${bomImportCell(row,index,'supplier','text',true)}</td><td>${bomImportCell(row,index,'scrapPct','number')}</td><td>${bomImportCell(row,index,'effectiveDate','date')}</td><td>${bomImportCell(row,index,'revision')}</td><td><div class="bom-row-approval"><button class="btn sm ${state.bomImport.approvedRows.has(index) ? 'primary' : ''}" onclick="toggleBomImportRow(${index})" ${state.bomImport.stage === 'validated' ? '' : 'disabled'}>${state.bomImport.approvedRows.has(index) ? '✓ Approved' : 'Approve'}</button></div></td></tr>`).join('')}</tbody></table></div>
            <div class="bom-shared-note">${icon(stats.invalidCells ? 'alert' : 'check','')}<div><strong>${state.bomImport.validationRun ? (stats.invalidCells ? `${stats.invalidCells} field issue${stats.invalidCells === 1 ? '' : 's'} found` : 'Every extracted field passes validation') : 'Extraction ready for field validation'}</strong><span>${stats.sharedMaterials ? `${stats.sharedMaterials} material part number${stats.sharedMaterials === 1 ? ' is' : 's are'} shared across different FGPNs and accepted as valid.` : 'No cross-FGPN shared materials were detected in this workbook.'}</span></div></div>
          ` : ''}
          <div class="bom-import-actions"><span class="hint">Source workbook is preserved with the validated version and correction audit trail.</span><div><button class="btn" onclick="closeBomImport()">Cancel</button>${state.bomImport.rows.length ? `<button class="btn" onclick="validateBomImportFields()">${icon('audit','')} Validate all fields</button>${state.bomImport.stage === 'validated' ? `<button class="btn" onclick="approveAllBomImportRows()">${icon('check','')} Approve all rows</button><button class="btn primary" onclick="importValidatedBom()" ${allApproved ? '' : 'disabled'}>${icon('lock','')} Import validated ${levelLabel}</button>` : ''}` : ''}</div></div>
        </div>
      </div>`;
    }

export function bomImportedDashboard(level, target, suppliedRecord) {
      const record = suppliedRecord || latestBomImportRecord(level,target);
      if (!record) return '';
      const tableId = `${exportFileName(level)}-${exportFileName(target)}-bom-table`;
      const exportTitle = `${target} ${bomImportLevelLabel(level)}`;
      return `<div class="card" style="margin-top:14px;"><div class="section-title"><span>Validated Excel extraction <span class="hint">${record.file} · ${record.version}</span></span><div class="table-heading-actions">${statusBadge('All fields validated','success')}${tableExportActions(tableId,exportTitle)}</div></div><div class="grid g4" style="margin-bottom:12px;"><div class="kpi-card"><div class="kpi-label">FGPNs</div><div class="kpi-value" style="font-size:17px;">${record.fgpnCount}</div></div><div class="kpi-card"><div class="kpi-label">Rows</div><div class="kpi-value" style="font-size:17px;">${record.rows.length}</div></div><div class="kpi-card"><div class="kpi-label">Unique materials</div><div class="kpi-value" style="font-size:17px;">${record.materialCount}</div></div><div class="kpi-card"><div class="kpi-label">Validated fields</div><div class="kpi-value" style="font-size:17px;color:var(--success);">${record.validatedFields}</div></div></div><div class="table-scroll"><table id="${tableId}" class="bom-record-table"><thead><tr><th>FGPN</th><th>Material PN</th><th>Description</th><th>Type</th><th>Usage Qty</th><th>Unit</th><th>Supplier</th><th>Scrap</th><th>Effective</th><th>Revision</th><th>Status</th></tr></thead><tbody>${record.rows.map(row => `<tr><td class="mono">${row.fgpn}</td><td class="mono">${row.material}</td><td>${row.description}</td><td>${row.materialType}</td><td class="mono">${row.usageQty}</td><td>${row.unit}</td><td>${row.supplier}</td><td class="mono">${row.scrapPct}%</td><td class="mono">${row.effectiveDate}</td><td class="mono">${row.revision}</td><td>${statusBadge('Validated','success')}</td></tr>`).join('')}</tbody></table></div></div>`;
    }

export function bomCoverageHtml(readiness, compact) {
      const color = readiness.ready ? 'var(--success)' : readiness.percent >= 50 ? 'var(--warning)' : 'var(--danger)';
      return `<div class="bom-coverage ${compact ? 'compact' : ''}">
        <div class="bom-coverage-top"><strong>${readiness.percent}%</strong><span>${readiness.uploaded}/${readiness.total} PN BOMs</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${readiness.percent}%; background:${color}"></div></div>
      </div>`;
    }

export function poBomPreviewRows(poId) {
      const templates = [
        { material:'MAT-5512', desc:'Connector housing 4-pin', type:'Connector', usage:1, unit:'PCS', supplier:'TE Connectivity', scrap:0.5 },
        { material:'MAT-6630', desc:'PVC tape black 19mm', type:'Tape', usage:0.35, unit:'M', supplier:'3M', scrap:2.0 },
        { material:'MAT-4471', desc:'Harness retention clip', type:'Clip', usage:4, unit:'PCS', supplier:'Amphenol', scrap:1.0 },
        { material:'MAT-2208', desc:'Primary wire 0.5mm red', type:'Wire', usage:2.4, unit:'M', supplier:'Leoni', scrap:3.0 },
      ];
      return pnsForPo(poId).flatMap((pn, pnIndex) => [0,1].map(offset => {
        const material = templates[(pnIndex + offset) % templates.length];
        return { fgpn:pn.pn, ...material, effective:'2026-07-01' };
      }));
    }

export function openPoBomUploader(poId) {
      const po = POS.find(item => item.id === poId);
      const project = PROJECTS.find(item => item.name === po?.project);
      if (!po || !project || !canWriteProject(project)) {
        openModal('PO BOM upload not permitted', 'Only an assigned Launch Engineer or Launch Manager can upload a PO BOM version.');
        return;
      }
      state.openContext.po = poId; state.openContext.project = po.project;
      state.activeTab.po = 'PO BOM';
      state.poBomUpload = { open:true, po:poId, fileName:'', fileSize:'', validated:false, imported:false };
      beginBomImport('po', poId, false);
      if (state.currentPage !== 'po-workspace') navigate('po-workspace'); else renderPage();
    }

export function closePoBomUploader() {
      state.poBomUpload = { open:false, po:'', fileName:'', fileSize:'', validated:false, imported:false };
      closeBomImport();
    }

export function openProjectBomUploader(projectName) {
      const project = PROJECTS.find(item => item.name === projectName);
      if (!project || !canWriteProject(project)) {
        openModal('Project BOM upload not permitted', 'Only an assigned Launch Engineer or Launch Manager can import a Project BOM workbook.');
        return;
      }
      state.openContext.project = project.name;
      state.activeTab.project = 'Project BOM';
      beginBomImport('project', project.name, false);
      if (state.currentPage !== 'project-workspace') navigate('project-workspace'); else renderPage();
    }

export function poBomSelectFile(event) {
      const file = event?.target?.files?.[0];
      if (!file) return;
      if (!/\.xlsx?$/i.test(file.name)) {
        openModal('Invalid BOM format', 'Upload an Excel BOM workbook in .xlsx or .xls format.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        openModal('PO BOM file is too large', 'The workbook must be 10 MB or smaller.');
        return;
      }
      state.poBomUpload.fileName = file.name;
      state.poBomUpload.fileSize = `${Math.max(1, Math.round(file.size / 1024))} KB`;
      state.poBomUpload.validated = false;
      renderPage();
    }

export function poBomUseExample(poId) {
      state.poBomUpload = { open:true, po:poId, fileName:`${poId}_BOM_v1.xlsx`, fileSize:'84 KB', validated:false, imported:false };
      renderPage();
    }

export function validatePoBomUpload() {
      if (!state.poBomUpload.fileName) {
        openModal('Select a workbook', 'Choose an .xlsx PO BOM file or use the example workbook before validation.');
        return;
      }
      state.poBomUpload.validated = true;
      renderPage();
    }

export function importPoBomUpload(poId) {
      if (!state.poBomUpload.validated || state.poBomUpload.po !== poId) {
        openModal('Validation required', 'Validate the PO BOM workbook before importing it.');
        return;
      }
      const rows = poBomPreviewRows(poId);
      const versions = PO_BOM_FILES.filter(file => file.po === poId).map(file => Number(String(file.version).replace(/\D/g,'')) || 0);
      const version = `v${Math.max(0, ...versions) + 1}`;
      const now = new Date().toISOString().slice(0,10);
      const pns = pnsForPo(poId);
      PO_BOM_FILES.push({ po:poId, file:state.poBomUpload.fileName, version, fgpnCount:pns.length, materialCount:rows.length, uploadedBy:ROLE_PERSONA[state.currentRole].name, uploadedAt:now, status:'Validated' });
      pns.forEach(pn => {
        pn.bom = 'Uploaded'; pn.bomFile = `${state.poBomUpload.fileName} · ${pn.pn}`; pn.bomUpdated = now; pn.version = version; pn.bomSource = 'PO BOM upload';
        if (pn.status === 'Waiting BOM') { pn.status = 'Ready'; pn.statusType = 'success'; }
      });
      const po = POS.find(item => item.id === poId);
      if (po && po.status === 'Waiting BOM') { po.status = 'Ready'; po.statusType = 'success'; }
      AUDIT_LOGS.unshift({ id:`AUD-${10400 + AUDIT_LOGS.length}`, date:new Date().toISOString().slice(0,16).replace('T',' '), user:ROLE_PERSONA[state.currentRole].name, module:'BOM', action:'PO BOM uploaded', entity:`${poId} BOM ${version}`, project:po?.project || '', po:poId, details:`${state.poBomUpload.fileName} validated with ${pns.length} FGPNs and ${rows.length} material rows.` });
      state.poBomUpload.imported = true;
      state.poBomUpload.open = false;
      openModal('PO BOM imported', `${state.poBomUpload.fileName} was validated as ${version}. ${pns.length} Finished Good Part Numbers and ${rows.length} material rows are now linked to ${poId}.`);
      renderPage();
    }
