package com.msp.doku.repository

import com.msp.doku.domain.FirewallInterface
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface FirewallInterfaceRepository : JpaRepository<FirewallInterface, UUID> {
    fun findByDeviceId(deviceId: UUID): List<FirewallInterface>
    fun findByDeviceIdAndInterfaceName(deviceId: UUID, interfaceName: String): FirewallInterface?
}
