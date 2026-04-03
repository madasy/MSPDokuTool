package com.msp.doku.domain

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "agent_keys")
class AgentKey(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    var tenant: Tenant,

    @Column(name = "key_hash", nullable = false)
    var keyHash: String,

    @Column(nullable = false)
    var name: String,

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,

    @Column(name = "last_used")
    var lastUsed: Instant? = null
) : BaseEntity()
