package com.msp.doku.repository

import com.msp.doku.domain.Vlan
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID
import java.util.Optional

@Repository
interface VlanRepository : JpaRepository<Vlan, UUID> {
    fun findByTenantId(tenantId: UUID): List<Vlan>
    fun findByTenantIdAndVlanId(tenantId: UUID, vlanId: Int): Optional<Vlan>
    fun findByTenantAndVlanId(tenant: com.msp.doku.domain.Tenant, vlanId: Int): Optional<Vlan>
}
