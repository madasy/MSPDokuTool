package com.msp.doku.dto

import java.util.UUID

data class SwitchPortDto(
    val id: UUID,
    val portNumber: Int,
    val portName: String?,
    val status: String,
    val mode: String,
    val accessVlanId: Int?,
    val taggedVlans: List<Int>,
    val speed: String?,
    val connectedDevice: String?,
    val description: String?
)

data class UpdateSwitchPortRequest(
    val status: String? = null,
    val mode: String? = null,
    val accessVlanId: Int? = null,
    val taggedVlans: List<Int>? = null,
    val speed: String? = null,
    val connectedDevice: String? = null,
    val description: String? = null
)

data class InitializePortsRequest(
    val portCount: Int = 48
)
