package com.msp.doku.controller

import com.msp.doku.dto.CreateIpAddressRequest
import com.msp.doku.dto.CreateSubnetRequest
import com.msp.doku.dto.IpAddressDto
import com.msp.doku.dto.SubnetDto
import com.msp.doku.service.NetworkService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/network")
class NetworkController(
    private val networkService: NetworkService
) {

    @GetMapping("/subnets")
    fun getSubnets(@RequestParam tenantId: UUID): List<SubnetDto> {
        return networkService.getSubnetsForTenant(tenantId)
    }

    @PostMapping("/subnets")
    @ResponseStatus(HttpStatus.CREATED)
    fun createSubnet(@RequestBody request: CreateSubnetRequest): SubnetDto {
        return networkService.createSubnet(request)
    }

    @GetMapping("/subnets/{subnetId}/ips")
    fun getIpAddresses(@PathVariable subnetId: UUID): List<IpAddressDto> {
        return networkService.getIpAddresses(subnetId)
    }

    @PostMapping("/ips")
    @ResponseStatus(HttpStatus.CREATED)
    fun createIpAddress(@RequestBody request: CreateIpAddressRequest): IpAddressDto {
        return networkService.createIpAddress(request)
    }
}
