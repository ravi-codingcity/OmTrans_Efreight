import axios from 'axios';

/* ------------------------------------------------------------------ */
/*  Export-AI API client — REUSES the existing app auth + backend.    */
/*  • Token: the main app's single JWT, stored as `authToken`.        */
/*  • Base: the existing backend `/api` (same server that serves the  */
/*    AI routes). No refresh-token flow (the main app uses one token).*/
/* ------------------------------------------------------------------ */
const TOKEN_KEY = 'authToken'; // shared with the main app login

export const tokenStore = {
  get access() {
    return localStorage.getItem(TOKEN_KEY);
  },
  set({ accessToken, token } = {}) {
    const t = accessToken || token;
    if (t) localStorage.setItem(TOKEN_KEY, t);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

// Same backend the rest of the app talks to. Override with VITE_API_URL when
// pointing the frontend at a local backend during development.
const PROD_API_URL = 'https://papayawhip-antelope-424743.hostingersite.com';
const OVERRIDE = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
export const API_BASE = `${OVERRIDE || PROD_API_URL}/api`;

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On a genuine 401 the main app session is invalid — surface it; the main app
// owns login. We do NOT attempt a refresh (single-token auth).
api.interceptors.response.use(
  (res) => res,
  (error) => Promise.reject(error)
);

/** Turn any axios error into a clear, user-friendly message. */
export const getErrorMessage = (err) => {
  const res = err?.response;
  if (!res) {
    if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection and try again.';
    if (err?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
    return err?.message || 'Something went wrong';
  }
  if (res.status === 429) return 'Too many attempts. Please wait a minute and try again.';
  if (res.status === 401) return res.data?.message || 'Your session has expired. Please sign in again.';
  const data = res.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  return data?.message || err.message || 'Something went wrong';
};
