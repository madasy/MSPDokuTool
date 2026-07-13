package com.msp.doku.service

import com.msp.doku.domain.Tenant
import com.msp.doku.dto.AssignmentResponse
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VlanRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class AssignmentService(
    private val tenantRepository: TenantRepository,
    private val vlanRepository: VlanRepository,
    private val subnetRepository: SubnetRepository,
    private val ipAddressRepository: IpAddressRepository,
    private val deviceRepository: DeviceRepository
) {

    @Transactional
    fun assign(entityType: String, entityId: UUID, assignedTenantId: UUID?): AssignmentResponse {
        val assigned: Tenant? = assignedTenantId?.let {
            tenantRepository.findById(it).orElseThrow { IllegalArgumentException("Tenant not found") }
        }

        return when (entityType) {
            "vlans" -> {
                val vlan = vlanRepository.findById(entityId)
                    .orElseThrow { IllegalArgumentException("VLAN not found") }
                requireNotOwner(assigned, vlan.tenant)
                vlan.assignedTenant = assigned
                vlanRepository.save(vlan)
                response(entityId, assigned)
            }
            "subnets" -> {
                val subnet = subnetRepository.findById(entityId)
                    .orElseThrow { IllegalArgumentException("Subnet not found") }
                requireNotOwner(assigned, subnet.tenant)
                subnet.assignedTenant = assigned
                subnetRepository.save(subnet)
                response(entityId, assigned)
            }
            "ips" -> {
                val ip = ipAddressRepository.findById(entityId)
                    .orElseThrow { IllegalArgumentException("IP Address not found") }
                requireNotOwner(assigned, ip.subnet.tenant)
                ip.assignedTenant = assigned
                ipAddressRepository.save(ip)
                response(entityId, assigned)
            }
            "devices" -> {
                val device = deviceRepository.findById(entityId)
                    .orElseThrow { IllegalArgumentException("Device not found") }
                val owner = device.rack?.room?.site?.tenant ?: device.site?.tenant
                requireNotOwner(assigned, owner)
                device.assignedTenant = assigned
                deviceRepository.save(device)
                response(entityId, assigned)
            }
            else -> throw IllegalArgumentException("Unknown entity type: $entityType")
        }
    }

    private fun requireNotOwner(assigned: Tenant?, owner: Tenant?) {
        if (assigned != null && owner != null && assigned.id == owner.id) {
            throw IllegalArgumentException("Ressource gehört bereits diesem Tenant – Zuweisung nicht nötig")
        }
    }

    private fun response(id: UUID, assigned: Tenant?) =
        AssignmentResponse(id = id, assignedTenantId = assigned?.id, assignedTenantName = assigned?.name)
}
