package com.msp.doku.dto

import java.util.UUID

data class AssignmentRequest(
    val assignedTenantId: UUID?
)

data class AssignmentResponse(
    val id: UUID,
    val assignedTenantId: UUID?,
    val assignedTenantName: String?
)
