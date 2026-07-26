/* ==========================================================================
   main.js
   Application entry point. Loaded via <script type="module" src="./js/main.js">
   from index.html. Imports every page/component module (directly or
   transitively) and boots the app exactly as the original inline script did.
   ========================================================================== */

import { renderBreadcrumb } from './components/breadcrumb.js';
import { onAccountChange, init as initAccountSwitcher } from './components/account-switcher.js';
import { ROLE_PERSONA } from './components/nav-config.js';
import { applyAccountChange, initSidebarState, renderNav } from './components/nav-render.js';
import { renderTopbarWidgets } from './components/topbar.js';
import { renderPage } from './pages/router.js';
import { state } from './state.js';

// Side-effect import: attaches every function used by inline onclick/onchange
// HTML attributes to window (see file header for why this is necessary).
import './expose-globals.js';

export function renderAll() {
      renderNav();
      renderBreadcrumb();
      renderPage();
      renderTopbarWidgets();
      const avatar = document.getElementById('topbarAvatar');
      if (avatar) avatar.textContent = ROLE_PERSONA[state.currentRole].initials;
    }

initSidebarState();

// Whenever the active account changes (today: switching role in the sidebar
// dropdown), reset navigation state and re-render. The account-switcher
// component itself knows nothing about the app -- this is where the app
// reacts to its account-change events.
onAccountChange(applyAccountChange);
initAccountSwitcher('roleSelect');

renderAll();
