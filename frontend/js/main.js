/* ==========================================================================
   main.js
   Application entry point. Loaded via <script type="module" src="./js/main.js">
   from index.html. Imports every page/component module (directly or
   transitively) and boots the app exactly as the original inline script did.
   ========================================================================== */

import { renderBreadcrumb } from './components/breadcrumb.js';
import { getCurrentAccount, logout, onAccountChange, init as initAccountSwitcher } from './components/account-switcher.js';
import { ROLE_PERSONA } from './components/nav-config.js';
import { applyAccountChange, initSidebarState, renderNav } from './components/nav-render.js';
import { renderQuickLogin } from './components/quick-login.js';
import { renderTopbarWidgets } from './components/topbar.js';
import { renderPage } from './pages/router.js';
import { state } from './state.js';

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
        showApp();
        renderAll();
      } else {
        showAuthScreen();
      }
    });
