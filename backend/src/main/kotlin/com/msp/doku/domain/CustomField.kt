package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.util.UUID

enum class FieldType { TEXT, NUMBER, URL, DATE }

@Entity
@Table(name = "custom_fields")
class CustomField(
    @Column(nullable = false)
    var name: String,

    @Column(nullable = false)
    var value: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "field_type", nullable = false)
    var fieldType: FieldType = FieldType.TEXT,

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false)
    var entityType: DocEntityType,

    @Column(name = "entity_id", nullable = false)
    var entityId: UUID
) : BaseEntity()
