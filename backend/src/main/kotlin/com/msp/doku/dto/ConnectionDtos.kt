package com.msp.doku.dto

import java.util.UUID

data class InterfaceDto(
    val id: UUID,
    val deviceId: UUID,
    val deviceName: String,
    val name: String,
    val macAddress: String?,
    val type: String?,
    val description: String?
)

data class ConnectionDto(
    val id: UUID,
    val endpointA: InterfaceDto,
    val endpointB: InterfaceDto,
    val cableType: String?,
    val status: String
)

data class CreateInterfaceRequest(
    val deviceId: UUID,
    val name: String,
    val macAddress: String? = null,
    val type: String = "copper",
    val description: String? = null
)

data class CreateConnectionRequest(
    val endpointAId: UUID,
    val endpointBId: UUID,
    val cableType: String? = null
)

data class DeviceConnectionSummary(
    val deviceId: UUID,
    val deviceName: String,
    val interfaces: List<InterfaceDto>,
    val connections: List<ConnectionDto>
)
