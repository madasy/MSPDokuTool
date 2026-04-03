package com.msp.doku.controller

import com.msp.doku.dto.SearchResponseDto
import com.msp.doku.service.SearchService
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/search")
class SearchController(
    private val searchService: SearchService
) {
    @GetMapping
    fun search(
        @RequestParam q: String,
        @RequestParam(defaultValue = "20") limit: Int
    ): SearchResponseDto {
        return searchService.search(q, limit)
    }
}
