package com.msp.doku.service

import com.msp.doku.domain.Device
import com.msp.doku.domain.Rack
import com.msp.doku.dto.CreateDeviceRequest
import com.msp.doku.dto.CreateRackRequest
import com.msp.doku.dto.DeviceDto
import com.msp.doku.dto.RackDto
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
    private val roomRepository: RoomRepository // Needed to look up room
) {

    fun getAllRacks(): List<RackDto> {
        return rackRepository.findAll().map { it.toDto() }
    }

    fun getRack(id: UUID): RackDto {
        val rack = rackRepository.findById(id).orElseThrow { IllegalArgumentException("Rack not found") }
        val devices = deviceRepository.findByRackId(id)
        return rack.toDto(devices)
    }

    @Transactional
    fun createRack(request: CreateRackRequest): RackDto {
         // Mocking Room lookup for MVP since we don't have Room API yet
         // In real app, we must validate roomId
         // For now, let's create a dummy room if needed or fail if entity requires it.
         // rack.room is non-nullable in Entity.
         // WORKAROUND: We need a valid Room ID.
         throw UnsupportedOperationException("Room creation not yet implemented, cannot create Rack without Room")
    }
    
    // Quick Fix: Create Rack with Room ID
    @Transactional
    fun createRackWithRoom(request: CreateRackRequest, roomId: UUID): RackDto {
         val room = roomRepository.findById(roomId).orElseThrow{ IllegalArgumentException("Room not found") }
         val rack = Rack(
             name = request.name,
             heightUnits = request.heightUnits,
             room = room
         )
         return rackRepository.save(rack).toDto()
    }

    @Transactional
    fun addDeviceToRack(request: CreateDeviceRequest): DeviceDto {
        val rack = request.rackId?.let { rackRepository.findById(it).orElseThrow { IllegalArgumentException("Rack not found") } }
        
        val device = Device(
            name = request.name,
            deviceType = request.deviceType,
            heightU = request.heightU,
            positionU = request.positionU,
            rack = rack
        )
        return deviceRepository.save(device).toDto()
    }

    private fun Rack.toDto(devices: List<Device> = emptyList()) = RackDto(
        id = this.id!!,
        name = this.name,
        heightUnits = this.heightUnits,
        devices = devices.map { it.toDto() }
    )

    private fun Device.toDto() = DeviceDto(
        id = this.id!!,
        name = this.name,
        deviceType = this.deviceType,
        positionU = this.positionU,
        heightU = this.heightU,
        status = this.status
    )
}
