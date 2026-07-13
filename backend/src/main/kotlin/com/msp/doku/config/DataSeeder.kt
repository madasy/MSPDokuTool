package com.msp.doku.config

import com.msp.doku.domain.*
import com.msp.doku.repository.CustomFieldRepository
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.NoteRepository
import com.msp.doku.repository.RackRepository
import com.msp.doku.repository.RoomRepository
import com.msp.doku.repository.SiteRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.VlanRepository
import com.msp.doku.repository.VpnTunnelRepository
import org.springframework.boot.CommandLineRunner
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Component
class DataSeeder(
    private val deviceRepository: DeviceRepository,
    private val rackRepository: RackRepository,
    private val siteRepository: SiteRepository,
    private val roomRepository: RoomRepository,
    private val tenantRepository: TenantRepository,
    private val subnetRepository: SubnetRepository,
    private val ipAddressRepository: IpAddressRepository,
    private val vlanRepository: VlanRepository,
    private val vpnTunnelRepository: VpnTunnelRepository,
    private val noteRepository: NoteRepository,
    private val customFieldRepository: CustomFieldRepository
) : CommandLineRunner {

    @Transactional
    override fun run(vararg args: String?) {
        val customer = seedCustomerDemo()
        seedMspInfra(customer)
    }

    private fun seedCustomerDemo(): Tenant {
        val existing = tenantRepository.findByIdentifier("default")
        if (existing != null) return existing

        println("Seeding initial data...")

        // Ensure default tenant exists
        val tenant = tenantRepository.save(Tenant(name = "Default Tenant", identifier = "default"))

        // Create Site
        val site = Site(name = "Hauptstandort", address = "Musterstraße 1, 8000 Zürich", tenant = tenant)
        siteRepository.save(site)

        // Create Room
        val room = Room(name = "Serverraum 1", floor = "UG", site = site)
        roomRepository.save(room)

        // Create Rack
        val rackA = Rack(name = "Rack A-01", heightUnits = 42, room = room)
        rackRepository.save(rackA)

        // Create Devices
        val devices = listOf(
            Device(
                name = "Core-Switch-01",
                deviceType = DeviceType.SWITCH,
                model = "HP Aruba 2930F-48G",
                serialNumber = "SW-2024-0001",
                managementIp = "10.0.0.1",
                macAddress = "AA:BB:CC:11:22:33",
                status = DeviceStatus.ACTIVE,
                rack = rackA,
                positionU = 40,
                heightU = 1
            ),
            Device(
                name = "Firewall-Main",
                deviceType = DeviceType.FIREWALL,
                model = "Sophos XGS 4300",
                serialNumber = "FW-2023-0042",
                managementIp = "10.0.0.254",
                macAddress = "AA:BB:CC:11:22:34",
                status = DeviceStatus.ACTIVE,
                rack = rackA,
                positionU = 38,
                heightU = 1
            ),
            Device(
                name = "ESXi-Host-01",
                deviceType = DeviceType.SERVER,
                model = "Dell PowerEdge R750",
                serialNumber = "SRV-2024-0012",
                managementIp = "10.0.1.10",
                macAddress = "AA:BB:CC:55:66:77",
                status = DeviceStatus.ACTIVE,
                rack = rackA,
                positionU = 10,
                heightU = 2
            ),
            Device(
                name = "ESXi-Host-02",
                deviceType = DeviceType.SERVER,
                model = "Dell PowerEdge R750",
                serialNumber = "SRV-2024-0013",
                managementIp = "10.0.1.11",
                macAddress = "AA:BB:CC:55:66:78",
                status = DeviceStatus.ACTIVE,
                rack = rackA,
                positionU = 8,
                heightU = 2
            ),
            Device(
                name = "NAS Storage",
                deviceType = DeviceType.OTHER,
                model = "Synology RS3621xs+",
                serialNumber = "NAS-2023-0005",
                managementIp = "10.0.1.20",
                macAddress = "AA:BB:CC:88:99:AA",
                status = DeviceStatus.ACTIVE,
                rack = rackA,
                positionU = 4,
                heightU = 4
            ),
            Device(
                name = "WiFi-AP-01",
                deviceType = DeviceType.WIFI_AP,
                model = "Unifi U6 Pro",
                serialNumber = "AP-2024-0001",
                managementIp = "10.0.0.50",
                macAddress = "DD:EE:FF:11:22:33",
                status = DeviceStatus.ACTIVE,
                site = site, // Not in Rack
                heightU = 0
            ),
            Device(
                name = "Switch-Ersatz",
                deviceType = DeviceType.SWITCH,
                model = "HP Aruba 2530-24G",
                serialNumber = "SW-2024-0010",
                status = DeviceStatus.STORAGE,
                site = site, // In Storage
                heightU = 1
            )
        )

        deviceRepository.saveAll(devices)
        println("Seeded ${devices.size} devices.")

        return tenant
    }

    private fun seedMspInfra(customer: Tenant) {
        if (tenantRepository.findByIdentifier("igeeks") != null) return

        println("Seeding MSP infrastructure...")
        val msp = tenantRepository.save(Tenant(name = "iGeeks (MSP)", identifier = "igeeks", type = TenantType.MSP))

        val dcSite = siteRepository.save(Site(name = "Datacenter Zürich", address = "Colo Park 1, 8005 Zürich", tenant = msp))
        val dcRoom = roomRepository.save(Room(name = "Colo Cage 4", floor = "EG", site = dcSite))
        val dcRack = rackRepository.save(Rack(name = "DC-Rack-01", heightUnits = 47, room = dcRoom))

        val dcFirewall = deviceRepository.save(
            Device(
                name = "DC-FW-01", deviceType = DeviceType.FIREWALL, model = "Fortinet FortiGate 200F",
                serialNumber = "FGT-2025-1001", managementIp = "172.16.0.1",
                rack = dcRack, positionU = 45, heightU = 1
            )
        )
        deviceRepository.save(
            Device(
                name = "Cloud-SRV-Default", deviceType = DeviceType.SERVER, model = "Dell PowerEdge R660",
                serialNumber = "SRV-2025-2001", managementIp = "172.16.10.20",
                rack = dcRack, positionU = 20, heightU = 1,
                assignedTenant = customer
            )
        )

        val primaryBlock = subnetRepository.save(
            Subnet(tenant = msp, cidr = "203.0.113.0/24", description = "Primary Public Block", isPublic = true)
        )
        val secondaryBlock = subnetRepository.save(
            Subnet(tenant = msp, cidr = "198.51.100.0/28", description = "Secondary Block", isPublic = true)
        )
        ipAddressRepository.saveAll(
            listOf(
                IpAddress(subnet = primaryBlock, address = "203.0.113.1", status = "reserved", description = "Gateway"),
                IpAddress(subnet = primaryBlock, address = "203.0.113.10", status = "active",
                    description = "Firewall WAN1", assignedTenant = customer),
                IpAddress(subnet = primaryBlock, address = "203.0.113.11", status = "active",
                    description = "Mail Gateway", assignedTenant = customer),
                IpAddress(subnet = secondaryBlock, address = "198.51.100.1", status = "active",
                    description = "VPN Gateway", assignedTenant = customer)
            )
        )

        vlanRepository.save(Vlan(vlanId = 110, name = "Default-Kunde", tenant = msp, assignedTenant = customer))

        val tunnel = vpnTunnelRepository.save(
            VpnTunnel(
                name = "S2S Default HQ", type = TunnelType.IPSEC_S2S, tenant = customer,
                localDevice = dcFirewall,
                ikeVersion = IkeVersion.IKEV2, encryption = EncryptionAlgorithm.AES_256,
                hash = HashAlgorithm.SHA256, dhGroup = 14,
                secretRef = "Bitwarden: vpn-default-psk"
            )
        )

        noteRepository.save(
            Note(
                title = "Failover Runbook DC-FW-01",
                contentMarkdown = "## HA-Failover\n\n1. HA-Status prüfen (`get system ha status`)\n2. Failover auslösen\n3. Tunnel-Status kontrollieren",
                entityType = DocEntityType.DEVICE, entityId = dcFirewall.id!!
            )
        )
        customFieldRepository.save(
            CustomField(
                name = "Supportvertrag", value = "FC-2026-042", fieldType = FieldType.TEXT,
                entityType = DocEntityType.DEVICE, entityId = dcFirewall.id!!
            )
        )
        println("Seeded MSP tenant with DC infra, public ranges and tunnel ${tunnel.name}.")
    }
}
