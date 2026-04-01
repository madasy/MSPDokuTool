package com.msp.doku.controller

import com.msp.doku.dto.CreatePublicIpRangeRequest
import com.msp.doku.dto.PublicIpRangeDto
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
}
