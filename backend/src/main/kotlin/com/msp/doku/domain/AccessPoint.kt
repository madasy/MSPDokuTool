package com.msp.doku.domain

import jakarta.persistence.*

@Entity
@Table(name = "access_points")
class AccessPoint(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "site_id", nullable = false)
    var site: Site,

    @Column(nullable = false)
    var name: String,

    var model: String? = null,

    @Column(name = "mac_address")
    var macAddress: String? = null,

    @Column(name = "ip_address")
    var ipAddress: String? = null,

    @Column(name = "location_description")
    var locationDescription: String? = null,

    var floor: String? = null,
    var room: String? = null,

    @Column(name = "mount_type")
    var mountType: String = "ceiling",

    @Column(nullable = false)
    var status: String = "active",

    var channel: String? = null,
    var ssids: String? = null
) : BaseEntity()
