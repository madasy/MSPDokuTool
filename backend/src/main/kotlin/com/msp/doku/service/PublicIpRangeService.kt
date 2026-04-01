package com.msp.doku.service

import com.msp.doku.domain.PublicIpAssignment
import com.msp.doku.domain.PublicIpRange
import com.msp.doku.dto.CreatePublicIpRangeRequest
import com.msp.doku.dto.PublicIpAssignmentDto
import com.msp.doku.dto.PublicIpRangeDto
import com.msp.doku.dto.UpdateIpAssignmentRequest
import com.msp.doku.dto.UpdatePublicIpRangeRequest
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.PublicIpAssignmentRepository
import com.msp.doku.repository.PublicIpRangeRepository
import com.msp.doku.repository.TenantRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class PublicIpRangeService(
    private val publicIpRangeRepository: PublicIpRangeRepository,
    private val tenantRepository: TenantRepository,
    private val assignmentRepository: PublicIpAssignmentRepository,
    private val deviceRepository: DeviceRepository
) {

    fun getAll(): List<PublicIpRangeDto> {
        return publicIpRangeRepository.findAll().map { it.toDto() }
    }

    @Transactional
    fun create(request: CreatePublicIpRangeRequest): PublicIpRangeDto {
        val tenant = request.assignedTenantId?.let {
            tenantRepository.findById(it).orElseThrow { IllegalArgumentException("Tenant not found") }
        }

        val range = PublicIpRange(
            cidr = request.cidr,
            description = request.description,
            assignedTenant = tenant,
            provider = request.provider,
            status = request.status
        )
        return publicIpRangeRepository.save(range).toDto()
    }

    @Transactional
    fun update(id: UUID, request: UpdatePublicIpRangeRequest): PublicIpRangeDto {
        val range = publicIpRangeRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Public IP range not found") }

        request.cidr?.let { range.cidr = it }
        request.description?.let { range.description = it }
        request.provider?.let { range.provider = it }
        request.status?.let { range.status = it }
        if (request.assignedTenantId != null) {
            range.assignedTenant = tenantRepository.findById(request.assignedTenantId)
                .orElseThrow { IllegalArgumentException("Tenant not found") }
        }

        return publicIpRangeRepository.save(range).toDto()
    }

    @Transactional
    fun delete(id: UUID) {
        if (!publicIpRangeRepository.existsById(id)) {
            throw IllegalArgumentException("Public IP range not found")
        }
        publicIpRangeRepository.deleteById(id)
    }

    fun getAssignments(rangeId: UUID): List<PublicIpAssignmentDto> {
        return assignmentRepository.findByRangeIdOrderByIpAddress(rangeId).map { it.toAssignmentDto() }
    }

    @Transactional
    fun generateIpsForRange(rangeId: UUID): List<PublicIpAssignmentDto> {
        val range = publicIpRangeRepository.findById(rangeId)
            .orElseThrow { IllegalArgumentException("Range not found") }

        val existing = assignmentRepository.findByRangeIdOrderByIpAddress(rangeId)
        if (existing.isNotEmpty()) return existing.map { it.toAssignmentDto() }

        val ips = generateIpsFromCidr(range.cidr)
        val assignments = ips.mapIndexed { idx, ip ->
            val status = when {
                idx == 0 -> "network"
                idx == ips.size - 1 -> "broadcast"
                else -> "free"
            }
            PublicIpAssignment(range = range, ipAddress = ip, status = status)
        }
        return assignmentRepository.saveAll(assignments).map { it.toAssignmentDto() }
    }

    @Transactional
    fun updateAssignment(rangeId: UUID, ipAddress: String, request: UpdateIpAssignmentRequest): PublicIpAssignmentDto {
        val assignment = assignmentRepository.findByRangeIdAndIpAddress(rangeId, ipAddress)
            ?: throw IllegalArgumentException("IP $ipAddress not found in range")

        request.status?.let { assignment.status = it }
        request.description?.let { assignment.description = it }
        if (request.assignedTenantId != null) {
            assignment.assignedTenant = tenantRepository.findById(request.assignedTenantId).orElse(null)
        }
        if (request.assignedDeviceId != null) {
            assignment.assignedDevice = deviceRepository.findById(request.assignedDeviceId).orElse(null)
        }

        return assignmentRepository.save(assignment).toAssignmentDto()
    }

    private fun generateIpsFromCidr(cidr: String): List<String> {
        val parts = cidr.split("/")
        val baseIp = parts[0]
        val prefix = parts.getOrNull(1)?.toIntOrNull() ?: return emptyList()
        val count = Math.pow(2.0, (32 - prefix).toDouble()).toInt()

        val octets = baseIp.split(".").map { it.toInt() }
        val baseNum = (octets[0] shl 24) or (octets[1] shl 16) or (octets[2] shl 8) or octets[3]

        return (0 until count).map { i ->
            val ip = baseNum + i
            "${(ip shr 24) and 0xFF}.${(ip shr 16) and 0xFF}.${(ip shr 8) and 0xFF}.${ip and 0xFF}"
        }
    }

    private fun PublicIpRange.toDto() = PublicIpRangeDto(
        id = this.id!!,
        cidr = this.cidr,
        description = this.description,
        assignedTenantId = this.assignedTenant?.id,
        assignedTenantName = this.assignedTenant?.name,
        provider = this.provider,
        status = this.status,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt
    )

    private fun PublicIpAssignment.toAssignmentDto() = PublicIpAssignmentDto(
        id = this.id!!,
        ipAddress = this.ipAddress,
        assignedTenantId = this.assignedTenant?.id,
        assignedTenantName = this.assignedTenant?.name,
        assignedDeviceId = this.assignedDevice?.id,
        assignedDeviceName = this.assignedDevice?.name,
        description = this.description,
        status = this.status
    )
}
