package com.msp.doku.repository

import com.msp.doku.domain.DocumentationSection
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface DocumentationRepository : JpaRepository<DocumentationSection, UUID> {
    fun findByTenantId(tenantId: UUID): List<DocumentationSection>
    fun findByTenantIdAndSectionType(tenantId: UUID, sectionType: String): DocumentationSection?
}
