# Design: MSP Self-Documentation & Shared Infrastructure Linking

**Date:** 2026-07-13
**Status:** Approved

## Goal

Make MSPDokuTool document the MSP's own infrastructure exactly like a customer's, and let shared/provider infrastructure (DC firewall, public IP ranges, hosted cloud servers, IPsec tunnels) be linked to the customers that consume it. Reduce free-text fields in favor of structured, optional fields with progressive disclosure, and add Confluence-like free-form notes and custom fields on any entity.

## Non-Goals

- Config management or device sync (documentation only).
- Storing secrets (PSKs, passwords) — reference Bitwarden entries by name only.
- Service catalog / subscription billing model (deferred).
- Careful data migration — DB is dev/seed-only and may be reset.

## Domain Changes

### 1. Tenant type

`Tenant` gains `type: TenantType` enum (`MSP`, `CUSTOMER`), default `CUSTOMER`. Exactly one MSP tenant is expected (enforced by convention + seeder, not a DB constraint). The MSP tenant is documented with the same structure as customers: Sites, Rooms, Racks, Devices, VLANs, Subnets, IPs.

Rule: a tenant referenced by any `assignedTenant` link or `VpnTunnel.tenant` cannot be deleted (restrict with a clear error message).

### 2. Assigned tenant on shared resources

Pattern: a resource is **owned** by the tenant whose hierarchy it lives in (usually the MSP) and optionally **assigned** to a consuming customer. Add nullable `assignedTenant: Tenant?` (`assigned_tenant_id` FK) to:

- `Vlan` — e.g., a customer VLAN on the DC firewall
- `Subnet` — e.g., a customer subnet in the DC
- `IpAddress` — e.g., a public IP allocated to a customer (existing `description` serves as the usage label; no new text columns)
- `Device` — e.g., a cloud server hosted for a customer in the MSP rack

Validation: `assignedTenant` must exist; assigning to the owning tenant itself is rejected as a no-op error.

### 3. Public IP ranges

No new entity. `Subnet` gains `isPublic: Boolean` (default `false`). A public range is a subnet owned by the MSP tenant with `isPublic = true`. Its `IpAddress` rows carry `assignedTenant` + `description` (usage). IPAM stays unified.

### 4. VpnTunnel (new entity)

Documents IPsec/VPN connectivity between MSP infrastructure and a customer.

| Field | Type | Required |
|---|---|---|
| `name` | String | yes |
| `type` | enum `IPSEC_S2S`, `SSL_VPN`, `WIREGUARD`, `OTHER` | yes |
| `status` | enum `ACTIVE`, `PLANNED`, `DISABLED` (default `ACTIVE`) | yes |
| `tenant` | FK Tenant (the customer served) | yes |
| `localDevice` | FK Device (MSP-side endpoint, e.g. DC firewall) | yes |
| `remoteDevice` | FK Device (customer firewall, if documented) | no |
| `localSubnets` | ManyToMany Subnet | no |
| `remoteSubnets` | ManyToMany Subnet | no |
| `ikeVersion` | enum `IKEV1`, `IKEV2` | no |
| `encryption` | enum `AES_128`, `AES_256`, `TRIPLE_DES`, `CHACHA20` | no |
| `hash` | enum `SHA1`, `SHA256`, `SHA512` | no |
| `dhGroup` | Int | no |
| `secretRef` | String (Bitwarden entry name, never the secret) | no |

UI: only `name`, `type`, `tenant`, `localDevice` in the base form; everything else behind an "Advanced" disclosure.

### 5. Note (new entity, polymorphic)

Confluence-like free-form documentation attachable to any entity.

- `title: String`, `contentMarkdown: String`
- `entityType: String` (e.g. `TENANT`, `DEVICE`, `VLAN`, `SUBNET`, `RACK`, `VPN_TUNNEL`, `IP_ADDRESS`, `SITE`)
- `entityId: UUID`
- Multiple notes per entity; ordered by `updatedAt` desc.

### 6. CustomField (new entity, polymorphic)

User-defined structured one-offs on any entity.

- `name: String`, `value: String`, `fieldType` enum `TEXT`, `NUMBER`, `URL`, `DATE` (type hint for rendering/validation)
- `entityType: String`, `entityId: UUID`
- Unique per (`entityType`, `entityId`, `name`).

Design rule going forward: entities keep only structured fields; free-form content goes through Note/CustomField instead of adding `description`/`notes` text columns.

## API

- `PATCH /api/vlans/{id}/assignment`, `/api/subnets/{id}/assignment`, `/api/ips/{id}/assignment`, `/api/devices/{id}/assignment` — body `{ assignedTenantId: UUID | null }` (null unassigns).
- `GET /api/tenants/{id}/provided-resources` — aggregation of everything assigned to that tenant: public IPs, VLANs, subnets, hosted devices, VPN tunnels. Grouped by resource type.
- `GET/POST/PUT/DELETE /api/vpn-tunnels` (+ filter by `tenantId`, `localDeviceId`).
- `GET /api/subnets?public=true&tenantId=...` — public ranges for the Datacenter page.
- `GET/POST/PUT/DELETE /api/notes?entityType=&entityId=` and `/api/custom-fields?entityType=&entityId=`.

## Frontend

- **Tenant list:** MSP tenant pinned first with an "MSP" badge; created via seeder, type selectable on create (single MSP by convention).
- **DatacenterPage:** mock data removed. Loads real public subnets of the MSP tenant, renders the IP grid from `IpAddress` rows; clicking an IP opens assign dialog (tenant picker + usage label). Range stats (used/reserved/free) computed from real data.
- **TenantDashboardPage:** new "Provided by MSP" panel listing assigned public IPs, VLANs/subnets, hosted devices, and VPN tunnels, each linking to the underlying resource. Panel hidden entirely when empty (progressive disclosure).
- **VPN tunnels:** section on the Network page (filterable by tenant) with base-fields form + Advanced disclosure for crypto parameters.
- **Notes & Fields panel:** reusable component on entity detail views (tenant dashboard, device, subnet, tunnel) — lists notes (markdown rendered) and custom fields, with add/edit/delete.
- Assignment badges: resources with `assignedTenant` show the customer name as a badge wherever listed.

## Migration & Seed

`V6__msp_shared_infra.sql`:
- `tenants.type` (text, default `CUSTOMER`)
- `assigned_tenant_id` FK on `vlans`, `subnets`, `ip_addresses`, `devices`
- `subnets.is_public` boolean default false
- `vpn_tunnels` table + `vpn_tunnel_local_subnets` / `vpn_tunnel_remote_subnets` join tables
- `notes` and `custom_fields` tables

DataSeeder additions: MSP tenant ("iGeeks") with DC site/room/rack + firewall device, one public /24 subnet with IPs assigned to existing demo customers, one sample IPsec tunnel, one sample note and custom field.

## Error Handling

- Assignment to unknown/owning tenant → 400 with message.
- Deleting a tenant with inbound assignments or tunnels → 409 with a message naming the blocking resource types.
- Notes/CustomFields validate that `entityType` is a known type; orphan cleanup on entity delete (service-level delete of attached notes/fields).

## Testing

- Backend: service-level tests for assignment validation, provided-resources aggregation, tunnel CRUD, tenant-delete restriction, and note/custom-field attachment + cascade cleanup.
- Frontend verified by running the app against the seeded backend (Datacenter grid, assignment dialog, provided-by-MSP panel, tunnel form).
