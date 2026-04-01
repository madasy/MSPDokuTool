package com.msp.doku.service

import com.msp.doku.domain.Site
import com.msp.doku.dto.CreateSiteRequest
import com.msp.doku.dto.SiteDto
import com.msp.doku.repository.RoomRepository
import com.msp.doku.repository.SiteRepository
import com.msp.doku.repository.TenantRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class SiteService(
    private val siteRepository: SiteRepository,
    private val roomRepository: RoomRepository,
    private val tenantRepository: TenantRepository
) {

    fun getSitesByTenant(tenantId: UUID): List<SiteDto> {
        return siteRepository.findByTenantId(tenantId).map { it.toDto() }
    }

    fun getSite(id: UUID): SiteDto {
        return siteRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Site not found") }
            .toDto()
    }

    @Transactional
    fun createSite(request: CreateSiteRequest): SiteDto {
        val tenant = tenantRepository.findById(request.tenantId)
            .orElseThrow { IllegalArgumentException("Tenant not found") }

        val site = Site(
            name = request.name,
            address = request.address,
            city = request.city,
            country = request.country,
            tenant = tenant
        )
        return siteRepository.save(site).toDto()
    }

    @Transactional
    fun deleteSite(id: UUID) {
        if (!siteRepository.existsById(id)) {
            throw IllegalArgumentException("Site not found")
        }
        siteRepository.deleteById(id)
    }

    private fun Site.toDto() = SiteDto(
        id = this.id!!,
        name = this.name,
        address = this.address,
        city = this.city,
        country = this.country,
        tenantId = this.tenant.id!!,
        roomCount = roomRepository.countBySiteId(this.id!!).toInt(),
        createdAt = this.createdAt,
        updatedAt = this.updatedAt
    )
}
