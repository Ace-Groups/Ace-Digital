import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { canAccessRoute } from "@workspace/rbac";
import NotFound from "@/pages/not-found";
import ForbiddenPage from "@/pages/forbidden";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ProjectsPage from "@/pages/projects";
import TasksPage from "@/pages/tasks";
import EmployeesPage from "@/pages/employees";
import FinancePage from "@/pages/finance";
import ClientsPage from "@/pages/clients";
import ApprovalsPage from "@/pages/approvals";
import ReportsPage from "@/pages/reports";
import ChannelsPage from "@/pages/channels";
import ActivityPage from "@/pages/activity";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedRoute({
  component: Component,
  path,
}: {
  component: React.ComponentType;
  path: string;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  if (user && !canAccessRoute(user.role, path)) {
    return <ForbiddenPage />;
  }

  return <Component />;
}

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  if (!isLoading && isAuthenticated && location === "/login") {
    setLocation("/");
  }

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
