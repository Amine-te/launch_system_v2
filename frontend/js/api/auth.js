/* ==========================================================================
   api/auth.js
   Real network calls to the FastAPI backend's /auth/* endpoints.

   Owns the access token end-to-end: where it's stored, how it's attached
   to requests, and when it's cleared. Nothing outside this file should
   read/write the stored token directly -- callers (account-switcher.js,
   and every other api/*.js module once it's wired to the real backend)
   go through the functions exported here, in particular authFetch()
   below for any authenticated request.

   Token lifetime: currently a single JWT good for 24h (see
   backend/app/core/security.py's access_token_expire_minutes), no refresh
   token. That means a session silently expiring mid-use just logs the
   user out (handled below) rather than transparently renewing -- fine for
   now, but flagged here as a conscious choice: if 24h turns out to be too
   short for real usage patterns, the fix is a refresh-token flow, not a
   longer-lived access token.
   ========================================================================== */

import { API_BASE_URL } from './config.js';

// sessionStorage, not localStorage: this is a plain JS app with no
// server-rendered session and no httpOnly cookie support from the backend
// today, so the token has to live somewhere JS can read it in order to
// attach it to fetch() calls -- that's true of either storage option, and
// means an XSS bug could read it out either way. sessionStorage at least
// limits *how long* a forgotten-about token stays valid on a shared
// machine (cleared when the tab closes), at the cost of one extra login
// per new tab. If that trade-off ever needs revisiting, the real fix is a
// backend-set httpOnly cookie instead of a token this file has to handle
// at all.
const TOKEN_KEY = 'launchops.accessToken';

// Fired on `window` whenever an authenticated request comes back 401 and
// there was a session to lose (i.e. not just "you were never logged in").
// account-switcher.js can't be imported here -- it already imports this
// file, so importing it back would be circular -- so main.js listens for
// this event instead and reacts by calling the switcher's own logout().
export const SESSION_EXPIRED_EVENT = 'launchops:session-expired';

function _getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function _setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

function _clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

/** Thrown for "you're not logged in" (no token, or a 401 from the
 * backend) so callers can tell that apart from a network/server failure
 * and react accordingly (e.g. show the login form again). */
export class AuthError extends Error {}

function _request(path, options = {}) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
}

/**
 * The shared helper every authenticated request should go through --
 * today that's just getCurrentUser() below, but this is the thing every
 * other api/*.js module (boms.js, stock.js, purchase-orders.js, etc.)
 * should switch to calling once it's wired to the real backend instead of
 * mock data, so none of them have to duplicate "attach the token" or
 * "handle a 401" logic themselves.
 *
 * Attaches the bearer token automatically if one is stored. On a 401,
 * clears the token and -- if there *was* one (i.e. this wasn't just an
 * anonymous request) -- fires SESSION_EXPIRED_EVENT so the app can bounce
 * back to the login screen, then rejects with AuthError either way so the
 * caller's .catch() still runs.
 */
export function authFetch(path, options = {}) {
  const token = _getToken();
  const hadToken = Boolean(token);
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  return _request(path, { ...options, headers }).then(res => {
    if (res.status === 401) {
      _clearToken();
      if (hadToken) window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
      throw new AuthError('Session expired -- please log in again.');
    }
    return res;
  });
}

/** Synchronous, cheap check: is there a token stored at all? Does not
 * verify it's still valid -- getCurrentUser() is what actually confirms
 * that against the backend. Useful for an initial "do I even try to
 * fetch the current user" decision at startup. */
export function isAuthenticated() {
  return Boolean(_getToken());
}

/**
 * POST /auth/login, store the returned token, then resolve with the
 * logged-in user (by immediately calling GET /auth/me) so callers get a
 * full account object back from a single call.
 *
 * Deliberately uses the plain _request() helper, not authFetch(): there's
 * no token yet at this point, and a wrong-password 401 here means
 * "incorrect credentials", not "your session expired" -- authFetch's
 * automatic session-expired event would be the wrong signal to fire.
 */
export function login(email, password) {
  return _request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
    .then(res => {
      if (res.status === 401) throw new AuthError('Incorrect email or password.');
      if (!res.ok) throw new Error(`Login failed (${res.status}).`);
      return res.json();
    })
    .then(data => {
      _setToken(data.access_token);
      return getCurrentUser();
    })
    .catch(err => {
      // Don't leave a stale/partial token behind after a failed attempt.
      _clearToken();
      throw err;
    });
}

/**
 * GET /auth/me via authFetch(). Rejects with AuthError if there's no
 * token, or if the backend says it's invalid/expired (authFetch already
 * clears it and fires SESSION_EXPIRED_EVENT in that case).
 */
export function getCurrentUser() {
  if (!_getToken()) return Promise.reject(new AuthError('Not logged in.'));

  return authFetch('/auth/me').then(res => {
    if (!res.ok) throw new Error(`Could not load account (${res.status}).`);
    return res.json();
  });
}

/** No backend call -- these are stateless JWTs, so "logging out" is just
 * forgetting the token client-side. If token revocation is ever added
 * server-side, this is the only place that needs to change. */
export function logout() {
  _clearToken();
  return Promise.resolve();
}
