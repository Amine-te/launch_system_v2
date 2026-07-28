/* ==========================================================================
   parts-bom.js
   ========================================================================== */

import { treeOpen } from '../components/nav-config.js';
import { bomImportedDashboard, bomMaterialTable, canWriteProject, pnsForPo, poBomReadiness, posForProject, projectBomReadiness, projectForContext, visibleProjects } from '../components/shared-tables.js';
import { MATERIALS, PNS, POS } from '../data/mock-data.js';
import { PROJECTS } from '../data/projects-store.js';
import { projectExplorer, workspaceTabs } from './projects.js';
import { auditContextEvents, bomVersionRecords, bomVersionRows, bomVersionsWorkspace, poVersionRecords, poVersionRows, traceabilityWorkspace } from './purchase-orders.js';
import { renderPage } from './router.js';
import { state } from '../state.js';
import { statusBadge } from '../utils/helpers.js';
import { chevTree, icon } from '../utils/icons.js';
import { permBtn } from '../utils/permissions.js';
import { emptyStateBlock, tableExportActions } from '../utils/table-helpers.js';
import { versionCompareFilters } from '../utils/table-state.js';

export function pagePnWorkspace() {
      const pnId = state.openContext.pn;
      const pn = PNS.find(p => p.pn === pnId) || PNS[0];
      const parentPo = POS.find(po => po.id === pn.po) || POS[0];
      const pnProject = PROJECTS.find(project => project.name === pn.project) || PROJECTS[0];
      const writable = canWriteProject(pnProject);
      const pnMaterials = MATERIALS.filter(material => material.pns.includes(pn.pn));
      const tab = state.activeTab.pn;
      let tabContent = '';

      if (tab === 'Overview') {
        tabContent = `<div class="grid g2" style="grid-template-columns:1.1fr .9fr;">
          <div class="card"><div class="section-title">Part Number information</div>
            <div class="detail-grid">
              <div><span>Project</span><strong>${pn.project}</strong></div><div><span>Purchase Order</span><strong class="mono">${pn.po}</strong></div>
              <div><span>Ordered Quantity</span><strong class="mono">${pn.qty.toLocaleString()}</strong></div><div><span>Operational Status</span>${statusBadge(pn.status,pn.statusType)}</div>
            </div>
          </div>
          <div class="card"><div class="section-title">Mandatory BOM</div>
            <div class="pn-bom-state ${pn.bom === 'Uploaded' ? 'ready' : 'missing'}">${icon(pn.bom === 'Uploaded' ? 'check' : 'audit','')}<div><strong>${pn.bom === 'Uploaded' ? 'Validated BOM available' : 'BOM mapping required'}</strong><span>${pn.bom === 'Uploaded' ? `${pn.bomFile} · ${pn.version} · ${pn.bomUpdated}` : 'Provide an individual PN BOM or upload the parent PO BOM workbook containing this FGPN.'}</span></div></div>
            ${pn.bom !== 'Uploaded' && writable ? `<div class="attention-actions">${permBtn('uploadBom','Upload PN BOM','upload',`openPnBomUpload('${pn.pn}')`,'primary')}${permBtn('uploadBom','Upload Parent PO BOM','bom',`openPoBomUploader('${pn.po}')`)}</div>` : ''}
          </div>
        </div>`;
      } else if (tab === 'BOM') {
        tabContent = pn.bom === 'Uploaded' ? `${bomImportedDashboard('pn',pnId)}<div class="grid g2" style="grid-template-columns:1fr 1fr;">
      <div class="card">
        <div class="section-title">Authoritative BOM Structure <span class="hint">${pn.bomFile}</span></div>
        ${miniTree(pnId, pn.desc)}
      </div>
      <div class="card">
        <div class="section-title"><span>Materials used by ${pnId}</span>${pnMaterials.length ? tableExportActions('pnBomMaterialsTable',`${pnId} PN BOM Materials`) : ''}</div>
        ${pnMaterials.length ? bomMaterialTable(['code', 'desc', 'required', 'missing'], pnMaterials,'pnBomMaterialsTable') : emptyStateBlock('No preview rows in this sample', 'The BOM file is validated; material lines will appear here after parsing.', null)}
      </div>
    </div>` : `<div class="card bom-required-empty">
      ${icon('bom','')}
      <div><strong>No BOM mapping is attached to ${pn.pn}</strong><span>This FGPN needs material rows containing Material PN, usage quantity and unit. Supply them through an individual PN BOM or through the parent PO BOM workbook.</span></div>
      ${writable ? `<div class="attention-actions">${permBtn('uploadBom','Upload PN BOM','upload',`openPnBomUpload('${pn.pn}')`,'primary')}${permBtn('uploadBom','Upload Parent PO BOM','bom',`openPoBomUploader('${pn.po}')`)}</div>` : statusBadge('Read-only · BOM required','warning')}
    </div>`;
      } else if (tab === 'Materials') {
        tabContent = `<div class="card"><div class="section-title"><span>Materials</span>${tableExportActions('pnMaterialsTable',`${pnId} Materials`)}</div>${bomMaterialTable(null,null,'pnMaterialsTable')}</div>`;
      } else if (tab === 'BOM Versions') {
        tabContent = pn.bom === 'Uploaded' ? bomVersionsWorkspace(pn,writable) : `<div class="card">${emptyStateBlock('No BOM versions', 'Upload the first validated PN BOM to start version history.', null)}</div>`;
      } else if (tab === 'History') {
        tabContent = traceabilityWorkspace(auditContextEvents({ pn:pnId }),`${pnId} part-number history`,'pnCompleteHistoryTable');
      } else if (tab === 'Simulation') {
        tabContent = `<div class="card">
      <div class="section-title">Simulation</div>
      <p style="font-size:12.5px; color:var(--ink-soft); margin-bottom:12px;">Run a launch simulation scoped to the parent PO of ${pnId}.</p>
      ${permBtn('runSimulation', 'Run Simulation', null, `simScope='single'; simSinglePO='${state.openContext.po}'; navigate('sim-launch')`, 'primary')}
    </div>`;
      }

      return `
  <div class="workspace-layout">
    ${projectExplorer('pn', pnId)}
    <div>
      <div class="workspace-header">
        <div class="ws-header-grid" style="width:100%;">
          <div>
            <span class="ws-id">${pnId}</span>
            <div class="ws-title">${pn.desc}</div>
            <div class="ws-meta">
              <div class="ws-meta-item"><span class="l">Quantity</span><span class="v mono">${pn.qty.toLocaleString()}</span></div>
              <div class="ws-meta-item"><span class="l">Project</span><span class="v">${pn.project}</span></div>
              <div class="ws-meta-item"><span class="l">Parent PO</span><span class="v mono">${parentPo.id}</span></div>
              <div class="ws-meta-item"><span class="l">Current BOM Version</span><span class="v mono">${pn.version}</span></div>
              <div class="ws-meta-item"><span class="l">BOM Requirement</span>${statusBadge(pn.bom === 'Uploaded' ? 'Validated' : 'Required', pn.bom === 'Uploaded' ? 'success' : 'warning')}</div>
              <div class="ws-meta-item"><span class="l">Status</span>${statusBadge(pn.status, pn.statusType)}</div>
            </div>
          </div>
          <div class="ws-actions-row">
            ${writable ? permBtn('uploadBom', 'Upload BOM', 'upload', `openPnBomUpload('${pnId}')`) : ''}
            ${pn.bom === 'Uploaded' ? `<button class="btn" onclick="showPnTab('BOM Versions')">${icon('history','')} BOM Versions</button>` : ''}
            ${writable ? permBtn('runSimulation', 'Run Simulation', null, `simScope='single'; simSinglePO='${state.openContext.po}'; navigate('sim-launch')`, 'primary') : ''}
          </div>
        </div>
      </div>
      ${workspaceTabs(['Overview', 'BOM', 'BOM Versions', 'Simulation', 'History'], tab, 'showPnTab')}
      ${tabContent}
    </div>
  </div>`;
    }

export function miniTree(pnId, desc) {
      return `<div class="bom-tree">
    <div class="tree-row"><span class="tw open">${chevTree}</span><span class="t-label">${pnId}</span><span class="t-meta">${desc}</span></div>
    <div class="tree-children open">
      ${MATERIALS.slice(0, 3).map(m => `<div class="tree-row" onclick="navigate('material-detail')"><span style="width:14px"></span><span class="t-label mono" style="font-size:12px;">${m.code}</span><span class="t-meta">${m.desc}</span></div>`).join('')}
    </div>
  </div>`;
    }

export function pageBomTree() {
      const project = projectForContext();
      const projectPos = posForProject(project.name);
      return `
  <div class="card">
    <div class="section-title">Hierarchy <span class="hint">Project → PO BOM → FGPN → Materials</span></div>
    <div class="aggregate-explainer compact">${icon('bom','')}<div><strong>Traceable BOM lineage</strong><span>Each material row is traced to its Finished Good Part Number and the validated PO BOM or individual PN BOM version that supplied it.</span></div></div>
    <div class="bom-tree">
      <div class="tree-row" onclick="toggleTree('proj')"><span class="tw ${treeOpen.proj ? 'open' : ''}">${chevTree}</span><span class="t-label">${project.name}</span><span class="t-meta">Project · ${projectBomReadiness(project.name).percent}% PN BOM coverage</span></div>
      <div class="tree-children ${treeOpen.proj ? 'open' : ''}">
        ${projectPos.map((po, poIndex) => { const poKey = 'po-' + po.id; const ready = poBomReadiness(po.id); return `
          <div class="tree-row" onclick="toggleTree('${poKey}')"><span class="tw ${treeOpen[poKey] ? 'open' : ''}">${chevTree}</span><span class="t-label mono">${po.id}</span><span class="t-meta">PO BOM (uploaded or generated) · ${ready.ready ? 'Ready' : ready.missing.length + ' FGPN mapping missing'}</span></div>
          <div class="tree-children ${treeOpen[poKey] ? 'open' : ''}">
            ${pnsForPo(po.id).map((p, pnIndex) => { const pnKey = `pn-${poIndex}-${pnIndex}`; const linkedMaterials = MATERIALS.filter(m => m.pns.includes(p.pn)); return `
              <div class="tree-row" onclick="toggleTree('${pnKey}')"><span class="tw ${treeOpen[pnKey] ? 'open' : ''}">${chevTree}</span><span class="t-label mono">${p.pn}</span><span class="t-meta">${p.desc} · ${statusBadge(p.bom === 'Uploaded' ? p.version : 'BOM required', p.bom === 'Uploaded' ? 'success' : 'warning')}</span></div>
              <div class="tree-children ${treeOpen[pnKey] ? 'open' : ''}">
                ${p.bom !== 'Uploaded' ? `<div class="tree-row"><span style="width:14px"></span><span class="t-meta">Upload a PN BOM or a PO BOM containing this FGPN to reveal material lines.</span></div>` : (linkedMaterials.length ? linkedMaterials : MATERIALS.slice(0,2)).map(m => `<div class="tree-row" onclick="navigate('material-detail')"><span style="width:14px"></span><span class="t-label mono" style="font-size:12px;">${m.code}</span><span class="t-meta">${m.desc} · required ${m.required}</span></div>`).join('')}
              </div>`; }).join('')}
          </div>`; }).join('')}
      </div>
    </div>
  </div>`;
    }

export function toggleTree(key) { treeOpen[key] = !treeOpen[key]; renderPage(); }

export function pageBomPo() {
      const availablePos = POS.filter(po => visibleProjects().some(project => project.name === po.project));
      const selectedPo = availablePos.find(po => po.id === state.openContext.po) || availablePos[0] || POS[0];
      state.openContext.po = selectedPo.id; state.openContext.project = selectedPo.project;
      return `
  <div class="card" style="margin-bottom:16px;">
    <div class="section-title">Select PO</div>
    <div style="display:flex; gap:10px; align-items:center;">
      <select onchange="openContext.po=this.value; openContext.project=POS.find(po=>po.id===this.value).project; renderPage()" style="flex:1; padding:8px 10px; border:1px solid var(--border); border-radius:7px; font-size:13px;">
        ${availablePos.map(po => `<option value="${po.id}" ${po.id === selectedPo.id ? 'selected' : ''}>${po.id} — ${po.project}</option>`).join('')}
      </select>
      ${canWriteProject(PROJECTS.find(project => project.name === selectedPo.project)) ? `<button class="btn" onclick="openPoBomUploader('${selectedPo.id}')">${icon('upload','')} Upload PO BOM</button>` : ''}
      <button class="btn primary" onclick="openModal('PO BOM generated', 'A PO BOM version was generated from the validated PN BOM mappings.')">Generate from PN BOMs</button>
    </div>
  </div>
  <div class="card">
    <div class="section-title">PO BOM Preview <span class="hint">Uploaded or generated version</span></div>
    ${bomMaterialTable()}
    <div style="margin-top:14px; display:flex; justify-content:flex-end;"><button class="btn primary">Export</button></div>
  </div>`;
    }

export function buildVersionDiffs(kind, contextId, versionA, versionB) {
      const isPo = kind === 'po';
      const context = isPo ? (POS.find(item => item.id === contextId) || POS[0]) : (PNS.find(item => item.pn === contextId) || PNS[0]);
      const rowsA = isPo ? poVersionRows(context,versionA) : bomVersionRows(context,versionA);
      const rowsB = isPo ? poVersionRows(context,versionB) : bomVersionRows(context,versionB);
      const key = isPo ? 'pn' : 'material';
      const fields = isPo
        ? [['description','Description'],['quantity','Quantity'],['unit','Unit'],['dueDate','Due Date'],['customerRef','Customer Reference']]
        : [['description','Description'],['materialType','Material Type'],['usageQty','Usage Quantity'],['unit','Unit'],['supplier','Supplier'],['revision','Revision']];
      const mapA = new Map(rowsA.map(row => [row[key],row]));
      const mapB = new Map(rowsB.map(row => [row[key],row]));
      const keys = [...new Set([...mapA.keys(),...mapB.keys()])];
      const diffs = [];
      keys.forEach(recordKey => {
        const before = mapA.get(recordKey), after = mapB.get(recordKey);
        if (!before) {
          diffs.push({ key:recordKey, field:isPo ? 'PO line item' : 'BOM material', old:'—', new:after.description, change:'Added' });
          return;
        }
        if (!after) {
          diffs.push({ key:recordKey, field:isPo ? 'PO line item' : 'BOM material', old:before.description, new:'—', change:'Removed' });
          return;
        }
        let changed = false;
        fields.forEach(([field,label]) => {
          if (String(before[field] ?? '') !== String(after[field] ?? '')) {
            diffs.push({ key:recordKey, field:label, old:String(before[field] ?? '—'), new:String(after[field] ?? '—'), change:'Modified' });
            changed = true;
          }
        });
        if (!changed) diffs.push({ key:recordKey, field:'All fields', old:'No change', new:'No change', change:'Unchanged' });
      });
      return diffs;
    }

export function pageVersionCompare() {
      const isPo = state.openContext.compareType === 'po';
      const contextId = isPo ? state.openContext.po : state.openContext.pn;
      const context = isPo ? (POS.find(item => item.id === contextId) || POS[0]) : (PNS.find(item => item.pn === contextId) || PNS[0]);
      const versions = isPo ? poVersionRecords(context) : bomVersionRecords(context);
      let compareA = isPo ? state.poVersionCompareA : state.bomVersionCompareA;
      let compareB = isPo ? state.poVersionCompareB : state.bomVersionCompareB;
      if (!versions.some(item => item.version === compareA)) compareA = versions[1]?.version || versions[0].version;
      if (!versions.some(item => item.version === compareB)) compareB = versions[0].version;
      if (isPo) { state.poVersionCompareA = compareA; state.poVersionCompareB = compareB; } else { state.bomVersionCompareA = compareA; state.bomVersionCompareB = compareB; }
      const dataList = buildVersionDiffs(isPo ? 'po' : 'bom',contextId,compareA,compareB);
      const filteredDiffs = dataList.filter(item => (versionCompareFilters[item.change] || false) && (!state.versionCompareSearch || Object.values(item).some(value => String(value).toLowerCase().includes(state.versionCompareSearch.toLowerCase()))));
      const itemCount = change => new Set(dataList.filter(item => item.change === change).map(item => item.key)).size;
      const contextTitle = isPo ? `${context.id} line-item comparison` : `${context.pn} material-structure comparison`;
      const subtitle = isPo ? `${context.id} · ${context.project} · purchase-order line items` : `${context.pn} · ${context.project} · BOM material structure`;
      const itemLabel = isPo ? 'Part Number' : 'Material PN';
      const domainLabel = isPo ? 'PO Versions Only' : 'BOM Versions Only';
      const filters = ['Added','Modified','Removed','Unchanged'];
      return `<div class="version-comparison-shell">
        <div class="version-comparison-hero"><div class="version-domain-title"><div class="version-domain-icon ${isPo ? '' : 'bom'}">${icon(isPo ? 'FileText' : 'bom','')}</div><div><span>${domainLabel}</span><h2>${contextTitle}</h2><p>${subtitle}</p></div></div><button class="btn" onclick="backFromVersionCompare()">${icon('chevLeft','')} Back to ${isPo ? 'PO Versions' : 'BOM Versions'}</button></div>
        <div class="card version-comparison-controls"><div class="version-compare-field"><label>${isPo ? 'PO' : 'BOM'} version A</label><select onchange="setVersionCompareA(this.value)">${versions.map(item => `<option value="${item.version}" ${item.version === compareA ? 'selected' : ''}>${item.version} · ${item.date}</option>`).join('')}</select></div><button class="btn" onclick="swapVersionComparison()" title="Swap compared versions">${icon('refresh','')}</button><div class="version-compare-field"><label>${isPo ? 'PO' : 'BOM'} version B</label><select onchange="setVersionCompareB(this.value)">${versions.map(item => `<option value="${item.version}" ${item.version === compareB ? 'selected' : ''}>${item.version}${item.current ? ' · Current' : ''}</option>`).join('')}</select></div><span>${statusBadge(`${compareA} → ${compareB}`,isPo ? 'info' : 'purple')}</span></div>
        <div class="version-comparison-summary"><div class="version-change-metric"><span>${isPo ? 'Added PNs' : 'Added materials'}</span><strong>${itemCount('Added')}</strong></div><div class="version-change-metric"><span>${isPo ? 'Modified PNs' : 'Modified materials'}</span><strong>${itemCount('Modified')}</strong></div><div class="version-change-metric"><span>${isPo ? 'Removed PNs' : 'Removed materials'}</span><strong>${itemCount('Removed')}</strong></div><div class="version-change-metric"><span>Unchanged</span><strong>${itemCount('Unchanged')}</strong></div></div>
        <div class="card"><div class="section-title"><span>${isPo ? 'PO line-item changes' : 'BOM material changes'}</span>${tableExportActions('versionComparisonTable',`${contextId} ${compareA} to ${compareB} ${isPo ? 'PO' : 'BOM'} Comparison`)}</div><div class="compare-filter-row"><div class="compare-filter-group">${filters.map(type => `<button class="compare-filter ${versionCompareFilters[type] ? 'active' : ''}" onclick="toggleVersionCompareFilter('${type}')">${type}</button>`).join('')}</div><div class="compare-control compare-search"><input type="text" placeholder="Search ${isPo ? 'part number' : 'material'} or field…" value="${state.versionCompareSearch}" oninput="setVersionCompareSearch(this.value)"></div></div><div class="table-scroll"><table id="versionComparisonTable" class="compare-table"><thead><tr><th>${itemLabel}</th><th>Field</th><th>${compareA.toUpperCase()}</th><th>${compareB.toUpperCase()}</th><th>Change</th></tr></thead><tbody>${filteredDiffs.length ? filteredDiffs.map(item => `<tr><td class="mono"><strong>${item.key}</strong></td><td>${item.field}</td><td class="${item.change === 'Removed' ? 'diff-old' : item.change === 'Modified' ? 'diff-modified' : 'diff-unchanged'}">${item.old}</td><td class="${item.change === 'Added' ? 'diff-new' : item.change === 'Modified' ? 'diff-modified' : item.change === 'Removed' ? 'diff-removed' : 'diff-unchanged'}">${item.new}</td><td>${statusBadge(item.change,item.change === 'Added' ? 'success' : item.change === 'Removed' ? 'danger' : item.change === 'Modified' ? 'warning' : 'neutral')}</td></tr>`).join('') : `<tr><td colspan="5"><div class="empty-state" style="padding:24px;"><div class="e-title">No matching changes</div><div class="e-sub">Adjust the change filters or search.</div></div></td></tr>`}</tbody></table></div></div>
      </div>`;
    }
