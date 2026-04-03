package com.msp.doku.controller

import com.msp.doku.dto.*
import com.msp.doku.service.AgentService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1")
class AgentController(private val agentService: AgentService) {

    // --- Agent Report Endpoint (called by the Go agent) ---
    // Authenticated via X-API-Key header, NOT JWT
    @PostMapping("/agent/report")
    fun submitReport(@RequestHeader("X-API-Key") apiKey: String, @RequestBody request: AgentReportRequest): ResponseEntity<AgentReportDto> {
        val key = agentService.validateApiKey(apiKey) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val report = agentService.processReport(key.tenant.id!!, request)
        return ResponseEntity.ok(report)
    }

    // --- Management endpoints (JWT-protected, admin/tech) ---
    @GetMapping("/agent/reports")
    fun getReports(@RequestParam tenantId: UUID): List<AgentReportDto> {
        return agentService.getReportsByTenant(tenantId)
    }

    @GetMapping("/agent/keys")
    fun getKeys(@RequestParam tenantId: UUID): List<AgentKeyDto> {
        return agentService.getKeysByTenant(tenantId)
    }

    @PostMapping("/agent/keys")
    @ResponseStatus(HttpStatus.CREATED)
    fun createKey(@RequestBody request: CreateAgentKeyRequest): CreateAgentKeyResponse {
        return agentService.createKey(request)
    }

    @DeleteMapping("/agent/keys/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteKey(@PathVariable id: UUID) {
        agentService.deleteKey(id)
    }
}
