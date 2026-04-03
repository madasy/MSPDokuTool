package com.msp.doku.controller

import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/auth")
class AuthController {

    @Value("\${zitadel.issuer:http://localhost:8085}")
    private lateinit var issuerUri: String

    @GetMapping("/config")
    fun getAuthConfig(): Map<String, String> {
        return mapOf(
            "issuer" to issuerUri,
            "authorizationEndpoint" to "$issuerUri/oauth/v2/authorize",
            "tokenEndpoint" to "$issuerUri/oauth/v2/token",
            "userinfoEndpoint" to "$issuerUri/oidc/v1/userinfo",
            "endSessionEndpoint" to "$issuerUri/oidc/v1/end_session"
        )
    }
}
