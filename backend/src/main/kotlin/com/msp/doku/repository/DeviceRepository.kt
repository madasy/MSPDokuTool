package com.msp.doku.repository

import com.msp.doku.domain.Device
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface DeviceRepository : JpaRepository<Device, UUID> {
    fun findByRackId(rackId: UUID): List<Device>
}
