import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  useLogin,
  useLogout,
  useRefreshAuth,
  ApiError,
  type User,
} from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { setAuthToken, clearAuthToken, getAuthToken } from "@/lib/api";
import { ensureFirebaseAuth, signOutFirebase, resetFirebaseAuthState } from "@/lib/firebase-client";
import { isFirebaseChatEnabled } from "@/lib/firebase-config";
import { useSessionActivity } from "@/hooks/useSessionActivity";
import { clearLastActivity, setLastActivity } from "@/lib/session";
import {
  clearSessionUser,
  readSessionUser,
  writeSessionUser,
  type SessionUser,
} from "@/lib/session-user";

interface AuthUser extends SessionUser {}

interface AuthContextValue {
  user: AuthUser | null;
  authToken: string | null;
  /** True while validating an existing session — never redirect to login during this. */
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapApiUser(raw: User): AuthUser {
  return {
    id: raw.id,
    email: raw.email,
    fullName: raw.fullName,
    role: raw.role,
    teamId: raw.teamId ?? null,
    teamName: raw.teamName ?? null,
    jobTitle: raw.jobTitle ?? null,
    avatarUrl: raw.avatarUrl ?? null,
    phone: raw.phone ?? null,
    status: raw.status ?? "active",
    mustChangePassword: raw.mustChangePassword ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialToken = getAuthToken();
  const [token, setToken] = useState<string | null>(initialToken);
  const [cachedUser, setCachedUser] = useState<AuthUser | null>(() =>
    initialToken ? readSessionUser() : null,
  );
  const [sessionReady, setSessionReady] = useState(!initialToken);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const refreshAttemptedRef = useRef(false);

  useEffect(() => {
    setAuthTokenGetter(() => getAuthToken());
  }, []);

  const { data: rawUser, isLoading, isPending, isError, error, refetch } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: ["getMe", token],
    },
  });

  const apiUser = rawUser ? mapApiUser(rawUser) : null;
  const user = apiUser ?? cachedUser;
  const isBootstrapping =
    !!token && (!sessionReady || isPending || isLoading || isRefreshing);

  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const refreshMutation = useRefreshAuth();

  const refreshSession = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshMutation.mutateAsync();
      setAuthToken(result.token);
      setToken(result.token);
      setLastActivity();
      await queryClient.invalidateQueries({ queryKey: ["getMe"] });
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshMutation, queryClient]);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // ignore
    }
    await signOutFirebase();
    clearAuthToken();
    clearSessionUser();
    clearLastActivity();
    setCachedUser(null);
    setToken(null);
    setSessionReady(true);
    queryClient.clear();
  }, [logoutMutation, queryClient]);

  useEffect(() => {
    if (apiUser) {
      writeSessionUser(apiUser);
      setCachedUser(apiUser);
      setSessionReady(true);
      setLastActivity();
      refreshAttemptedRef.current = false;
    }
  }, [apiUser]);

  useEffect(() => {
    if (!token) {
      setSessionReady(true);
      setCachedUser(null);
      return;
    }

    if (isPending || isLoading || isRefreshing) return;

    if (!isError) return;

    const status = error instanceof ApiError ? error.status : null;
    if (status === 401 && !refreshAttemptedRef.current) {
      refreshAttemptedRef.current = true;
      void refreshSession()
        .then(() => refetch())
        .catch(() => {
          clearAuthToken();
          clearSessionUser();
          clearLastActivity();
          setCachedUser(null);
          setToken(null);
          setSessionReady(true);
        });
      return;
    }

    clearAuthToken();
    clearSessionUser();
    clearLastActivity();
    setCachedUser(null);
    setToken(null);
    setSessionReady(true);
  }, [token, isPending, isLoading, isRefreshing, isError, error, apiUser, refetch, refreshSession]);

  useEffect(() => {
    if (!token || !user || !isFirebaseChatEnabled()) return;
    void ensureFirebaseAuth();
  }, [token, user?.id]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation.mutateAsync({ data: { email, password } });
      clearSessionUser();
      setCachedUser(null);
      setAuthToken(result.token);
      setToken(result.token);
      setSessionReady(false);
      setLastActivity();
      resetFirebaseAuthState();
      await queryClient.removeQueries({ queryKey: ["getMe"] });
      if (result.user) {
        const mapped = mapApiUser(result.user);
        writeSessionUser(mapped);
        setCachedUser(mapped);
        setSessionReady(true);
      }
      void ensureFirebaseAuth();
    },
    [loginMutation, queryClient],
  );

  const refreshUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["getMe"] });
  }, [queryClient]);

  useSessionActivity({
    isAuthenticated: !!user && sessionReady,
    logout,
    refreshSession,
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        authToken: token,
        isBootstrapping,
        login,
        logout,
        refreshUser,
        refreshSession,
        isAuthenticated: !!token && !!user,
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
