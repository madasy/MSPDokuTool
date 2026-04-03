package com.msp.doku.service

import com.msp.doku.dto.SearchResultDto
import com.msp.doku.dto.SearchResponseDto
import com.msp.doku.repository.*
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class SearchService(
    private val tenantRepository: TenantRepository,
    private val deviceRepository: DeviceRepository,
    private val subnetRepository: SubnetRepository,
    private val ipAddressRepository: IpAddressRepository,
    private val siteRepository: SiteRepository,
    private val rackRepository: RackRepository,
    private val vlanRepository: VlanRepository,
    private val documentationRepository: DocumentationRepository
) {

    fun search(query: String, limit: Int = 20): SearchResponseDto {
        if (query.isBlank() || query.length < 2) {
            return SearchResponseDto(query = query, totalResults = 0, results = emptyList())
        }

        val q = query.lowercase().trim()
        val results = mutableListOf<SearchResultDto>()

        // Search tenants
        tenantRepository.findAll().forEach { tenant ->
            if (tenant.name.lowercase().contains(q) || tenant.identifier.lowercase().contains(q)) {
                results.add(SearchResultDto(
                    type = "tenant", id = tenant.id!!, title = tenant.name,
                    subtitle = tenant.identifier, tenantId = tenant.id, tenantName = tenant.name,
                    link = "/tenants/${tenant.id}"
                ))
            }
        }

        // Search devices
        deviceRepository.findAll().forEach { device ->
            val tenantName = device.rack?.room?.site?.tenant?.name ?: device.site?.tenant?.name
            val tenantId = device.rack?.room?.site?.tenant?.id ?: device.site?.tenant?.id
            if (device.name.lowercase().contains(q) ||
                device.managementIp?.lowercase()?.contains(q) == true ||
                device.macAddress?.lowercase()?.contains(q) == true ||
                device.serialNumber?.lowercase()?.contains(q) == true ||
                device.model?.lowercase()?.contains(q) == true) {
                results.add(SearchResultDto(
                    type = "device", id = device.id!!, title = device.name,
                    subtitle = listOfNotNull(device.deviceType.name, device.managementIp, device.model).joinToString(" · "),
                    tenantId = tenantId, tenantName = tenantName,
                    link = "/tenants/${tenantId}/hardware"
                ))
            }
        }

        // Search subnets
        subnetRepository.findAll().forEach { subnet ->
            if (subnet.cidr.lowercase().contains(q) ||
                subnet.description?.lowercase()?.contains(q) == true ||
                subnet.gateway?.lowercase()?.contains(q) == true) {
                results.add(SearchResultDto(
                    type = "subnet", id = subnet.id!!, title = subnet.cidr,
                    subtitle = listOfNotNull(subnet.description, subnet.gateway?.let { "GW: $it" }).joinToString(" · "),
                    tenantId = subnet.tenant.id, tenantName = subnet.tenant.name,
                    link = "/tenants/${subnet.tenant.id}/network"
                ))
            }
        }

        // Search IP addresses
        ipAddressRepository.findAll().forEach { ip ->
            if (ip.address.lowercase().contains(q) ||
                ip.hostname?.lowercase()?.contains(q) == true ||
                ip.mac?.lowercase()?.contains(q) == true ||
                ip.description?.lowercase()?.contains(q) == true) {
                results.add(SearchResultDto(
                    type = "ip_address", id = ip.id!!, title = ip.address,
                    subtitle = listOfNotNull(ip.hostname, ip.mac, ip.description).joinToString(" · "),
                    tenantId = ip.subnet.tenant.id, tenantName = ip.subnet.tenant.name,
                    link = "/tenants/${ip.subnet.tenant.id}/network"
                ))
            }
        }

        // Search sites
        siteRepository.findAll().forEach { site ->
            if (site.name.lowercase().contains(q) ||
                site.address?.lowercase()?.contains(q) == true ||
                site.city?.lowercase()?.contains(q) == true) {
                results.add(SearchResultDto(
                    type = "site", id = site.id!!, title = site.name,
                    subtitle = listOfNotNull(site.address, site.city).joinToString(", "),
                    tenantId = site.tenant.id, tenantName = site.tenant.name,
                    link = "/tenants/${site.tenant.id}/sites"
                ))
            }
        }

        // Search VLANs
        vlanRepository.findAll().forEach { vlan ->
            val vlanStr = "VLAN ${vlan.vlanId}"
            if (vlanStr.lowercase().contains(q) ||
                vlan.name?.lowercase()?.contains(q) == true) {
                results.add(SearchResultDto(
                    type = "vlan", id = vlan.id!!, title = vlanStr,
                    subtitle = vlan.name,
                    tenantId = vlan.tenant.id, tenantName = vlan.tenant.name,
                    link = "/tenants/${vlan.tenant.id}/network"
                ))
            }
        }

        // Search documentation sections
        documentationRepository.findAll().forEach { doc ->
            val allText = doc.structuredData.values.joinToString(" ") { it.toString() } + " " + (doc.notes ?: "")
            if (allText.lowercase().contains(q)) {
                results.add(SearchResultDto(
                    type = "documentation", id = doc.id!!, title = doc.sectionType.replace("_", " ").replaceFirstChar { it.uppercase() },
                    subtitle = "Dokumentation",
                    tenantId = doc.tenant.id, tenantName = doc.tenant.name,
                    link = "/tenants/${doc.tenant.id}/docs"
                ))
            }
        }

        val sortedResults = results.take(limit)

        return SearchResponseDto(
            query = query,
            totalResults = results.size,
            results = sortedResults
        )
    }
}
