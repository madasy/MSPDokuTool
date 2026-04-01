package com.msp.doku.controller

import com.msp.doku.dto.CreateDeviceRequest
import com.msp.doku.dto.CreateRackRequest
import com.msp.doku.dto.DeviceDto
import com.msp.doku.dto.RackDto
import com.msp.doku.service.RackService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/racks")
class RackController(
    private val rackService: RackService
) {

    @GetMapping
    fun getRacks(@RequestParam tenantId: UUID): List<RackDto> {
        return rackService.getRacksByTenant(tenantId)
    }

    @GetMapping("/{id}")
    fun getRack(@PathVariable id: UUID): RackDto {
        return rackService.getRack(id)
    }

    @PostMapping("/{roomId}")
    @ResponseStatus(HttpStatus.CREATED)
    fun createRackInRoom(@PathVariable roomId: UUID, @RequestBody request: CreateRackRequest): RackDto {
        return rackService.createRackWithRoom(request, roomId)
    }

    @PostMapping("/{id}/devices")
    @ResponseStatus(HttpStatus.CREATED)
    fun addDevice(@PathVariable id: UUID, @RequestBody request: CreateDeviceRequest): DeviceDto {
        val enrichedRequest = request.copy(rackId = id)
        return rackService.addDeviceToRack(enrichedRequest)
    }
}
