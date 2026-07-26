/* ==========================================================================
   audit.js
   ========================================================================== */

import { navigate } from '../components/nav-render.js';
import { BUSINESS_RULES } from '../data/mock-data.js';
import { poEsc } from './po-intake.js';
import { auditArtifactButtons, completeAuditEvents, traceabilityTimeline } from './purchase-orders.js';
import { renderPage } from './router.js';
import { state } from '../state.js';
import { statusBadge } from '../utils/helpers.js';
import { icon } from '../utils/icons.js';
import { can } from '../utils/permissions.js';
import { emptyStateBlock, filterChips, paginationBar, sortRows } from '../utils/table-helpers.js';
import { PAGE_SIZE, auditSort } from '../utils/table-state.js';

export function auditScopedRows() {
      const scope = can('viewAudit');
      const rows = completeAuditEvents();
      if (scope === 'all') return rows;
      if (scope === 'assigned') return rows.filter(a => ['BMW X5', 'Dacia Sandero'].includes(a.project) || a.project === '—');
      if (scope === 'warehouse') return rows.filter(a => /Manufacturing|Warehouse|Reception|Stock/i.test(a.module));
      if (scope === 'own') return rows.filter(a => a.user === 'A. Haddad');
      return rows;
    }

export function setAuditSearch(v) { state.auditFilters.search = v; state.auditPage = 1; renderPage(); }

export function setAuditFilter(key, v) { state.auditFilters[key] = v; state.auditPage = 1; renderPage(); }

export function clearAuditFilter(key) { state.auditFilters[key] = ''; state.auditPage = 1; renderPage(); }

export function resetAuditFilters() { state.auditFilters = { search: '', module: '', project: '', po: '', pn: '', user: '', evidence: '', date: '' }; state.auditPage = 1; renderPage(); }

export function sortAudit(key) { auditSort.dir = (auditSort.key === key) ? -auditSort.dir : 1; auditSort.key = key; renderPage(); }

export function setAuditPage(n) { state.auditPage = Math.max(1, n); renderPage(); }

export function filterAudit() {
      const f = state.auditFilters;
      return auditScopedRows().filter(a => {
        if (f.search && !(`${a.id} ${a.entity} ${a.details} ${a.action} ${a.actor} ${a.artifacts.map(item => item.name).join(' ')}`.toLowerCase().includes(f.search.toLowerCase()))) return false;
        if (f.module && a.module !== f.module) return false;
        if (f.project && a.project !== f.project) return false;
        if (f.po && a.po !== f.po) return false;
        if (f.pn && !a.pns.includes(f.pn)) return false;
        if (f.user && a.user !== f.user) return false;
        if (f.evidence === 'with' && !a.artifacts.length) return false;
        if (f.evidence === 'without' && a.artifacts.length) return false;
        if (f.date && !a.date.startsWith(f.date)) return false;
        return true;
      });
    }

export function auditTable(list) {
      if (list.length === 0) return emptyStateBlock('No audit entries', 'No activity recorded for this view yet.', null);
      return `<div class="table-scroll"><table class="audit-ledger-table"><thead><tr><th>Date & time</th><th>Person</th><th>Module & action</th><th>Project / PO / PN</th><th>Evidence</th><th></th></tr></thead>
    <tbody>${list.map(a => `<tr class="clickable-row" onclick="openAuditDetail('${a.id}')">
      <td class="mono audit-date-cell">${poEsc(a.date)}</td>
      <td><div class="audit-person"><span>${poEsc(String(a.actor).split(/\s+/).map(part => part[0]).join('').slice(0,2).toUpperCase())}</span><div><strong>${poEsc(a.actor)}</strong><small>${poEsc(a.role)}</small></div></div></td>
      <td><div class="audit-action-cell"><span>${poEsc(a.module)}</span><strong>${poEsc(a.action)}</strong><small>${poEsc(a.details)}</small></div></td>
      <td><div class="audit-scope-cell"><strong>${poEsc(a.project)}</strong>${a.po !== '—' ? `<span class="mono">${poEsc(a.po)}</span>` : ''}${a.pns.length ? `<small class="mono">${poEsc(a.pns.slice(0,3).join(', '))}${a.pns.length > 3 ? ` +${a.pns.length - 3}` : ''}</small>` : ''}</div></td>
      <td>${a.artifacts.length ? `<span class="audit-proof-count">${icon('doc','')}${a.artifacts.length} file${a.artifacts.length === 1 ? '' : 's'}</span>` : '<span class="audit-no-proof">No file</span>'}</td>
      <td><div class="icon-btn" title="Open complete record" onclick="stop(event); openAuditDetail('${a.id}')">${icon('view', '')}</div></td>
    </tr>`).join('')}</tbody></table></div>`;
    }

export function auditUnique(rows,key) { return [...new Set(rows.map(row => row[key]).filter(value => value && value !== '—'))].sort(); }

export function pageAuditLogs() {
      const scope = can('viewAudit');
      const sourceRows = auditScopedRows();
      const rows = sortRows(filterAudit(), auditSort);
      const total = rows.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      state.auditPage = Math.min(state.auditPage, totalPages);
      const pageRows = rows.slice((state.auditPage - 1) * PAGE_SIZE, state.auditPage * PAGE_SIZE);
      const actors = new Set(sourceRows.map(row => row.actor)).size;
      const proofs = sourceRows.reduce((sum,row) => sum + row.artifacts.length,0);
      const projects = new Set(sourceRows.map(row => row.project).filter(project => project !== '—')).size;
      const pnOptions = [...new Set(sourceRows.flatMap(row => row.pns))].sort();

      return `
  <section class="audit-page-shell">
    <div class="audit-page-head"><div><span>Audit & Traceability</span><h2>Application Activity Ledger</h2></div><button class="btn" onclick="exportNotice()">${icon('download','')} Export ledger</button></div>
    <div class="audit-kpi-grid"><div><span>Recorded events</span><strong>${sourceRows.length}</strong></div><div><span>People identified</span><strong>${actors}</strong></div><div><span>Evidence files</span><strong>${proofs}</strong></div><div><span>Projects covered</span><strong>${projects}</strong></div></div>
    <div class="card audit-ledger-card">
      <div class="audit-filter-grid">
        <div class="audit-search">${icon('search','')}<input type="text" placeholder="Search action, person, record or evidence" value="${poEsc(state.auditFilters.search)}" oninput="setAuditSearch(this.value)"/></div>
        <select onchange="setAuditFilter('project',this.value)"><option value="">All projects</option>${auditUnique(sourceRows,'project').map(value => `<option ${state.auditFilters.project === value ? 'selected' : ''}>${poEsc(value)}</option>`).join('')}</select>
        <select onchange="setAuditFilter('po',this.value)"><option value="">All purchase orders</option>${auditUnique(sourceRows,'po').map(value => `<option ${state.auditFilters.po === value ? 'selected' : ''}>${poEsc(value)}</option>`).join('')}</select>
        <select onchange="setAuditFilter('pn',this.value)"><option value="">All part numbers</option>${pnOptions.map(value => `<option ${state.auditFilters.pn === value ? 'selected' : ''}>${poEsc(value)}</option>`).join('')}</select>
        <select onchange="setAuditFilter('module',this.value)"><option value="">All modules</option>${auditUnique(sourceRows,'module').map(value => `<option ${state.auditFilters.module === value ? 'selected' : ''}>${poEsc(value)}</option>`).join('')}</select>
        <select onchange="setAuditFilter('user',this.value)"><option value="">All people</option>${auditUnique(sourceRows,'user').map(value => `<option ${state.auditFilters.user === value ? 'selected' : ''}>${poEsc(value)}</option>`).join('')}</select>
        <select onchange="setAuditFilter('evidence',this.value)"><option value="">Any evidence</option><option value="with" ${state.auditFilters.evidence === 'with' ? 'selected' : ''}>With evidence file</option><option value="without" ${state.auditFilters.evidence === 'without' ? 'selected' : ''}>Without evidence file</option></select>
        <input type="date" value="${state.auditFilters.date}" onchange="setAuditFilter('date',this.value)"/>
        <button class="btn" onclick="resetAuditFilters()">Reset filters</button>
      </div>
      ${filterChips(state.auditFilters, { module:'Module',project:'Project',po:'PO',pn:'PN',user:'Person',evidence:'Evidence',date:'Date' }, 'clearAuditFilter', 'resetAuditFilters')}
      <div class="audit-results-head"><strong>${total} event${total === 1 ? '' : 's'}</strong><span>Immutable chronological record</span></div>
      ${auditTable(pageRows)}
      ${pageRows.length ? paginationBar(total,state.auditPage,PAGE_SIZE,'setAuditPage') : ''}
    </div>
  </section>`;
    }

export function openAuditDetail(id) { state.openAuditId = id; navigate('audit-detail'); }

export function pageAuditDetail() {
      const ledger = completeAuditEvents();
      const a = ledger.find(x => x.id === state.openAuditId) || ledger[0];
      const related = ledger.filter(event => event.id !== a.id && ((a.po !== '—' && event.po === a.po) || (a.mfgCode && event.mfgCode === a.mfgCode) || (a.custCode && event.custCode === a.custCode))).slice(0,6);
      return `
  <section class="audit-detail-shell">
    <div class="audit-detail-head"><button class="btn" onclick="navigateBack('audit-logs')">${icon('chevLeft','')} Back to audit</button><span class="mono">${poEsc(a.id)}</span></div>
    <div class="audit-detail-hero"><div><span>${poEsc(a.module)}</span><h2>${poEsc(a.action)}</h2><p>${poEsc(a.entity)}</p></div>${statusBadge(poEsc(a.result || 'Recorded'),['Confirmed','Completed','Delivered','Validated','Generated','Successful','Done','Packaged'].includes(a.result) ? 'success' : 'neutral')}</div>
    <div class="audit-detail-grid">
      <div class="card audit-detail-main">
        <div class="audit-detail-section"><h3>Action record</h3><p>${poEsc(a.details)}</p></div>
        <div class="audit-facts"><div><span>Date & time</span><strong class="mono">${poEsc(a.date)}</strong></div><div><span>Performed by</span><strong>${poEsc(a.actor)}</strong><small>${poEsc(a.role)}</small></div><div><span>Project</span><strong>${poEsc(a.project)}</strong></div><div><span>Purchase order</span><strong class="mono">${poEsc(a.po)}</strong></div><div><span>Part numbers</span><strong class="mono">${poEsc(a.pns.join(', ') || '—')}</strong></div><div><span>Record</span><strong class="mono">${poEsc(a.entity)}</strong></div></div>
        ${a.diff ? `<div class="audit-change"><h3>Field change</h3><span>${poEsc(a.diff.field)}</span><div><strong>${poEsc(a.diff.old)}</strong>${icon('chevRight','')}<strong>${poEsc(a.diff.new)}</strong></div></div>` : ''}
      </div>
      <aside class="card audit-detail-evidence"><h3>Evidence & documents</h3>${auditArtifactButtons(a)}<div class="audit-integrity">${icon('lock','')}<div><strong>Audit record retained</strong><span>Actor, timestamp, context and linked evidence stay attached to this event.</span></div></div></aside>
    </div>
    ${related.length ? `<div class="audit-related"><div class="audit-related-head"><h3>Related activity</h3><span>${a.po !== '—' ? poEsc(a.po) : poEsc(a.entity)}</span></div>${traceabilityTimeline(related)}</div>` : ''}
  </section>`;
    }

export function openAdminUser(id) { state.adminSelectedUserId=id; navigate('admin-user-details'); }

export function pageBusinessRules() {
      return `
  <div class="readonly-banner" style="background:#FFF8E8; color:#8A5B00; border-color:#F2D48A;">
    ${icon('audit','')} Recommended baseline — business owners must approve these decisions before implementation sign-off.
  </div>
  <div class="grid g4" style="margin-bottom:16px;">
    <div class="kpi-card"><div class="kpi-label">Open points reviewed</div><div class="kpi-value">${BUSINESS_RULES.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Access decisions</div><div class="kpi-value">3</div></div>
    <div class="kpi-card"><div class="kpi-label">Workflow decisions</div><div class="kpi-value">6</div></div>
    <div class="kpi-card"><div class="kpi-label">Data decisions</div><div class="kpi-value">4</div></div>
  </div>
  <div class="card">
    <div class="section-title">SRS v2.0 decision register <span class="badge warning">Awaiting business sign-off</span></div>
    <div class="decision-list">${BUSINESS_RULES.map(rule => `<div class="decision-card">
      <div class="decision-head"><div><div class="decision-id">${rule.id}</div><div class="decision-title">${rule.title}</div></div><span class="badge info">Recommended</span></div>
      <div class="decision-body">${rule.decision}</div><div class="decision-owner">Approval owner: ${rule.owner}</div>
    </div>`).join('')}</div>
  </div>`;
    }
