"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, removeToken, getToken } from "@/lib/api/client";

export type UserRole = "owner" | "admin" | "doctor" | "reception" | "patient" | "crm" | "hrms" | "hr";

export interface AuthUser {
  _id: string;
  name: string;
  fullName?: string;
  email?: string;
  phone: string;
  role: UserRole;
  status: "active" | "inactive" | "suspended";
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; user: AuthUser }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isOwner: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  isReception: boolean;
  isPatient: boolean;
  isCrm: boolean;
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

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const storedToken = localStorage.getItem("trigyna_token");
      const storedUser = localStorage.getItem("trigyna_user");
      return !(storedToken && storedUser);
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
      if ((err as { status?: number })?.status === 401) {
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
        if (mounted) setIsLoading(false);
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
        if (mounted && (err as { status?: number })?.status === 401) {
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
        identifier,
        password,
      });

      const { token: receivedToken, user: receivedUser } = res.data;
      setToken(receivedToken);
      if (typeof window !== "undefined") {
        localStorage.setItem("trigyna_user", JSON.stringify(receivedUser));
      }
      setTokenState(receivedToken);
      setUser(receivedUser);
      setIsLoading(false);
      return { success: true, user: receivedUser };
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const logout = () => {
    removeToken();
    setUser(null);
    setTokenState(null);
    router.push("/login");
  };

  const isOwner = user?.role === "owner";
  const isAdmin = user?.role === "admin" || isOwner || user?.role === "crm" || user?.role === "hrms";
  const isDoctor = user?.role === "doctor";
  const isReception = user?.role === "reception";
  const isPatient = user?.role === "patient";
  const isCrm = isAdmin;
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
        isReception,
        isCrm,
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
