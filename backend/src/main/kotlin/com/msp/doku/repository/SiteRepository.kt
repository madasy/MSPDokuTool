package com.msp.doku.repository

import com.msp.doku.domain.Site
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface SiteRepository : JpaRepository<Site, UUID> {
    fun findByName(name: String): Site?
}
