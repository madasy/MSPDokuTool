package com.msp.doku.service

import com.msp.doku.dto.AutheliaUserDto
import com.msp.doku.dto.CreateAutheliaUserRequest
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import org.yaml.snakeyaml.DumperOptions
import org.yaml.snakeyaml.Yaml
import java.io.File
import java.io.FileReader
import java.io.FileWriter

@Service
class AutheliaUserService(
    @Value("\${authelia.users-file:/authelia-config/users.yml}")
    private val usersFilePath: String
) {
    private val passwordEncoder = BCryptPasswordEncoder(12)

    fun getAllUsers(): List<AutheliaUserDto> {
        val data = readUsersFile()
        val users = data["users"] as? Map<String, Map<String, Any>> ?: return emptyList()
        return users.map { (username, props) ->
            AutheliaUserDto(
                username = username,
                displayname = props["displayname"]?.toString() ?: username,
                email = props["email"]?.toString() ?: "",
                groups = (props["groups"] as? List<*>)?.map { it.toString() } ?: emptyList()
            )
        }
    }

    fun getUsersByTenant(tenantIdentifier: String): List<AutheliaUserDto> {
        return getAllUsers().filter { user ->
            user.groups.contains("tenant:$tenantIdentifier")
        }
    }

    @Synchronized
    fun createUser(request: CreateAutheliaUserRequest): AutheliaUserDto {
        val data = readUsersFile()
        val users = (data["users"] as? MutableMap<String, Any>) ?: mutableMapOf()

        if (users.containsKey(request.username)) {
            throw IllegalArgumentException("User '${request.username}' already exists")
        }

        val hashedPassword = passwordEncoder.encode(request.password)

        val userEntry = linkedMapOf<String, Any>(
            "displayname" to request.displayname,
            "email" to request.email,
            "password" to hashedPassword,
            "groups" to request.groups
        )

        users[request.username] = userEntry
        data["users"] = users
        writeUsersFile(data)

        return AutheliaUserDto(
            username = request.username,
            displayname = request.displayname,
            email = request.email,
            groups = request.groups
        )
    }

    @Synchronized
    fun deleteUser(username: String) {
        val data = readUsersFile()
        val users = (data["users"] as? MutableMap<String, Any>)
            ?: throw IllegalArgumentException("No users found")

        if (!users.containsKey(username)) {
            throw IllegalArgumentException("User '$username' not found")
        }

        // Don't allow deleting admin
        if (username == "admin") {
            throw IllegalArgumentException("Cannot delete the admin user")
        }

        users.remove(username)
        data["users"] = users
        writeUsersFile(data)
    }

    private fun readUsersFile(): MutableMap<String, Any> {
        val file = File(usersFilePath)
        if (!file.exists()) {
            return mutableMapOf("users" to mutableMapOf<String, Any>())
        }
        val yaml = Yaml()
        FileReader(file).use { reader ->
            val result = yaml.load<Map<String, Any>>(reader)
            return result?.toMutableMap() ?: mutableMapOf("users" to mutableMapOf<String, Any>())
        }
    }

    private fun writeUsersFile(data: Map<String, Any>) {
        val options = DumperOptions().apply {
            defaultFlowStyle = DumperOptions.FlowStyle.BLOCK
            isPrettyFlow = true
            indent = 2
        }
        val yaml = Yaml(options)
        FileWriter(File(usersFilePath)).use { writer ->
            yaml.dump(data, writer)
        }
    }
}
