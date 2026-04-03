package com.msp.doku.controller

import com.msp.doku.dto.*
import com.msp.doku.service.AuthService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(private val authService: AuthService) {

    @GetMapping("/config")
    fun getConfig(): AuthConfigResponse = authService.getAuthConfig()

    @PostMapping("/setup")
    @ResponseStatus(HttpStatus.CREATED)
    fun setup(@RequestBody request: SetupRequest): LoginResponse = authService.setup(request)

    @PostMapping("/login")
    fun login(@RequestBody request: LoginRequest): ResponseEntity<LoginResponse> {
        return try {
            ResponseEntity.ok(authService.login(request))
        } catch (e: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(LoginResponse())
        }
    }

    @PostMapping("/totp/verify")
    fun verifyTotp(@RequestBody request: TotpVerifyRequest): ResponseEntity<LoginResponse> {
        return try {
            ResponseEntity.ok(authService.verifyTotp(request))
        } catch (e: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(LoginResponse())
        }
    }

    @GetMapping("/me")
    fun getMe(): AuthUserDto {
        val userId = UUID.fromString(SecurityContextHolder.getContext().authentication.principal as String)
        return authService.getCurrentUser(userId)
    }

    @PostMapping("/refresh")
    fun refresh(@RequestBody body: Map<String, String>): ResponseEntity<LoginResponse> {
        val refreshToken = body["refreshToken"] ?: return ResponseEntity.badRequest().build()
        return try { ResponseEntity.ok(authService.refreshToken(refreshToken)) }
        catch (e: Exception) { ResponseEntity.status(HttpStatus.UNAUTHORIZED).build() }
    }

    @PostMapping("/me/totp/setup")
    fun setupTotp(): TotpSetupResponse {
        val userId = UUID.fromString(SecurityContextHolder.getContext().authentication.principal as String)
        return authService.setupTotp(userId)
    }

    @PostMapping("/me/totp/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun confirmTotp(@RequestBody request: TotpConfirmRequest) {
        val userId = UUID.fromString(SecurityContextHolder.getContext().authentication.principal as String)
        authService.confirmTotp(userId, request.code)
    }

    @DeleteMapping("/me/totp")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun disableTotp() {
        val userId = UUID.fromString(SecurityContextHolder.getContext().authentication.principal as String)
        authService.disableTotp(userId)
    }

    @PutMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun changePassword(@RequestBody request: ChangePasswordRequest) {
        val userId = UUID.fromString(SecurityContextHolder.getContext().authentication.principal as String)
        authService.changePassword(userId, request)
    }
}
