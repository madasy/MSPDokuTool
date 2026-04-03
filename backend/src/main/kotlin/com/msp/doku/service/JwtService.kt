package com.msp.doku.service

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.util.Date
import java.util.UUID
import javax.crypto.SecretKey

@Service
class JwtService(
    @Value("\${jwt.secret}") private val secret: String,
    @Value("\${jwt.access-token-expiry:900000}") private val accessTokenExpiry: Long,
    @Value("\${jwt.refresh-token-expiry:604800000}") private val refreshTokenExpiry: Long
) {
    private val key: SecretKey by lazy { Keys.hmacShaKeyFor(secret.toByteArray()) }

    fun generateAccessToken(userId: UUID, email: String, displayName: String?, role: String, tenantId: UUID?): String {
        return Jwts.builder()
            .subject(userId.toString())
            .claim("email", email)
            .claim("name", displayName ?: email)
            .claim("role", role)
            .claim("tenantId", tenantId?.toString())
            .issuedAt(Date())
            .expiration(Date(System.currentTimeMillis() + accessTokenExpiry))
            .signWith(key)
            .compact()
    }

    fun generateRefreshToken(userId: UUID): String {
        return Jwts.builder()
            .subject(userId.toString())
            .claim("type", "refresh")
            .issuedAt(Date())
            .expiration(Date(System.currentTimeMillis() + refreshTokenExpiry))
            .signWith(key)
            .compact()
    }

    fun generatePendingTotpToken(userId: UUID): String {
        return Jwts.builder()
            .subject(userId.toString())
            .claim("type", "pending_totp")
            .issuedAt(Date())
            .expiration(Date(System.currentTimeMillis() + 300000))
            .signWith(key)
            .compact()
    }

    fun validateToken(token: String): Claims? {
        return try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token).payload
        } catch (e: Exception) { null }
    }

    fun getUserIdFromToken(token: String): UUID? = validateToken(token)?.subject?.let { UUID.fromString(it) }
}
