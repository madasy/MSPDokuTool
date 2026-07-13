package com.msp.doku.dto

import com.msp.doku.domain.EncryptionAlgorithm
import com.msp.doku.domain.HashAlgorithm
import com.msp.doku.domain.IkeVersion
import com.msp.doku.domain.TunnelStatus
import com.msp.doku.domain.TunnelType
import java.util.UUID

data class SubnetRefDto(
    val id: UUID,
    val cidr: String
)

data class VpnTunnelDto(
    val id: UUID,
    val name: String,
    val type: TunnelType,
    val status: TunnelStatus,
    val tenantId: UUID,
    val tenantName: String,
    val localDeviceId: UUID,
    val localDeviceName: String,
    val remoteDeviceId: UUID?,
    val remoteDeviceName: String?,
    val localSubnets: List<SubnetRefDto>,
    val remoteSubnets: List<SubnetRefDto>,
    val ikeVersion: IkeVersion?,
    val encryption: EncryptionAlgorithm?,
    val hash: HashAlgorithm?,
    val dhGroup: Int?,
    val secretRef: String?
)

data class CreateVpnTunnelRequest(
    val name: String,
    val type: TunnelType,
    val status: TunnelStatus = TunnelStatus.ACTIVE,
    val tenantId: UUID,
    val localDeviceId: UUID,
    val remoteDeviceId: UUID? = null,
    val localSubnetIds: List<UUID> = emptyList(),
    val remoteSubnetIds: List<UUID> = emptyList(),
    val ikeVersion: IkeVersion? = null,
    val encryption: EncryptionAlgorithm? = null,
    val hash: HashAlgorithm? = null,
    val dhGroup: Int? = null,
    val secretRef: String? = null
)
