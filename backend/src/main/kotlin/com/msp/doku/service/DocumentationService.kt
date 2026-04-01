package com.msp.doku.service

import com.msp.doku.domain.DocumentationSection
import com.msp.doku.dto.DocumentationOverviewDto
import com.msp.doku.dto.DocumentationSectionDto
import com.msp.doku.dto.UpdateDocumentationRequest
import com.msp.doku.repository.DocumentationRepository
import com.msp.doku.repository.TenantRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class DocumentationService(
    private val documentationRepository: DocumentationRepository,
    private val tenantRepository: TenantRepository
) {

    companion object {
        val SECTION_TYPES = listOf(
            "access_credentials",
            "network_architecture",
            "critical_services",
            "backup_recovery",
            "monitoring_alerting",
            "sops",
            "change_update",
            "security_baseline",
            "disaster_recovery",
            "external_integrations",
            "naming_conventions"
        )

        val SECTION_SCHEMAS: Map<String, List<String>> = mapOf(
            "access_credentials" to listOf("mfaRequirements", "breakGlassAccounts", "privilegedAccessPaths", "adminAccessConcept"),
            "network_architecture" to listOf("vlanStructure", "routingDesign", "internetBreakout", "siteToSiteVpn", "wanSetup"),
            "critical_services" to listOf("businessCriticalSystems", "internalDependencies", "externalDependencies"),
            "backup_recovery" to listOf("backupTargets", "retentionPolicy", "rtoRpo", "recoveryProcedures"),
            "monitoring_alerting" to listOf("monitoredSystems", "alertThresholds", "alertDestinations", "escalationFlow"),
            "sops" to listOf("tenantOnboarding", "serverDeployment", "vmRestore", "incidentHandling"),
            "change_update" to listOf("patchManagement", "maintenanceWindows", "changeApproval"),
            "security_baseline" to listOf("hardeningStandards", "avEdrStrategy", "loggingStrategy", "accessControlModel"),
            "disaster_recovery" to listOf("datacenterDown", "ransomwareResponse", "fullTenantLoss", "recoveryOrder"),
            "external_integrations" to listOf("isps", "cloudProviders", "saasTools", "licensingDependencies"),
            "naming_conventions" to listOf("serverNaming", "networkNaming", "vlanNaming", "generalConventions")
        )
    }

    fun getOverview(tenantId: UUID): List<DocumentationOverviewDto> {
        val existing = documentationRepository.findByTenantId(tenantId)
            .associateBy { it.sectionType }

        return SECTION_TYPES.map { type ->
            val section = existing[type]
            val schema = SECTION_SCHEMAS[type] ?: emptyList()
            val filledFields = section?.structuredData?.count { it.value.toString().isNotBlank() } ?: 0
            val totalFields = schema.size.coerceAtLeast(1)

            DocumentationOverviewDto(
                sectionType = type,
                exists = section != null,
                updatedAt = section?.updatedAt,
                completionPercent = if (section != null) ((filledFields.toDouble() / totalFields) * 100).toInt() else 0
            )
        }
    }

    fun getSection(tenantId: UUID, sectionType: String): DocumentationSectionDto {
        val section = documentationRepository.findByTenantIdAndSectionType(tenantId, sectionType)
        if (section != null) return section.toDto()

        // Return empty section with schema fields
        val schema = SECTION_SCHEMAS[sectionType] ?: emptyList()
        return DocumentationSectionDto(
            id = UUID.randomUUID(),
            sectionType = sectionType,
            structuredData = schema.associateWith { "" },
            notes = null,
            updatedBy = null,
            version = 0,
            createdAt = null,
            updatedAt = null
        )
    }

    @Transactional
    fun updateSection(tenantId: UUID, sectionType: String, request: UpdateDocumentationRequest): DocumentationSectionDto {
        val tenant = tenantRepository.findById(tenantId)
            .orElseThrow { IllegalArgumentException("Tenant not found") }

        var section = documentationRepository.findByTenantIdAndSectionType(tenantId, sectionType)

        if (section == null) {
            section = DocumentationSection(
                tenant = tenant,
                sectionType = sectionType,
                structuredData = request.structuredData ?: emptyMap(),
                notes = request.notes,
                version = 1
            )
        } else {
            request.structuredData?.let { section.structuredData = it }
            request.notes?.let { section.notes = it }
            section.version += 1
        }

        return documentationRepository.save(section).toDto()
    }

    private fun DocumentationSection.toDto() = DocumentationSectionDto(
        id = this.id!!,
        sectionType = this.sectionType,
        structuredData = this.structuredData,
        notes = this.notes,
        updatedBy = this.updatedBy,
        version = this.version,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt
    )
}
