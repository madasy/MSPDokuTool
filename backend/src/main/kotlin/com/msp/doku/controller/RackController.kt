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
    fun getAllRacks(): List<RackDto> {
        return rackService.getAllRacks()
    }

    @GetMapping("/{id}")
    fun getRack(@PathVariable id: UUID): RackDto {
        return rackService.getRack(id)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createRack(@RequestBody request: CreateRackRequest): RackDto {
        // Mock Room ID for now if not provided, or fail
        // For MVP testing, let's allow creating rack without room if we modify Service to allow it?
        // Service expects Room. Let's create a dummy endpoint or use existing logic.
        // Assuming user sends a valid RoomId, or we fix this later.
        throw UnsupportedOperationException("Need Room ID to create Rack")
    }

    @PostMapping("/{roomId}")
    @ResponseStatus(HttpStatus.CREATED)
    fun createRackInRoom(@PathVariable roomId: UUID, @RequestBody request: CreateRackRequest): RackDto {
        return rackService.createRackWithRoom(request, roomId)
    }

    @PostMapping("/{id}/devices")
    @ResponseStatus(HttpStatus.CREATED)
    fun addDevice(@PathVariable id: UUID, @RequestBody request: CreateDeviceRequest): DeviceDto {
        // Ensure request has rackId set from path
        val enrichedRequest = request.copy(rackId = id)
        return rackService.addDeviceToRack(enrichedRequest)
    }
}
