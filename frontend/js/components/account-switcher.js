/* ==========================================================================
   account-switcher.js
   Self-contained "who am I logged in as" component.

   Now backed by the real backend (api/auth.js -> POST /auth/login,
   GET /auth/me) instead of the 7 hardcoded mock accounts this started
   with. EVERY other module in the app must still go through the public
   API below; nothing outside this file should touch api/auth.js,
   sessionStorage, or the DOM this component renders.

   Public API (unchanged from the mock version):
     - init(containerId)         mount into the given element, render the
                                  right UI (login form or account), restore
                                  a still-valid session if one exists.
                                  Returns Promise<Account | null> -- null
                                  when no one is logged in.
     - listAccounts()            Promise<Account[]> - see note below.
     - getCurrentAccount()       Promise<Account | null>
     - switchAccount(accountId)  Promise<Account> - see note below.
     - onAccountChange(fn)       subscribe to account-change events; fn(account)
                                  is called after every login/logout.
                                  Returns an unsubscribe function.
     - logout()                  Promise<void> - clears the session for real.

   Two behavior changes now that this is real auth, both intentional:
     - listAccounts() can no longer return "every switchable account" --
       there's no such endpoint (and shouldn't be, for a real login
       system). It now resolves to [currentAccount] when logged in, or []
       when not.
     - switchAccount(accountId) can no longer instantly swap identities --
       with real auth, "switching" means logging out and logging in as
       someone else. It's kept (so nothing calling it throws an
       ImportError) but rejects with an explanatory error.
   ========================================================================== */

import { AuthError, getCurrentUser, isAuthenticated, login as apiLogin, logout as apiLogout } from '../api/auth.js';

let _currentAccount = null; // { id, email, role } | null
let _container = null;
const _subscribers = [];

function _mapUser(user) {
  return { id: user.id, email: user.email, role: user.role };
}

function _notify(account) {
  _subscribers.forEach(fn => fn(account ? { ...account } : null));
}

// ---- rendering ----

function _renderLoggedOut(errorMessage) {
  if (!_container) return;
  _container.innerHTML = `
    <form class="as-login-form" id="asLoginForm" novalidate>
      <label for="asEmail">Email</label>
      <input type="email" id="asEmail" name="email" required autocomplete="username" />
      <label for="asPassword">Password</label>
      <input type="password" id="asPassword" name="password" required autocomplete="current-password" />
      <button type="submit" class="btn primary as-login-btn">Log in</button>
      <div class="as-error" id="asError" ${errorMessage ? '' : 'hidden'}>${errorMessage || ''}</div>
    </form>`;

  const form = document.getElementById('asLoginForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('asEmail').value.trim();
    const password = document.getElementById('asPassword').value;
    const submitBtn = form.querySelector('.as-login-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in…';

    apiLogin(email, password)
      .then(user => {
        _currentAccount = _mapUser(user);
        _renderLoggedIn();
        _notify(_currentAccount);
      })
      .catch(err => {
        const message = err instanceof AuthError
          ? err.message
          : 'Could not reach the server. Please try again.';
        _renderLoggedOut(message);
      });
  });
}

function _renderLoggedIn() {
  if (!_container || !_currentAccount) return;
  _container.innerHTML = `
    <div class="as-account">
      <div class="as-account-email">${_currentAccount.email}</div>
      <div class="as-account-role">${_currentAccount.role.replace(/_/g, ' ')}</div>
      <button type="button" class="btn as-logout-btn" id="asLogoutBtn">Log out</button>
    </div>`;

  document.getElementById('asLogoutBtn').addEventListener('click', () => {
    logout();
  });
}

// ---- public API ----

function listAccounts() {
  return Promise.resolve(_currentAccount ? [{ ..._currentAccount }] : []);
}

function getCurrentAccount() {
  return Promise.resolve(_currentAccount ? { ..._currentAccount } : null);
}

function switchAccount() {
  return Promise.reject(new Error(
    'switchAccount is not available with real authentication -- log out and log in as a different user instead.'
  ));
}

function onAccountChange(callback) {
  _subscribers.push(callback);
  return function unsubscribe() {
    const i = _subscribers.indexOf(callback);
    if (i > -1) _subscribers.splice(i, 1);
  };
}

function logout() {
  return apiLogout().then(() => {
    const wasLoggedIn = Boolean(_currentAccount);
    _currentAccount = null;
    _renderLoggedOut();
    if (wasLoggedIn) _notify(null);
  });
}

function init(containerId) {
  _container = document.getElementById(containerId);

  if (!isAuthenticated()) {
    _renderLoggedOut();
    return Promise.resolve(null);
  }

  // A token is stored from a previous session -- confirm it's still
  // valid before trusting it (it may have expired since the last visit).
  return getCurrentUser()
    .then(user => {
      _currentAccount = _mapUser(user);
      _renderLoggedIn();
      return { ..._currentAccount };
    })
    .catch(() => {
      // getCurrentUser() already clears an expired/invalid token; just
      // fall back to the login form.
      _currentAccount = null;
      _renderLoggedOut('Your session expired -- please log in again.');
      return null;
    });
}

export { init, getCurrentAccount, listAccounts, switchAccount, onAccountChange, logout };
