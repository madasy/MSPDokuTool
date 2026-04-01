package com.msp.doku.domain

import jakarta.persistence.*

@Entity
@Table(name = "switch_ports")
class SwitchPort(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    var device: Device,

    @Column(name = "port_number", nullable = false)
    var portNumber: Int,

    @Column(name = "port_name")
    var portName: String? = null,

    @Column(nullable = false)
    var status: String = "down",

    @Column(nullable = false)
    var mode: String = "access",

    @Column(name = "access_vlan_id")
    var accessVlanId: Int? = null,

    @Column(name = "tagged_vlans")
    var taggedVlans: String? = null,

    var speed: String? = null,

    @Column(name = "connected_device")
    var connectedDevice: String? = null,

    var description: String? = null
) : BaseEntity()
