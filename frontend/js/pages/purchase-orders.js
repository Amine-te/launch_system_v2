/* ==========================================================================
   purchase-orders.js
   ========================================================================== */

import { openModal } from '../components/modal.js';
import { ROLE_LABEL } from '../components/nav-config.js';
import { navigate } from '../components/nav-render.js';
import { bomImportPanel, canWriteProject, latestBomImportRecord, pnsForPo, poBomPreviewRows, poBomReadiness, posForProject, uniqueValues } from '../components/shared-tables.js';
import { AUDIT_LOGS, BOM_IMPORT_RECORDS, BOM_USAGE, BOM_VERSION_HISTORY, BOM_VERSION_SNAPSHOTS, CUST_DELIVERIES, MATERIALS, MFG_DELIVERIES, PNS, POS, PO_BOM_FILES, PO_STATUS_FLOW, PO_STATUS_HISTORY, PO_STATUS_OWNER, PO_STATUS_TRIGGER, PO_VERSION_HISTORY, PO_VERSION_SNAPSHOTS, PRODUCTION_ORDERS, SIMULATION_HISTORY } from '../data/mock-data.js';
import { PROJECTS } from '../data/projects-store.js';
import { renderAll } from '../main.js';
import { custTable, customerFgpnDetails, printCustomerDeliveryInstruction, resetCustWizardScope } from './customer-delivery.js';
import { mfgDeliveryFgpns, mfgDeliveryPnQuantities, mfgEligibleOrders, mfgRedownloadDeliveryPdf, mfgTable } from './manufacturing-delivery.js';
import { formatDate } from './materials-stock.js';
import { poEsc } from './po-intake.js';
import { poActionIcons, poBomFocusedImportPanel, poFinanceWorkspace, projectExplorer, workspaceTabs } from './projects.js';
import { renderPage } from './router.js';
import { state } from '../state.js';
import { statusBadge } from '../utils/helpers.js';
import { icon } from '../utils/icons.js';
import { can, permBtn } from '../utils/permissions.js';
import { columnMenuPanel, downloadOriginalPoPdf, downloadPoExtractionExcel, emptyStateBlock, filterChips, inlineJsValue, paginationBar, poDocumentDownloadButtons, rowCountLabel, sortRows, sortTh, statsRow, tableExportActions } from '../utils/table-helpers.js';
import { PAGE_SIZE, cutmanImports, mfgWizard, poColumns, poSelected, poSort, stockReceipts, stockTransferLogs, transitMaterials } from '../utils/table-state.js';

export function productionStatusType(status) {
      return ({ 'Unplanned':'neutral', 'In Progress':'info', 'Done':'success', 'Packaged':'warning', 'Delivered':'success' })[status] || 'neutral';
    }

export const FGPN_MASTER_MAP = {
      PN100:'FG-BX5-100', PN101:'FG-BX5-101', PN102:'FG-BX5-102',
      PN103:'FG-BX5-103', PN104:'FG-BX5-104', PN105:'FG-BX5-105', PN106:'FG-BX5-106',
      PN201:'FG-RCV-330', PN202:'FG-RCV-331', PN301:'FG-P208-050',
      PN401:'FG-DS-210', PN402:'FG-DS-211', PN403:'FG-DS-212', PN404:'FG-DS-213',
    };

export function poFinishedGoods(poId) {
      return pnsForPo(poId).map(part => ({ ...part, fgpn:FGPN_MASTER_MAP[part.pn] || part.pn, ordered:Number(part.qty || 0) }));
    }

export function mfgNormalizeLaunchLine(delivery,line) {
      const fallback = delivery.lifecycleStatus || (delivery.docUploaded ? 'In Progress' : 'Unplanned');
      line.status = PO_STATUS_FLOW.includes(line.status) ? line.status : fallback;
      line.qty = Number(line.qty || 0);
      line.producedQty = Number(line.producedQty ?? (PO_STATUS_FLOW.indexOf(line.status) >= 2 ? line.qty : 0));
      line.packagedQty = Number(line.packagedQty ?? (PO_STATUS_FLOW.indexOf(line.status) >= 3 ? line.qty : 0));
      line.customerDeliveredQty = Number(line.customerDeliveredQty || 0);
      return line;
    }

export function mfgLaunchLines(poId = '') {
      return MFG_DELIVERIES.filter(delivery => delivery.status !== 'Cancelled' && (!poId || delivery.po === poId)).flatMap(delivery =>
        mfgDeliveryPnQuantities(delivery).map(line => ({ delivery, line:mfgNormalizeLaunchLine(delivery,line) })).filter(item => item.line.qty > 0)
      );
    }

export function syncMfgDeliveryLifecycle(delivery) {
      const lines = mfgDeliveryPnQuantities(delivery).map(line => mfgNormalizeLaunchLine(delivery,line));
      delivery.lifecycleStatus = lines.length ? [...lines].sort((a,b) => PO_STATUS_FLOW.indexOf(a.status)-PO_STATUS_FLOW.indexOf(b.status))[0].status : 'Unplanned';
      return delivery.lifecycleStatus;
    }

export function manufacturingStageQty(poId,fgpn,stage) {
      const stageIndex = PO_STATUS_FLOW.indexOf(stage);
      return mfgLaunchLines(poId).filter(item => item.line.fgpn === fgpn && PO_STATUS_FLOW.indexOf(item.line.status) >= stageIndex).reduce((sum,item) => sum + item.line.qty,0);
    }

export function customerDeliveryItems(delivery) {
      if (Array.isArray(delivery?.items) && delivery.items.length) return delivery.items;
      return delivery?.fgpn ? [{ fgpn:delivery.fgpn, qty:Number(delivery.qty || 0), description:customerFgpnDetails(delivery.po,delivery.fgpn).desc, unitPrice:Number(delivery.unitValue || 0), launchAllocations:[] }] : [];
    }

export function customerShipmentItems(shipment) {
      if (Array.isArray(shipment?.items) && shipment.items.length) return shipment.items;
      return shipment?.fgpn ? [{ fgpn:shipment.fgpn, qty:Number(shipment.qty || 0), description:shipment.description || '', value:Number(shipment.value || 0), launchAllocations:[] }] : [];
    }

export function customerAllocatedQty(poId,fgpn) {
      return CUST_DELIVERIES.filter(delivery => delivery.po === poId && delivery.status !== 'Cancelled').flatMap(customerDeliveryItems).filter(item => item.fgpn === fgpn).reduce((sum,item) => sum + Number(item.qty || 0),0);
    }

export function customerConfirmedQty(poId,fgpn) {
      return CUST_DELIVERIES.filter(delivery => delivery.po === poId).flatMap(delivery => delivery.shipments || []).filter(shipment => !!shipment.confirmation).flatMap(customerShipmentItems).filter(item => item.fgpn === fgpn).reduce((sum,item) => sum + Number(item.qty || 0),0);
    }

export function packagedQuantitySummary(poId,fgpn) {
      const part = poFinishedGoods(poId).find(item => item.fgpn === fgpn);
      const ordered = Number(part?.ordered || 0);
      const packaged = Math.min(ordered,manufacturingStageQty(poId,fgpn,'Packaged'));
      const allocated = Math.min(packaged,customerAllocatedQty(poId,fgpn));
      const delivered = Math.min(ordered,customerConfirmedQty(poId,fgpn));
      return { ordered,packaged,allocated,delivered,available:Math.max(0,packaged-allocated),remaining:Math.max(0,ordered-delivered) };
    }

export function poLifecycle(poId) {
      const parts = poFinishedGoods(poId).filter(part => part.ordered > 0);
      if (!parts.length) return 'Unplanned';
      const complete = stage => parts.every(part => manufacturingStageQty(poId,part.fgpn,stage) >= part.ordered);
      if (parts.every(part => customerConfirmedQty(poId,part.fgpn) >= part.ordered)) return 'Delivered';
      if (complete('Packaged')) return 'Packaged';
      if (complete('Done')) return 'Done';
      if (mfgLaunchLines(poId).length > 0) return 'In Progress';
      return 'Unplanned';
    }

export function productionActor() {
      return ({ prod_coord:'Y. Mansouri', engineer:'A. Rahal', manager:'S. Ait Oubou', wh_lead:'M. El Idrissi' })[state.currentRole] || ROLE_LABEL[state.currentRole];
    }

export function poWorkOrders(poId) { return PRODUCTION_ORDERS.filter(order => order.po === poId); }

export function poQuantitySummary(poId) {
      const parts = poFinishedGoods(poId);
      const ordered = parts.reduce((sum,part) => sum + part.ordered,0);
      const produced = Math.min(ordered,parts.reduce((sum,part) => sum + Math.min(part.ordered,manufacturingStageQty(poId,part.fgpn,'Done')),0));
      const packaged = Math.min(ordered,parts.reduce((sum,part) => sum + Math.min(part.ordered,manufacturingStageQty(poId,part.fgpn,'Packaged')),0));
      const delivered = Math.min(ordered,parts.reduce((sum,part) => sum + Math.min(part.ordered,customerConfirmedQty(poId,part.fgpn)),0));
      return { ordered, produced, packaged, delivered, remaining:Math.max(0,ordered-delivered) };
    }

export function fgpnQuantitySummary(poId, fgpn) {
      const summary = packagedQuantitySummary(poId,fgpn);
      return { ordered:summary.ordered, delivered:summary.delivered, packaged:summary.packaged, allocated:summary.allocated, available:summary.available, remaining:summary.remaining };
    }

export function customerEligibleOrders(poId) {
      return poFinishedGoods(poId).filter(part => packagedQuantitySummary(poId,part.fgpn).available > 0).map(part => ({ id:`PKG-${part.fgpn}`, po:poId, project:part.project, fgpn:part.fgpn, qty:part.ordered, status:'Packaged', desc:part.desc }));
    }

export function poStatusEvents(poId) { return PO_STATUS_HISTORY.filter(event => event.po === poId).sort((a,b) => b.date.localeCompare(a.date)); }

export function recordPoLifecycleChange(poId, from, to, user, reason, evidence) {
      if (!to || from === to) return;
      const po = POS.find(item => item.id === poId);
      const event = { id:`PSH-${String(PO_STATUS_HISTORY.length + 15).padStart(4,'0')}`, po:poId, from:from || null, to, date:new Date().toISOString().slice(0,16).replace('T',' '), user:user || productionActor(), reason, evidence:evidence || 'System event' };
      PO_STATUS_HISTORY.unshift(event);
      AUDIT_LOGS.unshift({ id:`AUD-${10300 + AUDIT_LOGS.length}`, date:event.date, user:event.user, module:'Purchase Order Status', action:from ? `${from} → ${to}` : `${to} created`, entity:poId, project:po?.project || '', po:poId, details:`${reason}. Evidence: ${event.evidence}.` });
    }

export function ensureProductionOrdersForPo(poId) {
      let orders = poWorkOrders(poId);
      if (orders.length) return orders;
      const po = POS.find(item => item.id === poId);
      const pns = pnsForPo(poId);
      pns.forEach((pn,index) => PRODUCTION_ORDERS.push({ id:`WO-${1100 + PRODUCTION_ORDERS.length + index}`, po:poId, project:po?.project || pn.project, customer:po?.customer || '', fgpn:pn.pn, qty:Number(pn.qty || 0), produced:0, packaged:0, status:'Unplanned', due:po?.delivery || 'Not set', line:'Not assigned', updatedBy:productionActor(), updatedAt:'Just now', priority:false }));
      orders = poWorkOrders(poId);
      return orders;
    }

export function poLifecycleFlowHtml(poId) {
      const current = poLifecycle(poId);
      const currentIndex = PO_STATUS_FLOW.indexOf(current);
      return `<div class="po-lifecycle-strip">${PO_STATUS_FLOW.map((status,index) => `<div class="po-life-node ${index < currentIndex ? 'complete' : index === currentIndex ? 'current' : ''}"><div class="po-life-node-name">${index < currentIndex ? '✓ ' : ''}${status}</div><div class="po-life-node-owner">${PO_STATUS_OWNER[status]}</div><div class="po-life-node-trigger">${PO_STATUS_TRIGGER[status]}</div></div>`).join('')}</div>`;
    }

export function materialsForPo(poId) {
      const codes = new Set();
      pnsForPo(poId).forEach(pn => Object.keys(BOM_USAGE[pn.pn] || {}).forEach(code => codes.add(code)));
      const rows = MATERIALS.filter(material => codes.has(material.code));
      return rows.length ? rows : MATERIALS.slice(0,4);
    }

export function projectSelectedPo(project) {
      const rows = posForProject(project.name);
      const selected = rows.find(po => po.id === state.projectOpsSelectedPo) || rows[0] || null;
      if (selected) state.projectOpsSelectedPo = selected.id;
      return selected;
    }

export function setProjectOpsPo(poId) { state.projectOpsSelectedPo = poId; state.poRollback = { open:false, po:'', reason:'' }; renderPage(); }

export function startProjectMfgDelivery(poId, fgpn = '') {
      const po = POS.find(item => item.id === poId);
      const project = PROJECTS.find(item => item.name === po?.project);
      if (!po || !project || !canWriteProject(project)) return openModal('Action not permitted','You can create manufacturing deliveries only for an assigned project.');
      if (!['Unplanned','In Progress'].includes(poLifecycle(poId))) return openModal('Manufacturing transfer closed',`${poId} is ${poLifecycle(poId)}. Manufacturing deliveries are available while the PO is Unplanned or In Progress.`);
      const eligible = mfgEligibleOrders(poId);
      const selectedFgpn = eligible.find(order => order.fgpn === fgpn)?.fgpn || eligible[0]?.fgpn || '';
      mfgWizard.project = po.project; mfgWizard.po = po.id; mfgWizard.fgpn = selectedFgpn; mfgWizard.fgpns = selectedFgpn ? [selectedFgpn] : []; mfgWizard.fgpnQtys = selectedFgpn ? { [selectedFgpn]:0 } : {}; mfgWizard.approval = null; state.mfgSimulationContext.active = false; state.mfgLaunchSimulationResult = null; state.mfgWizardStep = 1; mfgWizard.selectedMaterials = {}; mfgWizard.qtys = {}; mfgWizard.itemTimes = {}; mfgWizard.code = ''; mfgWizard.receiver = '';
      navigate('mfg-delivery-create');
    }

export function startProjectCustomerDelivery(poId, fgpn = '', source = 'project') {
      const po = POS.find(item => item.id === poId);
      const project = PROJECTS.find(item => item.name === po?.project);
      if (!po || !project || !canWriteProject(project)) return openModal('Action not permitted','You can create customer deliveries only for an assigned project.');
      const eligible = customerEligibleOrders(poId);
      const order = eligible.find(item => item.fgpn === fgpn) || eligible[0];
      if (!order) return openModal('No packaged part is ready',`${poId} has no packaged Finished Good Part Number with a remaining quantity. Current PO status: ${poLifecycle(poId)}.`);
      state.custWizard = { project:po.project, po:po.id, fgpn:'', fgpns:[], fgpnQtys:{}, method:'Truck', tracking:'', deliveryDate:'', address:`${po.customer} Receiving Center`, source };
      resetCustWizardScope(po.id,order.fgpn);
      state.custWizardStep = 1;
      navigate('cust-delivery-create');
    }

export function openPoRollback(poId) {
      const po = POS.find(item => item.id === poId);
      const project = PROJECTS.find(item => item.name === po?.project);
      if (state.currentRole !== 'engineer' || !project || !canWriteProject(project)) return openModal('Rollback not permitted','Only the assigned Launch Engineer can move a PO backward.');
      if (poLifecycle(poId) === 'Unplanned') return openModal('No earlier status','Unplanned is the first PO status.');
      state.poRollback = { open:true, po:poId, reason:'' }; renderPage();
    }

export function confirmPoRollback(poId) {
      const reason = String(state.poRollback.reason || '').trim();
      if (reason.length < 10) return openModal('Written reason required','Enter a clear rollback reason of at least 10 characters. It will be stored in immutable status history.');
      const current = poLifecycle(poId);
      const index = PO_STATUS_FLOW.indexOf(current);
      if (index <= 0) return;
      const previous = PO_STATUS_FLOW[index-1];
      mfgLaunchLines(poId).filter(item => item.line.status === current).forEach(({delivery,line}) => {
        line.status=previous;
        if (previous === 'In Progress') { line.producedQty=0; line.packagedQty=0; }
        if (previous === 'Done') line.packagedQty=0;
        if (previous === 'Packaged') line.customerDeliveredQty=0;
        syncMfgDeliveryLifecycle(delivery);
      });
      recordPoLifecycleChange(poId,current,previous,productionActor(),`Backward transition: ${reason}`,'Mandatory engineer reason');
      state.poRollback = { open:false, po:'', reason:'' }; renderAll();
      openModal('PO status rolled back',`${poId} moved from ${current} to ${previous}. The written reason is stored in status history.`);
    }

export function poNextActionCopy(status) {
      return {
        'Unplanned':['Create manufacturing launch','The first saved manufacturing launch moves the PO to In Progress, including a partial launch for one PN quantity.'],
        'In Progress':['Complete production','The Production & Packing Coordinator confirms each production quantity. The PO becomes Done only when every active work order is complete.'],
        'Done':['Confirm packaging','The Production & Packing Coordinator records packaged quantities and moves the PO to Packaged.'],
        'Packaged':['Deliver and confirm','Launch Engineer creates customer shipments. Delivered requires zero remaining quantity and customer evidence for every shipment.'],
        'Delivered':['Lifecycle complete','Customer delivery is fully confirmed. Status history and evidence remain available for audit.'],
      }[status];
    }

export function projectPoLifecycleCenter(project) {
      const projectPos = posForProject(project.name);
      if (!projectPos.length) return '';
      const selected = projectSelectedPo(project);
      const status = poLifecycle(selected.id);
      const totals = poQuantitySummary(selected.id);
      const next = poNextActionCopy(status);
      const events = poStatusEvents(selected.id).slice(0,4);
      return `<div class="card project-lifecycle-center">
        <div class="project-lifecycle-head"><div><h3>PO lifecycle & delivery control</h3><p>Five enforced statuses connected to real operational evidence. Select a PO to monitor it or start the next permitted delivery action.</p></div>${statusBadge(`${selected.id} · ${status}`,productionStatusType(status))}</div>
        <div class="project-po-pills">${projectPos.map(po => `<button class="project-po-pill ${po.id === selected.id ? 'active' : ''}" onclick="setProjectOpsPo('${po.id}')"><span class="mono">${po.id}</span>${statusBadge(poLifecycle(po.id),productionStatusType(poLifecycle(po.id)))}</button>`).join('')}</div>
        ${poLifecycleFlowHtml(selected.id)}
        <div class="project-ops-grid">
          <div class="project-ops-panel"><div class="project-ops-panel-title"><div><strong>Quantity control</strong><span>Partial manufacturing launches and customer deliveries remain visible until zero remaining.</span></div></div><div class="po-quantity-grid"><div class="po-quantity-tile"><span>Ordered</span><strong>${totals.ordered.toLocaleString()}</strong></div><div class="po-quantity-tile"><span>Production Done</span><strong>${totals.produced.toLocaleString()}</strong></div><div class="po-quantity-tile"><span>Packaged</span><strong>${totals.packaged.toLocaleString()}</strong></div><div class="po-quantity-tile"><span>Remaining delivery</span><strong style="color:${totals.remaining ? 'var(--warning)' : 'var(--success)'}">${totals.remaining.toLocaleString()}</strong></div></div><div class="po-next-action" style="margin-top:10px;">${icon('Activity','')}<div><strong>${next[0]}</strong><span>${next[1]}</span></div></div><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px;">${mfgEligibleOrders(selected.id).length && canWriteProject(project) ? permBtn('createMfgDelivery','Create Manufacturing Delivery','truck',`startProjectMfgDelivery('${selected.id}')`,'primary') : ''}${customerEligibleOrders(selected.id).length && canWriteProject(project) ? permBtn('createCustDelivery','Create Customer Delivery','truck',`startProjectCustomerDelivery('${selected.id}')`,'primary') : ''}<button class="btn sm" onclick="showProjectTab('Manufacturing Deliveries')">Manufacturing records</button><button class="btn sm" onclick="showProjectTab('Customer Deliveries')">Customer records</button>${state.currentRole === 'engineer' && status !== 'Unplanned' && canWriteProject(project) ? `<button class="btn sm" onclick="openPoRollback('${selected.id}')">Rollback with reason</button>` : ''}</div>${state.poRollback.open && state.poRollback.po === selected.id ? `<div class="rollback-panel"><strong>Backward transition: ${status} → ${PO_STATUS_FLOW[PO_STATUS_FLOW.indexOf(status)-1]}</strong><textarea placeholder="Mandatory written reason…" oninput="poRollback.reason=this.value">${state.poRollback.reason}</textarea><div style="display:flex;justify-content:flex-end;gap:7px;"><button class="btn sm" onclick="poRollback={open:false,po:'',reason:''};renderPage()">Cancel</button><button class="btn sm primary" onclick="confirmPoRollback('${selected.id}')">Confirm rollback</button></div></div>` : ''}</div>
          <div class="project-ops-panel"><div class="project-ops-panel-title"><div><strong>Status history</strong><span>Date, user, reason and evidence are retained.</span></div><button class="btn sm" onclick="openPo('${selected.id}','History')">Full history</button></div><div class="po-history-list">${events.length ? events.map(event => `<div class="po-history-row"><span class="po-history-dot"></span><div><strong>${event.from ? `${event.from} → ` : ''}${event.to}</strong><span>${event.date} · ${event.user}<br>${event.reason} · ${event.evidence}</span></div></div>`).join('') : '<span class="hint">No status events recorded yet.</span>'}</div></div>
        </div>
      </div>`;
    }

export function poFullAuditEvents(poId) {
      const po = POS.find(item => item.id === poId);
      const events = [];
      const add = event => events.push({ date:event.date || 'Not recorded', module:event.module || 'Purchase Order', action:event.action || 'Activity recorded', actor:event.actor || 'System', role:event.role || 'System record', entity:event.entity || poId, details:event.details || '—', evidence:event.evidence || '—', result:event.result || 'Recorded' });

      poStatusEvents(poId).forEach(event => add({ date:event.date, module:'PO Lifecycle', action:event.from ? `${event.from} → ${event.to}` : `${event.to} created`, actor:event.user, role:PO_STATUS_OWNER[event.to], entity:poId, details:event.reason, evidence:event.evidence, result:event.to }));
      AUDIT_LOGS.filter(log => log.po === poId && !(log.module === 'Purchase Order Status' && (String(log.action).includes('→') || String(log.action).endsWith('created')))).forEach(log => add({ date:log.date, module:log.module, action:log.action, actor:log.user, role:'Application user', entity:log.entity, details:log.diff ? `${log.details} Changed ${log.diff.field}: ${log.diff.old} → ${log.diff.new}.` : log.details, evidence:log.evidence || log.entity, result:'Audited' }));

      const versions = poId === 'PO-00045' ? PO_VERSION_HISTORY : [{ version:po?.version || 'v1', current:true, date:po?.date || 'Not recorded', uploadedBy:poStatusEvents(poId).slice(-1)[0]?.user || 'System', comment:'Initial validated PO version stored', status:'Current' }];
      versions.forEach(version => add({ date:version.date, module:'PO Version', action:version.comment === 'Initial upload' || version.version === 'v1' ? 'Original PO uploaded' : 'PO version uploaded', actor:version.uploadedBy, role:'Launch user', entity:`${poId} · ${version.version}`, details:`${version.comment}. Version status: ${version.status}.`, evidence:`${poId}_${version.version}.pdf`, result:version.current ? 'Current' : 'Archived' }));

      PO_BOM_FILES.filter(file => file.po === poId).forEach(file => add({ date:file.uploadedAt, module:'BOM', action:'PO BOM uploaded and validated', actor:file.uploadedBy, role:'Launch user', entity:`${poId} BOM ${file.version}`, details:`${file.fgpnCount} finished-good part numbers and ${file.materialCount} material rows validated.`, evidence:file.file, result:file.status }));
      BOM_IMPORT_RECORDS.filter(record => record.level === 'po' && record.target === poId).forEach(record => add({ date:record.importedAt, module:'BOM Extraction', action:'Excel fields extracted and approved', actor:record.importedBy, role:'Launch user', entity:record.id, details:`${record.rows.length} rows, ${record.fgpnCount} FGPNs and ${record.materialCount} materials approved field by field.`, evidence:record.file, result:record.status }));
      SIMULATION_HISTORY.filter(sim => sim.pos.includes(poId)).forEach(sim => add({ date:sim.date, module:'Simulation', action:'Launch simulation executed', actor:sim.executedBy, role:'Launch user', entity:sim.id, details:`Result ${sim.result}; maximum quantity ${sim.maxQty}; ${sim.missingCount} missing material${sim.missingCount === 1 ? '' : 's'}; safety coefficient ${sim.safety}.`, evidence:`PO ${poId} · current stock snapshot`, result:sim.result }));

      MFG_DELIVERIES.filter(delivery => delivery.po === poId).forEach(delivery => {
        const deliveryFgpns = delivery.fgpns?.length ? delivery.fgpns : (delivery.fgpn ? [delivery.fgpn] : []);
        const launchQty = mfgDeliveryPnQuantities(delivery).reduce((sum,line) => sum + Number(line.qty || 0),0);
        add({ date:delivery.generatedAt || delivery.date, module:'Manufacturing Delivery', action:'Delivery instruction created', actor:delivery.createdBy || 'Launch Engineer', role:'Launch Engineer', entity:delivery.code, details:`${launchQty ? `${launchQty.toLocaleString()} finished-good units planned; ` : ''}${delivery.materials.length} material line${delivery.materials.length === 1 ? '' : 's'} prepared${deliveryFgpns.length ? ` for ${deliveryFgpns.join(', ')}` : ''}. Receiver: ${delivery.receiver || 'selected later by Warehouse Team Leader'}.${delivery.notes ? ` Comment: ${delivery.notes}` : ''}`, evidence:delivery.code, result:delivery.status });
        if (delivery.docUploaded) add({ date:delivery.signedAt || delivery.date, module:'Manufacturing Reception', action:'Receiver-signed document uploaded', actor:delivery.signedBy || 'Warehouse Team Leader', role:'Warehouse Team Leader', entity:delivery.code, details:`Signed reception stored for ${delivery.receiver || 'manufacturing receiver'}; production start evidence recorded.`, evidence:delivery.signedFileName || `${delivery.code}_signed.pdf`, result:'Accepted' });
        if (delivery.status === 'Delivered') add({ date:delivery.completedAt || delivery.date, module:'Stock', action:'Signed document validated and stock updated', actor:delivery.validatedBy || 'Launch Engineer / Manager', role:'Launch validation', entity:delivery.code, details:`Warehouse stock reduced for ${delivery.materials.length} transferred material line${delivery.materials.length === 1 ? '' : 's'}.`, evidence:delivery.signedFileName || `${delivery.code}_signed.pdf`, result:'Completed' });
      });

      CUST_DELIVERIES.filter(delivery => delivery.po === poId).forEach(delivery => {
        add({ date:delivery.createdAt || delivery.date, module:'Customer Delivery', action:'Customer delivery instruction created', actor:delivery.createdBy || 'Launch Engineer', role:'Launch Engineer', entity:delivery.code, details:`${delivery.qty.toLocaleString()} units of ${delivery.fgpn} planned for ${delivery.customer} by ${delivery.method}.`, evidence:delivery.tracking && delivery.tracking !== '—' ? delivery.tracking : delivery.code, result:delivery.status });
        delivery.shipments.forEach(shipment => {
          if (shipment.status !== 'Planned') add({ date:shipment.date, module:'Customer Shipment', action:'Partial or full shipment recorded', actor:shipment.recordedBy || 'Launch Engineer', role:'Launch Engineer', entity:`${delivery.code} · ${shipment.id}`, details:`${shipment.qty.toLocaleString()} units of ${shipment.fgpn} sent to ${delivery.customer} by ${shipment.method}; level ${shipment.level || 'not specified'}.`, evidence:delivery.tracking && delivery.tracking !== '—' ? delivery.tracking : shipment.id, result:shipment.status });
          if (shipment.confirmation) add({ date:shipment.confirmation.date, module:'Customer Confirmation', action:'Customer receipt confirmed', actor:shipment.confirmation.confirmedBy, role:'Customer / receiving party', entity:`${delivery.code} · ${shipment.id}`, details:`Confirmation method: ${shipment.confirmation.method}. Reference: ${shipment.confirmation.reference}. Recorded in the system by ${shipment.confirmation.recordedBy || 'Launch Engineer'}. ${shipment.confirmation.comments || 'No comments.'}`, evidence:shipment.confirmation.evidence, result:'Confirmed' });
        });
      });

      const unique = new Map();
      events.forEach(event => unique.set(`${event.date}|${event.module}|${event.action}|${event.entity}`,event));
      return [...unique.values()].sort((a,b) => {
        const aTime = Date.parse(String(a.date).replace(' ','T')) || 0;
        const bTime = Date.parse(String(b.date).replace(' ','T')) || 0;
        return bTime - aTime || String(b.date).localeCompare(String(a.date));
      });
    }

export function auditActorRole(actor,module='') {
      const known = {
        'A. Haddad':'Launch Engineer', 'A. Rahal':'Launch Engineer', 'S. Amrani':'Launch Engineer',
        'M. Idrissi':'Launch Manager', 'S. Ait Oubou':'Launch Manager', 'M. El Idrissi':'Warehouse Team Leader',
        'Y. Mansouri':'Production & Packing Coordinator', 'N. El Fassi':'Production & Packing Coordinator',
        'S. Alaoui':'Production & Packing Coordinator', 'H. Vogel (BMW Group)':'Customer Receiver'
      };
      if (known[actor]) return known[actor];
      if (/warehouse|reception|stock/i.test(module)) return 'Warehouse / Launch user';
      if (/customer confirmation/i.test(module)) return 'Customer / receiving party';
      return actor === 'System' ? 'System record' : 'Application user';
    }

export function auditEvidenceArtifacts(event) {
      const artifacts = [];
      const add = (name,type='Evidence',action='evidence',ref='') => {
        const clean = String(name || '').trim();
        if (!clean || clean === '—' || artifacts.some(item => item.name === clean)) return;
        artifacts.push({ name:clean, type, action, ref });
      };
      const evidence = String(event.evidence || '');
      if (/\.(pdf)$/i.test(evidence)) add(evidence,'PDF','evidence');
      else if (/\.(xlsx|xls|csv)$/i.test(evidence)) add(evidence,'Excel','evidence');
      else if (/\.(png|jpe?g)$/i.test(evidence)) add(evidence,'Image','evidence');

      const po = event.po && POS.find(item => item.id === event.po);
      if (po && /original po uploaded|po version uploaded|po uploaded|purchase order/i.test(`${event.action} ${event.module}`)) {
        add(/\.pdf$/i.test(evidence) ? evidence : `${po.id}_${po.version}.pdf`,'Original PDF','po-pdf',po.id);
        add(`${po.id}_extracted_data.xlsx`,'Extracted Excel','po-excel',po.id);
      }
      const mfg = event.mfgCode && MFG_DELIVERIES.find(item => item.code === event.mfgCode);
      if (mfg?.documentGeneratedAt && /document|instruction/i.test(`${event.module} ${event.action}`)) add(mfg.documentFileName || `warehouse-to-manufacturing_${mfg.code}.pdf`,'Generated PDF','mfg-pdf',mfg.code);
      if (mfg?.docUploaded && /signed|reception|stock/i.test(`${event.module} ${event.action} ${event.evidence}`)) add(mfg.signedFileName || `${mfg.code}_signed.pdf`,'Signed PDF','evidence',mfg.code);
      const customer = event.custCode && CUST_DELIVERIES.find(item => item.code === event.custCode);
      if ((customer?.instructionGenerated || customer?.instructionFile) && /instruction|customer document|delivery.*created/i.test(`${event.module} ${event.action}`)) add(customer.instructionFile || `${customer.code}_customer_delivery_instruction.pdf`,'Instruction PDF','cust-pdf',customer.code);
      return artifacts;
    }

export function completeAuditEvents() {
      const raw = [];
      const add = event => raw.push(event);

      PROJECTS.forEach(project => {
        const loggedCreation = AUDIT_LOGS.some(log => /project created/i.test(log.action) && log.project === project.name);
        if (!loggedCreation) add({
          date:`${project.startDate} 09:00`, module:'Project', action:'Project created', actor:'S. Ait Oubou', role:'Launch Manager',
          entity:project.id, project:project.name, details:`${project.name} created for ${project.customer}; site ${project.site}; assigned Launch Engineer ${project.engineer}. ${project.description || ''}`.trim(),
          evidence:'Project master record', result:'Created'
        });
      });

      POS.forEach(po => poFullAuditEvents(po.id).forEach(event => add({ ...event, project:po.project, po:po.id })));

      AUDIT_LOGS.filter(log => !POS.some(po => po.id === log.po)).forEach(log => add({
        date:log.date, module:log.module, action:log.action, actor:log.user, role:auditActorRole(log.user,log.module), entity:log.entity,
        project:log.project, po:log.po, details:log.diff ? `${log.details} ${log.diff.field}: ${log.diff.old} → ${log.diff.new}.` : log.details,
        evidence:log.evidence || 'System audit record', result:'Recorded', diff:log.diff
      }));

      PNS.filter(pn => pn.bom === 'Uploaded').forEach(pn => add({
        date:`${pn.bomUpdated} 10:00`, module:'PN BOM', action:'PN BOM validated', actor:PROJECTS.find(project => project.name === pn.project)?.engineer || 'Launch Engineer',
        role:'Launch Engineer', entity:pn.pn, project:pn.project, po:pn.po, pn:pn.pn,
        details:`${pn.bomFile} validated as the authoritative material structure for ${pn.pn}.`, evidence:pn.bomFile, result:'Validated'
      }));

      BOM_IMPORT_RECORDS.filter(record => record.level !== 'po').forEach(record => {
        const pn = record.level === 'pn' ? PNS.find(item => item.pn === record.target) : null;
        const projectName = record.level === 'project' ? record.target : pn?.project;
        add({ date:record.importedAt, module:`${record.level === 'project' ? 'Project' : 'PN'} BOM Extraction`, action:'Excel fields extracted and approved',
          actor:record.importedBy, role:'Launch user', entity:record.id, project:projectName, po:pn?.po || '', pn:pn?.pn || '',
          details:`${record.rows.length} rows, ${record.fgpnCount} finished-good part numbers and ${record.materialCount} materials approved field by field.`, evidence:record.file, result:record.status });
      });

      MFG_DELIVERIES.forEach(delivery => {
        const pns = mfgDeliveryFgpns(delivery);
        if (delivery.used) add({ date:delivery.usedAt || delivery.generatedAt || delivery.date, module:'Manufacturing Delivery', action:'Single-use delivery code accessed', actor:delivery.accessedBy || 'Warehouse Team Leader', role:'Warehouse Team Leader', entity:delivery.code, project:delivery.project, po:delivery.po, pns, mfgCode:delivery.code, details:`Delivery code used successfully. Receiver selection and document generation were unlocked.`, evidence:'Code access audit', result:'Used' });
        if (delivery.documentGeneratedAt) add({ date:delivery.documentGeneratedAt, module:'Manufacturing Document', action:'Delivery PDF generated', actor:delivery.documentGeneratedBy || 'Warehouse Team Leader', role:'Warehouse Team Leader', entity:delivery.code, project:delivery.project, po:delivery.po, pns, mfgCode:delivery.code, details:`Formal warehouse-to-manufacturing document generated for ${delivery.receiver || 'the selected receiver'}.`, evidence:delivery.documentFileName || `warehouse-to-manufacturing_${delivery.code}.pdf`, result:'Generated' });
        mfgDeliveryPnQuantities(delivery).forEach(line => {
          if (line.productionCompletedAt) add({ date:line.productionCompletedAt, module:'Production', action:'Production quantity completed', actor:line.productionCompletedBy || 'Production & Packing Coordinator', role:'Production & Packing Coordinator', entity:`${delivery.code} · ${line.fgpn}`, project:delivery.project, po:delivery.po, pn:line.fgpn, pns:[line.fgpn], mfgCode:delivery.code, details:`${Number(line.producedQty || line.qty).toLocaleString()} units marked Done.`, evidence:'Coordinator production confirmation', result:'Done' });
          if (line.packagedAt) add({ date:line.packagedAt, module:'Packaging', action:'Quantity packaged', actor:line.packagedBy || 'Production & Packing Coordinator', role:'Production & Packing Coordinator', entity:`${delivery.code} · ${line.fgpn}`, project:delivery.project, po:delivery.po, pn:line.fgpn, pns:[line.fgpn], mfgCode:delivery.code, details:`${Number(line.packagedQty || line.qty).toLocaleString()} units marked Packaged.`, evidence:'Coordinator packaging confirmation', result:'Packaged' });
        });
      });

      CUST_DELIVERIES.forEach(delivery => {
        if (delivery.instructionGenerated || delivery.instructionFile) add({ date:delivery.instructionGeneratedAt || delivery.createdAt || delivery.date, module:'Customer Document', action:'Customer delivery PDF generated', actor:delivery.createdBy || 'Launch Engineer', role:'Launch Engineer', entity:delivery.code, project:delivery.project, po:delivery.po, pns:customerDeliveryItems(delivery).map(item => item.fgpn), custCode:delivery.code, details:`Delivery instruction generated for ${delivery.customer} using ${delivery.method}.`, evidence:delivery.instructionFile || `${delivery.code}_customer_delivery_instruction.pdf`, result:'Generated' });
      });

      stockReceipts.forEach(receipt => add({
        date:receipt.recordedAt || `${receipt.received} 08:30`, module:'Stock Reception', action:'Material reception recorded', actor:receipt.recordedBy || 'Warehouse Personnel', role:'Warehouse Personnel',
        entity:receipt.material, project:'—', po:'—', details:`${Number(receipt.qty || 0).toLocaleString()} units received from ${receipt.supplier}. Destination: ${receipt.destination || 'Warehouse'}.${receipt.reference ? ` Reference: ${receipt.reference}.` : ''}`,
        evidence:receipt.reference || 'Reception register', result:receipt.status
      }));
      transitMaterials.forEach(item => add({
        date:item.createdAt || `${item.arrival} 09:00`, module:'Transit Stock', action:'Inbound material registered', actor:item.createdBy || 'Launch Engineer', role:'Launch user',
        entity:item.code, project:'—', po:'—', details:`${Number(item.qty || 0).toLocaleString()} units from ${item.supplier}; expected ${formatDate(item.arrival)}.${item.notes ? ` Comment: ${item.notes}` : ''}`,
        evidence:item.reference || 'Transit register', result:item.status
      }));
      cutmanImports.forEach(item => add({
        date:item.importedAt || `${item.date} 07:45`, module:'CutMan', action:'CutMan file imported', actor:item.importedBy || 'Warehouse Personnel', role:'Warehouse Personnel',
        entity:item.file, project:'—', po:'—', details:`${item.records} cutting records imported and WIP balances reconciled.`, evidence:item.file, result:item.status
      }));
      stockTransferLogs.forEach(item => add({
        date:String(item.date).includes(' ') ? item.date : `${item.date} 10:15`, module:'WIP Transfer', action:'Material quantity transferred', actor:item.by, role:'Warehouse Personnel',
        entity:item.code, project:'—', po:'—', details:`${Number(item.qty || 0).toLocaleString()} units moved from ${item.from} to ${item.to}.`, evidence:'Stock movement register', result:'Completed'
      }));

      const enriched = raw.map(event => {
        const text = `${event.entity || ''} ${event.details || ''} ${event.evidence || ''}`;
        const mfg = event.mfgCode ? MFG_DELIVERIES.find(item => item.code === event.mfgCode) : MFG_DELIVERIES.find(item => text.includes(item.code));
        const cust = event.custCode ? CUST_DELIVERIES.find(item => item.code === event.custCode) : CUST_DELIVERIES.find(item => text.includes(item.code));
        const poId = event.po && event.po !== '—' ? event.po : (mfg?.po || cust?.po || '');
        const po = POS.find(item => item.id === poId);
        const project = event.project && event.project !== '—' ? event.project : (po?.project || mfg?.project || cust?.project || '—');
        const inferredPns = event.pns?.length ? event.pns : event.pn ? [event.pn] : [
          ...PNS.filter(item => item.po === poId && text.includes(item.pn)).map(item => item.pn),
          ...(mfg ? mfgDeliveryFgpns(mfg) : []), ...(cust ? customerDeliveryItems(cust).map(item => item.fgpn) : [])
        ];
        const normalized = { ...event, user:event.actor || event.user || 'System', actor:event.actor || event.user || 'System', role:event.role || auditActorRole(event.actor || event.user,event.module), project, po:poId || '—', pn:event.pn || inferredPns[0] || '', pns:[...new Set(inferredPns.filter(Boolean))], mfgCode:mfg?.code || event.mfgCode || '', custCode:cust?.code || event.custCode || '' };
        normalized.artifacts = auditEvidenceArtifacts(normalized);
        return normalized;
      });

      const unique = new Map();
      enriched.forEach(event => unique.set(`${event.date}|${event.module}|${event.action}|${event.entity}`,event));
      return [...unique.values()].sort((a,b) => (Date.parse(String(b.date).replace(' ','T')) || 0) - (Date.parse(String(a.date).replace(' ','T')) || 0)).map((event,index) => ({ ...event, id:event.id || `AUD-FULL-${String(index + 1).padStart(5,'0')}` }));
    }

export function auditContextEvents(context={}) {
      return completeAuditEvents().filter(event => {
        if (context.project && event.project !== context.project) return false;
        if (context.po && event.po !== context.po) return false;
        if (context.pn) {
          const traceKey = String(context.pn).match(/(\d+)$/)?.[1] || String(context.pn);
          const pnMatch = event.pns.some(value => value === context.pn || (String(value).match(/(\d+)$/)?.[1] || String(value)) === traceKey);
          if (!pnMatch && event.pn !== context.pn && event.entity !== context.pn) return false;
        }
        if (context.mfgCode && event.mfgCode !== context.mfgCode) return false;
        if (context.custCode && event.custCode !== context.custCode) return false;
        return true;
      });
    }

export function openAuditEvidence(eventId,index=0) {
      const event = completeAuditEvents().find(item => item.id === eventId);
      const artifact = event?.artifacts?.[index];
      if (!event || !artifact) return;
      if (artifact.action === 'po-pdf') return downloadOriginalPoPdf(artifact.ref || event.po);
      if (artifact.action === 'po-excel') return downloadPoExtractionExcel(artifact.ref || event.po);
      if (artifact.action === 'mfg-pdf') return mfgRedownloadDeliveryPdf(artifact.ref || event.mfgCode);
      if (artifact.action === 'cust-pdf') return printCustomerDeliveryInstruction(artifact.ref || event.custCode);
      openModal(artifact.type,`${artifact.name} is retained with audit event ${event.id}. In production this action opens the immutable stored file.`);
    }

export function auditArtifactButtons(event) {
      if (!event.artifacts?.length) return `<span class="audit-no-proof">No file attached</span>`;
      return `<div class="audit-proof-list">${event.artifacts.map((artifact,index) => `<button class="audit-proof" onclick="stop(event);openAuditEvidence('${event.id}',${index})">${icon(artifact.type === 'Excel' || artifact.type === 'Extracted Excel' ? 'download' : 'doc','')}<span><strong>${poEsc(artifact.name)}</strong><small>${artifact.type}</small></span></button>`).join('')}</div>`;
    }

export function traceabilityTimeline(events) {
      if (!events.length) return emptyStateBlock('No history recorded','The first action on this record will appear here.',null);
      return `<div class="trace-timeline">${events.map(event => `<article class="trace-event">
        <div class="trace-rail"><span class="trace-dot"></span></div>
        <div class="trace-event-body">
          <div class="trace-event-top"><div><span class="trace-module">${poEsc(event.module)}</span><h4>${poEsc(event.action)}</h4></div><time>${poEsc(event.date)}</time></div>
          <div class="trace-actor"><span class="trace-avatar">${poEsc(String(event.actor).split(/\s+/).map(part => part[0]).join('').slice(0,2).toUpperCase())}</span><div><strong>${poEsc(event.actor)}</strong><span>${poEsc(event.role)}</span></div>${statusBadge(poEsc(event.result || 'Recorded'),['Confirmed','Completed','Delivered','Validated','Generated','Successful','Done','Packaged'].includes(event.result) ? 'success' : event.result === 'Failed' ? 'danger' : 'neutral')}</div>
          <p class="trace-details">${poEsc(event.details)}</p>
          <div class="trace-context"><span>${icon('projects','')}${poEsc(event.project || '—')}</span>${event.po && event.po !== '—' ? `<span>${icon('po','')}${poEsc(event.po)}</span>` : ''}${event.pns?.slice(0,4).map(pn => `<span>${icon('bom','')}${poEsc(pn)}</span>`).join('') || ''}${event.mfgCode ? `<span>${icon('truck','')}${poEsc(event.mfgCode)}</span>` : ''}${event.custCode ? `<span>${icon('truck','')}${poEsc(event.custCode)}</span>` : ''}</div>
          ${auditArtifactButtons(event)}
        </div>
      </article>`).join('')}</div>`;
    }

export function traceabilityWorkspace(events,title,tableId='traceabilityHistoryTable',extraActions='') {
      const actors = new Set(events.map(event => event.actor)).size;
      const proofs = events.reduce((sum,event) => sum + (event.artifacts?.length || 0),0);
      const modules = new Set(events.map(event => event.module)).size;
      return `<section class="trace-shell">
        <div class="trace-header"><div><span class="trace-eyebrow">Traceability</span><h3>${poEsc(title)}</h3></div><div class="trace-header-actions">${extraActions}${events.length ? tableExportActions(tableId,title) : ''}</div></div>
        <div class="trace-metrics"><div><span>Recorded events</span><strong>${events.length}</strong></div><div><span>People involved</span><strong>${actors}</strong></div><div><span>Evidence files</span><strong>${proofs}</strong></div><div><span>Modules covered</span><strong>${modules}</strong></div></div>
        <div class="trace-content">${traceabilityTimeline(events)}</div>
        <table id="${tableId}" class="trace-export-table"><thead><tr><th>Date</th><th>Module</th><th>Action</th><th>Person</th><th>Role</th><th>Project</th><th>PO</th><th>PN</th><th>Details</th><th>Evidence</th></tr></thead><tbody>${events.map(event => `<tr><td>${poEsc(event.date)}</td><td>${poEsc(event.module)}</td><td>${poEsc(event.action)}</td><td>${poEsc(event.actor)}</td><td>${poEsc(event.role)}</td><td>${poEsc(event.project)}</td><td>${poEsc(event.po)}</td><td>${poEsc(event.pns.join(', '))}</td><td>${poEsc(event.details)}</td><td>${poEsc(event.artifacts.map(item => item.name).join(', '))}</td></tr>`).join('')}</tbody></table>
      </section>`;
    }

export function poStatusHistoryCard(poId) {
      const status = poLifecycle(poId);
      const project = PROJECTS.find(item => item.name === POS.find(po => po.id === poId)?.project);
      const canRollback = state.currentRole === 'engineer' && canWriteProject(project) && status !== 'Unplanned';
      const unifiedEvents = auditContextEvents({ po:poId });
      const rollback = canRollback ? `<button class="btn sm" onclick="openPoRollback('${poId}')">Rollback with reason</button>` : '';
      return `${state.poRollback.open && state.poRollback.po === poId ? `<div class="rollback-panel" style="margin-bottom:14px;"><strong>Backward transition: ${status} → ${PO_STATUS_FLOW[PO_STATUS_FLOW.indexOf(status)-1]}</strong><textarea placeholder="Mandatory written reason…" oninput="poRollback.reason=this.value">${state.poRollback.reason}</textarea><div style="display:flex;justify-content:flex-end;gap:7px;"><button class="btn sm" onclick="poRollback={open:false,po:'',reason:''};renderPage()">Cancel</button><button class="btn sm primary" onclick="confirmPoRollback('${poId}')">Confirm rollback</button></div></div>` : ''}${traceabilityWorkspace(unifiedEvents,`${poId} complete history`,'poAuditHistoryTable',`${statusBadge(status,productionStatusType(status))}${rollback}`)}`;
    }

export function appendProductionAudit(delivery, line, action, detail) {
      AUDIT_LOGS.unshift({
        id:`AUD-${10300 + AUDIT_LOGS.length}`,
        date:new Date().toISOString().slice(0,16).replace('T',' '),
        user:productionActor(), module:'Purchase Order Status', action,
        entity:`${delivery.code} · ${line.fgpn}`, project:delivery.project, po:delivery.po, details:detail,
      });
    }

export function markProductionDone(code,fgpn) {
      const delivery = MFG_DELIVERIES.find(item => item.code === code);
      const line = delivery && mfgDeliveryPnQuantities(delivery).find(item => item.fgpn === fgpn);
      if (!delivery || !line || state.currentRole !== 'prod_coord') return;
      mfgNormalizeLaunchLine(delivery,line);
      if (line.status !== 'In Progress') return;
      const before = poLifecycle(delivery.po);
      line.status = 'Done'; line.producedQty = line.qty; line.productionCompletedBy = productionActor(); line.productionCompletedAt = new Date().toISOString().slice(0,16).replace('T',' ');
      syncMfgDeliveryLifecycle(delivery);
      appendProductionAudit(delivery,line,'Production completed',`${line.qty.toLocaleString()} units of ${line.fgpn} in manufacturing launch ${delivery.code} were marked Done by the Production & Packing Coordinator.`);
      const after = poLifecycle(delivery.po);
      recordPoLifecycleChange(delivery.po,before,after,productionActor(),after === 'Done' ? 'Every PO finished-good quantity completed production' : `${line.fgpn} quantity completed for manufacturing launch ${delivery.code}`,'Coordinator production confirmation');
      renderAll();
      openModal('Production confirmed', `${line.fgpn} · ${line.qty.toLocaleString()} units in ${delivery.code} are Done and ready for packaging.`);
    }

export function markPackaged(code,fgpn) {
      const delivery = MFG_DELIVERIES.find(item => item.code === code);
      const line = delivery && mfgDeliveryPnQuantities(delivery).find(item => item.fgpn === fgpn);
      if (!delivery || !line || state.currentRole !== 'prod_coord') return;
      mfgNormalizeLaunchLine(delivery,line);
      if (line.status !== 'Done') return;
      const before = poLifecycle(delivery.po);
      line.status = 'Packaged'; line.packagedQty = line.qty; line.packagedBy = productionActor(); line.packagedAt = new Date().toISOString().slice(0,16).replace('T',' ');
      syncMfgDeliveryLifecycle(delivery);
      appendProductionAudit(delivery,line,'Packaging completed',`${line.qty.toLocaleString()} units of ${line.fgpn} in manufacturing launch ${delivery.code} were marked Packaged by the Production & Packing Coordinator.`);
      const after = poLifecycle(delivery.po);
      recordPoLifecycleChange(delivery.po,before,after,productionActor(),after === 'Packaged' ? 'Every PO finished-good quantity was packaged' : `${line.fgpn} quantity packaged for manufacturing launch ${delivery.code}`,'Coordinator packaging confirmation');
      renderAll();
      openModal('Packaging confirmed', `${line.fgpn} · ${line.qty.toLocaleString()} units in ${delivery.code} are now available for customer delivery.`);
    }

export function setProductionStatusFilter(value) { state.productionStatusFilter = value; renderPage(); }

export function productionActionHtml(delivery,line) {
      if (state.currentRole === 'prod_coord' && line.status === 'In Progress') return `<button class="btn sm primary" onclick="markProductionDone('${delivery.code}','${line.fgpn}')">${icon('check','')} Mark Done</button>`;
      if (state.currentRole === 'prod_coord' && line.status === 'Done') return `<button class="btn sm primary" onclick="markPackaged('${delivery.code}','${line.fgpn}')">${icon('PackageCheck','')} Mark Packed</button>`;
      if (['engineer','manager'].includes(state.currentRole) && line.status === 'Packaged') return `<button class="btn sm" onclick="startProjectCustomerDelivery('${delivery.po}','${line.fgpn}','po')">Create Customer Delivery</button>`;
      return `<span class="owner-chip">${line.status === 'Unplanned' ? 'Waiting for signed manufacturing reception' : PO_STATUS_OWNER[line.status]}</span>`;
    }

export function productionQueueHtml(deliveries) {
      if (!deliveries.length) return emptyStateBlock('Queue is clear','No manufacturing launches match this status.',null);
      return `<div class="production-launch-list">${deliveries.map(delivery => {
        const allLines = mfgDeliveryPnQuantities(delivery).map(line => mfgNormalizeLaunchLine(delivery,line));
        const lines = state.productionStatusFilter === 'All' ? allLines : allLines.filter(line => line.status === state.productionStatusFilter);
        const total = allLines.reduce((sum,line) => sum + line.qty,0);
        return `<section class="production-launch-card"><div class="production-launch-head"><div><span class="production-launch-code">${delivery.code}</span><h3>${delivery.project} · ${delivery.po}</h3><p>${total.toLocaleString()} units · ${allLines.length} PN line${allLines.length === 1 ? '' : 's'} · Receiver: ${delivery.receiver || 'Not assigned'}</p></div><div>${statusBadge(syncMfgDeliveryLifecycle(delivery),productionStatusType(delivery.lifecycleStatus))}<button class="btn sm" onclick="openMfgDelivery('${delivery.code}')">View Launch</button></div></div><div class="production-line-list">${lines.map(line => {
          const progress = ({Unplanned:0,'In Progress':35,Done:70,Packaged:90,Delivered:100})[line.status] || 0;
          return `<div class="production-line-row"><div class="production-line-main"><strong class="mono">${line.fgpn}</strong><span>${line.qty.toLocaleString()} units in this launch</span></div><div class="production-line-stage">${statusBadge(line.status,productionStatusType(line.status))}<div class="progress-track"><div class="progress-fill" style="width:${progress}%;"></div></div></div><div class="production-line-qty"><span>Done</span><strong>${Number(line.producedQty || 0).toLocaleString()} / ${line.qty.toLocaleString()}</strong></div><div class="production-line-qty"><span>Packed</span><strong>${Number(line.packagedQty || 0).toLocaleString()} / ${line.qty.toLocaleString()}</strong></div><div class="production-line-action">${productionActionHtml(delivery,line)}</div></div>`;
        }).join('')}</div></section>`;
      }).join('')}</div>`;
    }

export function pageProductionBoard() {
      const selectable = PO_STATUS_FLOW;
      const rows = MFG_DELIVERIES.filter(delivery => delivery.status !== 'Cancelled' && mfgDeliveryPnQuantities(delivery).some(line => state.productionStatusFilter === 'All' || mfgNormalizeLaunchLine(delivery,line).status === state.productionStatusFilter));
      const monitor = ['engineer','manager','plant'].includes(state.currentRole);
      return `
  <div class="production-flow">
    ${PO_STATUS_FLOW.map((status, i) => {
      const colors = ['#94A3B8','#0B819F','#16844B','#D97706','#16844B'];
      const count=mfgLaunchLines().filter(item => item.line.status === status).length;
      return `<div class="flow-step" style="--step-color:${colors[i]}"><span class="flow-step-count">${count}</span><div class="flow-step-name">${status}</div><div class="flow-step-owner">PN quantity lines</div></div>`;
    }).join('')}
  </div>
  ${monitor ? `<div class="readonly-banner" style="background:var(--primary-light); color:var(--primary-dark); border-color:#BFE3EA;">${icon('view','')} Monitoring view — lifecycle actions stay with the operational owner shown in each stage.</div>` : ''}
  <div class="card">
    <div class="section-title">${state.currentRole === 'prod_coord' ? 'Manufacturing launch action queue' : 'Manufacturing launch lifecycle'}
      <select class="tt-select" onchange="setProductionStatusFilter(this.value)"><option value="All">All allowed statuses</option>${selectable.map(s=>`<option value="${s}" ${state.productionStatusFilter===s?'selected':''}>${s}</option>`).join('')}</select>
    </div>
    ${productionQueueHtml(rows)}
  </div>`;
    }

export function setPoSearch(v) { state.poFilters.search = v; state.poPage = 1; renderPage(); }

export function setPoFilter(key, v) { state.poFilters[key] = v; state.poPage = 1; renderPage(); }

export function clearPoFilter(key) { state.poFilters[key] = ''; state.poPage = 1; renderPage(); }

export function resetPoFilters() { state.poFilters = { search: '', project: '', customer: '', status: '', version: '', simulation: '' }; state.poPage = 1; renderPage(); }

export function sortPo(key) { poSort.dir = (poSort.key === key) ? -poSort.dir : 1; poSort.key = key; renderPage(); }

export function setPoPage(n) { state.poPage = Math.max(1, n); renderPage(); }

export function togglePoSelect(id) { poSelected.has(id) ? poSelected.delete(id) : poSelected.add(id); renderPage(); }

export function getPoPageRows() {
      let rows = sortRows(filterPOs(), poSort);
      const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
      state.poPage = Math.min(state.poPage, totalPages);
      return rows.slice((state.poPage - 1) * PAGE_SIZE, state.poPage * PAGE_SIZE);
    }

export function togglePoSelectAll() {
      const rows = getPoPageRows();
      const allSelected = rows.length > 0 && rows.every(r => poSelected.has(r.id));
      if (allSelected) { rows.forEach(r => poSelected.delete(r.id)); } else { rows.forEach(r => poSelected.add(r.id)); }
      renderPage();
    }

export function clearPoSelection() { poSelected.clear(); renderPage(); }

export function bulkPoAction(label) {
      if (label === 'Run Simulation' && poSelected.size > 0) {
        state.simScope = 'selected';
        state.simSelectedPOs = new Set(poSelected);
        navigate('sim-launch');
        return;
      }
      openModal(label, `This ${label.toLowerCase()} action would apply to ${poSelected.size} selected purchase order(s).`);
    }

export function filterPOs() {
      const f = state.poFilters;
      return POS.filter(po => {
        if (f.search && !(`${po.id} ${po.project} ${po.customer}`.toLowerCase().includes(f.search.toLowerCase()))) return false;
        if (f.project && po.project !== f.project) return false;
        if (f.customer && po.customer !== f.customer) return false;
        if (f.status && po.status !== f.status) return false;
        if (f.version && po.version !== f.version) return false;
        if (f.simulation && po.simStatus !== f.simulation) return false;
        return true;
      });
    }

export function poToolbarHtml() {
      const opt = (key, list, placeholder) => `<select class="tt-select" onchange="setPoFilter('${key}', this.value)">
    <option value="">${placeholder}</option>
    ${list.map(v => `<option value="${v}" ${state.poFilters[key] === v ? 'selected' : ''}>${v}</option>`).join('')}
  </select>`;
      return `<div class="table-toolbar">
    <div class="tt-search">
      ${icon('search', '')}
      <input type="text" placeholder="Search PO, project or customer…" value="${state.poFilters.search}" oninput="setPoSearch(this.value)"/>
    </div>
    ${opt('project', uniqueValues(POS, 'project'), 'Project')}
    ${opt('customer', uniqueValues(POS, 'customer'), 'Customer')}
    ${opt('status', uniqueValues(POS, 'status'), 'Readiness')}
    ${opt('version', uniqueValues(POS, 'version'), 'Version')}
    ${opt('simulation', uniqueValues(POS, 'simStatus'), 'Simulation')}
    <div class="tt-spacer"></div>
    <div class="tt-icon-btn" title="Refresh" onclick="refreshNotice()">${icon('refresh', '')}</div>
    <div class="col-menu">
      <div class="tt-icon-btn" title="Columns" onclick="event.stopPropagation(); toggleColMenu()">${icon('columns', '')}</div>
      ${state.colMenuOpen ? columnMenuPanel() : ''}
    </div>
    <div class="tt-icon-btn" title="Export" onclick="exportNotice()">${icon('download', '')}</div>
  </div>`;
    }

export function pagePoList() {
      const rows = sortRows(filterPOs(), poSort);
      const total = rows.length;
      const pageRows = getPoPageRows();

      const stats = [
        { label: 'Ready', value: POS.filter(p => p.status === 'Ready').length, color: 'var(--success)' },
        { label: 'Waiting BOM', value: POS.filter(p => p.status === 'Waiting BOM').length, color: 'var(--warning)' },
        { label: 'Missing Stock', value: POS.filter(p => p.status === 'Missing Stock').length, color: 'var(--danger)' },
        { label: 'In Production', value: POS.filter(po => poLifecycle(po.id) === 'In Progress').length, color: 'var(--primary)' },
      ];

      const chips = filterChips(state.poFilters, { project: 'Project', customer: 'Customer', status: 'Status', version: 'Version', simulation: 'Simulation' }, 'clearPoFilter', 'resetPoFilters');
      const allSelected = pageRows.length > 0 && pageRows.every(r => poSelected.has(r.id));

      const tableBody = pageRows.length ? `<table>
    <thead><tr>
      <th style="width:34px;"><input type="checkbox" class="head-check" ${allSelected ? 'checked' : ''} onchange="togglePoSelectAll()"/></th>
      ${sortTh('PO Number', 'id', poSort, 'sortPo')}
      ${poColumns.version ? sortTh('Version', 'version', poSort, 'sortPo') : ''}
      <th style="width:78px;">Current</th>
      ${poColumns.pnCount ? sortTh('PN Count', 'pnCount', poSort, 'sortPo') : ''}
      ${poColumns.delivery ? sortTh('Delivery Date', 'delivery', poSort, 'sortPo') : ''}
      ${poColumns.simulation ? `<th>Simulation</th>` : ''}
      ${poColumns.status ? `<th>Readiness</th>` : ''}
      ${poColumns.lifecycle ? `<th>Lifecycle</th>` : ''}
      <th>Actions</th>
    </tr></thead>
    <tbody>${pageRows.map(po => `<tr class="clickable-row" onclick="openPo('${po.id}')">
      <td onclick="stop(event)"><input type="checkbox" class="row-check" ${poSelected.has(po.id) ? 'checked' : ''} onchange="togglePoSelect('${po.id}')"/></td>
      <td class="mono">${po.id}<div style="font-size:11px; color:var(--ink-faint); font-weight:500;">${po.project}</div></td>
      ${poColumns.version ? `<td class="mono">${po.version}</td>` : ''}
      <td style="text-align:center;">${po.version === 'v3' ? statusBadge('Current', 'success') : '<span class="badge neutral">History</span>'}</td>
      ${poColumns.pnCount ? `<td class="mono">${po.pnCount}</td>` : ''}
      ${poColumns.delivery ? `<td>${po.delivery}</td>` : ''}
      ${poColumns.simulation ? `<td>${statusBadge(po.simStatus, po.simType)}</td>` : ''}
      ${poColumns.status ? `<td>${statusBadge(po.status, po.statusType)}</td>` : ''}
      ${poColumns.lifecycle ? `<td>${statusBadge(poLifecycle(po.id), productionStatusType(poLifecycle(po.id)))}</td>` : ''}
      <td>${poActionIcons(po.id)}</td>
    </tr>`).join('')}</tbody>
  </table>` : emptyStateBlock('No Purchase Orders Found', 'Try changing your filters.', 'resetPoFilters');

      return `
  <div class="page-title-row" style="margin-bottom:14px;">
    <div></div>
    ${permBtn('uploadPo', 'Upload Purchase Order', 'upload', "startPoUpload()", 'primary')}
  </div>
  ${statsRow(stats)}
  <div class="card">
    ${poToolbarHtml()}
    ${chips}
    ${poSelected.size > 0 ? `<div class="bulk-bar show">
      ${poSelected.size} selected
      <div class="bulk-actions">
        <button class="btn sm" onclick="bulkPoAction('Export')">Export</button>
        <button class="btn sm" onclick="bulkPoAction('Run Simulation')">Run Simulation</button>
        ${can('deleteRecord') === true ? `<button class="btn sm" style="color:var(--danger); border-color:#FCA5A5;" onclick="bulkPoAction('Delete')">Delete</button>` : ''}
        <button class="btn sm" onclick="clearPoSelection()">Clear</button>
      </div>
    </div>`: ''}
    <div class="table-head-row">${rowCountLabel(total, 'Purchase Order')}</div>
    ${tableBody}
    ${pageRows.length ? paginationBar(total, state.poPage, PAGE_SIZE, 'setPoPage') : ''}
  </div>`;
    }

export function poBomUploadPanel(poId) {
      if (!state.poBomUpload.open || state.poBomUpload.po !== poId) return '';
      return bomImportPanel('po',poId);
    }

export function poVersionRecords(po) {
      if (po.id === 'PO-00045') return PO_VERSION_HISTORY;
      return [{ version:po.version || 'v1', current:true, date:po.date || '—', uploadedBy:poStatusEvents(po.id).slice(-1)[0]?.user || 'System', comment:'Current validated purchase order', status:'Current', file:`${po.id}_${po.version || 'v1'}.pdf` }];
    }

export function poVersionRows(po, version) {
      if (po.id === 'PO-00045' && PO_VERSION_SNAPSHOTS[version]) return PO_VERSION_SNAPSHOTS[version];
      return pnsForPo(po.id).map(item => ({ pn:item.pn, description:item.desc, quantity:item.qty, unit:'PCS', dueDate:po.delivery || '—', customerRef:'—' }));
    }

export function bomVersionRecords(pn) {
      if (pn.pn === 'PN100') return BOM_VERSION_HISTORY;
      return [{ version:pn.version === '—' ? 'v1' : pn.version, current:true, date:pn.bomUpdated === '—' ? '—' : pn.bomUpdated, uploadedBy:'Launch Engineer', comment:'Current validated BOM workbook', status:'Current', file:pn.bomFile === '—' ? `${pn.pn}_BOM_v1.xlsx` : pn.bomFile }];
    }

export function bomVersionRows(pn, version) {
      if (pn.pn === 'PN100' && BOM_VERSION_SNAPSHOTS[version]) return BOM_VERSION_SNAPSHOTS[version];
      return MATERIALS.filter(material => material.pns.includes(pn.pn)).map(material => ({ material:material.code, description:material.desc, materialType:material.type, usageQty:(BOM_USAGE[pn.pn] || {})[material.code] || 1, unit:material.type === 'Wire' || material.type === 'Tube' || material.type === 'Tape' ? 'M' : 'PCS', supplier:material.supplier, revision:'A' }));
    }

export function selectPoVersion(version) { state.poVersionSelected = version; renderPage(); }

export function selectBomVersion(version) { state.bomVersionSelected = version; renderPage(); }

export function setPoWorkspaceCompareA(version) { state.poVersionCompareA = version; renderPage(); }

export function setPoWorkspaceCompareB(version) { state.poVersionCompareB = version; renderPage(); }

export function setBomWorkspaceCompareA(version) { state.bomVersionCompareA = version; renderPage(); }

export function setBomWorkspaceCompareB(version) { state.bomVersionCompareB = version; renderPage(); }

export function poVersionsWorkspace(po, writable) {
      const versions = poVersionRecords(po);
      const current = versions.find(item => item.current) || versions[0];
      if (!versions.some(item => item.version === state.poVersionSelected)) state.poVersionSelected = current.version;
      if (!versions.some(item => item.version === state.poVersionCompareA)) state.poVersionCompareA = versions[1]?.version || current.version;
      if (!versions.some(item => item.version === state.poVersionCompareB)) state.poVersionCompareB = current.version;
      const selected = versions.find(item => item.version === state.poVersionSelected) || current;
      const rows = poVersionRows(po,selected.version);
      const totalQty = rows.reduce((sum,row) => sum + Number(row.quantity || 0),0);
      const canCompare = versions.length > 1 && state.poVersionCompareA !== state.poVersionCompareB;
      return `<div class="version-hub">
        <div class="version-domain-head"><div class="version-domain-title"><div class="version-domain-icon">${icon('FileText','')}</div><div><span>Purchase Order Versions</span><h3>${po.id} document history</h3></div></div><div class="table-heading-actions">${statusBadge(`${versions.length} version${versions.length === 1 ? '' : 's'}`,'info')}<button class="btn" onclick="downloadOriginalPoPdf('${inlineJsValue(po.id)}')">${icon('download','')} Export Original PO</button>${writable ? permBtn('uploadPo','Upload New PO Version','upload',`startPoUpload('${inlineJsValue(po.project)}','${inlineJsValue(po.id)}')`,'primary') : ''}</div></div>
        <div class="version-compare-strip"><div class="version-compare-field"><label>PO version A</label><select onchange="setPoWorkspaceCompareA(this.value)">${versions.map(item => `<option value="${item.version}" ${item.version === state.poVersionCompareA ? 'selected' : ''}>${item.version} · ${item.date}</option>`).join('')}</select></div><div class="version-compare-arrow">${icon('chevRight','')}</div><div class="version-compare-field"><label>PO version B</label><select onchange="setPoWorkspaceCompareB(this.value)">${versions.map(item => `<option value="${item.version}" ${item.version === state.poVersionCompareB ? 'selected' : ''}>${item.version}${item.current ? ' · Current' : ''}</option>`).join('')}</select></div><button class="btn primary" onclick="openPoVersionCompare('${po.id}',poVersionCompareA,poVersionCompareB)" ${canCompare ? '' : 'disabled'}>${icon('scale','')} Compare PO Versions</button></div>
        <div class="version-hub-grid"><div class="card version-catalog"><div class="version-catalog-head"><strong>Available PO versions</strong><span>Select a version to inspect its line items.</span></div><div class="version-list">${versions.map(item => `<button class="version-list-item ${item.version === selected.version ? 'active' : ''}" onclick="selectPoVersion('${item.version}')"><span class="version-list-code">${item.version.toUpperCase()}</span><span class="version-list-copy"><strong>${item.file}</strong><span>${item.date}</span></span>${item.current ? statusBadge('Current','success') : ''}</button>`).join('')}</div></div>
        <div class="card version-detail"><div class="version-detail-head"><div><h3>${po.id} · ${selected.version}</h3><p>${selected.comment}</p></div>${selected.current ? statusBadge('Current PO Version','success') : statusBadge('Historical PO Version','neutral')}</div><div class="version-detail-meta po-version-detail-meta"><div><span>Imported</span><strong>${selected.date}</strong></div><div><span>Source document</span><strong>${selected.file}</strong></div><div><span>Total quantity</span><strong>${totalQty.toLocaleString()}</strong></div></div><div class="version-content"><div class="version-content-head"><h4>PO line-item snapshot</h4>${tableExportActions('poSelectedVersionTable',`${po.id} ${selected.version} Line Items`)}</div><div class="table-scroll"><table id="poSelectedVersionTable"><thead><tr><th>Part Number</th><th>Description</th><th>Quantity</th><th>Unit</th><th>Due Date</th><th>Customer Reference</th></tr></thead><tbody>${rows.map(row => `<tr><td class="mono"><strong>${row.pn}</strong></td><td>${row.description}</td><td class="mono">${Number(row.quantity || 0).toLocaleString()}</td><td>${row.unit}</td><td class="mono">${row.dueDate}</td><td class="mono">${row.customerRef}</td></tr>`).join('')}</tbody></table></div></div></div></div>
      </div>`;
    }

export function bomVersionsWorkspace(pn, writable) {
      const versions = bomVersionRecords(pn);
      const current = versions.find(item => item.current) || versions[0];
      if (!versions.some(item => item.version === state.bomVersionSelected)) state.bomVersionSelected = current.version;
      if (!versions.some(item => item.version === state.bomVersionCompareA)) state.bomVersionCompareA = versions[1]?.version || current.version;
      if (!versions.some(item => item.version === state.bomVersionCompareB)) state.bomVersionCompareB = current.version;
      const selected = versions.find(item => item.version === state.bomVersionSelected) || current;
      const rows = bomVersionRows(pn,selected.version);
      const canCompare = versions.length > 1 && state.bomVersionCompareA !== state.bomVersionCompareB;
      return `<div class="version-hub">
        <div class="version-domain-head"><div class="version-domain-title"><div class="version-domain-icon bom">${icon('bom','')}</div><div><span>BOM Versions</span><h3>${pn.pn} material-structure history</h3></div></div><div class="table-heading-actions">${statusBadge(`${versions.length} BOM version${versions.length === 1 ? '' : 's'}`,'purple')}${writable ? permBtn('uploadBom','Upload New BOM Version','upload',`openPnBomUpload('${pn.pn}')`,'primary') : ''}</div></div>
        <div class="version-compare-strip"><div class="version-compare-field"><label>BOM version A</label><select onchange="setBomWorkspaceCompareA(this.value)">${versions.map(item => `<option value="${item.version}" ${item.version === state.bomVersionCompareA ? 'selected' : ''}>${item.version} · ${item.date}</option>`).join('')}</select></div><div class="version-compare-arrow">${icon('chevRight','')}</div><div class="version-compare-field"><label>BOM version B</label><select onchange="setBomWorkspaceCompareB(this.value)">${versions.map(item => `<option value="${item.version}" ${item.version === state.bomVersionCompareB ? 'selected' : ''}>${item.version}${item.current ? ' · Current' : ''}</option>`).join('')}</select></div><button class="btn primary" onclick="openBomVersionCompare('${pn.pn}',bomVersionCompareA,bomVersionCompareB)" ${canCompare ? '' : 'disabled'}>${icon('scale','')} Compare BOM Versions</button></div>
        <div class="version-hub-grid"><div class="card version-catalog"><div class="version-catalog-head"><strong>Available BOM versions</strong><span>Select a workbook version to inspect its materials.</span></div><div class="version-list">${versions.map(item => `<button class="version-list-item bom ${item.version === selected.version ? 'active' : ''}" onclick="selectBomVersion('${item.version}')"><span class="version-list-code">${item.version.toUpperCase()}</span><span class="version-list-copy"><strong>${item.file}</strong><span>${item.date} · ${item.uploadedBy}</span></span>${item.current ? statusBadge('Current','success') : ''}</button>`).join('')}</div></div>
        <div class="card version-detail"><div class="version-detail-head"><div><h3>${pn.pn} BOM · ${selected.version}</h3><p>${selected.comment}</p></div>${selected.current ? statusBadge('Current BOM Version','success') : statusBadge('Historical BOM Version','neutral')}</div><div class="version-detail-meta"><div><span>Uploaded</span><strong>${selected.date}</strong></div><div><span>Uploaded by</span><strong>${selected.uploadedBy}</strong></div><div><span>Source workbook</span><strong>${selected.file}</strong></div><div><span>Material rows</span><strong>${rows.length}</strong></div></div><div class="version-content"><div class="version-content-head"><h4>BOM material snapshot</h4>${tableExportActions('bomSelectedVersionTable',`${pn.pn} BOM ${selected.version}`)}</div><div class="table-scroll"><table id="bomSelectedVersionTable"><thead><tr><th>Material PN</th><th>Description</th><th>Type</th><th>Usage Qty</th><th>Unit</th><th>Supplier</th><th>Revision</th></tr></thead><tbody>${rows.map(row => `<tr><td class="mono"><strong>${row.material}</strong></td><td>${row.description}</td><td>${row.materialType}</td><td class="mono">${row.usageQty}</td><td>${row.unit}</td><td>${row.supplier}</td><td class="mono">${row.revision}</td></tr>`).join('')}</tbody></table></div></div></div></div>
      </div>`;
    }

export function pagePoWorkspace() {
      const poId = state.openContext.po;
      const po = POS.find(p => p.id === poId) || POS[0];
      const poPns = pnsForPo(po.id);
      const bomReadiness = poBomReadiness(po.id);
      const currentPoBomFile = bomReadiness.poBomFile;
      const poProject = PROJECTS.find(project => project.name === po.project) || PROJECTS[0];
      const writable = canWriteProject(poProject);
      const tabAliases = { Information:'Overview', PN:'Part Numbers', Versions:'PO Versions', 'Manufacturing Delivery':'Manufacturing', 'Delivery History':'History' };
      const tab = tabAliases[state.activeTab.po] || state.activeTab.po || 'Overview';
      if (state.activeTab.po !== tab) state.activeTab.po = tab;
      let tabContent = '';

      if (tab === 'Overview') {
        const status = poLifecycle(poId);
        const lastStatusEvent = poStatusEvents(poId)[0];
        const totals = poQuantitySummary(poId);
        tabContent = `<div class="po-information-status">
      <div class="po-current-status-card"><span>Current PO status</span><strong>${status}</strong><small>${PO_STATUS_TRIGGER[status]}${lastStatusEvent ? ` · ${lastStatusEvent.user} · ${lastStatusEvent.date}` : ''}</small><div style="margin-top:15px;">${statusBadge(status,productionStatusType(status))}</div></div>
      <div class="po-information-grid">
        <div class="po-information-item"><span>Customer</span><strong>${po.customer}</strong></div>
        <div class="po-information-item"><span>Current version</span><strong class="mono">${po.version}</strong></div>
        <div class="po-information-item"><span>Order date</span><strong class="mono">${po.date || '—'}</strong></div>
        <div class="po-information-item"><span>Delivery date</span><strong class="mono">${po.delivery || '—'}</strong></div>
        <div class="po-information-item"><span>Part numbers</span><strong>${poPns.length}</strong></div>
        <div class="po-information-item"><span>Remaining quantity</span><strong>${totals.remaining.toLocaleString()}</strong></div>
      </div>
    </div>`;
      } else if (tab === 'Part Numbers') {
        tabContent = `<div class="card">
      <div class="section-title"><span>Part Numbers</span><div class="table-heading-actions"><span class="hint">${poPns.length} linked to ${poId}</span>${poPns.length ? tableExportActions('poPartNumbersTable',`${poId} Part Numbers`) : ''}</div></div>
      ${poPns.length ? `<div class="table-scroll"><table id="poPartNumbersTable"><thead><tr><th>Part Number</th><th>Description</th><th>Quantity</th><th>BOM Version</th><th>BOM Status</th><th>Production Status</th><th data-export="false">Action</th></tr></thead><tbody>${poPns.map(p => `<tr class="clickable-row" onclick="openPn('${p.pn}')"><td class="mono"><strong>${p.pn}</strong></td><td>${p.desc}</td><td class="mono">${Number(p.qty || 0).toLocaleString()}</td><td class="mono">${p.version}</td><td>${statusBadge(p.bom === 'Uploaded' ? 'Validated' : 'Required',p.bom === 'Uploaded' ? 'success' : 'warning')}</td><td>${statusBadge(p.status,p.statusType)}</td><td><div class="po-simple-actions"><button class="btn sm" onclick="stop(event);openPn('${p.pn}')">View</button>${writable && p.bom !== 'Uploaded' ? permBtn('uploadBom','Upload BOM','upload',`stop(event);openPnBomUpload('${p.pn}')`,'sm') : ''}</div></td></tr>`).join('')}</tbody></table></div>` : emptyStateBlock('No part numbers', 'This purchase order does not contain any part numbers.', null)}
    </div>`;
      } else if (tab === 'PO BOM') {
        if (state.poBomUpload.open && state.poBomUpload.po === po.id && state.bomImport.open && state.bomImport.level === 'po') {
          tabContent = poBomFocusedImportPanel(po.id);
        } else {
          const record = latestBomImportRecord('po',po.id);
          const bomFile = record?.file || currentPoBomFile?.file || '';
          const bomVersion = record?.version || currentPoBomFile?.version || '—';
          const bomRows = record?.rows?.length ? record.rows : currentPoBomFile ? poBomPreviewRows(po.id).map(row => ({ ...row, description:row.desc, materialType:row.type, usageQty:row.usage, revision:'A' })) : [];
          const materialCount = record?.materialCount || currentPoBomFile?.materialCount || new Set(bomRows.map(row => row.material)).size;
          const fgpnCount = record?.fgpnCount || currentPoBomFile?.fgpnCount || new Set(bomRows.map(row => row.fgpn)).size;
          tabContent = `<div class="card project-bom-clean">
        <div class="project-bom-clean-head"><div class="project-bom-clean-title"><div class="project-bom-file-icon">${icon('FileText','')}</div><div><h3>PO BOM</h3><p>${bomFile ? `${poEsc(bomFile)} · ${poId}` : `${poId} · no workbook uploaded`}</p></div></div><div class="project-bom-clean-actions">${statusBadge(bomFile ? 'Validated' : 'Required',bomFile ? 'success' : 'warning')}${bomFile ? `${tableExportActions('poBomMaterialsTable',`${poId} PO BOM`)}${writable ? permBtn('uploadBom','Upload New Version','upload',`openPoBomUploader('${po.id}')`,'primary') : ''}` : ''}</div></div>
        ${bomFile ? `<div class="project-bom-meta"><div class="project-bom-meta-item"><span>Version</span><strong>${bomVersion}</strong></div><div class="project-bom-meta-item"><span>Finished Good PNs</span><strong>${fgpnCount}</strong></div><div class="project-bom-meta-item"><span>Unique Materials</span><strong>${materialCount}</strong></div><div class="project-bom-meta-item"><span>Material Rows</span><strong>${bomRows.length || currentPoBomFile?.materialCount || 0}</strong></div></div><div class="project-bom-table-wrap"><h4>PO BOM Materials</h4><div class="table-scroll"><table id="poBomMaterialsTable" class="project-bom-table"><thead><tr><th>Finished Good PN</th><th>Material PN</th><th>Description</th><th>Type</th><th>Usage Qty</th><th>Unit</th><th>Supplier</th><th>Revision</th></tr></thead><tbody>${bomRows.map(row => `<tr><td class="mono">${row.fgpn}</td><td class="mono">${row.material}</td><td>${row.description || row.desc || '—'}</td><td>${row.materialType || row.type || '—'}</td><td class="mono">${row.usageQty ?? row.usage ?? '—'}</td><td>${row.unit || '—'}</td><td>${row.supplier || '—'}</td><td class="mono">${row.revision || 'A'}</td></tr>`).join('')}</tbody></table></div></div>` : `<div class="po-workspace-empty">${icon('bom','')}<strong>No PO BOM uploaded</strong><span>Upload one Excel workbook containing the Finished Good Part Numbers and their material lines.</span>${writable ? permBtn('uploadBom','Upload PO BOM','upload',`openPoBomUploader('${po.id}')`,'primary') : ''}</div>`}
      </div>`;
        }
      } else if (tab === 'PO Versions') {
        tabContent = poVersionsWorkspace(po,writable);
      } else if (tab === 'Manufacturing') {
        const canCreate = writable && ['Unplanned','In Progress'].includes(poLifecycle(poId));
        const poMfgRows = MFG_DELIVERIES.filter(delivery => delivery.po === poId);
        tabContent = `<div class="card project-mfg-simple"><div class="project-mfg-simple-head"><div><h3>Manufacturing delivery</h3><p>Select finished-good PNs and partial launch quantities, then set the material transfer.</p></div></div><div class="project-mfg-simple-controls"><div><label class="sim-field-label">Current purchase order</label><div class="po-workspace-context"><strong class="mono">${poId}</strong><span>${mfgEligibleOrders(poId).length} eligible PNs</span></div></div>${canCreate ? permBtn('createMfgDelivery','Select PNs & Launch Qty','plus',`startProjectMfgDelivery('${poId}')`,'primary') : `<button class="btn primary" disabled>No Eligible PNs</button>`}</div></div><div class="card"><div class="section-title"><span>Manufacturing Deliveries</span>${poMfgRows.length ? tableExportActions('poMfgDeliveriesTable',`${poId} Manufacturing Deliveries`) : ''}</div>${mfgTable(poMfgRows,'poMfgDeliveriesTable',true)}</div>`;
      } else if (tab === 'Customer Delivery') {
        const canCreate = writable && customerEligibleOrders(poId).length > 0;
        const poCustomerRows = CUST_DELIVERIES.filter(delivery => delivery.po === poId);
        tabContent = `<div class="card project-mfg-simple"><div class="project-mfg-simple-head"><div><h3>Customer delivery</h3><p>Create one full or partial delivery from one, several, or all packaged PN quantities.</p></div></div><div class="project-mfg-simple-controls"><div><label class="sim-field-label">Current purchase order</label><div class="po-workspace-context"><strong class="mono">${poId}</strong><span>${customerEligibleOrders(poId).length} packaged PNs · ${po.customer}</span></div></div>${canCreate ? permBtn('createCustDelivery','Select PNs & Quantities','plus',`startProjectCustomerDelivery('${poId}','','po')`,'primary') : `<button class="btn primary" disabled>No Packaged Quantity</button>`}</div></div><div class="card"><div class="section-title"><span>Customer Deliveries</span>${poCustomerRows.length ? tableExportActions('poCustomerDeliveriesTable',`${poId} Customer Deliveries`) : ''}</div>${custTable(poCustomerRows,'poCustomerDeliveriesTable',true)}</div>`;
      } else if (tab === 'Finance') {
        const financeAccess = can('viewFinance');
        tabContent = financeAccess === false ? `<div class="card">${emptyStateBlock('No finance access','Your role does not have access to this purchase order financial value.',null)}</div>` : poFinanceWorkspace(po);
      } else if (tab === 'History') {
        tabContent = poStatusHistoryCard(poId);
      }

      return `
  <div class="workspace-layout">
    ${projectExplorer('po', poId)}
    <div>
      <div class="workspace-header">
        <div class="ws-header-grid" style="width:100%;">
          <div>
            <span class="ws-id">${poId}</span>
            <div class="ws-title">Purchase Order — ${po.project}</div>
            <div class="ws-meta">
              <div class="ws-meta-item"><span class="l">Customer</span><span class="v">${po.customer}</span></div>
              <div class="ws-meta-item"><span class="l">Version</span><span class="v mono">${po.version}</span></div>
              <div class="ws-meta-item"><span class="l">Delivery</span><span class="v">${po.delivery}</span></div>
              <div class="ws-meta-item"><span class="l">Current Status</span>${statusBadge(poLifecycle(poId), productionStatusType(poLifecycle(poId)))}</div>
            </div>
          </div>
          <div class="ws-actions-row">
            ${poDocumentDownloadButtons(poId,true)}
            ${writable ? permBtn('runSimulation','Run Simulation',null,`simScope='single';simSinglePO='${poId}';simProject='${po.project}';navigate('sim-launch')`,'primary') : ''}
            ${writable ? permBtn('uploadPo','Upload New Version','upload',`startPoUpload('${inlineJsValue(po.project)}','${inlineJsValue(po.id)}')`) : ''}
          </div>
        </div>
      </div>
      ${workspaceTabs(['Overview','Part Numbers','PO BOM','PO Versions','Manufacturing','Customer Delivery','Finance','History'],tab,'showPoTab')}
      ${tabContent}
    </div>
  </div>`;
    }
