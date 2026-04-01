package com.msp.doku.repository

import com.msp.doku.domain.PublicIpAssignment
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface PublicIpAssignmentRepository : JpaRepository<PublicIpAssignment, UUID> {
    fun findByRangeIdOrderByIpAddress(rangeId: UUID): List<PublicIpAssignment>
    fun findByRangeIdAndIpAddress(rangeId: UUID, ipAddress: String): PublicIpAssignment?
    fun countByRangeIdAndStatusNot(rangeId: UUID, status: String): Long
}
