package com.msp.doku.dto

import java.util.UUID

data class LoginRequest(val email: String, val password: String)

data class LoginResponse(
    val token: String? = null,
    val pendingToken: String? = null,
    val requiresTotp: Boolean = false,
    val user: AuthUserDto? = null
)

data class TotpVerifyRequest(val pendingToken: String, val code: String)

data class SetupRequest(val email: String, val displayName: String, val password: String)

data class AuthConfigResponse(val setupRequired: Boolean)

data class AuthUserDto(
    val id: UUID, val email: String, val displayName: String?,
    val role: String, val tenantId: UUID?,
    val totpEnabled: Boolean, val totpRequired: Boolean
)

data class TotpSetupResponse(val secret: String, val qrCodeUri: String)
data class TotpConfirmRequest(val code: String)
data class ChangePasswordRequest(val currentPassword: String, val newPassword: String)
