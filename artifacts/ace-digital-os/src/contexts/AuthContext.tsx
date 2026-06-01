import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useGetMe, useLogin, useLogout } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { setAuthToken, clearAuthToken, getAuthToken } from "@/lib/api";

interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  teamId: number | null;
  teamName: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  status: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getAuthToken());

  useEffect(() => {
    setAuthTokenGetter(() => getAuthToken());
  }, []);

  const { data: rawUser, isLoading } = useGetMe({
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
        status: rawUser.status ?? "active",
      }
    : null;

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation.mutateAsync({ data: { email, password } });
      setAuthToken(result.token);
      setToken(result.token);
    },
    [loginMutation]
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // ignore
    }
    clearAuthToken();
    setToken(null);
  }, [logoutMutation]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: !!token && isLoading,
        login,
        logout,
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
