package com.msp.doku.repository

import com.msp.doku.domain.CustomField
import com.msp.doku.domain.DocEntityType
import com.msp.doku.domain.Note
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface NoteRepository : JpaRepository<Note, UUID> {
    fun findByEntityTypeAndEntityIdOrderByUpdatedAtDesc(entityType: DocEntityType, entityId: UUID): List<Note>
    fun deleteByEntityTypeAndEntityId(entityType: DocEntityType, entityId: UUID)
}

@Repository
interface CustomFieldRepository : JpaRepository<CustomField, UUID> {
    fun findByEntityTypeAndEntityIdOrderByName(entityType: DocEntityType, entityId: UUID): List<CustomField>
    fun existsByEntityTypeAndEntityIdAndName(entityType: DocEntityType, entityId: UUID, name: String): Boolean
    fun deleteByEntityTypeAndEntityId(entityType: DocEntityType, entityId: UUID)
}
