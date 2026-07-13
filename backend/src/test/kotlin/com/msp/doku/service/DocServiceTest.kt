package com.msp.doku.service

import com.msp.doku.domain.CustomField
import com.msp.doku.domain.DocEntityType
import com.msp.doku.domain.FieldType
import com.msp.doku.domain.Note
import com.msp.doku.dto.CreateCustomFieldRequest
import com.msp.doku.dto.CreateNoteRequest
import com.msp.doku.repository.CustomFieldRepository
import com.msp.doku.repository.NoteRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.util.UUID

class DocServiceTest {

    private val noteRepository: NoteRepository = mock()
    private val customFieldRepository: CustomFieldRepository = mock()

    private val service = DocService(noteRepository, customFieldRepository)

    @Test
    fun `createNote persists and maps`() {
        val deviceId = UUID.randomUUID()
        whenever(noteRepository.save(any<Note>())).thenAnswer { inv ->
            (inv.arguments[0] as Note).apply { id = UUID.randomUUID() }
        }

        val dto = service.createNote(
            CreateNoteRequest(
                title = "Failover Runbook",
                contentMarkdown = "## Schritte\n1. HA-Status prüfen",
                entityType = DocEntityType.DEVICE,
                entityId = deviceId
            )
        )

        assertEquals("Failover Runbook", dto.title)
        assertEquals(DocEntityType.DEVICE, dto.entityType)
        assertEquals(deviceId, dto.entityId)
    }

    @Test
    fun `createCustomField rejects duplicate name per entity`() {
        val entityId = UUID.randomUUID()
        whenever(
            customFieldRepository.existsByEntityTypeAndEntityIdAndName(DocEntityType.DEVICE, entityId, "Supportvertrag")
        ).thenReturn(true)

        assertThrows<IllegalArgumentException> {
            service.createCustomField(
                CreateCustomFieldRequest(
                    name = "Supportvertrag", value = "FC-2026-042",
                    fieldType = FieldType.TEXT,
                    entityType = DocEntityType.DEVICE, entityId = entityId
                )
            )
        }
    }

    @Test
    fun `deleteAllForEntity removes notes and custom fields`() {
        val entityId = UUID.randomUUID()

        service.deleteAllForEntity(DocEntityType.VPN_TUNNEL, entityId)

        verify(noteRepository).deleteByEntityTypeAndEntityId(DocEntityType.VPN_TUNNEL, entityId)
        verify(customFieldRepository).deleteByEntityTypeAndEntityId(DocEntityType.VPN_TUNNEL, entityId)
    }
}
