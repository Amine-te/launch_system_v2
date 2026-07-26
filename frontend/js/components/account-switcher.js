/* ==========================================================================
   account-switcher.js
   Self-contained "who am I logged in as" component.

   Today it's backed by 7 hardcoded mock accounts (one per role) and just
   swaps which role is active in the app -- there is no real authentication
   yet. EVERY other module in the app must go through the public API below;
   nothing outside this file should read MOCK_ACCOUNTS, touch the <select>
   element directly, or otherwise know how account data is stored.

   That's deliberate: when a real login manager exists, only this file
   should need to change. listAccounts()/getCurrentAccount()/switchAccount()
   already return Promises (as a real auth API would), so callers already
   written against this module won't need to change when the mock
   implementation below is replaced with real network calls.

   Public API:
     - init(selectElementId)     mount into the given <select>, load + render
                                  the account list, wire up switching. Returns
                                  a Promise<Account> (the initial account).
     - listAccounts()            Promise<Account[]> - every switchable account
     - getCurrentAccount()       Promise<Account> - the currently active account
     - switchAccount(accountId)  Promise<Account> - switches the active account
                                  and notifies subscribers
     - onAccountChange(fn)       subscribe to account-change events; fn(account)
                                  is called after every successful switch.
                                  Returns an unsubscribe function.
     - logout()                  Promise<void> - stub for now; wire up real
                                  sign-out here once auth exists.
   ========================================================================== */

// ---- private "backend" (mock today, swap for real fetch() calls later) ----

const MOCK_ACCOUNTS = [
  { id: 'engineer',    role: 'engineer',    label: 'Launch Engineer' },
  { id: 'manager',     role: 'manager',     label: 'Launch Manager' },
  { id: 'plant',       role: 'plant',       label: 'Plant Manager' },
  { id: 'wh_lead',     role: 'wh_lead',     label: 'Warehouse Team Leader' },
  { id: 'wh_staff',    role: 'wh_staff',    label: 'Warehouse Personnel' },
  { id: 'prod_coord',  role: 'prod_coord',  label: 'Production & Packing Coordinator' },
  { id: 'admin',       role: 'admin',       label: 'System Administrator' },
];

let _currentAccountId = 'engineer'; // matches the app's previous default role
const _subscribers = [];

function _findAccount(id) {
  return MOCK_ACCOUNTS.find(a => a.id === id) || null;
}

// Every public read/write below is wrapped in Promise.resolve()/reject() so
// it already has the shape of a real async API call, even though today it
// resolves synchronously against the in-memory mock list.

function listAccounts() {
  return Promise.resolve(MOCK_ACCOUNTS.map(a => ({ ...a })));
}

function getCurrentAccount() {
  return Promise.resolve(_findAccount(_currentAccountId));
}

function switchAccount(accountId) {
  const account = _findAccount(accountId);
  if (!account) return Promise.reject(new Error(`Unknown account: ${accountId}`));
  _currentAccountId = accountId;
  return Promise.resolve(account).then(acc => {
    _subscribers.forEach(fn => fn({ ...acc }));
    return { ...acc };
  });
}

function onAccountChange(callback) {
  _subscribers.push(callback);
  return function unsubscribe() {
    const i = _subscribers.indexOf(callback);
    if (i > -1) _subscribers.splice(i, 1);
  };
}

function logout() {
  // TODO: once real authentication exists, clear the session / redirect here.
  return Promise.resolve();
}

function init(selectElementId) {
  return listAccounts().then(accounts => {
    const select = document.getElementById(selectElementId);
    if (select) {
      select.innerHTML = accounts
        .map(a => `<option value="${a.id}">${a.label}</option>`)
        .join('');
      select.value = _currentAccountId;
      select.addEventListener('change', (e) => { switchAccount(e.target.value); });
    }
    return getCurrentAccount();
  });
}

export { init, getCurrentAccount, listAccounts, switchAccount, onAccountChange, logout };
