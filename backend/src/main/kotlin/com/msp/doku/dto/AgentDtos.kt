package com.msp.doku.dto

import java.time.Instant
import java.util.UUID

// Incoming from agent
data class AgentReportRequest(
    val hostname: String,
    val osName: String? = null,
    val osVersion: String? = null,
    val kernel: String? = null,
    val cpuModel: String? = null,
    val cpuCores: Int? = null,
    val ramTotalMb: Long? = null,
    val ramUsedMb: Long? = null,
    val diskTotalGb: Long? = null,
    val diskUsedGb: Long? = null,
    val uptimeSeconds: Long? = null,
    val ipAddresses: List<String>? = null,
    val macAddresses: List<String>? = null,
    val networkInterfaces: List<NetworkInterfaceInfo>? = null,
    val installedSoftware: List<String>? = null,
    val runningServices: List<String>? = null,
    val pendingUpdates: Int? = null,
    val avStatus: String? = null,
    val domainJoined: Boolean? = null,
    val domainName: String? = null,
    val lastBoot: Instant? = null,
    val agentVersion: String? = null
)

data class NetworkInterfaceInfo(
    val name: String,
    val ip: String? = null,
    val mac: String? = null,
    val speed: String? = null
)

// Outgoing to frontend
data class AgentReportDto(
    val id: UUID,
    val tenantId: UUID,
    val hostname: String,
    val osName: String?,
    val osVersion: String?,
    val kernel: String?,
    val cpuModel: String?,
    val cpuCores: Int?,
    val ramTotalMb: Long?,
    val ramUsedMb: Long?,
    val diskTotalGb: Long?,
    val diskUsedGb: Long?,
    val uptimeSeconds: Long?,
    val ipAddresses: List<String>,
    val macAddresses: List<String>,
    val pendingUpdates: Int?,
    val avStatus: String?,
    val domainJoined: Boolean?,
    val domainName: String?,
    val agentVersion: String?,
    val reportedAt: Instant,
    val linkedDeviceId: UUID?,
    val linkedDeviceName: String?
)

data class AgentKeyDto(
    val id: UUID,
    val name: String,
    val tenantId: UUID,
    val isActive: Boolean,
    val lastUsed: Instant?,
    val createdAt: Instant?
)

data class CreateAgentKeyRequest(
    val name: String,
    val tenantId: UUID
)

data class CreateAgentKeyResponse(
    val id: UUID,
    val name: String,
    val apiKey: String // Only returned on creation, never again
)
