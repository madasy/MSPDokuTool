package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "users")
class User(
    @Column(nullable = false, unique = true)
    var email: String,

    var name: String? = null,

    @Column(name = "external_id", unique = true)
    var externalId: String? = null,

    @Column(name = "last_login")
    var lastLogin: Instant? = null
) : BaseEntity()
