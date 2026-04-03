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
    var identifier: String,

    @Column(nullable = false)
    var profile: String = "SINGLE_SITE",

    @Column(name = "hidden_modules")
    var hiddenModules: String? = null,

    @Column(name = "show_advanced_fields", nullable = false)
    var showAdvancedFields: Boolean = false,
) : BaseEntity()
