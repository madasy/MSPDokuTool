package com.msp.doku.service

import com.msp.doku.domain.Subnet
import com.msp.doku.domain.VpnTunnel
import com.msp.doku.dto.CreateVpnTunnelRequest
import com.msp.doku.dto.SubnetRefDto
import com.msp.doku.dto.VpnTunnelDto
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VpnTunnelRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class VpnTunnelService(
    private val vpnTunnelRepository: VpnTunnelRepository,
    private val tenantRepository: TenantRepository,
    private val deviceRepository: DeviceRepository,
    private val subnetRepository: SubnetRepository
) {

    @Transactional(readOnly = true)
    fun getTunnels(tenantId: UUID?): List<VpnTunnelDto> {
        val tunnels = if (tenantId != null) vpnTunnelRepository.findByTenantId(tenantId)
        else vpnTunnelRepository.findAll()
        return tunnels.map { it.toDto() }
    }

    @Transactional
    fun createTunnel(request: CreateVpnTunnelRequest): VpnTunnelDto {
        val tunnel = VpnTunnel(
            name = request.name,
            type = request.type,
            status = request.status,
            tenant = tenantRepository.findById(request.tenantId)
                .orElseThrow { IllegalArgumentException("Tenant not found") },
            localDevice = deviceRepository.findById(request.localDeviceId)
                .orElseThrow { IllegalArgumentException("Local device not found") },
            remoteDevice = request.remoteDeviceId?.let {
                deviceRepository.findById(it).orElseThrow { IllegalArgumentException("Remote device not found") }
            },
            localSubnets = resolveSubnets(request.localSubnetIds),
            remoteSubnets = resolveSubnets(request.remoteSubnetIds),
            ikeVersion = request.ikeVersion,
            encryption = request.encryption,
            hash = request.hash,
            dhGroup = request.dhGroup,
            secretRef = request.secretRef?.ifBlank { null }
        )
        return vpnTunnelRepository.save(tunnel).toDto()
    }

    @Transactional
    fun updateTunnel(id: UUID, request: CreateVpnTunnelRequest): VpnTunnelDto {
        val tunnel = vpnTunnelRepository.findById(id)
            .orElseThrow { IllegalArgumentException("VPN tunnel not found") }

        tunnel.name = request.name
        tunnel.type = request.type
        tunnel.status = request.status
        tunnel.tenant = tenantRepository.findById(request.tenantId)
            .orElseThrow { IllegalArgumentException("Tenant not found") }
        tunnel.localDevice = deviceRepository.findById(request.localDeviceId)
            .orElseThrow { IllegalArgumentException("Local device not found") }
        tunnel.remoteDevice = request.remoteDeviceId?.let {
            deviceRepository.findById(it).orElseThrow { IllegalArgumentException("Remote device not found") }
        }
        tunnel.localSubnets = resolveSubnets(request.localSubnetIds)
        tunnel.remoteSubnets = resolveSubnets(request.remoteSubnetIds)
        tunnel.ikeVersion = request.ikeVersion
        tunnel.encryption = request.encryption
        tunnel.hash = request.hash
        tunnel.dhGroup = request.dhGroup
        tunnel.secretRef = request.secretRef?.ifBlank { null }

        return vpnTunnelRepository.save(tunnel).toDto()
    }

    @Transactional
    fun deleteTunnel(id: UUID) {
        if (!vpnTunnelRepository.existsById(id)) {
            throw IllegalArgumentException("VPN tunnel not found")
        }
        vpnTunnelRepository.deleteById(id)
    }

    private fun resolveSubnets(ids: List<UUID>): MutableSet<Subnet> =
        ids.map { id ->
            subnetRepository.findById(id).orElseThrow { IllegalArgumentException("Subnet not found: $id") }
        }.toMutableSet()

    private fun VpnTunnel.toDto() = VpnTunnelDto(
        id = this.id!!,
        name = this.name,
        type = this.type,
        status = this.status,
        tenantId = this.tenant.id!!,
        tenantName = this.tenant.name,
        localDeviceId = this.localDevice.id!!,
        localDeviceName = this.localDevice.name,
        remoteDeviceId = this.remoteDevice?.id,
        remoteDeviceName = this.remoteDevice?.name,
        localSubnets = this.localSubnets.map { SubnetRefDto(it.id!!, it.cidr) },
        remoteSubnets = this.remoteSubnets.map { SubnetRefDto(it.id!!, it.cidr) },
        ikeVersion = this.ikeVersion,
        encryption = this.encryption,
        hash = this.hash,
        dhGroup = this.dhGroup,
        secretRef = this.secretRef
    )
}
