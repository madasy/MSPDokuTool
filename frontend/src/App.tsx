import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import TenantListPage from './pages/TenantListPage';
import TenantDashboardPage from './pages/TenantDashboardPage';
import RackListPage from './pages/RackListPage';
import NetworkPage from './pages/NetworkPage';
import DatacenterPage from './pages/DatacenterPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Global routes */}
            <Route index element={<DashboardPage />} />
            <Route path="tenants" element={<TenantListPage />} />
            <Route path="datacenter" element={<DatacenterPage />} />
            <Route path="settings" element={<div className="p-8 text-gray-400">Einstellungen (Coming Soon)</div>} />

            {/* Tenant-scoped routes */}
            <Route path="tenants/:tenantId" element={<TenantDashboardPage />} />
            <Route path="tenants/:tenantId/racks" element={<RackListPage />} />
            <Route path="tenants/:tenantId/network" element={<NetworkPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
