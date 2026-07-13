package com.msp.doku.service

import com.msp.doku.domain.DocEntityType
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.RackRepository
import com.msp.doku.repository.SiteRepository
import com.msp.doku.repository.VpnTunnelRepository
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.util.UUID

class DeviceServiceTest {

    private val deviceRepository: DeviceRepository = mock()
    private val rackRepository: RackRepository = mock()
    private val siteRepository: SiteRepository = mock()
    private val entityDocService: EntityDocService = mock()
    private val vpnTunnelRepository: VpnTunnelRepository = mock()

    private val service = DeviceService(
        deviceRepository, rackRepository, siteRepository, entityDocService, vpnTunnelRepository
    )

    @Test
    fun `deleteDevice is blocked when device is a VPN tunnel endpoint`() {
        val id = UUID.randomUUID()
        whenever(vpnTunnelRepository.existsByLocalDeviceId(id)).thenReturn(true)

        val ex = assertThrows<IllegalStateException> { service.deleteDevice(id) }

        assertTrue(ex.message!!.contains("VPN-Tunnel"))
        verify(deviceRepository, never()).deleteById(any())
    }

    @Test
    fun `deleteDevice deletes when not a VPN tunnel endpoint`() {
        val id = UUID.randomUUID()
        whenever(vpnTunnelRepository.existsByLocalDeviceId(id)).thenReturn(false)
        whenever(deviceRepository.existsById(id)).thenReturn(true)

        service.deleteDevice(id)

        verify(entityDocService).deleteAllForEntity(DocEntityType.DEVICE, id)
        verify(deviceRepository).deleteById(id)
    }
}
