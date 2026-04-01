package com.msp.doku.controller

import com.msp.doku.dto.CreatePublicIpRangeRequest
import com.msp.doku.dto.PublicIpAssignmentDto
import com.msp.doku.dto.PublicIpRangeDto
import com.msp.doku.dto.UpdateIpAssignmentRequest
import com.msp.doku.dto.UpdatePublicIpRangeRequest
import com.msp.doku.service.PublicIpRangeService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/datacenter")
class DatacenterController(
    private val publicIpRangeService: PublicIpRangeService
) {

    @GetMapping("/ip-ranges")
    fun getAll(): List<PublicIpRangeDto> {
        return publicIpRangeService.getAll()
    }

    @PostMapping("/ip-ranges")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@RequestBody request: CreatePublicIpRangeRequest): PublicIpRangeDto {
        return publicIpRangeService.create(request)
    }

    @PutMapping("/ip-ranges/{id}")
    fun update(@PathVariable id: UUID, @RequestBody request: UpdatePublicIpRangeRequest): PublicIpRangeDto {
        return publicIpRangeService.update(id, request)
    }

    @DeleteMapping("/ip-ranges/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: UUID) {
        publicIpRangeService.delete(id)
    }

    @GetMapping("/ip-ranges/{rangeId}/assignments")
    fun getAssignments(@PathVariable rangeId: UUID): List<PublicIpAssignmentDto> {
        return publicIpRangeService.getAssignments(rangeId)
    }

    @PostMapping("/ip-ranges/{rangeId}/generate")
    @ResponseStatus(HttpStatus.CREATED)
    fun generateIps(@PathVariable rangeId: UUID): List<PublicIpAssignmentDto> {
        return publicIpRangeService.generateIpsForRange(rangeId)
    }

    @PutMapping("/ip-ranges/{rangeId}/assignments/{ipAddress}")
    fun updateAssignment(
        @PathVariable rangeId: UUID,
        @PathVariable ipAddress: String,
        @RequestBody request: UpdateIpAssignmentRequest
    ): PublicIpAssignmentDto {
        return publicIpRangeService.updateAssignment(rangeId, ipAddress, request)
    }
}
