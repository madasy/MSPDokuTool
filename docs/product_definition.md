# Produktdefinition: MSP-Dokumentationssystem

## 1. Produktvision
Das MSP-Dokumentationssystem ist die zentrale, mandantenfähige Plattform für Managed Service Provider, um komplexe IT-Infrastrukturen ihrer Kunden effizient, standardisiert und visuell ansprechend zu dokumentieren. Es ermöglicht Technikern blitzschnellen Zugriff auf kritische Netzwerk- und Rack-Informationen und bietet Kunden durch nahtlose Integration in ihre bestehenden Systeme (z.B. Confluence) volle Transparenz. Sicherheit und Einfachheit durch Single Sign-On (SSO) stehen dabei an erster Stelle.

---

## 2. Kern-Use-Cases
1.  **Netzwerk-Infrastruktur dokumentieren:** Erfassung und Visualisierung von IP-Plänen, VLAN-Konfigurationen, Switch-Port-Belegungen und Patch-Verkabelungen.
2.  **Rack-Layouts planen und verwalten:** Visuelle Darstellung von Server-Racks mit Drag-and-Drop-Funktionalität, inkl. HE-Belegung, Stromversorgung und Uplinks.
3.  **Kunden-Onboarding & Transparenz:** Schnelle Bereitstellung eines neuen Mandanten und Freigabe der Dokumentation an den Kunden via sicherem Link oder Einbettung in dessen Intranet (Confluence).
4.  **Vertrags- & Asset-Management:** Verknüpfung von Hardware/Software mit Lizenz- und Wartungsverträgen zur Vermeidung von Unterlizenzierung oder Ablauf von Support.

---

## 3. Anforderungen (MoSCoW)

### Must-Have (Muss)
*   **Multi-Tenancy:** Strikte Datentrennung pro Kunde (Tenant).
*   **Authentifizierung:** Integration von Office 365 / Entra ID (Azure ID) für SSO (sowohl für MSP-Mitarbeiter als auch für Kunden).
*   **Netzwerk-Dokumentation:**
    *   IP-Adressmanagement (IPAM), Subnetze.
    *   VLAN-Verwaltung.
    *   Switch-Port-Mapping (welches Gerät an welchem Port).
    *   Patchfelder & Verkabelungswege.
    *   WAN/ISP-Informationen, Firewall-Regeln (High-Level), Router-Configs.
    *   WLAN/WiFi-Netzwerke (SSIDs, Keys).
*   **Rack-Management:**
    *   Visuelle Rack-Ansicht (Front/Back).
    *   Gerätepositionierung (Unit-genau).
    *   Stromkreise/PDU-Belegung.
    *   Uplink-Verbindungen.
*   **Sharing & Integration:**
    *   Generierung von schreibgeschützten Freigabelinks pro Tenant.
    *   Iframe-Support für Einbettung in externe Tools (speziell Confluence).
*   **Asset-Typen:** Hardware, Software, Cloud-Dienste, Verträge (Lizenzen/Wartung).

### Should-Have (Soll)
*   **Automatische Erkennung:** Basic Network Scanning (SNMP/Ping) zum initialen Befüllen.
*   **Diagramme:** Automatische Generierung von Netzwerktopologie-Plänen aus den erfassten Daten.
*   **Benachrichtigungen:** Alerts bei auslaufenden Verträgen oder Lizenzen.
*   **API:** REST-API für den Zugriff durch Drittanbieter-Tools (z.B. Ticketing-Systeme).

### Could-Have (Kann)
*   **Passwort-Manager:** Integrierter, sicherer Speicher für administrative Zugangsdaten (könnte aber auch via O365/extern gelöst sein).
*   **Knowledge Base:** Wiki-ähnliche Artikel für Standardarbeitsanweisungen (SOPs).
*   **Mobile App:** Native App für Techniker vor Ort (Scannen von QR-Codes an Racks).

### Won't-Have (Nicht im Scope)
*   **Echtzeit-Monitoring:** Kein Ersatz für Nagios/PRTG/CheckMK. Status-Anzeige nur "statisch" oder via einfacher API-Integration, kein aktives Polling aller 5 Sekunden.
*   **Ticket-System:** Keine Helpdesk-Funktionalität.
*   **CRM/ERP:** Keine Rechnungsstellung oder Vertriebssteuerung.

---

## 4. Haupt-Risiken
1.  **Sicherheitsrisiko "Shared Links":** Wenn Freigabelinks ohne weitere Authentifizierung (oder nur leichte Absicherung) Zugriff auf sensible Infrastrukturdaten geben, ist dies ein potenzielles Leck. iframe-Einbettung erfordert strikte CSP/X-Frame-Options-Konfiguration.
2.  **Datenkonsistenz:** Veraltete Dokumentation ist wertlos. Wenn manuelle Pflege zu aufwendig ist, nutzen Techniker das Tool nicht. (Mitigation: Fokus auf Usability und Import-Funktionen).
3.  **Abhängigkeit von Microsoft:** Starker Fokus auf Entra ID SSO. Falls ein Kunde Google Workspace oder Okta nutzt, ist der aktuelle Scope (nur O365) ein Hindernis.
4.  **Performance großer Netzwerke:** Bei der Visualisierung von tausenden Ports oder komplexen Rack-Ansichten könnte die Browser-Performance leiden.

---

## 5. Annahmen & Offene Fragen
*   **Annahme:** Alle MSP-Kunden und der MSP selbst nutzen primär das Microsoft-Ökosystem.
*   **Annahme:** Die Einbettung in Confluence via iframe ist sicherheitstechnisch beim Kunden erlaubt (einige Sicherheitsrichtlinien blockieren iframes).
*   **Frage:** Sollen Kunden Schreibrechte haben oder nur Leserechte? (Aktuelle Annahme: Primär Lesen/Kommentieren).
*   **Frage:** Wie tief soll die "Software"-Dokumentation gehen? Nur installierte OS/Apps oder auch SaaS-Abos im Detail?

---

## 6. Grobe Roadmap (3 Phasen)

### Phase 1: MVP & Core Data (Monate 1-2)
*   Aufbau der Multi-Tenant-Architektur & Datenbank.
*   Implementierung O365 / Entra ID SSO.
*   Grundlegende CRUD-Operationen für Assets (Hardware, Software, Verträge).
*   Basis-Netzwerk-Doku (IP-Listen, Subnetze).
*   Erste Version der Rack-Ansicht (statische Liste mit Positionen).

### Phase 2: Visualisierung & Integration (Monate 3-4)
*   Interaktive visuelle Rack-Ansicht (Drag & Drop).
*   Visualisierung der Switch-Port-Belegung.
*   Implementierung der "Share Link" Funktion und iframe-Kompatibilität.
*   Verknüpfungslogik (z.B. Server X hängt an Switchport Y und PDU Z).

### Phase 3: Automation & Polish (Monate 5-6)
*   Import-Assistenten (CSV, Excel) für Massendaten.
*   Export-Funktionen (PDF, Excel).
*   Erweiterte Suche über alle Tenants hinweg (für MSP-Admins).
*   UI/UX-Optimierung für mobile Endgeräte (Tablets für Techniker).
