package com.msp.doku.config

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import org.springframework.web.filter.OncePerRequestFilter

@Configuration
@EnableWebSecurity
class SecurityConfig {

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth.requestMatchers("/actuator/health/**").permitAll()
                auth.anyRequest().permitAll() // Auth enforced by Authelia at nginx level
            }
            .cors { it.configurationSource(corsConfigurationSource()) }
            .addFilterBefore(RemoteUserAuthFilter(), BasicAuthenticationFilter::class.java)

        return http.build()
    }

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val configuration = CorsConfiguration()
        configuration.allowedOrigins = listOf(
            "http://localhost:5173",
            "http://localhost:3000",
            "https://localhost:3443",
            "https://127.0.0.1:3443"
        )
        configuration.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
        configuration.allowedHeaders = listOf("*")
        configuration.allowCredentials = true
        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", configuration)
        return source
    }
}

/**
 * Reads Authelia forward-auth headers and creates Spring Security context.
 * Headers set by nginx after Authelia validation:
 *   Remote-User: username
 *   Remote-Groups: group1,group2
 *   Remote-Name: Display Name
 *   Remote-Email: user@example.com
 */
class RemoteUserAuthFilter : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val remoteUser = request.getHeader("Remote-User")

        if (remoteUser != null && SecurityContextHolder.getContext().authentication == null) {
            val groups = request.getHeader("Remote-Groups")
                ?.split(",")
                ?.map { it.trim() }
                ?.filter { it.isNotBlank() }
                ?: emptyList()

            val authorities = groups.map { SimpleGrantedAuthority("ROLE_${it.uppercase()}") }

            val auth = UsernamePasswordAuthenticationToken(
                remoteUser,
                null,
                authorities
            )
            // Store extra info
            auth.details = mapOf(
                "email" to (request.getHeader("Remote-Email") ?: ""),
                "name" to (request.getHeader("Remote-Name") ?: remoteUser),
                "groups" to groups
            )

            SecurityContextHolder.getContext().authentication = auth
        }

        filterChain.doFilter(request, response)
    }
}
