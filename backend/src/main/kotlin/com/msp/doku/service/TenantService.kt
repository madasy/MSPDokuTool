package com.msp.doku.service

import com.msp.doku.domain.Tenant
import com.msp.doku.dto.CreateTenantRequest
import com.msp.doku.dto.TenantDto
import com.msp.doku.repository.TenantRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class TenantService(
    private val tenantRepository: TenantRepository
) {

    fun getAllTenants(): List<TenantDto> {
        return tenantRepository.findAll().map { it.toDto() }
    }

    @Transactional
    fun createTenant(request: CreateTenantRequest): TenantDto {
        if (tenantRepository.findByIdentifier(request.identifier) != null) {
            throw IllegalArgumentException("Tenant with identifier '${request.identifier}' already exists")
        }

        val tenant = Tenant(
            name = request.name,
            identifier = request.identifier
        )
        return tenantRepository.save(tenant).toDto()
    }

    private fun Tenant.toDto() = TenantDto(
        id = this.id!!,
        name = this.name,
        identifier = this.identifier,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt
    )
}
