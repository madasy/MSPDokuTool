package com.msp.doku.controller

import com.msp.doku.dto.CreateFirewallInterfaceRequest
import com.msp.doku.dto.FirewallInterfaceDto
import com.msp.doku.dto.UpdateFirewallInterfaceRequest
import com.msp.doku.service.FirewallInterfaceService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/devices/{deviceId}/interfaces")
class FirewallInterfaceController(
    private val firewallInterfaceService: FirewallInterfaceService
) {

    @GetMapping
    fun getInterfaces(@PathVariable deviceId: UUID): List<FirewallInterfaceDto> {
        return firewallInterfaceService.getInterfaces(deviceId)
    }

    @PostMapping
    fun createInterface(
        @PathVariable deviceId: UUID,
        @RequestBody request: CreateFirewallInterfaceRequest
    ): ResponseEntity<FirewallInterfaceDto> {
        val iface = firewallInterfaceService.createInterface(deviceId, request)
        return ResponseEntity.status(201).body(iface)
    }

    @PutMapping("/{interfaceName}")
    fun updateInterface(
        @PathVariable deviceId: UUID,
        @PathVariable interfaceName: String,
        @RequestBody request: UpdateFirewallInterfaceRequest
    ): FirewallInterfaceDto {
        return firewallInterfaceService.updateInterface(deviceId, interfaceName, request)
    }

    @DeleteMapping("/{interfaceName}")
    fun deleteInterface(
        @PathVariable deviceId: UUID,
        @PathVariable interfaceName: String
    ): ResponseEntity<Void> {
        firewallInterfaceService.deleteInterface(deviceId, interfaceName)
        return ResponseEntity.noContent().build()
    }
}
