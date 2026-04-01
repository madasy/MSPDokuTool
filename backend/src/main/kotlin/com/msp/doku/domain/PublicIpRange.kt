package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "public_ip_ranges")
class PublicIpRange(
    @Column(nullable = false)
    var cidr: String,

    var description: String? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_tenant_id")
    var assignedTenant: Tenant? = null,

    var provider: String? = null,

    @Column(nullable = false)
    var status: String = "active"
) : BaseEntity()
