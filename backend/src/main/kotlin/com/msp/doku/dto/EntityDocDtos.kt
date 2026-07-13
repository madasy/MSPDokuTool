package com.msp.doku.dto

import com.msp.doku.domain.DocEntityType
import com.msp.doku.domain.FieldType
import java.time.Instant
import java.util.UUID

data class NoteDto(
    val id: UUID,
    val title: String,
    val contentMarkdown: String,
    val entityType: DocEntityType,
    val entityId: UUID,
    val updatedAt: Instant?
)

data class CreateNoteRequest(
    val title: String,
    val contentMarkdown: String,
    val entityType: DocEntityType,
    val entityId: UUID
)

data class UpdateNoteRequest(
    val title: String,
    val contentMarkdown: String
)

data class CustomFieldDto(
    val id: UUID,
    val name: String,
    val value: String,
    val fieldType: FieldType,
    val entityType: DocEntityType,
    val entityId: UUID
)

data class CreateCustomFieldRequest(
    val name: String,
    val value: String,
    val fieldType: FieldType = FieldType.TEXT,
    val entityType: DocEntityType,
    val entityId: UUID
)

data class UpdateCustomFieldRequest(
    val value: String,
    val fieldType: FieldType = FieldType.TEXT
)
