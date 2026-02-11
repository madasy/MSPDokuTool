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
    val positionU: Int?,
    val heightU: Int,
    val status: DeviceStatus
)

data class CreateDeviceRequest(
    val name: String,
    val deviceType: DeviceType,
    val heightU: Int = 1,
    val positionU: Int? = null, // Can be null if not yet placed
    val rackId: UUID? = null
)
