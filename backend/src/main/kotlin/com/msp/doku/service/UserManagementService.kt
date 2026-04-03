package com.msp.doku.service

import com.msp.doku.domain.User
import com.msp.doku.domain.UserRole
import com.msp.doku.dto.*
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.UserRepository
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class UserManagementService(
    private val userRepository: UserRepository,
    private val tenantRepository: TenantRepository
) {
    private val passwordEncoder = BCryptPasswordEncoder()

    fun getAllUsers(): List<UserDto> = userRepository.findAll().map { it.toDto() }

    @Transactional
    fun createUser(request: CreateUserRequest): UserDto {
        if (userRepository.findByEmail(request.email) != null) throw IllegalArgumentException("Email already exists")
        val role = UserRole.valueOf(request.role)
        val tenant = request.tenantId?.let { tenantRepository.findById(it).orElseThrow { IllegalArgumentException("Tenant not found") } }
        val user = User(
            email = request.email, displayName = request.displayName,
            passwordHash = passwordEncoder.encode(request.password),
            role = role, tenant = tenant,
            totpRequired = role == UserRole.TENANT_USER, isActive = true
        )
        return userRepository.save(user).toDto()
    }

    @Transactional
    fun updateUser(id: UUID, request: UpdateUserRequest): UserDto {
        val user = userRepository.findById(id).orElseThrow { IllegalArgumentException("User not found") }
        request.displayName?.let { user.displayName = it }
        request.role?.let { user.role = UserRole.valueOf(it) }
        request.tenantId?.let { user.tenant = tenantRepository.findById(it).orElseThrow { IllegalArgumentException("Tenant not found") } }
        request.isActive?.let { user.isActive = it }
        return userRepository.save(user).toDto()
    }

    @Transactional
    fun deactivateUser(id: UUID) {
        val user = userRepository.findById(id).orElseThrow { IllegalArgumentException("User not found") }
        user.isActive = false
        userRepository.save(user)
    }

    @Transactional
    fun resetPassword(id: UUID, request: ResetPasswordRequest) {
        val user = userRepository.findById(id).orElseThrow { IllegalArgumentException("User not found") }
        user.passwordHash = passwordEncoder.encode(request.newPassword)
        userRepository.save(user)
    }

    @Transactional
    fun resetTotp(id: UUID) {
        val user = userRepository.findById(id).orElseThrow { IllegalArgumentException("User not found") }
        user.totpSecret = null; user.totpEnabled = false
        userRepository.save(user)
    }

    private fun User.toDto() = UserDto(
        id = this.id!!, email = this.email, displayName = this.displayName,
        role = this.role.name, tenantId = this.tenant?.id, tenantName = this.tenant?.name,
        totpEnabled = this.totpEnabled, isActive = this.isActive,
        lastLogin = this.lastLogin, createdAt = this.createdAt
    )
}
