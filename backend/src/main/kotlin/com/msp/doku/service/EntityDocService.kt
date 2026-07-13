package com.msp.doku.service

import com.msp.doku.domain.CustomField
import com.msp.doku.domain.DocEntityType
import com.msp.doku.domain.Note
import com.msp.doku.dto.CreateCustomFieldRequest
import com.msp.doku.dto.CreateNoteRequest
import com.msp.doku.dto.CustomFieldDto
import com.msp.doku.dto.NoteDto
import com.msp.doku.dto.UpdateCustomFieldRequest
import com.msp.doku.dto.UpdateNoteRequest
import com.msp.doku.repository.CustomFieldRepository
import com.msp.doku.repository.NoteRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class EntityDocService(
    private val noteRepository: NoteRepository,
    private val customFieldRepository: CustomFieldRepository
) {

    fun getNotes(entityType: DocEntityType, entityId: UUID): List<NoteDto> =
        noteRepository.findByEntityTypeAndEntityIdOrderByUpdatedAtDesc(entityType, entityId).map { it.toDto() }

    @Transactional
    fun createNote(request: CreateNoteRequest): NoteDto {
        val note = Note(
            title = request.title,
            contentMarkdown = request.contentMarkdown,
            entityType = request.entityType,
            entityId = request.entityId
        )
        return noteRepository.save(note).toDto()
    }

    @Transactional
    fun updateNote(id: UUID, request: UpdateNoteRequest): NoteDto {
        val note = noteRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Note not found") }
        note.title = request.title
        note.contentMarkdown = request.contentMarkdown
        return noteRepository.save(note).toDto()
    }

    @Transactional
    fun deleteNote(id: UUID) {
        if (!noteRepository.existsById(id)) throw IllegalArgumentException("Note not found")
        noteRepository.deleteById(id)
    }

    fun getCustomFields(entityType: DocEntityType, entityId: UUID): List<CustomFieldDto> =
        customFieldRepository.findByEntityTypeAndEntityIdOrderByName(entityType, entityId).map { it.toDto() }

    @Transactional
    fun createCustomField(request: CreateCustomFieldRequest): CustomFieldDto {
        if (customFieldRepository.existsByEntityTypeAndEntityIdAndName(request.entityType, request.entityId, request.name)) {
            throw IllegalArgumentException("Feld '${request.name}' existiert bereits für dieses Objekt")
        }
        val field = CustomField(
            name = request.name,
            value = request.value,
            fieldType = request.fieldType,
            entityType = request.entityType,
            entityId = request.entityId
        )
        return customFieldRepository.save(field).toDto()
    }

    @Transactional
    fun updateCustomField(id: UUID, request: UpdateCustomFieldRequest): CustomFieldDto {
        val field = customFieldRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Custom field not found") }
        field.value = request.value
        field.fieldType = request.fieldType
        return customFieldRepository.save(field).toDto()
    }

    @Transactional
    fun deleteCustomField(id: UUID) {
        if (!customFieldRepository.existsById(id)) throw IllegalArgumentException("Custom field not found")
        customFieldRepository.deleteById(id)
    }

    @Transactional
    fun deleteAllForEntity(entityType: DocEntityType, entityId: UUID) {
        noteRepository.deleteByEntityTypeAndEntityId(entityType, entityId)
        customFieldRepository.deleteByEntityTypeAndEntityId(entityType, entityId)
    }

    private fun Note.toDto() = NoteDto(
        id = this.id!!,
        title = this.title,
        contentMarkdown = this.contentMarkdown,
        entityType = this.entityType,
        entityId = this.entityId,
        updatedAt = this.updatedAt
    )

    private fun CustomField.toDto() = CustomFieldDto(
        id = this.id!!,
        name = this.name,
        value = this.value,
        fieldType = this.fieldType,
        entityType = this.entityType,
        entityId = this.entityId
    )
}
