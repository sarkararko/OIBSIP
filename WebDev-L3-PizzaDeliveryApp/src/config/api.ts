/**
 * Centralized API Configuration for PizzaCraft
 * 
 * Supports seamless switching between local development and production deployments (e.g. Vercel + Render).
 * 
 * In local development:
 * - If VITE_API_URL is unset, defaults to empty string (''), enabling relative API calls (/api/...) 
 *   to the local Node/Express dev server on localhost:3000.
 * 
 * In production (Vercel):
 * - Reads import.meta.env.VITE_API_URL (e.g. "https://pizzacraft-backend-bvqm.onrender.com")
 * - Sanitizes trailing slashes
 * - Automatically prepends the base URL to all outgoing API calls
 */

// Safely access Vite environment variables
const rawEnvApiUrl = (
  typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL
    ? String((import.meta as any).env.VITE_API_URL)
    : ''
).trim();

/**
 * Checks if the current execution context is a self-contained full-stack environment,
 * such as Google Cloud Run (AI Studio preview / deployment) or local development.
 * In these environments, the Express backend runs directly alongside the frontend on port 3000,
 * so all /api/* requests must use relative paths to avoid CORS issues and external server downtime.
 */
export function isSelfContainedHost(): boolean {
  if (typeof window === 'undefined') return true;
  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.run.app') ||
    hostname.includes('googleusercontent.com')
  );
}

/**
 * Returns the active API base URL.
 * In self-contained hosts (AI Studio / localhost), returns empty string to use relative /api paths.
 */
export function getApiBaseUrl(): string {
  if (isSelfContainedHost()) {
    return '';
  }
  return rawEnvApiUrl ? rawEnvApiUrl.replace(/\/+$/, '') : '';
}

// Clean any trailing slashes from the API URL
export const API_BASE_URL: string = getApiBaseUrl();

/**
 * Transforms a relative API path into a fully qualified URL when appropriate,
 * or preserves relative pathing when running in a self-contained container / dev server.
 * 
 * @param path Relative path, e.g. '/api/menu/pizzas' or 'api/auth/login'
 * @returns Fully formatted API endpoint URL
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    return normalizedPath;
  }

  return `${baseUrl}${normalizedPath}`;
}

/**
 * Resilient fetch wrapper:
 * Automatically calls apiUrl(path).
 * If an external URL fails due to a network error or CORS 403,
 * it automatically falls back to relative /api/... to prevent breaking the application.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const primaryUrl = apiUrl(path);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  try {
    const res = await fetch(primaryUrl, init);
    // If the external backend responded with 403 (CORS rejection) or 502/503/504 gateway down,
    // retry with relative path if different
    if (!res.ok && primaryUrl.startsWith('http') && (res.status === 403 || res.status >= 502)) {
      if (primaryUrl !== normalizedPath) {
        console.warn(`[apiFetch] Primary request to ${primaryUrl} returned HTTP ${res.status}. Falling back to relative path ${normalizedPath}...`);
        return await fetch(normalizedPath, init);
      }
    }
    return res;
  } catch (err) {
    if (primaryUrl !== normalizedPath) {
      console.warn(`[apiFetch] Primary request to ${primaryUrl} failed (${(err as any)?.message || err}). Falling back to relative path ${normalizedPath}...`);
      return await fetch(normalizedPath, init);
    }
    throw err;
  }
}

/**
 * Standardized API Endpoints Catalog
 */
export const API_ENDPOINTS = {
  // Health & diagnostics
  health: () => apiUrl('/api/health'),
  databaseStatus: () => apiUrl('/api/database/status'),

  // Menu & Pizza
  menuPizzas: () => apiUrl('/api/menu/pizzas'),
  menuOptions: () => apiUrl('/api/menu/options'),
  pizzas: () => apiUrl('/api/pizzas'),

  // Auth
  login: () => apiUrl('/api/auth/login'),
  register: () => apiUrl('/api/auth/register'),
  verifyEmail: () => apiUrl('/api/auth/verify-email'),
  resendVerification: () => apiUrl('/api/auth/resend-verification'),
  forgotPassword: () => apiUrl('/api/auth/forgot-password'),
  resetPassword: () => apiUrl('/api/auth/reset-password'),
  adminLogin: () => apiUrl('/api/auth/admin-login'),
  me: () => apiUrl('/api/auth/me'),

  // Orders
  myOrders: () => apiUrl('/api/orders/my-orders'),
  trackOrder: (orderId: string) => apiUrl(`/api/orders/track/${encodeURIComponent(orderId)}`),
  createRazorpayOrder: () => apiUrl('/api/orders/create-razorpay-order'),
  confirmOrder: () => apiUrl('/api/orders/confirm'),

  // Admin
  adminInventory: () => apiUrl('/api/admin/inventory'),
  adminAdjustInventory: (itemId: string) => apiUrl(`/api/admin/inventory/${encodeURIComponent(itemId)}/adjust`),
  adminDeleteInventory: (itemId: string) => apiUrl(`/api/admin/inventory/${encodeURIComponent(itemId)}`),
  adminOrders: () => apiUrl('/api/admin/orders'),
  adminUpdateOrderStatus: (orderId: string) => apiUrl(`/api/admin/orders/${encodeURIComponent(orderId)}/status`),
  adminTriggerAlerts: () => apiUrl('/api/admin/inventory/alerts/trigger-check'),
  adminResetDemoData: () => apiUrl('/api/admin/reset-demo-data'),
  adminReconnectDb: () => apiUrl('/api/admin/reconnect-db'),
  adminDiagnostics: () => apiUrl('/api/admin/database/diagnostics'),

  // Emails (System Mailbox)
  emails: () => apiUrl('/api/emails'),
  markEmailRead: () => apiUrl('/api/emails/mark-read'),
};

export default apiUrl;
