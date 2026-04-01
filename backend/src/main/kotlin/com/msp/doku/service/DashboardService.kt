package com.msp.doku.service

import com.msp.doku.dto.ActivityEntryDto
import com.msp.doku.dto.DashboardStatsDto
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import org.springframework.stereotype.Service

@Service
class DashboardService(
    private val tenantRepository: TenantRepository,
    private val deviceRepository: DeviceRepository,
    private val subnetRepository: SubnetRepository,
    private val ipAddressRepository: IpAddressRepository
) {

    fun getStats(): DashboardStatsDto {
        return DashboardStatsDto(
            tenantCount = tenantRepository.count(),
            totalDevices = deviceRepository.count(),
            totalSubnets = subnetRepository.count(),
            totalIpAddresses = ipAddressRepository.count()
        )
    }

    fun getRecentActivity(limit: Int): List<ActivityEntryDto> {
        val activities = mutableListOf<ActivityEntryDto>()

        deviceRepository.findAll().forEach { device ->
            val tenantName = device.rack?.room?.site?.tenant?.name
                ?: device.site?.tenant?.name
            activities.add(ActivityEntryDto(
                type = "device",
                name = device.name,
                tenantName = tenantName,
                action = if (device.updatedAt != null && device.createdAt != null &&
                    device.updatedAt != device.createdAt) "updated" else "created",
                timestamp = device.updatedAt ?: device.createdAt!!
            ))
        }

        subnetRepository.findAll().forEach { subnet ->
            activities.add(ActivityEntryDto(
                type = "subnet",
                name = subnet.cidr,
                tenantName = subnet.tenant.name,
                action = if (subnet.updatedAt != null && subnet.createdAt != null &&
                    subnet.updatedAt != subnet.createdAt) "updated" else "created",
                timestamp = subnet.updatedAt ?: subnet.createdAt!!
            ))
        }

        ipAddressRepository.findAll().forEach { ip ->
            activities.add(ActivityEntryDto(
                type = "ip_address",
                name = ip.address,
                tenantName = ip.subnet.tenant.name,
                action = if (ip.updatedAt != null && ip.createdAt != null &&
                    ip.updatedAt != ip.createdAt) "updated" else "created",
                timestamp = ip.updatedAt ?: ip.createdAt!!
            ))
        }

        return activities.sortedByDescending { it.timestamp }.take(limit)
    }
}
