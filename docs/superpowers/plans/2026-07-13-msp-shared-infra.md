# MSP Self-Documentation & Shared Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The MSP documents itself as a tenant; shared infrastructure (public IPs, DC-firewall VLANs, hosted servers, IPsec tunnels) is linkable to customer tenants; free-form docs via polymorphic Notes and CustomFields.

**Architecture:** Kotlin/Spring Boot 3.3 backend (JPA + Flyway + Postgres) with a `type` enum on Tenant, a nullable `assignedTenant` FK on Vlan/Subnet/IpAddress/Device, an `isPublic` flag on Subnet, and three new entities (VpnTunnel, Note, CustomField). React 19 + TanStack Query frontend with a real DatacenterPage, a VPN section, a "Provided by MSP" panel, and a reusable Notes&Fields panel.

**Tech Stack:** Kotlin 1.9.24, Spring Boot 3.3.2, Flyway, PostgreSQL 16 (cidr/inet columns), JUnit5 + mockito-kotlin (new test dep), React 19, TypeScript, TanStack Query v5, Tailwind, lucide-react, react-markdown (new dep).

**Spec:** `docs/superpowers/specs/2026-07-13-msp-shared-infra-design.md`

## Global Constraints

- API base path is `/api/v1` (all new controllers follow `@RequestMapping("/api/v1/...")`).
- No new free-text columns on entities; enums/FKs only. Free-form content goes through Note/CustomField. (`secretRef` is a Bitwarden entry *name*, never a secret.)
- Backend errors: `IllegalArgumentException` → HTTP 400, `IllegalStateException` → HTTP 409 (handler added in Task 2).
- UI copy is German, matching existing pages (e.g. "Fehler beim Laden", "Erstellen", "Abbrechen").
- Frontend styling reuses existing utility classes: `page`, `page-title`, `card`, `btn-primary`, `btn-secondary`, `btn-icon`, `input`, `input-sm`.
- New frontend services use relative base `/api/v1` (like `DeviceService.ts`), NOT `http://localhost:8080`.
- Backend commands run from `backend/`, frontend commands from `frontend/`. Postgres runs via `docker compose up -d postgres` from repo root.
- Backend tests are service-level unit tests with mocked repositories (no DB needed): `./gradlew test --tests "<class>"`.
- Commit after every task with a conventional-commit message ending in the Claude co-author trailer.

---

### Task 1: Schema migration, domain entities, repositories

**Files:**
- Modify: `backend/build.gradle.kts` (add mockito-kotlin)
- Create: `backend/src/main/resources/db/migration/V6__msp_shared_infra.sql`
- Modify: `backend/src/main/kotlin/com/msp/doku/domain/Tenant.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/domain/Vlan.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/domain/Subnet.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/domain/IpAddress.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/domain/Device.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/domain/VpnTunnel.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/domain/Note.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/domain/CustomField.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/repository/VpnTunnelRepository.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/repository/DocRepositories.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/repository/NetworkRepositories.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/repository/VlanRepository.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/repository/DeviceRepository.kt`

**Interfaces:**
- Consumes: existing `BaseEntity` (`id: UUID?`, `createdAt`, `updatedAt`), existing entities.
- Produces (later tasks rely on these exact names):
  - `TenantType { MSP, CUSTOMER }`; `Tenant.type: TenantType`
  - `Vlan.assignedTenant: Tenant?`, `Subnet.assignedTenant: Tenant?`, `Subnet.isPublic: Boolean`, `IpAddress.assignedTenant: Tenant?`, `Device.assignedTenant: Tenant?`
  - `VpnTunnel` entity + enums `TunnelType { IPSEC_S2S, SSL_VPN, WIREGUARD, OTHER }`, `TunnelStatus { ACTIVE, PLANNED, DISABLED }`, `IkeVersion { IKEV1, IKEV2 }`, `EncryptionAlgorithm { AES_128, AES_256, TRIPLE_DES, CHACHA20 }`, `HashAlgorithm { SHA1, SHA256, SHA512 }`
  - `Note`, `CustomField`, `DocEntityType { TENANT, SITE, ROOM, RACK, DEVICE, VLAN, SUBNET, IP_ADDRESS, VPN_TUNNEL }`, `FieldType { TEXT, NUMBER, URL, DATE }`
  - Repositories: `VpnTunnelRepository { findByTenantId(UUID): List<VpnTunnel>; existsByTenantId(UUID): Boolean }`, `NoteRepository { findByEntityTypeAndEntityIdOrderByUpdatedAtDesc(DocEntityType, UUID): List<Note>; deleteByEntityTypeAndEntityId(DocEntityType, UUID) }`, `CustomFieldRepository { findByEntityTypeAndEntityIdOrderByName(DocEntityType, UUID): List<CustomField>; existsByEntityTypeAndEntityIdAndName(DocEntityType, UUID, String): Boolean; deleteByEntityTypeAndEntityId(DocEntityType, UUID) }`
  - `SubnetRepository` gains `findByIsPublicTrue(): List<Subnet>` and `existsByAssignedTenantId(UUID): Boolean` and `findByAssignedTenantId(UUID): List<Subnet>`; `IpAddressRepository`, `VlanRepository`, `DeviceRepository` each gain `existsByAssignedTenantId(UUID): Boolean` and `findByAssignedTenantId(UUID): List<...>`

- [ ] **Step 1: Add mockito-kotlin test dependency**

In `backend/build.gradle.kts`, inside `dependencies { }`, after `testImplementation("org.springframework.security:spring-security-test")` add:

```kotlin
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.4.0")
```

- [ ] **Step 2: Write migration `V6__msp_shared_infra.sql`**

```sql
-- Tenant type: the MSP documents itself as a tenant
ALTER TABLE tenants ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER';

-- Shared resources: owned by the MSP hierarchy, optionally assigned to a consuming customer
ALTER TABLE vlans ADD COLUMN assigned_tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;
ALTER TABLE subnets ADD COLUMN assigned_tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;
ALTER TABLE ip_addresses ADD COLUMN assigned_tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;
ALTER TABLE devices ADD COLUMN assigned_tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;

-- Public IP ranges are subnets flagged public
ALTER TABLE subnets ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- VPN / IPsec tunnels (documentation only; secret_ref names a Bitwarden entry)
CREATE TABLE vpn_tunnels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    local_device_id UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
    remote_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    ike_version VARCHAR(10),
    encryption VARCHAR(20),
    hash VARCHAR(20),
    dh_group INTEGER,
    secret_ref VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vpn_tunnel_local_subnets (
    tunnel_id UUID NOT NULL REFERENCES vpn_tunnels(id) ON DELETE CASCADE,
    subnet_id UUID NOT NULL REFERENCES subnets(id) ON DELETE CASCADE,
    PRIMARY KEY (tunnel_id, subnet_id)
);

CREATE TABLE vpn_tunnel_remote_subnets (
    tunnel_id UUID NOT NULL REFERENCES vpn_tunnels(id) ON DELETE CASCADE,
    subnet_id UUID NOT NULL REFERENCES subnets(id) ON DELETE CASCADE,
    PRIMARY KEY (tunnel_id, subnet_id)
);

-- Free-form documentation attachable to any entity
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content_markdown TEXT NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);

CREATE TABLE custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    value VARCHAR(1000) NOT NULL,
    field_type VARCHAR(10) NOT NULL DEFAULT 'TEXT',
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_custom_field UNIQUE (entity_type, entity_id, name)
);
CREATE INDEX idx_custom_fields_entity ON custom_fields(entity_type, entity_id);
```

- [ ] **Step 3: Update `Tenant.kt`**

```kotlin
package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table

enum class TenantType {
    MSP, CUSTOMER
}

@Entity
@Table(name = "tenants")
class Tenant(
    @Column(nullable = false)
    var name: String,

    @Column(nullable = false, unique = true)
    var identifier: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: TenantType = TenantType.CUSTOMER
) : BaseEntity()
```

- [ ] **Step 4: Add `assignedTenant` to Vlan, Subnet (+isPublic), IpAddress, Device**

`Vlan.kt` — append constructor parameter after `tenant` (keep existing imports):

```kotlin
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    var tenant: Tenant,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_tenant_id")
    var assignedTenant: Tenant? = null
```

`Subnet.kt` — append after `description`:

```kotlin
    var description: String? = null,

    @Column(name = "is_public", nullable = false)
    var isPublic: Boolean = false,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_tenant_id")
    var assignedTenant: Tenant? = null
```

`IpAddress.kt` — append after `networkInterface`:

```kotlin
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interface_id")
    var networkInterface: Interface? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_tenant_id")
    var assignedTenant: Tenant? = null
```

`Device.kt` — append after `site`:

```kotlin
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id")
    var site: Site? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_tenant_id")
    var assignedTenant: Tenant? = null
```

- [ ] **Step 5: Create `VpnTunnel.kt`**

```kotlin
package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

enum class TunnelType { IPSEC_S2S, SSL_VPN, WIREGUARD, OTHER }
enum class TunnelStatus { ACTIVE, PLANNED, DISABLED }
enum class IkeVersion { IKEV1, IKEV2 }
enum class EncryptionAlgorithm { AES_128, AES_256, TRIPLE_DES, CHACHA20 }
enum class HashAlgorithm { SHA1, SHA256, SHA512 }

@Entity
@Table(name = "vpn_tunnels")
class VpnTunnel(
    @Column(nullable = false)
    var name: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: TunnelType,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: TunnelStatus = TunnelStatus.ACTIVE,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    var tenant: Tenant,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "local_device_id", nullable = false)
    var localDevice: Device,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "remote_device_id")
    var remoteDevice: Device? = null,

    @ManyToMany
    @JoinTable(
        name = "vpn_tunnel_local_subnets",
        joinColumns = [JoinColumn(name = "tunnel_id")],
        inverseJoinColumns = [JoinColumn(name = "subnet_id")]
    )
    var localSubnets: MutableSet<Subnet> = mutableSetOf(),

    @ManyToMany
    @JoinTable(
        name = "vpn_tunnel_remote_subnets",
        joinColumns = [JoinColumn(name = "tunnel_id")],
        inverseJoinColumns = [JoinColumn(name = "subnet_id")]
    )
    var remoteSubnets: MutableSet<Subnet> = mutableSetOf(),

    @Enumerated(EnumType.STRING)
    @Column(name = "ike_version")
    var ikeVersion: IkeVersion? = null,

    @Enumerated(EnumType.STRING)
    var encryption: EncryptionAlgorithm? = null,

    @Enumerated(EnumType.STRING)
    var hash: HashAlgorithm? = null,

    @Column(name = "dh_group")
    var dhGroup: Int? = null,

    @Column(name = "secret_ref")
    var secretRef: String? = null
) : BaseEntity()
```

- [ ] **Step 6: Create `Note.kt` and `CustomField.kt`**

`Note.kt`:

```kotlin
package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.util.UUID

enum class DocEntityType { TENANT, SITE, ROOM, RACK, DEVICE, VLAN, SUBNET, IP_ADDRESS, VPN_TUNNEL }

@Entity
@Table(name = "notes")
class Note(
    @Column(nullable = false)
    var title: String,

    @Column(name = "content_markdown", nullable = false, columnDefinition = "text")
    var contentMarkdown: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false)
    var entityType: DocEntityType,

    @Column(name = "entity_id", nullable = false)
    var entityId: UUID
) : BaseEntity()
```

`CustomField.kt`:

```kotlin
package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.util.UUID

enum class FieldType { TEXT, NUMBER, URL, DATE }

@Entity
@Table(name = "custom_fields")
class CustomField(
    @Column(nullable = false)
    var name: String,

    @Column(nullable = false)
    var value: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "field_type", nullable = false)
    var fieldType: FieldType = FieldType.TEXT,

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false)
    var entityType: DocEntityType,

    @Column(name = "entity_id", nullable = false)
    var entityId: UUID
) : BaseEntity()
```

- [ ] **Step 7: Create/extend repositories**

`VpnTunnelRepository.kt`:

```kotlin
package com.msp.doku.repository

import com.msp.doku.domain.VpnTunnel
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface VpnTunnelRepository : JpaRepository<VpnTunnel, UUID> {
    fun findByTenantId(tenantId: UUID): List<VpnTunnel>
    fun existsByTenantId(tenantId: UUID): Boolean
}
```

`DocRepositories.kt`:

```kotlin
package com.msp.doku.repository

import com.msp.doku.domain.CustomField
import com.msp.doku.domain.DocEntityType
import com.msp.doku.domain.Note
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface NoteRepository : JpaRepository<Note, UUID> {
    fun findByEntityTypeAndEntityIdOrderByUpdatedAtDesc(entityType: DocEntityType, entityId: UUID): List<Note>
    fun deleteByEntityTypeAndEntityId(entityType: DocEntityType, entityId: UUID)
}

@Repository
interface CustomFieldRepository : JpaRepository<CustomField, UUID> {
    fun findByEntityTypeAndEntityIdOrderByName(entityType: DocEntityType, entityId: UUID): List<CustomField>
    fun existsByEntityTypeAndEntityIdAndName(entityType: DocEntityType, entityId: UUID, name: String): Boolean
    fun deleteByEntityTypeAndEntityId(entityType: DocEntityType, entityId: UUID)
}
```

`NetworkRepositories.kt` — replace body with:

```kotlin
package com.msp.doku.repository

import com.msp.doku.domain.IpAddress
import com.msp.doku.domain.Subnet
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface SubnetRepository : JpaRepository<Subnet, UUID> {
    fun findByTenantId(tenantId: UUID): List<Subnet>
    fun findByIsPublicTrue(): List<Subnet>
    fun findByAssignedTenantId(tenantId: UUID): List<Subnet>
    fun existsByAssignedTenantId(tenantId: UUID): Boolean
}

@Repository
interface IpAddressRepository : JpaRepository<IpAddress, UUID> {
    fun findBySubnetId(subnetId: UUID): List<IpAddress>
    fun countBySubnetId(subnetId: UUID): Int
    fun findByAssignedTenantId(tenantId: UUID): List<IpAddress>
    fun existsByAssignedTenantId(tenantId: UUID): Boolean
}
```

`VlanRepository.kt` and `DeviceRepository.kt` — add to each interface (types `Vlan` / `Device` respectively):

```kotlin
    fun findByAssignedTenantId(tenantId: UUID): List<Vlan>   // resp. List<Device>
    fun existsByAssignedTenantId(tenantId: UUID): Boolean
```

(Import `java.util.UUID` if not present.)

- [ ] **Step 8: Compile**

Run: `cd backend && ./gradlew compileKotlin`
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 9: Verify migration applies**

Run: `docker compose up -d postgres && cd backend && ./gradlew bootRun` (from repo root; stop with Ctrl-C after startup completes)
Expected: log line `Migrating schema "public" to version "6 - msp shared infra"`, application starts without errors.

- [ ] **Step 10: Commit**

```bash
git add backend
git commit -m "feat(backend): add MSP tenant type, shared-resource assignment, VpnTunnel/Note/CustomField schema"
```

---

### Task 2: Error handling, tenant type in API, tenant delete restriction

**Files:**
- Create: `backend/src/main/kotlin/com/msp/doku/config/GlobalExceptionHandler.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/dto/TenantDto.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/service/TenantService.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/controller/TenantController.kt`
- Test: `backend/src/test/kotlin/com/msp/doku/service/TenantServiceTest.kt`

**Interfaces:**
- Consumes: Task 1 repositories (`existsByAssignedTenantId`, `existsByTenantId`), `TenantType`.
- Produces: `TenantDto(id, name, identifier, type: TenantType, createdAt, updatedAt)`; `CreateTenantRequest(name, identifier, type: TenantType = CUSTOMER)`; `TenantService.deleteTenant(id: UUID)`; `DELETE /api/v1/tenants/{id}`; JSON error body `{ "message": "..." }` with 400/409 mapping.

- [ ] **Step 1: Write the failing test**

`backend/src/test/kotlin/com/msp/doku/service/TenantServiceTest.kt`:

```kotlin
package com.msp.doku.service

import com.msp.doku.domain.Tenant
import com.msp.doku.domain.TenantType
import com.msp.doku.dto.CreateTenantRequest
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VlanRepository
import com.msp.doku.repository.VpnTunnelRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.util.Optional
import java.util.UUID

class TenantServiceTest {

    private val tenantRepository: TenantRepository = mock()
    private val vlanRepository: VlanRepository = mock()
    private val subnetRepository: SubnetRepository = mock()
    private val ipAddressRepository: IpAddressRepository = mock()
    private val deviceRepository: DeviceRepository = mock()
    private val vpnTunnelRepository: VpnTunnelRepository = mock()

    private val service = TenantService(
        tenantRepository, vlanRepository, subnetRepository,
        ipAddressRepository, deviceRepository, vpnTunnelRepository
    )

    @Test
    fun `createTenant persists MSP type`() {
        whenever(tenantRepository.findByIdentifier("igeeks")).thenReturn(null)
        whenever(tenantRepository.existsByType(TenantType.MSP)).thenReturn(false)
        whenever(tenantRepository.save(any<Tenant>())).thenAnswer { inv ->
            (inv.arguments[0] as Tenant).apply { id = UUID.randomUUID() }
        }

        val dto = service.createTenant(CreateTenantRequest(name = "iGeeks", identifier = "igeeks", type = TenantType.MSP))

        assertEquals(TenantType.MSP, dto.type)
    }

    @Test
    fun `createTenant rejects second MSP tenant`() {
        whenever(tenantRepository.findByIdentifier("igeeks2")).thenReturn(null)
        whenever(tenantRepository.existsByType(TenantType.MSP)).thenReturn(true)

        assertThrows<IllegalArgumentException> {
            service.createTenant(CreateTenantRequest(name = "iGeeks 2", identifier = "igeeks2", type = TenantType.MSP))
        }
    }

    @Test
    fun `deleteTenant is blocked by inbound assignments`() {
        val id = UUID.randomUUID()
        whenever(tenantRepository.findById(id)).thenReturn(
            Optional.of(Tenant(name = "Kunde", identifier = "kunde").apply { this.id = id })
        )
        whenever(vlanRepository.existsByAssignedTenantId(id)).thenReturn(true)
        whenever(subnetRepository.existsByAssignedTenantId(id)).thenReturn(false)
        whenever(ipAddressRepository.existsByAssignedTenantId(id)).thenReturn(false)
        whenever(deviceRepository.existsByAssignedTenantId(id)).thenReturn(false)
        whenever(vpnTunnelRepository.existsByTenantId(id)).thenReturn(true)

        val ex = assertThrows<IllegalStateException> { service.deleteTenant(id) }

        assertTrue(ex.message!!.contains("VLANs"))
        assertTrue(ex.message!!.contains("VPN-Tunnel"))
        verify(tenantRepository, never()).delete(any<Tenant>())
    }

    @Test
    fun `deleteTenant deletes when nothing is assigned`() {
        val id = UUID.randomUUID()
        val tenant = Tenant(name = "Kunde", identifier = "kunde").apply { this.id = id }
        whenever(tenantRepository.findById(id)).thenReturn(Optional.of(tenant))
        whenever(vlanRepository.existsByAssignedTenantId(id)).thenReturn(false)
        whenever(subnetRepository.existsByAssignedTenantId(id)).thenReturn(false)
        whenever(ipAddressRepository.existsByAssignedTenantId(id)).thenReturn(false)
        whenever(deviceRepository.existsByAssignedTenantId(id)).thenReturn(false)
        whenever(vpnTunnelRepository.existsByTenantId(id)).thenReturn(false)

        service.deleteTenant(id)

        verify(tenantRepository).delete(tenant)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests "com.msp.doku.service.TenantServiceTest"`
Expected: COMPILATION FAILURE (no `type` on `CreateTenantRequest`, no `existsByType`, wrong `TenantService` constructor arity).

- [ ] **Step 3: Implement**

Add to `TenantRepository` (in `backend/src/main/kotlin/com/msp/doku/repository/CoreRepositories.kt`, inside the existing `TenantRepository` interface):

```kotlin
    fun existsByType(type: TenantType): Boolean
```

(import `com.msp.doku.domain.TenantType`)

`TenantDto.kt` — replace file content:

```kotlin
package com.msp.doku.dto

import com.msp.doku.domain.TenantType
import java.time.Instant
import java.util.UUID

data class TenantDto(
    val id: UUID,
    val name: String,
    val identifier: String,
    val type: TenantType,
    val createdAt: Instant?,
    val updatedAt: Instant?
)

data class CreateTenantRequest(
    val name: String,
    val identifier: String,
    val type: TenantType = TenantType.CUSTOMER
)
```

`TenantService.kt` — replace file content:

```kotlin
package com.msp.doku.service

import com.msp.doku.domain.Tenant
import com.msp.doku.domain.TenantType
import com.msp.doku.dto.CreateTenantRequest
import com.msp.doku.dto.TenantDto
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VlanRepository
import com.msp.doku.repository.VpnTunnelRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class TenantService(
    private val tenantRepository: TenantRepository,
    private val vlanRepository: VlanRepository,
    private val subnetRepository: SubnetRepository,
    private val ipAddressRepository: IpAddressRepository,
    private val deviceRepository: DeviceRepository,
    private val vpnTunnelRepository: VpnTunnelRepository
) {

    fun getAllTenants(): List<TenantDto> {
        return tenantRepository.findAll().map { it.toDto() }
    }

    @Transactional
    fun createTenant(request: CreateTenantRequest): TenantDto {
        if (tenantRepository.findByIdentifier(request.identifier) != null) {
            throw IllegalArgumentException("Tenant with identifier '${request.identifier}' already exists")
        }
        if (request.type == TenantType.MSP && tenantRepository.existsByType(TenantType.MSP)) {
            throw IllegalArgumentException("Es existiert bereits ein MSP-Tenant")
        }

        val tenant = Tenant(
            name = request.name,
            identifier = request.identifier,
            type = request.type
        )
        return tenantRepository.save(tenant).toDto()
    }

    @Transactional
    fun deleteTenant(id: UUID) {
        val tenant = tenantRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Tenant not found") }

        val blockers = mutableListOf<String>()
        if (vlanRepository.existsByAssignedTenantId(id)) blockers.add("VLANs")
        if (subnetRepository.existsByAssignedTenantId(id)) blockers.add("Subnetze")
        if (ipAddressRepository.existsByAssignedTenantId(id)) blockers.add("IP-Adressen")
        if (deviceRepository.existsByAssignedTenantId(id)) blockers.add("Geräte")
        if (vpnTunnelRepository.existsByTenantId(id)) blockers.add("VPN-Tunnel")
        if (blockers.isNotEmpty()) {
            throw IllegalStateException(
                "Tenant kann nicht gelöscht werden – zugewiesene Ressourcen: ${blockers.joinToString(", ")}"
            )
        }
        tenantRepository.delete(tenant)
    }

    private fun Tenant.toDto() = TenantDto(
        id = this.id!!,
        name = this.name,
        identifier = this.identifier,
        type = this.type,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt
    )
}
```

`GlobalExceptionHandler.kt`:

```kotlin
package com.msp.doku.config

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

data class ApiError(val message: String)

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleBadRequest(e: IllegalArgumentException): ResponseEntity<ApiError> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiError(e.message ?: "Ungültige Anfrage"))

    @ExceptionHandler(IllegalStateException::class)
    fun handleConflict(e: IllegalStateException): ResponseEntity<ApiError> =
        ResponseEntity.status(HttpStatus.CONFLICT).body(ApiError(e.message ?: "Konflikt"))
}
```

`TenantController.kt` — add to the class:

```kotlin
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteTenant(@PathVariable id: UUID) {
        tenantService.deleteTenant(id)
    }
```

(add imports `org.springframework.web.bind.annotation.DeleteMapping`, `org.springframework.web.bind.annotation.PathVariable`, `java.util.UUID`)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && ./gradlew test --tests "com.msp.doku.service.TenantServiceTest"`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(backend): tenant type in API, tenant delete with assignment restriction, error handler"
```

---

### Task 3: Assignment API + assignment info in existing DTOs

**Files:**
- Create: `backend/src/main/kotlin/com/msp/doku/dto/AssignmentDtos.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/service/AssignmentService.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/controller/AssignmentController.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/dto/NetworkDtos.kt` (SubnetDto, IpAddressDto)
- Modify: `backend/src/main/kotlin/com/msp/doku/service/NetworkService.kt` (DTO mapping)
- Modify: `backend/src/main/kotlin/com/msp/doku/dto/RackDto.kt` or wherever `DeviceDto` lives — locate with `grep -rn "data class DeviceDto" backend/src` — add assignment fields
- Modify: `backend/src/main/kotlin/com/msp/doku/service/DeviceService.kt` (DTO mapping)
- Test: `backend/src/test/kotlin/com/msp/doku/service/AssignmentServiceTest.kt`

**Interfaces:**
- Consumes: Task 1 entities/repos.
- Produces:
  - `AssignmentRequest(assignedTenantId: UUID?)`, `AssignmentResponse(id: UUID, assignedTenantId: UUID?, assignedTenantName: String?)`
  - `AssignmentService.assign(entityType: String, entityId: UUID, assignedTenantId: UUID?): AssignmentResponse` where entityType ∈ `"vlans" | "subnets" | "ips" | "devices"`
  - `PATCH /api/v1/assignments/{entityType}/{id}` with body `AssignmentRequest`
  - `SubnetDto` gains `isPublic: Boolean = false`, `assignedTenantId: UUID? = null`, `assignedTenantName: String? = null`
  - `IpAddressDto` gains `assignedTenantId: UUID? = null`, `assignedTenantName: String? = null`
  - `DeviceDto` gains `assignedTenantId: UUID? = null`, `assignedTenantName: String? = null`

- [ ] **Step 1: Write the failing test**

`backend/src/test/kotlin/com/msp/doku/service/AssignmentServiceTest.kt`:

```kotlin
package com.msp.doku.service

import com.msp.doku.domain.IpAddress
import com.msp.doku.domain.Subnet
import com.msp.doku.domain.Tenant
import com.msp.doku.domain.TenantType
import com.msp.doku.domain.Vlan
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VlanRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import java.util.Optional
import java.util.UUID

class AssignmentServiceTest {

    private val tenantRepository: TenantRepository = mock()
    private val vlanRepository: VlanRepository = mock()
    private val subnetRepository: SubnetRepository = mock()
    private val ipAddressRepository: IpAddressRepository = mock()
    private val deviceRepository: DeviceRepository = mock()

    private val service = AssignmentService(
        tenantRepository, vlanRepository, subnetRepository, ipAddressRepository, deviceRepository
    )

    private val msp = Tenant(name = "iGeeks", identifier = "igeeks", type = TenantType.MSP)
        .apply { id = UUID.randomUUID() }
    private val customer = Tenant(name = "Kunde", identifier = "kunde")
        .apply { id = UUID.randomUUID() }

    @Test
    fun `assigns a customer to an MSP-owned vlan`() {
        val vlan = Vlan(vlanId = 110, name = "Kunde-VLAN", tenant = msp).apply { id = UUID.randomUUID() }
        whenever(tenantRepository.findById(customer.id!!)).thenReturn(Optional.of(customer))
        whenever(vlanRepository.findById(vlan.id!!)).thenReturn(Optional.of(vlan))
        whenever(vlanRepository.save(any<Vlan>())).thenAnswer { it.arguments[0] }

        val result = service.assign("vlans", vlan.id!!, customer.id)

        assertEquals(customer.id, result.assignedTenantId)
        assertEquals("Kunde", result.assignedTenantName)
    }

    @Test
    fun `rejects assignment to the owning tenant`() {
        val vlan = Vlan(vlanId = 1, tenant = customer).apply { id = UUID.randomUUID() }
        whenever(tenantRepository.findById(customer.id!!)).thenReturn(Optional.of(customer))
        whenever(vlanRepository.findById(vlan.id!!)).thenReturn(Optional.of(vlan))

        assertThrows<IllegalArgumentException> { service.assign("vlans", vlan.id!!, customer.id) }
    }

    @Test
    fun `unassigns with null tenant id`() {
        val subnet = Subnet(tenant = msp, cidr = "203.0.113.0/24", assignedTenant = customer)
            .apply { id = UUID.randomUUID() }
        whenever(subnetRepository.findById(subnet.id!!)).thenReturn(Optional.of(subnet))
        whenever(subnetRepository.save(any<Subnet>())).thenAnswer { it.arguments[0] }

        val result = service.assign("subnets", subnet.id!!, null)

        assertNull(result.assignedTenantId)
    }

    @Test
    fun `resolves ip owner through its subnet`() {
        val subnet = Subnet(tenant = customer, cidr = "10.0.0.0/24").apply { id = UUID.randomUUID() }
        val ip = IpAddress(subnet = subnet, address = "10.0.0.5").apply { id = UUID.randomUUID() }
        whenever(tenantRepository.findById(customer.id!!)).thenReturn(Optional.of(customer))
        whenever(ipAddressRepository.findById(ip.id!!)).thenReturn(Optional.of(ip))

        assertThrows<IllegalArgumentException> { service.assign("ips", ip.id!!, customer.id) }
    }

    @Test
    fun `rejects unknown entity type`() {
        assertThrows<IllegalArgumentException> { service.assign("routers", UUID.randomUUID(), null) }
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests "com.msp.doku.service.AssignmentServiceTest"`
Expected: COMPILATION FAILURE (`AssignmentService` does not exist).

- [ ] **Step 3: Implement**

`AssignmentDtos.kt`:

```kotlin
package com.msp.doku.dto

import java.util.UUID

data class AssignmentRequest(
    val assignedTenantId: UUID?
)

data class AssignmentResponse(
    val id: UUID,
    val assignedTenantId: UUID?,
    val assignedTenantName: String?
)
```

`AssignmentService.kt`:

```kotlin
package com.msp.doku.service

import com.msp.doku.domain.Tenant
import com.msp.doku.dto.AssignmentResponse
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VlanRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class AssignmentService(
    private val tenantRepository: TenantRepository,
    private val vlanRepository: VlanRepository,
    private val subnetRepository: SubnetRepository,
    private val ipAddressRepository: IpAddressRepository,
    private val deviceRepository: DeviceRepository
) {

    @Transactional
    fun assign(entityType: String, entityId: UUID, assignedTenantId: UUID?): AssignmentResponse {
        val assigned: Tenant? = assignedTenantId?.let {
            tenantRepository.findById(it).orElseThrow { IllegalArgumentException("Tenant not found") }
        }

        return when (entityType) {
            "vlans" -> {
                val vlan = vlanRepository.findById(entityId)
                    .orElseThrow { IllegalArgumentException("VLAN not found") }
                requireNotOwner(assigned, vlan.tenant)
                vlan.assignedTenant = assigned
                vlanRepository.save(vlan)
                response(entityId, assigned)
            }
            "subnets" -> {
                val subnet = subnetRepository.findById(entityId)
                    .orElseThrow { IllegalArgumentException("Subnet not found") }
                requireNotOwner(assigned, subnet.tenant)
                subnet.assignedTenant = assigned
                subnetRepository.save(subnet)
                response(entityId, assigned)
            }
            "ips" -> {
                val ip = ipAddressRepository.findById(entityId)
                    .orElseThrow { IllegalArgumentException("IP Address not found") }
                requireNotOwner(assigned, ip.subnet.tenant)
                ip.assignedTenant = assigned
                ipAddressRepository.save(ip)
                response(entityId, assigned)
            }
            "devices" -> {
                val device = deviceRepository.findById(entityId)
                    .orElseThrow { IllegalArgumentException("Device not found") }
                val owner = device.rack?.room?.site?.tenant ?: device.site?.tenant
                requireNotOwner(assigned, owner)
                device.assignedTenant = assigned
                deviceRepository.save(device)
                response(entityId, assigned)
            }
            else -> throw IllegalArgumentException("Unknown entity type: $entityType")
        }
    }

    private fun requireNotOwner(assigned: Tenant?, owner: Tenant?) {
        if (assigned != null && owner != null && assigned.id == owner.id) {
            throw IllegalArgumentException("Ressource gehört bereits diesem Tenant – Zuweisung nicht nötig")
        }
    }

    private fun response(id: UUID, assigned: Tenant?) =
        AssignmentResponse(id = id, assignedTenantId = assigned?.id, assignedTenantName = assigned?.name)
}
```

`AssignmentController.kt`:

```kotlin
package com.msp.doku.controller

import com.msp.doku.dto.AssignmentRequest
import com.msp.doku.dto.AssignmentResponse
import com.msp.doku.service.AssignmentService
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/assignments")
class AssignmentController(
    private val assignmentService: AssignmentService
) {

    @PatchMapping("/{entityType}/{id}")
    fun assign(
        @PathVariable entityType: String,
        @PathVariable id: UUID,
        @RequestBody request: AssignmentRequest
    ): AssignmentResponse {
        return assignmentService.assign(entityType, id, request.assignedTenantId)
    }
}
```

DTO enrichment — in `NetworkDtos.kt` add to `SubnetDto`:

```kotlin
    val isPublic: Boolean = false,
    val assignedTenantId: UUID? = null,
    val assignedTenantName: String? = null,
```

(place after `gateway`) and to `IpAddressDto`:

```kotlin
    val assignedTenantId: UUID? = null,
    val assignedTenantName: String? = null,
```

(place after `mac`).

In `NetworkService.kt`, every place a `SubnetDto` is constructed add `isPublic = subnet.isPublic, assignedTenantId = subnet.assignedTenant?.id, assignedTenantName = subnet.assignedTenant?.name` (in `createSubnet` use `saved` instead of `subnet`), and in the private `IpAddress.toDto()` add `assignedTenantId = this.assignedTenant?.id, assignedTenantName = this.assignedTenant?.name`.

Find `DeviceDto` with `grep -rn "data class DeviceDto" backend/src` and add:

```kotlin
    val assignedTenantId: UUID? = null,
    val assignedTenantName: String? = null,
```

In `DeviceService.kt`, private `Device.toDto()` add `assignedTenantId = this.assignedTenant?.id, assignedTenantName = this.assignedTenant?.name`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && ./gradlew test --tests "com.msp.doku.service.AssignmentServiceTest"`
Expected: 5 tests PASS. Then run `./gradlew test` — all tests PASS (no regressions).

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(backend): tenant assignment API for vlans/subnets/ips/devices"
```

---

### Task 4: Public subnets endpoint (Datacenter data source)

**Files:**
- Modify: `backend/src/main/kotlin/com/msp/doku/service/NetworkService.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/controller/NetworkController.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/dto/NetworkDtos.kt` (CreateSubnetRequest gains isPublic)
- Test: `backend/src/test/kotlin/com/msp/doku/service/NetworkServiceTest.kt`

**Interfaces:**
- Consumes: `SubnetRepository.findByIsPublicTrue()`, enriched `SubnetDto` from Task 3.
- Produces: `NetworkService.getPublicSubnets(): List<SubnetDto>`; `GET /api/v1/network/public-subnets`; `CreateSubnetRequest.isPublic: Boolean = false` honored in `createSubnet`.

- [ ] **Step 1: Write the failing test**

`backend/src/test/kotlin/com/msp/doku/service/NetworkServiceTest.kt`:

```kotlin
package com.msp.doku.service

import com.msp.doku.domain.Subnet
import com.msp.doku.domain.Tenant
import com.msp.doku.domain.TenantType
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VlanRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import java.util.UUID

class NetworkServiceTest {

    private val subnetRepository: SubnetRepository = mock()
    private val ipAddressRepository: IpAddressRepository = mock()
    private val tenantRepository: TenantRepository = mock()
    private val vlanRepository: VlanRepository = mock()

    private val service = NetworkService(subnetRepository, ipAddressRepository, tenantRepository, vlanRepository)

    @Test
    fun `getPublicSubnets maps public flag and assignment`() {
        val msp = Tenant(name = "iGeeks", identifier = "igeeks", type = TenantType.MSP)
            .apply { id = UUID.randomUUID() }
        val subnet = Subnet(tenant = msp, cidr = "203.0.113.0/24", description = "Primary Public Block", isPublic = true)
            .apply { id = UUID.randomUUID() }
        whenever(subnetRepository.findByIsPublicTrue()).thenReturn(listOf(subnet))
        whenever(ipAddressRepository.countBySubnetId(subnet.id!!)).thenReturn(12)

        val result = service.getPublicSubnets()

        assertEquals(1, result.size)
        assertTrue(result[0].isPublic)
        assertEquals("203.0.113.0/24", result[0].cidr)
        assertEquals(12, result[0].usedIps)
        assertEquals(256, result[0].totalIps)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests "com.msp.doku.service.NetworkServiceTest"`
Expected: COMPILATION FAILURE (`getPublicSubnets` does not exist).

- [ ] **Step 3: Implement**

In `NetworkDtos.kt`, add to `CreateSubnetRequest` after `tenantId`:

```kotlin
    val isPublic: Boolean = false
```

In `NetworkService.kt`:

1. Extract the subnet→DTO mapping used in `getSubnetsForTenant` into a private helper and reuse it:

```kotlin
    fun getPublicSubnets(): List<SubnetDto> {
        return subnetRepository.findByIsPublicTrue().map { it.toDtoWithStats() }
    }

    private fun Subnet.toDtoWithStats(): SubnetDto {
        val usedIps = ipAddressRepository.countBySubnetId(this.id!!)
        val totalIps = calculateTotalIps(this.cidr)
        return SubnetDto(
            id = this.id!!,
            cidr = this.cidr,
            description = this.description,
            vlanId = this.vlan?.id,
            vlanTag = this.vlan?.vlanId,
            vlanName = this.vlan?.name ?: this.vlan?.vlanId?.toString(),
            gateway = this.gateway,
            isPublic = this.isPublic,
            assignedTenantId = this.assignedTenant?.id,
            assignedTenantName = this.assignedTenant?.name,
            usedIps = usedIps,
            totalIps = totalIps,
            utilizationPercent = if (totalIps > 0) (usedIps.toDouble() / totalIps) * 100 else 0.0
        )
    }
```

2. Rewrite `getSubnetsForTenant` body to `return subnetRepository.findByTenantId(tenantId).map { it.toDtoWithStats() }`.
3. In `createSubnet`, set `isPublic = request.isPublic` when constructing the `Subnet` and return `saved.toDtoWithStats()` instead of the hand-built DTO.

In `NetworkController.kt` add:

```kotlin
    @GetMapping("/public-subnets")
    fun getPublicSubnets(): List<SubnetDto> {
        return networkService.getPublicSubnets()
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && ./gradlew test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(backend): public subnet listing for datacenter view"
```

---

### Task 5: VPN tunnel API

**Files:**
- Create: `backend/src/main/kotlin/com/msp/doku/dto/VpnTunnelDtos.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/service/VpnTunnelService.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/controller/VpnTunnelController.kt`
- Test: `backend/src/test/kotlin/com/msp/doku/service/VpnTunnelServiceTest.kt`

**Interfaces:**
- Consumes: Task 1 `VpnTunnel` entity + enums + `VpnTunnelRepository`; `TenantRepository`, `DeviceRepository`, `SubnetRepository`.
- Produces:
  - `SubnetRefDto(id: UUID, cidr: String)`
  - `VpnTunnelDto(id, name, type: TunnelType, status: TunnelStatus, tenantId, tenantName, localDeviceId, localDeviceName, remoteDeviceId: UUID?, remoteDeviceName: String?, localSubnets: List<SubnetRefDto>, remoteSubnets: List<SubnetRefDto>, ikeVersion: IkeVersion?, encryption: EncryptionAlgorithm?, hash: HashAlgorithm?, dhGroup: Int?, secretRef: String?)`
  - `CreateVpnTunnelRequest(name, type, status: TunnelStatus = ACTIVE, tenantId, localDeviceId, remoteDeviceId: UUID? = null, localSubnetIds: List<UUID> = emptyList(), remoteSubnetIds: List<UUID> = emptyList(), ikeVersion: IkeVersion? = null, encryption: EncryptionAlgorithm? = null, hash: HashAlgorithm? = null, dhGroup: Int? = null, secretRef: String? = null)`
  - `VpnTunnelService`: `getTunnels(tenantId: UUID?): List<VpnTunnelDto>`, `createTunnel(request): VpnTunnelDto`, `updateTunnel(id, request): VpnTunnelDto`, `deleteTunnel(id: UUID)`
  - Endpoints: `GET /api/v1/vpn-tunnels?tenantId=` (tenantId optional), `POST /api/v1/vpn-tunnels`, `PUT /api/v1/vpn-tunnels/{id}`, `DELETE /api/v1/vpn-tunnels/{id}`

- [ ] **Step 1: Write the failing test**

`backend/src/test/kotlin/com/msp/doku/service/VpnTunnelServiceTest.kt`:

```kotlin
package com.msp.doku.service

import com.msp.doku.domain.Device
import com.msp.doku.domain.DeviceType
import com.msp.doku.domain.EncryptionAlgorithm
import com.msp.doku.domain.IkeVersion
import com.msp.doku.domain.Subnet
import com.msp.doku.domain.Tenant
import com.msp.doku.domain.TenantType
import com.msp.doku.domain.TunnelType
import com.msp.doku.domain.VpnTunnel
import com.msp.doku.dto.CreateVpnTunnelRequest
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VpnTunnelRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.util.Optional
import java.util.UUID

class VpnTunnelServiceTest {

    private val vpnTunnelRepository: VpnTunnelRepository = mock()
    private val tenantRepository: TenantRepository = mock()
    private val deviceRepository: DeviceRepository = mock()
    private val subnetRepository: SubnetRepository = mock()

    private val service = VpnTunnelService(vpnTunnelRepository, tenantRepository, deviceRepository, subnetRepository)

    private val customer = Tenant(name = "Kunde", identifier = "kunde").apply { id = UUID.randomUUID() }
    private val firewall = Device(name = "DC-FW-01", deviceType = DeviceType.FIREWALL)
        .apply { id = UUID.randomUUID() }

    @Test
    fun `createTunnel resolves references and maps advanced fields`() {
        val subnet = Subnet(tenant = customer, cidr = "10.10.0.0/24").apply { id = UUID.randomUUID() }
        whenever(tenantRepository.findById(customer.id!!)).thenReturn(Optional.of(customer))
        whenever(deviceRepository.findById(firewall.id!!)).thenReturn(Optional.of(firewall))
        whenever(subnetRepository.findById(subnet.id!!)).thenReturn(Optional.of(subnet))
        whenever(vpnTunnelRepository.save(any<VpnTunnel>())).thenAnswer { inv ->
            (inv.arguments[0] as VpnTunnel).apply { id = UUID.randomUUID() }
        }

        val dto = service.createTunnel(
            CreateVpnTunnelRequest(
                name = "S2S Kunde HQ",
                type = TunnelType.IPSEC_S2S,
                tenantId = customer.id!!,
                localDeviceId = firewall.id!!,
                remoteSubnetIds = listOf(subnet.id!!),
                ikeVersion = IkeVersion.IKEV2,
                encryption = EncryptionAlgorithm.AES_256,
                secretRef = "BW: vpn-kunde-psk"
            )
        )

        assertEquals("S2S Kunde HQ", dto.name)
        assertEquals("Kunde", dto.tenantName)
        assertEquals("DC-FW-01", dto.localDeviceName)
        assertEquals(1, dto.remoteSubnets.size)
        assertEquals("10.10.0.0/24", dto.remoteSubnets[0].cidr)
        assertEquals(IkeVersion.IKEV2, dto.ikeVersion)
    }

    @Test
    fun `createTunnel fails for unknown local device`() {
        whenever(tenantRepository.findById(customer.id!!)).thenReturn(Optional.of(customer))
        whenever(deviceRepository.findById(any())).thenReturn(Optional.empty())

        assertThrows<IllegalArgumentException> {
            service.createTunnel(
                CreateVpnTunnelRequest(
                    name = "x", type = TunnelType.IPSEC_S2S,
                    tenantId = customer.id!!, localDeviceId = UUID.randomUUID()
                )
            )
        }
    }

    @Test
    fun `deleteTunnel removes existing tunnel`() {
        val id = UUID.randomUUID()
        whenever(vpnTunnelRepository.existsById(id)).thenReturn(true)

        service.deleteTunnel(id)

        verify(vpnTunnelRepository).deleteById(id)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests "com.msp.doku.service.VpnTunnelServiceTest"`
Expected: COMPILATION FAILURE.

- [ ] **Step 3: Implement**

`VpnTunnelDtos.kt`:

```kotlin
package com.msp.doku.dto

import com.msp.doku.domain.EncryptionAlgorithm
import com.msp.doku.domain.HashAlgorithm
import com.msp.doku.domain.IkeVersion
import com.msp.doku.domain.TunnelStatus
import com.msp.doku.domain.TunnelType
import java.util.UUID

data class SubnetRefDto(
    val id: UUID,
    val cidr: String
)

data class VpnTunnelDto(
    val id: UUID,
    val name: String,
    val type: TunnelType,
    val status: TunnelStatus,
    val tenantId: UUID,
    val tenantName: String,
    val localDeviceId: UUID,
    val localDeviceName: String,
    val remoteDeviceId: UUID?,
    val remoteDeviceName: String?,
    val localSubnets: List<SubnetRefDto>,
    val remoteSubnets: List<SubnetRefDto>,
    val ikeVersion: IkeVersion?,
    val encryption: EncryptionAlgorithm?,
    val hash: HashAlgorithm?,
    val dhGroup: Int?,
    val secretRef: String?
)

data class CreateVpnTunnelRequest(
    val name: String,
    val type: TunnelType,
    val status: TunnelStatus = TunnelStatus.ACTIVE,
    val tenantId: UUID,
    val localDeviceId: UUID,
    val remoteDeviceId: UUID? = null,
    val localSubnetIds: List<UUID> = emptyList(),
    val remoteSubnetIds: List<UUID> = emptyList(),
    val ikeVersion: IkeVersion? = null,
    val encryption: EncryptionAlgorithm? = null,
    val hash: HashAlgorithm? = null,
    val dhGroup: Int? = null,
    val secretRef: String? = null
)
```

`VpnTunnelService.kt`:

```kotlin
package com.msp.doku.service

import com.msp.doku.domain.Subnet
import com.msp.doku.domain.VpnTunnel
import com.msp.doku.dto.CreateVpnTunnelRequest
import com.msp.doku.dto.SubnetRefDto
import com.msp.doku.dto.VpnTunnelDto
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VpnTunnelRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class VpnTunnelService(
    private val vpnTunnelRepository: VpnTunnelRepository,
    private val tenantRepository: TenantRepository,
    private val deviceRepository: DeviceRepository,
    private val subnetRepository: SubnetRepository
) {

    @Transactional(readOnly = true)
    fun getTunnels(tenantId: UUID?): List<VpnTunnelDto> {
        val tunnels = if (tenantId != null) vpnTunnelRepository.findByTenantId(tenantId)
        else vpnTunnelRepository.findAll()
        return tunnels.map { it.toDto() }
    }

    @Transactional
    fun createTunnel(request: CreateVpnTunnelRequest): VpnTunnelDto {
        val tunnel = VpnTunnel(
            name = request.name,
            type = request.type,
            status = request.status,
            tenant = tenantRepository.findById(request.tenantId)
                .orElseThrow { IllegalArgumentException("Tenant not found") },
            localDevice = deviceRepository.findById(request.localDeviceId)
                .orElseThrow { IllegalArgumentException("Local device not found") },
            remoteDevice = request.remoteDeviceId?.let {
                deviceRepository.findById(it).orElseThrow { IllegalArgumentException("Remote device not found") }
            },
            localSubnets = resolveSubnets(request.localSubnetIds),
            remoteSubnets = resolveSubnets(request.remoteSubnetIds),
            ikeVersion = request.ikeVersion,
            encryption = request.encryption,
            hash = request.hash,
            dhGroup = request.dhGroup,
            secretRef = request.secretRef?.ifBlank { null }
        )
        return vpnTunnelRepository.save(tunnel).toDto()
    }

    @Transactional
    fun updateTunnel(id: UUID, request: CreateVpnTunnelRequest): VpnTunnelDto {
        val tunnel = vpnTunnelRepository.findById(id)
            .orElseThrow { IllegalArgumentException("VPN tunnel not found") }

        tunnel.name = request.name
        tunnel.type = request.type
        tunnel.status = request.status
        tunnel.tenant = tenantRepository.findById(request.tenantId)
            .orElseThrow { IllegalArgumentException("Tenant not found") }
        tunnel.localDevice = deviceRepository.findById(request.localDeviceId)
            .orElseThrow { IllegalArgumentException("Local device not found") }
        tunnel.remoteDevice = request.remoteDeviceId?.let {
            deviceRepository.findById(it).orElseThrow { IllegalArgumentException("Remote device not found") }
        }
        tunnel.localSubnets = resolveSubnets(request.localSubnetIds)
        tunnel.remoteSubnets = resolveSubnets(request.remoteSubnetIds)
        tunnel.ikeVersion = request.ikeVersion
        tunnel.encryption = request.encryption
        tunnel.hash = request.hash
        tunnel.dhGroup = request.dhGroup
        tunnel.secretRef = request.secretRef?.ifBlank { null }

        return vpnTunnelRepository.save(tunnel).toDto()
    }

    @Transactional
    fun deleteTunnel(id: UUID) {
        if (!vpnTunnelRepository.existsById(id)) {
            throw IllegalArgumentException("VPN tunnel not found")
        }
        vpnTunnelRepository.deleteById(id)
    }

    private fun resolveSubnets(ids: List<UUID>): MutableSet<Subnet> =
        ids.map { id ->
            subnetRepository.findById(id).orElseThrow { IllegalArgumentException("Subnet not found: $id") }
        }.toMutableSet()

    private fun VpnTunnel.toDto() = VpnTunnelDto(
        id = this.id!!,
        name = this.name,
        type = this.type,
        status = this.status,
        tenantId = this.tenant.id!!,
        tenantName = this.tenant.name,
        localDeviceId = this.localDevice.id!!,
        localDeviceName = this.localDevice.name,
        remoteDeviceId = this.remoteDevice?.id,
        remoteDeviceName = this.remoteDevice?.name,
        localSubnets = this.localSubnets.map { SubnetRefDto(it.id!!, it.cidr) },
        remoteSubnets = this.remoteSubnets.map { SubnetRefDto(it.id!!, it.cidr) },
        ikeVersion = this.ikeVersion,
        encryption = this.encryption,
        hash = this.hash,
        dhGroup = this.dhGroup,
        secretRef = this.secretRef
    )
}
```

`VpnTunnelController.kt`:

```kotlin
package com.msp.doku.controller

import com.msp.doku.dto.CreateVpnTunnelRequest
import com.msp.doku.dto.VpnTunnelDto
import com.msp.doku.service.VpnTunnelService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/vpn-tunnels")
class VpnTunnelController(
    private val vpnTunnelService: VpnTunnelService
) {

    @GetMapping
    fun getTunnels(@RequestParam(required = false) tenantId: UUID?): List<VpnTunnelDto> {
        return vpnTunnelService.getTunnels(tenantId)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createTunnel(@RequestBody request: CreateVpnTunnelRequest): VpnTunnelDto {
        return vpnTunnelService.createTunnel(request)
    }

    @PutMapping("/{id}")
    fun updateTunnel(@PathVariable id: UUID, @RequestBody request: CreateVpnTunnelRequest): VpnTunnelDto {
        return vpnTunnelService.updateTunnel(id, request)
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteTunnel(@PathVariable id: UUID) {
        vpnTunnelService.deleteTunnel(id)
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && ./gradlew test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(backend): VPN tunnel CRUD API with structured IKE fields"
```

---

### Task 6: Notes & custom fields API

**Files:**
- Create: `backend/src/main/kotlin/com/msp/doku/dto/DocDtos.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/service/DocService.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/controller/DocController.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/service/DeviceService.kt` (cleanup on delete)
- Modify: `backend/src/main/kotlin/com/msp/doku/service/NetworkService.kt` (cleanup on IP delete)
- Modify: `backend/src/main/kotlin/com/msp/doku/service/VpnTunnelService.kt` (cleanup on tunnel delete)
- Modify: `backend/src/main/kotlin/com/msp/doku/service/TenantService.kt` (cleanup on tenant delete)
- Test: `backend/src/test/kotlin/com/msp/doku/service/DocServiceTest.kt`

**Interfaces:**
- Consumes: Task 1 `Note`, `CustomField`, `DocEntityType`, `FieldType`, `NoteRepository`, `CustomFieldRepository`.
- Produces:
  - `NoteDto(id, title, contentMarkdown, entityType: DocEntityType, entityId, updatedAt: Instant?)`
  - `CreateNoteRequest(title, contentMarkdown, entityType, entityId)`, `UpdateNoteRequest(title, contentMarkdown)`
  - `CustomFieldDto(id, name, value, fieldType: FieldType, entityType, entityId)`
  - `CreateCustomFieldRequest(name, value, fieldType: FieldType = TEXT, entityType, entityId)`, `UpdateCustomFieldRequest(value, fieldType: FieldType = TEXT)`
  - `DocService`: `getNotes(entityType, entityId)`, `createNote(request)`, `updateNote(id, request)`, `deleteNote(id)`, `getCustomFields(entityType, entityId)`, `createCustomField(request)`, `updateCustomField(id, request)`, `deleteCustomField(id)`, `deleteAllForEntity(entityType: DocEntityType, entityId: UUID)`
  - Endpoints: `GET/POST /api/v1/notes` (GET with `?entityType=&entityId=`), `PUT/DELETE /api/v1/notes/{id}`, same shape under `/api/v1/custom-fields`

- [ ] **Step 1: Write the failing test**

`backend/src/test/kotlin/com/msp/doku/service/DocServiceTest.kt`:

```kotlin
package com.msp.doku.service

import com.msp.doku.domain.CustomField
import com.msp.doku.domain.DocEntityType
import com.msp.doku.domain.FieldType
import com.msp.doku.domain.Note
import com.msp.doku.dto.CreateCustomFieldRequest
import com.msp.doku.dto.CreateNoteRequest
import com.msp.doku.repository.CustomFieldRepository
import com.msp.doku.repository.NoteRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.util.UUID

class DocServiceTest {

    private val noteRepository: NoteRepository = mock()
    private val customFieldRepository: CustomFieldRepository = mock()

    private val service = DocService(noteRepository, customFieldRepository)

    @Test
    fun `createNote persists and maps`() {
        val deviceId = UUID.randomUUID()
        whenever(noteRepository.save(any<Note>())).thenAnswer { inv ->
            (inv.arguments[0] as Note).apply { id = UUID.randomUUID() }
        }

        val dto = service.createNote(
            CreateNoteRequest(
                title = "Failover Runbook",
                contentMarkdown = "## Schritte\n1. HA-Status prüfen",
                entityType = DocEntityType.DEVICE,
                entityId = deviceId
            )
        )

        assertEquals("Failover Runbook", dto.title)
        assertEquals(DocEntityType.DEVICE, dto.entityType)
        assertEquals(deviceId, dto.entityId)
    }

    @Test
    fun `createCustomField rejects duplicate name per entity`() {
        val entityId = UUID.randomUUID()
        whenever(
            customFieldRepository.existsByEntityTypeAndEntityIdAndName(DocEntityType.DEVICE, entityId, "Supportvertrag")
        ).thenReturn(true)

        assertThrows<IllegalArgumentException> {
            service.createCustomField(
                CreateCustomFieldRequest(
                    name = "Supportvertrag", value = "FC-2026-042",
                    fieldType = FieldType.TEXT,
                    entityType = DocEntityType.DEVICE, entityId = entityId
                )
            )
        }
    }

    @Test
    fun `deleteAllForEntity removes notes and custom fields`() {
        val entityId = UUID.randomUUID()

        service.deleteAllForEntity(DocEntityType.VPN_TUNNEL, entityId)

        verify(noteRepository).deleteByEntityTypeAndEntityId(DocEntityType.VPN_TUNNEL, entityId)
        verify(customFieldRepository).deleteByEntityTypeAndEntityId(DocEntityType.VPN_TUNNEL, entityId)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests "com.msp.doku.service.DocServiceTest"`
Expected: COMPILATION FAILURE.

- [ ] **Step 3: Implement**

`DocDtos.kt`:

```kotlin
package com.msp.doku.dto

import com.msp.doku.domain.DocEntityType
import com.msp.doku.domain.FieldType
import java.time.Instant
import java.util.UUID

data class NoteDto(
    val id: UUID,
    val title: String,
    val contentMarkdown: String,
    val entityType: DocEntityType,
    val entityId: UUID,
    val updatedAt: Instant?
)

data class CreateNoteRequest(
    val title: String,
    val contentMarkdown: String,
    val entityType: DocEntityType,
    val entityId: UUID
)

data class UpdateNoteRequest(
    val title: String,
    val contentMarkdown: String
)

data class CustomFieldDto(
    val id: UUID,
    val name: String,
    val value: String,
    val fieldType: FieldType,
    val entityType: DocEntityType,
    val entityId: UUID
)

data class CreateCustomFieldRequest(
    val name: String,
    val value: String,
    val fieldType: FieldType = FieldType.TEXT,
    val entityType: DocEntityType,
    val entityId: UUID
)

data class UpdateCustomFieldRequest(
    val value: String,
    val fieldType: FieldType = FieldType.TEXT
)
```

`DocService.kt`:

```kotlin
package com.msp.doku.service

import com.msp.doku.domain.CustomField
import com.msp.doku.domain.DocEntityType
import com.msp.doku.domain.Note
import com.msp.doku.dto.CreateCustomFieldRequest
import com.msp.doku.dto.CreateNoteRequest
import com.msp.doku.dto.CustomFieldDto
import com.msp.doku.dto.NoteDto
import com.msp.doku.dto.UpdateCustomFieldRequest
import com.msp.doku.dto.UpdateNoteRequest
import com.msp.doku.repository.CustomFieldRepository
import com.msp.doku.repository.NoteRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class DocService(
    private val noteRepository: NoteRepository,
    private val customFieldRepository: CustomFieldRepository
) {

    fun getNotes(entityType: DocEntityType, entityId: UUID): List<NoteDto> =
        noteRepository.findByEntityTypeAndEntityIdOrderByUpdatedAtDesc(entityType, entityId).map { it.toDto() }

    @Transactional
    fun createNote(request: CreateNoteRequest): NoteDto {
        val note = Note(
            title = request.title,
            contentMarkdown = request.contentMarkdown,
            entityType = request.entityType,
            entityId = request.entityId
        )
        return noteRepository.save(note).toDto()
    }

    @Transactional
    fun updateNote(id: UUID, request: UpdateNoteRequest): NoteDto {
        val note = noteRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Note not found") }
        note.title = request.title
        note.contentMarkdown = request.contentMarkdown
        return noteRepository.save(note).toDto()
    }

    @Transactional
    fun deleteNote(id: UUID) {
        if (!noteRepository.existsById(id)) throw IllegalArgumentException("Note not found")
        noteRepository.deleteById(id)
    }

    fun getCustomFields(entityType: DocEntityType, entityId: UUID): List<CustomFieldDto> =
        customFieldRepository.findByEntityTypeAndEntityIdOrderByName(entityType, entityId).map { it.toDto() }

    @Transactional
    fun createCustomField(request: CreateCustomFieldRequest): CustomFieldDto {
        if (customFieldRepository.existsByEntityTypeAndEntityIdAndName(request.entityType, request.entityId, request.name)) {
            throw IllegalArgumentException("Feld '${request.name}' existiert bereits für dieses Objekt")
        }
        val field = CustomField(
            name = request.name,
            value = request.value,
            fieldType = request.fieldType,
            entityType = request.entityType,
            entityId = request.entityId
        )
        return customFieldRepository.save(field).toDto()
    }

    @Transactional
    fun updateCustomField(id: UUID, request: UpdateCustomFieldRequest): CustomFieldDto {
        val field = customFieldRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Custom field not found") }
        field.value = request.value
        field.fieldType = request.fieldType
        return customFieldRepository.save(field).toDto()
    }

    @Transactional
    fun deleteCustomField(id: UUID) {
        if (!customFieldRepository.existsById(id)) throw IllegalArgumentException("Custom field not found")
        customFieldRepository.deleteById(id)
    }

    @Transactional
    fun deleteAllForEntity(entityType: DocEntityType, entityId: UUID) {
        noteRepository.deleteByEntityTypeAndEntityId(entityType, entityId)
        customFieldRepository.deleteByEntityTypeAndEntityId(entityType, entityId)
    }

    private fun Note.toDto() = NoteDto(
        id = this.id!!,
        title = this.title,
        contentMarkdown = this.contentMarkdown,
        entityType = this.entityType,
        entityId = this.entityId,
        updatedAt = this.updatedAt
    )

    private fun CustomField.toDto() = CustomFieldDto(
        id = this.id!!,
        name = this.name,
        value = this.value,
        fieldType = this.fieldType,
        entityType = this.entityType,
        entityId = this.entityId
    )
}
```

`DocController.kt`:

```kotlin
package com.msp.doku.controller

import com.msp.doku.domain.DocEntityType
import com.msp.doku.dto.CreateCustomFieldRequest
import com.msp.doku.dto.CreateNoteRequest
import com.msp.doku.dto.CustomFieldDto
import com.msp.doku.dto.NoteDto
import com.msp.doku.dto.UpdateCustomFieldRequest
import com.msp.doku.dto.UpdateNoteRequest
import com.msp.doku.service.DocService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1")
class DocController(
    private val docService: DocService
) {

    @GetMapping("/notes")
    fun getNotes(@RequestParam entityType: DocEntityType, @RequestParam entityId: UUID): List<NoteDto> =
        docService.getNotes(entityType, entityId)

    @PostMapping("/notes")
    @ResponseStatus(HttpStatus.CREATED)
    fun createNote(@RequestBody request: CreateNoteRequest): NoteDto = docService.createNote(request)

    @PutMapping("/notes/{id}")
    fun updateNote(@PathVariable id: UUID, @RequestBody request: UpdateNoteRequest): NoteDto =
        docService.updateNote(id, request)

    @DeleteMapping("/notes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteNote(@PathVariable id: UUID) = docService.deleteNote(id)

    @GetMapping("/custom-fields")
    fun getCustomFields(@RequestParam entityType: DocEntityType, @RequestParam entityId: UUID): List<CustomFieldDto> =
        docService.getCustomFields(entityType, entityId)

    @PostMapping("/custom-fields")
    @ResponseStatus(HttpStatus.CREATED)
    fun createCustomField(@RequestBody request: CreateCustomFieldRequest): CustomFieldDto =
        docService.createCustomField(request)

    @PutMapping("/custom-fields/{id}")
    fun updateCustomField(@PathVariable id: UUID, @RequestBody request: UpdateCustomFieldRequest): CustomFieldDto =
        docService.updateCustomField(id, request)

    @DeleteMapping("/custom-fields/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteCustomField(@PathVariable id: UUID) = docService.deleteCustomField(id)
}
```

Cleanup wiring (constructor-inject `docService: DocService` into each service):
- `DeviceService.deleteDevice`: before `deviceRepository.deleteById(id)` add `docService.deleteAllForEntity(DocEntityType.DEVICE, id)` (import `com.msp.doku.domain.DocEntityType`).
- `NetworkService.deleteIpAddress`: before `ipAddressRepository.deleteById(id)` add `docService.deleteAllForEntity(DocEntityType.IP_ADDRESS, id)`.
- `VpnTunnelService.deleteTunnel`: before `vpnTunnelRepository.deleteById(id)` add `docService.deleteAllForEntity(DocEntityType.VPN_TUNNEL, id)`.
- `TenantService.deleteTenant`: before `tenantRepository.delete(tenant)` add `docService.deleteAllForEntity(DocEntityType.TENANT, id)`.

Update the affected test constructors (`TenantServiceTest`, `NetworkServiceTest`, `VpnTunnelServiceTest`) to pass an additional `mock<DocService>()` argument (declare `private val docService: DocService = mock()` and append it to the service constructor call).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && ./gradlew test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(backend): polymorphic notes and custom fields with cascade cleanup"
```

---

### Task 7: Provided-resources aggregation

**Files:**
- Create: `backend/src/main/kotlin/com/msp/doku/dto/ProvidedResourcesDto.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/service/ProvidedResourcesService.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/controller/TenantController.kt`
- Test: `backend/src/test/kotlin/com/msp/doku/service/ProvidedResourcesServiceTest.kt`

**Interfaces:**
- Consumes: `findByAssignedTenantId` on the four repos (Task 1), `VpnTunnelRepository.findByTenantId`, `VpnTunnelService`-style mapping (re-map inline here), Task 5 `VpnTunnelDto`/`SubnetRefDto`.
- Produces:
  - `ProvidedIpDto(id, address, usage: String?, subnetCidr: String, isPublic: Boolean)`
  - `ProvidedVlanDto(id, vlanTag: Int, name: String?, ownerTenantName: String)`
  - `ProvidedSubnetDto(id, cidr, description: String?, ownerTenantName: String)`
  - `ProvidedDeviceDto(id, name, model: String?, deviceType: DeviceType)`
  - `ProvidedResourcesDto(publicIps: List<ProvidedIpDto>, vlans: List<ProvidedVlanDto>, subnets: List<ProvidedSubnetDto>, devices: List<ProvidedDeviceDto>, vpnTunnels: List<VpnTunnelDto>)`
  - `ProvidedResourcesService.getProvidedResources(tenantId: UUID): ProvidedResourcesDto`
  - `GET /api/v1/tenants/{id}/provided-resources`

- [ ] **Step 1: Write the failing test**

`backend/src/test/kotlin/com/msp/doku/service/ProvidedResourcesServiceTest.kt`:

```kotlin
package com.msp.doku.service

import com.msp.doku.domain.Device
import com.msp.doku.domain.DeviceType
import com.msp.doku.domain.IpAddress
import com.msp.doku.domain.Subnet
import com.msp.doku.domain.Tenant
import com.msp.doku.domain.TenantType
import com.msp.doku.domain.TunnelType
import com.msp.doku.domain.Vlan
import com.msp.doku.domain.VpnTunnel
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.VlanRepository
import com.msp.doku.repository.VpnTunnelRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import java.util.UUID

class ProvidedResourcesServiceTest {

    private val vlanRepository: VlanRepository = mock()
    private val subnetRepository: SubnetRepository = mock()
    private val ipAddressRepository: IpAddressRepository = mock()
    private val deviceRepository: DeviceRepository = mock()
    private val vpnTunnelRepository: VpnTunnelRepository = mock()

    private val service = ProvidedResourcesService(
        vlanRepository, subnetRepository, ipAddressRepository, deviceRepository, vpnTunnelRepository
    )

    @Test
    fun `aggregates all resource kinds assigned to a tenant`() {
        val msp = Tenant(name = "iGeeks", identifier = "igeeks", type = TenantType.MSP)
            .apply { id = UUID.randomUUID() }
        val customer = Tenant(name = "Kunde", identifier = "kunde").apply { id = UUID.randomUUID() }
        val customerId = customer.id!!

        val publicSubnet = Subnet(tenant = msp, cidr = "203.0.113.0/24", isPublic = true)
            .apply { id = UUID.randomUUID() }
        val firewall = Device(name = "DC-FW-01", deviceType = DeviceType.FIREWALL).apply { id = UUID.randomUUID() }

        whenever(vlanRepository.findByAssignedTenantId(customerId)).thenReturn(
            listOf(Vlan(vlanId = 110, name = "Kunde-VLAN", tenant = msp, assignedTenant = customer)
                .apply { id = UUID.randomUUID() })
        )
        whenever(subnetRepository.findByAssignedTenantId(customerId)).thenReturn(emptyList())
        whenever(ipAddressRepository.findByAssignedTenantId(customerId)).thenReturn(
            listOf(IpAddress(subnet = publicSubnet, address = "203.0.113.10", description = "Firewall WAN1",
                assignedTenant = customer).apply { id = UUID.randomUUID() })
        )
        whenever(deviceRepository.findByAssignedTenantId(customerId)).thenReturn(
            listOf(Device(name = "Cloud-SRV-01", deviceType = DeviceType.SERVER, model = "Dell R660",
                assignedTenant = customer).apply { id = UUID.randomUUID() })
        )
        whenever(vpnTunnelRepository.findByTenantId(customerId)).thenReturn(
            listOf(VpnTunnel(name = "S2S HQ", type = TunnelType.IPSEC_S2S, tenant = customer,
                localDevice = firewall).apply { id = UUID.randomUUID() })
        )

        val result = service.getProvidedResources(customerId)

        assertEquals(1, result.vlans.size)
        assertEquals(110, result.vlans[0].vlanTag)
        assertEquals("iGeeks", result.vlans[0].ownerTenantName)
        assertEquals(1, result.publicIps.size)
        assertEquals("Firewall WAN1", result.publicIps[0].usage)
        assertEquals("203.0.113.0/24", result.publicIps[0].subnetCidr)
        assertEquals(0, result.subnets.size)
        assertEquals(1, result.devices.size)
        assertEquals(1, result.vpnTunnels.size)
        assertEquals("DC-FW-01", result.vpnTunnels[0].localDeviceName)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests "com.msp.doku.service.ProvidedResourcesServiceTest"`
Expected: COMPILATION FAILURE.

- [ ] **Step 3: Implement**

`ProvidedResourcesDto.kt`:

```kotlin
package com.msp.doku.dto

import com.msp.doku.domain.DeviceType
import java.util.UUID

data class ProvidedIpDto(
    val id: UUID,
    val address: String,
    val usage: String?,
    val subnetCidr: String,
    val isPublic: Boolean
)

data class ProvidedVlanDto(
    val id: UUID,
    val vlanTag: Int,
    val name: String?,
    val ownerTenantName: String
)

data class ProvidedSubnetDto(
    val id: UUID,
    val cidr: String,
    val description: String?,
    val ownerTenantName: String
)

data class ProvidedDeviceDto(
    val id: UUID,
    val name: String,
    val model: String?,
    val deviceType: DeviceType
)

data class ProvidedResourcesDto(
    val publicIps: List<ProvidedIpDto>,
    val vlans: List<ProvidedVlanDto>,
    val subnets: List<ProvidedSubnetDto>,
    val devices: List<ProvidedDeviceDto>,
    val vpnTunnels: List<VpnTunnelDto>
)
```

`ProvidedResourcesService.kt`:

```kotlin
package com.msp.doku.service

import com.msp.doku.dto.ProvidedDeviceDto
import com.msp.doku.dto.ProvidedIpDto
import com.msp.doku.dto.ProvidedResourcesDto
import com.msp.doku.dto.ProvidedSubnetDto
import com.msp.doku.dto.ProvidedVlanDto
import com.msp.doku.dto.SubnetRefDto
import com.msp.doku.dto.VpnTunnelDto
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.VlanRepository
import com.msp.doku.repository.VpnTunnelRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class ProvidedResourcesService(
    private val vlanRepository: VlanRepository,
    private val subnetRepository: SubnetRepository,
    private val ipAddressRepository: IpAddressRepository,
    private val deviceRepository: DeviceRepository,
    private val vpnTunnelRepository: VpnTunnelRepository
) {

    @Transactional(readOnly = true)
    fun getProvidedResources(tenantId: UUID): ProvidedResourcesDto {
        return ProvidedResourcesDto(
            publicIps = ipAddressRepository.findByAssignedTenantId(tenantId).map {
                ProvidedIpDto(
                    id = it.id!!,
                    address = it.address,
                    usage = it.description,
                    subnetCidr = it.subnet.cidr,
                    isPublic = it.subnet.isPublic
                )
            },
            vlans = vlanRepository.findByAssignedTenantId(tenantId).map {
                ProvidedVlanDto(
                    id = it.id!!,
                    vlanTag = it.vlanId,
                    name = it.name,
                    ownerTenantName = it.tenant.name
                )
            },
            subnets = subnetRepository.findByAssignedTenantId(tenantId).map {
                ProvidedSubnetDto(
                    id = it.id!!,
                    cidr = it.cidr,
                    description = it.description,
                    ownerTenantName = it.tenant.name
                )
            },
            devices = deviceRepository.findByAssignedTenantId(tenantId).map {
                ProvidedDeviceDto(
                    id = it.id!!,
                    name = it.name,
                    model = it.model,
                    deviceType = it.deviceType
                )
            },
            vpnTunnels = vpnTunnelRepository.findByTenantId(tenantId).map { t ->
                VpnTunnelDto(
                    id = t.id!!,
                    name = t.name,
                    type = t.type,
                    status = t.status,
                    tenantId = t.tenant.id!!,
                    tenantName = t.tenant.name,
                    localDeviceId = t.localDevice.id!!,
                    localDeviceName = t.localDevice.name,
                    remoteDeviceId = t.remoteDevice?.id,
                    remoteDeviceName = t.remoteDevice?.name,
                    localSubnets = t.localSubnets.map { SubnetRefDto(it.id!!, it.cidr) },
                    remoteSubnets = t.remoteSubnets.map { SubnetRefDto(it.id!!, it.cidr) },
                    ikeVersion = t.ikeVersion,
                    encryption = t.encryption,
                    hash = t.hash,
                    dhGroup = t.dhGroup,
                    secretRef = t.secretRef
                )
            }
        )
    }
}
```

`TenantController.kt` — inject `providedResourcesService: ProvidedResourcesService` as a second constructor parameter and add:

```kotlin
    @GetMapping("/{id}/provided-resources")
    fun getProvidedResources(@PathVariable id: UUID): ProvidedResourcesDto {
        return providedResourcesService.getProvidedResources(id)
    }
```

(imports: `com.msp.doku.dto.ProvidedResourcesDto`, `com.msp.doku.service.ProvidedResourcesService`, `org.springframework.web.bind.annotation.GetMapping` already present)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && ./gradlew test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(backend): provided-resources aggregation per tenant"
```

---

### Task 8: Seed MSP tenant and shared infrastructure

**Files:**
- Modify: `backend/src/main/kotlin/com/msp/doku/config/DataSeeder.kt`

**Interfaces:**
- Consumes: all Task 1 entities/repositories.
- Produces: seeded MSP tenant `identifier = "igeeks"` with DC site/room/rack, DC firewall, hosted server assigned to the default customer, public `/24` and `/28` subnets with assigned IPs, one customer VLAN, one IPsec tunnel, one note, one custom field.

- [ ] **Step 1: Extend the seeder**

Add constructor parameters to `DataSeeder`:

```kotlin
    private val subnetRepository: SubnetRepository,
    private val ipAddressRepository: IpAddressRepository,
    private val vlanRepository: VlanRepository,
    private val vpnTunnelRepository: VpnTunnelRepository,
    private val noteRepository: NoteRepository,
    private val customFieldRepository: CustomFieldRepository
```

(imports: `com.msp.doku.repository.SubnetRepository`, `IpAddressRepository`, `VlanRepository`, `VpnTunnelRepository`, `NoteRepository`, `CustomFieldRepository`)

Replace the early-return guard `if (deviceRepository.count() > 0) return` with a named method split: keep the existing seeding block in a private method `seedCustomerDemo()` guarded by `if (deviceRepository.count() > 0) return` becoming `if (tenantRepository.findByIdentifier("default") == null) { ...existing body... }` — simplest correct restructure:

```kotlin
    @Transactional
    override fun run(vararg args: String?) {
        val customer = seedCustomerDemo()
        seedMspInfra(customer)
    }

    private fun seedCustomerDemo(): Tenant {
        val existing = tenantRepository.findByIdentifier("default")
        if (existing != null) return existing

        println("Seeding initial data...")
        val tenant = tenantRepository.save(Tenant(name = "Default Tenant", identifier = "default"))
        // ... existing site/room/rack/devices body unchanged, using `tenant` ...
        return tenant
    }
```

Then add:

```kotlin
    private fun seedMspInfra(customer: Tenant) {
        if (tenantRepository.findByIdentifier("igeeks") != null) return

        println("Seeding MSP infrastructure...")
        val msp = tenantRepository.save(Tenant(name = "iGeeks (MSP)", identifier = "igeeks", type = TenantType.MSP))

        val dcSite = siteRepository.save(Site(name = "Datacenter Zürich", address = "Colo Park 1, 8005 Zürich", tenant = msp))
        val dcRoom = roomRepository.save(Room(name = "Colo Cage 4", floor = "EG", site = dcSite))
        val dcRack = rackRepository.save(Rack(name = "DC-Rack-01", heightUnits = 47, room = dcRoom))

        val dcFirewall = deviceRepository.save(
            Device(
                name = "DC-FW-01", deviceType = DeviceType.FIREWALL, model = "Fortinet FortiGate 200F",
                serialNumber = "FGT-2025-1001", managementIp = "172.16.0.1",
                rack = dcRack, positionU = 45, heightU = 1
            )
        )
        deviceRepository.save(
            Device(
                name = "Cloud-SRV-Default", deviceType = DeviceType.SERVER, model = "Dell PowerEdge R660",
                serialNumber = "SRV-2025-2001", managementIp = "172.16.10.20",
                rack = dcRack, positionU = 20, heightU = 1,
                assignedTenant = customer
            )
        )

        val primaryBlock = subnetRepository.save(
            Subnet(tenant = msp, cidr = "203.0.113.0/24", description = "Primary Public Block", isPublic = true)
        )
        val secondaryBlock = subnetRepository.save(
            Subnet(tenant = msp, cidr = "198.51.100.0/28", description = "Secondary Block", isPublic = true)
        )
        ipAddressRepository.saveAll(
            listOf(
                IpAddress(subnet = primaryBlock, address = "203.0.113.1", status = "reserved", description = "Gateway"),
                IpAddress(subnet = primaryBlock, address = "203.0.113.10", status = "active",
                    description = "Firewall WAN1", assignedTenant = customer),
                IpAddress(subnet = primaryBlock, address = "203.0.113.11", status = "active",
                    description = "Mail Gateway", assignedTenant = customer),
                IpAddress(subnet = secondaryBlock, address = "198.51.100.1", status = "active",
                    description = "VPN Gateway", assignedTenant = customer)
            )
        )

        vlanRepository.save(Vlan(vlanId = 110, name = "Default-Kunde", tenant = msp, assignedTenant = customer))

        val tunnel = vpnTunnelRepository.save(
            VpnTunnel(
                name = "S2S Default HQ", type = TunnelType.IPSEC_S2S, tenant = customer,
                localDevice = dcFirewall,
                ikeVersion = IkeVersion.IKEV2, encryption = EncryptionAlgorithm.AES_256,
                hash = HashAlgorithm.SHA256, dhGroup = 14,
                secretRef = "Bitwarden: vpn-default-psk"
            )
        )

        noteRepository.save(
            Note(
                title = "Failover Runbook DC-FW-01",
                contentMarkdown = "## HA-Failover\n\n1. HA-Status prüfen (`get system ha status`)\n2. Failover auslösen\n3. Tunnel-Status kontrollieren",
                entityType = DocEntityType.DEVICE, entityId = dcFirewall.id!!
            )
        )
        customFieldRepository.save(
            CustomField(
                name = "Supportvertrag", value = "FC-2026-042", fieldType = FieldType.TEXT,
                entityType = DocEntityType.DEVICE, entityId = dcFirewall.id!!
            )
        )
        println("Seeded MSP tenant with DC infra, public ranges and tunnel ${tunnel.name}.")
    }
```

- [ ] **Step 2: Verify by booting against a fresh DB**

Run (from repo root):
```bash
docker compose down -v && docker compose up -d postgres && sleep 5 && cd backend && ./gradlew bootRun
```
Expected: startup logs include `Seeding initial data...` and `Seeding MSP infrastructure...`; no exceptions. Then verify with `curl -s http://localhost:8080/api/v1/tenants | grep igeeks` → returns the MSP tenant. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add backend
git commit -m "feat(backend): seed MSP tenant with DC infrastructure, public ranges, tunnel and docs"
```

---

### Task 9: Frontend services & types

**Files:**
- Modify: `frontend/src/services/TenantService.ts`
- Create: `frontend/src/services/ProviderService.ts`
- Create: `frontend/src/services/VpnTunnelService.ts`
- Create: `frontend/src/services/DocService.ts`
- Modify: `frontend/src/services/NetworkService.ts`
- Modify: `frontend/package.json` (react-markdown)

**Interfaces:**
- Consumes: backend endpoints from Tasks 2–7.
- Produces (exact exported names used by Tasks 10–14):
  - `TenantService.Tenant.type: 'MSP' | 'CUSTOMER'`; `TenantService.delete(id)`
  - `NetworkService.Subnet` gains `isPublic: boolean; assignedTenantId?: string; assignedTenantName?: string`; `IpAddress` gains `assignedTenantId?: string; assignedTenantName?: string`; `CreateSubnetRequest` gains `isPublic?: boolean`; new method `NetworkService.getPublicSubnets(): Promise<Subnet[]>`
  - `ProviderService.setAssignment(entityType: AssignableEntityType, id: string, assignedTenantId: string | null)`, `ProviderService.getProvidedResources(tenantId: string): Promise<ProvidedResources>` with `AssignableEntityType = 'vlans' | 'subnets' | 'ips' | 'devices'`
  - `VpnTunnelService.getByTenant(tenantId)`, `.getAll()`, `.create(data: CreateVpnTunnelRequest)`, `.update(id, data)`, `.delete(id)`; types `VpnTunnel`, `CreateVpnTunnelRequest`
  - `DocService.getNotes(entityType, entityId)`, `.createNote`, `.updateNote`, `.deleteNote`, `.getCustomFields`, `.createCustomField`, `.updateCustomField`, `.deleteCustomField`; types `Note`, `CustomField`, `DocEntityType`

- [ ] **Step 1: Install react-markdown**

Run: `cd frontend && npm install react-markdown`
Expected: added to `package.json` dependencies.

- [ ] **Step 2: Update `TenantService.ts`**

Replace the interfaces and service object:

```typescript
export type TenantType = 'MSP' | 'CUSTOMER';

export interface Tenant {
    id: string;
    name: string;
    identifier: string;
    type: TenantType;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateTenantRequest {
    name: string;
    identifier: string;
    type?: TenantType;
}
```

and add to the `TenantService` object:

```typescript
    delete: (id: string) => apiFetch<void>(`/tenants/${id}`, { method: 'DELETE' }),
```

Also make `apiFetch` tolerate 204 responses (copy the `if (response.status === 204) return {} as T;` guard from `DeviceService.ts` before `response.json()`).

- [ ] **Step 3: Update `NetworkService.ts`**

Add to `Subnet` interface:

```typescript
    isPublic: boolean;
    assignedTenantId?: string;
    assignedTenantName?: string;
```

Add to `IpAddress` interface:

```typescript
    assignedTenantId?: string;
    assignedTenantName?: string;
```

Add to `CreateSubnetRequest` interface:

```typescript
    isPublic?: boolean;
```

Add to the `NetworkService` object:

```typescript
    getPublicSubnets: () => apiFetch<Subnet[]>('/network/public-subnets'),
```

- [ ] **Step 4: Create `ProviderService.ts`**

```typescript
import type { VpnTunnel } from './VpnTunnelService';

export type AssignableEntityType = 'vlans' | 'subnets' | 'ips' | 'devices';

export interface AssignmentResponse {
    id: string;
    assignedTenantId: string | null;
    assignedTenantName: string | null;
}

export interface ProvidedIp {
    id: string;
    address: string;
    usage?: string;
    subnetCidr: string;
    isPublic: boolean;
}

export interface ProvidedVlan {
    id: string;
    vlanTag: number;
    name?: string;
    ownerTenantName: string;
}

export interface ProvidedSubnet {
    id: string;
    cidr: string;
    description?: string;
    ownerTenantName: string;
}

export interface ProvidedDevice {
    id: string;
    name: string;
    model?: string;
    deviceType: string;
}

export interface ProvidedResources {
    publicIps: ProvidedIp[];
    vlans: ProvidedVlan[];
    subnets: ProvidedSubnet[];
    devices: ProvidedDevice[];
    vpnTunnels: VpnTunnel[];
}

const API_BASE_URL = '/api/v1';

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error: ${response.status} - ${text}`);
    }
    if (response.status === 204) return {} as T;
    return response.json();
}

export const ProviderService = {
    setAssignment: (entityType: AssignableEntityType, id: string, assignedTenantId: string | null) =>
        apiFetch<AssignmentResponse>(`/assignments/${entityType}/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ assignedTenantId }),
        }),

    getProvidedResources: (tenantId: string) =>
        apiFetch<ProvidedResources>(`/tenants/${tenantId}/provided-resources`),
};
```

- [ ] **Step 5: Create `VpnTunnelService.ts`**

```typescript
export type TunnelType = 'IPSEC_S2S' | 'SSL_VPN' | 'WIREGUARD' | 'OTHER';
export type TunnelStatus = 'ACTIVE' | 'PLANNED' | 'DISABLED';
export type IkeVersion = 'IKEV1' | 'IKEV2';
export type EncryptionAlgorithm = 'AES_128' | 'AES_256' | 'TRIPLE_DES' | 'CHACHA20';
export type HashAlgorithm = 'SHA1' | 'SHA256' | 'SHA512';

export interface SubnetRef {
    id: string;
    cidr: string;
}

export interface VpnTunnel {
    id: string;
    name: string;
    type: TunnelType;
    status: TunnelStatus;
    tenantId: string;
    tenantName: string;
    localDeviceId: string;
    localDeviceName: string;
    remoteDeviceId?: string;
    remoteDeviceName?: string;
    localSubnets: SubnetRef[];
    remoteSubnets: SubnetRef[];
    ikeVersion?: IkeVersion;
    encryption?: EncryptionAlgorithm;
    hash?: HashAlgorithm;
    dhGroup?: number;
    secretRef?: string;
}

export interface CreateVpnTunnelRequest {
    name: string;
    type: TunnelType;
    status?: TunnelStatus;
    tenantId: string;
    localDeviceId: string;
    remoteDeviceId?: string;
    localSubnetIds?: string[];
    remoteSubnetIds?: string[];
    ikeVersion?: IkeVersion;
    encryption?: EncryptionAlgorithm;
    hash?: HashAlgorithm;
    dhGroup?: number;
    secretRef?: string;
}

const API_BASE_URL = '/api/v1/vpn-tunnels';

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error: ${response.status} - ${text}`);
    }
    if (response.status === 204) return {} as T;
    return response.json();
}

export const VpnTunnelService = {
    getAll: () => apiFetch<VpnTunnel[]>(''),
    getByTenant: (tenantId: string) => apiFetch<VpnTunnel[]>(`?tenantId=${tenantId}`),
    create: (data: CreateVpnTunnelRequest) => apiFetch<VpnTunnel>('', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: CreateVpnTunnelRequest) =>
        apiFetch<VpnTunnel>(`/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<void>(`/${id}`, { method: 'DELETE' }),
};
```

- [ ] **Step 6: Create `DocService.ts`**

```typescript
export type DocEntityType =
    | 'TENANT' | 'SITE' | 'ROOM' | 'RACK' | 'DEVICE'
    | 'VLAN' | 'SUBNET' | 'IP_ADDRESS' | 'VPN_TUNNEL';

export type FieldType = 'TEXT' | 'NUMBER' | 'URL' | 'DATE';

export interface Note {
    id: string;
    title: string;
    contentMarkdown: string;
    entityType: DocEntityType;
    entityId: string;
    updatedAt?: string;
}

export interface CustomField {
    id: string;
    name: string;
    value: string;
    fieldType: FieldType;
    entityType: DocEntityType;
    entityId: string;
}

const API_BASE_URL = '/api/v1';

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error: ${response.status} - ${text}`);
    }
    if (response.status === 204) return {} as T;
    return response.json();
}

export const DocService = {
    getNotes: (entityType: DocEntityType, entityId: string) =>
        apiFetch<Note[]>(`/notes?entityType=${entityType}&entityId=${entityId}`),
    createNote: (data: { title: string; contentMarkdown: string; entityType: DocEntityType; entityId: string }) =>
        apiFetch<Note>('/notes', { method: 'POST', body: JSON.stringify(data) }),
    updateNote: (id: string, data: { title: string; contentMarkdown: string }) =>
        apiFetch<Note>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteNote: (id: string) => apiFetch<void>(`/notes/${id}`, { method: 'DELETE' }),

    getCustomFields: (entityType: DocEntityType, entityId: string) =>
        apiFetch<CustomField[]>(`/custom-fields?entityType=${entityType}&entityId=${entityId}`),
    createCustomField: (data: { name: string; value: string; fieldType?: FieldType; entityType: DocEntityType; entityId: string }) =>
        apiFetch<CustomField>('/custom-fields', { method: 'POST', body: JSON.stringify(data) }),
    updateCustomField: (id: string, data: { value: string; fieldType?: FieldType }) =>
        apiFetch<CustomField>(`/custom-fields/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCustomField: (id: string) => apiFetch<void>(`/custom-fields/${id}`, { method: 'DELETE' }),
};
```

- [ ] **Step 7: Type-check**

Run: `cd frontend && npx tsc -b`
Expected: no errors. (If `TenantService.Tenant.type` breaks existing usages, fix them by treating the field as always present — the backend now always returns it.)

- [ ] **Step 8: Commit**

```bash
git add frontend
git commit -m "feat(frontend): services for assignments, tunnels, notes/custom fields, tenant type"
```

---

### Task 10: Tenant list — MSP badge, pinning, type on create

**Files:**
- Modify: `frontend/src/pages/TenantListPage.tsx`

**Interfaces:**
- Consumes: `Tenant.type` from Task 9.
- Produces: MSP tenant sorted first and badged; create modal with "Das ist unsere eigene MSP-Dokumentation" checkbox mapping to `type: 'MSP'`.

- [ ] **Step 1: Sort MSP first and add badge**

In `TenantListPage.tsx`, before the return statement add:

```typescript
    const sortedTenants = [...(tenants ?? [])].sort((a, b) =>
        a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'MSP' ? -1 : 1
    );
```

Replace both `tenants?.length === 0` with `sortedTenants.length === 0` and `tenants?.map` with `sortedTenants.map`. Inside the card, next to the initials block header (in the `flex items-start justify-between mb-3` row, before the `ArrowRight`), add:

```tsx
    {tenant.type === 'MSP' && (
        <span className="text-[10px] font-bold uppercase tracking-wide bg-primary-600 text-white px-2 py-0.5 rounded-full">
            MSP
        </span>
    )}
```

- [ ] **Step 2: Add MSP checkbox to the create modal**

In the modal form's `space-y-4` container, after the identifier input, add:

```tsx
    <label className="flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" name="isMsp" className="rounded" />
        Das ist unsere eigene MSP-Dokumentation
    </label>
```

and change the `createMutation.mutate` call to:

```typescript
    createMutation.mutate({
        name: formData.get('name') as string,
        identifier: formData.get('identifier') as string,
        type: formData.get('isMsp') ? 'MSP' : 'CUSTOMER',
    });
```

- [ ] **Step 3: Verify**

Run: `cd frontend && npx tsc -b && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend
git commit -m "feat(frontend): MSP badge and pinning on tenant list, MSP type on create"
```

---

### Task 11: DatacenterPage on real data with assignment dialog

**Files:**
- Rewrite: `frontend/src/pages/DatacenterPage.tsx`

**Interfaces:**
- Consumes: `NetworkService.getPublicSubnets()`, `NetworkService.getIps(subnetId)`, `NetworkService.createIp`, `NetworkService.updateIp`, `ProviderService.setAssignment('ips', ...)`, `TenantService.getAll()`.
- Produces: working Datacenter page; no mock data remains.

- [ ] **Step 1: Replace the page**

Replace the entire content of `DatacenterPage.tsx` with:

```tsx
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '../lib/utils';
import { Globe, ChevronRight, Loader2, X } from 'lucide-react';
import { NetworkService, type Subnet, type IpAddress } from '../services/NetworkService';
import { ProviderService } from '../services/ProviderService';
import { TenantService } from '../services/TenantService';

type SlotStatus = 'free' | 'used' | 'reserved' | 'network' | 'broadcast';

interface IpSlot {
    address: string;
    status: SlotStatus;
    record?: IpAddress;
}

function ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, o) => acc * 256 + parseInt(o, 10), 0) >>> 0;
}

function intToIp(n: number): string {
    return [24, 16, 8, 0].map(s => (n >>> s) & 255).join('.');
}

function buildSlots(cidr: string, records: IpAddress[]): IpSlot[] | null {
    const [base, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);
    const size = 2 ** (32 - prefix);
    if (Number.isNaN(prefix) || size > 256) return null;

    const byAddress = new Map(records.map(r => [r.address, r]));
    const network = ipToInt(base) & (~(size - 1) >>> 0);

    return Array.from({ length: size }, (_, i) => {
        const address = intToIp(network + i);
        const record = byAddress.get(address);
        let status: SlotStatus = 'free';
        if (i === 0) status = 'network';
        else if (i === size - 1) status = 'broadcast';
        else if (record?.status === 'reserved') status = 'reserved';
        else if (record) status = 'used';
        return { address, status, record };
    });
}

const SLOT_CLASSES: Record<SlotStatus, string> = {
    free: 'bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200',
    used: 'bg-primary-500 text-white',
    reserved: 'bg-amber-400 text-white',
    network: 'bg-slate-300 dark:bg-slate-600',
    broadcast: 'bg-slate-300 dark:bg-slate-600',
};

export default function DatacenterPage() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dialogSlot, setDialogSlot] = useState<IpSlot | null>(null);
    const queryClient = useQueryClient();

    const { data: ranges, isLoading, error } = useQuery({
        queryKey: ['public-subnets'],
        queryFn: NetworkService.getPublicSubnets,
    });

    const selectedRange: Subnet | undefined =
        ranges?.find(r => r.id === selectedId) ?? ranges?.[0];

    const { data: ips } = useQuery({
        queryKey: ['public-ips', selectedRange?.id],
        queryFn: () => NetworkService.getIps(selectedRange!.id),
        enabled: !!selectedRange,
    });

    const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: TenantService.getAll });
    const customers = useMemo(() => (tenants ?? []).filter(t => t.type === 'CUSTOMER'), [tenants]);

    const slots = useMemo(
        () => (selectedRange && ips ? buildSlots(selectedRange.cidr, ips) : null),
        [selectedRange, ips]
    );

    const saveMutation = useMutation({
        mutationFn: async (input: { slot: IpSlot; tenantId: string | null; usage: string; reserved: boolean }) => {
            const { slot, tenantId, usage, reserved } = input;
            const status = reserved ? 'reserved' : 'active';
            let record = slot.record;
            if (!record) {
                record = await NetworkService.createIp({
                    subnetId: selectedRange!.id,
                    address: slot.address,
                    status,
                    description: usage || undefined,
                });
            } else {
                record = await NetworkService.updateIp(record.id, { status, description: usage || undefined });
            }
            await ProviderService.setAssignment('ips', record.id, tenantId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public-ips', selectedRange?.id] });
            setDialogSlot(null);
        },
    });

    if (isLoading) {
        return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
    }
    if (error) {
        return <div className="p-12 text-center text-red-500">Fehler beim Laden der Public Ranges: {(error as Error).message}</div>;
    }

    const usedCount = ips?.filter(ip => ip.status !== 'reserved').length ?? 0;
    const reservedCount = ips?.filter(ip => ip.status === 'reserved').length ?? 0;

    return (
        <div className="page">
            <div className="mb-6">
                <h1 className="page-title">Datacenter · Public IPs</h1>
                <p className="page-subtitle">Öffentliche IP-Ranges des MSP, Kunden zuweisbar</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Range list */}
                <div className="card overflow-hidden lg:col-span-1">
                    <div className="px-4 py-3 border-b border-white/70 dark:border-white/10 font-semibold text-sm text-slate-800 dark:text-white">
                        Ranges
                    </div>
                    {(ranges ?? []).map(range => (
                        <button
                            key={range.id}
                            onClick={() => setSelectedId(range.id)}
                            className={cn(
                                'w-full flex items-center justify-between px-4 py-3 text-left text-sm hover:bg-primary-50 dark:hover:bg-white/5',
                                selectedRange?.id === range.id && 'bg-primary-50 dark:bg-white/10'
                            )}
                        >
                            <div>
                                <div className="font-mono font-medium text-slate-800 dark:text-white">{range.cidr}</div>
                                <div className="text-xs text-slate-500">{range.description ?? '—'}</div>
                            </div>
                            <ChevronRight size={14} className="text-slate-300" />
                        </button>
                    ))}
                    {(ranges ?? []).length === 0 && (
                        <div className="p-6 text-center text-sm text-slate-500">
                            <Globe size={24} className="mx-auto mb-2 text-slate-300" />
                            Keine öffentlichen Ranges dokumentiert.
                        </div>
                    )}
                </div>

                {/* Grid */}
                <div className="lg:col-span-3 space-y-4">
                    {selectedRange && (
                        <>
                            <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-400">
                                <span><b>{usedCount}</b> vergeben</span>
                                <span><b>{reservedCount}</b> reserviert</span>
                                <span><b>{selectedRange.totalIps - (ips?.length ?? 0)}</b> frei</span>
                            </div>
                            {slots ? (
                                <div className="card p-4 grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1">
                                    {slots.map(slot => (
                                        <button
                                            key={slot.address}
                                            title={`${slot.address}${slot.record?.assignedTenantName ? ` · ${slot.record.assignedTenantName}` : ''}${slot.record?.description ? ` · ${slot.record.description}` : ''}`}
                                            disabled={slot.status === 'network' || slot.status === 'broadcast'}
                                            onClick={() => setDialogSlot(slot)}
                                            className={cn('h-7 rounded text-[9px] font-mono flex items-center justify-center', SLOT_CLASSES[slot.status])}
                                        >
                                            {slot.address.split('.')[3]}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="card p-6 text-sm text-slate-500">
                                    Range zu groß für Rasteransicht – dokumentierte IPs: {ips?.length ?? 0}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Assign dialog */}
            {dialogSlot && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/60 dark:border-white/10">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white font-mono">{dialogSlot.address}</h2>
                            <button onClick={() => setDialogSlot(null)} className="btn-icon"><X size={16} /></button>
                        </div>
                        <form onSubmit={e => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            const tenantId = (fd.get('tenantId') as string) || null;
                            saveMutation.mutate({
                                slot: dialogSlot,
                                tenantId,
                                usage: fd.get('usage') as string,
                                reserved: fd.get('reserved') === 'on',
                            });
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Kunde</label>
                                    <select name="tenantId" defaultValue={dialogSlot.record?.assignedTenantId ?? ''} className="input">
                                        <option value="">— nicht zugewiesen —</option>
                                        {customers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Verwendung</label>
                                    <input name="usage" defaultValue={dialogSlot.record?.description ?? ''} placeholder="z.B. Firewall WAN1" className="input" />
                                </div>
                                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                    <input type="checkbox" name="reserved" defaultChecked={dialogSlot.record?.status === 'reserved'} className="rounded" />
                                    Reserviert
                                </label>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setDialogSlot(null)} className="btn-secondary">Abbrechen</button>
                                <button type="submit" disabled={saveMutation.isPending} className="btn-primary disabled:opacity-50">
                                    {saveMutation.isPending ? 'Speichere...' : 'Speichern'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
```

Note: if `md:grid-cols-16` is not generated by the Tailwind config, use `md:grid-cols-12` — check visually in Step 2.

- [ ] **Step 2: Verify**

Run: `cd frontend && npx tsc -b && npm run dev` with the backend running. Open `http://localhost:5173/datacenter`.
Expected: the two seeded ranges appear; the /24 grid shows assigned IPs (.1 reserved amber, .10/.11 used); clicking an IP opens the dialog; assigning a customer persists after reload.

- [ ] **Step 3: Commit**

```bash
git add frontend
git commit -m "feat(frontend): datacenter page on real public ranges with IP assignment dialog"
```

---

### Task 12: VPN tunnel section on the Network page

**Files:**
- Create: `frontend/src/components/network/VpnTunnelSection.tsx`
- Modify: `frontend/src/pages/NetworkPage.tsx`

**Interfaces:**
- Consumes: `VpnTunnelService`, `DeviceService.getAll()`, Task 9 types.
- Produces: `<VpnTunnelSection tenantId={string} />` component listing the tenant's tunnels with add/delete; base fields + `<details>`-based Advanced section.

- [ ] **Step 1: Create `VpnTunnelSection.tsx`**

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, Lock } from 'lucide-react';
import {
    VpnTunnelService,
    type CreateVpnTunnelRequest,
    type TunnelType,
    type IkeVersion,
    type EncryptionAlgorithm,
    type HashAlgorithm,
} from '../../services/VpnTunnelService';
import { DeviceService } from '../../services/DeviceService';

const TYPE_LABELS: Record<TunnelType, string> = {
    IPSEC_S2S: 'IPsec Site-to-Site',
    SSL_VPN: 'SSL VPN',
    WIREGUARD: 'WireGuard',
    OTHER: 'Andere',
};

const STATUS_BADGES: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    PLANNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    DISABLED: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
};

export default function VpnTunnelSection({ tenantId }: { tenantId: string }) {
    const [showForm, setShowForm] = useState(false);
    const queryClient = useQueryClient();

    const { data: tunnels } = useQuery({
        queryKey: ['vpn-tunnels', tenantId],
        queryFn: () => VpnTunnelService.getByTenant(tenantId),
    });

    const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: DeviceService.getAll });
    const firewalls = (devices ?? []).filter(d => d.deviceType === 'FIREWALL');

    const createMutation = useMutation({
        mutationFn: (data: CreateVpnTunnelRequest) => VpnTunnelService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vpn-tunnels', tenantId] });
            setShowForm(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => VpnTunnelService.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vpn-tunnels', tenantId] }),
    });

    return (
        <div className="card overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-white/70 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Lock size={15} className="text-slate-400" />
                    <h2 className="font-semibold text-slate-900 dark:text-white">VPN-Tunnel</h2>
                    <span className="text-xs text-slate-400">{tunnels?.length ?? 0}</span>
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary text-xs px-3 py-1.5">
                    <Plus size={14} /> Tunnel
                </button>
            </div>

            {(tunnels ?? []).length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">Keine VPN-Tunnel dokumentiert.</div>
            ) : (
                <div className="divide-y divide-white/70 dark:divide-white/10">
                    {(tunnels ?? []).map(t => (
                        <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-slate-800 dark:text-white">{t.name}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGES[t.status]}`}>{t.status}</span>
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    {TYPE_LABELS[t.type]} · {t.localDeviceName}
                                    {t.remoteDeviceName ? ` ↔ ${t.remoteDeviceName}` : ''}
                                    {t.ikeVersion ? ` · ${t.ikeVersion}` : ''}
                                    {t.encryption ? ` / ${t.encryption.replace('_', '-')}` : ''}
                                    {t.secretRef ? ` · PSK: ${t.secretRef}` : ''}
                                </div>
                            </div>
                            <button onClick={() => deleteMutation.mutate(t.id)} className="btn-icon text-slate-400 hover:text-red-500">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/60 dark:border-white/10 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Neuer VPN-Tunnel</h2>
                            <button onClick={() => setShowForm(false)} className="btn-icon"><X size={16} /></button>
                        </div>
                        <form onSubmit={e => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            createMutation.mutate({
                                name: fd.get('name') as string,
                                type: fd.get('type') as TunnelType,
                                tenantId,
                                localDeviceId: fd.get('localDeviceId') as string,
                                ikeVersion: (fd.get('ikeVersion') as IkeVersion) || undefined,
                                encryption: (fd.get('encryption') as EncryptionAlgorithm) || undefined,
                                hash: (fd.get('hash') as HashAlgorithm) || undefined,
                                dhGroup: fd.get('dhGroup') ? Number(fd.get('dhGroup')) : undefined,
                                secretRef: (fd.get('secretRef') as string) || undefined,
                            });
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Name</label>
                                    <input name="name" required placeholder="z.B. S2S Kunde HQ" className="input" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Typ</label>
                                    <select name="type" className="input" defaultValue="IPSEC_S2S">
                                        {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Lokales Gerät (MSP-Seite)</label>
                                    <select name="localDeviceId" required className="input">
                                        <option value="">— wählen —</option>
                                        {firewalls.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <details className="rounded-xl border border-slate-200 dark:border-white/10 p-3">
                                    <summary className="text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">Erweitert (IKE / Krypto / PSK-Referenz)</summary>
                                    <div className="space-y-3 mt-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <select name="ikeVersion" className="input" defaultValue="">
                                                <option value="">IKE-Version</option>
                                                <option value="IKEV1">IKEv1</option>
                                                <option value="IKEV2">IKEv2</option>
                                            </select>
                                            <select name="encryption" className="input" defaultValue="">
                                                <option value="">Verschlüsselung</option>
                                                <option value="AES_128">AES-128</option>
                                                <option value="AES_256">AES-256</option>
                                                <option value="TRIPLE_DES">3DES</option>
                                                <option value="CHACHA20">ChaCha20</option>
                                            </select>
                                            <select name="hash" className="input" defaultValue="">
                                                <option value="">Hash</option>
                                                <option value="SHA1">SHA-1</option>
                                                <option value="SHA256">SHA-256</option>
                                                <option value="SHA512">SHA-512</option>
                                            </select>
                                            <input name="dhGroup" type="number" min="1" max="32" placeholder="DH-Gruppe" className="input" />
                                        </div>
                                        <input name="secretRef" placeholder="Bitwarden-Eintrag (kein Secret!)" className="input" />
                                    </div>
                                </details>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Abbrechen</button>
                                <button type="submit" disabled={createMutation.isPending} className="btn-primary disabled:opacity-50">
                                    {createMutation.isPending ? 'Erstelle...' : 'Erstellen'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Mount it on `NetworkPage.tsx`**

Add the import at the top:

```typescript
import VpnTunnelSection from '../components/network/VpnTunnelSection';
```

Locate the main scrollable content container in the page's return (the element rendering the subnet list, after the header `div`). Immediately after the subnet list rendering, inside that content container, add:

```tsx
    {tenantId && <VpnTunnelSection tenantId={tenantId} />}
```

- [ ] **Step 3: Assignment badge on subnet listing**

`NetworkPage.tsx` renders each subnet from the `subnets` query (type `Subnet` from `NetworkService`, which since Task 9 carries `assignedTenantName`). Locate where a subnet's `cidr` is rendered as heading/label in the subnet list and add directly after it:

```tsx
    {subnet.assignedTenantName && (
        <span className="ml-2 text-[10px] font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 px-2 py-0.5 rounded-full">
            {subnet.assignedTenantName}
        </span>
    )}
```

(Use the local variable name the map callback actually uses if it differs from `subnet`.)

- [ ] **Step 4: Verify**

Run: `cd frontend && npx tsc -b`, then in the browser open a customer's network page (`/tenants/<id>/network`) with backend running.
Expected: "VPN-Tunnel" card at the bottom; the seeded default customer shows "S2S Default HQ"; creating a tunnel with only name/type/device works; the Advanced section stays collapsed by default.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): VPN tunnel section and subnet assignment badges"
```

---

### Task 13: "Provided by MSP" panel on the tenant dashboard

**Files:**
- Create: `frontend/src/components/tenant/ProvidedByMspPanel.tsx`
- Modify: `frontend/src/pages/TenantDashboardPage.tsx`

**Interfaces:**
- Consumes: `ProviderService.getProvidedResources(tenantId)`.
- Produces: `<ProvidedByMspPanel tenantId={string} />` — renders nothing when the tenant has no provided resources.

- [ ] **Step 1: Create `ProvidedByMspPanel.tsx`**

(create directory `frontend/src/components/tenant/` if missing)

```tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Globe, Network, Server, Lock, Building2 } from 'lucide-react';
import { ProviderService } from '../../services/ProviderService';

export default function ProvidedByMspPanel({ tenantId }: { tenantId: string }) {
    const { data } = useQuery({
        queryKey: ['provided-resources', tenantId],
        queryFn: () => ProviderService.getProvidedResources(tenantId),
    });

    if (!data) return null;
    const total = data.publicIps.length + data.vlans.length + data.subnets.length
        + data.devices.length + data.vpnTunnels.length;
    if (total === 0) return null;

    return (
        <div className="card overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-white/70 dark:border-white/10 flex items-center gap-2">
                <Building2 size={15} className="text-primary-500" />
                <h2 className="font-semibold text-slate-900 dark:text-white">Vom MSP bereitgestellt</h2>
            </div>
            <div className="divide-y divide-white/70 dark:divide-white/10 text-sm">
                {data.publicIps.map(ip => (
                    <Row key={ip.id} icon={<Globe size={14} />}
                        label={<Link to="/datacenter" className="font-mono hover:text-primary-600">{ip.address}</Link>}
                        detail={`${ip.usage ?? 'Public IP'} · ${ip.subnetCidr}`} />
                ))}
                {data.vlans.map(v => (
                    <Row key={v.id} icon={<Network size={14} />}
                        label={<span>VLAN {v.vlanTag}{v.name ? ` – ${v.name}` : ''}</span>}
                        detail={`auf Infrastruktur von ${v.ownerTenantName}`} />
                ))}
                {data.subnets.map(s => (
                    <Row key={s.id} icon={<Network size={14} />}
                        label={<span className="font-mono">{s.cidr}</span>}
                        detail={s.description ?? `Subnetz von ${s.ownerTenantName}`} />
                ))}
                {data.devices.map(d => (
                    <Row key={d.id} icon={<Server size={14} />}
                        label={<span>{d.name}</span>}
                        detail={`${d.deviceType}${d.model ? ` · ${d.model}` : ''} · gehostet im MSP-Rack`} />
                ))}
                {data.vpnTunnels.map(t => (
                    <Row key={t.id} icon={<Lock size={14} />}
                        label={<span>{t.name}</span>}
                        detail={`${t.type.replace('_', ' ')} über ${t.localDeviceName} · ${t.status}`} />
                ))}
            </div>
        </div>
    );
}

function Row({ icon, label, detail }: { icon: React.ReactNode; label: React.ReactNode; detail: string }) {
    return (
        <div className="px-5 py-2.5 flex items-center gap-3">
            <span className="text-slate-400">{icon}</span>
            <div className="min-w-0">
                <div className="text-slate-800 dark:text-white">{label}</div>
                <div className="text-xs text-slate-500 truncate">{detail}</div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Mount on `TenantDashboardPage.tsx`**

Add the import:

```typescript
import ProvidedByMspPanel from '../components/tenant/ProvidedByMspPanel';
```

In the return, directly after the Quick Stats grid (`<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">...</div>`), add:

```tsx
    {tenantId && <ProvidedByMspPanel tenantId={tenantId} />}
```

- [ ] **Step 3: Verify**

Run: `cd frontend && npx tsc -b`, open the default customer's dashboard (`/tenants/<default-tenant-id>`).
Expected: panel shows the seeded public IPs, VLAN 110, hosted server and tunnel. Open the MSP tenant's dashboard: panel absent (nothing assigned to the MSP).

- [ ] **Step 4: Commit**

```bash
git add frontend
git commit -m "feat(frontend): provided-by-MSP panel on tenant dashboard"
```

---

### Task 14: Notes & custom fields panel

**Files:**
- Create: `frontend/src/components/doc/NotesAndFieldsPanel.tsx`
- Modify: `frontend/src/pages/TenantDashboardPage.tsx`

**Interfaces:**
- Consumes: `DocService` (Task 9), `react-markdown`.
- Produces: `<NotesAndFieldsPanel entityType={DocEntityType} entityId={string} />` reusable on any detail view.

- [ ] **Step 1: Create `NotesAndFieldsPanel.tsx`**

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Plus, Trash2, X, FileText, Tag } from 'lucide-react';
import { DocService, type DocEntityType, type FieldType } from '../../services/DocService';

interface Props {
    entityType: DocEntityType;
    entityId: string;
}

export default function NotesAndFieldsPanel({ entityType, entityId }: Props) {
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [showFieldForm, setShowFieldForm] = useState(false);
    const queryClient = useQueryClient();

    const notesQuery = useQuery({
        queryKey: ['notes', entityType, entityId],
        queryFn: () => DocService.getNotes(entityType, entityId),
    });
    const fieldsQuery = useQuery({
        queryKey: ['custom-fields', entityType, entityId],
        queryFn: () => DocService.getCustomFields(entityType, entityId),
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['notes', entityType, entityId] });
        queryClient.invalidateQueries({ queryKey: ['custom-fields', entityType, entityId] });
    };

    const createNote = useMutation({
        mutationFn: (data: { title: string; contentMarkdown: string }) =>
            DocService.createNote({ ...data, entityType, entityId }),
        onSuccess: () => { invalidate(); setShowNoteForm(false); },
    });
    const deleteNote = useMutation({ mutationFn: DocService.deleteNote, onSuccess: invalidate });
    const createField = useMutation({
        mutationFn: (data: { name: string; value: string; fieldType: FieldType }) =>
            DocService.createCustomField({ ...data, entityType, entityId }),
        onSuccess: () => { invalidate(); setShowFieldForm(false); },
    });
    const deleteField = useMutation({ mutationFn: DocService.deleteCustomField, onSuccess: invalidate });

    const notes = notesQuery.data ?? [];
    const fields = fieldsQuery.data ?? [];

    return (
        <div className="card overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-white/70 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText size={15} className="text-slate-400" />
                    <h2 className="font-semibold text-slate-900 dark:text-white">Notizen & Felder</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowFieldForm(true)} className="btn-secondary text-xs px-3 py-1.5">
                        <Tag size={13} /> Feld
                    </button>
                    <button onClick={() => setShowNoteForm(true)} className="btn-primary text-xs px-3 py-1.5">
                        <Plus size={14} /> Notiz
                    </button>
                </div>
            </div>

            {/* Custom fields */}
            {fields.length > 0 && (
                <div className="px-5 py-3 border-b border-white/70 dark:border-white/10 flex flex-wrap gap-2">
                    {fields.map(f => (
                        <span key={f.id} className="inline-flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700/60 rounded-full px-3 py-1">
                            <b className="text-slate-700 dark:text-slate-200">{f.name}:</b>
                            {f.fieldType === 'URL'
                                ? <a href={f.value} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">{f.value}</a>
                                : <span className="text-slate-600 dark:text-slate-300">{f.value}</span>}
                            <button onClick={() => deleteField.mutate(f.id)} className="text-slate-400 hover:text-red-500"><X size={11} /></button>
                        </span>
                    ))}
                </div>
            )}

            {/* Notes */}
            {notes.length === 0 && fields.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                    Noch keine Notizen oder Felder – frei ergänzbar wie in Confluence.
                </div>
            ) : (
                <div className="divide-y divide-white/70 dark:divide-white/10">
                    {notes.map(note => (
                        <details key={note.id} className="group">
                            <summary className="px-5 py-3 cursor-pointer flex items-center justify-between text-sm">
                                <span className="font-medium text-slate-800 dark:text-white">{note.title}</span>
                                <button
                                    onClick={e => { e.preventDefault(); deleteNote.mutate(note.id); }}
                                    className="btn-icon text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </summary>
                            <div className="px-5 pb-4 prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                                <ReactMarkdown>{note.contentMarkdown}</ReactMarkdown>
                            </div>
                        </details>
                    ))}
                </div>
            )}

            {/* Note form */}
            {showNoteForm && (
                <Modal title="Neue Notiz" onClose={() => setShowNoteForm(false)}>
                    <form onSubmit={e => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        createNote.mutate({
                            title: fd.get('title') as string,
                            contentMarkdown: fd.get('content') as string,
                        });
                    }}>
                        <div className="space-y-4">
                            <input name="title" required placeholder="Titel" className="input" />
                            <textarea name="content" required rows={8} placeholder="Markdown-Inhalt..." className="input font-mono text-xs" />
                        </div>
                        <FormButtons pending={createNote.isPending} onCancel={() => setShowNoteForm(false)} />
                    </form>
                </Modal>
            )}

            {/* Field form */}
            {showFieldForm && (
                <Modal title="Neues Feld" onClose={() => setShowFieldForm(false)}>
                    <form onSubmit={e => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        createField.mutate({
                            name: fd.get('name') as string,
                            value: fd.get('value') as string,
                            fieldType: fd.get('fieldType') as FieldType,
                        });
                    }}>
                        <div className="space-y-4">
                            <input name="name" required placeholder="Name, z.B. Supportvertrag" className="input" />
                            <input name="value" required placeholder="Wert" className="input" />
                            <select name="fieldType" className="input" defaultValue="TEXT">
                                <option value="TEXT">Text</option>
                                <option value="NUMBER">Zahl</option>
                                <option value="URL">URL</option>
                                <option value="DATE">Datum</option>
                            </select>
                        </div>
                        <FormButtons pending={createField.isPending} onCancel={() => setShowFieldForm(false)} />
                    </form>
                </Modal>
            )}
        </div>
    );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/60 dark:border-white/10">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
                    <button onClick={onClose} className="btn-icon"><X size={16} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

function FormButtons({ pending, onCancel }: { pending: boolean; onCancel: () => void }) {
    return (
        <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
                {pending ? 'Speichere...' : 'Speichern'}
            </button>
        </div>
    );
}
```

(If the project's Tailwind setup lacks the `prose` plugin, replace the ReactMarkdown wrapper div's classes with `px-5 pb-4 text-sm text-slate-700 dark:text-slate-300 space-y-2` — markdown still renders as structured HTML.)

- [ ] **Step 2: Mount on `TenantDashboardPage.tsx`**

Add the import:

```typescript
import NotesAndFieldsPanel from '../components/doc/NotesAndFieldsPanel';
```

At the end of the page's return, after the existing two-column grid closes, add:

```tsx
    {tenantId && <NotesAndFieldsPanel entityType="TENANT" entityId={tenantId} />}
```

- [ ] **Step 3: Verify**

Run: `cd frontend && npx tsc -b`, open any tenant dashboard.
Expected: "Notizen & Felder" card; adding a note with markdown (`## Test`) renders a heading when expanded; adding field "Supportvertrag" shows a chip; duplicate field name shows the API error (400).

- [ ] **Step 4: Commit**

```bash
git add frontend
git commit -m "feat(frontend): reusable notes and custom fields panel"
```

---

### Task 15: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full backend test run + boot**

```bash
cd backend && ./gradlew test && cd .. && docker compose down -v && docker compose up -d postgres && sleep 5 && cd backend && ./gradlew bootRun
```
Expected: all tests pass; both seed blocks run; no startup errors.

- [ ] **Step 2: Frontend build + manual walkthrough**

Run `cd frontend && npm run dev` and verify in the browser:
1. `/tenants` — "iGeeks (MSP)" pinned first with MSP badge.
2. `/datacenter` — both public ranges from the API; assign a free IP to the default customer with usage text; reload persists.
3. Default customer dashboard — "Vom MSP bereitgestellt" panel lists the new IP, VLAN 110, Cloud-SRV-Default, and the S2S tunnel; "Notizen & Felder" panel works (add note + field).
4. Customer `/tenants/<id>/network` — VPN section shows the seeded tunnel; create one with Advanced fields; delete it.
5. MSP tenant dashboard — no "Vom MSP bereitgestellt" panel; MSP racks/hardware pages work like a customer's.
6. `curl -i -X DELETE http://localhost:8080/api/v1/tenants/<default-tenant-id>` → HTTP 409 with the German blocker message.

- [ ] **Step 3: Final commit if any fixes were needed, then report**

```bash
git status
```
Expected: clean tree; report walkthrough results to the user.
