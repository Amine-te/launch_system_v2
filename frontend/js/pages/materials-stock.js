/* ==========================================================================
   materials-stock.js
   ========================================================================== */

import { openModal } from '../components/modal.js';
import { navigate } from '../components/nav-render.js';
import { filterMaterials, materialsToolbarHtml } from '../components/shared-tables.js';
import { AUDIT_LOGS, MATERIALS, PROJECTS } from '../data/mock-data.js';
import { renderAll } from '../main.js';
import { poEsc } from './po-intake.js';
import { completeAuditEvents, productionActor, traceabilityWorkspace } from './purchase-orders.js';
import { renderPage } from './router.js';
import { state } from '../state.js';
import { statusBadge } from '../utils/helpers.js';
import { icon } from '../utils/icons.js';
import { can } from '../utils/permissions.js';
import { filterChips, tableExportActions } from '../utils/table-helpers.js';
import { THRESHOLD_DEFAULTS, cutmanImports, stockReceipts, stockTransferDraft, stockTransferLogs, thresholdOverrides, transitMaterials } from '../utils/table-state.js';

export function openMaterialDetail(code) {
      state.openContext.material = code;
      navigate('material-detail');
    }

export function materialTransitQuantity(code) {
      return transitMaterials.filter(item => item.code === code).reduce((sum,item) => sum + Number(item.qty || 0),0);
    }

export function materialStockState(material) {
      const threshold = getThreshold(material.code);
      if (material.warehouse < threshold) return { label:'Below Threshold', type:'danger' };
      if (material.warehouse < threshold * 1.25) return { label:'Watch', type:'warning' };
      return { label:'Available', type:'success' };
    }

export function stockLedgerEvents(materialCode='') {
      return completeAuditEvents().filter(event => {
        const stockModule = /stock|cutman|wip|reception/i.test(event.module);
        if (!stockModule) return false;
        if (materialCode && !(`${event.entity} ${event.details}`.includes(materialCode))) return false;
        return true;
      });
    }

export function pageMaterialDetail() {
      const m = MATERIALS.find(item => item.code === state.openContext.material) || MATERIALS[2];
      const threshold = getThreshold(m.code);
      const transit = materialTransitQuantity(m.code);
      const projected = m.warehouse + m.wip + transit;
      const state = materialStockState(m);
      const events = stockLedgerEvents(m.code);
      return `
  <section class="stock-shell">
    <div class="stock-material-hero">
      <div class="stock-material-title"><div class="stock-material-icon">${icon('material','')}</div><div><span class="mono">${m.code}</span><h2>${m.desc}</h2><p>${m.type} · ${m.supplier}</p></div></div>
      <div class="stock-page-actions"><button class="btn" onclick="navigateBack('stock-dashboard')">${icon('chevLeft','')} Stock Dashboard</button><button class="btn primary" onclick="navigate('stock-reception')">${icon('plus','')} Receive Material</button></div>
    </div>
    <div class="stock-kpi-grid">
      <div class="stock-kpi"><span>Warehouse</span><strong>${m.warehouse.toLocaleString()}</strong><small>Current quantity</small></div>
      <div class="stock-kpi"><span>Work in progress</span><strong>${m.wip.toLocaleString()}</strong><small>Active production</small></div>
      <div class="stock-kpi"><span>In transit</span><strong>${transit.toLocaleString()}</strong><small>Expected inbound</small></div>
      <div class="stock-kpi accent"><span>Projected available</span><strong>${projected.toLocaleString()}</strong><small>${statusBadge(state.label,state.type)}</small></div>
    </div>
    <div class="stock-detail-grid">
      <div class="card stock-panel">
        <div class="stock-panel-head"><h3>Material Control</h3>${statusBadge(state.label,state.type)}</div>
        <div class="stock-fact-grid"><div><span>Required quantity</span><strong>${m.required.toLocaleString()}</strong></div><div><span>Low-stock threshold</span><strong>${threshold.toLocaleString()}</strong></div><div><span>Missing quantity</span><strong class="${m.missing ? 'stock-danger-text' : ''}">${m.missing.toLocaleString()}</strong></div><div><span>CutMan quantity</span><strong>${m.cutman.toLocaleString()}</strong></div></div>
        <button class="btn" onclick="navigate('stock-thresholds')">Manage Threshold</button>
      </div>
      <div class="card stock-panel">
        <div class="stock-panel-head"><h3>Usage</h3><span>${m.projects.length} projects · ${m.pns.length} PNs</span></div>
        <div class="stock-usage-list">${m.projects.map(project => `<button onclick="openProject('${PROJECTS.find(item => item.name === project)?.id || project}')"><span>${icon('projects','')}${project}</span><strong>Project</strong></button>`).join('')}${m.pns.map(pn => `<button onclick="openPn('${pn}')"><span>${icon('bom','')}<span class="mono">${pn}</span></span><strong>Part Number</strong></button>`).join('')}</div>
      </div>
    </div>
    ${traceabilityWorkspace(events,`${m.code} stock history`,'materialStockHistoryTable')}
  </section>`;
    }

export function pageStockDashboard() {
      const practicalTotal = MATERIALS.reduce((sum, m) => sum + m.warehouse, 0);
      const wipTotal = MATERIALS.reduce((sum, m) => sum + m.wip, 0);
      const transitTotal = transitMaterials.reduce((sum, item) => sum + item.qty, 0);
      const lowStock = MATERIALS.filter(material => material.warehouse < getThreshold(material.code));
      const movements = stockLedgerEvents().slice(0,4);
      return `
  <section class="stock-shell">
    <div class="stock-command-bar"><div><span>Inventory Control</span><h2>Material Stock</h2></div><div class="stock-page-actions"><button class="btn" onclick="navigate('stock-history')">${icon('history','')} Movement History</button><button class="btn" onclick="navigate('stock-transit')">${icon('truck','')} Transit Stock</button><button class="btn primary" onclick="navigate('stock-reception')">${icon('plus','')} Receive Material</button></div></div>
    <div class="stock-kpi-grid">
      <div class="stock-kpi"><span>Warehouse stock</span><strong>${practicalTotal.toLocaleString()}</strong><small>Available units</small></div>
      <div class="stock-kpi"><span>Work in progress</span><strong>${wipTotal.toLocaleString()}</strong><small>Production units</small></div>
      <div class="stock-kpi"><span>In transit</span><strong>${transitTotal.toLocaleString()}</strong><small>${transitMaterials.length} inbound records</small></div>
      <div class="stock-kpi ${lowStock.length ? 'danger' : 'accent'}"><span>Low-stock materials</span><strong>${lowStock.length}</strong><small>${lowStock.length ? 'Action required' : 'No alerts'}</small></div>
    </div>
    <div class="card stock-inventory-card">
      <div class="stock-panel-head"><div><h3>Inventory by Material</h3><span>${MATERIALS.length} controlled materials</span></div>${tableExportActions('stockInventoryTable','Material Stock')}</div>
      ${materialsToolbarHtml()}
      ${filterChips(state.materialFilters,{ type:'Type',warehouse:'Warehouse',missing:'Missing' },'clearMaterialFilter','resetMaterialFilters')}
      <div class="table-scroll"><table id="stockInventoryTable" class="stock-table"><thead><tr><th>Material</th><th>Type / Supplier</th><th>Required</th><th>Warehouse</th><th>WIP</th><th>Transit</th><th>Projected</th><th>Threshold</th><th>Status</th><th></th></tr></thead><tbody>${filterMaterials().map(m => { const transit=materialTransitQuantity(m.code), state=materialStockState(m); return `<tr onclick="openMaterialDetail('${m.code}')"><td><strong class="mono">${m.code}</strong><span>${m.desc}</span></td><td><strong>${m.type}</strong><span>${m.supplier}</span></td><td class="mono">${m.required.toLocaleString()}</td><td class="mono stock-qty-primary">${m.warehouse.toLocaleString()}</td><td class="mono">${m.wip.toLocaleString()}</td><td class="mono">${transit.toLocaleString()}</td><td class="mono">${(m.warehouse+m.wip+transit).toLocaleString()}</td><td class="mono">${getThreshold(m.code).toLocaleString()}</td><td>${statusBadge(state.label,state.type)}</td><td><button class="icon-btn" onclick="stop(event);openMaterialDetail('${m.code}')" title="Open material">${icon('view','')}</button></td></tr>`; }).join('')}</tbody></table></div>
    </div>
    <div class="stock-bottom-grid">
      <div class="card stock-panel"><div class="stock-panel-head"><h3>Low-Stock Alerts</h3><button class="btn sm" onclick="navigate('stock-thresholds')">Thresholds</button></div><div class="stock-alert-list">${lowStock.length ? lowStock.map(m => `<button onclick="openMaterialDetail('${m.code}')"><span class="stock-alert-icon">${icon('alert','')}</span><div><strong class="mono">${m.code}</strong><span>${m.desc}</span></div><div><strong>${m.warehouse.toLocaleString()}</strong><span>Threshold ${getThreshold(m.code).toLocaleString()}</span></div></button>`).join('') : `<div class="stock-clean-state">${icon('check','')} All materials are above threshold</div>`}</div></div>
      <div class="card stock-panel"><div class="stock-panel-head"><h3>Recent Movements</h3><button class="btn sm" onclick="navigate('stock-history')">View All</button></div><div class="stock-movement-list">${movements.map(event => `<button onclick="openAuditDetail('${event.id}')"><span class="stock-movement-dot"></span><div><strong>${event.action}</strong><span>${event.entity} · ${event.actor}</span></div><time class="mono">${event.date}</time></button>`).join('')}</div></div>
    </div>
  </section>`;
    }

export function getThreshold(code) {
      return thresholdOverrides.hasOwnProperty(code) ? thresholdOverrides[code] : (MATERIALS.find(m => m.code === code)?.threshold ?? 0);
    }

export function startEditThreshold(code) {
      if (can('editThresholds') !== true) return;
      state.thresholdEditing = code;
      renderPage();
      const raf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : (fn) => setTimeout(fn, 0);
      raf(() => {
        const el = document.getElementById('threshInput-' + code);
        if (el) { el.focus(); el.select(); }
      });
    }

export function cancelEditThreshold() { state.thresholdEditing = null; renderPage(); }

export function saveThreshold(code) {
      const el = document.getElementById('threshInput-' + code);
      if (!el) return;
      const previous = getThreshold(code);
      let v = parseInt(el.value, 10);
      if (isNaN(v) || v < 0) v = getThreshold(code);
      thresholdOverrides[code] = v;
      const m = MATERIALS.find(x => x.code === code);
      if (m) m.threshold = v;
      if (previous !== v) AUDIT_LOGS.unshift({ id:`AUD-${16000 + AUDIT_LOGS.length}`,date:new Date().toISOString().slice(0,16).replace('T',' '),user:productionActor(),module:'Stock Threshold',action:'Low-stock threshold updated',entity:code,project:'—',po:'—',details:`Threshold changed from ${previous} to ${v}.`,diff:{ field:'Threshold',old:String(previous),new:String(v) } });
      state.thresholdEditing = null;
      renderPage();
    }

export function restoreThresholdDefault(code) {
      const previous = getThreshold(code);
      const def = THRESHOLD_DEFAULTS[code];
      delete thresholdOverrides[code];
      const m = MATERIALS.find(x => x.code === code);
      if (m) m.threshold = def;
      if (previous !== def) AUDIT_LOGS.unshift({ id:`AUD-${16000 + AUDIT_LOGS.length}`,date:new Date().toISOString().slice(0,16).replace('T',' '),user:productionActor(),module:'Stock Threshold',action:'Default threshold restored',entity:code,project:'—',po:'—',details:`Threshold restored from ${previous} to default ${def}.`,diff:{ field:'Threshold',old:String(previous),new:String(def) } });
      state.thresholdEditing = null;
      renderPage();
    }

export function thresholdCell(m) {
      const current = getThreshold(m.code);
      const isModified = thresholdOverrides.hasOwnProperty(m.code) && thresholdOverrides[m.code] !== THRESHOLD_DEFAULTS[m.code];
      const editAccess = can('editThresholds');
      if (state.thresholdEditing === m.code) {
        return `<div class="thresh-cell" onclick="stop(event)">
      <div class="thresh-edit-row">
        <input id="threshInput-${m.code}" class="thresh-input" type="number" min="0" value="${current}"
          onkeydown="if(event.key==='Enter'){saveThreshold('${m.code}')} if(event.key==='Escape'){cancelEditThreshold()}"/>
        <button class="thresh-ok-btn" onclick="saveThreshold('${m.code}')" title="Save">${icon('check', '')}</button>
        <button class="thresh-cancel-btn" onclick="cancelEditThreshold()" title="Cancel">${icon('close', '')}</button>
      </div>
    </div>`;
      }
      return `<div class="thresh-cell" onclick="stop(event)">
    <div class="thresh-display" onclick="startEditThreshold('${m.code}')" style="${editAccess !== true ? 'cursor:default;' : ''}">
      ${isModified ? '<span class="thresh-modified-dot" title="Modified from default"></span>' : ''}
      <span class="mono">${current}</span>
      ${editAccess === true ? `<span class="thresh-edit-ic">${icon('edit', '')}</span>` : editAccess === 'view' ? `<span class="thresh-edit-ic" title="View only">${icon('lock', '')}</span>` : ''}
    </div>
    ${isModified ? `<span class="thresh-restore-btn" onclick="restoreThresholdDefault('${m.code}')" title="Restore default (${THRESHOLD_DEFAULTS[m.code]})">${icon('restore', '')} Restore</span>` : ''}
  </div>`;
    }

export function pageStockReception() {
      return `<section class="stock-shell">
  <div class="stock-command-bar"><div><span>Warehouse Operation</span><h2>Receive Material</h2></div><div class="stock-page-actions"><button class="btn" onclick="navigate('stock-dashboard')">${icon('chevLeft','')} Stock Dashboard</button><button class="btn" onclick="navigate('stock-history')">${icon('history','')} History</button></div></div>
  <div class="stock-workspace-grid">
    <div class="card stock-form-card">
      <div class="stock-panel-head"><h3>Reception Record</h3>${statusBadge('New','info')}</div>
      <div class="stock-form-grid">
        <div class="stock-field full"><label>Material</label><select onchange="stockReceptionDraft.material=this.value;stockReceptionDraft.supplier=MATERIALS.find(m=>m.code===this.value)?.supplier||'';renderPage()">${MATERIALS.map(m => `<option value="${m.code}" ${state.stockReceptionDraft.material === m.code ? 'selected' : ''}>${m.code} · ${m.desc}</option>`).join('')}</select></div>
        <div class="stock-field"><label>Quantity</label><input type="number" min="1" value="${state.stockReceptionDraft.qty || ''}" oninput="stockReceptionDraft.qty=Number(this.value)" placeholder="0"/></div>
        <div class="stock-field"><label>Received Date</label><input type="date" value="${state.stockReceptionDraft.received}" onchange="stockReceptionDraft.received=this.value"/></div>
        <div class="stock-field"><label>Supplier</label><input value="${poEsc(state.stockReceptionDraft.supplier)}" oninput="stockReceptionDraft.supplier=this.value"/></div>
        <div class="stock-field"><label>Destination</label><select onchange="stockReceptionDraft.destination=this.value"><option ${state.stockReceptionDraft.destination === 'Warehouse' ? 'selected' : ''}>Warehouse</option><option ${state.stockReceptionDraft.destination === 'WIP' ? 'selected' : ''}>WIP</option></select></div>
        <div class="stock-field full"><label>Delivery Reference</label><input value="${poEsc(state.stockReceptionDraft.reference)}" oninput="stockReceptionDraft.reference=this.value" placeholder="Delivery note or supplier reference"/></div>
      </div>
      <div class="stock-form-actions"><button class="btn" onclick="stockReceptionDraft={material:'MAT-5512',qty:0,supplier:'TE Connectivity',received:new Date().toISOString().slice(0,10),destination:'Warehouse',reference:''};renderPage()">Clear</button><button class="btn primary" onclick="recordStockReception()">${icon('check','')} Record Reception</button></div>
    </div>
    <div class="card stock-panel">
      <div class="stock-panel-head"><h3>Recent Receptions</h3><span>${stockReceipts.length} records</span></div>
      <div class="table-scroll"><table class="stock-table"><thead><tr><th>Material</th><th>Quantity</th><th>Supplier</th><th>Date</th><th>Destination</th><th>Status</th></tr></thead><tbody>${stockReceipts.slice(0,8).map(r => `<tr onclick="openMaterialDetail('${r.material}')"><td><strong class="mono">${r.material}</strong></td><td class="mono stock-qty-primary">${Number(r.qty).toLocaleString()}</td><td>${r.supplier}</td><td class="mono">${r.received}</td><td>${r.destination || 'Warehouse'}</td><td>${statusBadge(r.status,r.status === 'Received' ? 'success' : 'warning')}</td></tr>`).join('')}</tbody></table></div>
    </div>
  </div>
</section>`;
    }

export function recordStockReception() {
      const draft = state.stockReceptionDraft;
      if (!draft.material || !(draft.qty > 0) || !draft.supplier || !draft.received) return openModal('Complete the reception','Material, quantity, supplier and reception date are required.');
      const material = MATERIALS.find(item => item.code === draft.material);
      if (!material) return openModal('Material not found','Select an existing material from the list.');
      if (draft.destination === 'WIP') material.wip += Number(draft.qty);
      else material.warehouse += Number(draft.qty);
      const now = new Date().toISOString().slice(0,16).replace('T',' ');
      const receipt = { ...draft,status:'Received',recordedBy:productionActor(),recordedAt:now };
      stockReceipts.unshift(receipt);
      AUDIT_LOGS.unshift({ id:`AUD-${16100 + AUDIT_LOGS.length}`,date:now,user:productionActor(),module:'Stock Reception',action:'Material reception recorded',entity:draft.material,project:'—',po:'—',evidence:draft.reference || 'Reception register',details:`${draft.qty} units received from ${draft.supplier}. Destination: ${draft.destination}.` });
      state.stockReceptionDraft = { material:draft.material,qty:0,supplier:material.supplier,received:new Date().toISOString().slice(0,10),destination:'Warehouse',reference:'' };
      renderAll();
      openModal('Reception recorded',`${receipt.material} · ${Number(receipt.qty).toLocaleString()} units added to ${receipt.destination}.`);
    }

export function pageStockTransit() {
      const transitTotal = transitMaterials.reduce((sum,item) => sum + Number(item.qty || 0),0);
      const suppliers = new Set(transitMaterials.map(item => item.supplier)).size;
      const nextArrival = [...transitMaterials].sort((a,b) => String(a.arrival).localeCompare(String(b.arrival)))[0]?.arrival;
      return `<section class="stock-shell">
  <div class="stock-command-bar"><div><span>Inbound Inventory</span><h2>Transit Stock</h2></div><div class="stock-page-actions"><button class="btn" onclick="navigate('stock-dashboard')">${icon('chevLeft','')} Stock Dashboard</button><button class="btn" onclick="navigate('stock-history')">${icon('history','')} History</button></div></div>
  <div class="stock-mini-kpis"><div><span>Inbound quantity</span><strong>${transitTotal.toLocaleString()}</strong></div><div><span>Open records</span><strong>${transitMaterials.length}</strong></div><div><span>Suppliers</span><strong>${suppliers}</strong></div><div><span>Next arrival</span><strong class="stock-date-value">${nextArrival ? formatDate(nextArrival) : '—'}</strong></div></div>
  <div class="stock-workspace-grid">
    <div class="card stock-form-card">
      <div class="stock-panel-head"><h3>Add Inbound Material</h3>${statusBadge('In Transit','info')}</div>
      <div class="stock-form-grid">
        <div class="stock-field full"><label>Material</label><select onchange="const m=MATERIALS.find(item=>item.code===this.value);transitDraft.code=m?.code||'';transitDraft.desc=m?.desc||'';transitDraft.supplier=m?.supplier||'';renderPage()"><option value="">Select material</option>${MATERIALS.map(m => `<option value="${m.code}" ${state.transitDraft.code === m.code ? 'selected' : ''}>${m.code} · ${m.desc}</option>`).join('')}</select></div>
        <div class="stock-field"><label>Quantity</label><input type="number" min="1" value="${state.transitDraft.qty || ''}" oninput="transitDraft.qty=Number(this.value)" placeholder="0"/></div>
        <div class="stock-field"><label>Expected Arrival</label><input type="date" value="${state.transitDraft.arrival}" onchange="transitDraft.arrival=this.value"/></div>
        <div class="stock-field full"><label>Supplier</label><input value="${poEsc(state.transitDraft.supplier)}" oninput="transitDraft.supplier=this.value"/></div>
        <div class="stock-field full"><label>Internal Note</label><textarea oninput="transitDraft.notes=this.value" placeholder="Optional">${poEsc(state.transitDraft.notes)}</textarea></div>
      </div>
      <div class="stock-form-actions"><button class="btn" onclick="transitDraft={code:'',desc:'',qty:0,supplier:'',arrival:'',notes:'',status:'In Transit'};renderPage()">Clear</button><button class="btn primary" onclick="addTransitMaterial()">${icon('plus','')} Add Transit Record</button></div>
    </div>
    <div class="card stock-panel">
      <div class="stock-panel-head"><h3>Inbound Material List</h3>${tableExportActions('transitStockTable','Transit Stock')}</div>
      <div class="table-scroll"><table id="transitStockTable" class="stock-table"><thead><tr><th>Material</th><th>Quantity</th><th>Supplier</th><th>Expected Arrival</th><th>Status</th><th></th></tr></thead><tbody>${transitMaterials.map((item,index) => `<tr onclick="openMaterialDetail('${item.code}')"><td><strong class="mono">${item.code}</strong><span>${item.desc}</span></td><td class="mono stock-qty-primary">${Number(item.qty).toLocaleString()}</td><td>${item.supplier}</td><td class="mono">${formatDate(item.arrival)}</td><td>${statusBadge(item.status,'info')}</td><td><button class="icon-btn" onclick="stop(event);removeTransitMaterial(${index})" title="Delete transit record">${icon('trash','')}</button></td></tr>`).join('')}</tbody></table></div>
    </div>
  </div>
</section>`;
    }

export function addTransitMaterial() {
      if (!state.transitDraft.code || !state.transitDraft.desc || state.transitDraft.qty <= 0 || !state.transitDraft.supplier || !state.transitDraft.arrival) {
        openModal('Missing information', 'Please fill in Material Code, Material Name, Quantity, Supplier, and Expected Arrival Date before saving.');
        return;
      }
      const now = new Date().toISOString().slice(0,16).replace('T',' ');
      transitMaterials.unshift({ ...state.transitDraft,createdAt:now,createdBy:productionActor() });
      AUDIT_LOGS.unshift({ id:`AUD-${16200 + AUDIT_LOGS.length}`,date:now,user:productionActor(),module:'Transit Stock',action:'Inbound material registered',entity:state.transitDraft.code,project:'—',po:'—',details:`${state.transitDraft.qty} units from ${state.transitDraft.supplier}; expected ${formatDate(state.transitDraft.arrival)}.${state.transitDraft.notes ? ` Comment: ${state.transitDraft.notes}` : ''}` });
      state.transitDraft = { code: '', desc: '', qty: 0, supplier: '', arrival: '', notes: '', status: 'In Transit' };
      renderAll();
    }

export function removeTransitMaterial(index) {
      const item = transitMaterials[index];
      if (!item) return;
      AUDIT_LOGS.unshift({ id:`AUD-${16200 + AUDIT_LOGS.length}`,date:new Date().toISOString().slice(0,16).replace('T',' '),user:productionActor(),module:'Transit Stock',action:'Inbound record removed',entity:item.code,project:'—',po:'—',details:`Transit record for ${item.qty} units from ${item.supplier} was removed.` });
      transitMaterials.splice(index,1);
      renderAll();
    }

export function formatDate(value) {
      if (!value) return '—';
      const date = new Date(value);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

export function pageStockCutman() {
      const latest = cutmanImports[0];
      const wip = MATERIALS.reduce((sum,m) => sum + m.wip,0);
      const cutting = MATERIALS.reduce((sum,m) => sum + m.cutman,0);
      return `<section class="stock-shell">
  <div class="stock-command-bar"><div><span>Cutting Integration</span><h2>CutMan Import</h2></div><div class="stock-page-actions"><button class="btn" onclick="navigate('stock-dashboard')">${icon('chevLeft','')} Stock Dashboard</button><button class="btn" onclick="navigate('wh-cutting')">${icon('refresh','')} Manual Transfer</button><label class="btn primary" for="cutmanFileInput">${icon('upload','')} Import File</label><input id="cutmanFileInput" type="file" accept=".csv,.xlsx,.xls" hidden onchange="importCutmanFile(this)"/></div></div>
  <div class="stock-kpi-grid">
    <div class="stock-kpi"><span>WIP quantity</span><strong>${wip.toLocaleString()}</strong><small>Active materials</small></div>
    <div class="stock-kpi"><span>CutMan quantity</span><strong>${cutting.toLocaleString()}</strong><small>Cutting area</small></div>
    <div class="stock-kpi"><span>Imported records</span><strong>${latest?.records || 0}</strong><small>Latest file</small></div>
    <div class="stock-kpi accent"><span>Import status</span><strong class="stock-status-value">${latest?.status || 'No Import'}</strong><small>${latest?.date || '—'}</small></div>
  </div>
  <div class="card stock-panel">
    <div class="stock-panel-head"><div><h3>Import History</h3><span>${cutmanImports.length} files</span></div>${tableExportActions('cutmanHistoryTable','CutMan Import History')}</div>
    <div class="table-scroll"><table id="cutmanHistoryTable" class="stock-table"><thead><tr><th>File</th><th>Imported At</th><th>Records</th><th>Imported By</th><th>Status</th></tr></thead><tbody>${cutmanImports.map(item => `<tr><td><strong>${item.file}</strong></td><td class="mono">${item.date}</td><td class="mono stock-qty-primary">${item.records}</td><td>${item.importedBy || 'Warehouse Personnel'}</td><td>${statusBadge(item.status,'success')}</td></tr>`).join('')}</tbody></table></div>
  </div>
</section>`;
    }

export function importCutmanFile(input) {
      const file = input.files?.[0];
      if (!file) return;
      const now = new Date().toISOString().slice(0,16).replace('T',' ');
      const record = { file:file.name,date:now.slice(0,10),importedAt:now,records:Math.max(1,Math.round(file.size / 180)),status:'Imported',importedBy:productionActor() };
      cutmanImports.unshift(record);
      AUDIT_LOGS.unshift({ id:`AUD-${16300 + AUDIT_LOGS.length}`,date:now,user:productionActor(),module:'CutMan',action:'CutMan file imported',entity:file.name,project:'—',po:'—',evidence:file.name,details:`${record.records} cutting records imported and WIP balances reconciled.` });
      renderAll();
      openModal('CutMan file imported',`${file.name} · ${record.records} records processed.`);
    }

export function pageWhCutting() {
      const material = MATERIALS.find(item => item.code === stockTransferDraft.code) || MATERIALS[0];
      return `<section class="stock-shell">
  <div class="stock-command-bar"><div><span>Warehouse Operation</span><h2>WIP Transfer</h2></div><div class="stock-page-actions"><button class="btn" onclick="navigate('stock-cutman')">${icon('chevLeft','')} CutMan</button><button class="btn" onclick="navigate('stock-history')">${icon('history','')} History</button></div></div>
  <div class="stock-workspace-grid">
    <div class="card stock-form-card">
      <div class="stock-panel-head"><h3>Transfer Quantity</h3>${statusBadge('Manual','neutral')}</div>
      <div class="stock-form-grid">
        <div class="stock-field full"><label>Material</label><select onchange="stockTransferDraft.code=this.value;renderPage()">${MATERIALS.map(m => `<option value="${m.code}" ${stockTransferDraft.code === m.code ? 'selected' : ''}>${m.code} · ${m.desc}</option>`).join('')}</select></div>
        <div class="stock-field"><label>Available WIP</label><input value="${material.wip}" disabled/></div>
        <div class="stock-field"><label>Quantity</label><input type="number" min="1" max="${material.wip}" value="${stockTransferDraft.qty || ''}" oninput="stockTransferDraft.qty=Number(this.value)"/></div>
        <div class="stock-field full"><label>Destination</label><select onchange="stockTransferDraft.destination=this.value"><option value="Cutting" ${stockTransferDraft.destination === 'Cutting' ? 'selected' : ''}>Cutting</option><option value="Warehouse" ${stockTransferDraft.destination === 'Warehouse' ? 'selected' : ''}>Warehouse</option></select></div>
      </div>
      <div class="stock-form-actions"><button class="btn primary" onclick="executeWipTransfer()">${icon('check','')} Execute Transfer</button></div>
    </div>
    <div class="card stock-panel"><div class="stock-panel-head"><h3>Recent Transfers</h3>${tableExportActions('wipTransferTable','WIP Transfers')}</div><div class="table-scroll"><table id="wipTransferTable" class="stock-table"><thead><tr><th>Material</th><th>Quantity</th><th>From</th><th>To</th><th>Date</th><th>Performed By</th></tr></thead><tbody>${stockTransferLogs.map(log => `<tr onclick="openMaterialDetail('${log.code}')"><td><strong class="mono">${log.code}</strong></td><td class="mono stock-qty-primary">${Number(log.qty).toLocaleString()}</td><td>${log.from}</td><td>${log.to}</td><td class="mono">${log.date}</td><td>${log.by}</td></tr>`).join('')}</tbody></table></div></div>
  </div>
</section>`;
    }

export function executeWipTransfer() {
      const material = MATERIALS.find(item => item.code === stockTransferDraft.code);
      const qty = Number(stockTransferDraft.qty || 0);
      if (!material || !(qty > 0) || qty > material.wip) return openModal('Check transfer quantity','Quantity must be greater than zero and cannot exceed available WIP.');
      material.wip -= qty;
      if (stockTransferDraft.destination === 'Warehouse') material.warehouse += qty;
      else material.cutman += qty;
      const now = new Date().toISOString().slice(0,16).replace('T',' ');
      const log = { code:material.code,qty,from:'WIP',to:stockTransferDraft.destination,date:now,by:productionActor() };
      stockTransferLogs.unshift(log);
      AUDIT_LOGS.unshift({ id:`AUD-${16400 + AUDIT_LOGS.length}`,date:now,user:productionActor(),module:'WIP Transfer',action:'Material quantity transferred',entity:material.code,project:'—',po:'—',details:`${qty} units moved from WIP to ${stockTransferDraft.destination}.` });
      stockTransferDraft.qty = 0;
      renderAll();
      openModal('Transfer completed',`${material.code} · ${qty.toLocaleString()} units moved to ${log.to}.`);
    }

export function pageThresholds() {
      const low = MATERIALS.filter(m => m.warehouse < getThreshold(m.code)).length;
      const modified = MATERIALS.filter(m => thresholdOverrides.hasOwnProperty(m.code) && thresholdOverrides[m.code] !== THRESHOLD_DEFAULTS[m.code]).length;
      return `<section class="stock-shell">
  <div class="stock-command-bar"><div><span>Inventory Control</span><h2>Low-Stock Thresholds</h2></div><div class="stock-page-actions"><button class="btn" onclick="navigate('stock-dashboard')">${icon('chevLeft','')} Stock Dashboard</button><button class="btn" onclick="navigate('stock-history')">${icon('history','')} History</button></div></div>
  <div class="stock-mini-kpis"><div><span>Controlled materials</span><strong>${MATERIALS.length}</strong></div><div><span>Below threshold</span><strong class="stock-danger-text">${low}</strong></div><div><span>Modified values</span><strong>${modified}</strong></div><div><span>Access</span><strong class="stock-status-value">${can('editThresholds') === true ? 'Editable' : 'Read Only'}</strong></div></div>
  <div class="card stock-panel">
    <div class="stock-panel-head"><div><h3>Threshold Register</h3><span>${can('editThresholds') === true ? 'Select a threshold value to edit' : 'View-only access'}</span></div>${tableExportActions('stockThresholdTable','Stock Thresholds')}</div>
    <div class="table-scroll"><table id="stockThresholdTable" class="stock-table threshold-table">
      <thead><tr><th>Material</th><th>Warehouse</th><th>Threshold</th><th>Default</th><th>Gap</th><th>Updated By</th><th>Status</th></tr></thead>
      <tbody>${MATERIALS.map(m => {
        const current = getThreshold(m.code);
        const low = m.warehouse < current;
        const isModified = thresholdOverrides.hasOwnProperty(m.code) && thresholdOverrides[m.code] !== THRESHOLD_DEFAULTS[m.code];
        return `<tr>
          <td onclick="openMaterialDetail('${m.code}')"><strong class="mono">${m.code}</strong><span>${m.desc}</span></td>
          <td class="mono stock-qty-primary">${m.warehouse.toLocaleString()}</td>
          <td>${thresholdCell(m)}</td>
          <td class="mono">${THRESHOLD_DEFAULTS[m.code].toLocaleString()}</td>
          <td class="mono ${m.warehouse-current < 0 ? 'stock-danger-text' : ''}">${(m.warehouse-current).toLocaleString()}</td>
          <td>${isModified ? 'A. Haddad' : '—'}</td>
          <td>${statusBadge(low ? 'Below Threshold' : 'OK', low ? 'danger' : 'success')}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
  </div>
</section>`;
    }
