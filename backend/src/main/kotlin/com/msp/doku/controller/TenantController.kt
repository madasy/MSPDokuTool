package com.msp.doku.controller

import com.msp.doku.dto.CreateTenantRequest
import com.msp.doku.dto.TenantDto
import com.msp.doku.dto.TenantHealthDto
import com.msp.doku.dto.TenantSummaryDto
import com.msp.doku.service.TenantService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/tenants")
class TenantController(
    private val tenantService: TenantService
) {

    @GetMapping
    fun getAllTenants(): List<TenantDto> {
        return tenantService.getAllTenants()
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createTenant(@RequestBody request: CreateTenantRequest): TenantDto {
        return tenantService.createTenant(request)
    }

    @GetMapping("/{id}/summary")
    fun getTenantSummary(@PathVariable id: UUID): TenantSummaryDto {
        return tenantService.getSummary(id)
    }

    @GetMapping("/{id}/health")
    fun getTenantHealth(@PathVariable id: UUID): TenantHealthDto {
        return tenantService.getHealth(id)
    }
}
