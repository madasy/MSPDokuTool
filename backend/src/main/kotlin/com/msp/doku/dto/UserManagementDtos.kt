package com.msp.doku.dto

import java.time.Instant
import java.util.UUID

data class UserDto(
    val id: UUID, val email: String, val displayName: String?,
    val role: String, val tenantId: UUID?, val tenantName: String?,
    val totpEnabled: Boolean, val isActive: Boolean,
    val lastLogin: Instant?, val createdAt: Instant?
)

data class CreateUserRequest(
    val email: String, val displayName: String?, val password: String,
    val role: String, val tenantId: UUID? = null
)

data class UpdateUserRequest(
    val displayName: String? = null, val role: String? = null,
    val tenantId: UUID? = null, val isActive: Boolean? = null
)

data class ResetPasswordRequest(val newPassword: String)
