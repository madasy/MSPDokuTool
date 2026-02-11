package com.msp.doku.dto

import java.util.UUID

data class SubnetDto(
    val id: UUID,
    val cidr: String,
    val description: String?,
    val usedIps: Int,
    val totalIps: Int,
    val utilizationPercent: Double
)

data class CreateSubnetRequest(
    val cidr: String,
    val description: String?,
    val vlanId: UUID? = null,
    val tenantId: UUID
)

data class IpAddressDto(
    val id: UUID,
    val address: String,
    val status: String,
    val hostname: String?,
    val description: String?
)

data class CreateIpAddressRequest(
    val subnetId: UUID,
    val address: String,
    val status: String = "active",
    val hostname: String? = null,
    val description: String? = null
)
