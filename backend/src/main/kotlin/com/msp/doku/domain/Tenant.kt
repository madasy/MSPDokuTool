package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "tenants")
class Tenant(
    @Column(nullable = false)
    var name: String,

    @Column(nullable = false, unique = true)
    var identifier: String
) : BaseEntity()
