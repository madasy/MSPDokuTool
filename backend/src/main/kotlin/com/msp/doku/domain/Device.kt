package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

enum class DeviceType {
    SERVER, SWITCH, ROUTER, FIREWALL, PATCHPANEL, PDU, WIFI_AP, OTHER
}

enum class DeviceStatus {
    ACTIVE, PLANNED, STORAGE, RETIRED
}

@Entity
@Table(name = "devices")
class Device(
    @Column(nullable = false)
    var name: String,

    var model: String? = null,
    
    @Column(name = "serial_number")
    var serialNumber: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "device_type", nullable = false)
    var deviceType: DeviceType,

    @Enumerated(EnumType.STRING)
    var status: DeviceStatus = DeviceStatus.ACTIVE,

    // Rack Position
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rack_id")
    var rack: Rack? = null,

    @Column(name = "position_u")
    var positionU: Int? = null,

    @Column(name = "height_u")
    var heightU: Int = 1,

    var facing: String = "front", // front/rear

    @Column(name = "management_ip")
    var managementIp: String? = null,

    @Column(name = "mac_address")
    var macAddress: String? = null,

    @Column(name = "rj45_ports")
    var rj45Ports: Int = 0,

    @Column(name = "sfp_ports")
    var sfpPorts: Int = 0,

    // If not in Rack
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id")
    var site: Site? = null

) : BaseEntity()
