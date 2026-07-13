package com.msp.doku.repository

import com.msp.doku.domain.PublicIpRange
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface PublicIpRangeRepository : JpaRepository<PublicIpRange, UUID> {
    fun findByAssignedTenantId(tenantId: UUID): List<PublicIpRange>
    fun existsByAssignedTenantId(tenantId: UUID): Boolean
}
