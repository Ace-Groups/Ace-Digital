import { Suspense, useEffect, type ComponentType } from "react";
import { lazyWithReload } from "@/lib/lazy-with-reload";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider, type Persister, type PersistedClient } from "@tanstack/react-query-persist-client";
import { get, set, del } from "idb-keyval";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { usePrefetchAppData } from "@/hooks/use-prefetch-app-data";
import { MobileChromeProvider } from "@/contexts/MobileChromeContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FormEnterNavigation } from "@/components/FormEnterNavigation";
import { CommandPalette } from "@/components/CommandPalette";
import { canAccessRoute, getDefaultRouteForRole } from "@workspace/rbac";
const NotFound = lazyWithReload(() => import("@/pages/not-found"));
const ForbiddenPage = lazyWithReload(() => import("@/pages/forbidden"));
const LoginPage = lazyWithReload(() => import("@/pages/login"));
const DashboardPage = lazyWithReload(() => import("@/pages/dashboard"));
const ProjectsPage = lazyWithReload(() => import("@/pages/projects"));
const TasksPage = lazyWithReload(() => import("@/pages/tasks"));
const TeamsPage = lazyWithReload(() => import("@/pages/teams"));
const CalendarPage = lazyWithReload(() => import("@/pages/calendar"));
const EmployeesPage = lazyWithReload(() => import("@/pages/employees"));
const FinancePage = lazyWithReload(() => import("@/pages/finance"));
const ClientsPage = lazyWithReload(() => import("@/pages/clients"));
const ApprovalsPage = lazyWithReload(() => import("@/pages/approvals"));
const ReportsPage = lazyWithReload(() => import("@/pages/reports"));
const ChannelsPage = lazyWithReload(() => import("@/pages/channels"));
const ActivityPage = lazyWithReload(() => import("@/pages/activity"));
const ServiceDeskPage = lazyWithReload(() => import("@/pages/service"));
const ServiceDetailPage = lazyWithReload(() => import("@/pages/service-detail"));
const ChangePasswordPage = lazyWithReload(() => import("@/pages/change-password"));
const SettingsPage = lazyWithReload(() => import("@/pages/settings"));
const NotificationsPage = lazyWithReload(() => import("@/pages/notifications"));
const NotesPage = lazyWithReload(() => import("@/pages/notes"));

const AUTH_ONLY_PATHS = new Set(["/change-password", "/settings"]);

const SIXTY_DAYS_MS = 1000 * 60 * 60 * 24 * 60;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: SIXTY_DAYS_MS,
      gcTime: SIXTY_DAYS_MS,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
    mutations: {
      networkMode: "online",
      retry: 3,
    },
  },
});

const idbPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set("reactQuery", client);
  },
  restoreClient: async () => {
    return await get<PersistedClient>("reactQuery");
  },
  removeClient: async () => {
    await del("reactQuery");
  },
};

function PageFallback() {
  return <LoadingScreen />;
}

function ProtectedRoute({ component: Component }: { component: ComponentType }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (user?.mustChangePassword && location !== "/change-password") {
    return <Redirect to="/change-password" />;
  }

  if (user && !AUTH_ONLY_PATHS.has(location) && !canAccessRoute(user.role, location)) {
    const fallback = getDefaultRouteForRole(user.role);
    if (location !== fallback) {
      return <Redirect to={fallback} />;
    }
    return (
      <Suspense fallback={<PageFallback />}>
        <ForbiddenPage />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  );
}

function PrefetchBoot() {
  usePrefetchAppData();
  return null;
}

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated && location === "/login") {
      setLocation("/");
    }
  }, [isLoading, isAuthenticated, location, setLocation]);

  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route
          path="/change-password"
          component={() => <ProtectedRoute component={ChangePasswordPage} />}
        />
        <Route
          path="/settings"
          component={() => <ProtectedRoute component={SettingsPage} />}
        />
        <Route
          path="/notifications"
          component={() => <ProtectedRoute component={NotificationsPage} />}
        />
        <Route path="/" component={() => <ProtectedRoute component={DashboardPage} />} />
        <Route path="/projects" component={() => <ProtectedRoute component={ProjectsPage} />} />
        <Route path="/tasks" component={() => <ProtectedRoute component={TasksPage} />} />
        <Route path="/teams" component={() => <ProtectedRoute component={TeamsPage} />} />
        <Route path="/calendar" component={() => <ProtectedRoute component={CalendarPage} />} />
        <Route path="/employees" component={() => <ProtectedRoute component={EmployeesPage} />} />
        <Route path="/finance" component={() => <ProtectedRoute component={FinancePage} />} />
        <Route path="/clients" component={() => <ProtectedRoute component={ClientsPage} />} />
        <Route path="/service" component={() => <ProtectedRoute component={ServiceDeskPage} />} />
        <Route path="/service/:id" component={() => <ProtectedRoute component={ServiceDetailPage} />} />
        <Route path="/approvals" component={() => <ProtectedRoute component={ApprovalsPage} />} />
        <Route path="/reports" component={() => <ProtectedRoute component={ReportsPage} />} />
        <Route path="/channels" component={() => <ProtectedRoute component={ChannelsPage} />} />
        <Route path="/activity" component={() => <ProtectedRoute component={ActivityPage} />} />
        <Route path="/notes" component={() => <ProtectedRoute component={NotesPage} />} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: idbPersister,
          maxAge: SIXTY_DAYS_MS,
          dehydrateOptions: {
            shouldDehydrateMutation: () => true,
          },
        }}
      >
        <TooltipProvider>
          <AuthProvider>
            <SocketProvider>
            <PrefetchBoot />
            <MobileChromeProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <AppRouter />
                <InstallPrompt />
                <CommandPalette />
              </WouterRouter>
              <Toaster />
              <FormEnterNavigation />
            </MobileChromeProvider>
            </SocketProvider>
          </AuthProvider>
        </TooltipProvider>
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
