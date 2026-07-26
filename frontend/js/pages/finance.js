/* ==========================================================================
   finance.js
   ========================================================================== */

import { uniqueValues } from '../components/shared-tables.js';
import { FORECAST_ROWS, INVOICES, PRICES, REVENUE_ROWS } from '../data/mock-data.js';
import { renderPage } from './router.js';
import { state } from '../state.js';
import { financeMoney, money, statusBadge } from '../utils/helpers.js';
import { icon } from '../utils/icons.js';
import { can, permBtn, permIconBtn } from '../utils/permissions.js';
import { emptyStateBlock, filterChips, rowCountLabel, statsRow } from '../utils/table-helpers.js';
import { revenueFilters } from '../utils/table-state.js';

export function financeAccessGate() {
      const access = can('viewFinance');
      if (access === false) return `<div class="card">${emptyStateBlock('No finance access', 'Your role does not have access to financial data.', null)}</div>`;
      return null;
    }

export function pageFinanceDashboard() {
      const gate = financeAccessGate(); if (gate) return gate;
      const access = can('viewFinance');
      const totalRevenue = REVENUE_ROWS.reduce((s, r) => s + r.revenue, 0);
      const totalForecast = REVENUE_ROWS.reduce((s, r) => s + r.forecast, 0);
      const totalInvoiced = INVOICES.reduce((s, i) => s + i.amount, 0);
      const outstanding = INVOICES.filter(i => i.status === 'Outstanding' || i.status === 'Overdue').reduce((s, i) => s + i.amount, 0);
      const profit = Math.round(totalRevenue * 0.22);

      return `
  <div class="page-title-row"><div><div class="page-title">Finance ${access === 'summary' ? 'Summary' : 'Dashboard'}</div><div class="page-sub">${access === 'summary' ? 'Revenue and forecast overview for your projects' : 'Revenue, invoices, forecast and profitability'}</div></div></div>
  <div class="grid g5" style="margin-bottom:16px;">
    <div class="kpi-card"><div class="kpi-label">Revenue</div><div class="kpi-value" style="font-size:17px;">${money(totalRevenue)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Forecast</div><div class="kpi-value" style="font-size:17px;">${money(totalForecast)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Invoices</div><div class="kpi-value" style="font-size:17px;">${money(totalInvoiced)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Outstanding</div><div class="kpi-value" style="font-size:17px; color:var(--danger)">${money(outstanding)}</div></div>
    ${access === true ? `<div class="kpi-card"><div class="kpi-label">Profit</div><div class="kpi-value" style="font-size:17px; color:var(--success)">${money(profit)}</div></div>` : ''}
  </div>
  <div class="grid g2" style="margin-bottom:16px;">
    <div class="card">
      <div class="section-title">Revenue by Month</div>
      <div class="bar-chart">${FORECAST_ROWS.map(r => `<div class="bar-col"><div class="bar" style="height:${Math.round((r.actual || r.forecast) / 700000 * 130)}px; background:${r.actual ? 'var(--primary)' : 'var(--border)'}"></div><div class="bar-label">${r.month.split(' ')[0]}</div></div>`).join('')}</div>
    </div>
    <div class="card">
      <div class="section-title">Forecast vs Actual</div>
      <div class="bar-chart">${FORECAST_ROWS.map(r => `<div class="bar-col"><div class="bar-dual" style="height:130px;">
        <div class="bar" style="height:${Math.round(r.forecast / 700000 * 130)}px; background:var(--border);"></div>
        <div class="bar" style="height:${r.actual ? Math.round(r.actual / 700000 * 130) : 0}px; background:var(--primary);"></div>
      </div><div class="bar-label">${r.month.split(' ')[0]}</div></div>`).join('')}</div>
    </div>
  </div>
  <div class="grid g2" style="margin-bottom:16px;">
    <div class="card">
      <div class="section-title">Revenue by Customer</div>
      ${uniqueValues(REVENUE_ROWS, 'customer').map(c => {
        const total = REVENUE_ROWS.filter(r => r.customer === c).reduce((s, r) => s + r.revenue, 0);
        return `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-soft);"><span style="font-size:13px;">${c}</span><span class="mono" style="font-weight:700;">${money(total)}</span></div>`;
      }).join('')}
    </div>
    <div class="card">
      <div class="section-title">Revenue by Project</div>
      ${REVENUE_ROWS.map(r => `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-soft);"><span style="font-size:13px;">${r.project}</span><span class="mono" style="font-weight:700;">${money(r.revenue)}</span></div>`).join('')}
    </div>
  </div>
  <div class="card"><div class="section-title">Quick Links</div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button class="btn sm" onclick="navigate('finance-revenue')">Revenue Table</button>
      <button class="btn sm" onclick="navigate('finance-invoices')">Invoices</button>
      <button class="btn sm" onclick="navigate('finance-forecast')">Forecast</button>
      ${access === true ? `<button class="btn sm" onclick="navigate('finance-prices')">Prices</button>` : ''}
    </div>
  </div>`;
    }

export function setRevenueFilter(key, v) { revenueFilters[key] = v; renderPage(); }

export function pageFinanceRevenue() {
      const gate = financeAccessGate(); if (gate) return gate;
      const f = revenueFilters;
      const rows = REVENUE_ROWS.filter(r => {
        if (f.project && r.project !== f.project) return false;
        if (f.customer && r.customer !== f.customer) return false;
        return true;
      });
      return `
  <div class="card">
    <div class="table-toolbar">
      <select class="tt-select" onchange="setRevenueFilter('project', this.value)"><option value="">Project</option>${uniqueValues(REVENUE_ROWS, 'project').map(p => `<option value="${p}" ${f.project === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
      <select class="tt-select" onchange="setRevenueFilter('customer', this.value)"><option value="">Customer</option>${uniqueValues(REVENUE_ROWS, 'customer').map(c => `<option value="${c}" ${f.customer === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <select class="tt-select"><option>2026</option><option>2025</option></select>
      <div class="tt-spacer"></div>
      <div class="tt-icon-btn" title="Export" onclick="exportNotice()">${icon('download', '')}</div>
    </div>
    <table><thead><tr><th>Project</th><th>Customer</th><th>Revenue</th><th>Forecast</th><th>Difference</th></tr></thead>
    <tbody>${rows.map(r => {
        const diff = r.revenue - r.forecast;
        return `<tr><td>${r.project}</td><td>${r.customer}</td><td class="mono">${money(r.revenue)}</td><td class="mono">${money(r.forecast)}</td>
        <td class="mono" style="font-weight:700; color:${diff >= 0 ? 'var(--success)' : 'var(--danger)'}">${diff >= 0 ? '+' : ''}${money(diff)}</td></tr>`;
      }).join('')}</tbody></table>
  </div>`;
    }

export function setInvoiceSearch(v) { state.invoiceFilters.search = v; renderPage(); }

export function setInvoiceFilter(key, v) { state.invoiceFilters[key] = v; renderPage(); }

export function clearInvoiceFilter(key) { state.invoiceFilters[key] = ''; renderPage(); }

export function resetInvoiceFilters() { state.invoiceFilters = { search: '', project: '', customer: '', status: '' }; renderPage(); }

export function filterInvoices() {
      const f = state.invoiceFilters;
      return INVOICES.filter(i => {
        if (f.search && !(`${i.id} ${i.project} ${i.customer}`.toLowerCase().includes(f.search.toLowerCase()))) return false;
        if (f.project && i.project !== f.project) return false;
        if (f.customer && i.customer !== f.customer) return false;
        if (f.status && i.status !== f.status) return false;
        return true;
      });
    }

export function invoiceTable(list) {
      if (list.length === 0) return emptyStateBlock('No invoices found', 'No invoices match this view yet.', null);
      return `<table><thead><tr><th>Invoice</th><th>Project</th><th>Customer</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${list.map(i => `<tr>
      <td class="mono">${i.id}</td><td>${i.project}</td><td>${i.customer}</td><td class="mono">${money(i.amount)}</td>
      <td>${statusBadge(i.status, i.statusType)}</td>
      <td><div class="icon-actions">
        <div class="icon-btn" title="View" onclick="openModal('${i.id}', 'This opens the invoice preview for ${i.id} — ${money(i.amount)}, status ${i.status}.')">${icon('view', '')}</div>
        <div class="icon-btn" title="Download" onclick="openModal('Download Invoice', 'This downloads a PDF copy of ${i.id}.')">${icon('download', '')}</div>
        ${permIconBtn('editInvoice', 'Edit', 'edit', `openModal('Edit ${i.id}', 'This opens the invoice edit form.')`)}
        ${permIconBtn('deleteInvoice', 'Delete', 'trash', `openModal('Delete ${i.id}?', 'This invoice will be permanently removed.')`, 'danger-hover')}
      </div></td>
    </tr>`).join('')}</tbody></table>`;
    }

export function pageFinanceInvoices() {
      const gate = financeAccessGate(); if (gate) return gate;
      const rows = filterInvoices();
      const stats = [
        { label: 'Paid', value: INVOICES.filter(i => i.status === 'Paid').length, color: 'var(--success)' },
        { label: 'Outstanding', value: INVOICES.filter(i => i.status === 'Outstanding').length, color: 'var(--warning)' },
        { label: 'Overdue', value: INVOICES.filter(i => i.status === 'Overdue').length, color: 'var(--danger)' },
        { label: 'Draft', value: INVOICES.filter(i => i.status === 'Draft').length },
      ];
      return `
  <div class="page-title-row" style="margin-bottom:2px;"><div></div>
    ${permBtn('uploadInvoice', 'Upload Invoice', 'upload', "openModal('Upload Invoice', 'This attaches a new invoice PDF and links it to a project and customer.')", "primary")}
  </div>
  ${statsRow(stats)}
  <div class="card">
    <div class="table-toolbar">
      <div class="tt-search">${icon('search', '')}<input type="text" placeholder="Search invoice…" value="${state.invoiceFilters.search}" oninput="setInvoiceSearch(this.value)"/></div>
      <select class="tt-select" onchange="setInvoiceFilter('project', this.value)"><option value="">Project</option>${uniqueValues(INVOICES, 'project').map(p => `<option value="${p}" ${state.invoiceFilters.project === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
      <select class="tt-select" onchange="setInvoiceFilter('customer', this.value)"><option value="">Customer</option>${uniqueValues(INVOICES, 'customer').map(c => `<option value="${c}" ${state.invoiceFilters.customer === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <select class="tt-select" onchange="setInvoiceFilter('status', this.value)"><option value="">Status</option>${uniqueValues(INVOICES, 'status').map(s => `<option value="${s}" ${state.invoiceFilters.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <div class="tt-spacer"></div>
      <div class="tt-icon-btn" title="Reset" onclick="resetInvoiceFilters()">${icon('close', '')}</div>
      <div class="tt-icon-btn" title="Export" onclick="exportNotice()">${icon('download', '')}</div>
    </div>
    ${filterChips(state.invoiceFilters, { project: 'Project', customer: 'Customer', status: 'Status' }, 'clearInvoiceFilter', 'resetInvoiceFilters')}
    <div class="table-head-row">${rowCountLabel(rows.length, 'invoice')}</div>
    ${invoiceTable(rows)}
  </div>`;
    }

export function pageFinanceForecast() {
      const gate = financeAccessGate(); if (gate) return gate;
      const nextForecast = FORECAST_ROWS[FORECAST_ROWS.length - 1].forecast;
      const lastActual = [...FORECAST_ROWS].reverse().find(r => r.actual !== null);
      return `
  <div class="grid g3" style="margin-bottom:16px;">
    <div class="kpi-card"><div class="kpi-label">Monthly Forecast</div><div class="kpi-value" style="font-size:18px;">${money(nextForecast)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Actual Revenue (last closed month)</div><div class="kpi-value" style="font-size:18px;">${money(lastActual.actual)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Difference</div><div class="kpi-value" style="font-size:18px; color:${lastActual.actual - lastActual.forecast >= 0 ? 'var(--success)' : 'var(--danger)'}">${money(lastActual.actual - lastActual.forecast)}</div></div>
  </div>
  <div class="card">
    <div class="section-title">Forecast vs Actual by Month</div>
    <table><thead><tr><th>Month</th><th>Forecast</th><th>Actual</th><th>Difference</th></tr></thead>
    <tbody>${FORECAST_ROWS.map(r => {
        const diff = r.actual !== null ? r.actual - r.forecast : null;
        return `<tr><td>${r.month}</td><td class="mono">${money(r.forecast)}</td><td class="mono">${r.actual !== null ? money(r.actual) : '—'}</td>
        <td class="mono" style="font-weight:700; color:${diff === null ? 'var(--ink-faint)' : diff >= 0 ? 'var(--success)' : 'var(--danger)'}">${diff === null ? 'Pending' : (diff >= 0 ? '+' : '') + money(diff)}</td></tr>`;
      }).join('')}</tbody></table>
  </div>`;
    }

export function pageFinancePrices() {
      if (can('editPrice') === false && can('viewFinance') !== true) {
        return `<div class="card">${emptyStateBlock('No price access', 'Your role does not have access to price management.', null)}</div>`;
      }
      return `<div class="card">
    <div class="section-title">Price Management <span class="hint">${can('editPrice') === true ? '' : 'View only'}</span></div>
    <table><thead><tr><th>FGPN</th><th>Customer</th><th>Unit Price</th><th>Last Updated</th><th>Actions</th></tr></thead>
    <tbody>${PRICES.map(p => `<tr>
      <td class="mono">${p.fgpn}</td><td>${p.customer}</td><td class="mono">${financeMoney(p.price,'EUR')}</td><td>${p.updated}</td>
      <td><div class="icon-actions">
        ${permIconBtn('editPrice', 'Edit', 'edit', `openModal('Edit Price', 'This opens the price edit form for ${p.fgpn} — ${p.customer}.')`)}
        <div class="icon-btn" title="History" onclick="openModal('Price History', 'This shows the full price change history for ${p.fgpn}.')">${icon('history', '')}</div>
      </div></td>
    </tr>`).join('')}</tbody></table>
  </div>`;
    }
