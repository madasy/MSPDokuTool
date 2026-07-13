package com.msp.doku.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

enum class TunnelType { IPSEC_S2S, SSL_VPN, WIREGUARD, OTHER }
enum class TunnelStatus { ACTIVE, PLANNED, DISABLED }
enum class IkeVersion { IKEV1, IKEV2 }
enum class EncryptionAlgorithm { AES_128, AES_256, TRIPLE_DES, CHACHA20 }
enum class HashAlgorithm { SHA1, SHA256, SHA512 }

@Entity
@Table(name = "vpn_tunnels")
class VpnTunnel(
    @Column(nullable = false)
    var name: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: TunnelType,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: TunnelStatus = TunnelStatus.ACTIVE,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    var tenant: Tenant,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "local_device_id", nullable = false)
    var localDevice: Device,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "remote_device_id")
    var remoteDevice: Device? = null,

    @ManyToMany
    @JoinTable(
        name = "vpn_tunnel_local_subnets",
        joinColumns = [JoinColumn(name = "tunnel_id")],
        inverseJoinColumns = [JoinColumn(name = "subnet_id")]
    )
    var localSubnets: MutableSet<Subnet> = mutableSetOf(),

    @ManyToMany
    @JoinTable(
        name = "vpn_tunnel_remote_subnets",
        joinColumns = [JoinColumn(name = "tunnel_id")],
        inverseJoinColumns = [JoinColumn(name = "subnet_id")]
    )
    var remoteSubnets: MutableSet<Subnet> = mutableSetOf(),

    @Enumerated(EnumType.STRING)
    @Column(name = "ike_version")
    var ikeVersion: IkeVersion? = null,

    @Enumerated(EnumType.STRING)
    var encryption: EncryptionAlgorithm? = null,

    @Enumerated(EnumType.STRING)
    var hash: HashAlgorithm? = null,

    @Column(name = "dh_group")
    var dhGroup: Int? = null,

    @Column(name = "secret_ref")
    var secretRef: String? = null
) : BaseEntity()
