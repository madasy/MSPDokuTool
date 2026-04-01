package com.msp.doku.dto

import com.msp.doku.domain.Device
import com.msp.doku.domain.DeviceStatus
import com.msp.doku.domain.DeviceType
import com.msp.doku.domain.Rack
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
    val rj45Ports: Int = 0,
    val sfpPorts: Int = 0
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
    val status: DeviceStatus = DeviceStatus.ACTIVE,
    val rackId: UUID? = null,
    val rj45Ports: Int = 0,
    val sfpPorts: Int = 0
)

// Shared extension functions for mapping
fun Device.toDeviceDto() = DeviceDto(
    id = this.id!!,
    name = this.name,
    deviceType = this.deviceType,
    model = this.model,
    serial = this.serialNumber,
    ip = this.managementIp,
    mac = this.macAddress,
    positionU = this.positionU,
    heightU = this.heightU,
    status = this.status,
    rackId = this.rack?.id,
    rackName = this.rack?.name,
    rj45Ports = this.rj45Ports,
    sfpPorts = this.sfpPorts
)

fun Rack.toRackDto(devices: List<Device> = emptyList()) = RackDto(
    id = this.id!!,
    name = this.name,
    heightUnits = this.heightUnits,
    devices = devices.map { it.toDeviceDto() }
)
