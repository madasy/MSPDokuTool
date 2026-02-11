package com.msp.doku.service

import com.msp.doku.domain.IpAddress
import com.msp.doku.domain.Subnet
import com.msp.doku.domain.Vlan
import com.msp.doku.dto.CreateIpAddressRequest
import com.msp.doku.dto.CreateSubnetRequest
import com.msp.doku.dto.IpAddressDto
import com.msp.doku.dto.SubnetDto
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VlanRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import kotlin.math.pow

@Service
class NetworkService(
    private val subnetRepository: SubnetRepository,
    private val ipAddressRepository: IpAddressRepository,
    private val tenantRepository: TenantRepository,
    private val vlanRepository: VlanRepository
) {

    fun getSubnetsForTenant(tenantId: UUID): List<SubnetDto> {
        return subnetRepository.findByTenantId(tenantId).map { subnet ->
            val usedIps = ipAddressRepository.countBySubnetId(subnet.id!!)
            val totalIps = calculateTotalIps(subnet.cidr)
            
            SubnetDto(
                id = subnet.id!!,
                cidr = subnet.cidr,
                description = subnet.description,
                vlanId = subnet.vlan?.id,
                vlanTag = subnet.vlan?.vlanId,
                vlanName = subnet.vlan?.name ?: (subnet.vlan?.vlanId?.toString()),
                gateway = subnet.gateway,
                usedIps = usedIps,
                totalIps = totalIps,
                utilizationPercent = if (totalIps > 0) (usedIps.toDouble() / totalIps) * 100 else 0.0
            )
        }
    }

    fun getIpAddresses(subnetId: UUID): List<IpAddressDto> {
        return ipAddressRepository.findBySubnetId(subnetId).map { it.toDto() }
    }

    @Transactional
    fun createSubnet(request: CreateSubnetRequest): SubnetDto {
        val tenant = tenantRepository.findById(request.tenantId)
            .orElseThrow { IllegalArgumentException("Tenant not found") }

        val subnet = Subnet(
            tenant = tenant,
            cidr = request.cidr,
            description = request.description?.ifBlank { null },
            gateway = request.gateway?.ifBlank { null }
        )

        // Handle VLAN logic
        if (request.vlanTag != null) {
            val vlan = vlanRepository.findByTenantAndVlanId(tenant, request.vlanTag)
                .orElseGet {
                    // Create new VLAN if not found
                    val newVlan = Vlan(
                        vlanId = request.vlanTag,
                        name = request.vlanName?.ifBlank { "VLAN ${request.vlanTag}" },
                        tenant = tenant
                    )
                    vlanRepository.save(newVlan)
                }
            subnet.vlan = vlan
        } else if (request.vlanId != null) {
            // If explicit UUID provided (future use)
            val vlan = vlanRepository.findById(request.vlanId)
                .orElseThrow { IllegalArgumentException("VLAN not found") }
            subnet.vlan = vlan
        }
        val saved = subnetRepository.save(subnet)
        
        return SubnetDto(
            id = saved.id!!,
            cidr = saved.cidr,
            description = saved.description,
            usedIps = 0,
            totalIps = calculateTotalIps(saved.cidr),
            utilizationPercent = 0.0
        )
    }

    @Transactional
    fun createIpAddress(request: CreateIpAddressRequest): IpAddressDto {
        val subnet = subnetRepository.findById(request.subnetId)
            .orElseThrow { IllegalArgumentException("Subnet not found") }

        val ip = IpAddress(
            subnet = subnet,
            address = request.address,
            status = request.status.ifBlank { "active" },
            hostname = request.hostname?.ifBlank { null },
            description = request.description?.ifBlank { null },
            mac = request.mac?.ifBlank { null }
        )
        return ipAddressRepository.save(ip).toDto()
    }

    @Transactional
    fun updateIpAddress(id: UUID, request: com.msp.doku.dto.UpdateIpAddressRequest): IpAddressDto {
        val ip = ipAddressRepository.findById(id)
            .orElseThrow { IllegalArgumentException("IP Address not found") }

        request.status?.let { ip.status = it.ifBlank { "active" } }
        request.hostname?.let { ip.hostname = it.ifBlank { null } }
        request.description?.let { ip.description = it.ifBlank { null } }
        request.mac?.let { ip.mac = it.ifBlank { null } }

        return ipAddressRepository.save(ip).toDto()
    }

    @Transactional
    fun deleteIpAddress(id: UUID) {
        if (!ipAddressRepository.existsById(id)) {
            throw IllegalArgumentException("IP Address not found")
        }
        ipAddressRepository.deleteById(id)
    }

    private fun calculateTotalIps(cidr: String): Int {
        try {
            val prefix = cidr.split("/")[1].toInt()
            return 2.0.pow(32 - prefix).toInt()
        } catch (e: Exception) {
            return 0
        }
    }

    private fun IpAddress.toDto() = IpAddressDto(
        id = this.id!!,
        address = this.address,
        status = this.status,
        hostname = this.hostname,
        description = this.description,
        mac = this.mac
    )
}
