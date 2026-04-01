package com.msp.doku.controller

import com.msp.doku.dto.DocumentationOverviewDto
import com.msp.doku.dto.DocumentationSectionDto
import com.msp.doku.dto.UpdateDocumentationRequest
import com.msp.doku.service.DocumentationService
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/docs")
class DocumentationController(
    private val documentationService: DocumentationService
) {

    @GetMapping
    fun getOverview(@PathVariable tenantId: UUID): List<DocumentationOverviewDto> {
        return documentationService.getOverview(tenantId)
    }

    @GetMapping("/{sectionType}")
    fun getSection(@PathVariable tenantId: UUID, @PathVariable sectionType: String): DocumentationSectionDto {
        return documentationService.getSection(tenantId, sectionType)
    }

    @PutMapping("/{sectionType}")
    fun updateSection(
        @PathVariable tenantId: UUID,
        @PathVariable sectionType: String,
        @RequestBody request: UpdateDocumentationRequest
    ): DocumentationSectionDto {
        return documentationService.updateSection(tenantId, sectionType, request)
    }
}
