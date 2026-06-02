import { lazy, Suspense, useEffect, type ComponentType } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MobileChromeProvider } from "@/contexts/MobileChromeContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FormEnterNavigation } from "@/components/FormEnterNavigation";
import { canAccessRoute } from "@workspace/rbac";
const NotFound = lazy(() => import("@/pages/not-found"));
const ForbiddenPage = lazy(() => import("@/pages/forbidden"));
const LoginPage = lazy(() => import("@/pages/login"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const ProjectsPage = lazy(() => import("@/pages/projects"));
const TasksPage = lazy(() => import("@/pages/tasks"));
const EmployeesPage = lazy(() => import("@/pages/employees"));
const FinancePage = lazy(() => import("@/pages/finance"));
const ClientsPage = lazy(() => import("@/pages/clients"));
const ApprovalsPage = lazy(() => import("@/pages/approvals"));
const ReportsPage = lazy(() => import("@/pages/reports"));
const ChannelsPage = lazy(() => import("@/pages/channels"));
const ActivityPage = lazy(() => import("@/pages/activity"));
const ChangePasswordPage = lazy(() => import("@/pages/change-password"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));

const AUTH_ONLY_PATHS = new Set(["/change-password", "/settings"]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 120_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});

function PageFallback() {
  return <LoadingScreen />;
}

function ProtectedRoute({
  component: Component,
  path,
}: {
  component: ComponentType;
  path: string;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (user?.mustChangePassword && path !== "/change-password") {
    return <Redirect to="/change-password" />;
  }

  if (user && !AUTH_ONLY_PATHS.has(path) && !canAccessRoute(user.role, path)) {
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
          component={() => <ProtectedRoute path="/change-password" component={ChangePasswordPage} />}
        />
        <Route
          path="/settings"
          component={() => <ProtectedRoute path="/settings" component={SettingsPage} />}
        />
        <Route
          path="/notifications"
          component={() => <ProtectedRoute path="/notifications" component={NotificationsPage} />}
        />
        <Route path="/" component={() => <ProtectedRoute path="/" component={DashboardPage} />} />
        <Route
          path="/projects"
          component={() => <ProtectedRoute path="/projects" component={ProjectsPage} />}
        />
        <Route path="/tasks" component={() => <ProtectedRoute path="/tasks" component={TasksPage} />} />
        <Route
          path="/employees"
          component={() => <ProtectedRoute path="/employees" component={EmployeesPage} />}
        />
        <Route
          path="/finance"
          component={() => <ProtectedRoute path="/finance" component={FinancePage} />}
        />
        <Route
          path="/clients"
          component={() => <ProtectedRoute path="/clients" component={ClientsPage} />}
        />
        <Route
          path="/approvals"
          component={() => <ProtectedRoute path="/approvals" component={ApprovalsPage} />}
        />
        <Route
          path="/reports"
          component={() => <ProtectedRoute path="/reports" component={ReportsPage} />}
        />
        <Route
          path="/channels"
          component={() => <ProtectedRoute path="/channels" component={ChannelsPage} />}
        />
        <Route
          path="/activity"
          component={() => <ProtectedRoute path="/activity" component={ActivityPage} />}
        />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <MobileChromeProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <AppRouter />
                <InstallPrompt />
              </WouterRouter>
              <Toaster />
              <FormEnterNavigation />
            </MobileChromeProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
