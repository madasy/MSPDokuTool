package com.msp.doku.service

import com.msp.doku.domain.Subnet
import com.msp.doku.domain.Tenant
import com.msp.doku.domain.TenantType
import com.msp.doku.domain.Vlan
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VlanRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import java.util.Optional
import java.util.UUID

class AssignmentServiceTest {

    private val tenantRepository: TenantRepository = mock()
    private val vlanRepository: VlanRepository = mock()
    private val subnetRepository: SubnetRepository = mock()
    private val deviceRepository: DeviceRepository = mock()

    private val service = AssignmentService(
        tenantRepository, vlanRepository, subnetRepository, deviceRepository
    )

    private val msp = Tenant(name = "iGeeks", identifier = "igeeks", type = TenantType.MSP)
        .apply { id = UUID.randomUUID() }
    private val customer = Tenant(name = "Kunde", identifier = "kunde")
        .apply { id = UUID.randomUUID() }

    @Test
    fun `assigns a customer to an MSP-owned vlan`() {
        val vlan = Vlan(vlanId = 110, name = "Kunde-VLAN", tenant = msp).apply { id = UUID.randomUUID() }
        whenever(tenantRepository.findById(customer.id!!)).thenReturn(Optional.of(customer))
        whenever(vlanRepository.findById(vlan.id!!)).thenReturn(Optional.of(vlan))
        whenever(vlanRepository.save(any<Vlan>())).thenAnswer { it.arguments[0] }

        val result = service.assign("vlans", vlan.id!!, customer.id)

        assertEquals(customer.id, result.assignedTenantId)
        assertEquals("Kunde", result.assignedTenantName)
    }

    @Test
    fun `rejects assignment to the owning tenant`() {
        val vlan = Vlan(vlanId = 1, tenant = customer).apply { id = UUID.randomUUID() }
        whenever(tenantRepository.findById(customer.id!!)).thenReturn(Optional.of(customer))
        whenever(vlanRepository.findById(vlan.id!!)).thenReturn(Optional.of(vlan))

        assertThrows<IllegalArgumentException> { service.assign("vlans", vlan.id!!, customer.id) }
    }

    @Test
    fun `unassigns with null tenant id`() {
        val subnet = Subnet(tenant = msp, cidr = "203.0.113.0/24", assignedTenant = customer)
            .apply { id = UUID.randomUUID() }
        whenever(subnetRepository.findById(subnet.id!!)).thenReturn(Optional.of(subnet))
        whenever(subnetRepository.save(any<Subnet>())).thenAnswer { it.arguments[0] }

        val result = service.assign("subnets", subnet.id!!, null)

        assertNull(result.assignedTenantId)
    }

    @Test
    fun `rejects unknown entity type`() {
        assertThrows<IllegalArgumentException> { service.assign("routers", UUID.randomUUID(), null) }
    }
}
