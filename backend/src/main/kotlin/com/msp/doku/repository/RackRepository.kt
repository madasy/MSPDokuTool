package com.msp.doku.repository

import com.msp.doku.domain.Rack
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface RackRepository : JpaRepository<Rack, UUID> {
    // Ideally filter by Tenant via Room -> Site -> Tenant
    // For MVP we might need a direct link or custom query
}
