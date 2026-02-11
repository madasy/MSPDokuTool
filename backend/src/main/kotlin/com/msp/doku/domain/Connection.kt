package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.OneToOne
import jakarta.persistence.Table

@Entity
@Table(name = "connections")
class Connection(
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "endpoint_a_id", nullable = false, unique = true)
    var endpointA: Interface,

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "endpoint_b_id", nullable = false, unique = true)
    var endpointB: Interface,

    @Column(name = "cable_type")
    var cableType: String? = null,

    var status: String = "active"

) : BaseEntity()
