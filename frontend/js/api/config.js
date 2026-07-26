/* ==========================================================================
   api/config.js
   Single source of truth for the backend's base URL. Every api/*.js module
   that makes a real fetch() call should import API_BASE_URL from here
   instead of hardcoding it, so pointing the app at a different backend
   (a different port, staging, etc.) is a one-line change.
   ========================================================================== */

export const API_BASE_URL = 'http://localhost:8000';
