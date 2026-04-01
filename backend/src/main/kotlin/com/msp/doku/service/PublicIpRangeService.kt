package com.msp.doku.service

import com.msp.doku.domain.PublicIpRange
import com.msp.doku.dto.CreatePublicIpRangeRequest
import com.msp.doku.dto.PublicIpRangeDto
import com.msp.doku.dto.UpdatePublicIpRangeRequest
import com.msp.doku.repository.PublicIpRangeRepository
import com.msp.doku.repository.TenantRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class PublicIpRangeService(
    private val publicIpRangeRepository: PublicIpRangeRepository,
    private val tenantRepository: TenantRepository
) {

    fun getAll(): List<PublicIpRangeDto> {
        return publicIpRangeRepository.findAll().map { it.toDto() }
    }

    @Transactional
    fun create(request: CreatePublicIpRangeRequest): PublicIpRangeDto {
        val tenant = request.assignedTenantId?.let {
            tenantRepository.findById(it).orElseThrow { IllegalArgumentException("Tenant not found") }
        }

        val range = PublicIpRange(
            cidr = request.cidr,
            description = request.description,
            assignedTenant = tenant,
            provider = request.provider,
            status = request.status
        )
        return publicIpRangeRepository.save(range).toDto()
    }

    @Transactional
    fun update(id: UUID, request: UpdatePublicIpRangeRequest): PublicIpRangeDto {
        val range = publicIpRangeRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Public IP range not found") }

        request.cidr?.let { range.cidr = it }
        request.description?.let { range.description = it }
        request.provider?.let { range.provider = it }
        request.status?.let { range.status = it }
        if (request.assignedTenantId != null) {
            range.assignedTenant = tenantRepository.findById(request.assignedTenantId)
                .orElseThrow { IllegalArgumentException("Tenant not found") }
        }

        return publicIpRangeRepository.save(range).toDto()
    }

    @Transactional
    fun delete(id: UUID) {
        if (!publicIpRangeRepository.existsById(id)) {
            throw IllegalArgumentException("Public IP range not found")
        }
        publicIpRangeRepository.deleteById(id)
    }

    private fun PublicIpRange.toDto() = PublicIpRangeDto(
        id = this.id!!,
        cidr = this.cidr,
        description = this.description,
        assignedTenantId = this.assignedTenant?.id,
        assignedTenantName = this.assignedTenant?.name,
        provider = this.provider,
        status = this.status,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt
    )
}
