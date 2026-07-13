package com.msp.doku.controller

import com.msp.doku.dto.CreateVpnTunnelRequest
import com.msp.doku.dto.VpnTunnelDto
import com.msp.doku.service.VpnTunnelService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/vpn-tunnels")
class VpnTunnelController(
    private val vpnTunnelService: VpnTunnelService
) {

    @GetMapping
    fun getTunnels(@RequestParam(required = false) tenantId: UUID?): List<VpnTunnelDto> {
        return vpnTunnelService.getTunnels(tenantId)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createTunnel(@RequestBody request: CreateVpnTunnelRequest): VpnTunnelDto {
        return vpnTunnelService.createTunnel(request)
    }

    @PutMapping("/{id}")
    fun updateTunnel(@PathVariable id: UUID, @RequestBody request: CreateVpnTunnelRequest): VpnTunnelDto {
        return vpnTunnelService.updateTunnel(id, request)
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteTunnel(@PathVariable id: UUID) {
        vpnTunnelService.deleteTunnel(id)
    }
}
