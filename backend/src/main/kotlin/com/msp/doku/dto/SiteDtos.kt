package com.msp.doku.dto

import java.time.Instant
import java.util.UUID

data class SiteDto(
    val id: UUID,
    val name: String,
    val address: String?,
    val city: String?,
    val country: String?,
    val tenantId: UUID,
    val roomCount: Int,
    val createdAt: Instant?,
    val updatedAt: Instant?
)

data class CreateSiteRequest(
    val name: String,
    val address: String? = null,
    val city: String? = null,
    val country: String? = null,
    val tenantId: UUID
)

data class RoomDto(
    val id: UUID,
    val name: String,
    val floor: String?,
    val description: String?,
    val siteId: UUID,
    val rackCount: Int,
    val createdAt: Instant?,
    val updatedAt: Instant?
)

data class CreateRoomRequest(
    val name: String,
    val floor: String? = null,
    val description: String? = null,
    val siteId: UUID
)
