/* ==========================================================================
   api/auth.js
   Real network calls to the FastAPI backend's /auth/* endpoints.

   Owns the access token end-to-end: where it's stored, how it's attached
   to requests, and when it's cleared. Nothing outside this file should
   read/write the stored token directly -- callers (account-switcher.js
   today, and any other api/*.js module that needs an authenticated
   request later) go through the functions exported here.
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
 * GET /auth/me using the stored token. Rejects with AuthError if there's
 * no token, or if the backend says it's invalid/expired (and clears it
 * in that case so the app doesn't keep retrying a dead token).
 */
export function getCurrentUser() {
  const token = _getToken();
  if (!token) return Promise.reject(new AuthError('Not logged in.'));

  return _request('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(res => {
    if (res.status === 401) {
      _clearToken();
      throw new AuthError('Session expired -- please log in again.');
    }
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
