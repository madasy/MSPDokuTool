package com.msp.doku.service

import com.msp.doku.domain.Subnet
import com.msp.doku.domain.Tenant
import com.msp.doku.domain.TenantType
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VlanRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import java.util.UUID

class NetworkServiceTest {

    private val subnetRepository: SubnetRepository = mock()
    private val ipAddressRepository: IpAddressRepository = mock()
    private val tenantRepository: TenantRepository = mock()
    private val vlanRepository: VlanRepository = mock()

    private val service = NetworkService(subnetRepository, ipAddressRepository, tenantRepository, vlanRepository)

    @Test
    fun `getPublicSubnets maps public flag and assignment`() {
        val msp = Tenant(name = "iGeeks", identifier = "igeeks", type = TenantType.MSP)
            .apply { id = UUID.randomUUID() }
        val subnet = Subnet(tenant = msp, cidr = "203.0.113.0/24", description = "Primary Public Block", isPublic = true)
            .apply { id = UUID.randomUUID() }
        whenever(subnetRepository.findByIsPublicTrue()).thenReturn(listOf(subnet))
        whenever(ipAddressRepository.countBySubnetId(subnet.id!!)).thenReturn(12)

        val result = service.getPublicSubnets()

        assertEquals(1, result.size)
        assertTrue(result[0].isPublic)
        assertEquals("203.0.113.0/24", result[0].cidr)
        assertEquals(12, result[0].usedIps)
        assertEquals(256, result[0].totalIps)
    }
}
