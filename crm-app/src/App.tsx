import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DialogsProvider } from "@/components/ui/feedback-dialogs";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MonitorPage from "./pages/MonitorPage";
import SparePartsPage from "./pages/SparePartsPage";
import MachinesPage from "./pages/MachinesPage";
import PipelinePage from "./pages/PipelinePage";
import ProductionInsightsPage from "./pages/ProductionInsightsPage";
import RackScanPage from "./pages/RackScanPage";
import PurchaseOrdersPage from "@/pages/PurchaseOrdersPage";
import SalesOrdersPage from "@/pages/SalesOrdersPage";
import MaterialInwardPage from "@/pages/MaterialInwardPage";
import DispatchPage from "@/pages/DispatchPage";
import PriceMasterPage from "@/pages/PriceMasterPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import FinancePage from "@/pages/FinancePage";
import ExpensesPage from "@/pages/ExpensesPage";
import PayrollPage from "@/pages/PayrollPage";
import ClientsPage from "./pages/ClientsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center animate-pulse">
          <span className="text-primary-foreground font-semibold text-sm">N</span>
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/monitor"
        element={
          <ProtectedRoute>
            <MonitorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/spare-parts"
        element={
          <ProtectedRoute>
            <SparePartsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/rack-scan"
        element={
          <ProtectedRoute>
            <RackScanPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/machines"
        element={
          <ProtectedRoute>
            <MachinesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pipeline"
        element={
          <ProtectedRoute>
            <PipelinePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/insights"
        element={
          <ProtectedRoute>
            <ProductionInsightsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clients"
        element={
          <ProtectedRoute>
            <ClientsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchase-orders"
        element={
          <ProtectedRoute>
            <PurchaseOrdersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/material-inward"
        element={
          <ProtectedRoute>
            <MaterialInwardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/sales-orders"
        element={
          <ProtectedRoute>
            <SalesOrdersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dispatch"
        element={
          <ProtectedRoute>
            <DispatchPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/prices"
        element={
          <ProtectedRoute>
            <PriceMasterPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/finance"
        element={
          <ProtectedRoute>
            <FinancePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <ExpensesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payroll"
        element={
          <ProtectedRoute>
            <PayrollPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <DialogsProvider>
        <BrowserRouter basename="/crm">
          <AppRoutes />
        </BrowserRouter>
      </DialogsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
