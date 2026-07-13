package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table

enum class TenantType {
    MSP, CUSTOMER
}

@Entity
@Table(name = "tenants")
class Tenant(
    @Column(nullable = false)
    var name: String,

    @Column(nullable = false, unique = true)
    var identifier: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: TenantType = TenantType.CUSTOMER
) : BaseEntity()
