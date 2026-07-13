package com.msp.doku.repository

import com.msp.doku.domain.VpnTunnel
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface VpnTunnelRepository : JpaRepository<VpnTunnel, UUID> {
    fun findByTenantId(tenantId: UUID): List<VpnTunnel>
    fun existsByTenantId(tenantId: UUID): Boolean
    fun existsByLocalDeviceId(deviceId: UUID): Boolean
}
