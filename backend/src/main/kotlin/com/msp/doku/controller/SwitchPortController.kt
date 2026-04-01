package com.msp.doku.controller

import com.msp.doku.dto.InitializePortsRequest
import com.msp.doku.dto.SwitchPortDto
import com.msp.doku.dto.UpdateSwitchPortRequest
import com.msp.doku.service.SwitchPortService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/devices/{deviceId}/ports")
class SwitchPortController(
    private val switchPortService: SwitchPortService
) {

    @GetMapping
    fun getPorts(@PathVariable deviceId: UUID): List<SwitchPortDto> {
        return switchPortService.getPortsForDevice(deviceId)
    }

    @PostMapping("/initialize")
    @ResponseStatus(HttpStatus.CREATED)
    fun initializePorts(@PathVariable deviceId: UUID, @RequestBody request: InitializePortsRequest): List<SwitchPortDto> {
        return switchPortService.initializePorts(deviceId, request)
    }

    @PutMapping("/{portNumber}")
    fun updatePort(
        @PathVariable deviceId: UUID,
        @PathVariable portNumber: Int,
        @RequestBody request: UpdateSwitchPortRequest
    ): SwitchPortDto {
        return switchPortService.updatePort(deviceId, portNumber, request)
    }
}
