/* ==========================================================================
   simulation.js
   ========================================================================== */

import { openModal } from '../components/modal.js';
import { navigate } from '../components/nav-render.js';
import { uniqueValues } from '../components/shared-tables.js';
import { AUDIT_LOGS, BOM_USAGE, BOM_VERSION_HISTORY, MATERIALS, POS, PO_LAUNCH_PROGRESS, PO_VERSION_HISTORY, PROJECTS, SIM_PRIORITY_RULES } from '../data/mock-data.js';
import { mfgInvalidateLaunchApproval, mfgLaunchFingerprint, mfgMaterialsForSelection, mfgPnLaunchSummary } from './manufacturing-delivery.js';
import { productionActor } from './purchase-orders.js';
import { renderPage } from './router.js';
import { state } from '../state.js';
import { statusBadge } from '../utils/helpers.js';
import { icon } from '../utils/icons.js';
import { can, permBtn } from '../utils/permissions.js';
import { mfgWizard, simSafetyCoef, simSources, versionCompareFilters } from '../utils/table-state.js';

export function setSimScope(scope) { if (state.mfgSimulationContext.active) return; state.simScope = scope; renderPage(); }

export function setSimProject(v) { if (state.mfgSimulationContext.active) return; state.simProject = v; renderPage(); }

export function toggleSimUseCurrentVersions(v) {
      state.simUseCurrentVersions = v;
      if (state.mfgSimulationContext.active) mfgInvalidateLaunchApproval();
      renderPage();
    }

export function setSimPoVersion(v) {
      state.simPoVersion = v;
      if (state.mfgSimulationContext.active) mfgInvalidateLaunchApproval();
      renderPage();
    }

export function setSimBomVersion(v) {
      state.simBomVersion = v;
      if (state.mfgSimulationContext.active) mfgInvalidateLaunchApproval();
      renderPage();
    }

export function toggleVersionCompareFilter(type) { versionCompareFilters[type] = !versionCompareFilters[type]; renderPage(); }

export function setVersionCompareA(v) { if (state.openContext.compareType === 'po') state.poVersionCompareA = v; else state.bomVersionCompareA = v; renderPage(); }

export function setVersionCompareB(v) { if (state.openContext.compareType === 'po') state.poVersionCompareB = v; else state.bomVersionCompareB = v; renderPage(); }

export function swapVersionComparison() {
      if (state.openContext.compareType === 'po') [state.poVersionCompareA,state.poVersionCompareB] = [state.poVersionCompareB,state.poVersionCompareA];
      else [state.bomVersionCompareA,state.bomVersionCompareB] = [state.bomVersionCompareB,state.bomVersionCompareA];
      renderPage();
    }

export function backFromVersionCompare() {
      if (state.openContext.compareType === 'po') { state.activeTab.po = 'PO Versions'; navigate('po-workspace'); }
      else { state.activeTab.pn = 'BOM Versions'; navigate('pn-workspace'); }
    }

export function setVersionCompareSearch(v) { state.versionCompareSearch = v; renderPage(); }

export function toggleSimPo(id) { state.simSelectedPOs.has(id) ? state.simSelectedPOs.delete(id) : state.simSelectedPOs.add(id); renderPage(); }

export function toggleSimAllPos() {
      const list = POS.filter(p => p.project === state.simProject);
      const allSelected = list.length > 0 && list.every(p => state.simSelectedPOs.has(p.id));
      if (allSelected) { list.forEach(p => state.simSelectedPOs.delete(p.id)); } else { list.forEach(p => state.simSelectedPOs.add(p.id)); }
      renderPage();
    }

export function setSimSinglePo(id) { if (state.mfgSimulationContext.active) return; state.simSinglePO = id; renderPage(); }

export function toggleSimSource(key) {
      simSources[key] = !simSources[key];
      if (state.mfgSimulationContext.active) mfgInvalidateLaunchApproval();
      renderPage();
    }

export function setSimMode(mode) { if (state.mfgSimulationContext.active && mode !== 'current') return; state.simMode = mode; state.simResult = null; renderPage(); }

export function setSimPriorityRule(rule) { state.simPriorityRule = rule; renderPage(); }

export function setSimMeetingDate(v) {
      state.simMeetingDate = v;
      if (state.mfgSimulationContext.active) mfgInvalidateLaunchApproval();
      renderPage();
    }

export function setSimMeetingParticipants(v) {
      state.simMeetingParticipants = v;
      if (state.mfgSimulationContext.active) mfgInvalidateLaunchApproval();
      renderPage();
    }

export function setSimMeetingMinutes(v) {
      state.simMeetingMinutes = v;
      state.simMeetingSaved = false;
      if (state.mfgSimulationContext.active) mfgInvalidateLaunchApproval();
      const status = document.getElementById('simMeetingStatus');
      if (status) status.textContent = 'Unsaved changes — click Save Minutes.';
      const runButton = document.getElementById('simRunButton');
      if (runButton) runButton.disabled = true;
      const requirement = document.getElementById('simMeetingRequirement');
      if (requirement) requirement.textContent = 'Save the meeting minutes before running the simulation.';
    }

export function saveMeetingMinutes() {
      if (!state.simMeetingMinutes.trim()) {
        return openModal('Meeting minutes required', 'Enter meeting notes before saving.');
      }
      state.simMeetingMinutes = state.simMeetingMinutes.trim();
      state.simMeetingSaved = true;
      renderPage();
    }

export function setSimIncomingDraft(key, value) {
      state.simIncomingMaterialDraft[key] = value;
      renderPage();
    }

export function addSimIncomingMaterial() {
      if (!state.simIncomingMaterialDraft.material || state.simIncomingMaterialDraft.qty <= 0 || !state.simIncomingMaterialDraft.supplier) {
        return openModal('Invalid incoming material', 'Please provide a material code/name, quantity, and supplier.');
      }
      state.simIncomingMaterials = [...state.simIncomingMaterials, { ...state.simIncomingMaterialDraft, qty: Number(state.simIncomingMaterialDraft.qty), status: 'Expected' }];
      state.simIncomingMaterialDraft = { material: '', qty: 0, arrival: new Date().toISOString().slice(0, 10), supplier: '', status: 'Expected' };
      renderPage();
    }

export function removeSimIncomingMaterial(index) {
      state.simIncomingMaterials = state.simIncomingMaterials.filter((_, i) => i !== index);
      renderPage();
    }

export function getSimTargetPOs() {
      if (state.mfgSimulationContext.active) return POS.filter(p => p.id === mfgWizard.po);
      if (state.simScope === 'project') return POS.filter(p => p.project === state.simProject);
      if (state.simScope === 'selected') return POS.filter(p => state.simSelectedPOs.has(p.id));
      if (state.simScope === 'single') return POS.filter(p => p.id === state.simSinglePO);
      return [];
    }

export function simAvailableByMaterial() {
      const avail = {};
      MATERIALS.forEach(m => {
        let a = simSources.warehouse ? m.warehouse : 0;
        if (simSources.wip) a += m.cutman + m.wip;
        if (simSources.transit) a += m.transit;
        avail[m.code] = a;
      });
      if (state.simMode === 'future') {
        state.simIncomingMaterials.forEach(item => {
          if (avail[item.material] != null) avail[item.material] += Number(item.qty) || 0;
        });
      }
      return avail;
    }

export function simNetPoQty(po) {
      const prog = PO_LAUNCH_PROGRESS[po.id];
      if (!prog) return { netQty: 0, pn: null, alreadyLaunched: 0, enteredToManufacturing: 0, totalQty: 0 };
      const netQty = Math.max(0, prog.qty - prog.alreadyLaunched - prog.enteredToManufacturing);
      return { netQty, pn: prog.pn, alreadyLaunched: prog.alreadyLaunched, enteredToManufacturing: prog.enteredToManufacturing, totalQty: prog.qty };
    }

export function simRequirementPerUnit(pn) {
      const usage = BOM_USAGE[pn] || {};
      const req = {};
      Object.keys(usage).forEach(matCode => { req[matCode] = usage[matCode] * simSafetyCoef; });
      return req;
    }

export function runMfgLaunchSimulation() {
      const po = POS.find(item => item.id === mfgWizard.po);
      const selectedFgpns = [...new Set(mfgWizard.fgpns || [])];
      const fgpnPlan = selectedFgpns.map(fgpn => {
        const summary = mfgPnLaunchSummary(mfgWizard.po,fgpn);
        return { fgpn,qty:Number(mfgWizard.fgpnQtys?.[fgpn] || 0),ordered:summary.ordered,launched:summary.launched,reserved:summary.reserved,available:summary.remaining };
      });
      if (!po || !fgpnPlan.length || fgpnPlan.some(line => !(line.qty > 0) || line.qty > line.available)) {
        return openModal('Invalid manufacturing launch scope', 'Return to the instruction and verify every selected PN launch quantity.');
      }
      const availableByMaterial = simAvailableByMaterial();
      const materialRows = mfgMaterialsForSelection(mfgWizard.po,selectedFgpns,mfgWizard.fgpnQtys).map(row => {
        const required = Math.ceil(Number(row.required || 0) * simSafetyCoef);
        const available = Number(availableByMaterial[row.code] || 0);
        return { code:row.code,desc:row.desc,type:row.type,unit:row.unit,fgpns:[...row.fgpns],baseRequired:Number(row.required || 0),required,available,shortfall:Math.max(0,required-available) };
      });
      const missingRows = materialRows.filter(row => row.shortfall > 0);
      const totalRequired = materialRows.reduce((sum,row) => sum + row.required,0);
      const totalCovered = materialRows.reduce((sum,row) => sum + Math.min(row.required,row.available),0);
      const readiness = totalRequired > 0 ? Math.round((totalCovered/totalRequired)*100) : 0;
      const canLaunch = materialRows.length > 0 && missingRows.length === 0;
      const executedAt = new Date().toISOString().slice(0,16).replace('T',' ');
      state.simResult = {
        mode:'current',scope:'manufacturing_launch',targetPOs:[mfgWizard.po],project:mfgWizard.project,sources:{ ...simSources },safety:simSafetyCoef,
        poVersion:state.simUseCurrentVersions ? 'Current' : state.simPoVersion,bomVersion:state.simUseCurrentVersions ? 'Current' : state.simBomVersion,
        date:executedAt,executedBy:productionActor(),canLaunch,readiness,missingCount:missingRows.length,missingRows,materialRows,fgpnPlan,
        fingerprint:mfgLaunchFingerprint(),fullyLaunched:canLaunch ? 1 : 0,partiallyLaunched:0,notLaunched:canLaunch ? 0 : 1,
      };
      state.mfgLaunchSimulationResult = state.simResult;
      mfgWizard.approval = canLaunch ? { approved:true,fingerprint:mfgLaunchFingerprint(),approvedAt:executedAt,approvedBy:productionActor(),readiness } : null;
      AUDIT_LOGS.unshift({ id:`AUD-${AUDIT_LOGS.length + 12500}`,date:executedAt,user:productionActor(),module:'Simulation',action:canLaunch ? 'Manufacturing launch approved' : 'Manufacturing launch blocked',entity:`${mfgWizard.po} · ${selectedFgpns.join(', ')}`,project:mfgWizard.project,po:mfgWizard.po,details:`Launch-specific simulation for ${fgpnPlan.reduce((sum,line) => sum + line.qty,0).toLocaleString()} units; readiness ${readiness}%; ${missingRows.length} material shortfall${missingRows.length === 1 ? '' : 's'}.` });
      renderPage();
    }

export function runSimulation() {
      if (state.mfgSimulationContext.active && !state.simMeetingSaved) {
        openModal('Meeting minutes required', 'Return to the manufacturing instruction and save the meeting minutes before running its approval simulation.');
        return;
      }
      if (state.mfgSimulationContext.active) return runMfgLaunchSimulation();
      const rawTargetPOs = getSimTargetPOs();
      if (rawTargetPOs.length === 0) { return; }

      const pool = simAvailableByMaterial(); // shared stock pool, consumed as POs are allocated
      const priorityFn = SIM_PRIORITY_RULES[state.simPriorityRule].sort;
      const orderedPOs = [...rawTargetPOs].sort(priorityFn);

      const poResults = [];
      const materialLedger = {}; // tracks required/available/shortfall across all target POs combined

      orderedPOs.forEach(po => {
        const net = simNetPoQty(po);
        if (!net.pn || net.netQty <= 0) {
          poResults.push({ po, netQty: net.netQty, totalQty: net.totalQty, alreadyLaunched: net.alreadyLaunched, enteredToManufacturing: net.enteredToManufacturing, launchableQty: net.totalQty, result: net.netQty <= 0 ? 'Full' : 'None', missingMaterials: [] });
          return;
        }
        const perUnitReq = simRequirementPerUnit(net.pn);
        const matCodes = Object.keys(perUnitReq);

        // Determine the maximum units of this PO's net quantity the *current* shared pool can support.
        let maxUnits = net.netQty;
        matCodes.forEach(matCode => {
          const perUnit = perUnitReq[matCode];
          if (perUnit <= 0) return;
          const supportable = Math.floor((pool[matCode] || 0) / perUnit);
          maxUnits = Math.min(maxUnits, Math.max(0, supportable));
        });

        const launchableUnits = Math.max(0, Math.min(maxUnits, net.netQty));
        const result = launchableUnits >= net.netQty ? 'Full' : (launchableUnits > 0 ? 'Partial' : 'None');

        // Consume the pool for the units actually allocated to this PO.
        matCodes.forEach(matCode => {
          const perUnit = perUnitReq[matCode];
          pool[matCode] = (pool[matCode] || 0) - perUnit * launchableUnits;
        });

        // Record missing materials against this PO's FULL net requirement (not just what was
        // allocated), so the missing-material list reflects the true shortfall (M05-FR-07).
        const missingMaterials = matCodes.map(matCode => {
          const required = Math.ceil(perUnitReq[matCode] * net.netQty);
          const shortfall = Math.max(0, required - Math.ceil(perUnitReq[matCode] * launchableUnits));
          const mat = MATERIALS.find(m => m.code === matCode);
          if (!materialLedger[matCode]) materialLedger[matCode] = { code: matCode, desc: mat ? mat.desc : matCode, required: 0, available: pool[matCode] != null ? Math.max(0, pool[matCode]) : 0 };
          materialLedger[matCode].required += required;
          return { code: matCode, desc: mat ? mat.desc : matCode, required, availableAtAllocation: Math.max(0, Math.ceil(perUnitReq[matCode] * launchableUnits)), shortfall };
        }).filter(mm => mm.shortfall > 0);

        poResults.push({
          po, netQty: net.netQty, totalQty: net.totalQty, alreadyLaunched: net.alreadyLaunched, enteredToManufacturing: net.enteredToManufacturing,
          launchableQty: net.totalQty - net.netQty + launchableUnits, // already-progressed units + newly launchable units
          launchableUnitsThisRun: launchableUnits, remainingOpenQty: net.netQty - launchableUnits,
          result, missingMaterials,
        });
      });

      const originalPool = simAvailableByMaterial(); // pre-allocation snapshot, for reporting only
      const missingRows = Object.values(materialLedger).map(row => ({
        ...row,
        available: originalPool[row.code] != null ? originalPool[row.code] : 0,
        shortfall: Math.max(0, row.required - (originalPool[row.code] || 0)),
      })).filter(r => r.shortfall > 0);

      const fullyLaunched = poResults.filter(r => r.result === 'Full').length;
      const partiallyLaunched = poResults.filter(r => r.result === 'Partial').length;
      const notLaunched = poResults.filter(r => r.result === 'None').length;
      const canLaunch = poResults.length > 0 && notLaunched === 0 && partiallyLaunched === 0;
      const totalRequired = Object.values(materialLedger).reduce((s, r) => s + r.required, 0);
      const totalAvailableCapped = Object.values(materialLedger).reduce((s, r) => s + Math.min(originalPool[r.code] || 0, r.required), 0);
      const readiness = totalRequired > 0 ? Math.round((totalAvailableCapped / totalRequired) * 100) : 100;

      state.simResult = {
        mode: state.simMode,
        targetPOs: orderedPOs.map(p => p.id),
        project: state.simProject,
        scope: state.simScope,
        sources: { ...simSources },
        safety: simSafetyCoef,
        priorityRule: state.simPriorityRule,
        poVersion: state.simUseCurrentVersions ? 'Current' : state.simPoVersion,
        bomVersion: state.simUseCurrentVersions ? 'Current' : state.simBomVersion,
        date: '2026-07-15 ' + new Date().toTimeString().slice(0, 5),
        executedBy: 'A. Haddad',
        canLaunch, readiness,
        missingCount: missingRows.length,
        missingRows,
        poResults,
        fullyLaunched, partiallyLaunched, notLaunched,
        incomingMaterials: state.simMode === 'future' ? [...state.simIncomingMaterials] : [],
      };
      renderPage();
    }

export function exportMissingMaterialList() {
      if (!state.simResult || !state.simResult.missingRows || state.simResult.missingRows.length === 0) {
        openModal('Nothing to export', 'There are no missing materials in the current simulation result.');
        return;
      }
      const header = 'Material Part Number,Description,Required Quantity,Available Quantity,Shortfall Quantity\n';
      const lines = state.simResult.missingRows.map(r => `${r.code},"${(r.desc || '').replace(/"/g, '""')}",${r.required},${r.available},${r.shortfall}`).join('\n');
      const csv = header + lines;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `missing-materials_${state.simResult.targetPOs.join('-')}_${state.simResult.date.split(' ')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

export function generateFutureStockDraft() {
      if (!state.simResult || state.simResult.mode !== 'future') {
        openModal('Not available', 'Draft documents are only generated for future-stock simulations.');
        return;
      }
      const doc = {
        id: `DRAFT-${String(state.SIM_DRAFT_DOCUMENTS.length + 1).padStart(4, '0')}`,
        label: 'Based on real stock and planned future stock — not confirmed',
        date: state.simResult.date,
        project: state.simResult.project,
        pos: [...state.simResult.targetPOs],
        executedBy: state.simResult.executedBy,
        incomingMaterials: [...state.simResult.incomingMaterials],
        missingRows: [...state.simResult.missingRows],
        canLaunch: state.simResult.canLaunch,
      };
      state.SIM_DRAFT_DOCUMENTS = [doc, ...state.SIM_DRAFT_DOCUMENTS];
      openModal('Draft Document Generated', `${doc.id} has been generated and stored in the audit trail, clearly labeled "${doc.label}". No stored stock values were changed.`);
      renderPage();
    }

export function simScopeSummary() {
      const targetPOs = getSimTargetPOs();
      const versionText = state.simUseCurrentVersions
        ? `Using <strong>current</strong> PO and BOM versions.`
        : `Using <strong>PO ${state.simPoVersion}</strong> and <strong>BOM ${state.simBomVersion}</strong>.`;
      if (state.simScope === 'project') {
        return `Simulating <strong>${targetPOs.length}</strong> PO${targetPOs.length === 1 ? '' : 's'} across the entire <strong>${state.simProject}</strong> project. ${versionText}`;
      }
      if (state.simScope === 'selected') {
        return targetPOs.length > 0
          ? `Simulating <strong>${targetPOs.length}</strong> selected PO${targetPOs.length === 1 ? '' : 's'}: ${targetPOs.map(p => p.id).join(', ')}. ${versionText}`
          : `No purchase orders selected yet — check at least one below.`;
      }
      if (state.simScope === 'single') {
        return targetPOs.length > 0 ? `Simulating a single purchase order: <strong>${state.simSinglePO}</strong>. ${versionText}` : `Select a purchase order to simulate.`;
      }
      return '';
    }

export function pageSimLaunch() {
      const launchContext = state.mfgSimulationContext.active;
      const launchFgpns = launchContext ? (mfgWizard.fgpns || []) : [];
      const launchQty = launchContext ? launchFgpns.reduce((sum,fgpn) => sum + Number(mfgWizard.fgpnQtys?.[fgpn] || 0),0) : 0;
      const projectOptions = uniqueValues(PROJECTS, 'name');
      const projectPos = POS.filter(p => p.project === state.simProject);
      const allProjectPosSelected = projectPos.length > 0 && projectPos.every(p => state.simSelectedPOs.has(p.id));
      const targetPOs = getSimTargetPOs();
      const meetingReady = !launchContext || state.simMeetingSaved;
      const canRun = targetPOs.length > 0 && meetingReady && can('runSimulation') === true;
      const isMultiPo = targetPOs.length > 1;

      const configPanel = `
  <div class="sim-config-panel sim-control-card">
    <div class="sim-config-title">${launchContext ? 'Launch Check' : 'Simulation Setup'}</div>

    ${launchContext ? `<div class="sim-launch-scope">${icon('check','')}<div><strong class="mono">${mfgWizard.po}</strong><span>${launchFgpns.length} PN${launchFgpns.length === 1 ? '' : 's'} · ${launchQty.toLocaleString()} units</span></div></div>` : `
    <div class="sim-control-section">
      <label class="sim-field-label">Mode</label>
      <div class="sim-segmented sim-mode-switch">
        <button class="${state.simMode === 'current' ? 'active' : ''}" onclick="setSimMode('current')">Current Stock</button>
        <button class="${state.simMode === 'future' ? 'active' : ''}" onclick="setSimMode('future')">Future Stock</button>
      </div>
    </div>

    <div class="sim-control-section">
      <div class="sim-field">
        <label class="sim-field-label">Project</label>
        <select class="sim-select" onchange="setSimProject(this.value)">
          ${projectOptions.map(p => `<option value="${p}" ${state.simProject === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="sim-field">
        <label class="sim-field-label">Scope</label>
        <div class="sim-segmented sim-scope-switch">
          <button class="${state.simScope === 'project' ? 'active' : ''}" onclick="setSimScope('project')">Project</button>
          <button class="${state.simScope === 'selected' ? 'active' : ''}" onclick="setSimScope('selected')">Selected POs</button>
          <button class="${state.simScope === 'single' ? 'active' : ''}" onclick="setSimScope('single')">Single PO</button>
        </div>
      </div>
    </div>

    <div class="sim-control-section sim-version-section">
      <div class="sim-section-line"><label class="sim-field-label">Data Versions</label><label class="sim-compact-check"><input type="checkbox" ${state.simUseCurrentVersions ? 'checked' : ''} onchange="toggleSimUseCurrentVersions(this.checked)"> Current versions</label></div>
      <div class="sim-compact-grid">
        <div class="sim-field"><label class="sim-field-label">PO</label><select class="sim-select" onchange="setSimPoVersion(this.value)" ${state.simUseCurrentVersions ? 'disabled' : ''}>${PO_VERSION_HISTORY.map(v => `<option value="${v.version}" ${state.simPoVersion === v.version ? 'selected' : ''}>${v.version}${v.current ? ' · Current' : ''}</option>`).join('')}</select></div>
        <div class="sim-field"><label class="sim-field-label">BOM</label><select class="sim-select" onchange="setSimBomVersion(this.value)" ${state.simUseCurrentVersions ? 'disabled' : ''}>${BOM_VERSION_HISTORY.map(v => `<option value="${v.version}" ${state.simBomVersion === v.version ? 'selected' : ''}>${v.version}${v.current ? ' · Current' : ''}</option>`).join('')}</select></div>
      </div>
    </div>

    ${state.simScope === 'selected' ? `
    <div class="sim-control-section sim-field">
      <label class="sim-field-label">Purchase Orders</label>
      <div class="select-all-row" onclick="toggleSimAllPos()">
        <input type="checkbox" onclick="event.stopPropagation(); toggleSimAllPos()" ${allProjectPosSelected ? 'checked' : ''}/> Select All POs
      </div>
      <div class="po-check-list">
        ${projectPos.length ? projectPos.map(p => `
          <div class="po-check-row" onclick="toggleSimPo('${p.id}')">
            <input type="checkbox" onclick="event.stopPropagation(); toggleSimPo('${p.id}')" ${state.simSelectedPOs.has(p.id) ? 'checked' : ''}/>
            <span class="pc-id">${p.id}</span>
            <span class="pc-status">${statusBadge(p.status, p.statusType)}</span>
          </div>`).join('') : `<div style="padding:14px; font-size:12px; color:var(--ink-faint);">No POs for this project.</div>`}
      </div>
    </div>` : ''}

    ${state.simScope === 'single' ? `
    <div class="sim-control-section sim-field">
      <label class="sim-field-label">Purchase Order</label>
      <select class="sim-select" onchange="setSimSinglePo(this.value)" ${launchContext ? 'disabled' : ''}>
        ${projectPos.length ? projectPos.map(p => `<option value="${p.id}" ${state.simSinglePO === p.id ? 'selected' : ''}>${p.id} — ${p.status}</option>`).join('') : `<option value="">No POs for this project</option>`}
      </select>
    </div>` : ''}

    ${isMultiPo ? `
    <div class="sim-control-section sim-field">
      <label class="sim-field-label">Priority</label>
      <select class="sim-select" onchange="setSimPriorityRule(this.value)">
        ${Object.entries(SIM_PRIORITY_RULES).map(([key, r]) => `<option value="${key}" ${state.simPriorityRule === key ? 'selected' : ''}>${r.label}</option>`).join('')}
      </select>
    </div>` : ''}`}

    <div class="sim-control-section sim-field">
      <label class="sim-field-label">Stock Sources</label>
      <div class="sim-source-grid"><label class="source-check-row" onclick="toggleSimSource('warehouse')">
        <input type="checkbox" onclick="event.stopPropagation(); toggleSimSource('warehouse')" ${simSources.warehouse ? 'checked' : ''}/>
        <span class="src-label">Warehouse</span>
      </label>
      <label class="source-check-row" onclick="toggleSimSource('wip')">
        <input type="checkbox" onclick="event.stopPropagation(); toggleSimSource('wip')" ${simSources.wip ? 'checked' : ''}/>
        <span class="src-label">Usable WIP</span>
      </label>
      <label class="source-check-row" onclick="toggleSimSource('transit')">
        <input type="checkbox" onclick="event.stopPropagation(); toggleSimSource('transit')" ${simSources.transit ? 'checked' : ''}/>
        <span class="src-label">Transit</span>
      </label>
      ${state.simMode === 'future' ? `<label class="source-check-row"><input type="checkbox" checked disabled/><span class="src-label">Planned</span></label>` : ''}</div>
    </div>

    ${state.simMode === 'future' ? `
    <div class="sim-control-section sim-field sim-future-stock">
      <label class="sim-field-label">Planned Materials</label>
      <div class="sim-future-form">
        <div class="sim-future-fields">
          <select class="sim-select" onchange="setSimIncomingDraft('material', this.value)">
            ${MATERIALS.map(m => `<option value="${m.code}" ${state.simIncomingMaterialDraft.material === m.code ? 'selected' : ''}>${m.code}</option>`).join('')}
          </select>
          <input class="sim-select" type="number" min="0" placeholder="Qty" value="${state.simIncomingMaterialDraft.qty}" oninput="setSimIncomingDraft('qty', Number(this.value))" />
          <input class="sim-select" type="date" value="${state.simIncomingMaterialDraft.arrival}" onchange="setSimIncomingDraft('arrival', this.value)" />
          <input class="sim-select" type="text" placeholder="Supplier" value="${state.simIncomingMaterialDraft.supplier}" oninput="setSimIncomingDraft('supplier', this.value)" />
        </div>
        <div class="sim-future-actions">
          <select class="sim-select" onchange="setSimIncomingDraft('status', this.value)">
            <option value="Expected" ${state.simIncomingMaterialDraft.status === 'Expected' ? 'selected' : ''}>Expected</option>
            <option value="Confirmed" ${state.simIncomingMaterialDraft.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="Delayed" ${state.simIncomingMaterialDraft.status === 'Delayed' ? 'selected' : ''}>Delayed</option>
          </select>
          <button class="btn sm" onclick="addSimIncomingMaterial()">Add Material</button>
        </div>
        <div class="sim-future-table">
          <table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:var(--bg);"><th style="padding:10px; text-align:left;">Material</th><th style="padding:10px; text-align:left;">Qty</th><th style="padding:10px; text-align:left;">Arrival</th><th style="padding:10px; text-align:left;">Supplier</th><th style="padding:10px; text-align:left;">Status</th><th style="padding:10px; text-align:right;"> </th></tr></thead>
            <tbody>${state.simIncomingMaterials.map((item, index) => `
              <tr>
                <td class="mono" style="padding:10px;">${item.material}</td>
                <td class="mono" style="padding:10px;">${item.qty}</td>
                <td class="mono" style="padding:10px;">${item.arrival}</td>
                <td style="padding:10px;">${item.supplier}</td>
                <td style="padding:10px;">${item.status}</td>
                <td style="padding:10px; text-align:right;"><button class="btn sm" onclick="removeSimIncomingMaterial(${index})">Remove</button></td>
              </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>` : ''}

    <div class="sim-safety-row">
      <span>Safety Coefficient</span><strong>${simSafetyCoef}×</strong>
    </div>

    <div class="sim-run-area">
      ${can('runSimulation') === false ? '' : `<button id="simRunButton" class="sim-run-btn" ${canRun ? '' : 'disabled'} onclick="runSimulation()">${icon('sim', '')} ${launchContext ? 'Run Launch Approval Simulation' : `Run ${state.simMode === 'future' ? 'Future-Stock ' : ''}Simulation`}</button>`}
      ${can('runSimulation') === 'view' ? `<div class="locked-note">${icon('lock', '')} View only — your role cannot run simulations</div>` : ''}
      ${launchContext && !meetingReady && can('runSimulation') === true ? `<div class="sim-inline-warning">Meeting minutes must be saved in the manufacturing instruction.</div>` : ''}
    </div>
  </div>`;

      const resultPanel = state.simResult ? (state.simResult.scope === 'manufacturing_launch' ? mfgLaunchSimulationResultBlock(state.simResult) : simResultBlock(state.simResult)) : launchContext ? `
    <div class="card sim-empty-card">
      <div class="sim-empty-icon">${icon('sim', '')}</div>
      <div class="sim-empty-title">Launch check ready</div>
      <div class="sim-empty-copy">Confirm the stock sources and run the simulation.</div>
    </div>` : `
    <div class="card sim-empty-card">
      <div class="sim-empty-icon">${icon('sim', '')}</div>
      <div class="sim-empty-title">Ready to simulate</div>
      <div class="sim-empty-copy">Select the scope and run the material check.</div>
    </div>`;

      const enabledSources = [simSources.warehouse && 'Warehouse', simSources.wip && 'WIP', simSources.transit && 'Transit', state.simMode === 'future' && 'Planned'].filter(Boolean);

      return `
  <div class="page-title-row sim-page-head"><div><div class="page-title">${launchContext ? 'Manufacturing Launch Simulation' : 'Launch Simulation'}</div><div class="page-sub">${launchContext ? `${mfgWizard.po} · ${launchQty.toLocaleString()} units` : 'Material availability and launch capacity'}</div></div>
    ${launchContext ? `<button class="btn" onclick="returnToMfgInstruction()">${icon('chevLeft', '')} Return to Instruction</button>` : ''}
  </div>
  ${launchContext ? `<div class="mfg-sim-context"><div class="mfg-sim-context-main"><div class="mfg-sim-context-icon">${icon('sim','')}</div><div><strong>Launch Approval</strong><span>${mfgWizard.project}</span></div></div><div class="mfg-sim-context-stat"><span>Purchase Order</span><strong>${mfgWizard.po}</strong></div><div class="mfg-sim-context-stat"><span>Selected PNs</span><strong>${launchFgpns.length}</strong></div><div class="mfg-sim-context-stat"><span>Quantity</span><strong>${launchQty.toLocaleString()}</strong></div></div>` : ''}
  <div class="sim-overview-strip">
    <div class="sim-summary-card"><div class="sim-summary-top"><span class="sim-summary-label">Project</span>${icon('projects','')}</div><div class="sim-summary-value">${state.simProject}</div></div>
    <div class="sim-summary-card"><div class="sim-summary-top"><span class="sim-summary-label">Target</span>${icon('po','')}</div><div class="sim-summary-value">${launchContext ? `${launchFgpns.length} PNs · ${launchQty.toLocaleString()} units` : targetPOs.length ? `${targetPOs.length} purchase order${targetPOs.length===1?'':'s'}` : 'Not selected'}</div></div>
    <div class="sim-summary-card"><div class="sim-summary-top"><span class="sim-summary-label">Stock basis</span>${icon('stock','')}</div><div class="sim-summary-value">${enabledSources.join(' + ') || 'None'}</div></div>
    <div class="sim-summary-card"><div class="sim-summary-top"><span class="sim-summary-label">Safety Coefficient</span>${icon('scale','')}</div><div class="sim-summary-value">${simSafetyCoef}×</div></div>
  </div>
  <div class="sim-layout">
    ${configPanel}
    <div>${resultPanel}</div>
  </div>`;
    }

export function mfgLaunchSimulationResultBlock(res) {
      const totalLaunchQty = res.fgpnPlan.reduce((sum,line) => sum + Number(line.qty || 0),0);
      const decisionTone = res.canLaunch ? 'var(--success)' : 'var(--danger)';
      return `
  <div class="sim-result-hero">
    <div>
      <div class="sim-result-kicker">Manufacturing instruction check · ${res.date}</div>
      <div class="sim-result-title" style="color:${decisionTone}">${res.canLaunch ? 'Launch approved for this instruction' : 'Launch approval blocked'}</div>
      <div class="sim-result-copy">${res.canLaunch ? `The selected stock sources cover the materials required for the exact ${totalLaunchQty.toLocaleString()}-unit launch plan.` : `${res.missingCount} material shortfall${res.missingCount === 1 ? '' : 's'} must be resolved before this instruction can generate a delivery code.`}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
        ${statusBadge(res.canLaunch ? 'Approval recorded' : 'Approval not granted',res.canLaunch ? 'success' : 'danger')}
        ${statusBadge(`${res.fgpnPlan.length} selected PN${res.fgpnPlan.length === 1 ? '' : 's'}`,'info')}
      </div>
    </div>
    <div class="sim-result-ring" style="--pct:${Math.min(100,res.readiness)};--ring:${res.readiness >= 100 ? 'var(--success)' : res.readiness >= 60 ? 'var(--warning)' : 'var(--danger)'}"><span>${res.readiness}%</span></div>
  </div>
  <div class="sim-metadata-grid">
    <div class="sim-meta-card"><div class="sim-meta-label">Purchase Order</div><div class="sim-meta-value mono">${res.targetPOs[0]}</div></div>
    <div class="sim-meta-card"><div class="sim-meta-label">Partial launch</div><div class="sim-meta-value">${totalLaunchQty.toLocaleString()} units</div></div>
    <div class="sim-meta-card"><div class="sim-meta-label">Versions</div><div class="sim-meta-value">PO ${res.poVersion} · BOM ${res.bomVersion}</div></div>
    <div class="sim-meta-card"><div class="sim-meta-label">Safety coefficient</div><div class="sim-meta-value">${res.safety}×</div></div>
    <div class="sim-meta-card"><div class="sim-meta-label">Executed by</div><div class="sim-meta-value">${res.executedBy}</div></div>
    <div class="sim-meta-card"><div class="sim-meta-label">Decision</div><div class="sim-meta-value" style="color:${decisionTone}">${res.canLaunch ? 'Approved' : 'Blocked'}</div></div>
  </div>
  <div class="card" style="margin-bottom:16px;">
    <div class="section-title">PN Launch Scope <span class="hint">Approval applies only to these quantities</span></div>
    <div class="table-scroll"><table><thead><tr><th>Finished-Good PN</th><th>Ordered</th><th>Launched</th><th>Reserved</th><th>This Launch</th><th>Remaining After</th></tr></thead><tbody>
      ${res.fgpnPlan.map(line => `<tr><td class="mono" style="font-weight:750;">${line.fgpn}</td><td class="mono">${line.ordered.toLocaleString()}</td><td class="mono">${line.launched.toLocaleString()}</td><td class="mono">${line.reserved.toLocaleString()}</td><td class="mono" style="font-weight:800;color:var(--primary);">${line.qty.toLocaleString()}</td><td class="mono">${Math.max(0,line.available-line.qty).toLocaleString()}</td></tr>`).join('')}
    </tbody></table></div>
  </div>
  <div class="card">
    <div class="section-title">Material Approval Check <span class="hint">BOM requirement × ${res.safety} safety coefficient</span></div>
    <div class="table-scroll"><table><thead><tr><th>Material PN</th><th>Description</th><th>Linked PNs</th><th>Base Requirement</th><th>Controlled Requirement</th><th>Available</th><th>Shortfall</th><th>Status</th></tr></thead><tbody>
      ${res.materialRows.map(row => `<tr><td class="mono" style="font-weight:750;">${row.code}</td><td>${row.desc}</td><td><div class="mfg-pn-tags">${row.fgpns.map(fgpn => `<span class="mfg-pn-tag">${fgpn}</span>`).join('')}</div></td><td class="mono">${row.baseRequired.toLocaleString()} ${row.unit}</td><td class="mono">${row.required.toLocaleString()} ${row.unit}</td><td class="mono">${row.available.toLocaleString()} ${row.unit}</td><td class="mono" style="color:${row.shortfall ? 'var(--danger)' : 'var(--success)'};font-weight:750;">${row.shortfall ? row.shortfall.toLocaleString() : '0'} ${row.unit}</td><td>${statusBadge(row.shortfall ? 'Shortage' : 'Covered',row.shortfall ? 'danger' : 'success')}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="mfg-sim-result-actions">
      ${!res.canLaunch && res.missingRows.length ? `<button class="btn secondary" onclick="exportMissingMaterialList()">${icon('download','')} Export Shortages</button>` : '<span></span>'}
      <button class="btn ${res.canLaunch ? 'primary' : ''}" onclick="returnToMfgInstruction()">${icon(res.canLaunch ? 'check' : 'chevLeft','')} ${res.canLaunch ? 'Approval Complete · Return to Instruction' : 'Return to Instruction'}</button>
    </div>
  </div>`;
    }

export function simResultBlock(res) {
      const multiPo = res.targetPOs.length > 1;
      return `
  ${res.mode === 'future' ? `
  <div class="card" style="margin-bottom:16px; border:1.5px dashed var(--warning); background:var(--warning-light, #FFFBEB);">
    <div style="display:flex; align-items:center; gap:10px; font-weight:700; color:var(--brown, #92400E);">
      ${icon('history', '')} Future-stock planning result
    </div>
    <div style="margin-top:10px;"><button class="btn secondary sm" onclick="generateFutureStockDraft()">${icon('doc', '')} Generate Draft Document</button></div>
  </div>` : ''}
  <div class="sim-result-hero">
    <div>
      <div class="sim-result-kicker">Simulation decision · ${res.date}</div>
      <div class="sim-result-title" style="color:${res.canLaunch?'var(--success)':res.partiallyLaunched>0?'var(--warning)':'var(--danger)'}">${res.canLaunch ? 'Ready for full launch' : res.partiallyLaunched > 0 ? 'Partial launch is possible' : 'Launch is currently blocked'}</div>
      <div class="sim-result-copy">${multiPo ? `${res.fullyLaunched} of ${res.targetPOs.length} purchase orders can launch fully. ` : ''}${res.missingCount ? `${res.missingCount} material shortfall${res.missingCount===1?' requires':'s require'} attention.` : 'All required material is covered by the selected stock sources.'}</div>
      <div style="display:flex; gap:7px; flex-wrap:wrap; margin-top:12px;">
        ${statusBadge(`${res.fullyLaunched} full`,'success')}
        ${res.partiallyLaunched ? statusBadge(`${res.partiallyLaunched} partial`,'warning') : ''}
        ${res.notLaunched ? statusBadge(`${res.notLaunched} blocked`,'danger') : ''}
      </div>
    </div>
    <div class="sim-result-ring" style="--pct:${Math.min(100,res.readiness)};--ring:${res.readiness>=100?'var(--success)':res.readiness>=60?'var(--warning)':'var(--danger)'}"><span>${res.readiness}%</span></div>
  </div>
  <div class="sim-metadata-grid">
    <div class="sim-meta-card"><div class="sim-meta-label">Mode</div><div class="sim-meta-value">${res.mode === 'future' ? 'Future-stock planning' : 'Current real stock'}</div></div>
    <div class="sim-meta-card"><div class="sim-meta-label">Project</div><div class="sim-meta-value">${res.project}</div></div>
    <div class="sim-meta-card"><div class="sim-meta-label">Purchase orders</div><div class="sim-meta-value mono">${res.targetPOs.join(', ')}</div></div>
    <div class="sim-meta-card"><div class="sim-meta-label">Versions</div><div class="sim-meta-value">PO ${res.poVersion} · BOM ${res.bomVersion}</div></div>
    <div class="sim-meta-card"><div class="sim-meta-label">Safety coefficient</div><div class="sim-meta-value">${res.safety}×</div></div>
    <div class="sim-meta-card"><div class="sim-meta-label">Executed by</div><div class="sim-meta-value">${res.executedBy}</div></div>
  </div>
  <div class="card" style="margin-bottom:16px;">
    <div class="section-title">Readiness <span class="hint">${res.readiness}% of required materials available</span></div>
    <div class="progress-track" style="height:14px;"><div class="progress-fill" style="width:${Math.min(100, res.readiness)}%; background:${res.readiness >= 100 ? 'var(--success)' : res.readiness >= 60 ? 'var(--warning)' : 'var(--danger)'};"></div></div>
  </div>
  <div class="card" style="margin-bottom:16px;">
    <div class="section-title">Purchase Order Breakdown</div>
    <table>
      <thead><tr><th>PO</th><th>Ordered Qty</th><th>Already Launched</th><th>Entered to Mfg</th><th>Net Qty to Launch</th><th>Launchable Now</th><th>Remaining Open Qty</th><th>Result</th></tr></thead>
      <tbody>
        ${res.poResults.map(r => `<tr class="clickable-row" onclick="navigate('po-detail')">
            <td class="mono">${r.po.id}</td>
            <td class="mono">${r.totalQty.toLocaleString()}</td>
            <td class="mono">${r.alreadyLaunched.toLocaleString()}</td>
            <td class="mono">${r.enteredToManufacturing.toLocaleString()}</td>
            <td class="mono">${r.netQty.toLocaleString()}</td>
            <td class="mono">${(r.launchableUnitsThisRun != null ? r.launchableUnitsThisRun : r.netQty).toLocaleString()}</td>
            <td class="mono" style="color:${r.remainingOpenQty > 0 ? 'var(--warning)' : 'var(--ink-soft)'};">${(r.remainingOpenQty || 0).toLocaleString()}</td>
            <td>${statusBadge(r.result === 'Full' ? 'Fully Launchable' : r.result === 'Partial' ? 'Partially Launchable' : 'Not Launchable', r.result === 'Full' ? 'success' : r.result === 'Partial' ? 'warning' : 'danger')}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="card">
    <div class="section-title">Missing Materials</div>
    ${res.missingRows.length === 0 ? `<div class="e-sub" style="padding:10px 0;">No missing materials — all requirements are covered by the included stock sources.</div>` : `
    <table>
      <thead><tr><th>Material PN</th><th>Description</th><th>Required Qty</th><th>Available Qty</th><th>Shortfall Qty</th></tr></thead>
      <tbody>
        ${res.missingRows.map(m => `<tr class="clickable-row" onclick="navigate('material-detail')">
            <td class="mono">${m.code}</td><td>${m.desc}</td><td class="mono">${m.required.toLocaleString()}</td>
            <td class="mono">${m.available.toLocaleString()}</td>
            <td class="mono" style="color:var(--danger); font-weight:700;">${m.shortfall.toLocaleString()}</td>
          </tr>`).join('')}
      </tbody>
    </table>`}
    <div style="margin-top:14px; display:flex; justify-content:flex-end;">
      ${permBtn('exportMissingMaterialList', 'Export Missing Material List', 'download', 'exportMissingMaterialList()')}
    </div>
  </div>`;
    }
