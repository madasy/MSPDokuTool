package com.msp.doku.service

import com.msp.doku.domain.Device
import com.msp.doku.domain.DeviceStatus
import com.msp.doku.dto.CreateDeviceRequest
import com.msp.doku.dto.DeviceDto
import com.msp.doku.dto.toDeviceDto
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.RackRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class DeviceService(
    private val deviceRepository: DeviceRepository,
    private val rackRepository: RackRepository
) {

    fun getAllDevices(tenantId: UUID? = null): List<DeviceDto> {
        val devices = if (tenantId != null) {
            deviceRepository.findByTenantId(tenantId)
        } else {
            deviceRepository.findAll()
        }
        return devices.map { it.toDeviceDto() }
    }

    fun getDevice(id: UUID): DeviceDto {
        return deviceRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Device not found") }
            .toDeviceDto()
    }

    fun countByTenantId(tenantId: UUID): Long {
        return deviceRepository.countByTenantId(tenantId)
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
            rack = rack,
            rj45Ports = request.rj45Ports,
            sfpPorts = request.sfpPorts
        )
        return deviceRepository.save(device).toDeviceDto()
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
        device.rj45Ports = request.rj45Ports
        device.sfpPorts = request.sfpPorts

        if (request.rackId != null) {
            val rack = rackRepository.findById(request.rackId).orElseThrow { IllegalArgumentException("Rack not found") }
            device.rack = rack
        } else {
            device.rack = null
            device.positionU = null
        }

        return deviceRepository.save(device).toDeviceDto()
    }

    @Transactional
    fun deleteDevice(id: UUID) {
        if (deviceRepository.existsById(id)) {
            deviceRepository.deleteById(id)
        }
    }
}
