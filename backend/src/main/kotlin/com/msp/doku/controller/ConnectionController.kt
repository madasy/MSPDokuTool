package com.msp.doku.controller

import com.msp.doku.dto.*
import com.msp.doku.service.ConnectionService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1")
class ConnectionController(private val connectionService: ConnectionService) {

    @GetMapping("/devices/{deviceId}/connections")
    fun getDeviceConnections(@PathVariable deviceId: UUID): DeviceConnectionSummary {
        return connectionService.getDeviceConnections(deviceId)
    }

    @GetMapping("/devices/{deviceId}/interfaces")
    fun getInterfaces(@PathVariable deviceId: UUID): List<InterfaceDto> {
        return connectionService.getInterfacesForDevice(deviceId)
    }

    @PostMapping("/interfaces")
    @ResponseStatus(HttpStatus.CREATED)
    fun createInterface(@RequestBody request: CreateInterfaceRequest): InterfaceDto {
        return connectionService.createInterface(request)
    }

    @DeleteMapping("/interfaces/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteInterface(@PathVariable id: UUID) {
        connectionService.deleteInterface(id)
    }

    @GetMapping("/connections")
    fun getConnections(@RequestParam tenantId: UUID): List<ConnectionDto> {
        return connectionService.getConnectionsForTenant(tenantId)
    }

    @PostMapping("/connections")
    @ResponseStatus(HttpStatus.CREATED)
    fun createConnection(@RequestBody request: CreateConnectionRequest): ConnectionDto {
        return connectionService.createConnection(request)
    }

    @DeleteMapping("/connections/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteConnection(@PathVariable id: UUID) {
        connectionService.deleteConnection(id)
    }
}
