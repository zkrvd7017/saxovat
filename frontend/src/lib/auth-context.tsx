/**
 * Candy Land — Auth Context
 * ==========================
 * React Context providing authentication state across the app.
 * Stores JWT token and user info in localStorage, auto-restores on mount.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  type AuthUser,
  type UserRole,
  getStoredUser,
  getStoredToken,
  storeAuth,
  clearAuth,
  checkPhone as apiCheckPhone,
  customerRegister as apiCustomerRegister,
  customerLogin as apiCustomerLogin,
  staffLogin as apiStaffLogin,
} from "./api";

// ──────────────────── Context Shape ────────────────────

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkPhone: (phone: string) => Promise<{ exists: boolean; role: UserRole | null }>;
  registerCustomer: (phone: string, firstName: string, pin: string) => Promise<void>;
  loginCustomer: (phone: string, pin: string) => Promise<void>;
  loginStaff: (phone: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ──────────────────── Provider ────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-restore from localStorage on mount
  useEffect(() => {
    const storedUser = getStoredUser();
    const storedToken = getStoredToken();
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener("the-samarkand-auth-expired", handleExpiredSession);
    return () => window.removeEventListener("the-samarkand-auth-expired", handleExpiredSession);
  }, []);

  const checkPhone = useCallback(async (phone: string) => {
    return await apiCheckPhone(phone);
  }, []);

  const registerCustomer = useCallback(async (phone: string, firstName: string, pin: string) => {
    const res = await apiCustomerRegister(phone, firstName, pin);
    storeAuth(res.tokens, res.user);
    setUser(res.user);
    setToken(res.tokens.access);
  }, []);

  const loginCustomer = useCallback(async (phone: string, pin: string) => {
    const res = await apiCustomerLogin(phone, pin);
    storeAuth(res.tokens, res.user);
    setUser(res.user);
    setToken(res.tokens.access);
  }, []);

  const loginStaff = useCallback(async (phone: string, password: string) => {
    const res = await apiStaffLogin(phone, password);
    storeAuth(res.tokens, res.user);
    setUser(res.user);
    setToken(res.tokens.access);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role ?? null,
        isAuthenticated: !!user && !!token,
        isLoading,
        checkPhone,
        registerCustomer,
        loginCustomer,
        loginStaff,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ──────────────────── Hook ────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
