package com.msp.doku.dto

data class AutheliaUserDto(
    val username: String,
    val displayname: String,
    val email: String,
    val groups: List<String>
)

data class CreateAutheliaUserRequest(
    val username: String,
    val displayname: String,
    val email: String,
    val password: String,
    val groups: List<String> = emptyList()
)
