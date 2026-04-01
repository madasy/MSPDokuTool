package com.msp.doku.dto

import java.time.Instant
import java.util.UUID

data class TenantDto(
    val id: UUID,
    val name: String,
    val identifier: String,
    val createdAt: Instant?,
    val updatedAt: Instant?
)

data class CreateTenantRequest(
    val name: String,
    val identifier: String
)

data class TenantSummaryDto(
    val deviceCount: Long,
    val devicesByType: Map<String, Long>,
    val subnetCount: Long,
    val ipUtilization: Double,
    val rackCount: Long
)
