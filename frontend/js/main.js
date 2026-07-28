/* ==========================================================================
   main.js
   Application entry point. Loaded via <script type="module" src="./js/main.js">
   from index.html. Imports every page/component module (directly or
   transitively) and boots the app exactly as the original inline script did.
   ========================================================================== */

import { renderBreadcrumb } from './components/breadcrumb.js';
import { getCurrentAccount, logout, onAccountChange, init as initAccountSwitcher } from './components/account-switcher.js';
import { ROLE_PERSONA } from './components/nav-config.js';
import { applyAccountChange, initSidebarState, navigate, renderNav } from './components/nav-render.js';
import { renderQuickLogin } from './components/quick-login.js';
import { loadReferenceEntries } from './data/admin-store.js';
import { loadProjects } from './data/projects-store.js';
import { renderTopbarWidgets } from './components/topbar.js';
import { SESSION_EXPIRED_EVENT } from './api/auth.js';
import { renderPage } from './pages/router.js';
import { readPersistedPage, state } from './state.js';

// Side-effect import: attaches every function used by inline onclick/onchange
// HTML attributes to window (see file header for why this is necessary).
import './expose-globals.js';

const authScreenEl = document.getElementById('authScreen');
const appEl = document.getElementById('app');

export function renderAll() {
      renderNav();
      renderBreadcrumb();
      renderPage();
      renderTopbarWidgets();
      const avatar = document.getElementById('topbarAvatar');
      if (avatar) avatar.textContent = ROLE_PERSONA[state.currentRole].initials;
    }

// ---- account chip in the sidebar footer ----
// Deliberately NOT rendered by account-switcher.js itself -- the switcher
// only renders the login form now (into #authContainer on the full-screen
// gate below). This uses only its public API (getCurrentAccount/logout),
// same as any other caller would.
function renderSidebarAccount(account) {
      const el = document.getElementById('sidebarAccount');
      if (!el) return;
      if (!account) { el.innerHTML = ''; return; }
      el.innerHTML = `
        <div class="sidebar-account-email">${account.email}</div>
        <div class="sidebar-account-role">${account.role.replace(/_/g, ' ')}</div>
        <button type="button" class="btn sidebar-logout-btn" id="sidebarLogoutBtn">Log out</button>
      `;
      document.getElementById('sidebarLogoutBtn').addEventListener('click', () => { logout(); });
    }

// ---- gate: #app only mounts once a session is confirmed ----
function showApp() {
      if (authScreenEl) authScreenEl.classList.add('is-hidden');
      if (appEl) appEl.classList.remove('is-hidden');
    }

function showAuthScreen() {
      if (appEl) appEl.classList.add('is-hidden');
      if (authScreenEl) authScreenEl.classList.remove('is-hidden');
    }

// Any api/*.js module using authFetch() (auth.js's own getCurrentUser(),
// and any other module wired to the real backend later) fires this when a
// request comes back 401 with a session actually having existed. Reacting
// the same way manual logout does keeps this a single code path, not a
// second "who's logged in" state to keep in sync with account-switcher.js.
window.addEventListener(SESSION_EXPIRED_EVENT, () => { logout(); });

initSidebarState();
renderQuickLogin('quickLoginGrid');

// Whenever the active account changes (login, logout, or an expired session
// being cleared), reset navigation state, flip which screen is visible, and
// re-render. The account-switcher component itself knows nothing about the
// app -- this is where the app reacts to its account-change events.
onAccountChange(account => {
      renderSidebarAccount(account);
      if (account) {
        applyAccountChange(account);
        showApp();
        // PROJECTS (SRS M01) is read by nearly every page in the app
        // (dashboards, materials-stock, simulation, PO/BOM pages, not
        // just Projects itself) regardless of role, the same reasoning
        // as loadReferenceEntries() below -- fetch it right on login
        // rather than waiting for the Projects page specifically to be
        // visited. (Reference lists have a pre-existing gap here on a
        // *fresh* login, since this callback path predates today's
        // account-switcher wiring and only the session-restore branch
        // below calls loadReferenceEntries() -- out of scope to fix as
        // part of this step, but not repeated here for PROJECTS.)
        loadProjects().then(renderAll);
      } else {
        showAuthScreen();
      }
    });

// init() tries getCurrentUser() silently (an existing, still-valid token)
// before ever showing anything -- the app shell only mounts on success;
// any failure (no token, expired token, unreachable server) leaves the
// full-screen login view in place.
initAccountSwitcher('authContainer').then(account => {
      renderSidebarAccount(account);
      if (account) {
        // A browser refresh re-evaluates state.js from scratch, so the
        // `state` singleton above is back to its hardcoded defaults
        // (currentRole 'engineer', currentPage 'dashboard') no matter who
        // was actually logged in or what page they were on -- that's the
        // "refresh always dumps me on the Launch Engineer dashboard" bug.
        // Apply the real role from the now-confirmed session, then hand
        // off to navigate() (with replace:true, so this doesn't push a
        // spurious browser-history entry) to restore the page that was
        // open before the refresh -- going through navigate() rather than
        // setting state.currentPage directly means the same role-based
        // guards that protect every other navigation (e.g. an admin
        // account only ever landing on an admin page) apply here too.
        state.currentRole = account.role;
        showApp();
        navigate(readPersistedPage() || 'dashboard', { replace: true });
        // Reference lists (JIT Customers, Delivery Methods, etc.) are read
        // by ordinary business pages (Projects, Customer Delivery), not
        // just the Admin section -- unlike ADMIN_USERS, whose only
        // readers are admin-only pages that can safely lazy-load it on
        // first visit. A non-admin user who never opens Admin > Reference
        // Lists still needs this data, so fetch it here instead of
        // waiting for ensureAdminReferenceListsLoaded() to be triggered
        // by a page they may never visit. Fire-and-forget; re-render once
        // it lands in case the current page already rendered without it.
        loadReferenceEntries().then(renderAll);
        loadProjects().then(renderAll);
      } else {
        showAuthScreen();
      }
    });
