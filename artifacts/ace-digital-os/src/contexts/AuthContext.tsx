import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, useLogin, useLogout, useRefreshAuth, ApiError } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { setAuthToken, clearAuthToken, getAuthToken } from "@/lib/api";
import { ensureFirebaseAuth, signOutFirebase, resetFirebaseAuthState } from "@/lib/firebase-client";
import { isFirebaseChatEnabled } from "@/lib/firebase-config";
import { useSessionActivity } from "@/hooks/useSessionActivity";
import { clearLastActivity, setLastActivity } from "@/lib/session";

interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  teamId: number | null;
  teamName: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  phone: string | null;
  status: string;
  mustChangePassword: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getAuthToken());
  const queryClient = useQueryClient();
  const refreshAttemptedRef = useRef(false);

  useEffect(() => {
    setAuthTokenGetter(() => getAuthToken());
  }, []);

  const { data: rawUser, isLoading, isError, error, refetch } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: ["getMe", token],
    },
  });

  const user: AuthUser | null = rawUser
    ? {
        id: rawUser.id,
        email: rawUser.email,
        fullName: rawUser.fullName,
        role: rawUser.role,
        teamId: rawUser.teamId ?? null,
        teamName: rawUser.teamName ?? null,
        jobTitle: rawUser.jobTitle ?? null,
        avatarUrl: rawUser.avatarUrl ?? null,
        phone: rawUser.phone ?? null,
        status: rawUser.status ?? "active",
        mustChangePassword: rawUser.mustChangePassword ?? false,
      }
    : null;

  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const refreshMutation = useRefreshAuth();

  const refreshSession = useCallback(async () => {
    const result = await refreshMutation.mutateAsync();
    setAuthToken(result.token);
    setToken(result.token);
    setLastActivity();
    await queryClient.invalidateQueries({ queryKey: ["getMe"] });
  }, [refreshMutation, queryClient]);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // ignore
    }
    await signOutFirebase();
    clearAuthToken();
    clearLastActivity();
    setToken(null);
    queryClient.clear();
  }, [logoutMutation, queryClient]);

  useEffect(() => {
    if (!token || isLoading) return;

    if (!isError) {
      refreshAttemptedRef.current = false;
      if (user) setLastActivity();
      return;
    }

    const status = error instanceof ApiError ? error.status : null;
    if (status === 401 && !refreshAttemptedRef.current) {
      refreshAttemptedRef.current = true;
      void refreshSession()
        .then(() => refetch())
        .catch(() => {
          clearAuthToken();
          clearLastActivity();
          setToken(null);
        });
      return;
    }

    if (status === 401) {
      clearAuthToken();
      clearLastActivity();
      setToken(null);
    }
  }, [token, isLoading, isError, error, user, refetch, refreshSession]);

  useEffect(() => {
    if (!token || !user || !isFirebaseChatEnabled()) return;
    void ensureFirebaseAuth();
  }, [token, user?.id]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation.mutateAsync({ data: { email, password } });
      setAuthToken(result.token);
      setToken(result.token);
      setLastActivity();
      resetFirebaseAuthState();
      void ensureFirebaseAuth();
    },
    [loginMutation],
  );

  const refreshUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["getMe"] });
  }, [queryClient]);

  useSessionActivity({
    isAuthenticated: !!user,
    logout,
    refreshSession,
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: !!token && isLoading,
        login,
        logout,
        refreshUser,
        refreshSession,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
