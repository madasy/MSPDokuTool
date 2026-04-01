package com.msp.doku.dto

import java.time.Instant

data class DashboardStatsDto(
    val tenantCount: Long,
    val totalDevices: Long,
    val totalSubnets: Long,
    val totalIpAddresses: Long
)

data class ActivityEntryDto(
    val type: String,
    val name: String,
    val tenantName: String?,
    val action: String,
    val timestamp: Instant
)
