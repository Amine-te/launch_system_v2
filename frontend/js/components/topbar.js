/* ==========================================================================
   topbar.js
   ========================================================================== */

import { QUICK_ACTIONS } from './nav-config.js';
import { NOTIFICATIONS, NOTIF_ICON_COLOR, SEARCH_INDEX } from '../data/mock-data.js';
import { renderPage } from '../pages/router.js';
import { state } from '../state.js';
import { icon } from '../utils/icons.js';

export function renderQuickActions() {
      const actions = QUICK_ACTIONS[state.currentRole] || [];
      if (actions.length === 0) { document.getElementById('quickActionsWrap').innerHTML = ''; return; }
      document.getElementById('quickActionsWrap').innerHTML = `
    <button class="qa-btn" onclick="toggleQA(event)">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
      Quick Action
    </button>
    <div class="qa-menu ${state.qaOpen ? 'open' : ''}" id="qaMenu">
      ${actions.map(a => `<div class="qa-item" onclick="navigate('${a.page}')">${icon(a.icon, '')} ${a.label}</div>`).join('')}
    </div>`;
    }

export function toggleQA(e) { e.stopPropagation(); state.qaOpen = !state.qaOpen; state.notifOpen = false; state.gsOpen = false; renderTopbarWidgets(); }

export function toggleNotif() { state.notifOpen = !state.notifOpen; state.qaOpen = false; state.gsOpen = false; renderTopbarWidgets(); }

export function renderNotifPanel() {
      document.getElementById('notifPanel').className = `notif-panel ${state.notifOpen ? 'open' : ''}`;
      document.getElementById('notifPanel').innerHTML = `
    <div class="notif-head">Notifications <span>Mark all read</span></div>
    <div class="notif-list">
      ${NOTIFICATIONS.map(n => `<div class="notif-row">
        <div class="notif-icon-dot" style="background:${NOTIF_ICON_COLOR[n.icon]}"></div>
        <div>
          <div class="n-title">${n.title}</div>
          <div class="n-sub">${n.sub}</div>
          <div class="n-time">${n.time}</div>
        </div>
      </div>`).join('')}
    </div>`;
    }

export function openGlobalSearch() { state.gsOpen = true; state.qaOpen = false; state.notifOpen = false; renderTopbarWidgets(); const el = document.getElementById('globalSearchInput'); if (el) el.focus(); }

export function setGlobalSearch(v) { state.globalSearchQuery = v; state.gsOpen = true; renderGsPanel(); }

export function gsResultsFor(query) {
      if (!query || query.trim().length === 0) return [];
      const q = query.toLowerCase();
      return SEARCH_INDEX.filter(i => `${i.label} ${i.sub}`.toLowerCase().includes(q)).slice(0, 8);
    }

export function renderGsPanel() {
      const panel = document.getElementById('gsPanel');
      panel.className = `gs-panel ${state.gsOpen ? 'open' : ''}`;
      const results = gsResultsFor(state.globalSearchQuery);
      if (!state.globalSearchQuery) {
        panel.innerHTML = `<div class="gs-empty">Search projects, purchase orders, PN, materials, deliveries, and invoices.</div>`;
        return;
      }
      if (results.length === 0) {
        panel.innerHTML = `<div class="gs-empty">No results for "${state.globalSearchQuery}"</div>`;
        return;
      }
      panel.innerHTML = `<div class="gs-results">
    ${results.map(r => `<div class="gs-row" onclick="${r.action}; gsOpen=false; document.getElementById('globalSearchInput').value=''; globalSearchQuery=''; renderTopbarWidgets();">
      <div class="gs-ic">${r.type.slice(0, 2).toUpperCase()}</div>
      <div><div class="gs-title">${r.label}</div><div class="gs-sub">${r.type} · ${r.sub}</div></div>
    </div>`).join('')}
  </div>`;
    }

export function renderTopbarWidgets() { renderQuickActions(); renderNotifPanel(); renderGsPanel(); }

document.addEventListener('click', (e) => {
      if (!e.target.closest('.quick-actions')) { state.qaOpen = false; }
      if (!e.target.closest('.notif-wrap')) { state.notifOpen = false; }
      if (!e.target.closest('.global-search-wrap')) { state.gsOpen = false; }
      renderTopbarWidgets();
      if (state.colMenuOpen && !e.target.closest('.col-menu')) { state.colMenuOpen = false; renderPage(); }
    });
