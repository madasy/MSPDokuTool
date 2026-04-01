package com.msp.doku.service

import com.msp.doku.domain.Tenant
import com.msp.doku.dto.CreateTenantRequest
import com.msp.doku.dto.TenantDto
import com.msp.doku.dto.TenantSummaryDto
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.RackRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import kotlin.math.pow

@Service
class TenantService(
    private val tenantRepository: TenantRepository,
    private val deviceRepository: DeviceRepository,
    private val subnetRepository: SubnetRepository,
    private val ipAddressRepository: IpAddressRepository,
    private val rackRepository: RackRepository
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

    fun getSummary(tenantId: UUID): TenantSummaryDto {
        val devices = deviceRepository.findByTenantId(tenantId)
        val devicesByType = devices.groupBy { it.deviceType.name }.mapValues { it.value.size.toLong() }

        val subnets = subnetRepository.findByTenantId(tenantId)
        val subnetCount = subnets.size.toLong()

        var totalIps = 0
        var usedIps = 0
        subnets.forEach { subnet ->
            val prefix = subnet.cidr.split("/").getOrNull(1)?.toIntOrNull() ?: 0
            totalIps += 2.0.pow(32 - prefix).toInt()
            usedIps += ipAddressRepository.countBySubnetId(subnet.id!!)
        }
        val ipUtilization = if (totalIps > 0) (usedIps.toDouble() / totalIps) * 100 else 0.0

        val rackCount = rackRepository.countByTenantId(tenantId)

        return TenantSummaryDto(
            deviceCount = devices.size.toLong(),
            devicesByType = devicesByType,
            subnetCount = subnetCount,
            ipUtilization = ipUtilization,
            rackCount = rackCount
        )
    }

    private fun Tenant.toDto() = TenantDto(
        id = this.id!!,
        name = this.name,
        identifier = this.identifier,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt
    )
}
