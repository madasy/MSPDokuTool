package com.msp.doku.service

import com.msp.doku.domain.Device
import com.msp.doku.domain.DeviceType
import com.msp.doku.domain.EncryptionAlgorithm
import com.msp.doku.domain.IkeVersion
import com.msp.doku.domain.Subnet
import com.msp.doku.domain.Tenant
import com.msp.doku.domain.TenantType
import com.msp.doku.domain.TunnelType
import com.msp.doku.domain.VpnTunnel
import com.msp.doku.dto.CreateVpnTunnelRequest
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VpnTunnelRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.util.Optional
import java.util.UUID

class VpnTunnelServiceTest {

    private val vpnTunnelRepository: VpnTunnelRepository = mock()
    private val tenantRepository: TenantRepository = mock()
    private val deviceRepository: DeviceRepository = mock()
    private val subnetRepository: SubnetRepository = mock()

    private val service = VpnTunnelService(vpnTunnelRepository, tenantRepository, deviceRepository, subnetRepository)

    private val customer = Tenant(name = "Kunde", identifier = "kunde").apply { id = UUID.randomUUID() }
    private val firewall = Device(name = "DC-FW-01", deviceType = DeviceType.FIREWALL)
        .apply { id = UUID.randomUUID() }

    @Test
    fun `createTunnel resolves references and maps advanced fields`() {
        val subnet = Subnet(tenant = customer, cidr = "10.10.0.0/24").apply { id = UUID.randomUUID() }
        whenever(tenantRepository.findById(customer.id!!)).thenReturn(Optional.of(customer))
        whenever(deviceRepository.findById(firewall.id!!)).thenReturn(Optional.of(firewall))
        whenever(subnetRepository.findById(subnet.id!!)).thenReturn(Optional.of(subnet))
        whenever(vpnTunnelRepository.save(any<VpnTunnel>())).thenAnswer { inv ->
            (inv.arguments[0] as VpnTunnel).apply { id = UUID.randomUUID() }
        }

        val dto = service.createTunnel(
            CreateVpnTunnelRequest(
                name = "S2S Kunde HQ",
                type = TunnelType.IPSEC_S2S,
                tenantId = customer.id!!,
                localDeviceId = firewall.id!!,
                remoteSubnetIds = listOf(subnet.id!!),
                ikeVersion = IkeVersion.IKEV2,
                encryption = EncryptionAlgorithm.AES_256,
                secretRef = "BW: vpn-kunde-psk"
            )
        )

        assertEquals("S2S Kunde HQ", dto.name)
        assertEquals("Kunde", dto.tenantName)
        assertEquals("DC-FW-01", dto.localDeviceName)
        assertEquals(1, dto.remoteSubnets.size)
        assertEquals("10.10.0.0/24", dto.remoteSubnets[0].cidr)
        assertEquals(IkeVersion.IKEV2, dto.ikeVersion)
    }

    @Test
    fun `createTunnel fails for unknown local device`() {
        whenever(tenantRepository.findById(customer.id!!)).thenReturn(Optional.of(customer))
        whenever(deviceRepository.findById(any())).thenReturn(Optional.empty())

        assertThrows<IllegalArgumentException> {
            service.createTunnel(
                CreateVpnTunnelRequest(
                    name = "x", type = TunnelType.IPSEC_S2S,
                    tenantId = customer.id!!, localDeviceId = UUID.randomUUID()
                )
            )
        }
    }

    @Test
    fun `deleteTunnel removes existing tunnel`() {
        val id = UUID.randomUUID()
        whenever(vpnTunnelRepository.existsById(id)).thenReturn(true)

        service.deleteTunnel(id)

        verify(vpnTunnelRepository).deleteById(id)
    }
}
