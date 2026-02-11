package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.net.InetAddress
import java.util.UUID

// Note: Hibernate doesn't support 'inet' / 'cidr' types natively without custom user types or hypersistence-utils.
// For now we map to String or use specific library if available. 
// Given the docker setup, we might need a library. 
// "io.hypersistence:hypersistence-utils-hibernate-63:3.7.0" is good.
// For MVP without external lib, we use String and cast in SQL or use custom converter.
// Schema has 'cidr' type. JDBC driver maps it to PGobject.

@Entity
@Table(name = "subnets")
class Subnet(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    var tenant: Tenant,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vlan_id")
    var vlan: Vlan? = null,

    @Column(columnDefinition = "cidr", nullable = false)
    var cidr: String, // e.g. "192.168.1.0/24"

    @Column(columnDefinition = "inet")
    var gateway: String? = null,

    @Column(name = "dhcp_start", columnDefinition = "inet")
    var dhcpStart: String? = null,

    @Column(name = "dhcp_end", columnDefinition = "inet")
    var dhcpEnd: String? = null,

    var description: String? = null

) : BaseEntity()
