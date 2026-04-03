package com.msp.doku.controller

import com.msp.doku.dto.*
import com.msp.doku.service.UserManagementService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/users")
class UserManagementController(private val userManagementService: UserManagementService) {
    @GetMapping
    fun getAllUsers(): List<UserDto> = userManagementService.getAllUsers()

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createUser(@RequestBody request: CreateUserRequest): UserDto = userManagementService.createUser(request)

    @PutMapping("/{id}")
    fun updateUser(@PathVariable id: UUID, @RequestBody request: UpdateUserRequest): UserDto = userManagementService.updateUser(id, request)

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deactivateUser(@PathVariable id: UUID) = userManagementService.deactivateUser(id)

    @PostMapping("/{id}/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun resetPassword(@PathVariable id: UUID, @RequestBody request: ResetPasswordRequest) = userManagementService.resetPassword(id, request)

    @PostMapping("/{id}/reset-totp")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun resetTotp(@PathVariable id: UUID) = userManagementService.resetTotp(id)
}
