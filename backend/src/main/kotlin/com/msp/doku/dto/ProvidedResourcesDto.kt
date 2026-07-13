package com.msp.doku.dto

import com.msp.doku.domain.DeviceType
import java.util.UUID

data class ProvidedIpDto(
    val id: UUID,
    val address: String,
    val usage: String?,
    val subnetCidr: String,
    val isPublic: Boolean
)

data class ProvidedVlanDto(
    val id: UUID,
    val vlanTag: Int,
    val name: String?,
    val ownerTenantName: String
)

data class ProvidedSubnetDto(
    val id: UUID,
    val cidr: String,
    val description: String?,
    val ownerTenantName: String
)

data class ProvidedDeviceDto(
    val id: UUID,
    val name: String,
    val model: String?,
    val deviceType: DeviceType
)

data class ProvidedResourcesDto(
    val publicIps: List<ProvidedIpDto>,
    val vlans: List<ProvidedVlanDto>,
    val subnets: List<ProvidedSubnetDto>,
    val devices: List<ProvidedDeviceDto>,
    val vpnTunnels: List<VpnTunnelDto>
)
