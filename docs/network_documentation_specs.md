# Network Documentation Specifications

## 1. Datenfelder & Objekte

### Switch Port (Layer 2 Interface)
*   **Physical:** `Speed` (10/100/1000/10G/Auto), `Duplex` (Full/Half/Auto), `Media` (Copper/Fiber/SFP).
*   **PoE:** `Status` (On/Off/Fault), `Class` (0-4), `Consumption` (Watts).
*   **VLAN Configuration:**
    *   `Mode`: Access / Trunk / Hybrid (QinQ).
    *   `Native VLAN`: ID (für Trunks).
    *   `Allowed VLANs`: Liste/Range (z.B. "1,10,20-30").
    *   `Voice VLAN`: ID (Optional).
*   **Neighbors (Discovery):**
    *   `LLDP/CDP Neighbor Name`: Hostname des Nachbarn.
    *   `Neighbor IP`: Management IP.
    *   `Neighbor Port`: Port-ID des Nachbarn.
*   **Status:** `Admin State` (Up/Down), `Oper State` (Up/Down/Dormant).

### IPAM (Layer 3)
*   **Subnet:** `CIDR` (192.168.1.0/24), `VLAN ID` (Ref), `Location` (Site).
*   **Gateway:** `IP Address`, `HSRP/VRRP Group` (optional).
*   **Dienste:** `DHCP Scopes` (Range Start-End), `DNS Servers`, `NTP`.
*   **Reservierung (IP Object):**
    *   `IP Address`.
    *   `Type`: Static / DHCP Reservation / VIP (Virtual IP).
    *   `Status`: Active / Reserved / Deprecated.
    *   `MAC Address`: (Wichtig für DHCP Res).

### Verkabelung (Passive Layer)
*   **End-to-End Pfad:** `Device Port` <-> `Patchkabel A` <-> `Dose (Walljack)` <-> `Verlegekabel` <-> `Patchpanel Port Back` <-> `Patchpanel Port Front` <-> `Patchkabel B` <-> `Switch Port`.
*   **Vereinfachung für Doku:**
    *   Oft reicht: `Device Port` <-> `Patchpanel` <-> `Switch Port`.
    *   Wichtig: Label des Patchkabels / Label der Dose.

---

## 2. Standard-Workflows

### A. Onboarding neuer Site/Tenant
1.  **VLANs definieren:** Welche Segmente gibt es? (Mgmt, Client, VoIP, Guest).
2.  **Subnetze anlegen:** Zuweisung zu VLANs. Gateway-IPs eintragen.
3.  **Core-Geräte erfassen:** Firewall, Core-Switch anlegen.
4.  **Uplinks dokumentieren:** WAN zu Firewall, Firewall zu Switch.
5.  **Scan (Optional):** SNMP Scan der Subnetze für Bestandsaufnahme.

### B. Neues Rack aufbauen
1.  **Rack anlegen:** Name, HE (42U), Standort.
2.  **Patchfelder und Switches platzieren:** Visuelle Positionierung.
3.  **Verkabelung (Mass-Edit):**
    *   "Verbinde Patchpanel A Ports 1-24 mit Switch 1 Ports 1-24 (1:1)".
4.  **Uplink:** LWL-Verbindung zum Core patchen.

### C. Switch Austausch (RMA)
1.  **Clone Configuration:** Kopiere Port-Konfigs vom alten Asset (Datenbank-Duplikat).
2.  **Physical Swap:** Dokumentiere Seriennummer-Wechsel.
3.  **Move Connections:** "Verschiebe alle Kabel von Device `Switch-Old` auf `Switch-New`". (Bulk-Move Action).
4.  **Archive:** Setze alten Switch auf Status "Retired".

### D. Umzug eines Geräts (Server Move)
1.  **Disconnect:** Lösche Verbindung an altem Switch-Port.
2.  **Move:** Ändere Rack/Unit Position des Servers.
3.  **VLAN Check:** Prüfe, ob Ziel-Switchport das richtige VLAN hat. Wenn nicht -> Ticket/Todo "Switchport umconfigurieren".
4.  **Reconnect:** Dokumentiere neue Verbindung (Neuer Switch Port).
5.  **IP Update:** Falls statisch und neues Subnetz -> IP anpassen.

---

## 3. Validierungsregeln

*   **Keine doppelten IPs:** Innerhalb eines VRF/Tenants darf eine IP nur 1x aktiv vergeben sein.
*   **VLAN Consistency:** Wenn Port A (Trunk, Native 1) mit Port B verbunden ist, muss Port B auch (Trunk, Native 1) sein. Warnung bei Mismatch.
*   **Subnet Overlap:** Kein Anlegen von `192.168.1.0/24` wenn `192.168.0.0/16` schon als "Flat Network" existiert (oder Hinweis "Subnetting").
*   **Rack Space:** Kein Einbau von 2HE Server auf Unit 10, wenn Unit 11 schon belegt ist.

## 4. Best Practices für Verständlichkeit

*   **Sprechende Namen:** Interface-Namen wie auf dem Blech (`Gi1/0/1` statt `Port 25`).
*   **Color Coding:** VLANs in Listen farblich markieren (VoIP=Gelb, Mgmt=Rot).
*   **Description is Key:** Jede wichtige Verbindung (Uplink, Server, AP) MUSS eine Description am Interface haben. "Desk 104" ist besser als leer.
*   **Kabel-Labels:** Dokumentiere die Nummer, die auf dem Kabel steht (`K-10023`), nicht nur "Cat6 Grau".
