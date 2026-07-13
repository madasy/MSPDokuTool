package com.msp.doku.service

import com.msp.doku.domain.Device
import com.msp.doku.domain.DeviceStatus
import com.msp.doku.domain.DocEntityType
import com.msp.doku.dto.CreateDeviceRequest
import com.msp.doku.dto.DeviceDto
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.RackRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class DeviceService(
    private val deviceRepository: DeviceRepository,
    private val rackRepository: RackRepository,
    private val docService: DocService
) {

    fun getAllDevices(): List<DeviceDto> {
        return deviceRepository.findAll().map { it.toDto() }
    }

    fun getDevice(id: UUID): DeviceDto {
        return deviceRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Device not found") }
            .toDto()
    }

    @Transactional
    fun createDevice(request: CreateDeviceRequest): DeviceDto {
        val rack = request.rackId?.let { 
            rackRepository.findById(it).orElseThrow { IllegalArgumentException("Rack not found") } 
        }

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
        return deviceRepository.save(device).toDto()
    }

    @Transactional
    fun updateDevice(id: UUID, request: CreateDeviceRequest): DeviceDto {
        val device = deviceRepository.findById(id).orElseThrow { IllegalArgumentException("Device not found") }
        
        device.name = request.name
        device.deviceType = request.deviceType
        device.model = request.model
        device.serialNumber = request.serial
        device.managementIp = request.ip
        device.macAddress = request.mac
        device.heightU = request.heightU
        device.positionU = request.positionU
        device.status = request.status

        if (request.rackId != null) {
            val rack = rackRepository.findById(request.rackId).orElseThrow { IllegalArgumentException("Rack not found") }
            device.rack = rack
        } else {
            device.rack = null
            device.positionU = null // Remove from rack position if rack is removed
        }

        return deviceRepository.save(device).toDto()
    }

    @Transactional
    fun deleteDevice(id: UUID) {
        if (deviceRepository.existsById(id)) {
            docService.deleteAllForEntity(DocEntityType.DEVICE, id)
            deviceRepository.deleteById(id)
        }
    }

    private fun Device.toDto() = DeviceDto(
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
        assignedTenantId = this.assignedTenant?.id,
        assignedTenantName = this.assignedTenant?.name
    )
}
