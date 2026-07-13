package com.msp.doku.service

import com.msp.doku.domain.Device
import com.msp.doku.domain.DeviceType
import com.msp.doku.domain.IpAddress
import com.msp.doku.domain.Subnet
import com.msp.doku.domain.Tenant
import com.msp.doku.domain.TenantType
import com.msp.doku.domain.TunnelType
import com.msp.doku.domain.Vlan
import com.msp.doku.domain.VpnTunnel
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.IpAddressRepository
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
    private val ipAddressRepository: IpAddressRepository = mock()
    private val deviceRepository: DeviceRepository = mock()
    private val vpnTunnelRepository: VpnTunnelRepository = mock()

    private val service = ProvidedResourcesService(
        vlanRepository, subnetRepository, ipAddressRepository, deviceRepository, vpnTunnelRepository
    )

    @Test
    fun `aggregates all resource kinds assigned to a tenant`() {
        val msp = Tenant(name = "iGeeks", identifier = "igeeks", type = TenantType.MSP)
            .apply { id = UUID.randomUUID() }
        val customer = Tenant(name = "Kunde", identifier = "kunde").apply { id = UUID.randomUUID() }
        val customerId = customer.id!!

        val publicSubnet = Subnet(tenant = msp, cidr = "203.0.113.0/24", isPublic = true)
            .apply { id = UUID.randomUUID() }
        val firewall = Device(name = "DC-FW-01", deviceType = DeviceType.FIREWALL).apply { id = UUID.randomUUID() }

        whenever(vlanRepository.findByAssignedTenantId(customerId)).thenReturn(
            listOf(Vlan(vlanId = 110, name = "Kunde-VLAN", tenant = msp, assignedTenant = customer)
                .apply { id = UUID.randomUUID() })
        )
        whenever(subnetRepository.findByAssignedTenantId(customerId)).thenReturn(emptyList())
        whenever(ipAddressRepository.findByAssignedTenantId(customerId)).thenReturn(
            listOf(IpAddress(subnet = publicSubnet, address = "203.0.113.10", description = "Firewall WAN1",
                assignedTenant = customer).apply { id = UUID.randomUUID() })
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
        assertEquals(1, result.publicIps.size)
        assertEquals("Firewall WAN1", result.publicIps[0].usage)
        assertEquals("203.0.113.0/24", result.publicIps[0].subnetCidr)
        assertEquals(0, result.subnets.size)
        assertEquals(1, result.devices.size)
        assertEquals(1, result.vpnTunnels.size)
        assertEquals("DC-FW-01", result.vpnTunnels[0].localDeviceName)
    }
}
