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

    fun countByRoomId(roomId: UUID): Long
}
