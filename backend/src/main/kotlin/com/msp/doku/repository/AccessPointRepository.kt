package com.msp.doku.repository

import com.msp.doku.domain.AccessPoint
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface AccessPointRepository : JpaRepository<AccessPoint, UUID> {
    fun findBySiteId(siteId: UUID): List<AccessPoint>

    @Query("SELECT a FROM AccessPoint a WHERE a.site.tenant.id = :tenantId")
    fun findByTenantId(tenantId: UUID): List<AccessPoint>
}
