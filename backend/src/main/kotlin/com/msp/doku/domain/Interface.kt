package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "interfaces")
class Interface(
    @Column(nullable = false)
    var name: String, // e.g. Gi1/0/1

    @Column(name = "mac_address")
    var macAddress: String? = null,

    var type: String = "copper", // copper, fiber, virtual

    var description: String? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    var device: Device

) : BaseEntity()
