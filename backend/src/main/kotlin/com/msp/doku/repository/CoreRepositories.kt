package com.msp.doku.repository

import com.msp.doku.domain.GroupRoleMapping
import com.msp.doku.domain.Tenant
import com.msp.doku.domain.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface TenantRepository : JpaRepository<Tenant, UUID> {
    fun findByIdentifier(identifier: String): Tenant?
}

@Repository
interface UserRepository : JpaRepository<User, UUID> {
    fun findByEmail(email: String): User?
    fun findByExternalId(externalId: String): User?
    fun findByTenantId(tenantId: UUID): List<User>
    fun findByIsActiveTrue(): List<User>
}

@Repository
interface GroupRoleMappingRepository : JpaRepository<GroupRoleMapping, UUID> {
    fun findByEntraGroupOidIn(entraGroupOids: List<String>): List<GroupRoleMapping>
}
