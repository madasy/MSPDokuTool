package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "ip_addresses")
class IpAddress(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subnet_id", nullable = false)
    var subnet: Subnet,

    @Column(columnDefinition = "inet", nullable = false)
    var address: String, // e.g. "192.168.1.50"

    var status: String = "active", // active, reserved, dhcp

    var hostname: String? = null,
    var description: String? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interface_id")
    var networkInterface: Interface? = null

) : BaseEntity()
