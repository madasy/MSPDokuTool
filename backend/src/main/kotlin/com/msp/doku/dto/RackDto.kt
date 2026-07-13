package com.msp.doku.dto

import com.msp.doku.domain.DeviceType
import com.msp.doku.domain.DeviceStatus
import java.util.UUID

data class RackDto(
    val id: UUID,
    val name: String,
    val heightUnits: Int,
    val devices: List<DeviceDto> = emptyList()
)

data class CreateRackRequest(
    val name: String,
    val heightUnits: Int = 42,
    val roomId: UUID? = null // Optional for now
)

data class DeviceDto(
    val id: UUID,
    val name: String,
    val deviceType: DeviceType,
    val model: String?,
    val serial: String?,
    val ip: String?,
    val mac: String?,
    val positionU: Int?,
    val heightU: Int,
    val status: DeviceStatus,
    val rackId: UUID?,
    val rackName: String?,
    val assignedTenantId: UUID? = null,
    val assignedTenantName: String? = null
)

data class CreateDeviceRequest(
    val name: String,
    val deviceType: DeviceType,
    val model: String? = null,
    val serial: String? = null,
    val ip: String? = null,
    val mac: String? = null,
    val heightU: Int = 1,
    val positionU: Int? = null, // Can be null if not yet placed
    val rackId: UUID? = null,
    val status: DeviceStatus = DeviceStatus.ACTIVE
)
