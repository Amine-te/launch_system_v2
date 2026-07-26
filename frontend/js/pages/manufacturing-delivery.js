/* ==========================================================================
   manufacturing-delivery.js
   ========================================================================== */

import { openModal } from '../components/modal.js';
import { navigate, navigateBack } from '../components/nav-render.js';
import { canWriteProject, pnsForPo, uniqueValues, writableProjects } from '../components/shared-tables.js';
import { AUDIT_LOGS, BOM_USAGE, MATERIALS, MFG_DELIVERIES, POS, PO_STATUS_FLOW, PROJECTS } from '../data/mock-data.js';
import { custDeliveryCanBeDeleted } from './customer-delivery.js';
import { poEsc } from './po-intake.js';
import { workspaceTabs } from './projects.js';
import { auditContextEvents, materialsForPo, mfgNormalizeLaunchLine, poFinishedGoods, poLifecycle, productionActor, productionStatusType, recordPoLifecycleChange, syncMfgDeliveryLifecycle, traceabilityWorkspace } from './purchase-orders.js';
import { renderPage } from './router.js';
import { state } from '../state.js';
import { statusBadge } from '../utils/helpers.js';
import { icon } from '../utils/icons.js';
import { can, permBtn, permIconBtn } from '../utils/permissions.js';
import { emptyStateBlock, filterChips, paginationBar, rowCountLabel, sortRows, sortTh, statsRow } from '../utils/table-helpers.js';
import { MFG_DELIVERY_RECEIVERS, PAGE_SIZE, mfgSort, mfgWizard } from '../utils/table-state.js';

export function mfgStatusType(s) {
      return {
        Draft: 'neutral',
        'Code Generated': 'info',
        'Code Used': 'purple',
        'Document Generated': 'orange',
        'Waiting for Signed PDF': 'warning',
        'Signed Document Uploaded': 'info',
        Delivered: 'success',
        Expired: 'danger',
        'In Transit': 'info',
        'Pending Approval': 'warning',
        Cancelled: 'danger',
      }[s] || 'neutral';
    }

export function mfgTable(list, tableId = '', workspaceActions = false) {
      if (list.length === 0) return emptyStateBlock('No manufacturing deliveries', 'No deliveries match this view yet.', null);
      return `<div class="table-scroll mfg-delivery-table-wrap"><table${tableId ? ` id="${tableId}"` : ''} class="mfg-delivery-table"><thead><tr><th>Launch</th><th>Project</th><th>PO</th><th>PNs · Launch Qty</th><th>Receiver</th><th>Required Date</th><th>Transfer</th><th>Production</th><th data-export="false">Actions</th></tr></thead>
    <tbody>${list.map(d => `<tr class="clickable-row" onclick="openMfgDelivery('${d.code}')">
      <td class="mono">${d.code}</td><td>${d.project}</td><td class="mono">${d.po}</td><td class="mono">${mfgDeliveryPnLabel(d)}</td><td>${d.receiver || '<span class="badge neutral">Awaiting Warehouse TL</span>'}</td><td>${d.date || '—'}</td>
      <td>${statusBadge(d.status, d.statusType)}</td>
      <td>${statusBadge(syncMfgDeliveryLifecycle(d),productionStatusType(d.lifecycleStatus))}</td>
      <td>${mfgActionIcons(d,workspaceActions)}</td>
    </tr>`).join('')}</tbody></table></div>`;
    }

export function mfgDeliveryCanBeDeleted(d) {
      return !d.docUploaded && d.status !== 'Delivered';
    }

export function workspaceCanDeleteDelivery(d) {
      const project = PROJECTS.find(item => item.name === d.project);
      return !!project && canWriteProject(project);
    }

export function workspaceDeleteIcon(type,d) {
      const manufacturing = type === 'manufacturing';
      const deletable = manufacturing ? mfgDeliveryCanBeDeleted(d) : custDeliveryCanBeDeleted(d);
      const title = deletable ? `Delete ${d.code}` : `Cannot delete ${d.code} after confirmation`;
      const action = manufacturing ? `requestDeleteMfgDelivery('${d.code}')` : `requestDeleteCustDelivery('${d.code}')`;
      return `<div class="icon-btn danger-hover${deletable ? '' : ' disabled'}" title="${title}"${deletable ? ` onclick="stop(event); ${action}"` : ''}>${icon('trash', '')}<span class="btn-tip">${title}</span></div>`;
    }

export function requestDeleteMfgDelivery(code) {
      const delivery = MFG_DELIVERIES.find(item => item.code === code);
      if (!delivery) return openModal('Delivery not found', `${code} is no longer available.`);
      if (!workspaceCanDeleteDelivery(delivery) && can('deleteMfgDelivery') !== true) return openModal('Deletion not permitted', 'Only an authorized user may delete this manufacturing delivery.');
      if (!mfgDeliveryCanBeDeleted(delivery)) return openModal('Deletion unavailable', `${code} has already been confirmed. Keep it in the history for traceability.`);
      openModal(`Delete ${code}?`, 'The manufacturing delivery will be removed and its PN quantities will become available for a new launch.', () => deleteMfgDeliveryRecord(code), 'Delete');
    }

export function deleteMfgDeliveryRecord(code) {
      const index = MFG_DELIVERIES.findIndex(item => item.code === code);
      if (index < 0 || !mfgDeliveryCanBeDeleted(MFG_DELIVERIES[index])) return;
      const [delivery] = MFG_DELIVERIES.splice(index,1);
      if (state.openMfgDeliveryId === code) state.openMfgDeliveryId = MFG_DELIVERIES[0]?.code || '';
      if (state.mfgCodeVerification.validDelivery?.code === code) state.mfgCodeVerification = { code:'', message:'', validDelivery:null };
      AUDIT_LOGS.unshift({ id:`AUD-${13000 + AUDIT_LOGS.length}`, date:new Date().toISOString().slice(0,16).replace('T',' '), user:productionActor(), module:'Manufacturing Delivery', action:'Deleted before confirmation', entity:delivery.code, project:delivery.project, po:delivery.po, details:`${delivery.code} was removed before signed reception confirmation. Its PN launch quantities were released.` });
      renderPage();
    }

export function mfgActionIcons(d,workspaceActions = false) {
      if (state.currentRole === 'wh_lead') {
        return `<div class="icon-actions">
          <div class="icon-btn" title="View" onclick="stop(event); openMfgDelivery('${d.code}')">${icon('view', '')}</div>
        </div>`;
      }
      const workspaceDelete = workspaceActions && workspaceCanDeleteDelivery(d) ? workspaceDeleteIcon('manufacturing',d) : '';
      return `<div class="icon-actions">
    <div class="icon-btn" title="View" onclick="stop(event); openMfgDelivery('${d.code}')">${icon('view', '')}</div>
    ${permIconBtn('editMfgDelivery', 'Edit', 'edit', `stop(event); openModal('Edit ${d.code}', 'This opens the delivery edit form.')`)}
    ${workspaceDelete || (d.status !== 'Delivered' ? permIconBtn('deleteMfgDelivery', 'Delete', 'trash', `stop(event); requestDeleteMfgDelivery('${d.code}')`, 'danger-hover') : '')}
    ${permIconBtn('printDeliveryNote', 'Download PDF', 'download', `stop(event); mfgRedownloadDeliveryPdf('${d.code}')`)}
  </div>`;
    }

export function setMfgSearch(v) { state.mfgFilters.search = v; state.mfgPage = 1; renderPage(); }

export function setMfgFilter(key, v) { state.mfgFilters[key] = v; state.mfgPage = 1; renderPage(); }

export function clearMfgFilter(key) { state.mfgFilters[key] = ''; state.mfgPage = 1; renderPage(); }

export function resetMfgFilters() { state.mfgFilters = { search: '', project: '', po: '', status: '', receiver: '', date: '' }; state.mfgPage = 1; renderPage(); }

export function sortMfg(key) { mfgSort.dir = (mfgSort.key === key) ? -mfgSort.dir : 1; mfgSort.key = key; renderPage(); }

export function setMfgPage(n) { state.mfgPage = Math.max(1, n); renderPage(); }

export function filterMfg() {
      const f = state.mfgFilters;
      return MFG_DELIVERIES.filter(d => {
        if (f.search && !(`${d.code} ${d.project} ${d.po} ${mfgDeliveryPnLabel(d)} ${d.receiver}`.toLowerCase().includes(f.search.toLowerCase()))) return false;
        if (f.project && d.project !== f.project) return false;
        if (f.po && d.po !== f.po) return false;
        if (f.status && d.status !== f.status) return false;
        if (f.receiver && d.receiver !== f.receiver) return false;
        if (f.date && d.date !== f.date) return false;
        return true;
      });
    }

export function mfgToolbarHtml() {
      const opt = (key, list, placeholder) => `<select class="tt-select" onchange="setMfgFilter('${key}', this.value)">
    <option value="">${placeholder}</option>
    ${list.map(v => `<option value="${v}" ${state.mfgFilters[key] === v ? 'selected' : ''}>${v}</option>`).join('')}
  </select>`;
      return `<div class="table-toolbar">
    <div class="tt-search">${icon('search', '')}<input type="text" placeholder="Search delivery…" value="${state.mfgFilters.search}" oninput="setMfgSearch(this.value)"/></div>
    ${opt('project', uniqueValues(MFG_DELIVERIES, 'project'), 'Project')}
    ${opt('po', uniqueValues(MFG_DELIVERIES, 'po'), 'Purchase Order')}
    ${opt('status', uniqueValues(MFG_DELIVERIES, 'status'), 'Status')}
    ${opt('receiver', uniqueValues(MFG_DELIVERIES, 'receiver'), 'Receiver')}
    ${opt('date', uniqueValues(MFG_DELIVERIES, 'date'), 'Date')}
    <div class="tt-spacer"></div>
    <div class="tt-icon-btn" title="Reset" onclick="resetMfgFilters()">${icon('close', '')}</div>
    <div class="tt-icon-btn" title="Refresh" onclick="refreshNotice()">${icon('refresh', '')}</div>
    <div class="tt-icon-btn" title="Export" onclick="exportNotice()">${icon('download', '')}</div>
  </div>`;
    }

export function pageMfgDeliveryList() {
      const rows = sortRows(filterMfg(), mfgSort);
      const total = rows.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      state.mfgPage = Math.min(state.mfgPage, totalPages);
      const pageRows = rows.slice((state.mfgPage - 1) * PAGE_SIZE, state.mfgPage * PAGE_SIZE);

      const stats = ['Unplanned','In Progress','Done','Packaged','Delivered'].map(status => ({ label:status, value:MFG_DELIVERIES.filter(d => d.status !== 'Cancelled' && syncMfgDeliveryLifecycle(d) === status).length, color:status === 'Delivered' || status === 'Done' ? 'var(--success)' : status === 'In Progress' ? 'var(--info)' : status === 'Packaged' ? 'var(--warning)' : undefined }));
      const chips = filterChips(state.mfgFilters, { project: 'Project', po: 'PO', status: 'Status', receiver: 'Receiver', date: 'Date' }, 'clearMfgFilter', 'resetMfgFilters');
      const tableBody = pageRows.length ? `<table>
    <thead><tr>
      ${sortTh('Delivery Code', 'code', mfgSort, 'sortMfg')}
      ${sortTh('Project', 'project', mfgSort, 'sortMfg')}
      ${sortTh('PO', 'po', mfgSort, 'sortMfg')}
      <th>PNs · Launch Qty</th>
      ${sortTh('Receiver', 'receiver', mfgSort, 'sortMfg')}
      ${sortTh('First Required Date', 'date', mfgSort, 'sortMfg')}
      ${sortTh('Status', 'status', mfgSort, 'sortMfg')}
      <th>Production</th>
      <th>Actions</th>
    </tr></thead>
    <tbody>${pageRows.map(d => `<tr class="clickable-row" onclick="openMfgDelivery('${d.code}')">
      <td class="mono">${d.code}</td><td>${d.project}</td><td class="mono">${d.po}</td><td class="mono">${mfgDeliveryPnLabel(d)}</td><td>${d.receiver || '<span class="badge neutral">Awaiting Warehouse TL</span>'}</td><td>${d.date || '—'}</td>
      <td>${statusBadge(d.status, d.statusType)}</td>
      <td>${statusBadge(syncMfgDeliveryLifecycle(d),productionStatusType(d.lifecycleStatus))}</td>
      <td>${mfgActionIcons(d)}</td>
    </tr>`).join('')}</tbody>
  </table>` : emptyStateBlock('No Manufacturing Deliveries Found', 'Try changing your filters.', 'resetMfgFilters');

      const createBtn = permBtn('createMfgDelivery', 'Create Delivery', 'plus', "navigate('mfg-delivery-create')", "primary")
        || permBtn('requestMfgDelivery', 'Request Delivery', 'plus', "navigate('mfg-delivery-create')", "primary");
      const verifyBtn = state.currentRole === 'wh_lead' ? `<button class="btn secondary" onclick="navigate('mfg-delivery-verify')">Enter Delivery Code</button>` : '';
      const historyBtn = `<button class="btn" onclick="navigate('mfg-delivery-history')">${icon('history','')} Delivery History</button>`;

      return `
  <div class="page-title-row" style="margin-bottom:2px;">
    <div>${verifyBtn}</div>
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">${historyBtn}${createBtn}</div>
  </div>
  ${statsRow(stats)}
  <div class="card">
    ${mfgToolbarHtml()}
    ${chips}
    <div class="table-head-row">${rowCountLabel(total, 'delivery')}</div>
    ${tableBody}
    ${pageRows.length ? paginationBar(total, state.mfgPage, PAGE_SIZE, 'setMfgPage') : ''}
  </div>`;
    }

export function pageMfgDeliveryHistory() {
      return `
  <div class="page-title-row" style="margin-bottom:12px;"><div></div><button class="btn" onclick="navigateBack('mfg-delivery-list')">${icon('chevLeft','')} Back to Deliveries</button></div>
  <div class="card">
    <div class="section-title">Manufacturing Delivery History <span class="hint">${MFG_DELIVERIES.length} records</span></div>
    ${mfgTable(MFG_DELIVERIES)}
  </div>`;
    }

export function pageMfgDeliveryVerify() {
      if (state.currentRole !== 'wh_lead') {
        return `<div class="card">${emptyStateBlock('Access denied', 'Only Warehouse Team Leader can validate delivery codes.', null)}</div>`;
      }
      const delivery = state.mfgCodeVerification.validDelivery;
      const receiverAssigned = delivery && MFG_DELIVERY_RECEIVERS.includes(delivery.receiver);
      const documentAction = delivery?.documentGeneratedAt ? `mfgRedownloadDeliveryPdf('${delivery.code}')` : 'mfgGenerateDeliveryDocument()';
      const documentLabel = delivery?.documentGeneratedAt ? 'Download PDF Again' : 'Generate PDF Document';
      return `
  <div class="card">
    <div class="section-title">Warehouse Code Verification</div>
    <div class="sim-field"><label class="sim-field-label">Delivery Code</label><input class="sim-select" type="text" value="${state.mfgCodeVerification.code}" oninput="mfgCodeVerification.code = this.value" placeholder="DEL-2026-000451" /></div>
    <div style="display:flex; gap:10px; margin-top:12px;"><button class="btn primary" onclick="mfgValidateDeliveryCode()">Validate Code</button>${delivery ? `<button class="btn secondary" onclick="${documentAction}" ${receiverAssigned ? '' : 'disabled'}>${icon('download','')} ${documentLabel}</button>` : ''}</div>
    ${state.mfgCodeVerification.message ? `<div class="hint" style="margin-top:12px;">${state.mfgCodeVerification.message}</div>` : ''}
    ${delivery ? `<div class="card" style="margin-top:16px; background:var(--bg);">
      <div class="section-title">Delivery Details</div>
      ${!receiverAssigned ? `<div class="sim-field" style="margin-bottom:14px;"><label class="sim-field-label">Select Manufacturing Receiver</label><select class="sim-select" onchange="mfgSetDeliveryReceiver(this.value)"><option value="">Choose receiver</option>${MFG_DELIVERY_RECEIVERS.map(r => `<option value="${r}" ${delivery.receiver === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>` : ''}
      <div class="result-row"><span class="r-label">Project</span><span class="r-value">${delivery.project}</span></div>
      <div class="result-row"><span class="r-label">PO</span><span class="r-value mono">${delivery.po}</span></div>
      <div class="result-row"><span class="r-label">PN Launch Quantities</span><span class="r-value mono">${mfgDeliveryPnLabel(delivery)}</span></div>
      <div class="result-row"><span class="r-label">Launch</span><span class="r-value">Approved</span></div>
      <div class="result-row"><span class="r-label">Receiver</span><span class="r-value">${delivery.receiver || 'Not assigned'}</span></div>
      <div class="result-row"><span class="r-label">First Required Time</span><span class="r-value">${delivery.date || '—'} ${delivery.time || ''}</span></div>
      <div class="result-row"><span class="r-label">Prepared by</span><span class="r-value">${delivery.documentGeneratedBy || 'Warehouse Team Leader'}</span></div>
      <div class="section-title" style="margin-top:16px;">PN Launch Plan</div>
      <table><thead><tr><th>Finished-Good PN</th><th>Launch Quantity</th><th>Remaining After</th></tr></thead><tbody>${mfgDeliveryPnQuantities(delivery).map(line => `<tr><td class="mono">${line.fgpn}</td><td class="mono">${line.qty == null ? '—' : Number(line.qty).toLocaleString()}</td><td class="mono">${line.remainingAfter == null ? '—' : Number(line.remainingAfter).toLocaleString()}</td></tr>`).join('')}</tbody></table>
      <div class="section-title" style="margin-top:16px;">Goods List</div>
      <div class="table-scroll"><table class="mfg-material-table"><thead><tr><th>Goods Type</th><th>Material PN</th><th>Description</th><th>Linked PNs · Requirement</th><th>Qty</th><th>Unit</th><th>Required Time</th></tr></thead>
        <tbody>${delivery.materials.map(item => `<tr><td>${item.type || 'Material'}</td><td class="mono">${item.code}</td><td>${item.desc}</td><td><div class="mfg-pn-tags">${(item.fgpns || mfgDeliveryFgpns(delivery)).map(fgpn => `<span class="mfg-pn-tag">${fgpn}${item.fgpnRequirements?.[fgpn] ? ` · ${Number(item.fgpnRequirements[fgpn]).toLocaleString()}` : ''}</span>`).join('')}</div></td><td class="mono">${Number(item.qty || 0).toLocaleString()}</td><td class="mono">${item.unit || 'PCS'}</td><td class="mono">${String(item.requiredTime || `${delivery.date || ''}T${delivery.time || ''}`).replace('T',' ') || '—'}</td></tr>`).join('')}</tbody></table></div>
    </div>` : ''}
  </div>`;
    }

export function mfgWizardGoStep(n) { state.mfgWizardStep = n; renderPage(); }

export function mfgDeliveryPnQuantities(delivery) {
      if (Array.isArray(delivery?.fgpnQuantities)) return delivery.fgpnQuantities;
      if (delivery?.fgpnQuantities && typeof delivery.fgpnQuantities === 'object') return Object.entries(delivery.fgpnQuantities).map(([fgpn,qty]) => ({ fgpn,qty:Number(qty || 0) }));
      return mfgDeliveryFgpns(delivery).map(fgpn => ({ fgpn,qty:null }));
    }

export function mfgPnLaunchSummary(poId, fgpn) {
      const part = poFinishedGoods(poId).find(item => item.fgpn === fgpn);
      const ordered = Number(part?.ordered || 0);
      const allocations = MFG_DELIVERIES.filter(delivery => delivery.po === poId && delivery.status !== 'Cancelled').reduce((totals,delivery) => {
        const line = mfgDeliveryPnQuantities(delivery).find(item => item.fgpn === fgpn);
        const qty = Number(line?.qty || 0);
        if (!qty) return totals;
        const productionStarted = PO_STATUS_FLOW.indexOf(mfgNormalizeLaunchLine(delivery,line).status) >= 1;
        if (productionStarted) totals.launched += qty; else totals.reserved += qty;
        return totals;
      },{ launched:0,reserved:0 });
      const launched = Math.min(ordered,allocations.launched);
      const reserved = Math.min(Math.max(0,ordered - launched),allocations.reserved);
      const allocated = launched + reserved;
      return { ordered,baseline:0,instructed:allocations.launched + allocations.reserved,launched,reserved,allocated,remaining:Math.max(0,ordered - allocated) };
    }

export function mfgEligibleOrders(poId) { return poFinishedGoods(poId).filter(part => mfgPnLaunchSummary(poId,part.fgpn).remaining > 0).map(part => ({ id:`PLAN-${part.fgpn}`, po:poId, project:part.project, customer:POS.find(po => po.id === poId)?.customer || '', fgpn:part.fgpn, qty:part.ordered, status:'Unplanned', due:POS.find(po => po.id === poId)?.delivery || 'Not set', desc:part.desc })); }

export function mfgEligiblePos(projectName) { return POS.filter(po => po.project === projectName && ['Unplanned','In Progress'].includes(poLifecycle(po.id)) && mfgEligibleOrders(po.id).length > 0); }

export function mfgResetLineSelection() { mfgWizard.selectedMaterials = {}; mfgWizard.qtys = {}; mfgWizard.itemTimes = {}; }

export function mfgWizardSetPo(v) {
      mfgInvalidateLaunchApproval();
      mfgWizard.po = v;
      const first = mfgEligibleOrders(v)[0]?.fgpn || '';
      mfgWizard.fgpn = first;
      mfgWizard.fgpns = first ? [first] : [];
      mfgWizard.fgpnQtys = first ? { [first]:0 } : {};
      mfgResetLineSelection();
      renderPage();
    }

export function mfgWizardSetProject(v) {
      mfgInvalidateLaunchApproval();
      mfgWizard.project = v;
      const firstPo = mfgEligiblePos(v)[0];
      mfgWizard.po = firstPo?.id || '';
      const first = mfgEligibleOrders(mfgWizard.po)[0]?.fgpn || '';
      mfgWizard.fgpn = first;
      mfgWizard.fgpns = first ? [first] : [];
      mfgWizard.fgpnQtys = first ? { [first]:0 } : {};
      mfgResetLineSelection();
      renderPage();
    }

export function mfgWizardToggleFgpn(fgpn, checked) {
      mfgInvalidateLaunchApproval();
      const selected = new Set(mfgWizard.fgpns || []);
      if (checked) {
        selected.add(fgpn);
        if (mfgWizard.fgpnQtys[fgpn] === undefined) mfgWizard.fgpnQtys[fgpn] = 0;
      } else {
        selected.delete(fgpn);
        delete mfgWizard.fgpnQtys[fgpn];
      }
      mfgWizard.fgpns = [...selected];
      mfgWizard.fgpn = mfgWizard.fgpns[0] || '';
      mfgResetLineSelection();
      renderPage();
    }

export function mfgWizardSelectAllFgpns(checked) {
      mfgInvalidateLaunchApproval();
      const eligible = mfgEligibleOrders(mfgWizard.po);
      mfgWizard.fgpns = checked ? eligible.map(order => order.fgpn) : [];
      mfgWizard.fgpnQtys = {};
      if (checked) eligible.forEach(order => { mfgWizard.fgpnQtys[order.fgpn] = mfgPnLaunchSummary(mfgWizard.po,order.fgpn).remaining; });
      mfgWizard.fgpn = mfgWizard.fgpns[0] || '';
      mfgResetLineSelection();
      renderPage();
    }

export function mfgWizardSetFgpnQty(fgpn, value) {
      mfgInvalidateLaunchApproval();
      const remaining = mfgPnLaunchSummary(mfgWizard.po,fgpn).remaining;
      mfgWizard.fgpnQtys[fgpn] = Math.max(0,Math.min(remaining,parseInt(value,10) || 0));
      mfgResetLineSelection();
      renderPage();
    }

export function mfgBomKeyForFgpn(fgpn, poId) {
      if (BOM_USAGE[fgpn]) return fgpn;
      const directPn = pnsForPo(poId).find(row => row.pn === fgpn);
      if (directPn && BOM_USAGE[directPn.pn]) return directPn.pn;
      const number = String(fgpn || '').match(/(\d+)$/)?.[1];
      const matchedPn = number ? pnsForPo(poId).find(row => row.pn.endsWith(number)) : null;
      return matchedPn && BOM_USAGE[matchedPn.pn] ? matchedPn.pn : '';
    }

export function mfgMaterialsForSelection(poId, selectedFgpns, fgpnQtys = mfgWizard.fgpnQtys) {
      const selected = new Set(selectedFgpns || []);
      const orders = mfgEligibleOrders(poId).filter(order => selected.has(order.fgpn));
      const aggregate = new Map();
      orders.forEach(order => {
        const launchQty = Number(fgpnQtys?.[order.fgpn] || 0);
        if (!(launchQty > 0)) return;
        const bomKey = mfgBomKeyForFgpn(order.fgpn,poId);
        Object.entries(BOM_USAGE[bomKey] || {}).forEach(([code,usage]) => {
          const material = MATERIALS.find(item => item.code === code);
          if (!material) return;
          if (!aggregate.has(code)) aggregate.set(code,{ ...material, required:0, fgpns:[], fgpnRequirements:{}, unit:material.type === 'Tape' ? 'ROLL' : ['Wire','Tube'].includes(material.type) ? 'M' : 'PCS' });
          const row = aggregate.get(code);
          const requirement = Math.ceil(Number(usage || 0) * launchQty);
          row.required += requirement;
          row.fgpnRequirements[order.fgpn] = Number(row.fgpnRequirements[order.fgpn] || 0) + requirement;
          if (!row.fgpns.includes(order.fgpn)) row.fgpns.push(order.fgpn);
        });
      });
      const launchableOrders = orders.filter(order => Number(fgpnQtys?.[order.fgpn] || 0) > 0);
      if (!aggregate.size && launchableOrders.length) {
        const orderedTotal = launchableOrders.reduce((sum,order) => sum + Number(order.qty || 0),0);
        const partialTotal = launchableOrders.reduce((sum,order) => sum + Number(fgpnQtys?.[order.fgpn] || 0),0);
        const factor = orderedTotal > 0 ? partialTotal / orderedTotal : 0;
        materialsForPo(poId).forEach(material => aggregate.set(material.code,{ ...material, required:Math.ceil(Number(material.required || 0) * factor), fgpns:launchableOrders.map(order => order.fgpn), fgpnRequirements:{}, unit:material.type === 'Tape' ? 'ROLL' : ['Wire','Tube'].includes(material.type) ? 'M' : 'PCS' }));
      }
      return [...aggregate.values()];
    }

export function mfgDefaultItemTime() { return `${mfgWizard.deliveryDate || new Date().toISOString().slice(0,10)}T${mfgWizard.deliveryTime || '09:00'}`; }

export function mfgWizardToggleMaterial(code, checked) {
      const row = mfgMaterialsForSelection(mfgWizard.po,mfgWizard.fgpns).find(item => item.code === code);
      if (checked && row) {
        mfgWizard.selectedMaterials[code] = true;
        if (!(Number(mfgWizard.qtys[code]) > 0)) mfgWizard.qtys[code] = Math.min(Number(row.required || 0),Number(row.warehouse || 0));
        if (!mfgWizard.itemTimes[code]) mfgWizard.itemTimes[code] = mfgDefaultItemTime();
      } else {
        delete mfgWizard.selectedMaterials[code]; delete mfgWizard.qtys[code]; delete mfgWizard.itemTimes[code];
      }
      renderPage();
    }

export function mfgWizardSelectAllMaterials(checked) {
      mfgMaterialsForSelection(mfgWizard.po,mfgWizard.fgpns).forEach(row => {
        if (checked) {
          mfgWizard.selectedMaterials[row.code] = true;
          if (!(Number(mfgWizard.qtys[row.code]) > 0)) mfgWizard.qtys[row.code] = Math.min(Number(row.required || 0),Number(row.warehouse || 0));
          if (!mfgWizard.itemTimes[row.code]) mfgWizard.itemTimes[row.code] = mfgDefaultItemTime();
        } else {
          delete mfgWizard.selectedMaterials[row.code]; delete mfgWizard.qtys[row.code]; delete mfgWizard.itemTimes[row.code];
        }
      });
      renderPage();
    }

export function mfgWizardSetQty(code, v) {
      const row = mfgMaterialsForSelection(mfgWizard.po,mfgWizard.fgpns).find(item => item.code === code);
      mfgWizard.qtys[code] = Math.max(0,Math.min(Number(row?.warehouse || 0),parseInt(v,10) || 0));
      renderPage();
    }

export function mfgWizardSetItemTime(code, value) { mfgWizard.itemTimes[code] = value; }

export function mfgWizardContinueFromContext() {
      if (!mfgWizard.po || !mfgEligibleOrders(mfgWizard.po).length) return openModal('No eligible PO','Select a PO in Unplanned or In Progress status.');
      state.mfgWizardStep = 2; renderPage();
    }

export function mfgWizardContinueFromParts() {
      if (!(mfgWizard.fgpns || []).length) return openModal('Select at least one PN','Choose one or more eligible Finished Good Part Numbers.');
      const invalid = mfgWizard.fgpns.find(fgpn => {
        const qty = Number(mfgWizard.fgpnQtys[fgpn] || 0);
        const remaining = mfgPnLaunchSummary(mfgWizard.po,fgpn).remaining;
        return !(qty > 0) || qty > remaining;
      });
      if (invalid) return openModal('Launch quantity required',`Enter a launch quantity between 1 and ${mfgPnLaunchSummary(mfgWizard.po,invalid).remaining.toLocaleString()} for ${invalid}.`);
      state.mfgWizardStep = 3; renderPage();
    }

export function mfgWizardContinueFromItems() {
      const selected = Object.keys(mfgWizard.selectedMaterials || {}).filter(code => mfgWizard.selectedMaterials[code]);
      if (!selected.length) return openModal('Select at least one material','Choose the material part numbers to transfer.');
      if (selected.some(code => !(Number(mfgWizard.qtys[code]) > 0))) return openModal('Quantity required','Enter a quantity greater than zero for every selected material.');
      if (selected.some(code => !mfgWizard.itemTimes[code])) return openModal('Required delivery time missing','Set the required delivery date and time for every selected material.');
      state.mfgWizardStep = 4; renderPage();
    }

export function generateMfgDeliveryCodeString() {
      const prefix = 'DEL-';
      const date = new Date();
      const year = date.getFullYear();
      let code = '';
      do {
        const serial = String(Math.floor(100000 + Math.random() * 900000));
        code = `${prefix}${year}-${serial}`;
      } while (MFG_DELIVERIES.some(delivery => delivery.code === code));
      return code;
    }

export function mfgWizardGenerateCode() {
      mfgWizard.code = generateMfgDeliveryCodeString();
      const now = new Date();
      mfgWizard.generatedAt = now.toISOString().slice(0, 16).replace('T', ' ');
      mfgWizard.expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ');
      renderPage();
    }

export function mfgWizardRegenerateCode() {
      mfgWizardGenerateCode();
      openModal('New delivery code generated', `A new code has been created: ${mfgWizard.code}`);
    }

export function mfgWizardCopyCode() {
      if (!mfgWizard.code) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(mfgWizard.code);
        openModal('Code Copied', `${mfgWizard.code} copied to clipboard.`);
      } else {
        openModal('Copy Delivery Code', `Copy this code manually: ${mfgWizard.code}`);
      }
    }

export function mfgWizardPrintCode() {
      if (!mfgWizard.code) return;
      openModal('Print Delivery Code', `Print this code from your browser or use the document print function.\n\n${mfgWizard.code}`);
    }

export function formatRemainingTime(expiresAt) {
      if (!expiresAt) return '—';
      const diff = new Date(expiresAt.replace(' ', 'T')) - new Date();
      if (diff <= 0) return 'Expired';
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      return `${hours}h ${mins}m`;
    }

export function formatExpiresInText(expiresAt) {
      if (!expiresAt) return '—';
      const diff = new Date(expiresAt.replace(' ', 'T')) - new Date();
      if (diff <= 0) return 'Expired';
      const hours = Math.floor(diff / 3600000);
      return `${hours} Hours`;
    }

export function isCodeExpired(expiresAt) {
      if (!expiresAt) return false;
      return new Date(expiresAt.replace(' ', 'T')) <= new Date();
    }

export function mfgLaunchFingerprint() {
      const plan = [...new Set(mfgWizard.fgpns || [])].sort().map(fgpn => `${fgpn}:${Number(mfgWizard.fgpnQtys?.[fgpn] || 0)}`).join('|');
      return `${mfgWizard.project}|${mfgWizard.po}|${plan}`;
    }

export function mfgWizardLaunchApproved() {
      return !!(mfgWizard.approval?.approved && mfgWizard.approval.fingerprint === mfgLaunchFingerprint());
    }

export function mfgInvalidateLaunchApproval() {
      mfgWizard.approval = null;
      state.mfgLaunchSimulationResult = null;
      if (state.mfgSimulationContext.active) state.simResult = null;
    }

export function openMfgLaunchSimulation() {
      const selected = mfgWizard.fgpns || [];
      if (!selected.length || selected.some(fgpn => !(Number(mfgWizard.fgpnQtys?.[fgpn]) > 0))) return openModal('Complete the PN launch plan', 'Select at least one finished-good PN and enter its partial launch quantity before opening the simulation.');
      state.mfgSimulationContext = { active:true,returnStep:4 };
      state.simProject = mfgWizard.project;
      state.simScope = 'single';
      state.simSinglePO = mfgWizard.po;
      state.simMode = 'current';
      state.simUseCurrentVersions = true;
      state.simResult = state.mfgLaunchSimulationResult?.fingerprint === mfgLaunchFingerprint() ? state.mfgLaunchSimulationResult : null;
      navigate('sim-launch');
    }

export function returnToMfgInstruction() {
      const returnStep = state.mfgSimulationContext.returnStep || 4;
      state.mfgSimulationContext.active = false;
      state.simResult = null;
      state.mfgWizardStep = returnStep;
      navigateBack('mfg-delivery-create');
    }

export function mfgWizardCanCreateDelivery() {
      return state.simMeetingSaved && mfgWizardLaunchApproved();
    }

export function mfgAuditEvent(action, delivery, details) {
      AUDIT_LOGS.unshift({
        id:`AUD-${AUDIT_LOGS.length + 12000}`,
        date:new Date().toISOString().slice(0,16).replace('T',' '),
        user:productionActor(),
        module:'Manufacturing Delivery',
        action,
        entity:delivery?.code || state.mfgCodeVerification.code || 'Unknown code',
        project:delivery?.project || '',
        po:delivery?.po || '',
        details,
      });
    }

export function mfgWizardSaveInstruction() {
      if (!mfgWizardCanCreateDelivery()) {
        return openModal('Cannot create delivery', 'Delivery instructions require an approved launch and saved meeting minutes.');
      }
      const eligibleFgpns = new Set(mfgEligibleOrders(mfgWizard.po).map(order => order.fgpn));
      const selectedFgpns = [...new Set(mfgWizard.fgpns || [])].filter(fgpn => eligibleFgpns.has(fgpn));
      if (!selectedFgpns.length) return openModal('Eligible PN required', 'Select at least one Unplanned or In Progress Finished Good Part Number.');
      const fgpnQuantities = selectedFgpns.map(fgpn => {
        const summary = mfgPnLaunchSummary(mfgWizard.po,fgpn);
        const qty = Number(mfgWizard.fgpnQtys[fgpn] || 0);
        return { fgpn,qty,ordered:summary.ordered,previouslyLaunched:summary.launched,previouslyReserved:summary.reserved,remainingAfter:Math.max(0,summary.remaining - qty),status:'Unplanned',producedQty:0,packagedQty:0,customerDeliveredQty:0 };
      });
      const invalidFgpn = fgpnQuantities.find(line => !(line.qty > 0) || line.qty > mfgPnLaunchSummary(mfgWizard.po,line.fgpn).remaining);
      if (invalidFgpn) return openModal('Check PN launch quantities', `The launch quantity for ${invalidFgpn.fgpn} must be greater than zero and cannot exceed its remaining quantity.`);
      const selectedMaterials = mfgMaterialsForSelection(mfgWizard.po,selectedFgpns)
        .filter(row => mfgWizard.selectedMaterials[row.code])
        .map(row => ({
          code:row.code,
          desc:row.desc,
          type:row.type,
          required:Number(row.required || 0),
          warehouse:Number(row.warehouse || 0),
          qty:Number(mfgWizard.qtys[row.code] || 0),
          unit:row.unit,
          fgpns:[...row.fgpns],
          fgpnRequirements:{ ...(row.fgpnRequirements || {}) },
          requiredTime:mfgWizard.itemTimes[row.code] || '',
        }));
      if (!selectedMaterials.length) return openModal('No materials selected', 'Select at least one material part number to transfer.');
      if (selectedMaterials.some(item => !(item.qty > 0) || item.qty > item.warehouse)) return openModal('Check quantities', 'Each selected quantity must be greater than zero and cannot exceed warehouse availability.');
      if (selectedMaterials.some(item => !item.requiredTime)) return openModal('Required delivery time missing', 'Set a required delivery date and time for every selected material.');
      const earliestRequiredTime = [...selectedMaterials].sort((a,b) => a.requiredTime.localeCompare(b.requiredTime))[0].requiredTime;
      const [deliveryDate,deliveryTime = ''] = earliestRequiredTime.split('T');
      const now = new Date();
      const code = generateMfgDeliveryCodeString();
      const generatedAt = now.toISOString().slice(0,16).replace('T',' ');
      const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().slice(0,16).replace('T',' ');
      const newDelivery = {
        code,
        project: mfgWizard.project,
        po: mfgWizard.po,
        fgpn: selectedFgpns[0],
        fgpns: selectedFgpns,
        fgpnQuantities,
        receiver: '',
        date: deliveryDate,
        time: deliveryTime,
        priority: mfgWizard.priority,
        materials: selectedMaterials,
        notes: mfgWizard.notes,
        status: 'Code Generated',
        statusType: mfgStatusType('Code Generated'),
        generatedAt,
        expiresAt,
        used: false,
        docUploaded: false,
        signedFileName: '',
        signedBy: '',
        signedAt: '',
        documentGeneratedAt: '',
        createdBy: productionActor(),
        lifecycleStatus: 'Unplanned',
      };
      const poStatusBeforeLaunch = poLifecycle(newDelivery.po);
      MFG_DELIVERIES.unshift(newDelivery);
      const totalLaunchQty = fgpnQuantities.reduce((sum,line) => sum + line.qty,0);
      const poStatusAfterLaunch = poLifecycle(newDelivery.po);
      recordPoLifecycleChange(
        newDelivery.po,
        poStatusBeforeLaunch,
        poStatusAfterLaunch,
        productionActor(),
        `First manufacturing launch ${newDelivery.code} created for ${totalLaunchQty.toLocaleString()} unit${totalLaunchQty === 1 ? '' : 's'}`,
        newDelivery.code
      );
      mfgAuditEvent('Partial manufacturing launch created',newDelivery,`${totalLaunchQty.toLocaleString()} finished-good units across ${selectedFgpns.length} PN${selectedFgpns.length === 1 ? '' : 's'}; ${selectedMaterials.length} material line${selectedMaterials.length === 1 ? '' : 's'} saved with transfer quantities and required delivery times.`);
      mfgAuditEvent('Single-use delivery code generated',newDelivery,`Code generated with a 48-hour validity period; expires ${expiresAt}.`);
      state.openMfgDeliveryId = code;
      state.mfgActiveTab = 'Overview';
      state.mfgWizardStep = 1;
      mfgWizard.fgpns = [];
      mfgWizard.fgpn = '';
      mfgWizard.fgpnQtys = {};
      mfgWizard.approval = null;
      state.mfgSimulationContext.active = false;
      state.mfgLaunchSimulationResult = null;
      mfgWizard.selectedMaterials = {};
      mfgWizard.qtys = {};
      mfgWizard.itemTimes = {};
      mfgWizard.receiver = '';
      mfgWizard.deliveryDate = new Date().toISOString().slice(0, 10);
      mfgWizard.deliveryTime = '09:00';
      mfgWizard.priority = 'Normal';
      mfgWizard.notes = '';
      mfgWizard.code = '';
      mfgWizard.generatedAt = '';
      mfgWizard.expiresAt = '';
      openModal('Instruction saved · code generated', `${code} is valid for 48 hours and can be used once by the Warehouse Team Leader.`);
      navigate('mfg-delivery-workspace',{ replace:true });
    }

export function mfgFindDeliveryByCode(code) {
      return MFG_DELIVERIES.find(d => d.code.toUpperCase() === (code || '').toUpperCase());
    }

export function mfgDeliveryFgpns(delivery) {
      return delivery?.fgpns?.length ? delivery.fgpns : (delivery?.fgpn ? [delivery.fgpn] : []);
    }

export function mfgDeliveryPnLabel(delivery) {
      const lines = mfgDeliveryPnQuantities(delivery);
      return lines.map(line => `${line.fgpn}${line.qty == null ? '' : ` · ${Number(line.qty).toLocaleString()}`}`).join(', ') || 'PO scope';
    }

export function mfgValidateDeliveryCode() {
      if (state.currentRole !== 'wh_lead') return openModal('Warehouse Team Leader action', 'Only the Warehouse Team Leader can access a delivery instruction with its code.');
      const code = state.mfgCodeVerification.code.trim();
      const delivery = mfgFindDeliveryByCode(code);
      if (!delivery) {
        state.mfgCodeVerification.message = 'Invalid delivery code.';
        state.mfgCodeVerification.validDelivery = null;
        mfgAuditEvent('Delivery code access failed',null,`Invalid code entered: ${code || 'blank'}.`);
        renderPage();
        return;
      }
      const now = new Date();
      const expiry = delivery.expiresAt ? new Date(delivery.expiresAt.replace(' ', 'T')) : null;
      if (delivery.used) {
        state.mfgCodeVerification.message = 'This code has already been used.';
        state.mfgCodeVerification.validDelivery = null;
        mfgAuditEvent('Delivery code access failed',delivery,'Access rejected because the single-use code was already used.');
        renderPage();
        return;
      }
      if (delivery.status === 'Expired' || (expiry && now > expiry)) {
        delivery.status = 'Expired';
        delivery.statusType = mfgStatusType('Expired');
        state.mfgCodeVerification.message = 'This code has expired. Please contact the Launch Engineer to generate a new delivery instruction.';
        state.mfgCodeVerification.validDelivery = null;
        mfgAuditEvent('Delivery code access failed',delivery,'Access rejected because the 48-hour delivery code expired.');
        renderPage();
        return;
      }
      delivery.used = true;
      delivery.status = 'Code Used';
      delivery.statusType = mfgStatusType('Code Used');
      delivery.codeUsedAt = now.toISOString().slice(0, 16).replace('T', ' ');
      state.mfgCodeVerification.message = 'Code accepted. Select the Manufacturing Receiver, then generate the delivery document.';
      state.mfgCodeVerification.validDelivery = delivery;
      mfgAuditEvent('Delivery code accessed',delivery,'Warehouse Team Leader successfully used the single-use delivery code.');
      renderPage();
    }

export function mfgSetDeliveryReceiver(value) {
      if (state.currentRole !== 'wh_lead') return openModal('Warehouse Team Leader action', 'Only the Warehouse Team Leader can select the Manufacturing Receiver.');
      const delivery = state.mfgCodeVerification.validDelivery || MFG_DELIVERIES.find(d => d.code === state.openMfgDeliveryId);
      if (!delivery) return;
      delivery.receiver = value;
      renderPage();
    }

export function mfgDeliveryCopyCode(code) {
      if (!code) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code);
        openModal('Code Copied', `${code} copied to clipboard.`);
      } else {
        openModal('Copy Delivery Code', `Copy this code manually: ${code}`);
      }
    }

export function mfgDeliveryPrintCode(code) {
      if (!code) return;
      openModal('Print Delivery Code', `Print this code from your browser or use the document print function.\n\n${code}`);
    }

export function mfgDeliveryRegenerateCode(code) {
      if (!['engineer','manager'].includes(state.currentRole)) return openModal('Launch action required', 'Only the assigned Launch Engineer or Launch Manager can regenerate this delivery code.');
      const delivery = MFG_DELIVERIES.find(d => d.code === code);
      if (!delivery) return;
      const newCode = generateMfgDeliveryCodeString();
      delivery.code = newCode;
      delivery.generatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      delivery.expiresAt = new Date(new Date().getTime() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ');
      delivery.status = 'Code Generated';
      delivery.statusType = mfgStatusType('Code Generated');
      delivery.used = false;
      state.openMfgDeliveryId = newCode;
      if (state.mfgCodeVerification.validDelivery && state.mfgCodeVerification.validDelivery.code === code) {
        state.mfgCodeVerification.validDelivery = delivery;
      }
      mfgAuditEvent('Single-use delivery code regenerated',delivery,`Previous code ${code} replaced; new code expires ${delivery.expiresAt}.`);
      openModal('New delivery code generated', `A new code has been created: ${newCode}`);
      renderPage();
    }

export function mfgPdfText(value) {
      return String(value == null ? '' : value)
        .replace(/[–—]/g,'-').replace(/·/g,' | ').replace(/×/g,'x').replace(/[‘’]/g,"'").replace(/[“”]/g,'"')
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'?');
    }

export function mfgPdfEscape(value) { return mfgPdfText(value).replace(/([\\()])/g,'\\$1'); }

export function mfgPdfShort(value, max) {
      const text = mfgPdfText(value);
      return text.length > max ? `${text.slice(0,Math.max(0,max-3))}...` : text;
    }

export function mfgPdfWrap(value, max) {
      const clean = mfgPdfText(value);
      if (clean.length <= max) return [clean];
      let splitAt = clean.lastIndexOf(' ',max);
      if (splitAt < Math.floor(max*.55)) splitAt = max;
      return [clean.slice(0,splitAt),mfgPdfShort(clean.slice(splitAt).trim(),max)];
    }

export function mfgPdfStream(delivery, rows, pageIndex, pageCount, firstPage, lastPage) {
      const commands = [];
      const text = (x,y,size,value,bold=false,color='0 0 0') => commands.push(`${color} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${mfgPdfEscape(value)}) Tj ET`);
      const fill = (x,y,w,h,color) => commands.push(`${color} rg ${x} ${y} ${w} ${h} re f`);
      const stroke = (x,y,w,h,color='0.82 0.86 0.89',width=.7) => commands.push(`${color} RG ${width} w ${x} ${y} ${w} ${h} re S`);
      const line = (x1,y1,x2,y2,color='0.82 0.86 0.89',width=.7) => commands.push(`${color} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
      const warehouseLeader = delivery.documentGeneratedBy || productionActor();
      const generatedDate = delivery.documentGeneratedAt || new Date().toISOString().slice(0,16).replace('T',' ');

      fill(0,770,595,72,'0.04 0.36 0.45');
      text(40,808,17,'WAREHOUSE-TO-MANUFACTURING DELIVERY',true,'1 1 1');
      text(40,789,9,'ADIENT LAUNCHOPS  |  CONTROLLED TRANSFER DOCUMENT',false,'0.82 0.94 0.96');
      text(470,805,9,`PAGE ${pageIndex + 1} / ${pageCount}`,true,'1 1 1');
      text(470,789,8,delivery.code,false,'0.82 0.94 0.96');

      let tableTop;
      if (firstPage) {
        fill(40,705,515,48,'0.95 0.98 0.98'); stroke(40,705,515,48,'0.63 0.78 0.82');
        text(52,738,7.5,'DELIVERY CODE',true,'0.22 0.29 0.34'); text(52,718,13,delivery.code,true,'0.02 0.29 0.37');
        text(315,738,7.5,'DOCUMENT GENERATED',true,'0.22 0.29 0.34'); text(315,718,9.5,generatedDate,true);

        const meta = [
          ['PROJECT',delivery.project],['PURCHASE ORDER',delivery.po],['FIRST REQUIRED TIME',`${delivery.date || '-'} ${delivery.time || ''}`],['PRIORITY',delivery.priority || 'Normal'],
        ];
        const metaX = [40,170,300,440], metaW = [130,130,140,115];
        meta.forEach((item,index) => { fill(metaX[index],638,metaW[index],49,index % 2 ? '0.98 0.985 0.99' : '0.96 0.97 0.98'); stroke(metaX[index],638,metaW[index],49); text(metaX[index]+10,672,7,item[0],true,'0.30 0.35 0.39'); text(metaX[index]+10,652,9,mfgPdfShort(item[1],index === 2 ? 21 : 18),true); });

        fill(40,578,515,45,'0.98 0.985 0.99'); stroke(40,578,515,45);
        text(52,609,7,'WAREHOUSE TEAM LEADER',true,'0.30 0.35 0.39'); text(52,590,9.5,warehouseLeader,true);
        text(310,609,7,'MANUFACTURING RECEIVER',true,'0.30 0.35 0.39'); text(310,590,9.5,mfgPdfShort(delivery.receiver,35),true);

        text(40,550,8,'APPROVED PN LAUNCH SCOPE',true,'0.02 0.36 0.45');
        const pnSummary = mfgDeliveryPnQuantities(delivery).map(item => `${item.fgpn} x ${item.qty == null ? '-' : Number(item.qty).toLocaleString('en-US')}`).join('  |  ');
        text(40,532,9,mfgPdfShort(pnSummary || 'PO scope',92),true);
        tableTop = 490;
      } else {
        text(40,738,11,'GOODS LIST - CONTINUED',true,'0.02 0.36 0.45');
        tableTop = 705;
      }

      text(40,tableTop+15,9,firstPage ? 'GOODS TO TRANSFER' : `GOODS TO TRANSFER - CONTINUED`,true,'0.02 0.36 0.45');
      const headerY = tableTop-13;
      fill(40,headerY,515,22,'0.04 0.36 0.45');
      const columns = [40,95,180,315,410,455,490,555];
      const headers = ['TYPE','MATERIAL PN','DESCRIPTION','LINKED FGPN','QTY','UNIT','REQUIRED'];
      headers.forEach((label,index) => text(columns[index]+5,headerY+7,6.6,label,true,'1 1 1'));
      const rowHeight = 32;
      rows.forEach((item,index) => {
        const y = headerY-rowHeight*(index+1);
        if (index % 2 === 0) fill(40,y,515,rowHeight,'0.975 0.98 0.985');
        line(40,y,555,y);
        const linked = (item.fgpns || mfgDeliveryFgpns(delivery)).join(', ');
        const requiredTime = String(item.requiredTime || `${delivery.date || ''} ${delivery.time || ''}`).replace('T',' ');
        const descriptionLines = mfgPdfWrap(item.desc,34), linkedLines = mfgPdfWrap(linked,23);
        const values = [mfgPdfShort(item.type || 'Material',9),mfgPdfShort(item.code,14),null,null,Number(item.qty || 0).toLocaleString('en-US'),item.unit || 'PCS',mfgPdfShort(requiredTime,16)];
        values.forEach((value,col) => { if (value != null) text(columns[col]+5,y+13,col === 6 ? 6.2 : 7,value,col === 1 || col === 4); });
        descriptionLines.forEach((value,lineIndex) => text(columns[2]+5,y+(lineIndex ? 7 : 19),6.7,value));
        linkedLines.forEach((value,lineIndex) => text(columns[3]+5,y+(lineIndex ? 7 : 19),6.5,value));
      });
      stroke(40,headerY-rowHeight*rows.length,515,22+rowHeight*rows.length);
      columns.slice(1,-1).forEach(x => line(x,headerY-rowHeight*rows.length,x,headerY+22));

      if (lastPage) {
        if (delivery.notes) { text(40,180,7,'WAREHOUSE NOTES',true,'0.30 0.35 0.39'); text(40,166,8,mfgPdfShort(delivery.notes,105)); }
        text(40,143,8,'TRANSFER SIGNATURES',true,'0.02 0.36 0.45');
        stroke(40,63,245,65); stroke(310,63,245,65);
        line(56,88,269,88,'0.55 0.60 0.64'); line(326,88,539,88,'0.55 0.60 0.64');
        text(56,112,7,'WAREHOUSE TEAM LEADER',true,'0.30 0.35 0.39'); text(56,73,7,warehouseLeader);
        text(326,112,7,'MANUFACTURING RECEIVER',true,'0.30 0.35 0.39'); text(326,73,7,delivery.receiver);
      }
      text(40,27,6.5,`Generated by LaunchOps on ${generatedDate} | Audit reference: ${delivery.code}`,false,'0.42 0.47 0.51');
      return commands.join('\n');
    }

export function mfgCreateDeliveryPdfBlob(delivery) {
      const materials = delivery.materials?.length ? delivery.materials : [{ type:'Material',code:'-',desc:'No material lines recorded',fgpns:mfgDeliveryFgpns(delivery),qty:0,unit:'-',requiredTime:`${delivery.date || ''} ${delivery.time || ''}` }];
      const chunks = [materials.slice(0,8)];
      for (let index=8; index<materials.length; index+=14) chunks.push(materials.slice(index,index+14));
      const streams = chunks.map((rows,index) => mfgPdfStream(delivery,rows,index,chunks.length,index===0,index===chunks.length-1));
      const objects = [null,'','',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
      ];
      const pageRefs = [];
      streams.forEach((stream,index) => {
        const pageObject = 5 + index*2, contentObject = pageObject + 1;
        pageRefs.push(`${pageObject} 0 R`);
        objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`;
        objects[contentObject] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
      });
      objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
      objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`;
      let pdf = '%PDF-1.4\n';
      const offsets = [0];
      for (let index=1; index<objects.length; index++) { offsets[index] = pdf.length; pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`; }
      const xrefOffset = pdf.length;
      pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
      for (let index=1; index<objects.length; index++) pdf += `${String(offsets[index]).padStart(10,'0')} 00000 n \n`;
      pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
      return new Blob([pdf],{ type:'application/pdf' });
    }

export function mfgDownloadDeliveryPdf(delivery) {
      const blob = mfgCreateDeliveryPdfBlob(delivery);
      const fileName = delivery.documentFileName || `warehouse-to-manufacturing_${String(delivery.code).replace(/[^A-Za-z0-9_-]/g,'-')}.pdf`;
      delivery.documentFileName = fileName;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = fileName;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return fileName;
    }

export function mfgRedownloadDeliveryPdf(code) {
      const delivery = MFG_DELIVERIES.find(item => item.code === code);
      if (!delivery?.documentGeneratedAt || !MFG_DELIVERY_RECEIVERS.includes(delivery.receiver)) return openModal('Document not available', 'Generate the delivery document after selecting the Manufacturing Receiver.');
      mfgDownloadDeliveryPdf(delivery);
    }

export function mfgGenerateDeliveryDocument() {
      if (state.currentRole !== 'wh_lead') return openModal('Warehouse Team Leader action', 'Only the Warehouse Team Leader can generate the warehouse-to-manufacturing delivery document.');
      const delivery = state.mfgCodeVerification.validDelivery || MFG_DELIVERIES.find(d => d.code === state.openMfgDeliveryId);
      if (!delivery) return;
      if (!MFG_DELIVERY_RECEIVERS.includes(delivery.receiver)) {
        return openModal('Receiver required', 'Select a manufacturing receiver from the predefined list before generating the document.');
      }
      delivery.status = 'Document Generated';
      delivery.statusType = mfgStatusType('Document Generated');
      delivery.documentGeneratedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      delivery.documentGeneratedBy = productionActor();
      const generatedFileName = mfgDownloadDeliveryPdf(delivery);
      if (!delivery.docUploaded) {
        delivery.status = 'Waiting for Signed PDF';
        delivery.statusType = mfgStatusType('Waiting for Signed PDF');
      }
      mfgAuditEvent('Delivery document generated',delivery,`${generatedFileName} generated by ${delivery.documentGeneratedBy} for ${delivery.materials.length} goods line${delivery.materials.length === 1 ? '' : 's'}; Manufacturing Receiver: ${delivery.receiver}.`);
      openModal('PDF document generated', `${generatedFileName} has been downloaded. Print it for the Manufacturing Receiver to sign, then upload the signed PDF.`);
      renderPage();
    }

export function mfgSetSignedFile(field, value) {
      if (!state.openMfgDeliveryId) return;
      const delivery = MFG_DELIVERIES.find(d => d.code === state.openMfgDeliveryId);
      if (!delivery) return;
      if (!delivery.documentGeneratedAt || !MFG_DELIVERY_RECEIVERS.includes(delivery.receiver)) {
        fileInput.value = '';
        return openModal('Generate the delivery document first', 'Validate the delivery code, select the Manufacturing Receiver, and generate the formal document before uploading its signed PDF.');
      }
      delivery[field] = value;
      renderPage();
    }

export function mfgHandleSignedUpload(fileInput) {
      if (state.currentRole !== 'wh_lead') return openModal('Warehouse Team Leader action', 'Only the Warehouse Team Leader can upload the receiver-signed manufacturing reception document.');
      const file = fileInput.files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        openModal('Invalid file', 'Only PDF files are accepted for signed delivery documents.');
        fileInput.value = '';
        return;
      }
      const delivery = MFG_DELIVERIES.find(d => d.code === state.openMfgDeliveryId);
      if (!delivery) return;
      delivery.signedFileName = file.name;
      delivery.signedBy = productionActor();
      delivery.signedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      delivery.docUploaded = true;
      delivery.status = 'Signed Document Uploaded';
      delivery.statusType = mfgStatusType('Signed Document Uploaded');
      const before = poLifecycle(delivery.po);
      const deliveryFgpns = delivery.fgpns?.length ? delivery.fgpns : (delivery.fgpn ? [delivery.fgpn] : []);
      mfgDeliveryPnQuantities(delivery).forEach(line => {
        mfgNormalizeLaunchLine(delivery,line);
        if (line.status === 'Unplanned') line.status = 'In Progress';
        line.startedAt = delivery.signedAt;
        line.startedBy = delivery.signedBy;
      });
      syncMfgDeliveryLifecycle(delivery);
      const after = poLifecycle(delivery.po);
      recordPoLifecycleChange(delivery.po,before,after,productionActor(),`Warehouse Team Leader uploaded the receiver-signed manufacturing reception document${deliveryFgpns.length ? ` for ${deliveryFgpns.join(', ')}` : ''}`,file.name);
      mfgAuditEvent('Receiver-signed document uploaded',delivery,`${file.name} uploaded by ${delivery.signedBy} at ${delivery.signedAt}; Manufacturing Receiver: ${delivery.receiver}.`);
      openModal('Signed document uploaded · production started', `${delivery.po} is now ${after}. The signed reception document is stored and awaits Launch validation before warehouse stock is reduced.`);
      renderPage();
    }

export function mfgConfirmDelivery() {
      const delivery = MFG_DELIVERIES.find(d => d.code === state.openMfgDeliveryId);
      if (!delivery) return;
      if (!['engineer','manager'].includes(state.currentRole)) {
        return openModal('Launch validation required', 'The assigned Launch Engineer or Launch Manager must validate the signed document before stock is updated.');
      }
      if (!delivery.docUploaded) {
        return openModal('Cannot confirm delivery', 'Signed document upload is required before stock can be updated.');
      }
      if (delivery.status === 'Delivered') {
        return openModal('Already completed', 'This delivery has already been confirmed.');
      }
      delivery.status = 'Delivered';
      delivery.statusType = mfgStatusType('Delivered');
      delivery.completedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      delivery.validatedBy = productionActor();
      delivery.materials.forEach(item => {
        const m = MATERIALS.find(x => x.code === item.code);
        if (m) m.warehouse = Math.max(0, m.warehouse - item.qty);
      });
      AUDIT_LOGS.unshift({ id:`AUD-${AUDIT_LOGS.length + 11000}`, date:delivery.completedAt, user:productionActor(), module:'Manufacturing Delivery', action:'Signed Document Validated', entity:delivery.code, project:delivery.project, po:delivery.po, details:`Signed reception document validated; warehouse stock reduced for ${delivery.materials.length} material rows.` });
      openModal('Signed document validated · stock updated', 'The evidence is validated and warehouse stock quantities have been adjusted. The PO production status remains In Progress.');
      renderPage();
    }

export function pageMfgDeliveryCreate() {
      if (can('createMfgDelivery') !== true && can('requestMfgDelivery') !== true) {
        return `<div class="card">${emptyStateBlock('Insufficient permissions', 'Your role cannot create manufacturing deliveries.', null)}</div>`;
      }
      const step = state.mfgWizardStep;
      const steps = ['Project & PO', 'PN Launch Quantities', 'Materials & Time', 'Review & Save'];
      const simulationReady = mfgWizardLaunchApproved();
      const minutesReady = !!state.simMeetingSaved;
      const meetingReady = simulationReady && minutesReady;
      const selectedFgpns = mfgWizard.fgpns || [];

      let body = '';
      if (step === 1) {
        const projectPos = mfgEligiblePos(mfgWizard.project);
        const selectedPo = POS.find(po => po.id === mfgWizard.po);
        const eligibleParts = mfgEligibleOrders(mfgWizard.po);
        body = `<div class="card mfg-create-card">
      <div class="mfg-create-head"><div><h3>Project and Purchase Order</h3></div>${selectedPo ? statusBadge(poLifecycle(selectedPo.id),productionStatusType(poLifecycle(selectedPo.id))) : ''}</div>
      <div class="mfg-create-body">
      <div class="mfg-create-grid">
        <div class="mfg-create-field">
          <label>Project</label>
          <select class="sim-select" onchange="mfgWizardSetProject(this.value)">
            ${writableProjects().map(p => `<option value="${p.name}" ${mfgWizard.project === p.name ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="mfg-create-field">
          <label>Purchase Order</label>
          <select class="sim-select" onchange="mfgWizardSetPo(this.value)">
            ${projectPos.map(po => `<option value="${po.id}" ${mfgWizard.po === po.id ? 'selected' : ''}>${po.id} · ${poLifecycle(po.id)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="mfg-context-strip">
        <div class="mfg-context-item"><span>Project</span><strong>${selectedPo?.project || '—'}</strong></div>
        <div class="mfg-context-item"><span>Customer</span><strong>${selectedPo?.customer || '—'}</strong></div>
        <div class="mfg-context-item"><span>Eligible PNs</span><strong>${eligibleParts.length}</strong></div>
        <div class="mfg-context-item"><span>Required delivery</span><strong>${selectedPo?.delivery || 'Not set'}</strong></div>
      </div>
      </div>
      <div class="mfg-create-actions"><div></div><div><button class="btn primary" onclick="mfgWizardContinueFromContext()">Continue</button></div></div>
    </div>`;
      } else if (step === 2) {
        const eligibleParts = mfgEligibleOrders(mfgWizard.po);
        const totalLaunchQty = selectedFgpns.reduce((sum,fgpn) => sum + Number(mfgWizard.fgpnQtys[fgpn] || 0),0);
        const allPartsSelected = eligibleParts.length > 0 && eligibleParts.every(order => selectedFgpns.includes(order.fgpn));
        body = `<div class="card mfg-create-card">
      <div class="mfg-create-head"><div><h3>PN Launch Quantities</h3><span class="mfg-create-head-context mono">${mfgWizard.po}</span></div>${statusBadge(poLifecycle(mfgWizard.po),productionStatusType(poLifecycle(mfgWizard.po)))}</div>
      <div class="mfg-create-body">
        <div class="mfg-scope-toolbar"><div class="mfg-selection-count"><strong>${eligibleParts.length}</strong><span>Available PNs</span></div><label class="mfg-select-all"><input type="checkbox" ${allPartsSelected ? 'checked' : ''} onchange="mfgWizardSelectAllFgpns(this.checked)"> Select all</label></div>
        <div class="mfg-pn-grid">${eligibleParts.map(order => {
          const selected = selectedFgpns.includes(order.fgpn);
          const pnKey = mfgBomKeyForFgpn(order.fgpn,mfgWizard.po);
          const pn = pnsForPo(mfgWizard.po).find(item => item.pn === pnKey);
          const summary = mfgPnLaunchSummary(mfgWizard.po,order.fgpn);
          return `<div class="mfg-pn-option ${selected ? 'selected' : ''}"><input type="checkbox" aria-label="Select ${order.fgpn}" ${selected ? 'checked' : ''} onchange="mfgWizardToggleFgpn('${order.fgpn}',this.checked)"><div class="mfg-pn-main"><strong>${order.fgpn}</strong><span>${pn?.desc || order.desc || 'Finished good'} · Due ${order.due || 'not set'}</span></div><div class="mfg-pn-launch"><div class="mfg-pn-launch-meta"><div><span>PO Quantity</span><strong>${summary.ordered.toLocaleString()}</strong></div><div><span>In Manufacturing</span><strong>${summary.launched.toLocaleString()}</strong></div><div><span>Pending Transfer</span><strong>${summary.reserved.toLocaleString()}</strong></div><div><span>Available</span><strong>${summary.remaining.toLocaleString()}</strong></div></div><div class="mfg-pn-launch-input"><label>This Launch</label><input class="mfg-inline-input qty" type="number" min="1" max="${summary.remaining}" placeholder="0" value="${selected && Number(mfgWizard.fgpnQtys[order.fgpn]) > 0 ? mfgWizard.fgpnQtys[order.fgpn] : ''}" ${selected ? '' : 'disabled'} onchange="mfgWizardSetFgpnQty('${order.fgpn}',this.value)"></div></div></div>`;
        }).join('')}</div>
      </div>
      <div class="mfg-create-actions"><div><button class="btn" onclick="mfgWizardGoStep(1)">Back</button></div><div><span class="mfg-action-total">${selectedFgpns.length} PN${selectedFgpns.length === 1 ? '' : 's'} · ${totalLaunchQty.toLocaleString()} units</span><button class="btn primary" onclick="mfgWizardContinueFromParts()">Continue to Materials</button></div></div>
    </div>`;
      } else if (step === 3) {
        const rows = mfgMaterialsForSelection(mfgWizard.po,selectedFgpns);
        const selectedCodes = Object.keys(mfgWizard.selectedMaterials || {}).filter(code => mfgWizard.selectedMaterials[code]);
        const allSelected = rows.length > 0 && rows.every(row => mfgWizard.selectedMaterials[row.code]);
        body = `<div class="card mfg-create-card">
      <div class="mfg-create-head"><div><h3>Materials and Delivery Times</h3><span class="mfg-create-head-context">${selectedFgpns.length} selected PN${selectedFgpns.length === 1 ? '' : 's'}</span></div><span class="badge info">BOM</span></div>
      <div class="mfg-create-body">
        <div class="mfg-material-toolbar"><label class="mfg-select-all"><input type="checkbox" ${allSelected ? 'checked' : ''} onchange="mfgWizardSelectAllMaterials(this.checked)"> Select all materials</label><span class="mfg-action-total">${selectedCodes.length} selected</span></div>
        <div class="table-scroll"><table class="mfg-material-table"><thead><tr><th>Select</th><th>Material PN</th><th>Description</th><th>Linked PNs</th><th>Available</th><th>Required</th><th>Delivery Qty</th><th>Unit</th><th>Required Time</th></tr></thead><tbody>${rows.map(row => {
          const selected = !!mfgWizard.selectedMaterials[row.code];
          return `<tr class="${selected ? 'selected' : ''}"><td><input type="checkbox" ${selected ? 'checked' : ''} onchange="mfgWizardToggleMaterial('${row.code}',this.checked)"></td><td class="mono" style="font-weight:600;">${row.code}</td><td>${row.desc}</td><td><div class="mfg-pn-tags">${row.fgpns.map(fgpn => `<span class="mfg-pn-tag">${fgpn}${row.fgpnRequirements?.[fgpn] ? ` · ${Number(row.fgpnRequirements[fgpn]).toLocaleString()}` : ''}</span>`).join('')}</div></td><td class="mono">${Number(row.warehouse || 0).toLocaleString()}</td><td class="mono">${Number(row.required || 0).toLocaleString()}</td><td><input class="mfg-inline-input qty" type="number" min="1" max="${row.warehouse}" value="${selected ? (mfgWizard.qtys[row.code] || '') : ''}" ${selected ? '' : 'disabled'} onchange="mfgWizardSetQty('${row.code}',this.value)"></td><td class="mono">${row.unit}</td><td><input class="mfg-inline-input time" type="datetime-local" value="${selected ? (mfgWizard.itemTimes[row.code] || mfgDefaultItemTime()) : ''}" ${selected ? '' : 'disabled'} onchange="mfgWizardSetItemTime('${row.code}',this.value)"></td></tr>`;
        }).join('')}</tbody></table></div>
        <div class="mfg-schedule-footer"><div class="mfg-create-field"><label>Warehouse Notes <span style="font-weight:400;text-transform:none;">(optional)</span></label><textarea class="coef-input" placeholder="Handling or preparation notes" oninput="mfgWizard.notes=this.value">${poEsc(mfgWizard.notes)}</textarea></div></div>
      </div>
      <div class="mfg-create-actions"><div><button class="btn" onclick="mfgWizardGoStep(2)">Back</button></div><div><span class="mfg-action-total">${selectedCodes.length} materials</span><button class="btn primary" onclick="mfgWizardContinueFromItems()">Continue to Review</button></div></div>
    </div>`;
      } else if (step === 4) {
        const rows = mfgMaterialsForSelection(mfgWizard.po,selectedFgpns).filter(row => mfgWizard.selectedMaterials[row.code]);
        const launchPlan = selectedFgpns.map(fgpn => ({ fgpn,qty:Number(mfgWizard.fgpnQtys[fgpn] || 0),summary:mfgPnLaunchSummary(mfgWizard.po,fgpn) }));
        const totalLaunchQty = launchPlan.reduce((sum,line) => sum + line.qty,0);
        body = `<div class="card mfg-create-card">
      <div class="mfg-create-head"><div><h3>Review and Save</h3><span class="mfg-create-head-context mono">${mfgWizard.po}</span></div>${statusBadge(meetingReady ? 'Ready' : 'Approval Required',meetingReady ? 'success' : 'warning')}</div>
      <div class="mfg-create-body">
        <div class="mfg-review-summary"><div><span>Project</span><strong>${mfgWizard.project}</strong></div><div><span>Purchase Order</span><strong class="mono">${mfgWizard.po}</strong></div><div><span>Partial Launch Qty</span><strong class="mono">${totalLaunchQty.toLocaleString()} units</strong></div></div>
        <div class="section-title">PN Launch Plan</div><div class="table-scroll" style="margin-bottom:16px;"><table><thead><tr><th>Finished-Good PN</th><th>Ordered</th><th>Previously Launched</th><th>This Launch</th><th>Remaining</th></tr></thead><tbody>${launchPlan.map(line => `<tr><td class="mono" style="font-weight:600;">${line.fgpn}</td><td class="mono">${line.summary.ordered.toLocaleString()}</td><td class="mono">${line.summary.launched.toLocaleString()}</td><td class="mono" style="font-weight:600;color:var(--primary);">${line.qty.toLocaleString()}</td><td class="mono">${Math.max(0,line.summary.remaining-line.qty).toLocaleString()}</td></tr>`).join('')}</tbody></table></div>
        <div class="section-title">Material Transfer</div>
        <div class="table-scroll"><table class="mfg-material-table"><thead><tr><th>Material PN</th><th>Description</th><th>Linked PNs</th><th>Quantity</th><th>Unit</th><th>Required Time</th></tr></thead><tbody>${rows.map(row => `<tr><td class="mono" style="font-weight:600;">${row.code}</td><td>${row.desc}</td><td><div class="mfg-pn-tags">${row.fgpns.map(fgpn => `<span class="mfg-pn-tag">${fgpn}${row.fgpnRequirements?.[fgpn] ? ` · ${Number(row.fgpnRequirements[fgpn]).toLocaleString()}` : ''}</span>`).join('')}</div></td><td class="mono" style="font-weight:600;">${Number(mfgWizard.qtys[row.code] || 0).toLocaleString()}</td><td class="mono">${row.unit}</td><td class="mono">${String(mfgWizard.itemTimes[row.code] || '').replace('T',' ') || '—'}</td></tr>`).join('')}</tbody></table></div>
        <div class="mfg-code-policy"><div class="mfg-code-policy-icon">${icon('history','')}</div><div><strong>Delivery Code</strong><span>Generated after save · Valid 48 hours · Single use</span></div></div>
        <div class="mfg-gate-row"><span class="mfg-gate-pill ${simulationReady ? '' : 'pending'}">${icon(simulationReady ? 'check' : 'history','')} ${simulationReady ? 'Launch simulation approved' : 'Run launch simulation'}</span><span class="mfg-gate-pill ${minutesReady ? '' : 'pending'}">${icon(minutesReady ? 'check' : 'doc','')} ${minutesReady ? 'Meeting minutes saved' : 'Meeting minutes required'}</span></div>
        ${simulationReady ? `<div class="mfg-approval-record">${icon('check','')}<span>Approved ${mfgWizard.approval.approvedAt} · ${mfgWizard.approval.approvedBy}</span></div>` : ''}
        ${!minutesReady ? `<div class="mfg-minutes-panel"><div class="mfg-create-field"><label>Meeting Minutes</label><textarea class="coef-input" placeholder="Enter meeting minutes" oninput="setSimMeetingMinutes(this.value)">${poEsc(state.simMeetingMinutes)}</textarea></div><div class="mfg-minutes-actions"><button class="btn secondary sm" onclick="saveMeetingMinutes()">Save Minutes</button></div></div>` : ''}
      </div>
      <div class="mfg-create-actions"><div><button class="btn" onclick="mfgWizardGoStep(3)">Back</button></div><div><button class="btn secondary" onclick="openMfgLaunchSimulation()">${icon('sim','')} ${simulationReady ? 'Review Approved Simulation' : 'Open Simulation'}</button><button class="btn primary" onclick="mfgWizardSaveInstruction()" ${meetingReady ? '' : 'disabled'}>Save Instruction & Generate Code</button></div></div>
    </div>`;
      }

      return `<div class="mfg-create-shell">
  <div class="stepper">
    ${steps.map((s, i) => `
      <div class="step ${i + 1 < step ? 'done' : i + 1 === step ? 'active' : ''}"><div class="step-circle">${i + 1 < step ? '✓' : i + 1}</div><div class="step-label">${s}</div></div>
      ${i < 3 ? `<div class="step-line ${i + 1 < step ? 'done' : ''}"></div>` : ''}
    `).join('')}
  </div>
  ${body}</div>`;
    }

export function openMfgDelivery(code) {
      const delivery = MFG_DELIVERIES.find(item => item.code === code);
      if (!delivery) return;
      state.openMfgDeliveryId = code;
      state.openContext.project = delivery.project;
      state.openContext.po = delivery.po;
      state.mfgActiveTab = 'Overview';
      navigate('mfg-delivery-workspace');
    }

export function showMfgTab(tab) { state.mfgActiveTab = tab; renderPage(); }

export const MFG_STEPS_ORDER = ['Code Generated', 'Code Used', 'Document Generated', 'Waiting for Signed PDF', 'Signed Document Uploaded', 'Delivered'];

export function pageMfgDeliveryWorkspace() {
      const d = MFG_DELIVERIES.find(x => x.code === state.openMfgDeliveryId) || MFG_DELIVERIES[0];
      const tab = state.mfgActiveTab;
      const stepIdx = MFG_STEPS_ORDER.indexOf(d.status);
      const expired = d.expiresAt && isCodeExpired(d.expiresAt);
      const remaining = d.expiresAt ? formatRemainingTime(d.expiresAt) : '—';
      const pnLaunchLines = mfgDeliveryPnQuantities(d);
      const totalPnLaunch = pnLaunchLines.reduce((sum,line) => sum + Number(line.qty || 0),0);
      const generatedMs = d.generatedAt ? new Date(d.generatedAt.replace(' ', 'T')).getTime() : 0;
      const expiresMs = d.expiresAt ? new Date(d.expiresAt.replace(' ', 'T')).getTime() : 0;
      const validityWindow = generatedMs && expiresMs ? Math.max(1,expiresMs-generatedMs) : 1;
      const validityLeft = expiresMs ? Math.max(0,expiresMs-Date.now()) : 0;
      const validityPct = expired || d.used ? 0 : Math.max(0,Math.min(100,Math.round((validityLeft/validityWindow)*100)));
      const codeState = expired ? 'Expired' : d.used ? 'Used · Locked' : 'Active · Single-use';
      const codeStateClass = expired ? 'danger' : d.used ? 'warning' : '';
      const validityClass = expired ? 'danger' : validityPct < 25 ? 'warning' : '';
      const nextActionByStatus = {
        'Code Generated':'Warehouse Team Leader enters the delivery code',
        'Code Used':'Select receiver and generate the delivery document',
        'Document Generated':'Upload the receiver-signed PDF',
        'Waiting for Signed PDF':'Upload the receiver-signed PDF',
        'Signed Document Uploaded':'Launch team validates the signed document',
        'Delivered':'Warehouse transfer completed',
        'Cancelled':'No further action',
      };
      const nextAction = expired ? 'Launch Engineer regenerates the delivery code' : (nextActionByStatus[d.status] || 'Continue the manufacturing delivery workflow');
      let tabContent = '';

      const detailsCard = `<div class="card mfg-delivery-command" style="margin-bottom:16px;">
      <div class="mfg-command-layout">
        <section class="mfg-code-console" aria-label="Delivery code control">
          <div class="mfg-code-console-head"><div class="mfg-code-console-label">${icon('lock','')} Delivery Code</div><span class="mfg-code-state ${codeStateClass}">${codeState}</span></div>
          <div class="mfg-code-value">${d.code}</div>
          <div class="mfg-code-copy">Warehouse access code · valid once for a maximum of 48 hours</div>
          <div class="mfg-validity-block">
            <div class="mfg-validity-row"><div><span>Remaining validity</span><strong>${expired ? 'Expired' : d.used ? 'Code used' : remaining}</strong></div><small>${d.expiresAt ? `Until ${d.expiresAt}` : 'No expiry recorded'}</small></div>
            <div class="mfg-validity-track" aria-label="${validityPct}% code validity remaining"><div class="mfg-validity-fill ${validityClass}" style="width:${validityPct}%;"></div></div>
            ${['engineer','manager'].includes(state.currentRole) ? `<div class="mfg-code-actions"><button class="btn primary" onclick="mfgDeliveryCopyCode('${d.code}')">${icon('copy','')} Copy Code</button><button class="btn" onclick="mfgDeliveryPrintCode('${d.code}')">${icon('print','')} Print</button><button class="btn" onclick="mfgDeliveryRegenerateCode('${d.code}')">${icon('refresh','')} Regenerate</button></div>` : ''}
          </div>
        </section>
        <section class="mfg-command-summary" aria-label="Delivery summary">
          <div class="mfg-command-summary-head"><div><span>Delivery Summary</span><h3>${d.project} Manufacturing Transfer</h3></div>${statusBadge(expired ? 'Code Expired' : d.status,expired ? 'danger' : d.statusType)}</div>
          <div class="mfg-command-primary">
            <div class="mfg-command-field"><span>Project</span><strong>${d.project}</strong></div>
            <div class="mfg-command-field"><span>Purchase Order</span><strong class="mono">${d.po}</strong></div>
          </div>
          <div class="mfg-launch-scope">
            <div class="mfg-launch-scope-head"><span>PN Launch Scope</span><strong>${totalPnLaunch.toLocaleString()} units</strong></div>
            <div class="mfg-launch-scope-lines">${pnLaunchLines.length ? pnLaunchLines.map(line => `<span class="mfg-launch-scope-line">${line.fgpn}<b>${line.qty == null ? '—' : Number(line.qty).toLocaleString()}</b></span>`).join('') : '<span class="hint">No PN launch quantities recorded</span>'}</div>
          </div>
          <div class="mfg-command-handover">
            <div class="mfg-command-field"><span>Manufacturing Receiver</span><strong style="color:${d.receiver ? '#000' : 'var(--warning)'};">${d.receiver || 'Awaiting Warehouse Team Leader'}</strong></div>
            <div class="mfg-command-field"><span>First Required Time</span><strong class="mono">${d.date || '—'} ${d.time || ''}</strong></div>
            <div class="mfg-command-field"><span>Priority</span><strong>${d.priority || 'Normal'}</strong></div>
          </div>
        </section>
      </div>
      <div class="mfg-command-footer">
        <div class="mfg-command-trace"><div class="mfg-command-trace-icon">${icon(d.used ? 'lock' : 'check','')}</div><div><span>Code Usage</span><strong>${d.used ? 'Used once · no longer valid' : 'Unused · ready for Warehouse TL'}</strong></div></div>
        <div class="mfg-command-trace"><div class="mfg-command-trace-icon">${icon('history','')}</div><div><span>Generated</span><strong class="mono">${d.generatedAt || '—'}</strong></div></div>
        <div class="mfg-command-trace"><div class="mfg-command-trace-icon">${icon(expired ? 'alert' : 'history','')}</div><div><span>Expires</span><strong class="mono">${d.expiresAt || '—'}</strong></div></div>
        <div class="mfg-command-trace mfg-command-next"><div class="mfg-command-trace-icon">${icon(expired ? 'refresh' : 'chevRight','')}</div><div><span>Next Action</span><strong>${nextAction}</strong></div></div>
      </div>
    </div>`;

      if (tab === 'Overview') {
        tabContent = `${detailsCard}<div class="card" style="margin-bottom:16px;"><div class="section-title">PN Launch Plan</div><div class="table-scroll"><table><thead><tr><th>Finished-Good PN</th><th>Launch Quantity</th><th>Production Done</th><th>Packaged</th><th>Customer Delivered</th><th>Lifecycle Status</th></tr></thead><tbody>${pnLaunchLines.map(line => { mfgNormalizeLaunchLine(d,line); return `<tr><td class="mono" style="font-weight:750;">${line.fgpn}</td><td class="mono">${Number(line.qty || 0).toLocaleString()}</td><td class="mono">${Number(line.producedQty || 0).toLocaleString()}</td><td class="mono">${Number(line.packagedQty || 0).toLocaleString()}</td><td class="mono">${Number(line.customerDeliveredQty || 0).toLocaleString()}</td><td>${statusBadge(line.status,productionStatusType(line.status))}</td></tr>`; }).join('')}</tbody></table></div></div><div class="card" style="margin-bottom:16px;">
      <div class="section-title">Delivery Progress</div>
      <div class="h-timeline">
        ${MFG_STEPS_ORDER.map((s, i) => `<div class="h-tl-step ${d.status === 'Cancelled' ? '' : (i < stepIdx ? 'done' : i === stepIdx ? 'active' : '')}">
          <div class="h-tl-line"></div>
          <div class="h-tl-dot">${i < stepIdx || (i === stepIdx && d.status === 'Delivered') ? '✓' : i + 1}</div>
          <div class="h-tl-label">${s}</div>
        </div>`).join('')}
      </div>
      ${d.status === 'Cancelled' ? `<div class="readonly-banner" style="margin-top:14px; margin-bottom:0;">${icon('close', '')} This delivery was cancelled and will not proceed.</div>` : ''}
    </div>
    <div class="grid g4" style="margin-bottom:16px;">
      <div class="kpi-card"><div class="kpi-label">Launch Quantity</div><div class="kpi-value">${totalPnLaunch ? totalPnLaunch.toLocaleString() : '—'}</div></div>
      <div class="kpi-card"><div class="kpi-label">Materials</div><div class="kpi-value">${d.materials.length}</div></div>
      <div class="kpi-card"><div class="kpi-label">Signed Document</div><div class="kpi-value" style="font-size:16px; color:${d.docUploaded ? 'var(--success)' : 'var(--warning)'}">${d.docUploaded ? 'Uploaded' : 'Missing'}</div></div>
      <div class="kpi-card"><div class="kpi-label">Notes</div><div style="font-size:12.5px; color:var(--ink-soft); margin-top:6px;">${d.notes || '—'}</div></div>
    </div>`;
      } else if (tab === 'Materials') {
        tabContent = `<div class="card">
      <div class="section-title">Materials Delivered</div>
      <div class="table-scroll"><table class="mfg-material-table"><thead><tr><th>Material PN</th><th>Description</th><th>Type</th><th>Linked PNs · Requirement</th><th>BOM Required</th><th>Available at Creation</th><th>Transfer Qty</th><th>Unit</th><th>Required Time</th></tr></thead>
      <tbody>${d.materials.map(m => `<tr><td class="mono">${m.code}</td><td>${m.desc}</td><td>${m.type || 'Material'}</td><td><div class="mfg-pn-tags">${(m.fgpns || mfgDeliveryFgpns(d)).map(fgpn => `<span class="mfg-pn-tag">${fgpn}${m.fgpnRequirements?.[fgpn] ? ` · ${Number(m.fgpnRequirements[fgpn]).toLocaleString()}` : ''}</span>`).join('')}</div></td><td class="mono">${Number(m.required || 0).toLocaleString()}</td><td class="mono">${Number(m.warehouse || 0).toLocaleString()}</td><td class="mono" style="font-weight:700;">${Number(m.qty || 0).toLocaleString()}</td><td class="mono">${m.unit || 'PCS'}</td><td class="mono">${String(m.requiredTime || `${d.date || ''}T${d.time || ''}`).replace('T',' ') || '—'}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
      } else if (tab === 'Documents') {
        tabContent = `<div class="card">
      <div class="section-title">Generated Delivery Document</div>
      ${d.documentGeneratedAt ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:13px 0 18px;border-bottom:1px solid var(--border);"><div style="display:flex;align-items:center;gap:10px;">${icon('doc','')}<div><strong style="display:block;font-size:13px;">${d.documentFileName || `warehouse-to-manufacturing_${d.code}.pdf`}</strong><span class="hint">Generated ${d.documentGeneratedAt} by ${d.documentGeneratedBy || 'Warehouse Team Leader'} · Receiver: ${d.receiver}</span></div>${statusBadge('Generated PDF','info')}</div>${permBtn('printDeliveryNote','Download Again','download',`mfgRedownloadDeliveryPdf('${d.code}')`)}</div>` : `<div class="empty-state" style="padding:24px;">${icon('doc','')}<div class="e-title">Delivery PDF not generated</div><div class="e-sub">The Warehouse Team Leader selects the receiver and generates the PDF after validating the delivery code.</div></div>`}
      <div class="section-title" style="margin-top:18px;">Signed Reception Document</div>
      ${d.docUploaded ? `<div style="display:flex; align-items:center; gap:10px; padding:10px 0;">${icon('doc', '')} <span style="font-size:13px; font-weight:600;">${d.signedFileName || 'signed-delivery-note.pdf'}</span>${statusBadge('Signed', 'success')}</div>`
            : `<div class="empty-state" style="padding:24px;">${icon('doc', '')}<div class="e-title">No signed document uploaded</div><div class="e-sub">Upload the delivery document after the Manufacturing Receiver has signed it.</div></div>`}
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:14px;">
        ${permBtn('uploadSignedDoc', 'Upload Signed Document', 'upload', "document.getElementById('signedDocInput').click()")}
        ${d.documentGeneratedAt ? permBtn('printDeliveryNote', 'Download Generated PDF', 'download', `mfgRedownloadDeliveryPdf('${d.code}')`) : ''}
      </div>
      <input id="signedDocInput" type="file" accept="application/pdf" style="display:none" onchange="mfgHandleSignedUpload(this)" />
    </div>`;
      } else if (tab === 'History') {
        tabContent = traceabilityWorkspace(auditContextEvents({ mfgCode:d.code }),`${d.code} manufacturing history`,'mfgCompleteHistoryTable');
      }

      return `
  <div class="workspace-header">
    <div>
      <span class="ws-id">${d.code}</span>
      <div class="ws-title">Manufacturing Delivery — ${d.project}</div>
      <div class="ws-meta">
        <div class="ws-meta-item"><span class="l">Project</span><span class="v">${d.project}</span></div>
        <div class="ws-meta-item"><span class="l">Purchase Order</span><span class="v mono">${d.po}</span></div>
        <div class="ws-meta-item"><span class="l">PN Launch Quantities</span><span class="v mono">${mfgDeliveryPnLabel(d)}</span></div>
        <div class="ws-meta-item"><span class="l">Receiver</span><span class="v">${d.receiver || 'Awaiting Warehouse Team Leader'}</span></div>
        <div class="ws-meta-item"><span class="l">Delivery Code</span><span class="v mono">${d.code}</span></div>
        <div class="ws-meta-item"><span class="l">Transfer Status</span>${statusBadge(d.status, d.statusType)}</div>
        <div class="ws-meta-item"><span class="l">Production Status</span>${statusBadge(syncMfgDeliveryLifecycle(d), productionStatusType(d.lifecycleStatus))}</div>
      </div>
    </div>
    <div class="ws-actions-row">
      ${permBtn('printDeliveryNote', 'Download Delivery PDF', 'download', `mfgRedownloadDeliveryPdf('${d.code}')`)}
      ${permBtn('uploadSignedDoc', 'Upload Signed Document', 'upload', "showMfgTab('Documents')")}
      ${d.docUploaded && d.status !== 'Delivered' && d.status !== 'Cancelled' ? permBtn('confirmMfgDelivery', 'Validate Signed Document', 'check', 'mfgConfirmDelivery()', 'primary') : ''}
      ${d.status === 'Pending Approval' ? permBtn('approveMfgDelivery', 'Approve', null, `openModal('Approve Delivery', 'This approves ${d.code} for the warehouse team to prepare and confirm.')`, 'primary') : ''}
    </div>
  </div>
  ${workspaceTabs(['Overview', 'Materials', 'Documents', 'History'], tab, 'showMfgTab')}
  ${tabContent}`;
    }
