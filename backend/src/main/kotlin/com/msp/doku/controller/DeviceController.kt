package com.msp.doku.controller

import com.msp.doku.dto.CreateDeviceRequest
import com.msp.doku.dto.DeviceDto
import com.msp.doku.service.DeviceService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/devices")
class DeviceController(
    private val deviceService: DeviceService
) {

    @GetMapping
    fun getAllDevices(@RequestParam(required = false) tenantId: UUID?): List<DeviceDto> {
        return deviceService.getAllDevices(tenantId)
    }

    @GetMapping("/{id}")
    fun getDevice(@PathVariable id: UUID): DeviceDto {
        return deviceService.getDevice(id)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createDevice(@RequestBody request: CreateDeviceRequest): DeviceDto {
        return deviceService.createDevice(request)
    }

    @PutMapping("/{id}")
    fun updateDevice(@PathVariable id: UUID, @RequestBody request: CreateDeviceRequest): DeviceDto {
        return deviceService.updateDevice(id, request)
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteDevice(@PathVariable id: UUID) {
        deviceService.deleteDevice(id)
    }
}
