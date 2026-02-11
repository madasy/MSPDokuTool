package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "group_role_mappings")
class GroupRoleMapping(
    @Column(name = "entra_group_oid", nullable = false)
    var entraGroupOid: String,

    @Column(name = "role_name", nullable = false)
    var roleName: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id")
    var tenant: Tenant? = null, // Global if null

    var description: String? = null

) : BaseEntity()
