/* ==========================================================================
   helpers.js
   ========================================================================== */

import { READONLY_ROLES, ROLE_LABEL } from '../components/nav-config.js';
import { state } from '../state.js';

export function isReadOnly() { return READONLY_ROLES.includes(state.currentRole); }

export function readonlyBanner() {
      if (!isReadOnly()) return '';
      return `<div class="readonly-banner">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
    Viewing in read-only mode — ${ROLE_LABEL[state.currentRole]} cannot edit records.
  </div>`;
    }

export function statusBadge(label, type) { return `<span class="badge ${type}">${label}</span>`; }

export function pageHeader(title, sub) {
      if (!title) return '';
      const subClass = state.currentPage === 'project-list' ? ' project-list-page-sub' : '';
      return `<div class="page-title-row"><div><div class="page-title">${title}</div>${sub ? `<div class="page-sub${subClass}">${sub}</div>` : ''}</div></div>`;
    }

export function healthRing(pct) {
      const color = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
      const r = 26, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
      return `<div class="health-ring">
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--border-soft)" stroke-width="6"/>
      <circle cx="32" cy="32" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
    </svg>
    <div class="hr-val" style="color:${color}">${pct}%</div>
  </div>`;
    }

export function money(n) { return new Intl.NumberFormat('en-GB',{ style:'currency', currency:'EUR', minimumFractionDigits:2, maximumFractionDigits:2 }).format(Number(n || 0)); }

export function financeMoney(n, currency = 'EUR') { return new Intl.NumberFormat('en-GB',{ style:'currency', currency, minimumFractionDigits:2, maximumFractionDigits:2 }).format(Number(n || 0)); }
