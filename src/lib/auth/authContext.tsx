"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, removeToken, getToken } from "@/lib/api/client";

export type UserRole =
  | "owner"
  | "super_admin"
  | "admin"
  | "doctor"
  | "reception"
  | "patient"
  | "crm"
  | "sales"
  | "hrms"
  | "hr";

export interface AuthUser {
  _id: string;
  name: string;
  fullName?: string;
  email?: string;
  phone: string;
  role: UserRole;
  status: "active" | "inactive" | "suspended" | "invited";
  isEmailVerified?: boolean;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; user: AuthUser }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isOwner: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  isSales: boolean;
  isCrm: boolean;
  isReception: boolean;
  isPatient: boolean;
  isHr: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem("trigyna_user");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("trigyna_token");
  });

  // Always initiate loading state as true if a token exists, so session is verified server-side before unlocking UI
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const storedToken = localStorage.getItem("trigyna_token");
      return !!storedToken;
    } catch {
      return true;
    }
  });

  const refreshUser = useCallback(async () => {
    const storedToken = getToken();
    if (!storedToken) {
      setUser(null);
      setTokenState(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get<{ user: AuthUser }>("/auth/me");
      if (res.data?.user) {
        setUser(res.data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("trigyna_user", JSON.stringify(res.data.user));
        }
      }
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 401 || (err as { status?: number })?.status === 403) {
        removeToken();
        setUser(null);
        setTokenState(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const storedToken = getToken();
      if (!storedToken) {
        if (mounted) {
          setUser(null);
          setTokenState(null);
          setIsLoading(false);
        }
        return;
      }
      try {
        const res = await api.get<{ user: AuthUser }>("/auth/me");
        if (mounted && res.data?.user) {
          setUser(res.data.user);
          if (typeof window !== "undefined") {
            localStorage.setItem("trigyna_user", JSON.stringify(res.data.user));
          }
        }
      } catch (err: unknown) {
        if (mounted) {
          removeToken();
          setUser(null);
          setTokenState(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ token: string; user: AuthUser }>("/auth/login", {
        identifier: identifier.trim(),
        password,
      });

      const { token: receivedToken, user: receivedUser } = res.data;
      setToken(receivedToken);
      if (typeof window !== "undefined") {
        localStorage.setItem("trigyna_user", JSON.stringify(receivedUser));
      }
      setTokenState(receivedToken);
      setUser(receivedUser);
      return { success: true, user: receivedUser };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout").catch(() => {});
    } finally {
      removeToken();
      setUser(null);
      setTokenState(null);
      router.push("/login");
    }
  };

  const isOwner = user?.role === "owner" || user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isOwner || user?.role === "hrms";
  const isDoctor = user?.role === "doctor";
  const isSales = user?.role === "sales" || user?.role === "crm" || isAdmin;
  const isCrm = isSales;
  const isReception = user?.role === "reception" || isSales;
  const isPatient = user?.role === "patient";
  const isHr = isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        isOwner,
        isAdmin,
        isDoctor,
        isSales,
        isCrm,
        isReception,
        isHr,
        isPatient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
