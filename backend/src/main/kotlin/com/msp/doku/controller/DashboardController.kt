package com.msp.doku.controller

import com.msp.doku.dto.ActivityEntryDto
import com.msp.doku.dto.DashboardStatsDto
import com.msp.doku.service.DashboardService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/dashboard")
class DashboardController(
    private val dashboardService: DashboardService
) {

    @GetMapping("/stats")
    fun getStats(): DashboardStatsDto {
        return dashboardService.getStats()
    }

    @GetMapping("/activity")
    fun getActivity(@RequestParam(defaultValue = "20") limit: Int): List<ActivityEntryDto> {
        return dashboardService.getRecentActivity(limit)
    }
}
