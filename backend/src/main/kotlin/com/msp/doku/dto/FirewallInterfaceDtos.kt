package com.msp.doku.dto

import java.util.UUID

data class FirewallInterfaceDto(
    val id: UUID,
    val deviceId: UUID,
    val interfaceName: String,
    val interfaceType: String,
    val zone: String?,
    val ipAddress: String?,
    val subnetMask: String?,
    val vlanId: Int?,
    val dhcpEnabled: Boolean,
    val description: String?,
    val status: String
)

data class CreateFirewallInterfaceRequest(
    val interfaceName: String,
    val interfaceType: String = "lan",
    val zone: String? = null,
    val ipAddress: String? = null,
    val subnetMask: String? = null,
    val vlanId: Int? = null,
    val dhcpEnabled: Boolean = false,
    val description: String? = null,
    val status: String = "enabled"
)

data class UpdateFirewallInterfaceRequest(
    val interfaceType: String? = null,
    val zone: String? = null,
    val ipAddress: String? = null,
    val subnetMask: String? = null,
    val vlanId: Int? = null,
    val dhcpEnabled: Boolean? = null,
    val description: String? = null,
    val status: String? = null
)
