# Built-in Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ZITADEL with built-in JWT authentication, TOTP 2FA, user management, and first-start admin creation.

**Architecture:** Spring Security with custom JWT filter. Backend issues/validates JWTs signed with HMAC-SHA256. TOTP via `dev.samstevens.totp`. React frontend stores access token in memory, refresh token in httpOnly cookie. No external IdP.

**Tech Stack:** Kotlin/Spring Boot 3.3, jjwt 0.12.6, totp 1.7.1, React 19, TypeScript

---

## File Structure

### Files to Delete
- `authelia/` directory (all files)
- `frontend/src/pages/SetupPage.tsx` (replaced with new version)

### Files to Create
- `backend/src/main/resources/db/migration/V13__add_auth_fields_to_users.sql`
- `backend/src/main/kotlin/com/msp/doku/service/JwtService.kt`
- `backend/src/main/kotlin/com/msp/doku/service/AuthService.kt`
- `backend/src/main/kotlin/com/msp/doku/service/UserManagementService.kt`
- `backend/src/main/kotlin/com/msp/doku/config/JwtAuthenticationFilter.kt`
- `backend/src/main/kotlin/com/msp/doku/dto/AuthDtos.kt`
- `backend/src/main/kotlin/com/msp/doku/dto/UserManagementDtos.kt`
- `backend/src/main/kotlin/com/msp/doku/controller/UserManagementController.kt`
- `frontend/src/services/AuthService.ts`

### Files to Modify
- `docker-compose.yml` — remove ZITADEL services
- `backend/build.gradle.kts` — replace oauth2-resource-server with jjwt + totp deps
- `backend/src/main/resources/application.properties` — replace ZITADEL with JWT config
- `backend/src/main/kotlin/com/msp/doku/domain/User.kt` — add auth fields
- `backend/src/main/kotlin/com/msp/doku/config/SecurityConfig.kt` — custom JWT filter
- `backend/src/main/kotlin/com/msp/doku/controller/AuthController.kt` — login/setup/TOTP endpoints
- `backend/src/main/kotlin/com/msp/doku/repository/CoreRepositories.kt` — add user query methods
- `frontend/src/auth/AuthProvider.tsx` — replace OIDC with JWT
- `frontend/src/pages/LoginPage.tsx` — email/password + TOTP form
- `frontend/src/pages/SetupPage.tsx` — first-start admin creation
- `frontend/src/App.tsx` — update routes
- `frontend/src/components/layout/Layout.tsx` — user profile from JWT
- `frontend/src/services/UserService.ts` — new user management API
- `frontend/src/pages/UserManagementPage.tsx` — admin user management

---

## Task 1: Remove ZITADEL from Docker & Clean Up

**Files:**
- Modify: `docker-compose.yml`
- Delete: `authelia/` directory

- [ ] **Step 1: Simplify docker-compose.yml**

Replace the entire `docker-compose.yml` with:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: mspdoku-postgres
    environment:
      POSTGRES_DB: mspdoku
      POSTGRES_USER: mspuser
      POSTGRES_PASSWORD: msppassword
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U mspuser -d mspdoku" ]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: mspdoku-backend
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/mspdoku
      SPRING_DATASOURCE_USERNAME: mspuser
      SPRING_DATASOURCE_PASSWORD: msppassword
      JWT_SECRET: mspdoku-dev-secret-change-in-production-32chars
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: mspdoku-frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

- [ ] **Step 2: Delete authelia directory**

```bash
rm -rf authelia/
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "cleanup: remove ZITADEL and Authelia, simplify docker-compose"
```

---

## Task 2: Database Migration & User Entity

**Files:**
- Create: `backend/src/main/resources/db/migration/V13__add_auth_fields_to_users.sql`
- Modify: `backend/src/main/kotlin/com/msp/doku/domain/User.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/repository/CoreRepositories.kt`

- [ ] **Step 1: Create Flyway migration V13**

Create `backend/src/main/resources/db/migration/V13__add_auth_fields_to_users.sql`:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'TENANT_USER';
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_required BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
```

- [ ] **Step 2: Update User entity**

Replace `backend/src/main/kotlin/com/msp/doku/domain/User.kt`:

```kotlin
package com.msp.doku.domain

import jakarta.persistence.*
import java.time.Instant

enum class UserRole {
    ADMIN, TECHNICIAN, TENANT_USER
}

@Entity
@Table(name = "users")
class User(
    @Column(nullable = false, unique = true)
    var email: String,

    @Column(name = "display_name")
    var displayName: String? = null,

    @Column(name = "password_hash")
    var passwordHash: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var role: UserRole = UserRole.TENANT_USER,

    @Column(name = "totp_secret")
    var totpSecret: String? = null,

    @Column(name = "totp_enabled", nullable = false)
    var totpEnabled: Boolean = false,

    @Column(name = "totp_required", nullable = false)
    var totpRequired: Boolean = false,

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id")
    var tenant: Tenant? = null,

    @Column(name = "external_id", unique = true)
    var externalId: String? = null,

    @Column(name = "last_login")
    var lastLogin: Instant? = null
) : BaseEntity()
```

- [ ] **Step 3: Update UserRepository**

Read `backend/src/main/kotlin/com/msp/doku/repository/CoreRepositories.kt` first, then add methods to UserRepository:

```kotlin
@Repository
interface UserRepository : JpaRepository<User, UUID> {
    fun findByEmail(email: String): User?
    fun findByExternalId(externalId: String): User?
    fun findByTenantId(tenantId: UUID): List<User>
    fun findByIsActiveTrue(): List<User>
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(backend): add auth fields to user entity and migration V13"
```

---

## Task 3: Backend Dependencies & Config

**Files:**
- Modify: `backend/build.gradle.kts`
- Modify: `backend/src/main/resources/application.properties`

- [ ] **Step 1: Update build.gradle.kts dependencies**

Read the file first. Replace the auth-related dependencies:

Remove:
```kotlin
implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
implementation("org.yaml:snakeyaml:2.2")
runtimeOnly("org.xerial:sqlite-jdbc:3.45.1.0")
```

Add:
```kotlin
implementation("io.jsonwebtoken:jjwt-api:0.12.6")
runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
implementation("dev.samstevens.totp:totp:1.7.1")
```

Keep `spring-security-crypto` (used for BCrypt).

- [ ] **Step 2: Update application.properties**

Replace the ZITADEL lines with:

```properties
# JWT Configuration
jwt.secret=${JWT_SECRET:mspdoku-dev-secret-must-be-at-least-32-characters-long}
jwt.access-token-expiry=900000
jwt.refresh-token-expiry=604800000
```

Remove:
```properties
zitadel.issuer=${ZITADEL_ISSUER:http://localhost:8085}
spring.security.oauth2.resourceserver.jwt.issuer-uri=${ZITADEL_ISSUER:http://localhost:8085}
spring.security.oauth2.resourceserver.jwt.jwk-set-uri=${ZITADEL_ISSUER:http://localhost:8085}/oauth/v2/keys
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(backend): add JWT and TOTP dependencies, remove ZITADEL config"
```

---

## Task 4: JWT Service & Auth DTOs

**Files:**
- Create: `backend/src/main/kotlin/com/msp/doku/service/JwtService.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/dto/AuthDtos.kt`

- [ ] **Step 1: Create AuthDtos.kt**

Create `backend/src/main/kotlin/com/msp/doku/dto/AuthDtos.kt`:

```kotlin
package com.msp.doku.dto

import java.time.Instant
import java.util.UUID

data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val token: String? = null,
    val pendingToken: String? = null,
    val requiresTotp: Boolean = false,
    val user: AuthUserDto? = null
)

data class TotpVerifyRequest(
    val pendingToken: String,
    val code: String
)

data class SetupRequest(
    val email: String,
    val displayName: String,
    val password: String
)

data class AuthConfigResponse(
    val setupRequired: Boolean
)

data class AuthUserDto(
    val id: UUID,
    val email: String,
    val displayName: String?,
    val role: String,
    val tenantId: UUID?,
    val totpEnabled: Boolean,
    val totpRequired: Boolean
)

data class TotpSetupResponse(
    val secret: String,
    val qrCodeUri: String
)

data class TotpConfirmRequest(
    val code: String
)

data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)
```

- [ ] **Step 2: Create JwtService.kt**

Create `backend/src/main/kotlin/com/msp/doku/service/JwtService.kt`:

```kotlin
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
    @Value("\${jwt.secret}")
    private val secret: String,

    @Value("\${jwt.access-token-expiry:900000}")
    private val accessTokenExpiry: Long,

    @Value("\${jwt.refresh-token-expiry:604800000}")
    private val refreshTokenExpiry: Long
) {

    private val key: SecretKey by lazy {
        Keys.hmacShaKeyFor(secret.toByteArray())
    }

    fun generateAccessToken(
        userId: UUID,
        email: String,
        displayName: String?,
        role: String,
        tenantId: UUID?
    ): String {
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
            .expiration(Date(System.currentTimeMillis() + 300000)) // 5 min
            .signWith(key)
            .compact()
    }

    fun validateToken(token: String): Claims? {
        return try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token).payload
        } catch (e: Exception) {
            null
        }
    }

    fun getUserIdFromToken(token: String): UUID? {
        return validateToken(token)?.subject?.let { UUID.fromString(it) }
    }

    fun getRoleFromToken(token: String): String? {
        return validateToken(token)?.get("role", String::class.java)
    }

    fun getTokenType(token: String): String? {
        return validateToken(token)?.get("type", String::class.java)
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(backend): add JWT service and auth DTOs"
```

---

## Task 5: Auth Service & Security Config

**Files:**
- Create: `backend/src/main/kotlin/com/msp/doku/service/AuthService.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/config/JwtAuthenticationFilter.kt`
- Modify: `backend/src/main/kotlin/com/msp/doku/config/SecurityConfig.kt`

- [ ] **Step 1: Create AuthService.kt**

Create `backend/src/main/kotlin/com/msp/doku/service/AuthService.kt`:

```kotlin
package com.msp.doku.service

import com.msp.doku.domain.User
import com.msp.doku.domain.UserRole
import com.msp.doku.dto.*
import com.msp.doku.repository.UserRepository
import dev.samstevens.totp.code.CodeGenerator
import dev.samstevens.totp.code.CodeVerifier
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
    private val codeGenerator: CodeGenerator = DefaultCodeGenerator()
    private val codeVerifier: CodeVerifier = DefaultCodeVerifier(codeGenerator, SystemTimeProvider())

    fun getAuthConfig(): AuthConfigResponse {
        val userCount = userRepository.count()
        return AuthConfigResponse(setupRequired = userCount == 0L)
    }

    @Transactional
    fun setup(request: SetupRequest): LoginResponse {
        if (userRepository.count() > 0) {
            throw IllegalStateException("Setup already completed")
        }

        val user = User(
            email = request.email,
            displayName = request.displayName,
            passwordHash = passwordEncoder.encode(request.password),
            role = UserRole.ADMIN,
            isActive = true
        )
        val saved = userRepository.save(user)
        return createLoginResponse(saved)
    }

    @Transactional
    fun login(request: LoginRequest): LoginResponse {
        val user = userRepository.findByEmail(request.email)
            ?: throw IllegalArgumentException("Invalid credentials")

        if (!user.isActive) {
            throw IllegalArgumentException("Account is deactivated")
        }

        if (!passwordEncoder.matches(request.password, user.passwordHash)) {
            throw IllegalArgumentException("Invalid credentials")
        }

        // Check if TOTP is required/enabled
        if (user.totpEnabled || user.totpRequired) {
            if (user.totpEnabled) {
                // Has TOTP set up — need verification
                val pendingToken = jwtService.generatePendingTotpToken(user.id!!)
                return LoginResponse(pendingToken = pendingToken, requiresTotp = true)
            } else {
                // TOTP required but not set up yet — let them in, they'll set up from profile
                // For now, allow login and flag it
                user.lastLogin = Instant.now()
                userRepository.save(user)
                return createLoginResponse(user)
            }
        }

        user.lastLogin = Instant.now()
        userRepository.save(user)
        return createLoginResponse(user)
    }

    @Transactional
    fun verifyTotp(request: TotpVerifyRequest): LoginResponse {
        val claims = jwtService.validateToken(request.pendingToken)
            ?: throw IllegalArgumentException("Invalid or expired token")

        if (claims.get("type", String::class.java) != "pending_totp") {
            throw IllegalArgumentException("Invalid token type")
        }

        val userId = UUID.fromString(claims.subject)
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("User not found") }

        if (user.totpSecret == null || !codeVerifier.isValidCode(user.totpSecret, request.code)) {
            throw IllegalArgumentException("Invalid TOTP code")
        }

        user.lastLogin = Instant.now()
        userRepository.save(user)
        return createLoginResponse(user)
    }

    fun getCurrentUser(userId: UUID): AuthUserDto {
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("User not found") }
        return user.toAuthDto()
    }

    fun refreshToken(refreshToken: String): LoginResponse {
        val claims = jwtService.validateToken(refreshToken)
            ?: throw IllegalArgumentException("Invalid refresh token")

        if (claims.get("type", String::class.java) != "refresh") {
            throw IllegalArgumentException("Invalid token type")
        }

        val userId = UUID.fromString(claims.subject)
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("User not found") }

        if (!user.isActive) throw IllegalArgumentException("Account deactivated")

        return createLoginResponse(user)
    }

    // --- TOTP self-service ---

    fun setupTotp(userId: UUID): TotpSetupResponse {
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("User not found") }
        val secret = secretGenerator.generate()
        user.totpSecret = secret
        userRepository.save(user)

        val uri = "otpauth://totp/MSP%20DokuTool:${user.email}?secret=$secret&issuer=MSP%20DokuTool"
        return TotpSetupResponse(secret = secret, qrCodeUri = uri)
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
        user.totpSecret = null
        user.totpEnabled = false
        userRepository.save(user)
    }

    @Transactional
    fun changePassword(userId: UUID, request: ChangePasswordRequest) {
        val user = userRepository.findById(userId).orElseThrow { IllegalArgumentException("User not found") }
        if (!passwordEncoder.matches(request.currentPassword, user.passwordHash)) {
            throw IllegalArgumentException("Current password is incorrect")
        }
        user.passwordHash = passwordEncoder.encode(request.newPassword)
        userRepository.save(user)
    }

    private fun createLoginResponse(user: User): LoginResponse {
        val token = jwtService.generateAccessToken(
            userId = user.id!!,
            email = user.email,
            displayName = user.displayName,
            role = user.role.name,
            tenantId = user.tenant?.id
        )
        val refreshToken = jwtService.generateRefreshToken(user.id!!)
        return LoginResponse(token = token, user = user.toAuthDto())
    }

    private fun User.toAuthDto() = AuthUserDto(
        id = this.id!!,
        email = this.email,
        displayName = this.displayName,
        role = this.role.name,
        tenantId = this.tenant?.id,
        totpEnabled = this.totpEnabled,
        totpRequired = this.totpRequired
    )
}
```

- [ ] **Step 2: Create JwtAuthenticationFilter.kt**

Create `backend/src/main/kotlin/com/msp/doku/config/JwtAuthenticationFilter.kt`:

```kotlin
package com.msp.doku.config

import com.msp.doku.service.JwtService
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthenticationFilter(
    private val jwtService: JwtService
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val authHeader = request.getHeader("Authorization")
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            val token = authHeader.substring(7)
            val claims = jwtService.validateToken(token)

            if (claims != null && claims.get("type", String::class.java) == null) {
                // Only accept access tokens (no type claim), not refresh/pending tokens
                val userId = claims.subject
                val role = claims.get("role", String::class.java) ?: "TENANT_USER"
                val authorities = listOf(SimpleGrantedAuthority("ROLE_$role"))

                val auth = UsernamePasswordAuthenticationToken(userId, null, authorities)
                SecurityContextHolder.getContext().authentication = auth
            }
        }

        filterChain.doFilter(request, response)
    }
}
```

- [ ] **Step 3: Replace SecurityConfig.kt**

Replace `backend/src/main/kotlin/com/msp/doku/config/SecurityConfig.kt`:

```kotlin
package com.msp.doku.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val jwtAuthenticationFilter: JwtAuthenticationFilter
) {

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .cors { it.configurationSource(corsConfigurationSource()) }
            .authorizeHttpRequests { auth ->
                auth.requestMatchers("/actuator/**").permitAll()
                auth.requestMatchers("/api/v1/auth/login").permitAll()
                auth.requestMatchers("/api/v1/auth/setup").permitAll()
                auth.requestMatchers("/api/v1/auth/config").permitAll()
                auth.requestMatchers("/api/v1/auth/totp/verify").permitAll()
                auth.requestMatchers("/api/v1/auth/refresh").permitAll()
                auth.anyRequest().authenticated()
            }
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val configuration = CorsConfiguration()
        configuration.allowedOrigins = listOf(
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000"
        )
        configuration.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
        configuration.allowedHeaders = listOf("*")
        configuration.allowCredentials = true
        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", configuration)
        return source
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(backend): add AuthService, JWT filter, and SecurityConfig"
```

---

## Task 6: Auth Controller

**Files:**
- Modify: `backend/src/main/kotlin/com/msp/doku/controller/AuthController.kt`

- [ ] **Step 1: Replace AuthController.kt**

```kotlin
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
class AuthController(
    private val authService: AuthService
) {

    @GetMapping("/config")
    fun getConfig(): AuthConfigResponse {
        return authService.getAuthConfig()
    }

    @PostMapping("/setup")
    @ResponseStatus(HttpStatus.CREATED)
    fun setup(@RequestBody request: SetupRequest): LoginResponse {
        return authService.setup(request)
    }

    @PostMapping("/login")
    fun login(@RequestBody request: LoginRequest): ResponseEntity<LoginResponse> {
        return try {
            val response = authService.login(request)
            ResponseEntity.ok(response)
        } catch (e: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(LoginResponse(token = null, user = null))
        }
    }

    @PostMapping("/totp/verify")
    fun verifyTotp(@RequestBody request: TotpVerifyRequest): ResponseEntity<LoginResponse> {
        return try {
            val response = authService.verifyTotp(request)
            ResponseEntity.ok(response)
        } catch (e: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(LoginResponse(token = null, user = null))
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
        return try {
            ResponseEntity.ok(authService.refreshToken(refreshToken))
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }
    }

    // Self-service TOTP
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
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(backend): add auth endpoints (login, setup, TOTP, self-service)"
```

---

## Task 7: User Management Backend

**Files:**
- Create: `backend/src/main/kotlin/com/msp/doku/dto/UserManagementDtos.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/service/UserManagementService.kt`
- Create: `backend/src/main/kotlin/com/msp/doku/controller/UserManagementController.kt`

- [ ] **Step 1: Create UserManagementDtos.kt**

```kotlin
package com.msp.doku.dto

import java.time.Instant
import java.util.UUID

data class UserDto(
    val id: UUID,
    val email: String,
    val displayName: String?,
    val role: String,
    val tenantId: UUID?,
    val tenantName: String?,
    val totpEnabled: Boolean,
    val isActive: Boolean,
    val lastLogin: Instant?,
    val createdAt: Instant?
)

data class CreateUserRequest(
    val email: String,
    val displayName: String?,
    val password: String,
    val role: String,
    val tenantId: UUID? = null
)

data class UpdateUserRequest(
    val displayName: String? = null,
    val role: String? = null,
    val tenantId: UUID? = null,
    val isActive: Boolean? = null
)

data class ResetPasswordRequest(
    val newPassword: String
)
```

- [ ] **Step 2: Create UserManagementService.kt**

```kotlin
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

    fun getAllUsers(): List<UserDto> {
        return userRepository.findAll().map { it.toDto() }
    }

    @Transactional
    fun createUser(request: CreateUserRequest): UserDto {
        if (userRepository.findByEmail(request.email) != null) {
            throw IllegalArgumentException("Email already exists")
        }

        val role = UserRole.valueOf(request.role)
        val tenant = request.tenantId?.let {
            tenantRepository.findById(it).orElseThrow { IllegalArgumentException("Tenant not found") }
        }

        val user = User(
            email = request.email,
            displayName = request.displayName,
            passwordHash = passwordEncoder.encode(request.password),
            role = role,
            tenant = tenant,
            totpRequired = role == UserRole.TENANT_USER,
            isActive = true
        )
        return userRepository.save(user).toDto()
    }

    @Transactional
    fun updateUser(id: UUID, request: UpdateUserRequest): UserDto {
        val user = userRepository.findById(id).orElseThrow { IllegalArgumentException("User not found") }

        request.displayName?.let { user.displayName = it }
        request.role?.let { user.role = UserRole.valueOf(it) }
        request.tenantId?.let { tenantId ->
            user.tenant = tenantRepository.findById(tenantId).orElseThrow { IllegalArgumentException("Tenant not found") }
        }
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
        user.totpSecret = null
        user.totpEnabled = false
        userRepository.save(user)
    }

    private fun User.toDto() = UserDto(
        id = this.id!!,
        email = this.email,
        displayName = this.displayName,
        role = this.role.name,
        tenantId = this.tenant?.id,
        tenantName = this.tenant?.name,
        totpEnabled = this.totpEnabled,
        isActive = this.isActive,
        lastLogin = this.lastLogin,
        createdAt = this.createdAt
    )
}
```

- [ ] **Step 3: Create UserManagementController.kt**

```kotlin
package com.msp.doku.controller

import com.msp.doku.dto.*
import com.msp.doku.service.UserManagementService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/users")
class UserManagementController(
    private val userManagementService: UserManagementService
) {

    @GetMapping
    fun getAllUsers(): List<UserDto> {
        return userManagementService.getAllUsers()
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createUser(@RequestBody request: CreateUserRequest): UserDto {
        return userManagementService.createUser(request)
    }

    @PutMapping("/{id}")
    fun updateUser(@PathVariable id: UUID, @RequestBody request: UpdateUserRequest): UserDto {
        return userManagementService.updateUser(id, request)
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deactivateUser(@PathVariable id: UUID) {
        userManagementService.deactivateUser(id)
    }

    @PostMapping("/{id}/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun resetPassword(@PathVariable id: UUID, @RequestBody request: ResetPasswordRequest) {
        userManagementService.resetPassword(id, request)
    }

    @PostMapping("/{id}/reset-totp")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun resetTotp(@PathVariable id: UUID) {
        userManagementService.resetTotp(id)
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(backend): add user management service and controller"
```

---

## Task 8: Frontend Auth — AuthProvider, Login, Setup

**Files:**
- Create: `frontend/src/services/AuthService.ts`
- Modify: `frontend/src/auth/AuthProvider.tsx`
- Modify: `frontend/src/pages/LoginPage.tsx`
- Modify: `frontend/src/pages/SetupPage.tsx`
- Modify: `frontend/src/services/apiClient.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/package.json` (remove oidc-client-ts)

- [ ] **Step 1: Create AuthService.ts**

Create `frontend/src/services/AuthService.ts`:

```typescript
const API_BASE = '/api/v1/auth';

export interface AuthUser {
    id: string;
    email: string;
    displayName: string | null;
    role: 'ADMIN' | 'TECHNICIAN' | 'TENANT_USER';
    tenantId: string | null;
    totpEnabled: boolean;
    totpRequired: boolean;
}

export interface LoginResponse {
    token: string | null;
    pendingToken: string | null;
    requiresTotp: boolean;
    user: AuthUser | null;
}

export interface AuthConfig {
    setupRequired: boolean;
}

export interface TotpSetupResponse {
    secret: string;
    qrCodeUri: string;
}

async function authFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...((options?.headers as Record<string, string>) || {}),
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
}

export const AuthServiceApi = {
    getConfig: () => authFetch<AuthConfig>('/config'),
    setup: (data: { email: string; displayName: string; password: string }) =>
        authFetch<LoginResponse>('/setup', { method: 'POST', body: JSON.stringify(data) }),
    login: (email: string, password: string) =>
        authFetch<LoginResponse>('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    verifyTotp: (pendingToken: string, code: string) =>
        authFetch<LoginResponse>('/totp/verify', { method: 'POST', body: JSON.stringify({ pendingToken, code }) }),
    getMe: (token: string) =>
        authFetch<AuthUser>('/me', { headers: { Authorization: `Bearer ${token}` } }),
    setupTotp: (token: string) =>
        authFetch<TotpSetupResponse>('/me/totp/setup', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
    confirmTotp: (token: string, code: string) =>
        authFetch<void>('/me/totp/confirm', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ code }) }),
};
```

- [ ] **Step 2: Replace AuthProvider.tsx**

Replace `frontend/src/auth/AuthProvider.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setTokenGetter } from '../services/apiClient';
import { AuthServiceApi, type AuthUser, type LoginResponse } from '../services/AuthService';

interface AuthContextType {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    setupRequired: boolean;
    pendingToken: string | null;
    login: (email: string, password: string) => Promise<LoginResponse>;
    verifyTotp: (code: string) => Promise<LoginResponse>;
    logout: () => void;
    setAuthFromResponse: (response: LoginResponse) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    setupRequired: false,
    pendingToken: null,
    login: async () => ({ token: null, pendingToken: null, requiresTotp: false, user: null }),
    verifyTotp: async () => ({ token: null, pendingToken: null, requiresTotp: false, user: null }),
    logout: () => {},
    setAuthFromResponse: () => {},
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [pendingToken, setPendingToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [setupRequired, setSetupRequired] = useState(false);

    // Check auth config on mount
    useEffect(() => {
        AuthServiceApi.getConfig()
            .then((config) => {
                setSetupRequired(config.setupRequired);
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    // Wire token to apiClient
    useEffect(() => {
        setTokenGetter(() => token);
    }, [token]);

    // Listen for 401 events
    useEffect(() => {
        const handler = () => {
            setToken(null);
            setUser(null);
        };
        window.addEventListener('auth:unauthorized', handler);
        return () => window.removeEventListener('auth:unauthorized', handler);
    }, []);

    const setAuthFromResponse = (response: LoginResponse) => {
        if (response.token && response.user) {
            setToken(response.token);
            setUser(response.user);
            setSetupRequired(false);
            setPendingToken(null);
        }
        if (response.pendingToken) {
            setPendingToken(response.pendingToken);
        }
    };

    const login = async (email: string, password: string): Promise<LoginResponse> => {
        const response = await AuthServiceApi.login(email, password);
        setAuthFromResponse(response);
        return response;
    };

    const verifyTotp = async (code: string): Promise<LoginResponse> => {
        if (!pendingToken) throw new Error('No pending token');
        const response = await AuthServiceApi.verifyTotp(pendingToken, code);
        setAuthFromResponse(response);
        return response;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setPendingToken(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!token && !!user,
            isLoading,
            setupRequired,
            pendingToken,
            login,
            verifyTotp,
            logout,
            setAuthFromResponse,
        }}>
            {children}
        </AuthContext.Provider>
    );
}
```

- [ ] **Step 3: Replace LoginPage.tsx**

Replace `frontend/src/pages/LoginPage.tsx`:

```tsx
import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Loader2, AlertCircle } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function LoginPage() {
    const { isAuthenticated, isLoading, setupRequired, login, verifyTotp, pendingToken } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showTotp, setShowTotp] = useState(false);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 size={32} className="animate-spin text-primary-400" />
            </div>
        );
    }

    if (setupRequired) return <Navigate to="/setup" replace />;
    if (isAuthenticated) return <Navigate to="/" replace />;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const response = await login(email, password);
            if (response.requiresTotp) {
                setShowTotp(true);
            }
        } catch {
            setError('Ungültige Anmeldedaten');
        } finally {
            setSubmitting(false);
        }
    };

    const handleTotp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await verifyTotp(totpCode);
        } catch {
            setError('Ungültiger TOTP-Code');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="w-full max-w-sm mx-4">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-xl bg-primary-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">D</div>
                    <h1 className="text-xl font-bold text-white">MSP DokuTool</h1>
                    <p className="text-slate-400 text-sm mt-1">IT Infrastructure Documentation</p>
                </div>

                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-900/20 rounded-lg border border-red-800/30">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {!showTotp ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">E-Mail</label>
                                <input type="email" required className="input w-full" value={email}
                                    onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" autoFocus />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Passwort</label>
                                <input type="password" required className="input w-full" value={password}
                                    onChange={e => setPassword(e.target.value)} placeholder="Passwort" />
                            </div>
                            <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Anmelden'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleTotp} className="space-y-4">
                            <p className="text-sm text-slate-300 text-center">Gib den 6-stelligen Code aus deiner Authenticator-App ein</p>
                            <div>
                                <input type="text" required className="input w-full text-center text-2xl tracking-widest font-mono"
                                    value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000" maxLength={6} autoFocus />
                            </div>
                            <button type="submit" disabled={submitting || totpCode.length !== 6} className="btn-primary w-full py-2.5">
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Bestätigen'}
                            </button>
                            <button type="button" onClick={() => { setShowTotp(false); setTotpCode(''); }}
                                className="text-xs text-slate-400 hover:text-white text-center w-full">Zurück zum Login</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Replace SetupPage.tsx**

Replace `frontend/src/pages/SetupPage.tsx`:

```tsx
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthServiceApi } from '../services/AuthService';
import { Loader2, AlertCircle } from 'lucide-react';

export default function SetupPage() {
    const { setupRequired, setAuthFromResponse, isAuthenticated } = useAuth();
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!setupRequired) return <Navigate to="/login" replace />;
    if (isAuthenticated) return <Navigate to="/" replace />;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password.length < 8) { setError('Passwort muss mindestens 8 Zeichen haben'); return; }
        if (password !== confirmPassword) { setError('Passwörter stimmen nicht überein'); return; }
        setSubmitting(true);
        try {
            const response = await AuthServiceApi.setup({ email, displayName, password });
            setAuthFromResponse(response);
        } catch (err) {
            setError((err as Error).message || 'Setup fehlgeschlagen');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="w-full max-w-md mx-4">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-xl bg-primary-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">D</div>
                    <h1 className="text-xl font-bold text-white">Ersteinrichtung</h1>
                    <p className="text-slate-400 text-sm mt-1">Erstelle den ersten Administrator-Account</p>
                </div>

                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-900/20 rounded-lg border border-red-800/30">
                            <AlertCircle size={16} />{error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">E-Mail *</label>
                            <input type="email" required className="input w-full" value={email}
                                onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" autoFocus />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Anzeigename</label>
                            <input type="text" className="input w-full" value={displayName}
                                onChange={e => setDisplayName(e.target.value)} placeholder="Admin User" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Passwort *</label>
                            <input type="password" required minLength={8} className="input w-full" value={password}
                                onChange={e => setPassword(e.target.value)} placeholder="Mindestens 8 Zeichen" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Passwort bestätigen *</label>
                            <input type="password" required className="input w-full" value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)} placeholder="Passwort wiederholen" />
                        </div>
                        <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Admin erstellen & starten'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 5: Update App.tsx**

Read current App.tsx. Make these changes:
1. Remove import of `SetupPage` from old path (if any), keep the new one
2. Remove the `/auth/callback` route
3. Keep the `/setup` and `/login` routes
4. Add `/admin/users` route for user management

- [ ] **Step 6: Update Layout.tsx logout and user profile**

In the Layout component:
1. Import `useAuth` from `../../auth/AuthProvider`
2. Add `const { user, logout } = useAuth();` in the component
3. Replace hardcoded user display with `user?.displayName` and `user?.role`
4. Replace logout button to call `logout()`
5. Show "Benutzer" nav item only for ADMIN role

- [ ] **Step 7: Remove oidc-client-ts from package.json**

Read `package.json` and remove `"oidc-client-ts"` from dependencies.

- [ ] **Step 8: Update UserService.ts and UserManagementPage.tsx**

Update `frontend/src/services/UserService.ts` to match the new backend API (remove Authelia references). The service should call:
- `GET /api/v1/users` — list users
- `POST /api/v1/users` — create user
- `DELETE /api/v1/users/{id}` — deactivate
- `POST /api/v1/users/{id}/reset-password` — reset password
- `POST /api/v1/users/{id}/reset-totp` — reset TOTP

Update `UserManagementPage.tsx` to use the new UserService and show users from the new API (the page structure stays the same, just update the API calls and data types).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(frontend): replace OIDC with built-in JWT auth, login page, setup page"
```

---

## Task 9: Build & Verify

- [ ] **Step 1: Build Docker images**

```bash
docker compose build
```

- [ ] **Step 2: Start fresh**

```bash
docker compose down -v
docker compose up -d
```

- [ ] **Step 3: Verify**

1. Open http://localhost:3000 → should show Setup page (first start, 0 users)
2. Create admin account → auto-login → dashboard
3. Create a tenant → go to tenant → create a TENANT_USER
4. Logout → login as tenant user → verify 2FA flow
5. Verify admin can manage users at `/admin/users`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: address issues from integration testing"
```
