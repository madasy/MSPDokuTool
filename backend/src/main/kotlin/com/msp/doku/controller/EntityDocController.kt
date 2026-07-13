package com.msp.doku.controller

import com.msp.doku.domain.DocEntityType
import com.msp.doku.dto.CreateCustomFieldRequest
import com.msp.doku.dto.CreateNoteRequest
import com.msp.doku.dto.CustomFieldDto
import com.msp.doku.dto.NoteDto
import com.msp.doku.dto.UpdateCustomFieldRequest
import com.msp.doku.dto.UpdateNoteRequest
import com.msp.doku.service.EntityDocService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1")
class EntityDocController(
    private val entityDocService: EntityDocService
) {

    @GetMapping("/notes")
    fun getNotes(@RequestParam entityType: DocEntityType, @RequestParam entityId: UUID): List<NoteDto> =
        entityDocService.getNotes(entityType, entityId)

    @PostMapping("/notes")
    @ResponseStatus(HttpStatus.CREATED)
    fun createNote(@RequestBody request: CreateNoteRequest): NoteDto = entityDocService.createNote(request)

    @PutMapping("/notes/{id}")
    fun updateNote(@PathVariable id: UUID, @RequestBody request: UpdateNoteRequest): NoteDto =
        entityDocService.updateNote(id, request)

    @DeleteMapping("/notes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteNote(@PathVariable id: UUID) = entityDocService.deleteNote(id)

    @GetMapping("/custom-fields")
    fun getCustomFields(@RequestParam entityType: DocEntityType, @RequestParam entityId: UUID): List<CustomFieldDto> =
        entityDocService.getCustomFields(entityType, entityId)

    @PostMapping("/custom-fields")
    @ResponseStatus(HttpStatus.CREATED)
    fun createCustomField(@RequestBody request: CreateCustomFieldRequest): CustomFieldDto =
        entityDocService.createCustomField(request)

    @PutMapping("/custom-fields/{id}")
    fun updateCustomField(@PathVariable id: UUID, @RequestBody request: UpdateCustomFieldRequest): CustomFieldDto =
        entityDocService.updateCustomField(id, request)

    @DeleteMapping("/custom-fields/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteCustomField(@PathVariable id: UUID) = entityDocService.deleteCustomField(id)
}
