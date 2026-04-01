package com.msp.doku.dto

import java.time.Instant
import java.util.UUID

data class AccessPointDto(
    val id: UUID,
    val siteId: UUID,
    val siteName: String,
    val name: String,
    val model: String?,
    val macAddress: String?,
    val ipAddress: String?,
    val locationDescription: String?,
    val floor: String?,
    val room: String?,
    val mountType: String,
    val status: String,
    val channel: String?,
    val ssids: List<String>,
    val createdAt: Instant?,
    val updatedAt: Instant?
)

data class CreateAccessPointRequest(
    val siteId: UUID,
    val name: String,
    val model: String? = null,
    val macAddress: String? = null,
    val ipAddress: String? = null,
    val locationDescription: String? = null,
    val floor: String? = null,
    val room: String? = null,
    val mountType: String = "ceiling",
    val status: String = "active",
    val channel: String? = null,
    val ssids: List<String> = emptyList()
)
