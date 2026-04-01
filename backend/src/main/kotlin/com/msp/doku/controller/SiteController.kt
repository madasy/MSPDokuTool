package com.msp.doku.controller

import com.msp.doku.dto.CreateSiteRequest
import com.msp.doku.dto.SiteDto
import com.msp.doku.service.SiteService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/sites")
class SiteController(
    private val siteService: SiteService
) {

    @GetMapping
    fun getSites(@RequestParam tenantId: UUID): List<SiteDto> {
        return siteService.getSitesByTenant(tenantId)
    }

    @GetMapping("/{id}")
    fun getSite(@PathVariable id: UUID): SiteDto {
        return siteService.getSite(id)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createSite(@RequestBody request: CreateSiteRequest): SiteDto {
        return siteService.createSite(request)
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteSite(@PathVariable id: UUID) {
        siteService.deleteSite(id)
    }
}
