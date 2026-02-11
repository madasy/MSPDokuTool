import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { FavoritesProvider } from './hooks/useFavorites';
import { ThemeProvider } from './hooks/useTheme';
import DashboardPage from './pages/DashboardPage';
import TenantListPage from './pages/TenantListPage';
import TenantDashboardPage from './pages/TenantDashboardPage';
import RackListPage from './pages/RackListPage';
import HardwarePage from './pages/HardwarePage';
import NetworkPage from './pages/NetworkPage';
import SwitchesPage from './pages/SwitchesPage';
import DatacenterPage from './pages/DatacenterPage';
import SettingsPage from './pages/SettingsPage';

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <FavoritesProvider>
            <ToastProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    {/* Global routes */}
                    <Route index element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
                    <Route path="tenants" element={<ErrorBoundary><TenantListPage /></ErrorBoundary>} />
                    <Route path="datacenter" element={<ErrorBoundary><DatacenterPage /></ErrorBoundary>} />
                    <Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />

                    {/* Tenant-scoped routes */}
                    <Route path="tenants/:tenantId" element={<ErrorBoundary><TenantDashboardPage /></ErrorBoundary>} />
                    <Route path="tenants/:tenantId/racks" element={<ErrorBoundary><RackListPage /></ErrorBoundary>} />
                    <Route path="tenants/:tenantId/hardware" element={<ErrorBoundary><HardwarePage /></ErrorBoundary>} />
                    <Route path="tenants/:tenantId/network" element={<ErrorBoundary><NetworkPage /></ErrorBoundary>} />
                    <Route path="tenants/:tenantId/switches" element={<ErrorBoundary><SwitchesPage /></ErrorBoundary>} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </ToastProvider>
          </FavoritesProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

