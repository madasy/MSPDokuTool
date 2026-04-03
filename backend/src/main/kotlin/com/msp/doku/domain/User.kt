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
