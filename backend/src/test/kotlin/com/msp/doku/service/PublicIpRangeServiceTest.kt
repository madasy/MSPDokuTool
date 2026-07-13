package com.msp.doku.service

import com.msp.doku.domain.PublicIpAssignment
import com.msp.doku.domain.PublicIpRange
import com.msp.doku.domain.Tenant
import com.msp.doku.dto.UpdateIpAssignmentRequest
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.PublicIpAssignmentRepository
import com.msp.doku.repository.PublicIpRangeRepository
import com.msp.doku.repository.TenantRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import java.util.Optional
import java.util.UUID

class PublicIpRangeServiceTest {

    private val publicIpRangeRepository: PublicIpRangeRepository = mock()
    private val tenantRepository: TenantRepository = mock()
    private val assignmentRepository: PublicIpAssignmentRepository = mock()
    private val deviceRepository: DeviceRepository = mock()

    private val service = PublicIpRangeService(
        publicIpRangeRepository, tenantRepository, assignmentRepository, deviceRepository
    )

    @Test
    fun `updateAssignment clears tenant when clearAssignedTenant is true`() {
        val rangeId = UUID.randomUUID()
        val range = PublicIpRange(cidr = "10.0.0.0/24").apply { id = rangeId }
        val tenant = Tenant(name = "Kunde", identifier = "kunde").apply { id = UUID.randomUUID() }
        val assignment = PublicIpAssignment(range = range, ipAddress = "10.0.0.5", assignedTenant = tenant)
            .apply { id = UUID.randomUUID() }

        whenever(assignmentRepository.findByRangeIdAndIpAddress(rangeId, "10.0.0.5")).thenReturn(assignment)
        whenever(assignmentRepository.save(any<PublicIpAssignment>())).thenAnswer { it.arguments[0] }

        val request = UpdateIpAssignmentRequest(assignedTenantId = null, clearAssignedTenant = true)
        val result = service.updateAssignment(rangeId, "10.0.0.5", request)

        assertNull(result.assignedTenantId)
        assertNull(assignment.assignedTenant)
    }

    @Test
    fun `updateAssignment keeps tenant when field omitted`() {
        val rangeId = UUID.randomUUID()
        val range = PublicIpRange(cidr = "10.0.0.0/24").apply { id = rangeId }
        val tenant = Tenant(name = "Kunde", identifier = "kunde").apply { id = UUID.randomUUID() }
        val assignment = PublicIpAssignment(range = range, ipAddress = "10.0.0.5", assignedTenant = tenant)
            .apply { id = UUID.randomUUID() }

        whenever(assignmentRepository.findByRangeIdAndIpAddress(rangeId, "10.0.0.5")).thenReturn(assignment)
        whenever(assignmentRepository.save(any<PublicIpAssignment>())).thenAnswer { it.arguments[0] }

        val request = UpdateIpAssignmentRequest(assignedTenantId = null, clearAssignedTenant = false)
        val result = service.updateAssignment(rangeId, "10.0.0.5", request)

        assertEquals(tenant.id, result.assignedTenantId)
        assertEquals(tenant, assignment.assignedTenant)
    }

    @Test
    fun `updateAssignment throws when assignedTenantId is stale`() {
        val rangeId = UUID.randomUUID()
        val range = PublicIpRange(cidr = "10.0.0.0/24").apply { id = rangeId }
        val assignment = PublicIpAssignment(range = range, ipAddress = "10.0.0.5")
            .apply { id = UUID.randomUUID() }
        val staleTenantId = UUID.randomUUID()

        whenever(assignmentRepository.findByRangeIdAndIpAddress(rangeId, "10.0.0.5")).thenReturn(assignment)
        whenever(tenantRepository.findById(staleTenantId)).thenReturn(Optional.empty())

        val request = UpdateIpAssignmentRequest(assignedTenantId = staleTenantId, clearAssignedTenant = false)
        val ex = assertThrows<IllegalArgumentException> {
            service.updateAssignment(rangeId, "10.0.0.5", request)
        }

        assertTrue(ex.message!!.contains("Tenant not found"))
    }

    @Test
    fun `updateAssignment throws when assignedDeviceId is stale`() {
        val rangeId = UUID.randomUUID()
        val range = PublicIpRange(cidr = "10.0.0.0/24").apply { id = rangeId }
        val assignment = PublicIpAssignment(range = range, ipAddress = "10.0.0.5")
            .apply { id = UUID.randomUUID() }
        val staleDeviceId = UUID.randomUUID()

        whenever(assignmentRepository.findByRangeIdAndIpAddress(rangeId, "10.0.0.5")).thenReturn(assignment)
        whenever(deviceRepository.findById(staleDeviceId)).thenReturn(Optional.empty())

        val request = UpdateIpAssignmentRequest(assignedDeviceId = staleDeviceId)
        val ex = assertThrows<IllegalArgumentException> {
            service.updateAssignment(rangeId, "10.0.0.5", request)
        }

        assertTrue(ex.message!!.contains("Device not found"))
    }
}
