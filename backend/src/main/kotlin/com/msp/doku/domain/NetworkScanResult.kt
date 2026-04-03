package com.msp.doku.domain

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "network_scan_results")
class NetworkScanResult(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agent_report_id", nullable = false)
    var agentReport: AgentReport,

    @Column(name = "ip_address", nullable = false)
    var ipAddress: String,

    var hostname: String? = null,

    @Column(name = "mac_address")
    var macAddress: String? = null,

    @Column(name = "open_ports")
    var openPorts: String? = null,

    @Column(nullable = false)
    var status: String = "up",

    @Column(name = "scanned_at", nullable = false)
    var scannedAt: Instant = Instant.now()
) : BaseEntity()
