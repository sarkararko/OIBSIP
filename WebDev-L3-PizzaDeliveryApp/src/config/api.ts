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
const envApiUrl = (
  typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL
    ? String((import.meta as any).env.VITE_API_URL)
    : ''
).trim();

// Clean any trailing slashes from the API URL
export const API_BASE_URL: string = envApiUrl ? envApiUrl.replace(/\/+$/, '') : '';

/**
 * Transforms a relative API path into a fully qualified URL when VITE_API_URL is defined,
 * or preserves relative pathing when running against a local dev proxy/server.
 * 
 * @param path Relative path, e.g. '/api/menu/pizzas' or 'api/auth/login'
 * @returns Fully formatted API endpoint URL
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!API_BASE_URL) {
    return normalizedPath;
  }

  return `${API_BASE_URL}${normalizedPath}`;
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
