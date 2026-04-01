package com.msp.doku.service

import com.msp.doku.domain.Room
import com.msp.doku.dto.CreateRoomRequest
import com.msp.doku.dto.RoomDto
import com.msp.doku.repository.RackRepository
import com.msp.doku.repository.RoomRepository
import com.msp.doku.repository.SiteRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class RoomService(
    private val roomRepository: RoomRepository,
    private val siteRepository: SiteRepository,
    private val rackRepository: RackRepository
) {

    fun getRoomsBySite(siteId: UUID): List<RoomDto> {
        return roomRepository.findBySiteId(siteId).map { it.toDto() }
    }

    fun getRoom(id: UUID): RoomDto {
        return roomRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Room not found") }
            .toDto()
    }

    @Transactional
    fun createRoom(request: CreateRoomRequest): RoomDto {
        val site = siteRepository.findById(request.siteId)
            .orElseThrow { IllegalArgumentException("Site not found") }

        val room = Room(
            name = request.name,
            floor = request.floor,
            description = request.description,
            site = site
        )
        return roomRepository.save(room).toDto()
    }

    @Transactional
    fun deleteRoom(id: UUID) {
        if (!roomRepository.existsById(id)) {
            throw IllegalArgumentException("Room not found")
        }
        roomRepository.deleteById(id)
    }

    private fun Room.toDto() = RoomDto(
        id = this.id!!,
        name = this.name,
        floor = this.floor,
        description = this.description,
        siteId = this.site.id!!,
        rackCount = rackRepository.countByRoomId(this.id!!).toInt(),
        createdAt = this.createdAt,
        updatedAt = this.updatedAt
    )
}
