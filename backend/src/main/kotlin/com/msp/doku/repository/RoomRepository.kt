package com.msp.doku.repository

import com.msp.doku.domain.Room
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface RoomRepository : JpaRepository<Room, UUID> {
    fun findBySiteId(siteId: UUID): List<Room>
    fun countBySiteId(siteId: UUID): Long
}
