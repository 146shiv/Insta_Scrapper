/**
 * Axios API Service
 * ─────────────────────────────────────────────────────────────────
 * Centralized API client for all backend calls.
 * Uses Vite's dev proxy — requests to /api are forwarded to localhost:3000.
 */

import axios from 'axios';

// Base URL — in dev, Vite proxies /api to the backend
// In production, set VITE_API_BASE_URL env variable
const BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 600000, // 10 minute timeout (scraping takes time)
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Response interceptor for uniform error handling ───────────────────────────
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Network error';
    return Promise.reject(new Error(message));
  }
);

// ── Health ────────────────────────────────────────────────────────────────────
export const checkHealth = () =>
  axios.get(
    import.meta.env.VITE_API_BASE_URL
      ? `${import.meta.env.VITE_API_BASE_URL}/health`
      : '/health'
  ).then(r => r.data);

// ── Scrape ────────────────────────────────────────────────────────────────────
export const triggerScrape = (hashtags, options = {}) =>
  apiClient.post('/scrape', { hashtags, ...options });

// ── Posts ─────────────────────────────────────────────────────────────────────
export const getTopPosts = (params = {}) =>
  apiClient.get('/posts/top', { params });

export const getReels = (params = {}) =>
  apiClient.get('/posts/reels', { params });

export const getCarousels = (params = {}) =>
  apiClient.get('/posts/carousels', { params });

// ── Creators ──────────────────────────────────────────────────────────────────
export const getTopCreators = (params = {}) =>
  apiClient.get('/creators/top', { params });

export const getMicroCreators = (params = {}) =>
  apiClient.get('/creators/micro', { params });

// ── Hashtags ──────────────────────────────────────────────────────────────────
export const getTrendingHashtags = (params = {}) =>
  apiClient.get('/hashtags/trending', { params });

export default apiClient;
