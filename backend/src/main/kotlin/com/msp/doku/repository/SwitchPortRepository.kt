package com.msp.doku.repository

import com.msp.doku.domain.SwitchPort
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface SwitchPortRepository : JpaRepository<SwitchPort, UUID> {
    fun findByDeviceIdOrderByPortNumber(deviceId: UUID): List<SwitchPort>
    fun findByDeviceIdAndPortNumber(deviceId: UUID, portNumber: Int): SwitchPort?
}
