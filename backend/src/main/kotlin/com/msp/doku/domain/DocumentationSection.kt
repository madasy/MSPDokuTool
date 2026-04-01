package com.msp.doku.domain

import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

@Entity
@Table(name = "documentation_sections")
class DocumentationSection(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    var tenant: Tenant,

    @Column(name = "section_type", nullable = false)
    var sectionType: String,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "structured_data", columnDefinition = "jsonb")
    var structuredData: Map<String, Any> = emptyMap(),

    @Column(columnDefinition = "TEXT")
    var notes: String? = null,

    @Column(name = "updated_by")
    var updatedBy: String? = null,

    @Column(nullable = false)
    var version: Int = 1
) : BaseEntity()
