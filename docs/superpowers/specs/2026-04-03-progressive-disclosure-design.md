# Progressive Disclosure & Documentation Profiles — Design Spec

**Date:** 2026-04-03
**Goal:** Per-tenant documentation profiles that control module visibility and field complexity. Three field levels (Required/Recommended/Advanced) with profile-driven defaults and manual override.

---

## Profiles

Stored as `profile` enum on the `tenants` table.

| Profile | Description | Modules Hidden | Default Field Level |
|---------|-------------|---------------|-------------------|
| `SMALL_OFFICE` | 1-10 users, basic IT | Racks, Switches, Firewall, Access Points | Required + Recommended |
| `SINGLE_SITE` | One location, standard MSP | Racks | Required + Recommended |
| `MULTI_SITE` | Multiple locations | None | All |
| `MANAGED_INFRA` | Full managed infrastructure | None | All |
| `SECURITY_FOCUSED` | Security-first customers | None | All |
| `CUSTOM` | Admin picks per tenant | Configurable | Configurable |

Default for new tenants: `SINGLE_SITE`.

---

## Database

Flyway migration V14:

```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS profile VARCHAR(50) NOT NULL DEFAULT 'SINGLE_SITE';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS hidden_modules TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS show_advanced_fields BOOLEAN NOT NULL DEFAULT false;
```

- `profile` — the enum
- `hidden_modules` — comma-separated list for CUSTOM profile (e.g. "racks,switches")
- `show_advanced_fields` — default toggle state for this tenant

---

## Field Classification

### Device (HardwarePage)
- **Required:** Name, Type, Site
- **Recommended:** Model, IP, Status
- **Advanced:** Serial, MAC, HE, RJ45/SFP ports

### Site
- **Required:** Name
- **Recommended:** Address, City
- **Advanced:** Country

### Room
- **Required:** Name
- **Recommended:** Floor
- **Advanced:** Description

### Rack
- **Required:** Name, Site, Room
- **Recommended:** Height Units

### Subnet (NetworkPage)
- **Required:** CIDR
- **Recommended:** Gateway, Description
- **Advanced:** VLAN ID, VLAN Name

### Access Point
- **Required:** Name, Site
- **Recommended:** Model, IP
- **Advanced:** MAC, Channel, Floor, Room, Mount Type, SSIDs, Location Description

### Firewall Interface
- **Required:** Name, Type
- **Recommended:** IP, Subnet Mask
- **Advanced:** Zone, VLAN ID, DHCP, Description

### Switch Port
- **Required:** Status
- **Recommended:** Access VLAN
- **Advanced:** Mode, Tagged VLANs, Speed, Connected Device

### IP Range (DatacenterPage)
- **Required:** CIDR
- **Recommended:** Description
- **Advanced:** Provider

---

## Backend API

### Update Tenant DTO

Add to `TenantDto`:
```
profile: String
hiddenModules: List<String>
showAdvancedFields: Boolean
```

### Endpoints

`PUT /api/v1/tenants/{id}` — update tenant (already exists, add profile fields)

`GET /api/v1/tenants/{id}` — returns profile info (already exists, extend response)

---

## Frontend

### `useFieldLevel` Hook

```typescript
function useFieldLevel(tenantId: string): {
    showAdvanced: boolean;
    toggleAdvanced: () => void;
    isModuleVisible: (module: string) => boolean;
    fieldLevel: 'required' | 'recommended' | 'all';
}
```

- Reads tenant profile from React Query cache
- Local override stored in `localStorage` per tenant: `fieldLevel:<tenantId>`
- Returns visibility helpers

### `FieldGroup` Component

```tsx
<FieldGroup level="advanced" tenantId={tenantId}>
    <input ... /> {/* Only shows when advanced fields are visible */}
</FieldGroup>
```

Renders children only when the current field level includes the specified level.

### Toggle UI

A small pill at the bottom of every form with advanced fields:

```
[○ Erweiterte Felder] ← collapsed (default for Small Office)
[● Erweiterte Felder] ← expanded
```

Clicking toggles and persists to localStorage.

### Sidebar Module Visibility

Based on tenant profile, hide nav items for hidden modules:
- SMALL_OFFICE: hide Racks, Switches, Firewall, Access Points
- SINGLE_SITE: hide Racks
- Others: show all

### Profile Selector

On the TenantDashboardPage, add a profile badge (like the health badge) that opens a dropdown to change the profile. ADMIN only.

---

## Implementation Scope

1. Backend: V14 migration, update Tenant entity + DTO + controller
2. Frontend: `useFieldLevel` hook, `FieldGroup` component
3. Frontend: Update all form pages to wrap advanced fields in `FieldGroup`
4. Frontend: Sidebar module visibility based on profile
5. Frontend: Profile selector on tenant dashboard
6. Frontend: Toggle pill on forms
