package com.msp.doku.dto

import com.msp.doku.domain.TenantType
import java.time.Instant
import java.util.UUID

data class TenantDto(
    val id: UUID,
    val name: String,
    val identifier: String,
    val type: TenantType,
    val createdAt: Instant?,
    val updatedAt: Instant?
)

data class CreateTenantRequest(
    val name: String,
    val identifier: String,
    val type: TenantType = TenantType.CUSTOMER
)
