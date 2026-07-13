package com.msp.doku.controller

import com.msp.doku.dto.AssignmentRequest
import com.msp.doku.dto.AssignmentResponse
import com.msp.doku.service.AssignmentService
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/assignments")
class AssignmentController(
    private val assignmentService: AssignmentService
) {

    @PatchMapping("/{entityType}/{id}")
    fun assign(
        @PathVariable entityType: String,
        @PathVariable id: UUID,
        @RequestBody request: AssignmentRequest
    ): AssignmentResponse {
        return assignmentService.assign(entityType, id, request.assignedTenantId)
    }
}
