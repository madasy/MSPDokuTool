package com.msp.doku.dto

import com.msp.doku.domain.DeviceType
import java.util.UUID

data class ProvidedPublicIpDto(
    val id: UUID,
    val ipAddress: String,
    val usage: String?,
    val rangeCidr: String
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
    val publicIps: List<ProvidedPublicIpDto>,
    val vlans: List<ProvidedVlanDto>,
    val subnets: List<ProvidedSubnetDto>,
    val devices: List<ProvidedDeviceDto>,
    val vpnTunnels: List<VpnTunnelDto>
)
