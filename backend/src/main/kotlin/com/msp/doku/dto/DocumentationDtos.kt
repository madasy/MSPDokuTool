package com.msp.doku.dto

import java.time.Instant
import java.util.UUID

data class DocumentationSectionDto(
    val id: UUID,
    val sectionType: String,
    val structuredData: Map<String, Any>,
    val notes: String?,
    val updatedBy: String?,
    val version: Int,
    val createdAt: Instant?,
    val updatedAt: Instant?
)

data class UpdateDocumentationRequest(
    val structuredData: Map<String, Any>? = null,
    val notes: String? = null
)

data class DocumentationOverviewDto(
    val sectionType: String,
    val exists: Boolean,
    val updatedAt: Instant?,
    val completionPercent: Int
)
