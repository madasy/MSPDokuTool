package com.msp.doku.repository

import com.msp.doku.domain.Connection
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface ConnectionRepository : JpaRepository<Connection, UUID> {
    @Query("SELECT c FROM Connection c WHERE c.endpointA.device.id = :deviceId OR c.endpointB.device.id = :deviceId")
    fun findByDeviceId(deviceId: UUID): List<Connection>

    @Query("SELECT c FROM Connection c WHERE c.endpointA.id = :interfaceId OR c.endpointB.id = :interfaceId")
    fun findByInterfaceId(interfaceId: UUID): List<Connection>
}
