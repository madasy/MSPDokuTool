package com.msp.doku.dto

import java.util.UUID

data class SearchResultDto(
    val type: String,       // "device", "subnet", "ip_address", "site", "room", "rack", "vlan", "tenant", "documentation"
    val id: UUID,
    val title: String,      // primary display text
    val subtitle: String?,  // secondary info
    val tenantId: UUID?,
    val tenantName: String?,
    val link: String        // frontend route to navigate to
)

data class SearchResponseDto(
    val query: String,
    val totalResults: Int,
    val results: List<SearchResultDto>
)
