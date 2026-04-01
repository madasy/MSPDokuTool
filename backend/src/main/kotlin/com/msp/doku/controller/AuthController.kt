package com.msp.doku.controller

import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/auth")
class AuthController {

    @GetMapping("/me")
    fun getCurrentUser(): Map<String, Any?> {
        val auth = SecurityContextHolder.getContext().authentication
        val details = auth?.details as? Map<*, *>

        return mapOf(
            "username" to (auth?.name ?: "anonymous"),
            "email" to (details?.get("email") ?: ""),
            "displayName" to (details?.get("name") ?: auth?.name ?: ""),
            "groups" to (details?.get("groups") ?: emptyList<String>()),
            "authorities" to (auth?.authorities?.map { it.authority } ?: emptyList())
        )
    }
}
