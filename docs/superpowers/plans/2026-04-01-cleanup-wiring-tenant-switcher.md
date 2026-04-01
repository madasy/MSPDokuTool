# MSP DokuTool — Cleanup, DB Wiring & Tenant Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all mock/hardcoded data, wire all pages to real database APIs, clean up unused code, and add a global tenant switcher for customer switching.

**Architecture:** Spring Boot (Kotlin) backend with REST APIs, React (TypeScript) frontend with React Query for data fetching. Multi-tenant via Tenant entity with FK relationships. Frontend uses Vite dev proxy (`/api` → `localhost:8080`).

**Tech Stack:** Kotlin/Spring Boot 3.3.2, PostgreSQL 16, React 19, TypeScript, React Query v5, React Router v7, Tailwind CSS v4, Vite 7

---

## File Structure

### Files to Delete
- `frontend/src/pages/SwitchesPage.tsx`
- `frontend/src/pages/SettingsPage.tsx`
- `frontend/src/components/network/SwitchFaceplate.tsx`
- `frontend/src/components/network/IpPlanVisualization.tsx`
- `frontend/src/components/ui/ContractAlerts.tsx`
- `backend/src/main/kotlin/com/msp/doku/config/DataSeeder.kt`

### Files to Create
- `frontend/src/services/apiClient.ts` — shared fetch wrapper
- `frontend/src/services/DashboardService.ts` — dashboard stats + activity API
- `frontend/src/services/DatacenterService.ts` — public IP range CRUD
- `backend/src/main/kotlin/com/msp/doku/domain/PublicIpRange.kt` — new entity
- `backend/src/main/kotlin/com/msp/doku/repository/PublicIpRangeRepository.kt`
- `backend/src/main/kotlin/com/msp/doku/dto/DashboardDtos.kt` — stats + activity DTOs
- `backend/src/main/kotlin/com/msp/doku/dto/PublicIpRangeDtos.kt`
- `backend/src/main/kotlin/com/msp/doku/service/DashboardService.kt`
- `backend/src/main/kotlin/com/msp/doku/service/PublicIpRangeService.kt`
- `backend/src/main/kotlin/com/msp/doku/controller/DashboardController.kt`
- `backend/src/main/kotlin/com/msp/doku/controller/DatacenterController.kt`
- `backend/src/main/resources/db/migration/V6__add_public_ip_ranges.sql`

### Files to Modify
- `frontend/src/App.tsx` — remove deleted page routes
- `frontend/src/components/layout/Layout.tsx` — remove switches/settings nav, restructure sidebar
- `frontend/src/pages/DashboardPage.tsx` — replace mocks with API calls
- `frontend/src/pages/TenantDashboardPage.tsx` — replace mocks with API calls
- `frontend/src/pages/RackListPage.tsx` — replace mocks with API calls
- `frontend/src/pages/DatacenterPage.tsx` — replace mocks with API calls
- `frontend/src/services/TenantService.ts` — use shared apiClient, add getSummary
- `frontend/src/services/DeviceService.ts` — use shared apiClient, add tenant filtering
- `frontend/src/services/RackService.ts` — use shared apiClient, add tenant filtering
- `frontend/src/services/NetworkService.ts` — use shared apiClient
- `backend/src/main/kotlin/com/msp/doku/service/RackService.kt` — remove createRack stub, deduplicate toDto, add tenant filtering
- `backend/src/main/kotlin/com/msp/doku/service/DeviceService.kt` — add tenant filtering, extract shared toDto
- `backend/src/main/kotlin/com/msp/doku/controller/RackController.kt` — remove broken createRack endpoint, add tenantId query param
- `backend/src/main/kotlin/com/msp/doku/controller/DeviceController.kt` — add tenantId query param
- `backend/src/main/kotlin/com/msp/doku/controller/TenantController.kt` — add summary endpoint
- `backend/src/main/kotlin/com/msp/doku/repository/DeviceRepository.kt` — add tenant-scoped queries
- `backend/src/main/kotlin/com/msp/doku/repository/RackRepository.kt` — add tenant-scoped queries

---

## Task 1: Delete Unused Frontend Files & Routes

**Files:**
- Delete: `frontend/src/pages/SwitchesPage.tsx`
- Delete: `frontend/src/pages/SettingsPage.tsx`
- Delete: `frontend/src/components/network/SwitchFaceplate.tsx`
- Delete: `frontend/src/components/network/IpPlanVisualization.tsx`
- Delete: `frontend/src/components/ui/ContractAlerts.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Layout.tsx`
- Modify: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Delete the 5 unused files**

```bash
rm frontend/src/pages/SwitchesPage.tsx
rm frontend/src/pages/SettingsPage.tsx
rm frontend/src/components/network/SwitchFaceplate.tsx
rm frontend/src/components/network/IpPlanVisualization.tsx
rm frontend/src/components/ui/ContractAlerts.tsx
```

- [ ] **Step 2: Remove deleted imports and routes from App.tsx**

Replace the full content of `frontend/src/App.tsx` with:

```tsx
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
import DatacenterPage from './pages/DatacenterPage';

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

                    {/* Tenant-scoped routes */}
                    <Route path="tenants/:tenantId" element={<ErrorBoundary><TenantDashboardPage /></ErrorBoundary>} />
                    <Route path="tenants/:tenantId/racks" element={<ErrorBoundary><RackListPage /></ErrorBoundary>} />
                    <Route path="tenants/:tenantId/hardware" element={<ErrorBoundary><HardwarePage /></ErrorBoundary>} />
                    <Route path="tenants/:tenantId/network" element={<ErrorBoundary><NetworkPage /></ErrorBoundary>} />
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
```

- [ ] **Step 3: Remove switches and settings nav items from Layout.tsx**

In `frontend/src/components/layout/Layout.tsx`, make these changes:

1. Remove the `Settings` import from the lucide-react import line (remove `, Settings` from the import).

2. Replace the tenant-context nav section (lines 78-105) — remove the Switches NavItem and the Settings NavItem at the bottom:

Replace:
```tsx
                            <div>
                                <SectionHeader label="Netzwerk" />
                                <div className="space-y-1 mt-2">
                                    <NavItem to={`/tenants/${tenantId}/network`} icon={<Network size={18} />} label="IP-Plan" />
                                    <NavItem to={`/tenants/${tenantId}/switches`} icon={<Monitor size={18} />} label="Switches" />
                                </div>
                            </div>

                            <div className="pt-6 mt-2 border-t border-slate-200">
                                <NavItem to="/tenants" icon={<Users size={18} />} label="Alle Tenants" />
                            </div>
```

With:
```tsx
                            <div>
                                <SectionHeader label="Netzwerk" />
                                <div className="space-y-1 mt-2">
                                    <NavItem to={`/tenants/${tenantId}/network`} icon={<Network size={18} />} label="IP-Plan" />
                                </div>
                            </div>

                            <div className="pt-6 mt-2 border-t border-slate-200">
                                <NavItem to="/tenants" icon={<Users size={18} />} label="Alle Tenants" />
                            </div>
```

3. Remove the Settings NavItem block at the bottom of the nav (lines 119-122):

Remove:
```tsx
                    {/* Settings (Always visible) */}
                    <div className="mt-auto">
                        <NavItem to="/settings" icon={<Settings size={18} />} label="Einstellungen" />
                    </div>
```

- [ ] **Step 4: Remove ContractAlerts import from DashboardPage.tsx**

In `frontend/src/pages/DashboardPage.tsx`, remove line 3:
```tsx
import ContractAlerts from '../components/ui/ContractAlerts';
```

And remove lines 37-38 (the ContractAlerts usage):
```tsx
            {/* Contract Expiry Alerts */}
            <ContractAlerts />
```

- [ ] **Step 5: Verify the frontend compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors (or only pre-existing ones unrelated to deleted files).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "cleanup: remove unused pages, components, and routes

Delete SwitchesPage, SettingsPage, SwitchFaceplate, IpPlanVisualization,
ContractAlerts. Remove their routes and nav items from Layout."
```

---

## Task 2: Delete DataSeeder and Backend Stubs

**Files:**
- Delete: `backend/src/main/kotlin/com/msp/doku/config/DataSeeder.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/service/RackService.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/controller/RackController.kt`

- [ ] **Step 1: Delete DataSeeder**

```bash
rm backend/src/main/kotlin/com/msp/doku/config/DataSeeder.kt
```

- [ ] **Step 2: Remove createRack stub from RackService.kt**

In `backend/src/main/kotlin/com/msp/doku/service/RackService.kt`, remove lines 33-41:

```kotlin
    @Transactional
    fun createRack(request: CreateRackRequest): RackDto {
         // Mocking Room lookup for MVP since we don't have Room API yet
         // In real app, we must validate roomId
         // For now, let's create a dummy room if needed or fail if entity requires it.
         // rack.room is non-nullable in Entity.
         // WORKAROUND: We need a valid Room ID.
         throw UnsupportedOperationException("Room creation not yet implemented, cannot create Rack without Room")
    }
```

- [ ] **Step 3: Remove broken createRack endpoint from RackController.kt**

In `backend/src/main/kotlin/com/msp/doku/controller/RackController.kt`, remove lines 28-36:

```kotlin
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createRack(@RequestBody request: CreateRackRequest): RackDto {
        // Mock Room ID for now if not provided, or fail
        // For MVP testing, let's allow creating rack without room if we modify Service to allow it?
        // Service expects Room. Let's create a dummy endpoint or use existing logic.
        // Assuming user sends a valid RoomId, or we fix this later.
        throw UnsupportedOperationException("Need Room ID to create Rack")
    }
```

- [ ] **Step 4: Verify backend compiles**

```bash
cd backend && ./gradlew compileKotlin
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "cleanup: remove DataSeeder and broken createRack stubs"
```

---

## Task 3: Create Shared API Client & Migrate Services

**Files:**
- Create: `frontend/src/services/apiClient.ts`
- Modify: `frontend/src/services/TenantService.ts`
- Modify: `frontend/src/services/DeviceService.ts`
- Modify: `frontend/src/services/RackService.ts`
- Modify: `frontend/src/services/NetworkService.ts`

- [ ] **Step 1: Create the shared apiClient.ts**

Create `frontend/src/services/apiClient.ts`:

```typescript
const API_BASE = '/api/v1';

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${text}`);
    }

    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}
```

- [ ] **Step 2: Migrate TenantService.ts**

Replace the full content of `frontend/src/services/TenantService.ts` with:

```typescript
import { apiFetch } from './apiClient';

export interface Tenant {
    id: string;
    name: string;
    identifier: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateTenantRequest {
    name: string;
    identifier: string;
}

export interface TenantSummary {
    deviceCount: number;
    devicesByType: Record<string, number>;
    subnetCount: number;
    ipUtilization: number;
    rackCount: number;
}

export const TenantService = {
    getAll: () => apiFetch<Tenant[]>('/tenants'),
    create: (data: CreateTenantRequest) => apiFetch<Tenant>('/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    getSummary: (tenantId: string) => apiFetch<TenantSummary>(`/tenants/${tenantId}/summary`),
};
```

- [ ] **Step 3: Migrate DeviceService.ts**

Replace the full content of `frontend/src/services/DeviceService.ts` with:

```typescript
import { apiFetch } from './apiClient';

export interface Device {
    id: string;
    name: string;
    deviceType: string;
    model?: string;
    serial?: string;
    ip?: string;
    mac?: string;
    status: 'ACTIVE' | 'PLANNED' | 'STORAGE' | 'RETIRED';
    rackId?: string;
    rackName?: string;
    positionU?: number;
    heightU: number;
}

export type CreateDeviceRequest = Omit<Device, 'id' | 'rackName'>;

export const DeviceService = {
    getAll: (tenantId?: string) =>
        apiFetch<Device[]>(tenantId ? `/devices?tenantId=${tenantId}` : '/devices'),

    getById: (id: string) => apiFetch<Device>(`/devices/${id}`),

    create: (device: CreateDeviceRequest) => apiFetch<Device>('/devices', {
        method: 'POST',
        body: JSON.stringify(device),
    }),

    update: (id: string, device: Partial<CreateDeviceRequest>) => apiFetch<Device>(`/devices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(device),
    }),

    delete: (id: string) => apiFetch<void>(`/devices/${id}`, {
        method: 'DELETE',
    }),
};
```

- [ ] **Step 4: Migrate RackService.ts**

Replace the full content of `frontend/src/services/RackService.ts` with:

```typescript
import { apiFetch } from './apiClient';

export interface Rack {
    id: string;
    name: string;
    heightUnits: number;
    devices: RackDevice[];
}

export interface RackDevice {
    id: string;
    name: string;
    deviceType: 'SERVER' | 'SWITCH' | 'ROUTER' | 'FIREWALL' | 'PATCHPANEL' | 'PDU' | 'WIFI_AP' | 'OTHER';
    status: 'ACTIVE' | 'PLANNED' | 'STORAGE' | 'RETIRED';
    positionU?: number;
    heightU: number;
    serialNumber?: string;
    ip?: string;
    model?: string;
}

// Alias for backward compatibility with RackVisualization component
export type Device = RackDevice;

export const RackService = {
    getByTenant: (tenantId: string) => apiFetch<Rack[]>(`/racks?tenantId=${tenantId}`),
    get: (id: string) => apiFetch<Rack>(`/racks/${id}`),
};
```

- [ ] **Step 5: Migrate NetworkService.ts**

Replace the full content of `frontend/src/services/NetworkService.ts` with:

```typescript
import { apiFetch } from './apiClient';

export interface Subnet {
    id: string;
    cidr: string;
    description?: string;
    vlanId?: string;
    vlanTag?: number;
    vlanName?: string;
    gateway?: string;
    usedIps: number;
    totalIps: number;
    utilizationPercent: number;
}

export interface IpAddress {
    id: string;
    address: string;
    status: 'active' | 'reserved' | 'dhcp' | 'manual' | 'free';
    hostname?: string;
    description?: string;
    mac?: string;
}

export interface CreateSubnetRequest {
    cidr: string;
    description?: string;
    gateway?: string;
    vlanId?: string;
    vlanTag?: number;
    vlanName?: string;
    tenantId: string;
}

export interface CreateIpAddressRequest {
    subnetId: string;
    address: string;
    status?: string;
    hostname?: string;
    description?: string;
    mac?: string;
}

export interface UpdateIpAddressRequest {
    status?: string;
    hostname?: string;
    description?: string;
    mac?: string;
}

export const NetworkService = {
    getSubnets: (tenantId: string) => apiFetch<Subnet[]>(`/network/subnets?tenantId=${tenantId}`),

    createSubnet: (data: CreateSubnetRequest) => apiFetch<Subnet>('/network/subnets', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    getIps: (subnetId: string) => apiFetch<IpAddress[]>(`/network/subnets/${subnetId}/ips`),

    createIp: (data: CreateIpAddressRequest) => apiFetch<IpAddress>('/network/ips', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    updateIp: (id: string, data: UpdateIpAddressRequest) => apiFetch<IpAddress>(`/network/ips/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),

    deleteIp: (id: string) => apiFetch<void>(`/network/ips/${id}`, {
        method: 'DELETE',
    }),
};
```

- [ ] **Step 6: Verify frontend compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors. HardwarePage imports `DeviceService` and `Device` — both still exported from the same path.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: consolidate API services into shared apiClient

Extract duplicate apiFetch wrappers into apiClient.ts. Add tenant
filtering params to DeviceService and RackService. Add TenantSummary
type for upcoming dashboard wiring."
```

---

## Task 4: Backend — Deduplicate Device toDto and Add Tenant-Scoped Queries

**Files:**
- Modify: `backend/src/main/kotlin/com/msp/doku/service/DeviceService.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/service/RackService.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/repository/DeviceRepository.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/repository/RackRepository.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/controller/DeviceController.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/controller/RackController.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/dto/RackDto.kt`

- [ ] **Step 1: Add toDto() extension to the DTO file so both services can share it**

Add to the bottom of `backend/src/main/kotlin/com/msp/doku/dto/RackDto.kt`:

```kotlin

// Shared extension functions for mapping
fun Device.toDeviceDto() = DeviceDto(
    id = this.id!!,
    name = this.name,
    deviceType = this.deviceType,
    model = this.model,
    serial = this.serialNumber,
    ip = this.managementIp,
    mac = this.macAddress,
    positionU = this.positionU,
    heightU = this.heightU,
    status = this.status,
    rackId = this.rack?.id,
    rackName = this.rack?.name
)

fun Rack.toRackDto(devices: List<Device> = emptyList()) = RackDto(
    id = this.id!!,
    name = this.name,
    heightUnits = this.heightUnits,
    devices = devices.map { it.toDeviceDto() }
)
```

Add the necessary imports at the top of the file:
```kotlin
import com.msp.doku.domain.Device
import com.msp.doku.domain.Rack
```

- [ ] **Step 2: Update DeviceService to use shared toDto and add tenant filtering**

Replace the full content of `backend/src/main/kotlin/com/msp/doku/service/DeviceService.kt`:

```kotlin
package com.msp.doku.service

import com.msp.doku.domain.Device
import com.msp.doku.domain.DeviceStatus
import com.msp.doku.dto.CreateDeviceRequest
import com.msp.doku.dto.DeviceDto
import com.msp.doku.dto.toDeviceDto
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.RackRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class DeviceService(
    private val deviceRepository: DeviceRepository,
    private val rackRepository: RackRepository
) {

    fun getAllDevices(tenantId: UUID? = null): List<DeviceDto> {
        val devices = if (tenantId != null) {
            deviceRepository.findByTenantId(tenantId)
        } else {
            deviceRepository.findAll()
        }
        return devices.map { it.toDeviceDto() }
    }

    fun getDevice(id: UUID): DeviceDto {
        return deviceRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Device not found") }
            .toDeviceDto()
    }

    fun countByTenantId(tenantId: UUID): Long {
        return deviceRepository.countByTenantId(tenantId)
    }

    @Transactional
    fun createDevice(request: CreateDeviceRequest): DeviceDto {
        val rack = request.rackId?.let {
            rackRepository.findById(it).orElseThrow { IllegalArgumentException("Rack not found") }
        }

        val device = Device(
            name = request.name,
            deviceType = request.deviceType,
            model = request.model,
            serialNumber = request.serial,
            managementIp = request.ip,
            macAddress = request.mac,
            heightU = request.heightU,
            positionU = request.positionU,
            status = request.status,
            rack = rack
        )
        return deviceRepository.save(device).toDeviceDto()
    }

    @Transactional
    fun updateDevice(id: UUID, request: CreateDeviceRequest): DeviceDto {
        val device = deviceRepository.findById(id).orElseThrow { IllegalArgumentException("Device not found") }

        device.name = request.name
        device.deviceType = request.deviceType
        device.model = request.model
        device.serialNumber = request.serial
        device.managementIp = request.ip
        device.macAddress = request.mac
        device.heightU = request.heightU
        device.positionU = request.positionU
        device.status = request.status

        if (request.rackId != null) {
            val rack = rackRepository.findById(request.rackId).orElseThrow { IllegalArgumentException("Rack not found") }
            device.rack = rack
        } else {
            device.rack = null
            device.positionU = null
        }

        return deviceRepository.save(device).toDeviceDto()
    }

    @Transactional
    fun deleteDevice(id: UUID) {
        if (deviceRepository.existsById(id)) {
            deviceRepository.deleteById(id)
        }
    }
}
```

- [ ] **Step 3: Update RackService to use shared toDto and add tenant filtering**

Replace the full content of `backend/src/main/kotlin/com/msp/doku/service/RackService.kt`:

```kotlin
package com.msp.doku.service

import com.msp.doku.domain.Device
import com.msp.doku.domain.Rack
import com.msp.doku.dto.CreateDeviceRequest
import com.msp.doku.dto.CreateRackRequest
import com.msp.doku.dto.DeviceDto
import com.msp.doku.dto.RackDto
import com.msp.doku.dto.toDeviceDto
import com.msp.doku.dto.toRackDto
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.RackRepository
import com.msp.doku.repository.RoomRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class RackService(
    private val rackRepository: RackRepository,
    private val deviceRepository: DeviceRepository,
    private val roomRepository: RoomRepository
) {

    fun getRacksByTenant(tenantId: UUID): List<RackDto> {
        return rackRepository.findByTenantId(tenantId).map { rack ->
            val devices = deviceRepository.findByRackId(rack.id!!)
            rack.toRackDto(devices)
        }
    }

    fun getRack(id: UUID): RackDto {
        val rack = rackRepository.findById(id).orElseThrow { IllegalArgumentException("Rack not found") }
        val devices = deviceRepository.findByRackId(id)
        return rack.toRackDto(devices)
    }

    fun countByTenantId(tenantId: UUID): Long {
        return rackRepository.countByTenantId(tenantId)
    }

    @Transactional
    fun createRackWithRoom(request: CreateRackRequest, roomId: UUID): RackDto {
        val room = roomRepository.findById(roomId).orElseThrow { IllegalArgumentException("Room not found") }
        val rack = Rack(
            name = request.name,
            heightUnits = request.heightUnits,
            room = room
        )
        return rackRepository.save(rack).toRackDto()
    }

    @Transactional
    fun addDeviceToRack(request: CreateDeviceRequest): DeviceDto {
        val rack = request.rackId?.let { rackRepository.findById(it).orElseThrow { IllegalArgumentException("Rack not found") } }

        val device = Device(
            name = request.name,
            deviceType = request.deviceType,
            model = request.model,
            serialNumber = request.serial,
            managementIp = request.ip,
            macAddress = request.mac,
            heightU = request.heightU,
            positionU = request.positionU,
            status = request.status,
            rack = rack
        )
        return deviceRepository.save(device).toDeviceDto()
    }
}
```

- [ ] **Step 4: Add tenant-scoped queries to DeviceRepository**

Replace `backend/src/main/kotlin/com/msp/doku/repository/DeviceRepository.kt`:

```kotlin
package com.msp.doku.repository

import com.msp.doku.domain.Device
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface DeviceRepository : JpaRepository<Device, UUID> {
    fun findByRackId(rackId: UUID): List<Device>

    @Query("SELECT d FROM Device d WHERE d.rack.room.site.tenant.id = :tenantId OR d.site.tenant.id = :tenantId")
    fun findByTenantId(tenantId: UUID): List<Device>

    @Query("SELECT COUNT(d) FROM Device d WHERE d.rack.room.site.tenant.id = :tenantId OR d.site.tenant.id = :tenantId")
    fun countByTenantId(tenantId: UUID): Long

    @Query("SELECT d FROM Device d WHERE (d.rack.room.site.tenant.id = :tenantId OR d.site.tenant.id = :tenantId) AND d.rack IS NULL")
    fun findUnplacedByTenantId(tenantId: UUID): List<Device>
}
```

- [ ] **Step 5: Add tenant-scoped queries to RackRepository**

Replace `backend/src/main/kotlin/com/msp/doku/repository/RackRepository.kt`:

```kotlin
package com.msp.doku.repository

import com.msp.doku.domain.Rack
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface RackRepository : JpaRepository<Rack, UUID> {
    @Query("SELECT r FROM Rack r WHERE r.room.site.tenant.id = :tenantId")
    fun findByTenantId(tenantId: UUID): List<Rack>

    @Query("SELECT COUNT(r) FROM Rack r WHERE r.room.site.tenant.id = :tenantId")
    fun countByTenantId(tenantId: UUID): Long
}
```

- [ ] **Step 6: Update DeviceController with optional tenantId**

Replace `backend/src/main/kotlin/com/msp/doku/controller/DeviceController.kt`:

```kotlin
package com.msp.doku.controller

import com.msp.doku.dto.CreateDeviceRequest
import com.msp.doku.dto.DeviceDto
import com.msp.doku.service.DeviceService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/devices")
class DeviceController(
    private val deviceService: DeviceService
) {

    @GetMapping
    fun getAllDevices(@RequestParam(required = false) tenantId: UUID?): List<DeviceDto> {
        return deviceService.getAllDevices(tenantId)
    }

    @GetMapping("/{id}")
    fun getDevice(@PathVariable id: UUID): DeviceDto {
        return deviceService.getDevice(id)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createDevice(@RequestBody request: CreateDeviceRequest): DeviceDto {
        return deviceService.createDevice(request)
    }

    @PutMapping("/{id}")
    fun updateDevice(@PathVariable id: UUID, @RequestBody request: CreateDeviceRequest): DeviceDto {
        return deviceService.updateDevice(id, request)
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteDevice(@PathVariable id: UUID) {
        deviceService.deleteDevice(id)
    }
}
```

- [ ] **Step 7: Update RackController with tenant filtering, remove broken stub**

Replace `backend/src/main/kotlin/com/msp/doku/controller/RackController.kt`:

```kotlin
package com.msp.doku.controller

import com.msp.doku.dto.CreateDeviceRequest
import com.msp.doku.dto.CreateRackRequest
import com.msp.doku.dto.DeviceDto
import com.msp.doku.dto.RackDto
import com.msp.doku.service.RackService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/racks")
class RackController(
    private val rackService: RackService
) {

    @GetMapping
    fun getRacks(@RequestParam tenantId: UUID): List<RackDto> {
        return rackService.getRacksByTenant(tenantId)
    }

    @GetMapping("/{id}")
    fun getRack(@PathVariable id: UUID): RackDto {
        return rackService.getRack(id)
    }

    @PostMapping("/{roomId}")
    @ResponseStatus(HttpStatus.CREATED)
    fun createRackInRoom(@PathVariable roomId: UUID, @RequestBody request: CreateRackRequest): RackDto {
        return rackService.createRackWithRoom(request, roomId)
    }

    @PostMapping("/{id}/devices")
    @ResponseStatus(HttpStatus.CREATED)
    fun addDevice(@PathVariable id: UUID, @RequestBody request: CreateDeviceRequest): DeviceDto {
        val enrichedRequest = request.copy(rackId = id)
        return rackService.addDeviceToRack(enrichedRequest)
    }
}
```

- [ ] **Step 8: Verify backend compiles**

```bash
cd backend && ./gradlew compileKotlin
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: deduplicate toDto, add tenant-scoped queries

Extract shared toDeviceDto/toRackDto extensions into RackDto.kt.
Add JPQL queries to filter devices and racks by tenant through the
Room→Site→Tenant chain. Add tenantId query param to controllers."
```

---

## Task 5: Backend — Dashboard Stats & Activity Endpoints

**Files:**
- Create: `backend/src/main/kotlin/com/msp/doku/dto/DashboardDtos.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/service/DashboardService.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/controller/DashboardController.kt`

- [ ] **Step 1: Create DashboardDtos.kt**

Create `backend/src/main/kotlin/com/msp/doku/dto/DashboardDtos.kt`:

```kotlin
package com.msp.doku.dto

import java.time.Instant

data class DashboardStatsDto(
    val tenantCount: Long,
    val totalDevices: Long,
    val totalSubnets: Long,
    val totalIpAddresses: Long
)

data class ActivityEntryDto(
    val type: String,
    val name: String,
    val tenantName: String?,
    val action: String,
    val timestamp: Instant
)
```

- [ ] **Step 2: Create DashboardService.kt**

Create `backend/src/main/kotlin/com/msp/doku/service/DashboardService.kt`:

```kotlin
package com.msp.doku.service

import com.msp.doku.dto.ActivityEntryDto
import com.msp.doku.dto.DashboardStatsDto
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import org.springframework.stereotype.Service

@Service
class DashboardService(
    private val tenantRepository: TenantRepository,
    private val deviceRepository: DeviceRepository,
    private val subnetRepository: SubnetRepository,
    private val ipAddressRepository: IpAddressRepository
) {

    fun getStats(): DashboardStatsDto {
        return DashboardStatsDto(
            tenantCount = tenantRepository.count(),
            totalDevices = deviceRepository.count(),
            totalSubnets = subnetRepository.count(),
            totalIpAddresses = ipAddressRepository.count()
        )
    }

    fun getRecentActivity(limit: Int): List<ActivityEntryDto> {
        val activities = mutableListOf<ActivityEntryDto>()

        // Recent devices
        deviceRepository.findAll().forEach { device ->
            val tenantName = device.rack?.room?.site?.tenant?.name
                ?: device.site?.tenant?.name
            activities.add(ActivityEntryDto(
                type = "device",
                name = device.name,
                tenantName = tenantName,
                action = if (device.updatedAt != null && device.createdAt != null &&
                    device.updatedAt != device.createdAt) "updated" else "created",
                timestamp = device.updatedAt ?: device.createdAt!!
            ))
        }

        // Recent subnets
        subnetRepository.findAll().forEach { subnet ->
            activities.add(ActivityEntryDto(
                type = "subnet",
                name = subnet.cidr,
                tenantName = subnet.tenant.name,
                action = if (subnet.updatedAt != null && subnet.createdAt != null &&
                    subnet.updatedAt != subnet.createdAt) "updated" else "created",
                timestamp = subnet.updatedAt ?: subnet.createdAt!!
            ))
        }

        // Recent IPs
        ipAddressRepository.findAll().forEach { ip ->
            activities.add(ActivityEntryDto(
                type = "ip_address",
                name = ip.address,
                tenantName = ip.subnet.tenant.name,
                action = if (ip.updatedAt != null && ip.createdAt != null &&
                    ip.updatedAt != ip.createdAt) "updated" else "created",
                timestamp = ip.updatedAt ?: ip.createdAt!!
            ))
        }

        return activities.sortedByDescending { it.timestamp }.take(limit)
    }
}
```

- [ ] **Step 3: Create DashboardController.kt**

Create `backend/src/main/kotlin/com/msp/doku/controller/DashboardController.kt`:

```kotlin
package com.msp.doku.controller

import com.msp.doku.dto.ActivityEntryDto
import com.msp.doku.dto.DashboardStatsDto
import com.msp.doku.service.DashboardService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/dashboard")
class DashboardController(
    private val dashboardService: DashboardService
) {

    @GetMapping("/stats")
    fun getStats(): DashboardStatsDto {
        return dashboardService.getStats()
    }

    @GetMapping("/activity")
    fun getActivity(@RequestParam(defaultValue = "20") limit: Int): List<ActivityEntryDto> {
        return dashboardService.getRecentActivity(limit)
    }
}
```

- [ ] **Step 4: Verify backend compiles**

```bash
cd backend && ./gradlew compileKotlin
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(backend): add dashboard stats and activity endpoints

GET /api/v1/dashboard/stats returns tenant, device, subnet, IP counts.
GET /api/v1/dashboard/activity returns recent changes sorted by timestamp."
```

---

## Task 6: Backend — Tenant Summary Endpoint

**Files:**
- Modify: `backend/src/main/kotlin/com/msp/doku/dto/TenantDto.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/service/TenantService.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/controller/TenantController.kt`

- [ ] **Step 1: Add TenantSummaryDto to TenantDto.kt**

Add to the bottom of `backend/src/main/kotlin/com/msp/doku/dto/TenantDto.kt`:

```kotlin

data class TenantSummaryDto(
    val deviceCount: Long,
    val devicesByType: Map<String, Long>,
    val subnetCount: Long,
    val ipUtilization: Double,
    val rackCount: Long
)
```

- [ ] **Step 2: Add getSummary to TenantService.kt**

Add these imports at the top of `TenantService.kt`:

```kotlin
import com.msp.doku.dto.TenantSummaryDto
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.RackRepository
import java.util.UUID
import kotlin.math.pow
```

Update the constructor to inject new repos:

```kotlin
@Service
class TenantService(
    private val tenantRepository: TenantRepository,
    private val deviceRepository: DeviceRepository,
    private val subnetRepository: SubnetRepository,
    private val ipAddressRepository: IpAddressRepository,
    private val rackRepository: RackRepository
) {
```

Add the `getSummary` method after `createTenant`:

```kotlin
    fun getSummary(tenantId: UUID): TenantSummaryDto {
        val devices = deviceRepository.findByTenantId(tenantId)
        val devicesByType = devices.groupBy { it.deviceType.name }.mapValues { it.value.size.toLong() }

        val subnets = subnetRepository.findByTenantId(tenantId)
        val subnetCount = subnets.size.toLong()

        var totalIps = 0
        var usedIps = 0
        subnets.forEach { subnet ->
            val prefix = subnet.cidr.split("/").getOrNull(1)?.toIntOrNull() ?: 0
            totalIps += 2.0.pow(32 - prefix).toInt()
            usedIps += ipAddressRepository.countBySubnetId(subnet.id!!)
        }
        val ipUtilization = if (totalIps > 0) (usedIps.toDouble() / totalIps) * 100 else 0.0

        val rackCount = rackRepository.countByTenantId(tenantId)

        return TenantSummaryDto(
            deviceCount = devices.size.toLong(),
            devicesByType = devicesByType,
            subnetCount = subnetCount,
            ipUtilization = ipUtilization,
            rackCount = rackCount
        )
    }
```

- [ ] **Step 3: Add summary endpoint to TenantController.kt**

Add this import and method to `TenantController.kt`:

```kotlin
import org.springframework.web.bind.annotation.PathVariable
import java.util.UUID
```

Add after `createTenant`:

```kotlin
    @GetMapping("/{id}/summary")
    fun getTenantSummary(@PathVariable id: UUID): TenantSummaryDto {
        return tenantService.getSummary(id)
    }
```

Add DTO import:
```kotlin
import com.msp.doku.dto.TenantSummaryDto
```

- [ ] **Step 4: Verify backend compiles**

```bash
cd backend && ./gradlew compileKotlin
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(backend): add tenant summary endpoint

GET /api/v1/tenants/{id}/summary returns device counts by type,
subnet count, IP utilization percentage, and rack count."
```

---

## Task 7: Backend — Public IP Range Entity & CRUD

**Files:**
- Create: `backend/src/main/resources/db/migration/V6__add_public_ip_ranges.sql`
- Create: `backend/src/main/kotlin/com/msp/doku/domain/PublicIpRange.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/repository/PublicIpRangeRepository.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/dto/PublicIpRangeDtos.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/service/PublicIpRangeService.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/controller/DatacenterController.kt`

- [ ] **Step 1: Create Flyway migration V6**

Create `backend/src/main/resources/db/migration/V6__add_public_ip_ranges.sql`:

```sql
CREATE TABLE public_ip_ranges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cidr VARCHAR(50) NOT NULL,
    description TEXT,
    assigned_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    provider VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_public_ip_ranges_tenant ON public_ip_ranges(assigned_tenant_id);
```

- [ ] **Step 2: Create PublicIpRange entity**

Create `backend/src/main/kotlin/com/msp/doku/domain/PublicIpRange.kt`:

```kotlin
package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "public_ip_ranges")
class PublicIpRange(
    @Column(nullable = false)
    var cidr: String,

    var description: String? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_tenant_id")
    var assignedTenant: Tenant? = null,

    var provider: String? = null,

    @Column(nullable = false)
    var status: String = "active"
) : BaseEntity()
```

- [ ] **Step 3: Create PublicIpRangeRepository**

Create `backend/src/main/kotlin/com/msp/doku/repository/PublicIpRangeRepository.kt`:

```kotlin
package com.msp.doku.repository

import com.msp.doku.domain.PublicIpRange
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface PublicIpRangeRepository : JpaRepository<PublicIpRange, UUID>
```

- [ ] **Step 4: Create PublicIpRangeDtos**

Create `backend/src/main/kotlin/com/msp/doku/dto/PublicIpRangeDtos.kt`:

```kotlin
package com.msp.doku.dto

import java.time.Instant
import java.util.UUID

data class PublicIpRangeDto(
    val id: UUID,
    val cidr: String,
    val description: String?,
    val assignedTenantId: UUID?,
    val assignedTenantName: String?,
    val provider: String?,
    val status: String,
    val createdAt: Instant?,
    val updatedAt: Instant?
)

data class CreatePublicIpRangeRequest(
    val cidr: String,
    val description: String? = null,
    val assignedTenantId: UUID? = null,
    val provider: String? = null,
    val status: String = "active"
)

data class UpdatePublicIpRangeRequest(
    val cidr: String? = null,
    val description: String? = null,
    val assignedTenantId: UUID? = null,
    val provider: String? = null,
    val status: String? = null
)
```

- [ ] **Step 5: Create PublicIpRangeService**

Create `backend/src/main/kotlin/com/msp/doku/service/PublicIpRangeService.kt`:

```kotlin
package com.msp.doku.service

import com.msp.doku.domain.PublicIpRange
import com.msp.doku.dto.CreatePublicIpRangeRequest
import com.msp.doku.dto.PublicIpRangeDto
import com.msp.doku.dto.UpdatePublicIpRangeRequest
import com.msp.doku.repository.PublicIpRangeRepository
import com.msp.doku.repository.TenantRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class PublicIpRangeService(
    private val publicIpRangeRepository: PublicIpRangeRepository,
    private val tenantRepository: TenantRepository
) {

    fun getAll(): List<PublicIpRangeDto> {
        return publicIpRangeRepository.findAll().map { it.toDto() }
    }

    @Transactional
    fun create(request: CreatePublicIpRangeRequest): PublicIpRangeDto {
        val tenant = request.assignedTenantId?.let {
            tenantRepository.findById(it).orElseThrow { IllegalArgumentException("Tenant not found") }
        }

        val range = PublicIpRange(
            cidr = request.cidr,
            description = request.description,
            assignedTenant = tenant,
            provider = request.provider,
            status = request.status
        )
        return publicIpRangeRepository.save(range).toDto()
    }

    @Transactional
    fun update(id: UUID, request: UpdatePublicIpRangeRequest): PublicIpRangeDto {
        val range = publicIpRangeRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Public IP range not found") }

        request.cidr?.let { range.cidr = it }
        request.description?.let { range.description = it }
        request.provider?.let { range.provider = it }
        request.status?.let { range.status = it }
        if (request.assignedTenantId != null) {
            range.assignedTenant = tenantRepository.findById(request.assignedTenantId)
                .orElseThrow { IllegalArgumentException("Tenant not found") }
        }

        return publicIpRangeRepository.save(range).toDto()
    }

    @Transactional
    fun delete(id: UUID) {
        if (!publicIpRangeRepository.existsById(id)) {
            throw IllegalArgumentException("Public IP range not found")
        }
        publicIpRangeRepository.deleteById(id)
    }

    private fun PublicIpRange.toDto() = PublicIpRangeDto(
        id = this.id!!,
        cidr = this.cidr,
        description = this.description,
        assignedTenantId = this.assignedTenant?.id,
        assignedTenantName = this.assignedTenant?.name,
        provider = this.provider,
        status = this.status,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt
    )
}
```

- [ ] **Step 6: Create DatacenterController**

Create `backend/src/main/kotlin/com/msp/doku/controller/DatacenterController.kt`:

```kotlin
package com.msp.doku.controller

import com.msp.doku.dto.CreatePublicIpRangeRequest
import com.msp.doku.dto.PublicIpRangeDto
import com.msp.doku.dto.UpdatePublicIpRangeRequest
import com.msp.doku.service.PublicIpRangeService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/datacenter")
class DatacenterController(
    private val publicIpRangeService: PublicIpRangeService
) {

    @GetMapping("/ip-ranges")
    fun getAll(): List<PublicIpRangeDto> {
        return publicIpRangeService.getAll()
    }

    @PostMapping("/ip-ranges")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@RequestBody request: CreatePublicIpRangeRequest): PublicIpRangeDto {
        return publicIpRangeService.create(request)
    }

    @PutMapping("/ip-ranges/{id}")
    fun update(@PathVariable id: UUID, @RequestBody request: UpdatePublicIpRangeRequest): PublicIpRangeDto {
        return publicIpRangeService.update(id, request)
    }

    @DeleteMapping("/ip-ranges/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: UUID) {
        publicIpRangeService.delete(id)
    }
}
```

- [ ] **Step 7: Verify backend compiles**

```bash
cd backend && ./gradlew compileKotlin
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(backend): add PublicIpRange entity and datacenter CRUD

V6 migration creates public_ip_ranges table. Full CRUD at
/api/v1/datacenter/ip-ranges with optional tenant assignment."
```

---

## Task 8: Frontend — Wire DashboardPage to Real APIs

**Files:**
- Create: `frontend/src/services/DashboardService.ts`
- Modify: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Create DashboardService.ts**

Create `frontend/src/services/DashboardService.ts`:

```typescript
import { apiFetch } from './apiClient';

export interface DashboardStats {
    tenantCount: number;
    totalDevices: number;
    totalSubnets: number;
    totalIpAddresses: number;
}

export interface ActivityEntry {
    type: 'device' | 'subnet' | 'ip_address';
    name: string;
    tenantName: string | null;
    action: 'created' | 'updated';
    timestamp: string;
}

export const DashboardService = {
    getStats: () => apiFetch<DashboardStats>('/dashboard/stats'),
    getActivity: (limit = 20) => apiFetch<ActivityEntry[]>(`/dashboard/activity?limit=${limit}`),
};
```

- [ ] **Step 2: Rewrite DashboardPage.tsx**

Replace the full content of `frontend/src/pages/DashboardPage.tsx`:

```tsx
import { Server, Users, Network, Database, Clock, ArrowUpRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardService } from '../services/DashboardService';

export default function DashboardPage() {
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: DashboardService.getStats,
    });

    const { data: activity, isLoading: activityLoading } = useQuery({
        queryKey: ['dashboard', 'activity'],
        queryFn: () => DashboardService.getActivity(20),
    });

    const statCards = [
        { label: 'Tenants', value: stats?.tenantCount ?? 0, icon: <Users size={20} />, color: 'text-sky-700 bg-sky-100', link: '/tenants' },
        { label: 'Geräte', value: stats?.totalDevices ?? 0, icon: <Server size={20} />, color: 'text-emerald-700 bg-emerald-100', link: '/tenants' },
        { label: 'Subnetze', value: stats?.totalSubnets ?? 0, icon: <Network size={20} />, color: 'text-cyan-700 bg-cyan-100', link: '/datacenter' },
        { label: 'IP-Adressen', value: stats?.totalIpAddresses ?? 0, icon: <Database size={20} />, color: 'text-violet-700 bg-violet-100', link: '/datacenter' },
    ];

    return (
        <div className="page">
            <div className="mb-8">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Übersicht aller MSP-Dokumentationen</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map(stat => (
                    <Link
                        key={stat.label}
                        to={stat.link}
                        className="card p-5 group flex items-start gap-4"
                    >
                        <div className={`p-2.5 rounded-lg ${stat.color}`}>
                            {stat.icon}
                        </div>
                        <div>
                            {statsLoading ? (
                                <Loader2 size={20} className="animate-spin text-slate-400" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                            )}
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">{stat.label}</p>
                        </div>
                        <ArrowUpRight size={14} className="ml-auto text-slate-400 dark:text-slate-500 group-hover:text-primary-500 transition-colors" />
                    </Link>
                ))}
            </div>

            {/* Recent Changes */}
            <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-white/70 dark:border-white/10 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock size={16} className="text-slate-500 dark:text-slate-400" />
                        Letzte Änderungen
                    </h2>
                </div>
                <div className="divide-y divide-white/70 dark:divide-white/10">
                    {activityLoading ? (
                        <div className="px-5 py-8 text-center">
                            <Loader2 size={20} className="animate-spin text-slate-400 mx-auto" />
                        </div>
                    ) : activity && activity.length > 0 ? (
                        activity.map((entry, idx) => (
                            <div key={idx} className="px-5 py-3 hover:bg-white/70 dark:hover:bg-white/5 transition-colors flex items-center gap-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                        {entry.name} {entry.action === 'created' ? 'erstellt' : 'aktualisiert'}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {entry.tenantName ?? 'Global'} · {entry.type === 'device' ? 'Gerät' : entry.type === 'subnet' ? 'Subnetz' : 'IP-Adresse'}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[11px] text-slate-500 dark:text-slate-500">
                                        {new Date(entry.timestamp).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-5 py-8 text-center text-sm text-slate-400">
                            Noch keine Änderungen vorhanden
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Verify frontend compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(frontend): wire DashboardPage to real API

Replace hardcoded stats and activity feed with React Query calls
to /api/v1/dashboard/stats and /api/v1/dashboard/activity."
```

---

## Task 9: Frontend — Wire TenantDashboardPage to Real APIs

**Files:**
- Modify: `frontend/src/pages/TenantDashboardPage.tsx`

- [ ] **Step 1: Rewrite TenantDashboardPage.tsx**

Replace the full content of `frontend/src/pages/TenantDashboardPage.tsx`:

```tsx
import { useParams, Link } from 'react-router-dom';
import { Server, Network, ArrowRight, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { TenantService, type Tenant } from '../services/TenantService';

export default function TenantDashboardPage() {
    const { tenantId } = useParams<{ tenantId: string }>();

    const { data: tenants } = useQuery({
        queryKey: ['tenants'],
        queryFn: TenantService.getAll,
    });

    const { data: summary, isLoading } = useQuery({
        queryKey: ['tenant', tenantId, 'summary'],
        queryFn: () => TenantService.getSummary(tenantId!),
        enabled: !!tenantId,
    });

    const tenant = tenants?.find((t: Tenant) => t.id === tenantId);

    return (
        <div className="page">
            {/* Header */}
            <div className="mb-8">
                <h1 className="page-title">{tenant?.name ?? 'Tenant'}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-mono">{tenant?.identifier}</p>
            </div>

            {/* Quick Stats */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-slate-400" />
                </div>
            ) : summary ? (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard label="Geräte" value={summary.deviceCount} />
                        <StatCard label="Subnetze" value={summary.subnetCount} />
                        <StatCard label="IP-Auslastung" value={`${summary.ipUtilization.toFixed(1)}%`} />
                        <StatCard label="Racks" value={summary.rackCount} />
                    </div>

                    {/* Device Breakdown */}
                    {Object.keys(summary.devicesByType).length > 0 && (
                        <div className="card p-5 mb-6">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Geräte nach Typ</h3>
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(summary.devicesByType).map(([type, count]) => (
                                    <div key={type} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        {type}: {count}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-12 text-sm text-slate-400">
                    Keine Infrastrukturdaten vorhanden
                </div>
            )}

            {/* Quick Navigation */}
            <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-white/70 dark:border-white/10">
                    <h2 className="font-semibold text-slate-900 dark:text-white">Schnellzugriff</h2>
                </div>
                <div className="divide-y divide-white/70 dark:divide-white/10">
                    <QuickLink icon={<Server size={16} />} label="Racks & Hardware" to={`/tenants/${tenantId}/racks`} />
                    <QuickLink icon={<Network size={16} />} label="IP-Plan & Netzwerk" to={`/tenants/${tenantId}/network`} />
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="card p-5">
            <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{label}</p>
        </div>
    );
}

function QuickLink({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
    return (
        <Link to={to} className="px-5 py-4 flex items-center gap-4 hover:bg-white/70 dark:hover:bg-white/5 transition-colors group">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {icon}
            </div>
            <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
            <ArrowRight size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-primary-500 transition-colors" />
        </Link>
    );
}
```

- [ ] **Step 2: Verify frontend compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(frontend): wire TenantDashboardPage to real API

Replace mock data with React Query call to /api/v1/tenants/{id}/summary.
Show device breakdown by type, subnet count, IP utilization, rack count.
Remove contract/license UI (handled in SDP MSP)."
```

---

## Task 10: Frontend — Wire RackListPage to Real APIs

**Files:**
- Modify: `frontend/src/pages/RackListPage.tsx`

- [ ] **Step 1: Rewrite RackListPage.tsx**

Replace the full content of `frontend/src/pages/RackListPage.tsx`:

```tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RackService, type Rack, type RackDevice } from '../services/RackService';
import { DeviceService } from '../services/DeviceService';
import RackVisualization from '../components/rack/RackVisualization';
import { Cpu, Monitor, X, Wifi, Shield, Box, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

function getDeviceIcon(type: string) {
    switch (type) {
        case 'SERVER': return <Cpu size={14} />;
        case 'SWITCH': return <Monitor size={14} />;
        case 'FIREWALL': return <Shield size={14} />;
        case 'WIFI_AP': return <Wifi size={14} />;
        default: return <Box size={14} />;
    }
}

export default function RackListPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const [selectedDevice, setSelectedDevice] = useState<RackDevice | null>(null);

    const { data: racks, isLoading: racksLoading } = useQuery({
        queryKey: ['racks', tenantId],
        queryFn: () => RackService.getByTenant(tenantId!),
        enabled: !!tenantId,
    });

    const { data: unplacedDevices } = useQuery({
        queryKey: ['devices', 'unplaced', tenantId],
        queryFn: async () => {
            const all = await DeviceService.getAll(tenantId);
            return all.filter(d => !d.rackId);
        },
        enabled: !!tenantId,
    });

    const firstRack = racks?.[0];

    if (racksLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
        );
    }

    if (!racks || racks.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Box size={48} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-slate-600">Keine Racks vorhanden</p>
                    <p className="text-sm text-slate-400 mt-1">Erstelle zunächst einen Standort, Raum und Rack.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {/* Left Panel: Unplaced Devices */}
            <div className="w-60 border-r border-white/60 bg-white/80 backdrop-blur flex-shrink-0 flex flex-col">
                <div className="p-4 border-b border-white/70">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Box size={14} className="text-slate-400" />
                        Lager / Unplatziert
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{unplacedDevices?.length ?? 0} Geräte</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {unplacedDevices?.map(device => (
                        <button
                            key={device.id}
                            onClick={() => setSelectedDevice({
                                id: device.id,
                                name: device.name,
                                deviceType: device.deviceType as RackDevice['deviceType'],
                                status: device.status,
                                heightU: device.heightU,
                                serialNumber: device.serial,
                                ip: device.ip,
                                model: device.model,
                            })}
                            className={cn(
                                'w-full text-left px-3 py-2.5 rounded-xl border transition-colors text-xs',
                                selectedDevice?.id === device.id
                                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                                    : 'bg-white/80 border-white/60 text-slate-600 hover:bg-white'
                            )}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                {getDeviceIcon(device.deviceType)}
                                <span className="font-medium truncate">{device.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span>{device.heightU}U</span>
                                <span className="badge badge-planned text-[10px] py-0">{device.status}</span>
                            </div>
                        </button>
                    ))}
                    {(!unplacedDevices || unplacedDevices.length === 0) && (
                        <p className="text-xs text-slate-400 px-3 py-4 text-center">Keine unplatzierten Geräte</p>
                    )}
                </div>
            </div>

            {/* Center: Rack Visualization */}
            <div className="flex-1 flex items-start justify-center overflow-auto p-6 bg-white/60">
                {firstRack && (
                    <RackVisualization
                        rack={{
                            id: firstRack.id,
                            name: firstRack.name,
                            heightUnits: firstRack.heightUnits,
                            devices: firstRack.devices.map(d => ({
                                id: d.id,
                                name: d.name,
                                deviceType: d.deviceType,
                                status: d.status,
                                positionU: d.positionU,
                                heightU: d.heightU,
                            })),
                        }}
                        onDeviceClick={(device) => {
                            const full = firstRack.devices.find(d => d.id === device.id);
                            if (full) setSelectedDevice(full);
                        }}
                    />
                )}
            </div>

            {/* Right Panel: Device Detail */}
            <div className={cn(
                'w-72 border-l border-white/60 bg-white/85 backdrop-blur flex-shrink-0 flex flex-col transition-all',
                selectedDevice ? 'translate-x-0' : 'translate-x-full hidden'
            )}>
                {selectedDevice && (
                    <>
                        <div className="p-4 border-b border-white/70 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-800 truncate">{selectedDevice.name}</h3>
                            <button onClick={() => setSelectedDevice(null)} className="btn-icon">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <DetailSection title="Grunddaten">
                                <DetailRow label="Typ" value={selectedDevice.deviceType} />
                                <DetailRow label="Status" value={selectedDevice.status} badge />
                                <DetailRow label="Höhe" value={`${selectedDevice.heightU} HE`} />
                                {selectedDevice.positionU && (
                                    <DetailRow label="Position" value={`U${selectedDevice.positionU}`} />
                                )}
                            </DetailSection>
                            <DetailSection title="Technische Details">
                                {selectedDevice.ip && <DetailRow label="IP" value={selectedDevice.ip} copyable />}
                                {selectedDevice.serialNumber && <DetailRow label="Seriennr." value={selectedDevice.serialNumber} copyable />}
                                {selectedDevice.model && <DetailRow label="Modell" value={selectedDevice.model} />}
                            </DetailSection>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</h4>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function DetailRow({ label, value, copyable, badge }: {
    label: string; value: string; copyable?: boolean; badge?: boolean;
}) {
    const handleCopy = () => { navigator.clipboard.writeText(value); };

    return (
        <div className="flex items-center justify-between group text-xs">
            <span className="text-slate-500">{label}</span>
            <div className="flex items-center gap-1.5">
                {badge ? (
                    <span className={cn('badge text-[10px]',
                        value === 'ACTIVE' && 'badge-ok',
                        value === 'PLANNED' && 'badge-planned',
                        value === 'STORAGE' && 'badge-warning',
                    )}>{value}</span>
                ) : (
                    <span className={cn('text-slate-800 font-medium', copyable && 'font-mono')}>{value}</span>
                )}
                {copyable && (
                    <button onClick={handleCopy} className="copy-btn" title="Kopieren">📋</button>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify frontend compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(frontend): wire RackListPage to real API

Replace mock rack/device data with React Query calls to
/api/v1/racks?tenantId and /api/v1/devices?tenantId.
Device details now come from real DB fields."
```

---

## Task 11: Frontend — Wire DatacenterPage to Real APIs

**Files:**
- Create: `frontend/src/services/DatacenterService.ts`
- Modify: `frontend/src/pages/DatacenterPage.tsx`

- [ ] **Step 1: Create DatacenterService.ts**

Create `frontend/src/services/DatacenterService.ts`:

```typescript
import { apiFetch } from './apiClient';

export interface PublicIpRange {
    id: string;
    cidr: string;
    description: string | null;
    assignedTenantId: string | null;
    assignedTenantName: string | null;
    provider: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePublicIpRangeRequest {
    cidr: string;
    description?: string;
    assignedTenantId?: string;
    provider?: string;
    status?: string;
}

export const DatacenterService = {
    getAll: () => apiFetch<PublicIpRange[]>('/datacenter/ip-ranges'),

    create: (data: CreatePublicIpRangeRequest) => apiFetch<PublicIpRange>('/datacenter/ip-ranges', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    update: (id: string, data: Partial<CreatePublicIpRangeRequest>) =>
        apiFetch<PublicIpRange>(`/datacenter/ip-ranges/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: string) => apiFetch<void>(`/datacenter/ip-ranges/${id}`, {
        method: 'DELETE',
    }),
};
```

- [ ] **Step 2: Rewrite DatacenterPage.tsx**

Replace the full content of `frontend/src/pages/DatacenterPage.tsx`:

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DatacenterService, type PublicIpRange } from '../services/DatacenterService';
import { cn } from '../lib/utils';
import { Globe, ChevronRight, Plus, Loader2, Trash2, X } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

export default function DatacenterPage() {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [selectedRange, setSelectedRange] = useState<PublicIpRange | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data: ranges, isLoading } = useQuery({
        queryKey: ['datacenter', 'ip-ranges'],
        queryFn: DatacenterService.getAll,
    });

    const deleteMutation = useMutation({
        mutationFn: DatacenterService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datacenter', 'ip-ranges'] });
            setSelectedRange(null);
            addToast({ type: 'success', title: 'IP Range gelöscht' });
        },
    });

    const createMutation = useMutation({
        mutationFn: DatacenterService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datacenter', 'ip-ranges'] });
            setShowCreateModal(false);
            addToast({ type: 'success', title: 'IP Range erstellt' });
        },
    });

    // Auto-select first range
    const active = selectedRange ?? ranges?.[0] ?? null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {/* Left: Range List */}
            <div className="w-72 border-r border-white/60 bg-white/80 backdrop-blur flex-shrink-0 flex flex-col">
                <div className="p-4 border-b border-white/70">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Globe size={16} className="text-primary-500" />
                            IP Ranges
                        </h2>
                        <button className="btn-icon text-primary-500" onClick={() => setShowCreateModal(true)}>
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {ranges && ranges.length > 0 ? ranges.map(range => (
                        <button
                            key={range.id}
                            onClick={() => setSelectedRange(range)}
                            className={cn(
                                'w-full text-left px-4 py-3 border-b border-white/70 flex items-center gap-3 transition-colors',
                                active?.id === range.id
                                    ? 'bg-primary-50 border-l-2 border-l-primary-400'
                                    : 'hover:bg-white/70'
                            )}
                        >
                            <div className="flex-1">
                                <p className="text-sm font-mono font-semibold text-slate-800">{range.cidr}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{range.description ?? range.provider ?? 'Kein Beschrieb'}</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-300" />
                        </button>
                    )) : (
                        <div className="p-6 text-center text-sm text-slate-400">
                            Keine IP Ranges vorhanden
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Detail */}
            <div className="flex-1 flex flex-col min-w-0">
                {active ? (
                    <>
                        <div className="px-6 py-4 bg-white/75 backdrop-blur border-b border-white/60 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800 font-mono">{active.cidr}</h2>
                                <p className="text-xs text-slate-500">{active.description}</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                                <span>Status: <strong>{active.status}</strong></span>
                                {active.provider && <span>Provider: <strong>{active.provider}</strong></span>}
                                {active.assignedTenantName && <span>Tenant: <strong>{active.assignedTenantName}</strong></span>}
                                <button
                                    onClick={() => deleteMutation.mutate(active.id)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Löschen"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-6">
                            <div className="card p-6">
                                <h3 className="text-sm font-semibold text-slate-700 mb-4">Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><span className="text-slate-500">CIDR:</span> <span className="font-mono font-semibold">{active.cidr}</span></div>
                                    <div><span className="text-slate-500">Status:</span> <span className="font-semibold">{active.status}</span></div>
                                    <div><span className="text-slate-500">Provider:</span> <span>{active.provider ?? '-'}</span></div>
                                    <div><span className="text-slate-500">Tenant:</span> <span>{active.assignedTenantName ?? 'Nicht zugewiesen'}</span></div>
                                    <div><span className="text-slate-500">Erstellt:</span> <span>{active.createdAt ? new Date(active.createdAt).toLocaleDateString('de-CH') : '-'}</span></div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                        Wähle eine IP Range aus oder erstelle eine neue
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateRangeModal
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={(data) => createMutation.mutate(data)}
                    isSubmitting={createMutation.isPending}
                />
            )}
        </div>
    );
}

function CreateRangeModal({ onClose, onSubmit, isSubmitting }: {
    onClose: () => void;
    onSubmit: (data: { cidr: string; description?: string; provider?: string; status?: string }) => void;
    isSubmitting: boolean;
}) {
    const [cidr, setCidr] = useState('');
    const [description, setDescription] = useState('');
    const [provider, setProvider] = useState('');

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-96" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800">Neue IP Range</h3>
                    <button onClick={onClose} className="btn-icon"><X size={16} /></button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">CIDR *</label>
                        <input className="input" placeholder="203.0.113.0/24" value={cidr} onChange={e => setCidr(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Beschreibung</label>
                        <input className="input" placeholder="Primary Block" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Provider</label>
                        <input className="input" placeholder="Swisscom" value={provider} onChange={e => setProvider(e.target.value)} />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="btn-secondary text-xs">Abbrechen</button>
                    <button
                        onClick={() => onSubmit({ cidr, description: description || undefined, provider: provider || undefined })}
                        disabled={!cidr || isSubmitting}
                        className="btn-primary text-xs"
                    >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Erstellen'}
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Verify frontend compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(frontend): wire DatacenterPage to real API

Replace mock IP ranges with React Query calls to
/api/v1/datacenter/ip-ranges. Add create/delete functionality
with modal. Show range details from database."
```

---

## Task 12: Restructure Sidebar with Tenant Switcher

**Files:**
- Modify: `frontend/src/components/layout/Layout.tsx`

- [ ] **Step 1: Update the sidebar to match the spec layout**

The Layout already has a TenantSwitcher in the header. Per the design spec, the switcher should be at the top of the sidebar, and the sidebar should show global items always + tenant-scoped items when a tenant is selected.

In `frontend/src/components/layout/Layout.tsx`, move the TenantSwitcher from the header into the sidebar. Replace the search section and navigation with the new structure:

Replace lines 62-123 (from `{/* Search / CMD+K */}` through the end of `</nav>`) with:

```tsx
                {/* Tenant Switcher */}
                <div className="px-4 pt-6 pb-2">
                    <TenantSwitcher
                        tenants={tenants || []}
                        currentTenant={currentTenant}
                        onSelect={(t) => navigate(`/tenants/${t.id}`)}
                    />
                </div>

                {/* Search / CMD+K */}
                <div className="px-4 pt-2 pb-2">
                    <button
                        className="search-pill shadow-sm group dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                    >
                        <Search size={14} className="group-hover:text-slate-900 transition-colors" />
                        <span className="flex-1 text-left group-hover:text-slate-700 transition-colors">Suche...</span>
                        <kbd className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-lg">⌘K</kbd>
                    </button>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-8 sidebar-scroll">
                    {/* Global Navigation — always visible */}
                    <div className="space-y-1">
                        <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" end />
                        <NavItem to="/tenants" icon={<Users size={18} />} label="Tenants" />
                        <NavItem to="/datacenter" icon={<Globe size={18} />} label="Datacenter / IPs" />
                    </div>

                    {/* Tenant-scoped Navigation — only when tenant selected */}
                    {isInTenantContext && (
                        <>
                            <div>
                                <SectionHeader label="Kunde" />
                                <div className="space-y-1 mt-2">
                                    <NavItem to={`/tenants/${tenantId}`} icon={<LayoutDashboard size={18} />} label="Übersicht" end />
                                    <NavItem to={`/tenants/${tenantId}/hardware`} icon={<Cpu size={18} />} label="Hardware" />
                                    <NavItem to={`/tenants/${tenantId}/racks`} icon={<Server size={18} />} label="Racks" />
                                    <NavItem to={`/tenants/${tenantId}/network`} icon={<Network size={18} />} label="IP-Plan" />
                                </div>
                            </div>
                        </>
                    )}

                    <FavoritesSidebar />
                </nav>
```

Then in the header section (lines 138-172), remove the TenantSwitcher and its divider from the header. Replace the `{/* Right: Tenant Switcher & User */}` section with just the user profile:

```tsx
                    {/* Right: User */}
                    <div className="flex items-center gap-5">
                        {/* User Profile */}
                        <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100/80 p-1.5 pr-4 rounded-full transition-colors border border-transparent hover:border-slate-200/50">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary-100 to-primary-50 text-primary-700 flex items-center justify-center text-xs font-bold border border-primary-100 shadow-sm">
                                AM
                            </div>
                            <div className="hidden md:block text-xs text-left">
                                <p className="font-semibold text-slate-700 dark:text-slate-200">Anish M.</p>
                                <p className="text-slate-400 font-medium text-[10px]">Admin</p>
                            </div>
                        </div>
                    </div>
```

Also remove the `Monitor` import from the lucide-react import line since we removed the Switches nav item.

- [ ] **Step 2: Persist selected tenant to localStorage**

In the `Layout` component, add localStorage persistence. After the `currentTenant` line (line 25), add:

```tsx
    // Persist tenant selection
    useEffect(() => {
        if (tenantId) {
            localStorage.setItem('lastTenantId', tenantId);
        }
    }, [tenantId]);
```

- [ ] **Step 3: Verify frontend compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(frontend): move tenant switcher to sidebar, restructure nav

Sidebar now shows: tenant switcher at top, global nav (Dashboard,
Tenants, Datacenter) always visible, tenant-scoped nav (Overview,
Hardware, Racks, IP-Plan) only when a tenant is selected."
```

---

## Task 13: Final Verification

- [ ] **Step 1: Verify full frontend compilation**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 2: Verify full backend compilation**

```bash
cd backend && ./gradlew compileKotlin
```

- [ ] **Step 3: Start the database, backend, and frontend and verify manually**

```bash
# Terminal 1: Start PostgreSQL
docker compose up -d postgres

# Terminal 2: Start backend
cd backend && ./gradlew bootRun

# Terminal 3: Start frontend
cd frontend && npm run dev
```

Open http://localhost:5173 and verify:
- Dashboard shows real stats (all zeros on fresh DB) and empty activity feed
- Tenant list page works, can create a tenant
- After creating a tenant, the tenant switcher in sidebar shows it
- Selecting the tenant shows the TenantDashboard with real summary (zeros)
- Rack page shows empty state
- Datacenter page can create and list public IP ranges
- Network page still works per tenant

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during manual verification"
```
