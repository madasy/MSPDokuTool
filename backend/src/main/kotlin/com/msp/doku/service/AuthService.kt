package com.msp.doku.service

import com.msp.doku.domain.User
import com.msp.doku.domain.UserRole
import com.msp.doku.dto.*
import com.msp.doku.repository.UserRepository
import dev.samstevens.totp.code.DefaultCodeGenerator
import dev.samstevens.totp.code.DefaultCodeVerifier
import dev.samstevens.totp.secret.DefaultSecretGenerator
import dev.samstevens.totp.time.SystemTimeProvider
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val jwtService: JwtService
) {
    private val passwordEncoder = BCryptPasswordEncoder()
    private val secretGenerator = DefaultSecretGenerator()
    private val codeVerifier = DefaultCodeVerifier(DefaultCodeGenerator(), SystemTimeProvider())

    fun getAuthConfig(): AuthConfigResponse = AuthConfigResponse(setupRequired = userRepository.count() == 0L)

    @Transactional
    fun setup(request: SetupRequest): LoginResponse {
        if (userRepository.count() > 0) throw IllegalStateException("Setup already completed")
        val user = User(
            email = request.email, displayName = request.displayName,
            passwordHash = passwordEncoder.encode(request.password),
            role = UserRole.ADMIN, isActive = true
        )
        return createLoginResponse(userRepository.save(user))
    }

    @Transactional
    fun login(request: LoginRequest): LoginResponse {
        val user = userRepository.findByEmail(request.email) ?: throw IllegalArgumentException("Invalid credentials")
        if (!user.isActive) throw IllegalArgumentException("Account deactivated")
        if (!passwordEncoder.matches(request.password, user.passwordHash)) throw IllegalArgumentException("Invalid credentials")

        if (user.totpEnabled) {
            return LoginResponse(pendingToken = jwtService.generatePendingTotpToken(user.id!!), requiresTotp = true)
        }

        user.lastLogin = Instant.now()
        userRepository.save(user)
        return createLoginResponse(user)
    }

    @Transactional
    fun verifyTotp(request: TotpVerifyRequest): LoginResponse {
        val claims = jwtService.validateToken(request.pendingToken) ?: throw IllegalArgumentException("Invalid token")
        if (claims.get("type", String::class.java) != "pending_totp") throw IllegalArgumentException("Invalid token type")
        val user = userRepository.findById(UUID.fromString(claims.subject)).orElseThrow { IllegalArgumentException("User not found") }
        if (user.totpSecret == null || !codeVerifier.isValidCode(user.totpSecret, request.code)) throw IllegalArgumentException("Invalid TOTP code")
        user.lastLogin = Instant.now()
        userRepository.save(user)
        return createLoginResponse(user)
    }

    fun getCurrentUser(userId: UUID): AuthUserDto {
        return userRepository.findById(userId).orElseThrow { IllegalArgumentException("User not found") }.toAuthDto()
    }

    fun refreshToken(refreshToken: String): LoginResponse {
        val claims = jwtService.validateToken(refreshToken) ?: throw IllegalArgumentException("Invalid refresh token")
        if (claims.get("type", String::class.java) != "refresh") throw IllegalArgumentException("Invalid token type")
        val user = userRepository.findById(UUID.fromString(claims.subject)).orElseThrow { IllegalArgumentException("User not found") }
        if (!user.isActive) throw IllegalArgumentException("Account deactivated")
        return createLoginResponse(user)
    }

    fun setupTotp(userId: UUID): TotpSetupResponse {
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("User not found") }
        val secret = secretGenerator.generate()
        user.totpSecret = secret
        userRepository.save(user)
        return TotpSetupResponse(secret = secret, qrCodeUri = "otpauth://totp/MSP%20DokuTool:${user.email}?secret=$secret&issuer=MSP%20DokuTool")
    }

    @Transactional
    fun confirmTotp(userId: UUID, code: String) {
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("User not found") }
        if (user.totpSecret == null) throw IllegalArgumentException("TOTP not set up")
        if (!codeVerifier.isValidCode(user.totpSecret, code)) throw IllegalArgumentException("Invalid code")
        user.totpEnabled = true
        userRepository.save(user)
    }

    @Transactional
    fun disableTotp(userId: UUID) {
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("User not found") }
        if (user.totpRequired) throw IllegalArgumentException("TOTP is required for your role")
        user.totpSecret = null; user.totpEnabled = false
        userRepository.save(user)
    }

    @Transactional
    fun changePassword(userId: UUID, request: ChangePasswordRequest) {
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("User not found") }
        if (!passwordEncoder.matches(request.currentPassword, user.passwordHash)) throw IllegalArgumentException("Current password incorrect")
        user.passwordHash = passwordEncoder.encode(request.newPassword)
        userRepository.save(user)
    }

    private fun createLoginResponse(user: User): LoginResponse {
        val token = jwtService.generateAccessToken(user.id!!, user.email, user.displayName, user.role.name, user.tenant?.id)
        return LoginResponse(token = token, user = user.toAuthDto())
    }

    private fun User.toAuthDto() = AuthUserDto(
        id = this.id!!, email = this.email, displayName = this.displayName,
        role = this.role.name, tenantId = this.tenant?.id,
        totpEnabled = this.totpEnabled, totpRequired = this.totpRequired
    )
}
