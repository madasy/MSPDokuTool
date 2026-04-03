package com.msp.doku.domain

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "agent_reports")
class AgentReport(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    var tenant: Tenant,

    @Column(nullable = false)
    var hostname: String,

    @Column(name = "os_name") var osName: String? = null,
    @Column(name = "os_version") var osVersion: String? = null,
    var kernel: String? = null,
    @Column(name = "cpu_model") var cpuModel: String? = null,
    @Column(name = "cpu_cores") var cpuCores: Int? = null,
    @Column(name = "ram_total_mb") var ramTotalMb: Long? = null,
    @Column(name = "ram_used_mb") var ramUsedMb: Long? = null,
    @Column(name = "disk_total_gb") var diskTotalGb: Long? = null,
    @Column(name = "disk_used_gb") var diskUsedGb: Long? = null,
    @Column(name = "uptime_seconds") var uptimeSeconds: Long? = null,
    @Column(name = "ip_addresses", columnDefinition = "TEXT") var ipAddresses: String? = null,
    @Column(name = "mac_addresses", columnDefinition = "TEXT") var macAddresses: String? = null,
    @Column(name = "network_interfaces", columnDefinition = "TEXT") var networkInterfaces: String? = null,
    @Column(name = "installed_software", columnDefinition = "TEXT") var installedSoftware: String? = null,
    @Column(name = "running_services", columnDefinition = "TEXT") var runningServices: String? = null,
    @Column(name = "pending_updates") var pendingUpdates: Int? = null,
    @Column(name = "av_status") var avStatus: String? = null,
    @Column(name = "domain_joined") var domainJoined: Boolean? = null,
    @Column(name = "domain_name") var domainName: String? = null,
    @Column(name = "last_boot") var lastBoot: Instant? = null,
    @Column(name = "agent_version") var agentVersion: String? = null,
    @Column(name = "reported_at", nullable = false) var reportedAt: Instant = Instant.now(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_device_id")
    var linkedDevice: Device? = null
) : BaseEntity()
