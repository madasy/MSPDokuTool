package com.msp.doku.config

import com.msp.doku.domain.*
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.RackRepository
import com.msp.doku.repository.RoomRepository
import com.msp.doku.repository.SiteRepository
import com.msp.doku.repository.TenantRepository
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
    private val tenantRepository: TenantRepository
) : CommandLineRunner {

    @Transactional
    override fun run(vararg args: String?) {
        if (deviceRepository.count() > 0) return

        println("Seeding initial data...")
        
        // Ensure default tenant exists
        val tenant = tenantRepository.findByIdentifier("default") 
            ?: tenantRepository.save(Tenant(name = "Default Tenant", identifier = "default"))

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
    }
}
