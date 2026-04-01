package com.msp.doku.controller

import com.msp.doku.dto.AutheliaUserDto
import com.msp.doku.dto.CreateAutheliaUserRequest
import com.msp.doku.service.AutheliaUserService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/users")
class UserManagementController(
    private val autheliaUserService: AutheliaUserService
) {

    @GetMapping
    fun getAllUsers(): List<AutheliaUserDto> {
        return autheliaUserService.getAllUsers()
    }

    @GetMapping("/tenant/{tenantIdentifier}")
    fun getUsersByTenant(@PathVariable tenantIdentifier: String): List<AutheliaUserDto> {
        return autheliaUserService.getUsersByTenant(tenantIdentifier)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createUser(@RequestBody request: CreateAutheliaUserRequest): AutheliaUserDto {
        return autheliaUserService.createUser(request)
    }

    @DeleteMapping("/{username}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteUser(@PathVariable username: String) {
        autheliaUserService.deleteUser(username)
    }

    @PutMapping("/{username}/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun resetPassword(@PathVariable username: String, @RequestBody body: Map<String, String>) {
        val newPassword = body["password"] ?: throw IllegalArgumentException("password is required")
        if (newPassword.length < 8) throw IllegalArgumentException("Password must be at least 8 characters")
        autheliaUserService.resetPassword(username, newPassword)
    }

    @PostMapping("/{username}/reset-totp")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun resetTotp(@PathVariable username: String) {
        autheliaUserService.resetTotp(username)
    }

    @GetMapping("/registration-link")
    fun getRegistrationLink(): Map<String, String?> {
        return mapOf("link" to autheliaUserService.getLatestRegistrationLink())
    }
}
