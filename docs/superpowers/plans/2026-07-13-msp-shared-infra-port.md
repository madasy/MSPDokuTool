# MSP Shared Infrastructure — Port to GitLab main — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the MSP self-documentation & shared-infrastructure feature (built and reviewed on branch `feature/msp-shared-infra`, which forked from a stale local main) onto the canonical GitLab codebase (branch `feature/msp-shared-infra-port`, cut from `gitlab/main`).

**Architecture:** The source branch's code is the reference implementation — retrieve any source file with `git show feature/msp-shared-infra:<path>`. This plan lists, per task, which source files to port verbatim and which adaptations the new codebase requires. The remote codebase differs in five load-bearing ways: (1) public IPs already exist as `PublicIpRange`/`PublicIpAssignment` with `assignedTenant` — our `Subnet.isPublic` model is **dropped**; (2) migrations are at V16 — ours renumber to **V17**; (3) all endpoints require JWT auth and the frontend has a shared `apiClient.ts` — all ported services use it; (4) there is **no DataSeeder and remote deployments may hold real data — do not port the seeder; migrations must be additive**; (5) a `DocumentationSection` system exists — our polymorphic notes/fields classes are renamed `EntityDoc*` to avoid confusion.

**Tech Stack:** Kotlin 1.9/Spring Boot 3.3, Flyway (next: V17), PostgreSQL, JWT auth (custom filter), JUnit5 + mockito-kotlin (dep must be added), React 19, TanStack Query v5, Tailwind v4 (`@theme` in index.css), lucide-react, react-markdown (dep must be added).

**Spec:** `docs/superpowers/specs/2026-07-13-msp-shared-infra-design.md` (public-IP section superseded by the existing `PublicIpRange` model).

## Global Constraints

- API base `/api/v1`. New endpoints are auto-protected by the catch-all `.authenticated()` rule — no SecurityConfig changes except adding `"PATCH"` to CORS `allowedMethods`.
- Frontend services MUST use `apiFetch` from `src/services/apiClient.ts` (carries the Bearer token). Never a local fetch wrapper.
- No secrets stored: `secretRef` is a Bitwarden entry name only.
- Backend errors: IllegalArgumentException→400, IllegalStateException→409, DataIntegrityViolationException→409 via a new `GlobalExceptionHandler` (JSON `{"message": ...}`); German copy for user-facing conflict messages.
- No DataSeeder, no demo data, no destructive migration statements. `V17` is additive except dropping the redundant duplicate constraint `fk_sites_tenant` (V1 defines the FK twice; the inline `ON DELETE CASCADE` FK remains).
- Every mutation in new frontend code gets an `onError` toast via `useToast()` (`addToast({type:'error', title, message: err.message})`). Modals use the shared `.modal-overlay`/`.modal-content` CSS classes.
- German UI copy; utility classes from `src/index.css` (`page`, `card`, `btn-primary`, `input`, `badge`, ...).
- No gradle wrapper: run gradle via `docker run --rm -v /Users/anishmadassery/IdeaProjects/MSPDokuTool/backend:/app -v gradle-cache:/home/gradle/.gradle -w /app gradle:8.5-jdk21 gradle <task>`. Frontend: `npx tsc -b && npm run build` from `frontend/`.
- Commit per task, conventional messages, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Source-file retrieval convention used below: `SRC(<path>)` means `git show feature/msp-shared-infra:<path>`.

---

### Task P1: Backend foundation — V17 migration, entities, repositories, test dep

**Files:**
- Modify: `backend/build.gradle.kts` — add `testImplementation("org.mockito.kotlin:mockito-kotlin:5.4.0")`
- Create: `backend/src/main/resources/db/migration/V17__msp_shared_infra.sql`
- Modify: `backend/src/main/kotlin/com/msp/doku/domain/Tenant.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/domain/Vlan.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/domain/Subnet.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/domain/Device.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/domain/VpnTunnel.kt` — port verbatim from SRC(same path)
- Create: `backend/src/main/kotlin/com/msp/doku/domain/EntityDoc.kt` — port SRC(domain/Note.kt) + SRC(domain/CustomField.kt) merged into one file, classes keep names `Note`/`CustomField`/`DocEntityType`/`FieldType` (table names `notes`/`custom_fields` unchanged)
- Create: `backend/src/main/kotlin/com/msp/doku/repository/VpnTunnelRepository.kt` — port verbatim from SRC (includes `findByTenantId`, `existsByTenantId`, `existsByLocalDeviceId`)
- Create: `backend/src/main/kotlin/com/msp/doku/repository/EntityDocRepositories.kt` — port SRC(repository/DocRepositories.kt) content, file renamed
- Modify: `backend/src/main/kotlin/com/msp/doku/repository/NetworkRepositories.kt`, `VlanRepository.kt` (or wherever Vlan repo lives), `DeviceRepository.kt` — add `findByAssignedTenantId` + `existsByAssignedTenantId`
- Modify: `backend/src/main/kotlin/com/msp/doku/repository/` PublicIpAssignment + PublicIpRange repositories — add `findByAssignedTenantId(tenantId: UUID): List<...>` and `existsByAssignedTenantId(tenantId: UUID): Boolean` to each

**Adaptations vs source branch (apply exactly):**
1. Migration is `V17`, not V6/V7. Content = SRC(db/migration/V6__msp_shared_infra.sql) with these edits: REMOVE the two `ALTER TABLE subnets ... is_public` and `ALTER TABLE ip_addresses ADD COLUMN assigned_tenant_id ...` statements (public IPs use the existing PublicIp* tables; IpAddress gets no assignment column); APPEND `ALTER TABLE sites DROP CONSTRAINT IF EXISTS fk_sites_tenant;` (from SRC V7). Everything else (tenants.type, assigned_tenant_id on vlans/subnets/devices, vpn_tunnels + 2 join tables, notes, custom_fields, indexes, unique constraint) ports unchanged.
2. `Tenant.kt`: the remote entity has `profile`, `hiddenModules`, `showAdvancedFields` — keep them all, append `@Enumerated(EnumType.STRING) @Column(nullable = false) var type: TenantType = TenantType.CUSTOMER` and the `TenantType { MSP, CUSTOMER }` enum (see SRC(domain/Tenant.kt)).
3. `Vlan.kt`/`Subnet.kt`/`Device.kt`: append only the `assignedTenant` ManyToOne (nullable, `assigned_tenant_id`, LAZY) as in SRC. Do NOT add `isPublic` to Subnet. Keep every existing remote field (Device has `rj45Ports`/`sfpPorts` etc.).
4. `DocEntityType` enum: keep the SRC value set (`TENANT, SITE, ROOM, RACK, DEVICE, VLAN, SUBNET, IP_ADDRESS, VPN_TUNNEL`).

**Steps:** port files with adaptations → `gradle compileKotlin` (BUILD SUCCESSFUL) → boot against a FRESH LOCAL dev DB (`docker compose down -v && docker compose up -d postgres`, then bootRun via the docker gradle image with `-e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5432/mspdoku -p 8080:8080`) and confirm Flyway migrates V1→V17 cleanly → commit `feat(backend): port MSP domain foundation (tenant type, assignments, tunnels, entity docs) as V17`.

---

### Task P2: GlobalExceptionHandler + tenant type/delete API + tests

**Files:**
- Create: `backend/src/main/kotlin/com/msp/doku/config/GlobalExceptionHandler.kt` — port verbatim from SRC (3 handlers: 400/409/409-integrity, German messages)
- Modify: `backend/src/main/kotlin/com/msp/doku/dto/TenantDto.kt` — add `type: TenantType` to `TenantDto` and `type: TenantType = TenantType.CUSTOMER` to `CreateTenantRequest`; keep all remote fields (profile, hiddenModules, showAdvancedFields...)
- Modify: `backend/src/main/kotlin/com/msp/doku/service/TenantService.kt` — remote version has profile/health/summary logic; ADD (do not replace): `type` in create + toDto mapping, single-MSP guard (`existsByType`), and `deleteTenant(id)` with blocker checks (vlan/subnet/device `existsByAssignedTenantId`, `vpnTunnelRepository.existsByTenantId`) — see SRC(service/TenantService.kt) for the exact method bodies; inject the new repositories.
- Modify: `backend/src/main/kotlin/com/msp/doku/repository/CoreRepositories.kt` (or wherever TenantRepository lives) — add `existsByType(type: TenantType): Boolean`
- Modify: `backend/src/main/kotlin/com/msp/doku/controller/TenantController.kt` — add `DELETE /{id}` → 204
- Test: `backend/src/test/kotlin/com/msp/doku/service/TenantServiceTest.kt` — port SRC test, adapt constructor arity to the REMOTE TenantService (it has more dependencies — mock them all; drop the docService mock until Task P5 adds it) and drop the ip-address blocker assertions (no IpAddress assignment in the port).

**Caution:** existing `AuthController` catches `IllegalArgumentException` locally and maps to 401 — the new global handler must not break that (local try/catch wins; verify by reading AuthController before committing).

**Steps:** TDD — port+adapt test, watch it fail to compile, implement, `gradle test --tests "com.msp.doku.service.TenantServiceTest"` green, full `gradle test` green, commit.

---

### Task P3: Assignment API (vlans/subnets/devices) + DTO enrichment + CORS PATCH

**Files:**
- Create: `backend/src/main/kotlin/com/msp/doku/dto/AssignmentDtos.kt` — port verbatim from SRC
- Create: `backend/src/main/kotlin/com/msp/doku/service/AssignmentService.kt` — port from SRC, REMOVE the `"ips"` branch entirely (entityType set is `vlans|subnets|devices`); device owner resolution `rack?.room?.site?.tenant ?: site?.tenant` unchanged
- Create: `backend/src/main/kotlin/com/msp/doku/controller/AssignmentController.kt` — port verbatim from SRC
- Modify: Subnet DTO + mapping (find with `grep -rn "data class SubnetDto" backend/src`) — add `assignedTenantId`/`assignedTenantName`; update every construction site
- Modify: Device DTO + mapping (`grep -rn "data class DeviceDto" backend/src`) — add the same two fields; update every `Device.toDto()` (check DeviceService AND RackService — the source branch fixed a duplicated mapper there, the remote may have the same duplication)
- Modify: `backend/src/main/kotlin/com/msp/doku/config/SecurityConfig.kt` — add `"PATCH"` to CORS `allowedMethods`
- Test: `backend/src/test/kotlin/com/msp/doku/service/AssignmentServiceTest.kt` — port SRC test, delete the two ip-related test methods, keep vlan/subnet/unknown-type/owner-rejection cases

**Steps:** TDD as above; full `gradle test`; commit.

---

### Task P4: VPN tunnel API + tests

**Files:** port ALL verbatim from SRC (no adaptations needed — Tenant/Device/Subnet references exist on remote):
- Create: `backend/src/main/kotlin/com/msp/doku/dto/VpnTunnelDtos.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/service/VpnTunnelService.kt` — WITHOUT the `docService.deleteAllForEntity` line in `deleteTunnel` (added in P5)
- Create: `backend/src/main/kotlin/com/msp/doku/controller/VpnTunnelController.kt`
- Test: `backend/src/test/kotlin/com/msp/doku/service/VpnTunnelServiceTest.kt` — port, adjust constructor if needed (no docService yet)

**Steps:** TDD; full `gradle test`; commit.

---

### Task P5: EntityDoc (notes + custom fields) API + cascade cleanup + tests

**Files:**
- Create: `backend/src/main/kotlin/com/msp/doku/dto/EntityDocDtos.kt` — port SRC(dto/DocDtos.kt) content
- Create: `backend/src/main/kotlin/com/msp/doku/service/EntityDocService.kt` — port SRC(service/DocService.kt), class renamed `EntityDocService` (avoid confusion with the existing `DocumentationService`)
- Create: `backend/src/main/kotlin/com/msp/doku/controller/EntityDocController.kt` — port SRC(controller/DocController.kt), class renamed; endpoint paths stay `/api/v1/notes` and `/api/v1/custom-fields`
- Modify: `DeviceService.deleteDevice` — add tunnel-endpoint guard (`existsByLocalDeviceId` → IllegalStateException, German) + `entityDocService.deleteAllForEntity(DocEntityType.DEVICE, id)`; see SRC for exact code
- Modify: `VpnTunnelService.deleteTunnel` + `TenantService.deleteTenant` — add `deleteAllForEntity` calls (VPN_TUNNEL / TENANT)
- Test: `backend/src/test/kotlin/com/msp/doku/service/EntityDocServiceTest.kt` (port SRC DocServiceTest, rename) and `DeviceServiceTest.kt` (port SRC, adapt to remote DeviceService constructor); update P2/P4 tests for new constructor params

**Steps:** TDD; full `gradle test`; commit.

---

### Task P6: Provided-resources aggregation + tests

**Files:**
- Create: `backend/src/main/kotlin/com/msp/doku/dto/ProvidedResourcesDto.kt` — port from SRC, with `ProvidedIpDto` REPLACED by:
```kotlin
data class ProvidedPublicIpDto(
    val id: UUID,
    val ipAddress: String,
    val usage: String?,        // maps from PublicIpAssignment.description
    val rangeCidr: String
)
```
and `ProvidedResourcesDto` keeps the shape `publicIps` / `vlans` / `subnets` / `devices` / `vpnTunnels`, where `publicIps: List<ProvidedPublicIpDto>` (the `isPublic` field is dropped). `publicIps` is fed from two sources: per-IP assignments (`PublicIpAssignment.assignedTenant`) mapped field-for-field, and whole-range assignments (`PublicIpRange.assignedTenant`) mapped as `ProvidedPublicIpDto(id = range.id, ipAddress = range.cidr, usage = range.description, rangeCidr = range.cidr)`.
- Create: `backend/src/main/kotlin/com/msp/doku/service/ProvidedResourcesService.kt` — port from SRC; replace the IpAddress query with `publicIpAssignmentRepository.findByAssignedTenantId(tenantId)` + `publicIpRangeRepository.findByAssignedTenantId(tenantId)` mapped as above; VLAN/subnet/device/tunnel mapping unchanged
- Modify: `TenantController` — add `GET /{id}/provided-resources` (inject ProvidedResourcesService)
- Test: port SRC ProvidedResourcesServiceTest, adapt the publicIps section to PublicIpAssignment/Range mocks

**Steps:** TDD; full `gradle test`; commit. Then boot against local dev DB once more to confirm the app still starts with all new beans.

---

### Task P7: Frontend services & deps

**Files:**
- Run `npm install react-markdown` in `frontend/`
- Modify: `frontend/src/services/TenantService.ts` — add `type: 'MSP' | 'CUSTOMER'` to the Tenant interface, optional `type` on the create request, and a `delete(id)` method (whatever the remote service object shape is, extend it in place — it already uses apiClient)
- Create: `frontend/src/services/VpnTunnelService.ts` — port from SRC but delete the local `apiFetch` wrapper and `import { apiFetch } from './apiClient';` instead; endpoints unchanged
- Create: `frontend/src/services/EntityDocService.ts` — port SRC(services/DocService.ts) the same way (rename export `DocService` → `EntityDocService`)
- Create: `frontend/src/services/AssignmentService.ts` — port the assignment part of SRC(services/ProviderService.ts) (`setAssignment`, `AssignableEntityType = 'vlans' | 'subnets' | 'devices'`) plus `getProvidedResources(tenantId)` and the Provided* interfaces (adapt `ProvidedIp` → `ProvidedPublicIp {id, ipAddress, usage?, rangeCidr}`); use apiClient
- Modify: `frontend/src/services/NetworkService.ts` — add `assignedTenantId?`/`assignedTenantName?` to its Subnet interface (remote file — extend in place)
- Modify: `frontend/src/services/DeviceService.ts` — add the same two optional fields to Device

**Steps:** `npx tsc -b` green, `npm run build` green, commit.

---

### Task P8: TenantListPage — MSP badge, pinning, create checkbox

Port the three edits from the original Task 10 onto the REMOTE TenantListPage (read it first; it is similar but not identical — cards with avatar/identifier/createdAt, inline modal with name+identifier):
1. `sortedTenants` (MSP first, then localeCompare) used by both empty-check and map
2. MSP badge chip in the card header row for `type === 'MSP'`
3. Checkbox `Das ist unsere eigene MSP-Dokumentation` in the create modal → `type: 'MSP' | 'CUSTOMER'` in the mutate call; also add an `onError` toast to the create mutation (remote page may lack one — global constraint)

**Steps:** `npx tsc -b && npm run build`; commit.

---

### Task P9: NetworkPage — VPN tunnel section + subnet assignment badges

- Create: `frontend/src/components/network/VpnTunnelSection.tsx` — port from SRC with these adaptations: import `useToast` and add `onError` toasts to create and delete mutations; modal uses `.modal-overlay`/`.modal-content` classes; root div `card overflow-hidden` (no `mt-6`); DeviceService.getAll on remote takes an optional tenantId — call `DeviceService.getAll()` (all devices) and filter `deviceType === 'FIREWALL'`.
- Modify: `frontend/src/pages/NetworkPage.tsx` (REMOTE version — read fully first): mount `{tenantId && <VpnTunnelSection tenantId={tenantId} />}` inside the main content container after the subnet list; add the assignment badge next to the subnet CIDR heading when `subnet.assignedTenantName` is set (exact badge JSX in original plan Task 12 Step 3).

**Steps:** `npx tsc -b && npm run build`; commit.

---

### Task P10: TenantDashboardPage — ProvidedByMspPanel + NotesAndFieldsPanel

- Create: `frontend/src/components/tenant/ProvidedByMspPanel.tsx` — port from SRC with the publicIps mapping adapted (`ip.ipAddress`, `ip.rangeCidr`, link to `/datacenter`); import from `AssignmentService`.
- Create: `frontend/src/components/doc/NotesAndFieldsPanel.tsx` — port from SRC (already has toasts after fix 07b118d — port the FIXED version); imports from `EntityDocService`; modal → `.modal-overlay`/`.modal-content`.
- Modify: `frontend/src/pages/TenantDashboardPage.tsx` (REMOTE version — read fully; it has health/score/profile panels): mount `ProvidedByMspPanel` after the "Infrastruktur" stat cards, and `NotesAndFieldsPanel entityType="TENANT"` at the end of the page.

**Steps:** `npx tsc -b && npm run build`; commit.

---

### Task P11: DatacenterPage — tenant picker in the IP edit modal

The remote `EditIpModal` in `frontend/src/pages/DatacenterPage.tsx` edits status + description but exposes no tenant picker even though the API (`PUT /datacenter/ip-ranges/{rangeId}/assignments/{ipAddress}`) supports `assignedTenantId`. Add:
- a `<select>` of tenants (from `['tenants']` query, filter `type === 'CUSTOMER'`), defaulting to the current `assignedTenantId`, empty option "— nicht zugewiesen —"
- include `assignedTenantId: value || null` in the update mutation body
- show the assigned tenant name as a badge in the IP grid tooltip/details if not already shown

**Steps:** read the page fully, apply, `npx tsc -b && npm run build`; commit.

---

### Task P12: E2E verification + final review

1. Full backend `gradle test` green.
2. Fresh LOCAL dev DB boot (compose down -v is allowed LOCALLY only): Flyway V1→V17, app starts.
3. API walkthrough with an authenticated session (create first admin via `/api/v1/auth/setup` if fresh DB, then login → Bearer token; all curls carry the token): create MSP tenant (type MSP) + a customer; second MSP → 400; create a VLAN owned by MSP, assign to customer via PATCH; create tunnel; note + custom field (duplicate name → 400); provided-resources shows all; DELETE customer → 409; unassign all → DELETE succeeds 204.
4. Frontend `npm run dev` + browser check of the five surfaces (tenant list badge, VPN section, both dashboard panels, datacenter tenant picker).
5. Final whole-branch review (base = 222e727) and fix wave if needed.
