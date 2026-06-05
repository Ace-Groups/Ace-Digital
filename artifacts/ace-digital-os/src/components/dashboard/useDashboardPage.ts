import { useMemo } from "react";
import { getGetDashboardQueryKey, useGetDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function useDashboardPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const showChat = can("channels:read");
  const { data: dash, isLoading, isFetching } = useGetDashboard({
    query: {
      queryKey: getGetDashboardQueryKey(),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });
  const firstName = user?.fullName?.split(" ")[0] ?? "there";
  const widgets = useMemo(() => new Set(dash?.widgets ?? []), [dash?.widgets]);
  const dashboardDate = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [],
  );
  const roleLabel = user?.role?.replace(/_/g, " ") ?? "";

  return {
    user,
    dash,
    isLoading,
    isFetching,
    firstName,
    widgets,
    dashboardDate,
    roleLabel,
    showChat,
  };
}
