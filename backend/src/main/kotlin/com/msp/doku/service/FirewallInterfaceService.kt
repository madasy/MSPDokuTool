package com.msp.doku.service

import com.msp.doku.domain.FirewallInterface
import com.msp.doku.dto.CreateFirewallInterfaceRequest
import com.msp.doku.dto.FirewallInterfaceDto
import com.msp.doku.dto.UpdateFirewallInterfaceRequest
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.FirewallInterfaceRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class FirewallInterfaceService(
    private val firewallInterfaceRepository: FirewallInterfaceRepository,
    private val deviceRepository: DeviceRepository
) {

    fun getInterfaces(deviceId: UUID): List<FirewallInterfaceDto> {
        return firewallInterfaceRepository.findByDeviceId(deviceId).map { it.toDto() }
    }

    @Transactional
    fun createInterface(deviceId: UUID, request: CreateFirewallInterfaceRequest): FirewallInterfaceDto {
        val device = deviceRepository.findById(deviceId)
            .orElseThrow { IllegalArgumentException("Device not found") }

        val iface = FirewallInterface(
            device = device,
            interfaceName = request.interfaceName,
            interfaceType = request.interfaceType,
            zone = request.zone,
            ipAddress = request.ipAddress,
            subnetMask = request.subnetMask,
            vlanId = request.vlanId,
            dhcpEnabled = request.dhcpEnabled,
            description = request.description,
            status = request.status
        )
        return firewallInterfaceRepository.save(iface).toDto()
    }

    @Transactional
    fun updateInterface(deviceId: UUID, interfaceName: String, request: UpdateFirewallInterfaceRequest): FirewallInterfaceDto {
        val iface = firewallInterfaceRepository.findByDeviceIdAndInterfaceName(deviceId, interfaceName)
            ?: throw IllegalArgumentException("Interface $interfaceName not found on device")

        request.interfaceType?.let { iface.interfaceType = it }
        request.zone?.let { iface.zone = it }
        request.ipAddress?.let { iface.ipAddress = it }
        request.subnetMask?.let { iface.subnetMask = it }
        request.vlanId?.let { iface.vlanId = it }
        request.dhcpEnabled?.let { iface.dhcpEnabled = it }
        request.description?.let { iface.description = it }
        request.status?.let { iface.status = it }
        iface.updatedAt = Instant.now()

        return firewallInterfaceRepository.save(iface).toDto()
    }

    @Transactional
    fun deleteInterface(deviceId: UUID, interfaceName: String) {
        val iface = firewallInterfaceRepository.findByDeviceIdAndInterfaceName(deviceId, interfaceName)
            ?: throw IllegalArgumentException("Interface $interfaceName not found on device")
        firewallInterfaceRepository.delete(iface)
    }

    private fun FirewallInterface.toDto() = FirewallInterfaceDto(
        id = this.id!!,
        deviceId = this.device.id!!,
        interfaceName = this.interfaceName,
        interfaceType = this.interfaceType,
        zone = this.zone,
        ipAddress = this.ipAddress,
        subnetMask = this.subnetMask,
        vlanId = this.vlanId,
        dhcpEnabled = this.dhcpEnabled,
        description = this.description,
        status = this.status
    )
}
