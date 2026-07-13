package com.msp.doku.controller

import com.msp.doku.domain.DocEntityType
import com.msp.doku.dto.CreateCustomFieldRequest
import com.msp.doku.dto.CreateNoteRequest
import com.msp.doku.dto.CustomFieldDto
import com.msp.doku.dto.NoteDto
import com.msp.doku.dto.UpdateCustomFieldRequest
import com.msp.doku.dto.UpdateNoteRequest
import com.msp.doku.service.DocService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1")
class DocController(
    private val docService: DocService
) {

    @GetMapping("/notes")
    fun getNotes(@RequestParam entityType: DocEntityType, @RequestParam entityId: UUID): List<NoteDto> =
        docService.getNotes(entityType, entityId)

    @PostMapping("/notes")
    @ResponseStatus(HttpStatus.CREATED)
    fun createNote(@RequestBody request: CreateNoteRequest): NoteDto = docService.createNote(request)

    @PutMapping("/notes/{id}")
    fun updateNote(@PathVariable id: UUID, @RequestBody request: UpdateNoteRequest): NoteDto =
        docService.updateNote(id, request)

    @DeleteMapping("/notes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteNote(@PathVariable id: UUID) = docService.deleteNote(id)

    @GetMapping("/custom-fields")
    fun getCustomFields(@RequestParam entityType: DocEntityType, @RequestParam entityId: UUID): List<CustomFieldDto> =
        docService.getCustomFields(entityType, entityId)

    @PostMapping("/custom-fields")
    @ResponseStatus(HttpStatus.CREATED)
    fun createCustomField(@RequestBody request: CreateCustomFieldRequest): CustomFieldDto =
        docService.createCustomField(request)

    @PutMapping("/custom-fields/{id}")
    fun updateCustomField(@PathVariable id: UUID, @RequestBody request: UpdateCustomFieldRequest): CustomFieldDto =
        docService.updateCustomField(id, request)

    @DeleteMapping("/custom-fields/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteCustomField(@PathVariable id: UUID) = docService.deleteCustomField(id)
}
