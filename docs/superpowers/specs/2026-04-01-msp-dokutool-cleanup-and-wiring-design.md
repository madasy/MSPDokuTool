# MSP DokuTool — Cleanup, DB Wiring & Tenant Switcher

**Date:** 2026-04-01
**Approach:** Clean Sweep (A) — cleanup first, then backend APIs, then wire frontend, then tenant switcher

## Context

This tool's core value is **network documentation (IPAM)** and **visual infrastructure views (racks)** for MSPs — filling the gap that SDP MSP doesn't cover. Contracts/licenses live in SDP MSP. Knowledge base lives in Confluence. Passwords will use Bitwarden. This tool is not trying to duplicate those.

The current codebase has significant mock/hardcoded data across most pages, unused components, stub pages, and duplicated code. All of this needs to be cleaned before wiring pages to the database and adding the tenant switcher.

---

## Phase 1: Cleanup

### Frontend Deletions

- **DashboardPage**: Remove all hardcoded stats (12 tenants, 248 devices, etc.) and fake recent changes list
- **TenantDashboardPage**: Remove all mock data (fake contracts, fake stats, fake quick links data)
- **RackListPage**: Remove hardcoded `DEVICE_DETAILS` object, mock rack devices, mock unplaced devices list
- **DatacenterPage**: Remove fake public IP ranges with utilization data
- **SwitchesPage**: Delete entirely (stub, no implementation)
- **SettingsPage**: Delete entirely (stub, no implementation)
- **SwitchFaceplate.tsx**: Delete (unused, imported nowhere)
- **IpPlanVisualization.tsx**: Delete (unused, imported nowhere)
- **ContractAlerts.tsx**: Delete (contracts handled in SDP MSP)
- **Routes**: Remove `/switches` and `/settings` routes

### Frontend Consolidation

- Merge duplicated `apiFetch` wrappers from TenantService, DeviceService, RackService, NetworkService into a single shared `apiClient.ts`

### Backend Deletions

- **RackService.createRack()**: Remove stub that throws `UnsupportedOperationException`
- **DataSeeder**: Delete the class entirely. The app should start with a clean database — tenants and their infrastructure are created by the user.

### Backend Cleanup

- Deduplicate `toDto()` methods between RackService and DeviceService

### Post-Cleanup State

All pages that previously showed mock data now show loading states or empty states ("No devices yet", "No racks configured") with calls to not-yet-existing API endpoints via React Query (which will show loading/error states gracefully).

---

## Phase 2: Backend APIs

### New Endpoints

#### Dashboard Stats — `GET /api/v1/dashboard/stats`
Returns aggregate counts across all tenants:
```json
{
  "tenantCount": 5,
  "totalDevices": 48,
  "totalSubnets": 12,
  "totalIpAddresses": 310
}
```

#### Recent Activity — `GET /api/v1/dashboard/activity?limit=20`
Returns recently created/updated entities across all tenants using existing `createdAt`/`updatedAt` fields:
```json
[
  {
    "type": "device",
    "name": "SRV-DC01",
    "tenantName": "Acme Corp",
    "action": "created",
    "timestamp": "2026-04-01T10:30:00Z"
  }
]
```
Supported types: `device`, `subnet`, `ip_address`

#### Tenant Infrastructure Summary — `GET /api/v1/tenants/{id}/summary`
Returns per-tenant stats for TenantDashboard:
```json
{
  "deviceCount": 15,
  "devicesByType": { "server": 3, "switch": 2, "firewall": 1 },
  "subnetCount": 4,
  "ipUtilization": 72.5,
  "rackCount": 2
}
```

#### Rack Devices with Details — `GET /api/v1/racks?tenantId={id}`
Already partially exists. Needs to return racks with nested device arrays including position, IPs, and serial numbers:
```json
[
  {
    "id": "uuid",
    "name": "Rack A1",
    "totalUnits": 42,
    "devices": [
      {
        "id": "uuid",
        "name": "SRV-DC01",
        "type": "server",
        "position": 10,
        "height": 2,
        "serialNumber": "ABC123",
        "ipAddresses": ["10.0.1.5"]
      }
    ]
  }
]
```

#### Public IP Ranges (Datacenter) — `GET /api/v1/datacenter/ip-ranges`
Full CRUD for public IP blocks. Global scope (not tenant-scoped).

### New Entity: PublicIpRange

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| cidr | TEXT | e.g. "203.0.113.0/24" |
| description | TEXT | Purpose/label |
| assignedTenantId | UUID (nullable) | FK to Tenant |
| provider | TEXT | ISP/provider name |
| status | TEXT | active, reserved, available |
| createdAt | TIMESTAMP | auto |
| updatedAt | TIMESTAMP | auto |

Flyway migration: `V6__add_public_ip_ranges.sql`

### Tenant-Scoping for Existing Endpoints

- `GET /api/v1/devices?tenantId={id}` — already works, enforce filtering
- `GET /api/v1/network/subnets?tenantId={id}` — already works
- All queries that currently return everything get a required `tenantId` parameter (except dashboard and datacenter which are global)

---

## Phase 3: Wire Frontend to Real APIs

### DashboardPage
- Fetch stats from `GET /api/v1/dashboard/stats` via React Query
- Fetch recent activity from `GET /api/v1/dashboard/activity?limit=20`
- Show real counts in KPI cards, real activity in the feed
- Empty states when no data exists

### TenantDashboardPage
- Fetch summary from `GET /api/v1/tenants/{id}/summary`
- Show device count by type, subnet count, IP utilization %, rack count
- Quick links: static route links to tenant's Racks, Network, Hardware pages
- No contract-related UI (lives in SDP MSP)

### RackListPage
- Fetch racks + devices from `GET /api/v1/racks?tenantId={id}`
- Rack visualization uses real device data (name, position, height in U)
- Device detail panel shows real data (IPs, serial, firmware)
- Unplaced devices: `GET /api/v1/devices?tenantId={id}&rackId=null`

### DatacenterPage
- Fetch public IP ranges from `GET /api/v1/datacenter/ip-ranges`
- Show CIDR blocks with real utilization, provider info, tenant assignment
- CRUD: add/edit/delete public IP ranges

### Shared API Client
- All pages use consolidated `apiClient.ts` from Phase 1
- React Query handles caching, loading, error states consistently

---

## Phase 4: Tenant Switcher

### Global Tenant Dropdown
- Positioned at top of sidebar, above navigation links
- Shows all tenants from `GET /api/v1/tenants`
- Includes search/filter for large tenant lists
- Selected tenant persisted to `localStorage` for page refresh survival

### Routing Behavior
- Selecting a tenant navigates to `/tenants/{tenantId}` (TenantDashboard)
- Sidebar nav links update to selected tenant's pages
- TenantListPage (`/tenants`) still exists as a browsable list
- Switcher is the primary navigation method

### API Impact
- Tenant-scoped services read `tenantId` from React Router's `useParams()`
- Switcher changes route, React Query auto-refetches
- No global state store needed beyond React Router

### Sidebar Layout

```
┌─────────────────────┐
│ [Tenant Dropdown ▾] │  ← switcher
├─────────────────────┤
│ Dashboard           │  ← global
│ Tenants             │  ← global
│ Datacenter          │  ← global
├─────────────────────┤
│ ── Customer ──      │  ← section label
│ Overview            │  ← tenant-scoped
│ Hardware            │  ← tenant-scoped
│ Network             │  ← tenant-scoped
│ Racks               │  ← tenant-scoped
└─────────────────────┘
```

Tenant-scoped section only visible when a tenant is selected. Hidden/disabled otherwise.

### Page Scope

| Page | Scope | Tenant filter |
|------|-------|--------------|
| Dashboard | Global | No — shows aggregates across all tenants |
| Tenant List | Global | No — lists all tenants |
| Datacenter | Global | No — public IP ranges are global |
| Tenant Dashboard | Tenant-scoped | Yes |
| Hardware | Tenant-scoped | Yes |
| Network | Tenant-scoped | Yes |
| Racks | Tenant-scoped | Yes |

---

## Out of Scope

- Authentication/authorization (auth disabled for MVP, Entra ID integration later)
- Password management (Bitwarden)
- Knowledge base / articles (Confluence)
- Contracts and licenses (SDP MSP)
- Settings page
- Switch port mapping
- Export/reporting
- Bulk operations
- Tests (deferred, but should be added in a follow-up)
