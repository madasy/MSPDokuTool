package com.msp.doku.service

import com.msp.doku.domain.AccessPoint
import com.msp.doku.dto.AccessPointDto
import com.msp.doku.dto.CreateAccessPointRequest
import com.msp.doku.repository.AccessPointRepository
import com.msp.doku.repository.SiteRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class AccessPointService(
    private val accessPointRepository: AccessPointRepository,
    private val siteRepository: SiteRepository
) {

    fun getByTenant(tenantId: UUID): List<AccessPointDto> {
        return accessPointRepository.findByTenantId(tenantId).map { it.toDto() }
    }

    fun getBySite(siteId: UUID): List<AccessPointDto> {
        return accessPointRepository.findBySiteId(siteId).map { it.toDto() }
    }

    @Transactional
    fun create(request: CreateAccessPointRequest): AccessPointDto {
        val site = siteRepository.findById(request.siteId)
            .orElseThrow { IllegalArgumentException("Site not found") }

        val ap = AccessPoint(
            site = site,
            name = request.name,
            model = request.model,
            macAddress = request.macAddress,
            ipAddress = request.ipAddress,
            locationDescription = request.locationDescription,
            floor = request.floor,
            room = request.room,
            mountType = request.mountType,
            status = request.status,
            channel = request.channel,
            ssids = request.ssids.joinToString(",")
        )
        return accessPointRepository.save(ap).toDto()
    }

    @Transactional
    fun delete(id: UUID) {
        if (!accessPointRepository.existsById(id)) throw IllegalArgumentException("Access point not found")
        accessPointRepository.deleteById(id)
    }

    private fun AccessPoint.toDto() = AccessPointDto(
        id = this.id!!,
        siteId = this.site.id!!,
        siteName = this.site.name,
        name = this.name,
        model = this.model,
        macAddress = this.macAddress,
        ipAddress = this.ipAddress,
        locationDescription = this.locationDescription,
        floor = this.floor,
        room = this.room,
        mountType = this.mountType,
        status = this.status,
        channel = this.channel,
        ssids = this.ssids?.split(",")?.filter { it.isNotBlank() } ?: emptyList(),
        createdAt = this.createdAt,
        updatedAt = this.updatedAt
    )
}
