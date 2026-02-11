package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "racks")
class Rack(
    @Column(nullable = false)
    var name: String,

    @Column(name = "height_units", nullable = false)
    var heightUnits: Int = 42,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    // Note: Room entity not created yet, using placeholder or need to create Room entity
    // For now assuming Room exists or we link to Site directly? Schema says room_id.
    // Let's create Room entity first.
    var room: Room
) : BaseEntity()
