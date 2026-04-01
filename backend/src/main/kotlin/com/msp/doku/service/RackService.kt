package com.msp.doku.service

import com.msp.doku.domain.Device
import com.msp.doku.domain.Rack
import com.msp.doku.dto.CreateDeviceRequest
import com.msp.doku.dto.CreateRackRequest
import com.msp.doku.dto.DeviceDto
import com.msp.doku.dto.RackDto
import com.msp.doku.dto.toDeviceDto
import com.msp.doku.dto.toRackDto
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.RackRepository
import com.msp.doku.repository.RoomRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class RackService(
    private val rackRepository: RackRepository,
    private val deviceRepository: DeviceRepository,
    private val roomRepository: RoomRepository
) {

    fun getRacksByTenant(tenantId: UUID): List<RackDto> {
        return rackRepository.findByTenantId(tenantId).map { rack ->
            val devices = deviceRepository.findByRackId(rack.id!!)
            rack.toRackDto(devices)
        }
    }

    fun getRack(id: UUID): RackDto {
        val rack = rackRepository.findById(id).orElseThrow { IllegalArgumentException("Rack not found") }
        val devices = deviceRepository.findByRackId(id)
        return rack.toRackDto(devices)
    }

    fun countByTenantId(tenantId: UUID): Long {
        return rackRepository.countByTenantId(tenantId)
    }

    @Transactional
    fun createRackWithRoom(request: CreateRackRequest, roomId: UUID): RackDto {
        val room = roomRepository.findById(roomId).orElseThrow { IllegalArgumentException("Room not found") }
        val rack = Rack(
            name = request.name,
            heightUnits = request.heightUnits,
            room = room
        )
        return rackRepository.save(rack).toRackDto()
    }

    @Transactional
    fun addDeviceToRack(request: CreateDeviceRequest): DeviceDto {
        val rack = request.rackId?.let { rackRepository.findById(it).orElseThrow { IllegalArgumentException("Rack not found") } }

        val device = Device(
            name = request.name,
            deviceType = request.deviceType,
            model = request.model,
            serialNumber = request.serial,
            managementIp = request.ip,
            macAddress = request.mac,
            heightU = request.heightU,
            positionU = request.positionU,
            status = request.status,
            rack = rack
        )
        return deviceRepository.save(device).toDeviceDto()
    }
}
