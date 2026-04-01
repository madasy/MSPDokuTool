package com.msp.doku.config

import com.msp.doku.repository.GroupRoleMappingRepository
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.convert.converter.Converter
import org.springframework.security.authentication.AbstractAuthenticationToken
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import org.springframework.web.cors.CorsConfigurationSource

@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val groupRoleMappingRepository: GroupRoleMappingRepository
) {

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth.requestMatchers("/actuator/health/**").permitAll()
                auth.requestMatchers("/v3/api-docs/**", "/swagger-ui/**").permitAll()
                auth.anyRequest().permitAll() // DISABLED AUTH FOR MVP DEMO
            }
            .cors { it.configurationSource(corsConfigurationSource()) }

        return http.build()
    }

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val configuration = CorsConfiguration()
        configuration.allowedOrigins = listOf("http://localhost:5173", "http://localhost:3000") // Allow Frontend (dev + Docker)
        configuration.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
        configuration.allowedHeaders = listOf("*")
        configuration.allowCredentials = true
        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", configuration)
        return source
    }

    private fun jwtAuthenticationConverter(): Converter<Jwt, AbstractAuthenticationToken> {
        val converter = JwtAuthenticationConverter()
        converter.setJwtGrantedAuthoritiesConverter(GroupRoleAuthorityConverter(groupRoleMappingRepository))
        return converter
    }
}

class GroupRoleAuthorityConverter(
    private val repository: GroupRoleMappingRepository
) : Converter<Jwt, Collection<GrantedAuthority>> {

    override fun convert(jwt: Jwt): Collection<GrantedAuthority> {
        // 1. Get groups from JWT (Entra ID puts them in "groups" or "roles" claim)
        val groups = jwt.claims["groups"] as? List<String> ?: emptyList()
        
        if (groups.isEmpty()) {
            return emptyList()
        }

        // 2. Map groups to roles via DB
        val mappings = repository.findByEntraGroupOidIn(groups)
        
        // 3. Convert to SimpleGrantedAuthority
        // Format: ROLE_NAME or TENANT_SCOPE:ROLE_NAME? 
        // For Spring Security standard: just ROLE_NAME. 
        // Tenant scoping handles in logic, or we add custom Authority like "TENANT_123:ADMIN"
        
        return mappings.map { mapping ->
            // If it's a tenant role, we might want to qualify it, but for now simple mapping
            SimpleGrantedAuthority(mapping.roleName)
        }.toSet()
    }
}
