/* ==========================================================================
   quick-login.js
   "Quick login" panel on the full-screen auth gate: one button per seeded
   demo account (see backend/scripts/seed_demo_users.py and the README for
   the matching dev credentials). Each button does NOT bypass auth -- it
   fills in the real login form rendered by account-switcher.js (#asEmail /
   #asPassword / #asLoginForm) and submits it, going through the exact same
   POST /auth/login flow a manually-typed login would.

   Looked up live at click time (not cached), since account-switcher.js
   re-creates the login form's DOM on every render (e.g. after a failed
   login attempt shows an error).
   ========================================================================== */

import { ROLE_LABEL, ROLE_PERSONA } from './nav-config.js';

// Shared dev-only password for every seeded demo account. Never used for
// anything but local/dev seeding -- see README for details and
// backend/scripts/seed_demo_users.py for where accounts are created with it.
export const DEMO_ACCOUNT_PASSWORD = 'DemoPass!2026';

export function renderQuickLogin(containerId = 'quickLoginGrid') {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  grid.innerHTML = Object.keys(ROLE_PERSONA).map(role => `
    <button type="button" class="btn quick-login-btn" data-role="${role}">
      ${ROLE_LABEL[role] || role}
    </button>
  `).join('');

  grid.querySelectorAll('.quick-login-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role;
      const persona = ROLE_PERSONA[role];
      if (!persona) return;

      const emailInput = document.getElementById('asEmail');
      const passwordInput = document.getElementById('asPassword');
      const form = document.getElementById('asLoginForm');
      if (!emailInput || !passwordInput || !form) return;

      emailInput.value = persona.email;
      passwordInput.value = DEMO_ACCOUNT_PASSWORD;

      if (form.requestSubmit) {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
  });
}
