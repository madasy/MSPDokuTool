package com.msp.doku.repository

import com.msp.doku.domain.IpAddress
import com.msp.doku.domain.Subnet
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface SubnetRepository : JpaRepository<Subnet, UUID> {
    fun findByTenantId(tenantId: UUID): List<Subnet>
}

@Repository
interface IpAddressRepository : JpaRepository<IpAddress, UUID> {
    fun findBySubnetId(subnetId: UUID): List<IpAddress>
    fun countBySubnetId(subnetId: UUID): Int
}
