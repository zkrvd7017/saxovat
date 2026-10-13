/**
 * Candy Land — API Client
 * ========================
 * Centralized API client with JWT token management.
 * All functions correspond to backend endpoints.
 */

// ──────────────────── Types ────────────────────

export type UserRole = "CUSTOMER" | "CASHIER" | "SUPER_ADMIN";

export interface AuthUser {
  id: number;
  phone_number: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

export interface AuthResponse {
  tokens: { access: string; refresh: string };
  user: AuthUser;
}

export interface CustomerDataAPI {
  id: number;
  virtual_card_number: string;
  formatted_card: string;
  cashback_balance: string; // Decimal comes as string from DRF
  qr_code_hash: string;
}

export interface CustomerProfile {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: UserRole;
  customer_data: CustomerDataAPI;
  monthly_spent?: string;
  quarterly_spent?: string;
}

export interface TransactionAPI {
  id: number;
  customer_name: string;
  cashier_name: string;
  transaction_type: "EARN" | "REDEEM";
  bill_amount: string;
  cashback_amount: string;
  timestamp: string;
}

export interface MenuItemAPI {
  id: number;
  title: string;
  category: string;
  price: string;
  image_url: string;
  prep_time: number;
  is_new: boolean;
  description: string;
}

export interface MenuCategoryAPI {
  id: number;
  name: string;
  image_url: string;
  order: number;
}

export interface StoryAPI {
  id: number;
  title: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
}

export interface ShopLocationAPI {
  id: number;
  name: string;
  address: string;
  working_hours: string;
  map_link: string;
  image_url: string;
}

export interface QRScanResult {
  customer_id: number;
  name: string;
  phone: string;
  card_number: string;
  balance: string;
}

export interface TransactionResult {
  detail: string;
  cashback_amount?: string;
  redeemed_amount?: string;
  remaining_payable?: string;
  new_balance: string;
}

export interface AdminStats {
  total_users: number;
  total_revenue: string;
  total_cashback_issued: string;
  total_redeemed: string;
  system_liability: string;
}

export interface EmployeeResult {
  detail: string;
  employee: {
    id: number;
    phone_number: string;
    first_name: string;
    last_name: string;
    role: UserRole;
  };
}

// ──────────────────── Token Storage ────────────────────

const TOKEN_KEY = "the_samarkand_access_token";
const REFRESH_KEY = "the_samarkand_refresh_token";
const USER_KEY = "the_samarkand_user";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeAuth(tokens: { access: string; refresh: string }, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, tokens.access);
  localStorage.setItem(REFRESH_KEY, tokens.refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

let refreshRequest: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshRequest) return refreshRequest;

  const refresh = getStoredRefreshToken();
  if (!refresh) throw new Error("Sessiya tugagan");

  refreshRequest = fetch("/api/auth/token-refresh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Sessiya tugagan");
      const data = await response.json() as { access: string };
      localStorage.setItem(TOKEN_KEY, data.access);
      return data.access;
    })
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
}

function expireSession() {
  clearAuth();
  window.dispatchEvent(new Event("the-samarkand-auth-expired"));
}

// ──────────────────── Fetch Wrapper ────────────────────

class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;

  constructor(status: number, data: Record<string, unknown>) {
    const detail = (data.detail as string) || `API error ${status}`;
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const sendRequest = (token: string | null) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, { ...options, headers });
  };

  const token = getStoredToken();
  let response = await sendRequest(token);

  if (response.status === 401 && token && !url.startsWith("/api/auth/")) {
    try {
      const newToken = await refreshAccessToken();
      response = await sendRequest(newToken);
    } catch {
      expireSession();
    }
  }

  if (!response.ok) {
    let data: Record<string, unknown> = {};
    try {
      data = await response.json();
    } catch {
      data = { detail: response.statusText };
    }
    throw new ApiError(response.status, data);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ──────────────────── Auth Endpoints ────────────────────

export async function checkPhone(phone_number: string): Promise<{ exists: boolean; role: UserRole | null }> {
  return apiFetch<{ exists: boolean; role: UserRole | null }>("/api/auth/check-phone/", {
    method: "POST",
    body: JSON.stringify({ phone_number }),
  });
}

export async function customerRegister(phone_number: string, first_name: string, pin: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/customer-register/", {
    method: "POST",
    body: JSON.stringify({ phone_number, first_name, pin }),
  });
}

export async function customerLogin(phone_number: string, pin: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/customer-login/", {
    method: "POST",
    body: JSON.stringify({ phone_number, pin }),
  });
}

export async function staffLogin(phone_number: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/staff-login/", {
    method: "POST",
    body: JSON.stringify({ phone_number, password }),
  });
}

// ──────────────────── Customer Endpoints ────────────────────

export async function getCustomerProfile(): Promise<CustomerProfile> {
  return apiFetch<CustomerProfile>("/api/customer/me/");
}

export async function getCustomerTransactions(): Promise<TransactionAPI[]> {
  return apiFetch<TransactionAPI[]>("/api/customer/transactions/");
}

// ──────────────────── Public Endpoints ────────────────────

export async function getMenu(): Promise<MenuItemAPI[]> {
  return apiFetch<MenuItemAPI[]>("/api/menu/");
}

export async function getShops(): Promise<ShopLocationAPI[]> {
  return apiFetch<ShopLocationAPI[]>("/api/shops/");
}

// ──────────────────── Cashier Endpoints ────────────────────

export async function scanQR(qr_hash: string): Promise<QRScanResult> {
  return apiFetch<QRScanResult>("/api/cashier/scan-qr/", {
    method: "POST",
    body: JSON.stringify({ qr_hash }),
  });
}

export async function searchByPhone(phone_number: string): Promise<QRScanResult> {
  return apiFetch<QRScanResult>("/api/cashier/search-phone/", {
    method: "POST",
    body: JSON.stringify({ phone_number }),
  });
}

export async function cashierTransaction(
  customer_id: number,
  bill_amount: number,
  type: "EARN" | "REDEEM",
): Promise<TransactionResult> {
  return apiFetch<TransactionResult>("/api/cashier/transaction/", {
    method: "POST",
    body: JSON.stringify({ customer_id, bill_amount, type }),
  });
}

// ──────────────────── Admin Endpoints ────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>("/api/admin/stats/");
}

export async function getAdminTransactions(): Promise<TransactionAPI[]> {
  return apiFetch<TransactionAPI[]>("/api/admin/transactions/");
}

export async function adminGetCustomers(): Promise<CustomerProfile[]> {
  return apiFetch<CustomerProfile[]>("/api/admin/customers/");
}

export async function createEmployee(data: {
  phone_number: string;
  password: string;
  first_name: string;
  last_name?: string;
}): Promise<EmployeeResult> {
  return apiFetch<EmployeeResult>("/api/admin/employees/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getCashierTodayTransactions(): Promise<TransactionAPI[]> {
  return apiFetch<TransactionAPI[]>("/api/cashier/my-transactions/");
}

// ──────────────────── Admin Menu Management ────────────────────

export async function adminGetMenuItems(): Promise<MenuItemAPI[]> {
  return apiFetch<MenuItemAPI[]>("/api/admin/menu/");
}

export async function adminCreateMenuItem(data: {
  title: string;
  category: string;
  price: number;
  prep_time?: number;
  image_url?: string;
  description?: string;
  is_new?: boolean;
}): Promise<MenuItemAPI> {
  return apiFetch<MenuItemAPI>("/api/admin/menu/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function adminDeleteMenuItem(id: number): Promise<void> {
  return apiFetch<void>(`/api/admin/menu/${id}/`, { method: "DELETE" });
}

export async function adminUpdatePrepTime(id: number, prep_time: number): Promise<MenuItemAPI> {
  return apiFetch<MenuItemAPI>(`/api/admin/menu/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ prep_time }),
  });
}

export async function adminGetCategories(): Promise<MenuCategoryAPI[]> {
  return apiFetch<MenuCategoryAPI[]>("/api/admin/categories/");
}

export async function adminCreateCategory(data: { name: string; image_url?: string; order?: number }): Promise<MenuCategoryAPI> {
  return apiFetch<MenuCategoryAPI>("/api/admin/categories/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function adminDeleteCategory(id: number): Promise<void> {
  return apiFetch<void>(`/api/admin/categories/${id}/`, { method: "DELETE" });
}

export async function adminGetBanner(): Promise<{ image_url: string | null }> {
  return apiFetch<{ image_url: string | null }>("/api/admin/menu-banner/");
}

export async function adminSetBanner(image_url: string): Promise<{ image_url: string }> {
  return apiFetch<{ image_url: string }>("/api/admin/menu-banner/", {
    method: "POST",
    body: JSON.stringify({ image_url }),
  });
}

export async function getPublicCategories(): Promise<MenuCategoryAPI[]> {
  return apiFetch<MenuCategoryAPI[]>("/api/categories/");
}

export async function getPublicBanner(): Promise<{ image_url: string | null }> {
  return apiFetch<{ image_url: string | null }>("/api/menu-banner/");
}

// ──────────────────── Stories Endpoints ────────────────────

export async function getPublicStories(): Promise<StoryAPI[]> {
  return apiFetch<StoryAPI[]>("/api/stories/");
}

export async function adminGetStories(): Promise<StoryAPI[]> {
  return apiFetch<StoryAPI[]>("/api/admin/stories/");
}

export async function adminCreateStory(data: { title: string; image_url: string }): Promise<StoryAPI> {
  return apiFetch<StoryAPI>("/api/admin/stories/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function adminDeleteStory(id: number): Promise<void> {
  return apiFetch<void>(`/api/admin/stories/${id}/`, { method: "DELETE" });
}
