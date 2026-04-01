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
