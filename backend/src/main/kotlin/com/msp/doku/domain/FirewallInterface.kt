package com.msp.doku.domain

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "firewall_interfaces")
class FirewallInterface(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    var device: Device,

    @Column(name = "interface_name", nullable = false, length = 50)
    var interfaceName: String,

    @Column(name = "interface_type", nullable = false, length = 30)
    var interfaceType: String = "lan",

    @Column(length = 50)
    var zone: String? = null,

    @Column(name = "ip_address", length = 50)
    var ipAddress: String? = null,

    @Column(name = "subnet_mask", length = 50)
    var subnetMask: String? = null,

    @Column(name = "vlan_id")
    var vlanId: Int? = null,

    @Column(name = "dhcp_enabled")
    var dhcpEnabled: Boolean = false,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @Column(nullable = false, length = 20)
    var status: String = "enabled",

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()

) : BaseEntity()
