package com.msp.doku.repository

import com.msp.doku.domain.AgentKey
import com.msp.doku.domain.AgentReport
import com.msp.doku.domain.NetworkScanResult
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface AgentKeyRepository : JpaRepository<AgentKey, UUID> {
    fun findByTenantId(tenantId: UUID): List<AgentKey>
    fun findByIsActiveTrue(): List<AgentKey>
}

@Repository
interface AgentReportRepository : JpaRepository<AgentReport, UUID> {
    fun findByTenantId(tenantId: UUID): List<AgentReport>
    fun findByTenantIdAndHostname(tenantId: UUID, hostname: String): AgentReport?
}

@Repository
interface NetworkScanResultRepository : JpaRepository<NetworkScanResult, UUID> {
    fun findByAgentReportId(agentReportId: UUID): List<NetworkScanResult>
    fun deleteByAgentReportId(agentReportId: UUID)
}
