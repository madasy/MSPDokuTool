package com.msp.doku.service

import com.msp.doku.domain.Tenant
import com.msp.doku.domain.TenantType
import com.msp.doku.dto.CreateTenantRequest
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.DocumentationRepository
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.RackRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VlanRepository
import com.msp.doku.repository.VpnTunnelRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.util.Optional
import java.util.UUID

class TenantServiceTest {

    private val tenantRepository: TenantRepository = mock()
    private val deviceRepository: DeviceRepository = mock()
    private val subnetRepository: SubnetRepository = mock()
    private val ipAddressRepository: IpAddressRepository = mock()
    private val rackRepository: RackRepository = mock()
    private val documentationRepository: DocumentationRepository = mock()
    private val vlanRepository: VlanRepository = mock()
    private val vpnTunnelRepository: VpnTunnelRepository = mock()
    private val entityDocService: EntityDocService = mock()

    private val service = TenantService(
        tenantRepository, deviceRepository, subnetRepository,
        ipAddressRepository, rackRepository, documentationRepository,
        vlanRepository, vpnTunnelRepository, entityDocService
    )

    @Test
    fun `createTenant persists MSP type`() {
        whenever(tenantRepository.findByIdentifier("igeeks")).thenReturn(null)
        whenever(tenantRepository.existsByType(TenantType.MSP)).thenReturn(false)
        whenever(tenantRepository.save(any<Tenant>())).thenAnswer { inv ->
            (inv.arguments[0] as Tenant).apply { id = UUID.randomUUID() }
        }

        val dto = service.createTenant(CreateTenantRequest(name = "iGeeks", identifier = "igeeks", type = TenantType.MSP))

        assertEquals(TenantType.MSP, dto.type)
    }

    @Test
    fun `createTenant rejects second MSP tenant`() {
        whenever(tenantRepository.findByIdentifier("igeeks2")).thenReturn(null)
        whenever(tenantRepository.existsByType(TenantType.MSP)).thenReturn(true)

        assertThrows<IllegalArgumentException> {
            service.createTenant(CreateTenantRequest(name = "iGeeks 2", identifier = "igeeks2", type = TenantType.MSP))
        }
    }

    @Test
    fun `deleteTenant is blocked by inbound assignments`() {
        val id = UUID.randomUUID()
        whenever(tenantRepository.findById(id)).thenReturn(
            Optional.of(Tenant(name = "Kunde", identifier = "kunde").apply { this.id = id })
        )
        whenever(vlanRepository.existsByAssignedTenantId(id)).thenReturn(true)
        whenever(subnetRepository.existsByAssignedTenantId(id)).thenReturn(false)
        whenever(deviceRepository.existsByAssignedTenantId(id)).thenReturn(false)
        whenever(vpnTunnelRepository.existsByTenantId(id)).thenReturn(true)

        val ex = assertThrows<IllegalStateException> { service.deleteTenant(id) }

        assertTrue(ex.message!!.contains("VLANs"))
        assertTrue(ex.message!!.contains("VPN-Tunnel"))
        verify(tenantRepository, never()).delete(any<Tenant>())
    }

    @Test
    fun `deleteTenant deletes when nothing is assigned`() {
        val id = UUID.randomUUID()
        val tenant = Tenant(name = "Kunde", identifier = "kunde").apply { this.id = id }
        whenever(tenantRepository.findById(id)).thenReturn(Optional.of(tenant))
        whenever(vlanRepository.existsByAssignedTenantId(id)).thenReturn(false)
        whenever(subnetRepository.existsByAssignedTenantId(id)).thenReturn(false)
        whenever(deviceRepository.existsByAssignedTenantId(id)).thenReturn(false)
        whenever(vpnTunnelRepository.existsByTenantId(id)).thenReturn(false)

        service.deleteTenant(id)

        verify(entityDocService).deleteAllForEntity(com.msp.doku.domain.DocEntityType.TENANT, id)
        verify(tenantRepository).delete(tenant)
    }
}
