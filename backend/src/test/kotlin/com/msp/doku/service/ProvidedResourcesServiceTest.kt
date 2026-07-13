package com.msp.doku.service

import com.msp.doku.domain.Device
import com.msp.doku.domain.DeviceType
import com.msp.doku.domain.PublicIpAssignment
import com.msp.doku.domain.PublicIpRange
import com.msp.doku.domain.Tenant
import com.msp.doku.domain.TenantType
import com.msp.doku.domain.TunnelType
import com.msp.doku.domain.Vlan
import com.msp.doku.domain.VpnTunnel
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.PublicIpAssignmentRepository
import com.msp.doku.repository.PublicIpRangeRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.VlanRepository
import com.msp.doku.repository.VpnTunnelRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import java.util.UUID

class ProvidedResourcesServiceTest {

    private val vlanRepository: VlanRepository = mock()
    private val subnetRepository: SubnetRepository = mock()
    private val publicIpAssignmentRepository: PublicIpAssignmentRepository = mock()
    private val publicIpRangeRepository: PublicIpRangeRepository = mock()
    private val deviceRepository: DeviceRepository = mock()
    private val vpnTunnelRepository: VpnTunnelRepository = mock()

    private val service = ProvidedResourcesService(
        vlanRepository, subnetRepository, publicIpAssignmentRepository, publicIpRangeRepository,
        deviceRepository, vpnTunnelRepository
    )

    @Test
    fun `aggregates all resource kinds assigned to a tenant`() {
        val msp = Tenant(name = "iGeeks", identifier = "igeeks", type = TenantType.MSP)
            .apply { id = UUID.randomUUID() }
        val customer = Tenant(name = "Kunde", identifier = "kunde").apply { id = UUID.randomUUID() }
        val customerId = customer.id!!

        val firewall = Device(name = "DC-FW-01", deviceType = DeviceType.FIREWALL).apply { id = UUID.randomUUID() }

        val publicRange = PublicIpRange(cidr = "203.0.113.0/24").apply { id = UUID.randomUUID() }
        val wholeRangeAssignment = PublicIpRange(cidr = "198.51.100.0/28", description = "Kunde-Range", assignedTenant = customer)
            .apply { id = UUID.randomUUID() }

        whenever(vlanRepository.findByAssignedTenantId(customerId)).thenReturn(
            listOf(Vlan(vlanId = 110, name = "Kunde-VLAN", tenant = msp, assignedTenant = customer)
                .apply { id = UUID.randomUUID() })
        )
        whenever(subnetRepository.findByAssignedTenantId(customerId)).thenReturn(emptyList())
        whenever(publicIpAssignmentRepository.findByAssignedTenantId(customerId)).thenReturn(
            listOf(
                PublicIpAssignment(range = publicRange, ipAddress = "203.0.113.10", description = "Firewall WAN1", assignedTenant = customer)
                    .apply { id = UUID.randomUUID() }
            )
        )
        whenever(publicIpRangeRepository.findByAssignedTenantId(customerId)).thenReturn(
            listOf(wholeRangeAssignment)
        )
        whenever(deviceRepository.findByAssignedTenantId(customerId)).thenReturn(
            listOf(Device(name = "Cloud-SRV-01", deviceType = DeviceType.SERVER, model = "Dell R660",
                assignedTenant = customer).apply { id = UUID.randomUUID() })
        )
        whenever(vpnTunnelRepository.findByTenantId(customerId)).thenReturn(
            listOf(VpnTunnel(name = "S2S HQ", type = TunnelType.IPSEC_S2S, tenant = customer,
                localDevice = firewall).apply { id = UUID.randomUUID() })
        )

        val result = service.getProvidedResources(customerId)

        assertEquals(1, result.vlans.size)
        assertEquals(110, result.vlans[0].vlanTag)
        assertEquals("iGeeks", result.vlans[0].ownerTenantName)
        assertEquals(2, result.publicIps.size)
        assertEquals("Firewall WAN1", result.publicIps[0].usage)
        assertEquals("203.0.113.0/24", result.publicIps[0].rangeCidr)
        assertEquals("198.51.100.0/28", result.publicIps[1].ipAddress)
        assertEquals("198.51.100.0/28", result.publicIps[1].rangeCidr)
        assertEquals("Kunde-Range", result.publicIps[1].usage)
        assertEquals(0, result.subnets.size)
        assertEquals(1, result.devices.size)
        assertEquals(1, result.vpnTunnels.size)
        assertEquals("DC-FW-01", result.vpnTunnels[0].localDeviceName)
    }
}
