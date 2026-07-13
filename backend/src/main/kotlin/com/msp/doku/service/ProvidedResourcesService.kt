package com.msp.doku.service

import com.msp.doku.dto.ProvidedDeviceDto
import com.msp.doku.dto.ProvidedPublicIpDto
import com.msp.doku.dto.ProvidedResourcesDto
import com.msp.doku.dto.ProvidedSubnetDto
import com.msp.doku.dto.ProvidedVlanDto
import com.msp.doku.dto.SubnetRefDto
import com.msp.doku.dto.VpnTunnelDto
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.PublicIpAssignmentRepository
import com.msp.doku.repository.PublicIpRangeRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.VlanRepository
import com.msp.doku.repository.VpnTunnelRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class ProvidedResourcesService(
    private val vlanRepository: VlanRepository,
    private val subnetRepository: SubnetRepository,
    private val publicIpAssignmentRepository: PublicIpAssignmentRepository,
    private val publicIpRangeRepository: PublicIpRangeRepository,
    private val deviceRepository: DeviceRepository,
    private val vpnTunnelRepository: VpnTunnelRepository
) {

    @Transactional(readOnly = true)
    fun getProvidedResources(tenantId: UUID): ProvidedResourcesDto {
        val assignedIps = publicIpAssignmentRepository.findByAssignedTenantId(tenantId).map {
            ProvidedPublicIpDto(
                id = it.id!!,
                ipAddress = it.ipAddress,
                usage = it.description,
                rangeCidr = it.range.cidr
            )
        }
        val assignedRanges = publicIpRangeRepository.findByAssignedTenantId(tenantId).map {
            ProvidedPublicIpDto(
                id = it.id!!,
                ipAddress = it.cidr,
                usage = it.description,
                rangeCidr = it.cidr
            )
        }

        return ProvidedResourcesDto(
            publicIps = assignedIps + assignedRanges,
            vlans = vlanRepository.findByAssignedTenantId(tenantId).map {
                ProvidedVlanDto(
                    id = it.id!!,
                    vlanTag = it.vlanId,
                    name = it.name,
                    ownerTenantName = it.tenant.name
                )
            },
            subnets = subnetRepository.findByAssignedTenantId(tenantId).map {
                ProvidedSubnetDto(
                    id = it.id!!,
                    cidr = it.cidr,
                    description = it.description,
                    ownerTenantName = it.tenant.name
                )
            },
            devices = deviceRepository.findByAssignedTenantId(tenantId).map {
                ProvidedDeviceDto(
                    id = it.id!!,
                    name = it.name,
                    model = it.model,
                    deviceType = it.deviceType
                )
            },
            vpnTunnels = vpnTunnelRepository.findByTenantId(tenantId).map { t ->
                VpnTunnelDto(
                    id = t.id!!,
                    name = t.name,
                    type = t.type,
                    status = t.status,
                    tenantId = t.tenant.id!!,
                    tenantName = t.tenant.name,
                    localDeviceId = t.localDevice.id!!,
                    localDeviceName = t.localDevice.name,
                    remoteDeviceId = t.remoteDevice?.id,
                    remoteDeviceName = t.remoteDevice?.name,
                    localSubnets = t.localSubnets.map { SubnetRefDto(it.id!!, it.cidr) },
                    remoteSubnets = t.remoteSubnets.map { SubnetRefDto(it.id!!, it.cidr) },
                    ikeVersion = t.ikeVersion,
                    encryption = t.encryption,
                    hash = t.hash,
                    dhGroup = t.dhGroup,
                    secretRef = t.secretRef
                )
            }
        )
    }
}
