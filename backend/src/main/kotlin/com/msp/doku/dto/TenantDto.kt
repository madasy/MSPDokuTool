package com.msp.doku.dto

import java.time.Instant
import java.util.UUID

data class TenantDto(
    val id: UUID,
    val name: String,
    val identifier: String,
    val createdAt: Instant?,
    val updatedAt: Instant?,
    val profile: String,
    val hiddenModules: List<String>,
    val showAdvancedFields: Boolean
)

data class CreateTenantRequest(
    val name: String,
    val identifier: String
)

data class UpdateTenantRequest(
    val name: String? = null,
    val profile: String? = null,
    val hiddenModules: List<String>? = null,
    val showAdvancedFields: Boolean? = null
)

data class TenantSummaryDto(
    val deviceCount: Long,
    val devicesByType: Map<String, Long>,
    val subnetCount: Long,
    val ipUtilization: Double,
    val rackCount: Long
)

data class TenantHealthDto(
    val overallScore: Int,
    val overallLevel: String,  // "basic", "operational", "managed", "fully_documented"
    val categories: List<CategoryScoreDto>,
    val actions: List<ActionItemDto>
)

data class CategoryScoreDto(
    val category: String,
    val score: Int,
    val color: String  // "green", "amber", "red"
)

data class ActionItemDto(
    val severity: String,  // "critical", "warning", "info", "ok"
    val title: String,
    val description: String,
    val link: String
)
