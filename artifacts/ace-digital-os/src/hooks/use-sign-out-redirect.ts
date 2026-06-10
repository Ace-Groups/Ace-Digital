import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useSignOutRedirect() {
  const { logout } = useAuth();

  return useCallback(async () => {
    await logout();
    window.location.assign("/login");
  }, [logout]);
}
