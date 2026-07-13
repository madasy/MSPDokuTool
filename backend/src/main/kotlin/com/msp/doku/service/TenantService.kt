package com.msp.doku.service

import com.msp.doku.domain.Tenant
import com.msp.doku.domain.TenantType
import com.msp.doku.dto.CreateTenantRequest
import com.msp.doku.dto.TenantDto
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VlanRepository
import com.msp.doku.repository.VpnTunnelRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class TenantService(
    private val tenantRepository: TenantRepository,
    private val vlanRepository: VlanRepository,
    private val subnetRepository: SubnetRepository,
    private val ipAddressRepository: IpAddressRepository,
    private val deviceRepository: DeviceRepository,
    private val vpnTunnelRepository: VpnTunnelRepository
) {

    fun getAllTenants(): List<TenantDto> {
        return tenantRepository.findAll().map { it.toDto() }
    }

    @Transactional
    fun createTenant(request: CreateTenantRequest): TenantDto {
        if (tenantRepository.findByIdentifier(request.identifier) != null) {
            throw IllegalArgumentException("Tenant with identifier '${request.identifier}' already exists")
        }
        if (request.type == TenantType.MSP && tenantRepository.existsByType(TenantType.MSP)) {
            throw IllegalArgumentException("Es existiert bereits ein MSP-Tenant")
        }

        val tenant = Tenant(
            name = request.name,
            identifier = request.identifier,
            type = request.type
        )
        return tenantRepository.save(tenant).toDto()
    }

    @Transactional
    fun deleteTenant(id: UUID) {
        val tenant = tenantRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Tenant not found") }

        val blockers = mutableListOf<String>()
        if (vlanRepository.existsByAssignedTenantId(id)) blockers.add("VLANs")
        if (subnetRepository.existsByAssignedTenantId(id)) blockers.add("Subnetze")
        if (ipAddressRepository.existsByAssignedTenantId(id)) blockers.add("IP-Adressen")
        if (deviceRepository.existsByAssignedTenantId(id)) blockers.add("Geräte")
        if (vpnTunnelRepository.existsByTenantId(id)) blockers.add("VPN-Tunnel")
        if (blockers.isNotEmpty()) {
            throw IllegalStateException(
                "Tenant kann nicht gelöscht werden – zugewiesene Ressourcen: ${blockers.joinToString(", ")}"
            )
        }
        tenantRepository.delete(tenant)
    }

    private fun Tenant.toDto() = TenantDto(
        id = this.id!!,
        name = this.name,
        identifier = this.identifier,
        type = this.type,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt
    )
}
