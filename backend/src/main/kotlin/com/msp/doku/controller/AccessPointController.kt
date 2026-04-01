package com.msp.doku.controller

import com.msp.doku.dto.AccessPointDto
import com.msp.doku.dto.CreateAccessPointRequest
import com.msp.doku.service.AccessPointService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/access-points")
class AccessPointController(
    private val accessPointService: AccessPointService
) {

    @GetMapping
    fun getAccessPoints(@RequestParam tenantId: UUID): List<AccessPointDto> {
        return accessPointService.getByTenant(tenantId)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@RequestBody request: CreateAccessPointRequest): AccessPointDto {
        return accessPointService.create(request)
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: UUID) {
        accessPointService.delete(id)
    }
}
