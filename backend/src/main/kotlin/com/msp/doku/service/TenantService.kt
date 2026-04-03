package com.msp.doku.service

import com.msp.doku.domain.Tenant
import com.msp.doku.dto.ActionItemDto
import com.msp.doku.dto.CategoryScoreDto
import com.msp.doku.dto.CreateTenantRequest
import com.msp.doku.dto.TenantDto
import com.msp.doku.dto.TenantHealthDto
import com.msp.doku.dto.TenantSummaryDto
import com.msp.doku.repository.DocumentationRepository
import com.msp.doku.repository.TenantRepository
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.SubnetRepository
import com.msp.doku.repository.IpAddressRepository
import com.msp.doku.repository.RackRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import kotlin.math.pow

@Service
class TenantService(
    private val tenantRepository: TenantRepository,
    private val deviceRepository: DeviceRepository,
    private val subnetRepository: SubnetRepository,
    private val ipAddressRepository: IpAddressRepository,
    private val rackRepository: RackRepository,
    private val documentationRepository: DocumentationRepository
) {

    fun getAllTenants(): List<TenantDto> {
        return tenantRepository.findAll().map { it.toDto() }
    }

    @Transactional
    fun createTenant(request: CreateTenantRequest): TenantDto {
        if (tenantRepository.findByIdentifier(request.identifier) != null) {
            throw IllegalArgumentException("Tenant with identifier '${request.identifier}' already exists")
        }

        val tenant = Tenant(
            name = request.name,
            identifier = request.identifier
        )
        return tenantRepository.save(tenant).toDto()
    }

    fun getSummary(tenantId: UUID): TenantSummaryDto {
        val devices = deviceRepository.findByTenantId(tenantId)
        val devicesByType = devices.groupBy { it.deviceType.name }.mapValues { it.value.size.toLong() }

        val subnets = subnetRepository.findByTenantId(tenantId)
        val subnetCount = subnets.size.toLong()

        var totalIps = 0
        var usedIps = 0
        subnets.forEach { subnet ->
            val prefix = subnet.cidr.split("/").getOrNull(1)?.toIntOrNull() ?: 0
            totalIps += 2.0.pow(32 - prefix).toInt()
            usedIps += ipAddressRepository.countBySubnetId(subnet.id!!)
        }
        val ipUtilization = if (totalIps > 0) (usedIps.toDouble() / totalIps) * 100 else 0.0

        val rackCount = rackRepository.countByTenantId(tenantId)

        return TenantSummaryDto(
            deviceCount = devices.size.toLong(),
            devicesByType = devicesByType,
            subnetCount = subnetCount,
            ipUtilization = ipUtilization,
            rackCount = rackCount
        )
    }

    fun getHealth(tenantId: UUID): TenantHealthDto {
        val devices = deviceRepository.findByTenantId(tenantId)
        val subnets = subnetRepository.findByTenantId(tenantId)
        val racks = rackRepository.findByTenantId(tenantId)
        val docs = documentationRepository.findByTenantId(tenantId).associateBy { it.sectionType }

        val networkScore = calculateNetworkScore(subnets)
        val hardwareScore = calculateHardwareScore(devices)
        val accessScore = calculateDocScore(docs, "access_credentials")
        val monitoringScore = calculateDocScore(docs, "monitoring_alerting")
        val backupScore = calculateDocScore(docs, "backup_recovery")
        val recoveryScore = calculateDocScore(docs, "disaster_recovery")
        val securityScore = calculateDocScore(docs, "security_baseline")

        val categories = listOf(
            CategoryScoreDto("Netzwerk", networkScore, scoreColor(networkScore)),
            CategoryScoreDto("Hardware", hardwareScore, scoreColor(hardwareScore)),
            CategoryScoreDto("Access", accessScore, scoreColor(accessScore)),
            CategoryScoreDto("Monitoring", monitoringScore, scoreColor(monitoringScore)),
            CategoryScoreDto("Backup", backupScore, scoreColor(backupScore)),
            CategoryScoreDto("Recovery", recoveryScore, scoreColor(recoveryScore)),
            CategoryScoreDto("Security", securityScore, scoreColor(securityScore)),
        )

        val overallScore = categories.map { it.score }.average().toInt()
        val overallLevel = when {
            overallScore >= 80 -> "fully_documented"
            overallScore >= 60 -> "managed"
            overallScore >= 40 -> "operational"
            else -> "basic"
        }

        val actions = mutableListOf<ActionItemDto>()

        val noSerial = devices.count { it.serialNumber.isNullOrBlank() }
        if (noSerial > 0) {
            actions.add(ActionItemDto("warning", "$noSerial Geräte ohne Seriennummer", "Hardware > Geräte vervollständigen", "hardware"))
        }

        val noIp = devices.count { it.managementIp.isNullOrBlank() }
        if (noIp > 0) {
            actions.add(ActionItemDto("info", "$noIp Geräte ohne Management-IP", "Hardware > IP-Adressen ergänzen", "hardware"))
        }

        val accessDoc = docs["access_credentials"]
        val breakGlassField = accessDoc?.structuredData?.get("breakGlassAccounts")?.toString()
        if (breakGlassField.isNullOrBlank()) {
            actions.add(ActionItemDto("critical", "Kein Break-Glass Konto", "Dokumentation > Access & Credentials", "docs/access_credentials"))
        }

        val backupDoc = docs["backup_recovery"]
        val backupTargets = backupDoc?.structuredData?.get("backupTargets")?.toString()
        if (backupTargets.isNullOrBlank()) {
            actions.add(ActionItemDto("warning", "Kein Backup-Ziel dokumentiert", "Dokumentation > Backup & Recovery", "docs/backup_recovery"))
        }

        val monitoringDoc = docs["monitoring_alerting"]
        if (monitoringDoc == null || monitoringDoc.structuredData.values.all { it.toString().isBlank() }) {
            actions.add(ActionItemDto("critical", "Kein Monitoring dokumentiert", "Dokumentation > Monitoring & Alerting", "docs/monitoring_alerting"))
        }

        if (racks.isEmpty() && devices.isNotEmpty()) {
            actions.add(ActionItemDto("info", "Geräte ohne Rack-Zuordnung", "Racks > Geräte zuordnen", "racks"))
        }

        val switches = devices.filter { it.deviceType.name == "SWITCH" }
        if (switches.isNotEmpty()) {
            actions.add(ActionItemDto("info", "${switches.size} Switches vorhanden", "Switches > Ports konfigurieren", "switches"))
        }

        val completedDocs = docs.filter { (_, v) ->
            v.structuredData.values.count { it.toString().isNotBlank() } > 0
        }
        if (completedDocs.containsKey("network_architecture")) {
            actions.add(ActionItemDto("ok", "Netzwerk-Architektur dokumentiert", "Alle relevanten Felder ausgefüllt", "docs/network_architecture"))
        }

        return TenantHealthDto(
            overallScore = overallScore,
            overallLevel = overallLevel,
            categories = categories,
            actions = actions.sortedBy {
                when (it.severity) { "critical" -> 0; "warning" -> 1; "info" -> 2; else -> 3 }
            }
        )
    }

    private fun calculateNetworkScore(subnets: List<com.msp.doku.domain.Subnet>): Int {
        if (subnets.isEmpty()) return 0
        var score = 30
        if (subnets.size >= 2) score += 20
        val withGateway = subnets.count { !it.gateway.isNullOrBlank() }
        score += (withGateway.toDouble() / subnets.size * 30).toInt()
        val withVlan = subnets.count { it.vlan != null }
        score += (withVlan.toDouble() / subnets.size * 20).toInt()
        return score.coerceAtMost(100)
    }

    private fun calculateHardwareScore(devices: List<com.msp.doku.domain.Device>): Int {
        if (devices.isEmpty()) return 0
        var score = 20
        val withModel = devices.count { !it.model.isNullOrBlank() }
        score += (withModel.toDouble() / devices.size * 25).toInt()
        val withSerial = devices.count { !it.serialNumber.isNullOrBlank() }
        score += (withSerial.toDouble() / devices.size * 25).toInt()
        val withIp = devices.count { !it.managementIp.isNullOrBlank() }
        score += (withIp.toDouble() / devices.size * 15).toInt()
        val inRack = devices.count { it.rack != null }
        score += (inRack.toDouble() / devices.size * 15).toInt()
        return score.coerceAtMost(100)
    }

    private fun calculateDocScore(docs: Map<String, com.msp.doku.domain.DocumentationSection>, sectionType: String): Int {
        val doc = docs[sectionType] ?: return 0
        val fields = doc.structuredData
        if (fields.isEmpty()) return 0
        val filled = fields.values.count { it.toString().isNotBlank() }
        val total = fields.size.coerceAtLeast(1)
        val baseScore = ((filled.toDouble() / total) * 80).toInt()
        val hasNotes = !doc.notes.isNullOrBlank()
        return (baseScore + if (hasNotes) 20 else 0).coerceAtMost(100)
    }

    private fun scoreColor(score: Int): String = when {
        score >= 70 -> "green"
        score >= 40 -> "amber"
        else -> "red"
    }

    private fun Tenant.toDto() = TenantDto(
        id = this.id!!,
        name = this.name,
        identifier = this.identifier,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt
    )
}
