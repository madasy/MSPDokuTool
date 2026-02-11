# UX Design & Information Architecture: MSP Documentation Tool

## 1. 10 UX-Regeln für Netzwerk-Doku (Human-Centric)
1.  **Visuell vor Text:** Zeige ein Rack als Bild, nicht als Liste. Zeige Ports als Grid, nicht als Tabelle.
2.  **Kontext ist King:** Wenn ich einen Switch-Port ansehe, will ich sofort sehen, welches Gerät am anderen Ende hängt (End-to-End Trace).
3.  **"Don't Make Me Think" bei IPs:** Unterscheide visuell sofort zwischen *Frei* (Grün), *Belegt* (Rot), *Reserviert* (Gelb) und *DHCP* (Blau).
4.  **Klicks minimieren:** Die wichtigsten Infos (IP, Passwort, Standort) müssen im Dashboard oder Hover sichtbar sein, ohne "Details öffnen" zu müssen.
5.  **Such-Zentriert:** Eine globale Suche (CMD+K) ist der schnellste Weg zu jedem Asset. Suche nach IP, MAC, Seriennummer oder User.
6.  **Copy-Paste Friendly:** IPs, Passwörter und SSH-Keys müssen mit einem Klick kopierbar sein. Keine Leerzeichen beim Markieren!
7.  **Progressive Disclosure:** Zeige erst die Wichtigsten Daten (IP, Name, Status). Technische Details (Firmware, Seriennummer, VLAN-Tags) erst auf Anfrage/Klick.
8.  **Fehler verzeihen:** Undo-Funktion für jede Änderung (z.B. falsches Kabel gesteckt).
9.  **Mobile First (für Techniker):** Die Rack-Ansicht muss auf dem iPad im Datacenter funktionieren (Touch-Targets groß genug).
10. **Sprechende URLs:** `../tenant/acme/device/firewall-01` statt `../id/59201`. Ermöglicht schnelles Teilen im Chat.

---

## 2. Informationsarchitektur (Navigation)

### Global Navigation (Sidebar/Top)
*   **Global Search** (Feld)
*   **Favoriten** (Gepinnte Tenants/Racks)
*   **Datacenter / Public IPs** (Interner Bereich)
*   **Tenants** (Liste aller Kunden)
*   **Settings** (User, Templates, Audit Log)

### Tenant Context Navigation (Sobald ein Kunde ausgewählt ist)
1.  **Dashboard**: Status-Ampeln, offene Tickets (optional), auslaufende Verträge, "Wichtige Links".
2.  **Infrastruktur**
    *   **Standorte & Pläne**: Kartenansicht oder Hierarchie (Standort > Gebäude > Raum).
    *   **Racks**: Visuelle Rack-Liste.
    *   **Geräte**: Filterbare Liste (Server, Speicher, Sonstiges).
3.  **Netzwerk**
    *   **Topologie**: Automatisch generierte Map.
    *   **Switches & WiFi**: Port-Level Management.
    *   **IP-Plan**: Subnetze, VLANs, Public IPs (Kunden-Sicht).
    *   **Firewall & WAN**: ISP-Daten, VPNs, NAT-Regeln.
4.  **Management**
    *   **Verträge & Lizenzen**: Laufzeiten, Kontakte.
    *   **Cloud & SaaS**: M365, Azure, AWS.
    *   **Credentials**: (Optional/Link zu PW-Manager).
    *   **Changelog**: Wer hat was wann geändert?

---

## 3. Screen Wireframes & Layouts

### A. Global: Datacenter Public IP Management (Spezial-Anforderung)
*   **Layout:**
    *   Split-View: Links Liste der "IP Ranges" (z.B. `/24` Blöcke), Rechts Detail-Grid der IPs.
*   **Interaktion:**
    *   Admin legt Range an (z.B. `203.0.113.0/24`) -> System generiert 256 IP-Platzhalter.
    *   **Drag & Drop / Bulk Action:** Markiere IPs .10 bis .20 -> "Assign to Tenant".
    *   Modal öffnet sich: "Select Tenant" (z.B. Kanzlei Müller).
*   **Visuelles Feedback:**
    *   Freie IPs: Grau/Weiß.
    *   Vergebene IPs: Zeigen Tenant-Farbe/Name. Hover zeigt Details ("Genutzt für Firewall Interface WAN1").
*   **Use Case:** Kunde braucht neue fixe IP -> Admin geht hier rein, sucht nächste freie lückenlose Box, Rechtsklick -> "Reservieren für Kanzlei Müller".

### B. Tenant: Visuelle Rack-Ansicht
*   **Layout:**
    *   Links: Liste der unplatzierten Geräte ("Storage Room").
    *   Mitte: Das Rack (42 HE) grafisch.
    *   Rechts: Detail-Panel (Eigenschaften des selektierten Geräts).
*   **Visualisierung:**
    *   Geräte haben ihre reale Höhe (1HE, 2HE).
    *   Farbe zeigt Status (Grün=OK, Grau=Planned, Rot=Error).
    *   Icons für Gerätetyp (Server, Switch).
*   **Interaktion:**
    *   **Drag & Drop:** Ziehe "Server-Neu" von Links auf HE 12 im Rack.
    *   **Hover:** Zeigt Name, IP und Stromverbrauch.
    *   **Klick:** Öffnet Detail-Panel rechts (Seriennummer, Ports, Uplink-Ziel).

### C. Tenant: Switch-Port Ansicht (The "Faceplate")
*   **Layout:**
    *   Oben: Switch-Stammdaten (IP, Modell, Standort).
    *   Mitte: Abbild der Frontblende (24/48 Ports in 2 Reihen).
*   **Visualisierung:**
    *   Stecker gesteckt? (Grafisch dargestellt).
    *   Port-Status: Link Up (Grün leuchtend), Link Down (Grau), Disabled (Rot).
    *   VLAN-Farbe: Rahmen um den Port zeigt VLAN-Zugehörigkeit (z.B. Blau=VLAN10 VoIP).
*   **Hover:** "Port 12: Verbunden mit HP-Drucker-Empfang (VLAN 20)".
*   **Quick Actions:** Klick auf Port -> "Edit Connection", "Change VLAN", "History ansehen".

### D. IP-Plan (Die "Excel-Alternative")
*   **Layout:** Tabelle, grouping nach Subnetzen/VLANs.
*   **Spalten:** IP, Hostname, MAC, Status, Description, Last Seen (Ping).
*   **Inline-Edit:** Klick in Zelle "Hostname" -> Tippen -> Enter speichert sofort.
*   **Bar-Visualisierung:** Oben pro Subnetz ein Fortschrittsbalken "70% belegt".

---

## 4. Quick Actions (Überall verfügbar via `CMD+K`)
*   `Add Device` -> Modal: Typ, Name, Rack wählen.
*   `Assign Public IP` -> Springt zu DC-View.
*   `Search IP` -> "192.168..." springt direkt zum Asset.
*   `New Ticket` (wenn integriert).
*   `Share Doc` -> Generiert Time-Limited Link für Externen.
