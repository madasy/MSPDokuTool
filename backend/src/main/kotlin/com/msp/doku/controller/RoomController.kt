package com.msp.doku.controller

import com.msp.doku.dto.CreateRoomRequest
import com.msp.doku.dto.RoomDto
import com.msp.doku.service.RoomService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/rooms")
class RoomController(
    private val roomService: RoomService
) {

    @GetMapping
    fun getRooms(@RequestParam siteId: UUID): List<RoomDto> {
        return roomService.getRoomsBySite(siteId)
    }

    @GetMapping("/{id}")
    fun getRoom(@PathVariable id: UUID): RoomDto {
        return roomService.getRoom(id)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createRoom(@RequestBody request: CreateRoomRequest): RoomDto {
        return roomService.createRoom(request)
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteRoom(@PathVariable id: UUID) {
        roomService.deleteRoom(id)
    }
}
