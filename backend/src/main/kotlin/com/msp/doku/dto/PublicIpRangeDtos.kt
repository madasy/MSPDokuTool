package com.msp.doku.dto

import java.time.Instant
import java.util.UUID

data class PublicIpRangeDto(
    val id: UUID,
    val cidr: String,
    val description: String?,
    val assignedTenantId: UUID?,
    val assignedTenantName: String?,
    val provider: String?,
    val status: String,
    val createdAt: Instant?,
    val updatedAt: Instant?
)

data class CreatePublicIpRangeRequest(
    val cidr: String,
    val description: String? = null,
    val assignedTenantId: UUID? = null,
    val provider: String? = null,
    val status: String = "active"
)

data class UpdatePublicIpRangeRequest(
    val cidr: String? = null,
    val description: String? = null,
    val assignedTenantId: UUID? = null,
    val provider: String? = null,
    val status: String? = null
)

data class PublicIpAssignmentDto(
    val id: UUID,
    val ipAddress: String,
    val assignedTenantId: UUID?,
    val assignedTenantName: String?,
    val assignedDeviceId: UUID?,
    val assignedDeviceName: String?,
    val description: String?,
    val status: String
)

data class UpdateIpAssignmentRequest(
    val assignedTenantId: UUID? = null,
    val assignedDeviceId: UUID? = null,
    val description: String? = null,
    val status: String? = null
)
