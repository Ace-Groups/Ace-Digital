import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetMe,
  useLogin,
  useLogout,
  useRefreshAuth,
  ApiError,
  type User,
} from '@workspace/api-client-react';
import { getToken, setToken, clearToken, initApiClient } from '@/lib/api-config';

// Initialize the API client on module load
initApiClient();

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
  employeeCode: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapUser(raw: User): AuthUser {
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
    status: raw.status ?? 'active',
    mustChangePassword: raw.mustChangePassword ?? false,
    employeeCode: raw.employeeCode ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const refreshAttempted = useRef(false);

  // Load token from SecureStore on mount
  useEffect(() => {
    (async () => {
      const stored = await getToken();
      if (stored) setTokenState(stored);
      setInitializing(false);
    })();
  }, []);

  const { data: rawUser, isLoading, isPending, isError, error, refetch } = useGetMe({
    query: {
      enabled: !!token && !initializing,
      retry: false,
      queryKey: ['getMe', token],
    },
  });

  const apiUser = useMemo(() => (rawUser ? mapUser(rawUser) : null), [rawUser]);

  useEffect(() => {
    if (apiUser) {
      setUser(apiUser);
      refreshAttempted.current = false;
    }
  }, [apiUser]);

  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const refreshMutation = useRefreshAuth();

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation.mutateAsync({ data: { email, password } });
      await setToken(result.token);
      setTokenState(result.token);
      if (result.user) {
        setUser(mapUser(result.user));
      }
      await queryClient.removeQueries({ queryKey: ['getMe'] });
    },
    [loginMutation, queryClient]
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // ignore
    }
    await clearToken();
    setTokenState(null);
    setUser(null);
    queryClient.clear();
  }, [logoutMutation, queryClient]);

  const refreshUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['getMe'] });
  }, [queryClient]);

  // Handle auth errors — attempt token refresh once
  useEffect(() => {
    if (!token || initializing || isPending || isLoading || refreshing) return;
    if (!isError) return;

    const status = error instanceof ApiError ? error.status : null;
    if (status === 401 && !refreshAttempted.current) {
      refreshAttempted.current = true;
      setRefreshing(true);
      refreshMutation
        .mutateAsync()
        .then(async (result) => {
          await setToken(result.token);
          setTokenState(result.token);
          await refetch();
        })
        .catch(async () => {
          await clearToken();
          setTokenState(null);
          setUser(null);
          queryClient.clear();
        })
        .finally(() => setRefreshing(false));
      return;
    }

    // Unrecoverable error — force logout
    void (async () => {
      await clearToken();
      setTokenState(null);
      setUser(null);
      queryClient.clear();
    })();
  }, [token, initializing, isPending, isLoading, refreshing, isError, error, refetch, refreshMutation, queryClient]);

  const isBootstrapping = initializing || (!!token && (isPending || isLoading || refreshing));
  const isAuthenticated = !!token && !!user && !isBootstrapping;

  const value = useMemo(
    () => ({ user, isBootstrapping, isAuthenticated, login, logout, refreshUser }),
    [user, isBootstrapping, isAuthenticated, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
