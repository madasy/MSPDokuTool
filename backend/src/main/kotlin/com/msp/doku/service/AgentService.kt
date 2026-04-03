package com.msp.doku.service

import com.msp.doku.domain.AgentKey
import com.msp.doku.domain.AgentReport
import com.msp.doku.domain.NetworkScanResult
import com.msp.doku.dto.*
import com.msp.doku.repository.AgentKeyRepository
import com.msp.doku.repository.AgentReportRepository
import com.msp.doku.repository.DeviceRepository
import com.msp.doku.repository.NetworkScanResultRepository
import com.msp.doku.repository.TenantRepository
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class AgentService(
    private val agentKeyRepository: AgentKeyRepository,
    private val agentReportRepository: AgentReportRepository,
    private val tenantRepository: TenantRepository,
    private val deviceRepository: DeviceRepository,
    private val networkScanResultRepository: NetworkScanResultRepository
) {
    private val passwordEncoder = BCryptPasswordEncoder()

    // --- Agent Key Management ---

    fun getKeysByTenant(tenantId: UUID): List<AgentKeyDto> {
        return agentKeyRepository.findByTenantId(tenantId).map { it.toDto() }
    }

    @Transactional
    fun createKey(request: CreateAgentKeyRequest): CreateAgentKeyResponse {
        val tenant = tenantRepository.findById(request.tenantId)
            .orElseThrow { IllegalArgumentException("Tenant not found") }

        // Generate a random API key
        val rawKey = "msp_${UUID.randomUUID().toString().replace("-", "")}"
        val keyHash = passwordEncoder.encode(rawKey)

        val key = AgentKey(tenant = tenant, keyHash = keyHash, name = request.name)
        val saved = agentKeyRepository.save(key)

        return CreateAgentKeyResponse(id = saved.id!!, name = saved.name, apiKey = rawKey)
    }

    @Transactional
    fun deleteKey(id: UUID) {
        agentKeyRepository.deleteById(id)
    }

    fun validateApiKey(apiKey: String): AgentKey? {
        val allActive = agentKeyRepository.findByIsActiveTrue()
        for (key in allActive) {
            if (passwordEncoder.matches(apiKey, key.keyHash)) {
                key.lastUsed = Instant.now()
                agentKeyRepository.save(key)
                return key
            }
        }
        return null
    }

    // --- Agent Reports ---

    fun getReportsByTenant(tenantId: UUID): List<AgentReportDto> {
        return agentReportRepository.findByTenantId(tenantId).map { it.toDto() }
    }

    @Transactional
    fun processReport(tenantId: UUID, request: AgentReportRequest): AgentReportDto {
        val tenant = tenantRepository.findById(tenantId)
            .orElseThrow { IllegalArgumentException("Tenant not found") }

        // Upsert: update if hostname exists, create otherwise
        var report = agentReportRepository.findByTenantIdAndHostname(tenantId, request.hostname)

        if (report == null) {
            report = AgentReport(tenant = tenant, hostname = request.hostname)
        }

        report.osName = request.osName
        report.osVersion = request.osVersion
        report.kernel = request.kernel
        report.cpuModel = request.cpuModel
        report.cpuCores = request.cpuCores
        report.ramTotalMb = request.ramTotalMb
        report.ramUsedMb = request.ramUsedMb
        report.diskTotalGb = request.diskTotalGb
        report.diskUsedGb = request.diskUsedGb
        report.uptimeSeconds = request.uptimeSeconds
        report.ipAddresses = request.ipAddresses?.joinToString(",")
        report.macAddresses = request.macAddresses?.joinToString(",")
        report.networkInterfaces = request.networkInterfaces?.joinToString(";") { "${it.name}|${it.ip}|${it.mac}|${it.speed}" }
        report.installedSoftware = request.installedSoftware?.joinToString(",")
        report.runningServices = request.runningServices?.joinToString(",")
        report.pendingUpdates = request.pendingUpdates
        report.avStatus = request.avStatus
        report.domainJoined = request.domainJoined
        report.domainName = request.domainName
        report.lastBoot = request.lastBoot
        report.agentVersion = request.agentVersion
        report.reportedAt = Instant.now()

        // New security/network fields
        report.rebootRequired = request.rebootRequired
        report.avProduct = request.avProduct
        report.avVersion = request.avVersion
        report.firewallEnabled = request.firewallEnabled
        report.firewallProduct = request.firewallProduct
        report.isStaticIp = request.isStaticIP
        report.defaultGateway = request.defaultGateway
        report.dnsServers = request.dnsServers?.joinToString(",")

        val saved = agentReportRepository.save(report)

        // Auto-link to existing device by hostname or management IP
        if (saved.linkedDevice == null) {
            val devices = deviceRepository.findByTenantId(tenantId)
            val matched = devices.find { device ->
                device.name.equals(saved.hostname, ignoreCase = true) ||
                device.managementIp != null && request.ipAddresses?.contains(device.managementIp) == true
            }
            if (matched != null) {
                saved.linkedDevice = matched
                agentReportRepository.save(saved)
            }
        }

        // Save scan results (clear old, insert new)
        if (request.networkScanResults != null) {
            networkScanResultRepository.deleteByAgentReportId(saved.id!!)
            for (scan in request.networkScanResults) {
                networkScanResultRepository.save(NetworkScanResult(
                    agentReport = saved,
                    ipAddress = scan.ip,
                    hostname = scan.hostname,
                    macAddress = scan.mac,
                    openPorts = scan.openPorts?.joinToString(","),
                    status = scan.status
                ))
            }
        }

        return saved.toDto()
    }

    private fun AgentKey.toDto() = AgentKeyDto(
        id = this.id!!, name = this.name, tenantId = this.tenant.id!!,
        isActive = this.isActive, lastUsed = this.lastUsed, createdAt = this.createdAt
    )

    private fun AgentReport.toDto(): AgentReportDto {
        val scanResults = networkScanResultRepository.findByAgentReportId(this.id!!)
            .map { scan ->
                ScanResultDto(
                    ip = scan.ipAddress,
                    hostname = scan.hostname,
                    mac = scan.macAddress,
                    openPorts = scan.openPorts?.split(",")?.filter { it.isNotBlank() }?.mapNotNull { it.trim().toIntOrNull() } ?: emptyList(),
                    status = scan.status
                )
            }
        return AgentReportDto(
            id = this.id!!, tenantId = this.tenant.id!!, hostname = this.hostname,
            osName = this.osName, osVersion = this.osVersion, kernel = this.kernel,
            cpuModel = this.cpuModel, cpuCores = this.cpuCores,
            ramTotalMb = this.ramTotalMb, ramUsedMb = this.ramUsedMb,
            diskTotalGb = this.diskTotalGb, diskUsedGb = this.diskUsedGb,
            uptimeSeconds = this.uptimeSeconds,
            ipAddresses = this.ipAddresses?.split(",")?.filter { it.isNotBlank() } ?: emptyList(),
            macAddresses = this.macAddresses?.split(",")?.filter { it.isNotBlank() } ?: emptyList(),
            pendingUpdates = this.pendingUpdates, avStatus = this.avStatus,
            domainJoined = this.domainJoined, domainName = this.domainName,
            agentVersion = this.agentVersion, reportedAt = this.reportedAt,
            linkedDeviceId = this.linkedDevice?.id, linkedDeviceName = this.linkedDevice?.name,
            rebootRequired = this.rebootRequired,
            avProduct = this.avProduct,
            avVersion = this.avVersion,
            firewallEnabled = this.firewallEnabled,
            firewallProduct = this.firewallProduct,
            isStaticIp = this.isStaticIp,
            defaultGateway = this.defaultGateway,
            dnsServers = this.dnsServers?.split(",")?.filter { it.isNotBlank() } ?: emptyList(),
            scanResults = scanResults
        )
    }
}
