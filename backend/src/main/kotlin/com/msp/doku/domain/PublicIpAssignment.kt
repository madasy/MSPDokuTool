package com.msp.doku.domain

import jakarta.persistence.*
import java.util.UUID

@Entity
@Table(name = "public_ip_assignments")
class PublicIpAssignment(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "range_id", nullable = false)
    var range: PublicIpRange,

    @Column(name = "ip_address", nullable = false)
    var ipAddress: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_tenant_id")
    var assignedTenant: Tenant? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_device_id")
    var assignedDevice: Device? = null,

    var description: String? = null,

    @Column(nullable = false)
    var status: String = "free"
) : BaseEntity()
