/* ==========================================================================
   customer-delivery.js
   ========================================================================== */

import { openModal } from '../components/modal.js';
import { navigate, navigateBack, openPo } from '../components/nav-render.js';
import { assignedProjectNames, canWriteProject, pnsForPo, uniqueValues, writableProjects } from '../components/shared-tables.js';
import { ADMIN_REFERENCE_LISTS } from '../data/admin-store.js';
import { AUDIT_LOGS, CONFIRMATION_METHODS, CUST_DELIVERIES, CUST_DELIVERY_STEPS, DELIVERY_METHOD_COSTS, INVOICES, MFG_DELIVERIES, POS, PO_LINE_SEED, PO_STATUS_FLOW, PRICES, PROJECTS, transportCostFor } from '../data/mock-data.js';
import { renderAll } from '../main.js';
import { mfgDeliveryPnQuantities, workspaceCanDeleteDelivery, workspaceDeleteIcon } from './manufacturing-delivery.js';
import { poEsc } from './po-intake.js';
import { workspaceTabs } from './projects.js';
import { auditContextEvents, customerConfirmedQty, customerDeliveryItems, customerEligibleOrders, customerShipmentItems, mfgLaunchLines, mfgNormalizeLaunchLine, packagedQuantitySummary, poFinishedGoods, poLifecycle, poQuantitySummary, productionActor, recordPoLifecycleChange, syncMfgDeliveryLifecycle, traceabilityWorkspace } from './purchase-orders.js';
import { renderPage } from './router.js';
import { state } from '../state.js';
import { money, statusBadge } from '../utils/helpers.js';
import { icon } from '../utils/icons.js';
import { can, permBtn } from '../utils/permissions.js';
import { emptyStateBlock, filterChips, paginationBar, rowCountLabel, sortRows, sortTh, statsRow } from '../utils/table-helpers.js';
import { PAGE_SIZE, custSort } from '../utils/table-state.js';

export function custEffectiveStatus(d) {
      return { label: d.status, type: d.statusType };
    }

export function custShipmentBreakdown(d) {
      const recorded=d.shipments.filter(shipment => shipment.status !== 'Planned');
      const confirmedQty = recorded.filter(shipment => !!shipment.confirmation).reduce((sum, shipment) => sum + shipment.qty, 0);
      const unconfirmedShippedQty = recorded.filter(shipment => !shipment.confirmation).reduce((sum, shipment) => sum + shipment.qty, 0);
      const remainingQty = Math.max(0,d.qty - d.delivered);
      return { confirmedQty, unconfirmedShippedQty, remainingQty };
    }

export function custTable(list, tableId = '', workspaceActions = false) {
      if (list.length === 0) return emptyStateBlock('No customer deliveries', 'No deliveries match this view yet.', null);
      return `<div class="table-scroll cust-delivery-table-wrap"><table${tableId ? ` id="${tableId}"` : ''} class="cust-delivery-table"><thead><tr><th>Delivery</th><th>Customer</th><th>Project</th><th>PO</th><th>Quantity</th><th>Progress</th><th>Status</th><th data-export="false">Actions</th></tr></thead>
    <tbody>${list.map(d => {
        const es = custEffectiveStatus(d);
        const b = custShipmentBreakdown(d);
        const confirmedPct = d.qty > 0 ? Math.round((b.confirmedQty / d.qty) * 100) : 0;
        const shippedPct = d.qty > 0 ? Math.round((b.unconfirmedShippedQty / d.qty) * 100) : 0;
        const hasSplit = b.confirmedQty > 0 && (b.unconfirmedShippedQty > 0 || b.remainingQty > 0);
        return `<tr class="clickable-row" onclick="openCustDelivery('${d.code}')">
      <td class="mono">${d.code}</td><td>${d.customer}</td><td>${d.project}</td><td class="mono">${d.po}</td>
      <td class="mono">${b.confirmedQty.toLocaleString()} / ${d.qty.toLocaleString()}</td>
      <td style="min-width:130px;">
        <div class="progress-track" style="display:flex; overflow:hidden;" title="${b.confirmedQty.toLocaleString()} confirmed, ${b.unconfirmedShippedQty.toLocaleString()} shipped (unconfirmed), ${b.remainingQty.toLocaleString()} remaining">
          ${confirmedPct > 0 ? `<div style="width:${confirmedPct}%; background:var(--success);"></div>` : ''}
          ${shippedPct > 0 ? `<div style="width:${shippedPct}%; background:var(--warning);"></div>` : ''}
        </div>
        ${hasSplit ? `<div style="font-size:11px; color:var(--ink-faint); margin-top:3px;">${b.confirmedQty.toLocaleString()} confirmed${b.unconfirmedShippedQty > 0 ? `, ${b.unconfirmedShippedQty.toLocaleString()} in transit` : ''}</div>` : ''}
      </td>
      <td>${statusBadge(es.label, es.type)}</td>
      <td>${custActionIcons(d,workspaceActions)}</td>
    </tr>`;
      }).join('')}</tbody></table></div>`;
    }

export function custDeliveryCanBeDeleted(d) {
      return d.status !== 'Delivered' && !(d.shipments || []).some(shipment => !!shipment.confirmation);
    }

export function requestDeleteCustDelivery(code) {
      const delivery = CUST_DELIVERIES.find(item => item.code === code);
      if (!delivery) return openModal('Delivery not found', `${code} is no longer available.`);
      if (!workspaceCanDeleteDelivery(delivery) && can('deleteCustDelivery') !== true) return openModal('Deletion not permitted', 'Only an authorized user may delete this customer delivery.');
      if (!custDeliveryCanBeDeleted(delivery)) return openModal('Deletion unavailable', `${code} has a customer confirmation. Keep it in the history for traceability.`);
      openModal(`Delete ${code}?`, 'The customer delivery will be removed and its packaged PN quantities will become available for another delivery.', () => deleteCustDeliveryRecord(code), 'Delete');
    }

export function deleteCustDeliveryRecord(code) {
      const index = CUST_DELIVERIES.findIndex(item => item.code === code);
      if (index < 0 || !custDeliveryCanBeDeleted(CUST_DELIVERIES[index])) return;
      const [delivery] = CUST_DELIVERIES.splice(index,1);
      if (state.openCustDeliveryId === code) state.openCustDeliveryId = CUST_DELIVERIES[0]?.code || '';
      AUDIT_LOGS.unshift({ id:`AUD-${13000 + AUDIT_LOGS.length}`, date:new Date().toISOString().slice(0,16).replace('T',' '), user:productionActor(), module:'Customer Delivery', action:'Deleted before confirmation', entity:delivery.code, project:delivery.project, po:delivery.po, details:`${delivery.code} was removed before customer confirmation. Its packaged PN quantities were released.` });
      renderPage();
    }

export function custActionIcons(d,workspaceActions = false) {
      const workspaceDelete = workspaceActions && workspaceCanDeleteDelivery(d) ? workspaceDeleteIcon('customer',d) : '';
      return `<div class="icon-actions">
    <div class="icon-btn" title="View" onclick="stop(event); openCustDelivery('${d.code}')">${icon('view', '')}</div>
    <div class="icon-btn" title="Documents" onclick="stop(event); openCustDelivery('${d.code}'); custActiveTab='Documents'; renderPage();">${icon('doc', '')}</div>
    ${workspaceDelete}
  </div>`;
    }

export function setCustSearch(v) { state.custFilters.search = v; state.custPage = 1; renderPage(); }

export function setCustFilter(key, v) { state.custFilters[key] = v; state.custPage = 1; renderPage(); }

export function clearCustFilter(key) { state.custFilters[key] = ''; state.custPage = 1; renderPage(); }

export function resetCustFilters() { state.custFilters = { search: '', customer: '', project: '', po: '', status: '', date: '' }; state.custPage = 1; renderPage(); }

export function sortCust(key) { custSort.dir = (custSort.key === key) ? -custSort.dir : 1; custSort.key = key; renderPage(); }

export function setCustPage(n) { state.custPage = Math.max(1, n); renderPage(); }

export function visibleCustomerDeliveries() {
      if (state.currentRole === 'engineer') { const assigned=assignedProjectNames(); return CUST_DELIVERIES.filter(delivery => assigned.has(delivery.project)); }
      return CUST_DELIVERIES;
    }

export function filterCust() {
      const f = state.custFilters;
      return visibleCustomerDeliveries().filter(d => {
        if (f.search && !(`${d.code} ${d.customer} ${d.project} ${d.po}`.toLowerCase().includes(f.search.toLowerCase()))) return false;
        if (f.customer && d.customer !== f.customer) return false;
        if (f.project && d.project !== f.project) return false;
        if (f.po && d.po !== f.po) return false;
        if (f.status && d.status !== f.status) return false;
        if (f.date && d.date !== f.date) return false;
        return true;
      });
    }

export function custToolbarHtml() {
      const source=visibleCustomerDeliveries();
      const opt = (key, list, placeholder) => `<select class="tt-select" onchange="setCustFilter('${key}', this.value)">
    <option value="">${placeholder}</option>
    ${list.map(v => `<option value="${v}" ${state.custFilters[key] === v ? 'selected' : ''}>${v}</option>`).join('')}
  </select>`;
      return `<div class="table-toolbar">
    <div class="tt-search">${icon('search', '')}<input type="text" placeholder="Search delivery…" value="${state.custFilters.search}" oninput="setCustSearch(this.value)"/></div>
    ${opt('customer', uniqueValues(source, 'customer'), 'Customer')}
    ${opt('project', uniqueValues(source, 'project'), 'Project')}
    ${opt('po', uniqueValues(source, 'po'), 'Purchase Order')}
    ${opt('status', uniqueValues(source, 'status'), 'Status')}
    ${opt('date', uniqueValues(source, 'date'), 'Delivery Date')}
    <div class="tt-spacer"></div>
    <div class="tt-icon-btn" title="Reset" onclick="resetCustFilters()">${icon('close', '')}</div>
    <div class="tt-icon-btn" title="Refresh" onclick="refreshNotice()">${icon('refresh', '')}</div>
    <div class="tt-icon-btn" title="Export" onclick="exportNotice()">${icon('download', '')}</div>
  </div>`;
    }

export function pageCustDeliveryList() {
      if (can('viewCustDelivery') === false) {
        return `<div class="card">${emptyStateBlock('No access', 'Your role does not have access to customer deliveries.', null)}</div>`;
      }
      const rows = sortRows(filterCust(), custSort);
      const source=visibleCustomerDeliveries();
      const total = rows.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      state.custPage = Math.min(state.custPage, totalPages);
      const pageRows = rows.slice((state.custPage - 1) * PAGE_SIZE, state.custPage * PAGE_SIZE);

      const totalUnitsOrdered = source.reduce((s, d) => s + d.qty, 0);
      const totalUnitsConfirmed = source.reduce((s, d) => s + custShipmentBreakdown(d).confirmedQty, 0);
      const stats = [
        { label: 'Created', value: source.filter(d => d.status === 'Created').length },
        { label: 'Shipped', value: source.filter(d => d.status === 'Shipped').length, color: 'var(--info)' },
        { label: 'Awaiting Confirmation', value: source.filter(d => d.status === 'Awaiting Confirmation').length, color: 'var(--warning)' },
        { label: 'Delivered', value: source.filter(d => d.status === 'Delivered').length, color: 'var(--success)' },
        { label: 'Units Confirmed', value: `${totalUnitsConfirmed.toLocaleString()} / ${totalUnitsOrdered.toLocaleString()}`, color: 'var(--success)' },
      ];
      const chips = filterChips(state.custFilters, { customer: 'Customer', project: 'Project', po: 'PO', status: 'Status', date: 'Date' }, 'clearCustFilter', 'resetCustFilters');
      const tableBody = pageRows.length ? `<table>
    <thead><tr>
      ${sortTh('Delivery', 'code', custSort, 'sortCust')}
      ${sortTh('Customer', 'customer', custSort, 'sortCust')}
      ${sortTh('Project', 'project', custSort, 'sortCust')}
      <th>PO</th>
      ${sortTh('Quantity', 'qty', custSort, 'sortCust')}
      <th>Progress</th>
      ${sortTh('Status', 'status', custSort, 'sortCust')}
      <th>Actions</th>
    </tr></thead>
    <tbody>${pageRows.map(d => {
        const b = custShipmentBreakdown(d);
        const confirmedPct = d.qty > 0 ? Math.round((b.confirmedQty / d.qty) * 100) : 0;
        const shippedPct = d.qty > 0 ? Math.round((b.unconfirmedShippedQty / d.qty) * 100) : 0;
        const hasSplit = b.confirmedQty > 0 && (b.unconfirmedShippedQty > 0 || b.remainingQty > 0);
        return `<tr class="clickable-row" onclick="openCustDelivery('${d.code}')">
      <td class="mono">${d.code}</td><td>${d.customer}</td><td>${d.project}</td><td class="mono">${d.po}</td>
      <td class="mono">${b.confirmedQty.toLocaleString()} / ${d.qty.toLocaleString()}</td>
      <td style="min-width:130px;">
        <div class="progress-track" style="display:flex; overflow:hidden;" title="${b.confirmedQty.toLocaleString()} confirmed, ${b.unconfirmedShippedQty.toLocaleString()} shipped (unconfirmed), ${b.remainingQty.toLocaleString()} remaining">
          ${confirmedPct > 0 ? `<div style="width:${confirmedPct}%; background:var(--success);"></div>` : ''}
          ${shippedPct > 0 ? `<div style="width:${shippedPct}%; background:var(--warning);"></div>` : ''}
        </div>
        ${hasSplit ? `<div style="font-size:11px; color:var(--ink-faint); margin-top:3px;">${b.confirmedQty.toLocaleString()} confirmed${b.unconfirmedShippedQty > 0 ? `, ${b.unconfirmedShippedQty.toLocaleString()} in transit` : ''}</div>` : ''}
      </td>
      <td>${statusBadge(d.status, d.statusType)}</td>
      <td>${custActionIcons(d)}</td>
    </tr>`;
      }).join('')}</tbody>
  </table>` : emptyStateBlock('No Customer Deliveries Found', 'Try changing your filters.', 'resetCustFilters');

      return `
  <div class="page-title-row" style="margin-bottom:2px;"><div></div>
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
      <button class="btn" onclick="navigate('cust-delivery-history')">${icon('history','')} Delivery History</button>
      ${permBtn('createCustDelivery', 'Create Delivery', 'plus', "startGlobalCustomerDelivery()", "primary")}
    </div>
  </div>
  ${statsRow(stats)}
  <div class="card">
    ${custToolbarHtml()}
    ${chips}
    <div class="table-head-row">${rowCountLabel(total, 'delivery')}</div>
    ${tableBody}
    ${pageRows.length ? paginationBar(total, state.custPage, PAGE_SIZE, 'setCustPage') : ''}
  </div>`;
    }

export function pageCustDeliveryHistory() {
      if (can('viewCustDelivery') === false) {
        return `<div class="card">${emptyStateBlock('No access', 'Your role does not have access to customer delivery history.', null)}</div>`;
      }
      return `<div class="card">
    <div class="page-title-row" style="margin-bottom:12px;"><div></div><button class="btn" onclick="navigateBack('cust-delivery-list')">${icon('chevLeft','')} Back to Deliveries</button></div>
    <div class="section-title">Customer Delivery History <span class="hint">${visibleCustomerDeliveries().length} records</span></div>
    ${custTable(visibleCustomerDeliveries())}
  </div>`;
    }

export function activeCustomerDeliveryMethods() {
      const configured = ADMIN_REFERENCE_LISTS.methods.entries.filter(entry => entry.status === 'Active').map(entry => entry.label);
      return configured.filter(method => DELIVERY_METHOD_COSTS[method] != null);
    }

export function custEligibleProjects() { return writableProjects().filter(project => POS.some(po => po.project === project.name && customerEligibleOrders(po.id).length)); }

export function custEligiblePos(projectName) { return POS.filter(po => po.project === projectName && customerEligibleOrders(po.id).length); }

export function customerFgpnDetails(poId,fgpn) {
      const master=poFinishedGoods(poId).find(item => item.fgpn === fgpn), pn=pnsForPo(poId).find(item => item.pn === fgpn || item.pn === master?.pn), extracted=PO_LINE_SEED.find(row => row[3] === fgpn || row[3] === master?.pn), price=PRICES.find(item => item.fgpn === fgpn);
      return { desc:extracted?.[4] || pn?.desc || 'Finished good',unitPrice:Number(extracted?.[7] ?? pn?.unitPrice ?? price?.price ?? 0),currency:pn?.currency || 'EUR' };
    }

export function custSelectedItems() { return (state.custWizard.fgpns || []).map(fgpn => ({ fgpn,qty:Number(state.custWizard.fgpnQtys?.[fgpn] || 0),...customerFgpnDetails(state.custWizard.po,fgpn),summary:packagedQuantitySummary(state.custWizard.po,fgpn) })); }

export function resetCustWizardScope(poId,preferredFgpn = '') {
      const eligible=customerEligibleOrders(poId), preferred=eligible.find(item => item.fgpn === preferredFgpn) || eligible[0];
      state.custWizard.fgpns=preferred ? [preferred.fgpn] : [];
      state.custWizard.fgpn=preferred?.fgpn || '';
      state.custWizard.fgpnQtys=preferred ? { [preferred.fgpn]:packagedQuantitySummary(poId,preferred.fgpn).available } : {};
    }

export function startGlobalCustomerDelivery() {
      const project=custEligibleProjects()[0], po=project ? custEligiblePos(project.name)[0] : null, order=po ? customerEligibleOrders(po.id)[0] : null;
      if (!project || !po || !order) return openModal('No packaged quantity','No assigned project currently has a packaged FGPN with quantity remaining to deliver.');
      state.custWizard={project:project.name,po:po.id,fgpn:'',fgpns:[],fgpnQtys:{},method:activeCustomerDeliveryMethods()[0] || 'Truck',tracking:'',deliveryDate:'',address:`${po.customer} Receiving Center`,source:'global'};
      resetCustWizardScope(po.id,order.fgpn);
      state.custWizardStep=1; navigate('cust-delivery-create');
    }

export function custWizardGoStep(n) { state.custWizardStep=Math.max(1,Math.min(3,n)); renderPage(); }

export function custWizardSetProject(value) {
      state.custWizard.project=value; const po=custEligiblePos(value)[0]; state.custWizard.po=po?.id || ''; state.custWizard.address=po ? `${po.customer} Receiving Center` : ''; resetCustWizardScope(state.custWizard.po); renderPage();
    }

export function custWizardSetPo(value) { state.custWizard.po=value; const po=POS.find(item => item.id === value); state.custWizard.address=po ? `${po.customer} Receiving Center` : ''; resetCustWizardScope(value); renderPage(); }

export function custWizardToggleFgpn(fgpn,checked) {
      const selected=new Set(state.custWizard.fgpns || []);
      if (checked) { selected.add(fgpn); state.custWizard.fgpnQtys[fgpn]=packagedQuantitySummary(state.custWizard.po,fgpn).available; }
      else { selected.delete(fgpn); delete state.custWizard.fgpnQtys[fgpn]; }
      state.custWizard.fgpns=[...selected]; state.custWizard.fgpn=state.custWizard.fgpns[0] || ''; renderPage();
    }

export function custWizardSetFgpnQty(fgpn,value) { const available=packagedQuantitySummary(state.custWizard.po,fgpn).available; state.custWizard.fgpnQtys[fgpn]=Math.max(0,Math.min(available,parseInt(value,10) || 0)); renderPage(); }

export function custWizardSelectAllFgpns(checked) {
      const eligible=customerEligibleOrders(state.custWizard.po); state.custWizard.fgpns=checked ? eligible.map(item => item.fgpn) : []; state.custWizard.fgpnQtys={};
      if (checked) eligible.forEach(item => { state.custWizard.fgpnQtys[item.fgpn]=packagedQuantitySummary(state.custWizard.po,item.fgpn).available; });
      state.custWizard.fgpn=state.custWizard.fgpns[0] || ''; renderPage();
    }

export function custWizardSetMethod(value) { state.custWizard.method=value; renderPage(); }

export function custWizardCancel() {
      if (state.navigationHistory.length) return navigateBack();
      if (state.custWizard.source === 'po') return openPo(state.custWizard.po,'Customer Delivery');
      if (state.custWizard.source === 'project') { state.openContext.project=state.custWizard.project; state.activeTab.project='Customer Deliveries'; return navigate('project-workspace'); }
      navigate('cust-delivery-list');
    }

export function custWizardValidateStep(step) {
      if (step === 1) {
        const items=custSelectedItems();
        if (!items.length) { openModal('Packaged FGPN required','Select at least one packaged finished-good part number.'); return false; }
        const invalid=items.find(item => !(item.qty > 0) || item.qty > item.summary.available);
        if (invalid) { openModal('Check delivery quantity',`Enter a quantity between 1 and ${invalid.summary.available.toLocaleString()} for ${invalid.fgpn}.`); return false; }
      }
      if (step === 2) {
        if (!activeCustomerDeliveryMethods().includes(state.custWizard.method)) { openModal('Delivery method unavailable','Select an active delivery method maintained by the System Administrator.'); return false; }
        if (!state.custWizard.deliveryDate) { openModal('Delivery date required','Select the planned delivery date.'); return false; }
      }
      return true;
    }

export function custWizardNext() { if (custWizardValidateStep(state.custWizardStep)) custWizardGoStep(state.custWizardStep + 1); }

export function custWizardSummaryHtml() {
      const po=POS.find(item => item.id === state.custWizard.po), items=custSelectedItems(), total=items.reduce((sum,item) => sum + item.qty,0);
      return `<div class="card cust-create-summary"><h3>Delivery Summary</h3><div class="cust-summary-row"><span>Project</span><strong>${state.custWizard.project || '—'}</strong></div><div class="cust-summary-row"><span>Purchase Order</span><strong class="mono">${state.custWizard.po || '—'}</strong></div><div class="cust-summary-row"><span>Customer</span><strong>${po?.customer || '—'}</strong></div><div class="cust-summary-row"><span>Selected PNs</span><strong>${items.length}</strong></div><div class="cust-summary-lines">${items.length ? items.map(item => `<div><span class="mono">${item.fgpn}</span><strong>${item.qty.toLocaleString()}</strong></div>`).join('') : '<span>No PN selected</span>'}</div><div class="cust-summary-row"><span>Total quantity</span><strong>${total.toLocaleString()} units</strong></div><div class="cust-summary-row"><span>Method</span><strong>${state.custWizard.method}</strong></div><div class="cust-summary-row"><span>Planned date</span><strong>${state.custWizard.deliveryDate || 'Not selected'}</strong></div><div class="cust-summary-total"><span>Transport Cost</span><strong>${money(transportCostFor(state.custWizard.method))}</strong></div></div>`;
    }

export function customerInstructionPrintHtml(delivery) {
      const items=customerDeliveryItems(delivery);
      const rows=items.map(item => `<tr><td>${item.fgpn}</td><td>${item.description || customerFgpnDetails(delivery.po,item.fgpn).desc}</td><td>${Number(item.qty || 0).toLocaleString()}</td><td>${delivery.tracking || '—'}</td></tr>`).join('');
      return `<!doctype html><html><head><meta charset="utf-8"><title>${delivery.code} Customer Delivery Instruction</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0}.head{padding:20px 22px;background:#0c2b3e;color:#fff}.head small{font-size:10px;letter-spacing:.08em;text-transform:uppercase}.head h1{font-size:22px;margin:6px 0 0}.meta{display:grid;grid-template-columns:1fr 1fr;border:1px solid #cbd5e1;margin-top:18px}.field{padding:12px;border-right:1px solid #cbd5e1;border-bottom:1px solid #cbd5e1}.field:nth-child(2n){border-right:0}.field span{display:block;color:#475569;font-size:9px;text-transform:uppercase;letter-spacing:.05em}.field strong{display:block;margin-top:5px;font-size:12px}.goods{width:100%;border-collapse:collapse;margin-top:18px;font-size:11px}.goods th,.goods td{padding:10px;border:1px solid #cbd5e1;text-align:left}.goods th{background:#eef5f7;font-size:9px;text-transform:uppercase}.foot{display:flex;justify-content:space-between;margin-top:34px;padding-top:12px;border-top:1px solid #cbd5e1;font-size:9px;color:#475569}</style></head><body><div class="head"><small>Customer Delivery Instruction</small><h1>${delivery.code}</h1></div><div class="meta"><div class="field"><span>Project</span><strong>${delivery.project}</strong></div><div class="field"><span>Customer</span><strong>${delivery.customer}</strong></div><div class="field"><span>Purchase Order</span><strong>${delivery.po}</strong></div><div class="field"><span>Planned Delivery Date</span><strong>${delivery.date}</strong></div><div class="field"><span>Delivery Method</span><strong>${delivery.method}</strong></div><div class="field"><span>Delivery Address</span><strong>${delivery.address || '—'}</strong></div></div><table class="goods"><thead><tr><th>Finished Goods Part Number</th><th>Description</th><th>Quantity</th><th>Tracking Reference</th></tr></thead><tbody>${rows}</tbody></table><div class="meta"><div class="field"><span>Transport Cost</span><strong>${money(delivery.transportCost)}</strong></div><div class="field"><span>Prepared By</span><strong>${delivery.createdBy}</strong></div></div><div class="foot"><span>Generated ${delivery.instructionGeneratedAt}</span><span>${delivery.instructionFile}</span></div><script>window.onload=()=>{window.focus();window.print();}<\/script></body></html>`;
    }

export function printCustomerDeliveryInstruction(code) {
      const delivery=CUST_DELIVERIES.find(item => item.code === code); if (!delivery) return;
      const popup=window.open('','_blank','width=900,height=900');
      if (!popup) return openModal('PDF preview blocked','Allow pop-ups to open the delivery instruction, then use Print or Save as PDF.');
      popup.document.write(customerInstructionPrintHtml(delivery)); popup.document.close();
    }

export function customerLaunchAllocations(poId,fgpn,quantity) {
      let remaining=Number(quantity || 0);
      const previouslyAllocated=new Map();
      CUST_DELIVERIES.flatMap(customerDeliveryItems).forEach(item => (item.launchAllocations || []).forEach(allocation => previouslyAllocated.set(`${allocation.launchCode}|${allocation.fgpn}`,Number(previouslyAllocated.get(`${allocation.launchCode}|${allocation.fgpn}`) || 0)+Number(allocation.qty || 0))));
      const allocations=[];
      mfgLaunchLines(poId).filter(item => item.line.fgpn === fgpn && PO_STATUS_FLOW.indexOf(item.line.status) >= PO_STATUS_FLOW.indexOf('Packaged')).forEach(({delivery,line}) => {
        if (remaining <= 0) return;
        const used=Number(previouslyAllocated.get(`${delivery.code}|${fgpn}`) || 0), available=Math.max(0,line.qty-used), qty=Math.min(available,remaining);
        if (qty > 0) { allocations.push({launchCode:delivery.code,fgpn,qty}); remaining-=qty; }
      });
      return remaining === 0 ? allocations : [];
    }

export function custWizardSaveDelivery() {
      if (!custWizardValidateStep(1) || !custWizardValidateStep(2)) return;
      const po=POS.find(item => item.id === state.custWizard.po), project=PROJECTS.find(item => item.name === po?.project);
      if (!po || !project || !canWriteProject(project)) return openModal('Delivery cannot be created','Select a purchase order from an assigned project.');
      const selectedItems=custSelectedItems(), number=Math.max(0,...CUST_DELIVERIES.map(item => Number(String(item.code).replace(/\D/g,'')) || 0))+1;
      const createdAt=new Date().toISOString().slice(0,16).replace('T',' '), code=`CD-${String(number).padStart(4,'0')}`;
      const items=selectedItems.map(item => ({ fgpn:item.fgpn,qty:item.qty,description:item.desc,unitPrice:item.unitPrice,value:item.qty*item.unitPrice,launchAllocations:customerLaunchAllocations(po.id,item.fgpn,item.qty) }));
      const unallocated=items.find(item => !item.launchAllocations.length);
      if (unallocated) return openModal('Packaged allocation changed',`${unallocated.fgpn} no longer has enough unallocated packaged quantity. Review the delivery scope again.`);
      const quantity=items.reduce((sum,item) => sum + item.qty,0), value=items.reduce((sum,item) => sum + item.value,0);
      const shipment={id:'SH-1',date:state.custWizard.deliveryDate,week:deliveryWeekLabel(state.custWizard.deliveryDate),po:po.id,fgpn:items.length === 1 ? items[0].fgpn : `${items.length} FGPNs`,description:items.length === 1 ? items[0].description : 'Multi-PN customer delivery',level:items.every(item => item.qty === packagedQuantitySummary(po.id,item.fgpn).remaining) ? 'Full' : 'Partial',qty:quantity,items:items.map(item => ({...item})),method:state.custWizard.method,transportCost:transportCostFor(state.custWizard.method),value,status:'Shipped',statusType:'info',recordedBy:productionActor(),confirmation:null};
      const delivery={code,customer:po.customer,project:po.project,po:po.id,fgpn:shipment.fgpn,items,qty:quantity,delivered:quantity,method:state.custWizard.method,tracking:state.custWizard.tracking || '—',date:state.custWizard.deliveryDate,createdAt,createdBy:productionActor(),address:state.custWizard.address || '',status:'Awaiting Confirmation',statusType:'warning',transportCost:transportCostFor(state.custWizard.method),unitValue:quantity ? value/quantity : 0,instructionGenerated:true,instructionGeneratedAt:createdAt,instructionFile:`${code}_customer_delivery_instruction.pdf`,shipments:[shipment]};
      CUST_DELIVERIES.unshift(delivery);
      AUDIT_LOGS.unshift({id:`AUD-${10300 + AUDIT_LOGS.length}`,date:createdAt,user:productionActor(),module:'Customer Delivery',action:'Delivery instruction and shipment created',entity:delivery.code,project:delivery.project,po:delivery.po,details:`${delivery.qty} units across ${items.length} finished-good PN${items.length === 1 ? '' : 's'} shipped by ${delivery.method}; awaiting customer confirmation; transport cost ${money(delivery.transportCost)}; instruction ${delivery.instructionFile}.`});
      state.openCustDeliveryId=delivery.code; state.custActiveTab='Overview'; state.custWizardStep=1; navigate('cust-delivery-workspace',{ replace:true }); printCustomerDeliveryInstruction(delivery.code);
    }

export function pageCustDeliveryCreate() {
      if (can('createCustDelivery') !== true) return `<div class="card">${emptyStateBlock('Insufficient permissions','Your role cannot create customer deliveries.',null)}</div>`;
      const step=state.custWizardStep, po=POS.find(item => item.id === state.custWizard.po), parts=customerEligibleOrders(state.custWizard.po), selected=custSelectedItems();
      const projects=custEligibleProjects(), projectPos=custEligiblePos(state.custWizard.project), methods=activeCustomerDeliveryMethods();
      const totalQty=selected.reduce((sum,item) => sum + item.qty,0), allSelected=parts.length > 0 && parts.every(part => state.custWizard.fgpns.includes(part.fgpn));
      const steps=['Scope','Delivery','Review'];
      let body='';
      if (step === 1) body=`<div class="card cust-form-card"><div class="cust-form-head"><div><h3>Packaged Quantities</h3></div>${statusBadge('Packaged','success')}</div><div class="cust-form-body"><div class="cust-field-grid"><div class="cust-field"><label>Project</label><select onchange="custWizardSetProject(this.value)" ${state.custWizard.source !== 'global' ? 'disabled' : ''}>${projects.map(project => `<option value="${project.name}" ${state.custWizard.project === project.name ? 'selected' : ''}>${project.name}</option>`).join('')}</select></div><div class="cust-field"><label>Purchase Order</label><select onchange="custWizardSetPo(this.value)" ${state.custWizard.source === 'po' ? 'disabled' : ''}>${projectPos.map(item => `<option value="${item.id}" ${state.custWizard.po === item.id ? 'selected' : ''}>${item.id} · ${customerEligibleOrders(item.id).length} packaged PN${customerEligibleOrders(item.id).length === 1 ? '' : 's'}</option>`).join('')}</select></div></div><div class="cust-scope-toolbar"><div><strong>${parts.length} packaged PN${parts.length === 1 ? '' : 's'}</strong></div><label class="mfg-select-all"><input type="checkbox" ${allSelected ? 'checked' : ''} onchange="custWizardSelectAllFgpns(this.checked)"> Select all</label></div><div class="cust-multi-pn-list">${parts.map(part => { const summary=packagedQuantitySummary(state.custWizard.po,part.fgpn), checked=state.custWizard.fgpns.includes(part.fgpn), detail=customerFgpnDetails(state.custWizard.po,part.fgpn); return `<div class="cust-multi-pn-row ${checked ? 'selected' : ''}"><input type="checkbox" aria-label="Select ${part.fgpn}" ${checked ? 'checked' : ''} onchange="custWizardToggleFgpn('${part.fgpn}',this.checked)"><div class="cust-multi-pn-main"><strong class="mono">${part.fgpn}</strong><span>${detail.desc}</span></div><div class="cust-multi-stat"><span>Packaged</span><strong>${summary.packaged.toLocaleString()}</strong></div><div class="cust-multi-stat"><span>Allocated</span><strong>${summary.allocated.toLocaleString()}</strong></div><div class="cust-multi-stat available"><span>Available</span><strong>${summary.available.toLocaleString()}</strong></div><div class="cust-multi-qty"><label>This Delivery</label><input type="number" min="1" max="${summary.available}" value="${checked ? (state.custWizard.fgpnQtys[part.fgpn] || '') : ''}" ${checked ? '' : 'disabled'} onchange="custWizardSetFgpnQty('${part.fgpn}',this.value)"></div></div>`; }).join('')}</div><div class="cust-selection-total"><span>${selected.length} PN${selected.length === 1 ? '' : 's'}</span><strong>${totalQty.toLocaleString()} units</strong></div><div class="cust-form-actions"><button class="btn" onclick="custWizardCancel()">Cancel</button><button class="btn primary" onclick="custWizardNext()">Continue ${icon('chevRight','')}</button></div></div></div>`;
      if (step === 2) body=`<div class="card cust-form-card"><div class="cust-form-head"><div><h3>Delivery Method and Schedule</h3><span>${selected.length} PN${selected.length === 1 ? '' : 's'} · ${totalQty.toLocaleString()} units</span></div></div><div class="cust-form-body"><div class="cust-method-grid">${methods.map(method => `<button class="cust-method-card ${state.custWizard.method === method ? 'selected' : ''}" onclick="custWizardSetMethod('${method}')"><strong>${method}</strong><span>${money(transportCostFor(method))}</span></button>`).join('')}</div><div class="cust-field-grid"><div class="cust-field"><label>Planned Delivery Date</label><input type="date" value="${state.custWizard.deliveryDate}" oninput="custWizard.deliveryDate=this.value"></div><div class="cust-field"><label>Tracking Reference</label><input value="${poEsc(state.custWizard.tracking)}" oninput="custWizard.tracking=this.value" placeholder="Optional"></div><div class="cust-field" style="grid-column:1/-1;"><label>Delivery Address</label><input value="${poEsc(state.custWizard.address)}" oninput="custWizard.address=this.value"></div></div><div class="cust-form-actions"><button class="btn" onclick="custWizardGoStep(1)">${icon('chevLeft','')} Back</button><button class="btn primary" onclick="custWizardNext()">Continue to Review ${icon('chevRight','')}</button></div></div></div>`;
      if (step === 3) body=`<div class="card cust-form-card"><div class="cust-form-head"><div><h3>Review and Generate</h3></div>${statusBadge('Ready','success')}</div><div class="cust-form-body"><div class="cust-review-header"><div><span>Customer</span><strong>${po?.customer || '—'}</strong></div><div><span>Purchase Order</span><strong class="mono">${state.custWizard.po}</strong></div><div><span>Delivery Method</span><strong>${state.custWizard.method}</strong></div><div><span>Planned Date</span><strong>${state.custWizard.deliveryDate}</strong></div></div><div class="table-scroll"><table><thead><tr><th>Finished-Good PN</th><th>Description</th><th>Available</th><th>This Delivery</th><th>Available After</th><th>Value</th></tr></thead><tbody>${selected.map(item => `<tr><td class="mono"><strong>${item.fgpn}</strong></td><td>${item.desc}</td><td class="mono">${item.summary.available.toLocaleString()}</td><td class="mono"><strong>${item.qty.toLocaleString()}</strong></td><td class="mono">${Math.max(0,item.summary.available-item.qty).toLocaleString()}</td><td class="mono">${money(item.qty*item.unitPrice)}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="3"><strong>Total</strong></td><td class="mono"><strong>${totalQty.toLocaleString()}</strong></td><td></td><td class="mono"><strong>${money(selected.reduce((sum,item) => sum + item.qty*item.unitPrice,0))}</strong></td></tr></tfoot></table></div><div class="cust-form-actions"><button class="btn" onclick="custWizardGoStep(2)">${icon('chevLeft','')} Back</button><button class="btn primary" onclick="custWizardSaveDelivery()">${icon('doc','')} Create & Generate PDF</button></div></div></div>`;
      return `<div class="cust-create-shell"><div class="cust-create-head"><div><h2>Create Customer Delivery</h2></div><button class="btn" onclick="custWizardCancel()">Close</button></div><div class="cust-context-bar"><div class="cust-context-item"><span>Project</span><strong>${state.custWizard.project}</strong></div><div class="cust-context-item"><span>Purchase Order</span><strong class="mono">${state.custWizard.po}</strong></div><div class="cust-context-item"><span>Customer</span><strong>${po?.customer || '—'}</strong></div><div class="cust-context-item"><span>PO Status</span><strong>${poLifecycle(state.custWizard.po)}</strong></div></div><div class="cust-step-nav">${steps.map((item,index) => { const number=index+1; return `<div class="cust-step-button ${number === step ? 'active' : number < step ? 'done' : ''}"><span class="cust-step-number">${number < step ? '✓' : number}</span><div class="cust-step-copy"><strong>${item}</strong></div></div>`; }).join('')}</div><div class="cust-create-layout"><div>${body}</div>${custWizardSummaryHtml()}</div></div>`;
    }

export function openCustDelivery(code) {
      const delivery=CUST_DELIVERIES.find(item => item.code === code);
      if (!delivery) return;
      if (state.currentRole === 'engineer' && !assignedProjectNames().has(delivery.project)) return openModal('Delivery outside your assignment',`${delivery.code} belongs to ${delivery.project}, which is not assigned to you.`);
      state.openCustDeliveryId=code; state.openContext.project=delivery.project; state.openContext.po=delivery.po; state.custActiveTab='Overview'; navigate('cust-delivery-workspace');
    }

export function showCustTab(tab) { state.custActiveTab = tab; renderPage(); }

export function custRecalcStatus(d) {
      const remaining = d.qty - d.delivered;
      const recorded=d.shipments.filter(shipment => shipment.status !== 'Planned');
      if (recorded.length === 0) return;
      const allConfirmed = recorded.every(shipment => !!shipment.confirmation);
      if (remaining === 0 && allConfirmed) {
        d.status = 'Delivered';
        d.statusType = 'success';
      } else if (remaining === 0 && !allConfirmed) {
        d.status = 'Awaiting Confirmation';
        d.statusType = 'warning';
      } else if (recorded.some(shipment => !!shipment.confirmation)) {
        d.status = 'Partially Delivered';
        d.statusType = 'brown';
      } else {
        d.status = 'Shipped';
        d.statusType = 'info';
      }
    }

export function poCustomerEvidenceComplete(poId) {
      const parts=poFinishedGoods(poId);
      return parts.length > 0 && parts.every(part => customerConfirmedQty(poId,part.fgpn) >= part.ordered);
    }

export function fgpnCustomerEvidenceComplete(poId, fgpn) {
      const part=poFinishedGoods(poId).find(item => item.fgpn === fgpn);
      return !!part && customerConfirmedQty(poId,fgpn) >= part.ordered;
    }

export function applyCustomerConfirmationToLaunches(shipment) {
      if (shipment.launchLifecycleApplied) return;
      customerShipmentItems(shipment).forEach(item => (item.launchAllocations || []).forEach(allocation => {
        const delivery=MFG_DELIVERIES.find(record => record.code === allocation.launchCode);
        const line=delivery && mfgDeliveryPnQuantities(delivery).find(record => record.fgpn === allocation.fgpn);
        if (!delivery || !line) return;
        mfgNormalizeLaunchLine(delivery,line);
        line.customerDeliveredQty=Math.min(line.qty,Number(line.customerDeliveredQty || 0)+Number(allocation.qty || 0));
        if (line.customerDeliveredQty >= line.qty && line.status === 'Packaged') line.status='Delivered';
        syncMfgDeliveryLifecycle(delivery);
      }));
      shipment.launchLifecycleApplied=true;
    }

export function completePoFromCustomerEvidence(poId, evidence, before) {
      const after = poLifecycle(poId);
      const completedParts=poFinishedGoods(poId).filter(part => fgpnCustomerEvidenceComplete(poId,part.fgpn)).map(part => part.fgpn);
      AUDIT_LOGS.unshift({ id:`AUD-${10300 + AUDIT_LOGS.length}`, date:new Date().toISOString().slice(0,16).replace('T',' '), user:productionActor(), module:'Customer Delivery', action:'Packaged quantity delivery confirmed', entity:poId, project:POS.find(po => po.id === poId)?.project || '', po:poId, details:`Customer evidence confirmed delivered quantities for ${completedParts.join(', ') || 'a partial PN quantity'}. Evidence: ${evidence}.` });
      recordPoLifecycleChange(poId,before,after,productionActor(),after === 'Delivered' ? 'All PO PN quantities delivered and customer confirmation evidence recorded' : 'Partial customer delivery confirmed; remaining PO quantities stay visible',evidence);
      return after === 'Delivered';
    }

export function deliveryWeekLabel(dateString) {
      const date=new Date(`${dateString}T00:00:00`); if (Number.isNaN(date.getTime())) return '—';
      const utc=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
      utc.setUTCDate(utc.getUTCDate()+4-(utc.getUTCDay() || 7));
      const yearStart=new Date(Date.UTC(utc.getUTCFullYear(),0,1));
      return `W${String(Math.ceil((((utc-yearStart)/86400000)+1)/7)).padStart(2,'0')}`;
    }

export function recordShipmentConfirmation(code, shipmentId) {
      if (can('recordDeliveryConfirmation') !== true) { openModal('Not permitted', 'Your role cannot record delivery confirmations.'); return; }
      const d = CUST_DELIVERIES.find(x => x.code === code);
      if (!d) return;
      const s = d.shipments.find(x => x.id === shipmentId);
      if (!s) return;

      const dateEl = document.getElementById('confDate_' + shipmentId);
      const methodEl = document.getElementById('confMethod_' + shipmentId);
      const byEl = document.getElementById('confBy_' + shipmentId);
      const refEl = document.getElementById('confRef_' + shipmentId);
      const commentsEl = document.getElementById('confComments_' + shipmentId);
      const evidenceEl = document.getElementById('confEvidence_' + shipmentId);

      if (!dateEl.value || !byEl.value.trim()) {
        openModal('Missing information', 'Confirmation date and confirmed-by name are required (M09-FR-08).');
        return;
      }
      if (!evidenceEl?.files?.[0]) {
        openModal('Customer evidence required', 'Upload a signed POD or verified carrier confirmation before confirming this shipment.');
        return;
      }

      const poBefore=poLifecycle(d.po);
      s.confirmation = {
        date: dateEl.value,
        method: methodEl.value,
        confirmedBy: byEl.value.trim(),
        reference: refEl.value.trim() || '—',
        evidence: evidenceEl.files[0].name,
        comments: commentsEl.value.trim(),
        recordedBy: productionActor(),
      };
      s.status='Delivered'; s.statusType='success';
      applyCustomerConfirmationToLaunches(s);
      AUDIT_LOGS.unshift({id:`AUD-${10300 + AUDIT_LOGS.length}`,date:new Date().toISOString().slice(0,16).replace('T',' '),user:productionActor(),module:'Customer Delivery',action:'Customer confirmation recorded',entity:`${d.code} · ${s.id}`,project:d.project,po:d.po,details:`Confirmed by ${s.confirmation.confirmedBy} using ${s.confirmation.method}. Evidence: ${s.confirmation.evidence}.`});

      custRecalcStatus(d);

      const allDone = d.shipments.every(x => !!x.confirmation) && (d.qty - d.delivered) === 0;
      const poDelivered = completePoFromCustomerEvidence(d.po,s.confirmation.evidence,poBefore);
      const totals = poQuantitySummary(d.po);
      openModal('Shipment Confirmed', `${shipmentId} confirmed as received by ${s.confirmation.confirmedBy}.` + (poDelivered ? ` ${d.po} now has zero remaining quantity and is Delivered.` : allDone ? ` This delivery record is confirmed; ${d.po} remains ${poLifecycle(d.po)} with ${totals.remaining.toLocaleString()} units remaining across the PO.` : ` ${d.shipments.filter(x => !x.confirmation).length} shipment(s) still need confirmation.`));
      renderAll();
    }

export function pageCustDeliveryWorkspace() {
      if (can('viewCustDelivery') === false) {
        return `<div class="card">${emptyStateBlock('No access', 'Your role does not have access to this customer delivery.', null)}</div>`;
      }
      const allowed=visibleCustomerDeliveries();
      const d = allowed.find(item => item.code === state.openCustDeliveryId) || allowed[0];
      if (!d) return `<div class="card">${emptyStateBlock('No customer deliveries','No delivery records are available in your assigned projects.',null)}</div>`;
      const tab = state.custActiveTab;
      const stepIdx = CUST_DELIVERY_STEPS.indexOf(d.status);
      const confirmedQty = (d.shipments || []).filter(shipment => !!shipment.confirmation).reduce((sum,shipment) => sum + Number(shipment.qty || 0),0);
      const remaining = Math.max(0,d.qty - confirmedQty);
      const deliveryItems = customerDeliveryItems(d);
      let tabContent = '';

      if (tab === 'Overview') {
        tabContent = `<div class="card"><div class="section-title">Delivery Timeline</div>
      <div class="h-timeline">
        ${CUST_DELIVERY_STEPS.map((s, i) => `<div class="h-tl-step ${i < stepIdx ? 'done' : i === stepIdx ? 'active' : ''}">
          <div class="h-tl-line"></div>
          <div class="h-tl-dot">${i < stepIdx ? '✓' : i + 1}</div>
          <div class="h-tl-label">${s}</div>
        </div>`).join('')}
      </div>
    </div>`;
      } else if (tab === 'Confirmation') {
        const pct = d.qty > 0 ? Math.round((confirmedQty / d.qty) * 100) : 0;
        const canConfirm = can('recordDeliveryConfirmation') === true;
        tabContent = `<div class="card">
      <div class="section-title">Delivery Quantity</div>
      <table><thead><tr><th>FGPN</th><th>Description</th><th>Shipment Quantity</th><th>Customer Confirmed</th></tr></thead>
      <tbody>${deliveryItems.map(item => `<tr><td class="mono">${item.fgpn}</td><td>${item.description || customerFgpnDetails(d.po,item.fgpn).desc}</td><td class="mono">${Number(item.qty || 0).toLocaleString()}</td><td>${d.status === 'Delivered' ? statusBadge('Confirmed','success') : statusBadge('Awaiting evidence','warning')}</td></tr>`).join('')}</tbody></table>
      <div style="margin-top:14px;">
        <div style="display:flex; justify-content:space-between; font-size:12.5px; color:var(--ink-soft); margin-bottom:4px;">
          <span>Customer confirmed</span><span>${confirmedQty.toLocaleString()} / ${d.qty.toLocaleString()} (${pct}%)</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%; background:${pct >= 100 ? 'var(--success)' : 'var(--primary)'}"></div></div>
      </div>
    </div>
    <div class="section-title" style="margin:16px 0 8px;">Customer Confirmation</div>
    ${d.shipments.map(s => `
    <div class="card" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
        <div>
          <span class="mono" style="font-weight:700;">${s.id}</span>
          <span style="color:var(--ink-soft); font-size:12.5px;"> — ${s.qty.toLocaleString()} units, ${s.method}, ${s.date}${s.week && s.week !== '—' ? ' (' + s.week + ')' : ''}</span>
        </div>
        ${s.confirmation ? statusBadge('Confirmed', 'success') : statusBadge('Awaiting Confirmation', 'warning')}
      </div>
      <table style="margin-bottom:${s.confirmation ? '0' : '12px'};"><thead><tr><th>PO</th><th>FGPN</th><th>Description</th><th>Level</th><th>Qty</th><th>Value</th></tr></thead>
      <tbody>${customerShipmentItems(s).map(item => `<tr><td class="mono">${s.po}</td><td class="mono">${item.fgpn}</td><td>${item.description || '—'}</td><td>${s.level || '—'}</td><td class="mono">${Number(item.qty || 0).toLocaleString()}</td><td class="mono">${money(Number(item.value || 0))}</td></tr>`).join('')}</tbody></table>
      ${s.confirmation ? `
      <div style="border-top:1px solid var(--border-soft); margin-top:10px; padding-top:10px;">
        <div class="result-row"><span class="r-label">Confirmation Date</span><span class="r-value">${s.confirmation.date}</span></div>
        <div class="result-row"><span class="r-label">Confirmation Method</span><span class="r-value">${s.confirmation.method}</span></div>
        <div class="result-row"><span class="r-label">Confirmed By</span><span class="r-value">${s.confirmation.confirmedBy}</span></div>
        <div class="result-row"><span class="r-label">Reference Number</span><span class="r-value mono">${s.confirmation.reference}</span></div>
        <div class="result-row"><span class="r-label">Evidence File</span><span class="r-value mono">${s.confirmation.evidence}</span></div>
        ${s.confirmation.comments ? `<div class="result-row"><span class="r-label">Comments</span><span class="r-value">${s.confirmation.comments}</span></div>` : ''}
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="btn sm" onclick="openModal('View Evidence', 'This would open ${s.confirmation.evidence} in a viewer.')">View Evidence</button>
          <button class="btn sm" onclick="openModal('Download', 'This would download ${s.confirmation.evidence}.')">Download</button>
        </div>
      </div>` : (canConfirm ? `
      <div style="border-top:1px solid var(--border-soft); margin-top:4px; padding-top:12px;">
        <div class="grid g2" style="margin-bottom:10px;">
          <div><label class="sim-field-label">Confirmation Date *</label><input class="coef-input" type="date" id="confDate_${s.id}"/></div>
          <div><label class="sim-field-label">Confirmation Method</label>
            <select class="sim-select" id="confMethod_${s.id}">${CONFIRMATION_METHODS.map(m => `<option>${m}</option>`).join('')}</select>
          </div>
        </div>
        <div class="grid g2" style="margin-bottom:10px;">
          <div><label class="sim-field-label">Confirmed By *</label><input class="coef-input" type="text" id="confBy_${s.id}" placeholder="Name / customer contact"/></div>
          <div><label class="sim-field-label">Reference Number</label><input class="coef-input" type="text" id="confRef_${s.id}" placeholder="POD / reference number"/></div>
        </div>
        <label class="sim-field-label">Customer Confirmation Evidence *</label>
        <input id="confEvidence_${s.id}" type="file" accept="application/pdf,image/*" style="display:none;" onchange="this.nextElementSibling.querySelector('.u-sub').textContent=this.files[0]?.name || 'PDF or image required'">
        <label class="upload-area" for="confEvidence_${s.id}" style="display:block; margin-bottom:10px; padding:16px; cursor:pointer;">
          ${icon('upload', '')}
          <div class="u-title" style="font-size:13px;">Choose signed POD or verified carrier evidence</div>
          <div class="u-sub">PDF or image required</div>
        </label>
        <label class="sim-field-label">Comments</label>
        <textarea class="coef-input" rows="2" id="confComments_${s.id}" style="width:100%; margin-bottom:10px; resize:vertical;" placeholder="Optional comments"></textarea>
        <button class="btn primary sm" onclick="recordShipmentConfirmation('${d.code}', '${s.id}')">Confirm This Shipment</button>
      </div>` : `<div class="e-sub" style="margin-top:8px;">Your role cannot record shipment confirmations.</div>`)}
    </div>`).join('')}`;
      } else if (tab === 'Documents') {
        tabContent = `<div class="card">
      <div class="section-title"><span>Delivery Instruction</span><button class="btn sm primary" onclick="printCustomerDeliveryInstruction('${d.code}')">${icon('download','')} Open PDF</button></div>
      <div class="doc-item"><div class="doc-icon">${icon('doc','')}</div><div><div class="doc-name mono">${d.instructionFile || `${d.code}_customer_delivery_instruction.pdf`}</div><div class="doc-meta">Generated ${d.instructionGeneratedAt || d.createdAt || d.date} · ${d.createdBy || 'Launch Engineer'}</div></div>${statusBadge('Generated','success')}</div>
    </div>`;
      } else if (tab === 'Finance') {
        const deliveryValue = d.qty * (d.unitValue || 0);
        const invoice = INVOICES.find(i => i.project === d.project);
        tabContent = `<div class="card">
      <div class="section-title">Finance</div>
      <div class="result-row"><span class="r-label">Transport Cost</span><span class="r-value">${money(d.transportCost)}${can('changeTransportCost') !== true ? ' <span class="hint">(locked — Admin only)</span>' : ''}</span></div>
      <div class="result-row"><span class="r-label">Delivery Value</span><span class="r-value">${money(deliveryValue)}</span></div>
      <div class="result-row"><span class="r-label">Invoice Status</span><span class="r-value">${invoice ? statusBadge(invoice.status, invoice.status === 'Paid' ? 'success' : invoice.status === 'Overdue' ? 'danger' : 'warning') : 'Not invoiced'}</span></div>
      <div class="result-row"><span class="r-label">Actual Revenue</span><span class="r-value">${d.status === 'Delivered' ? money(deliveryValue) : '—'}</span></div>
    </div>`;
      } else if (tab === 'Audit') {
        tabContent = traceabilityWorkspace(auditContextEvents({ custCode:d.code }),`${d.code} customer-delivery audit`,'customerDeliveryAuditTable');
      } else if (tab === 'History') {
        tabContent = traceabilityWorkspace(auditContextEvents({ custCode:d.code }),`${d.code} customer-delivery history`,'customerDeliveryHistoryTable');
      }

      const es = custEffectiveStatus(d);
      const effectiveStatus = es.label;
      const effectiveStatusType = es.type;

      return `
  <div class="workspace-header">
    <div>
      <span class="ws-id">${d.code}</span>
      <div class="ws-title">Customer Delivery — ${d.customer}</div>
      <div class="ws-meta">
        <div class="ws-meta-item"><span class="l">Customer</span><span class="v">${d.customer}</span></div>
        <div class="ws-meta-item"><span class="l">Project</span><span class="v">${d.project}</span></div>
        <div class="ws-meta-item"><span class="l">Purchase Order</span><span class="v mono">${d.po}</span></div>
        <div class="ws-meta-item"><span class="l">Status</span>${statusBadge(effectiveStatus, effectiveStatusType)}</div>
      </div>
    </div>
  </div>
  <div class="grid g4" style="margin-bottom:16px;">
    <div class="kpi-card"><div class="kpi-label">Ordered</div><div class="kpi-value" style="font-size:18px;">${d.qty.toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-label">Customer Confirmed</div><div class="kpi-value" style="font-size:18px;">${confirmedQty.toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-label">Remaining</div><div class="kpi-value" style="font-size:18px;">${remaining.toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-label">Transport Cost</div><div class="kpi-value" style="font-size:18px;">${money(d.transportCost)}</div></div>
  </div>
  <div class="ws-actions-row" style="margin-bottom:14px;"><button class="btn" onclick="printCustomerDeliveryInstruction('${d.code}')">${icon('download','')} Delivery Instruction PDF</button>${d.status !== 'Delivered' && can('recordDeliveryConfirmation') === true ? `<button class="btn primary" onclick="showCustTab('Confirmation')">Customer Confirmation</button>` : ''}</div>
  ${workspaceTabs(['Overview', 'Confirmation', 'Documents', 'Finance', 'History'], tab, 'showCustTab')}
  ${tabContent}`;
    }
