package com.msp.doku.service

import com.msp.doku.domain.SwitchPort
import com.msp.doku.dto.InitializePortsRequest
import com.msp.doku.dto.SwitchPortDto
import com.msp.doku.dto.UpdateSwitchPortRequest
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.SwitchPortRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class SwitchPortService(
    private val switchPortRepository: SwitchPortRepository,
    private val deviceRepository: DeviceRepository
) {

    fun getPortsForDevice(deviceId: UUID): List<SwitchPortDto> {
        return switchPortRepository.findByDeviceIdOrderByPortNumber(deviceId).map { it.toDto() }
    }

    @Transactional
    fun initializePorts(deviceId: UUID, request: InitializePortsRequest): List<SwitchPortDto> {
        val device = deviceRepository.findById(deviceId)
            .orElseThrow { IllegalArgumentException("Device not found") }

        val existing = switchPortRepository.findByDeviceIdOrderByPortNumber(deviceId)
        if (existing.isNotEmpty()) {
            return existing.map { it.toDto() }
        }

        val ports = (1..request.portCount).map { num ->
            SwitchPort(
                device = device,
                portNumber = num,
                portName = "Port $num",
                status = "down",
                mode = "access"
            )
        }
        return switchPortRepository.saveAll(ports).map { it.toDto() }
    }

    @Transactional
    fun updatePort(deviceId: UUID, portNumber: Int, request: UpdateSwitchPortRequest): SwitchPortDto {
        val port = switchPortRepository.findByDeviceIdAndPortNumber(deviceId, portNumber)
            ?: throw IllegalArgumentException("Port $portNumber not found on device")

        request.status?.let { port.status = it }
        request.mode?.let { port.mode = it }
        request.accessVlanId?.let { port.accessVlanId = it }
        request.taggedVlans?.let { port.taggedVlans = it.joinToString(",") }
        request.speed?.let { port.speed = it }
        request.connectedDevice?.let { port.connectedDevice = it }
        request.description?.let { port.description = it }

        return switchPortRepository.save(port).toDto()
    }

    private fun SwitchPort.toDto() = SwitchPortDto(
        id = this.id!!,
        portNumber = this.portNumber,
        portName = this.portName,
        status = this.status,
        mode = this.mode,
        accessVlanId = this.accessVlanId,
        taggedVlans = this.taggedVlans?.split(",")?.mapNotNull { it.trim().toIntOrNull() } ?: emptyList(),
        speed = this.speed,
        connectedDevice = this.connectedDevice,
        description = this.description
    )
}
