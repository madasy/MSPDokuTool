import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { FavoritesProvider } from './hooks/useFavorites';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import TenantListPage from './pages/TenantListPage';
import TenantDashboardPage from './pages/TenantDashboardPage';
import RackListPage from './pages/RackListPage';
import HardwarePage from './pages/HardwarePage';
import NetworkPage from './pages/NetworkPage';
import DatacenterPage from './pages/DatacenterPage';
import SitesPage from './pages/SitesPage';
import SwitchesPage from './pages/SwitchesPage';
import AccessPointsPage from './pages/AccessPointsPage';
import DocumentationPage from './pages/DocumentationPage';
import FirewallPage from './pages/FirewallPage';
import UserManagementPage from './pages/UserManagementPage';
import OnboardingWizardPage from './pages/OnboardingWizardPage';

const queryClient = new QueryClient();

// Guard: redirect to /login if not authenticated
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoginPage />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
        <Route path="tenants" element={<ErrorBoundary><TenantListPage /></ErrorBoundary>} />
        <Route path="datacenter" element={<ErrorBoundary><DatacenterPage /></ErrorBoundary>} />
        <Route path="tenants/:tenantId" element={<ErrorBoundary><TenantDashboardPage /></ErrorBoundary>} />
        <Route path="tenants/:tenantId/sites" element={<ErrorBoundary><SitesPage /></ErrorBoundary>} />
        <Route path="tenants/:tenantId/racks" element={<ErrorBoundary><RackListPage /></ErrorBoundary>} />
        <Route path="tenants/:tenantId/hardware" element={<ErrorBoundary><HardwarePage /></ErrorBoundary>} />
        <Route path="tenants/:tenantId/network" element={<ErrorBoundary><NetworkPage /></ErrorBoundary>} />
        <Route path="tenants/:tenantId/switches" element={<ErrorBoundary><SwitchesPage /></ErrorBoundary>} />
        <Route path="tenants/:tenantId/firewall" element={<ErrorBoundary><FirewallPage /></ErrorBoundary>} />
        <Route path="tenants/:tenantId/access-points" element={<ErrorBoundary><AccessPointsPage /></ErrorBoundary>} />
        <Route path="tenants/:tenantId/docs" element={<ErrorBoundary><DocumentationPage /></ErrorBoundary>} />
        <Route path="tenants/:tenantId/users" element={<ErrorBoundary><UserManagementPage /></ErrorBoundary>} />
        <Route path="tenants/:tenantId/wizard" element={<ErrorBoundary><OnboardingWizardPage /></ErrorBoundary>} />
        <Route path="admin/users" element={<ErrorBoundary><UserManagementPage /></ErrorBoundary>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <FavoritesProvider>
            <ToastProvider>
              <BrowserRouter>
                <AuthProvider>
                  <AppRoutes />
                </AuthProvider>
              </BrowserRouter>
            </ToastProvider>
          </FavoritesProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
