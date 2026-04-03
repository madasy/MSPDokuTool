package com.msp.doku.service

import com.msp.doku.domain.Connection
import com.msp.doku.domain.Interface
import com.msp.doku.dto.*
import com.msp.doku.repository.ConnectionRepository
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.InterfaceRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class ConnectionService(
    private val interfaceRepository: InterfaceRepository,
    private val connectionRepository: ConnectionRepository,
    private val deviceRepository: DeviceRepository
) {

    fun getDeviceConnections(deviceId: UUID): DeviceConnectionSummary {
        val device = deviceRepository.findById(deviceId).orElseThrow { IllegalArgumentException("Device not found") }
        val interfaces = interfaceRepository.findByDeviceId(deviceId).map { it.toDto() }
        val connections = connectionRepository.findByDeviceId(deviceId).map { it.toDto() }
        return DeviceConnectionSummary(
            deviceId = device.id!!, deviceName = device.name,
            interfaces = interfaces, connections = connections
        )
    }

    fun getInterfacesForDevice(deviceId: UUID): List<InterfaceDto> {
        return interfaceRepository.findByDeviceId(deviceId).map { it.toDto() }
    }

    @Transactional
    fun createInterface(request: CreateInterfaceRequest): InterfaceDto {
        val device = deviceRepository.findById(request.deviceId).orElseThrow { IllegalArgumentException("Device not found") }
        val iface = Interface(
            device = device, name = request.name,
            macAddress = request.macAddress, type = request.type,
            description = request.description
        )
        return interfaceRepository.save(iface).toDto()
    }

    @Transactional
    fun deleteInterface(id: UUID) {
        // Delete any connections using this interface first
        val connections = connectionRepository.findByInterfaceId(id)
        connectionRepository.deleteAll(connections)
        interfaceRepository.deleteById(id)
    }

    @Transactional
    fun createConnection(request: CreateConnectionRequest): ConnectionDto {
        val endpointA = interfaceRepository.findById(request.endpointAId).orElseThrow { IllegalArgumentException("Interface A not found") }
        val endpointB = interfaceRepository.findById(request.endpointBId).orElseThrow { IllegalArgumentException("Interface B not found") }

        // Check not already connected
        val existingA = connectionRepository.findByInterfaceId(request.endpointAId)
        if (existingA.isNotEmpty()) throw IllegalArgumentException("Interface A already has a connection")
        val existingB = connectionRepository.findByInterfaceId(request.endpointBId)
        if (existingB.isNotEmpty()) throw IllegalArgumentException("Interface B already has a connection")

        val connection = Connection(
            endpointA = endpointA, endpointB = endpointB,
            cableType = request.cableType
        )
        return connectionRepository.save(connection).toDto()
    }

    @Transactional
    fun deleteConnection(id: UUID) {
        connectionRepository.deleteById(id)
    }

    // Get all connections for a tenant (via devices)
    fun getConnectionsForTenant(tenantId: UUID): List<ConnectionDto> {
        val devices = deviceRepository.findByTenantId(tenantId)
        val deviceIds = devices.map { it.id!! }.toSet()
        val allConnections = mutableSetOf<Connection>()
        for (deviceId in deviceIds) {
            allConnections.addAll(connectionRepository.findByDeviceId(deviceId))
        }
        return allConnections.map { it.toDto() }
    }

    private fun Interface.toDto() = InterfaceDto(
        id = this.id!!, deviceId = this.device.id!!, deviceName = this.device.name,
        name = this.name, macAddress = this.macAddress, type = this.type,
        description = this.description
    )

    private fun Connection.toDto() = ConnectionDto(
        id = this.id!!,
        endpointA = this.endpointA.toDto(),
        endpointB = this.endpointB.toDto(),
        cableType = this.cableType, status = this.status
    )
}
