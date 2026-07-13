# Feature List

Stand: 13. Juli 2026

Diese Liste priorisiert zuerst Sicherheit, Datenintegrität und funktionierende End-to-End-Flows. Produktfeatures bauen darauf auf.

## Bereits umgesetzt (Stand main, 13. Juli 2026)

- Interne Authentifizierung (JWT, Login, 2FA/TOTP, Setup-Flow); alle API-Endpunkte erfordern ein Token.
- Zentraler Frontend-API-Client (`apiClient.ts`) mit Bearer-Token, relativer Basis `/api/v1` und 401-Auto-Logout.
- Tenant-Dashboard mit echten Daten: Summary, Health-Score, Handlungsbedarf, Aktivitäten.
- Site-/Room-Verwaltung inkl. Inline-Rack-Erstellung; Switch-Port- und Firewall-Interface-Modell (V7/V12).
- MSP-Selbstdokumentation: Tenant-Typ MSP/CUSTOMER, Zuweisung von VLANs/Subnetzen/Geräten an Kunden, VPN-Tunnel-Dokumentation, Notes/Custom Fields an beliebigen Objekten, "Vom MSP bereitgestellt"-Panel, Public-IP-Zuweisung inkl. Aufheben.
- Einheitliche 400/409-Fehlerantworten mit deutschen Meldungen (`GlobalExceptionHandler`); Fehler-Toasts im UI.
- Erste Backend-Testsuite (7 Service-Testklassen, mockito-kotlin).

## P0 - Release-Blocker

- Tenant-scoped Autorisierung serverseitig implementieren: Rollen (`TENANT_USER` usw.) werden aktuell nur im Frontend geprüft; jeder authentifizierte Benutzer kann serverseitig jeden Tenant lesen und ändern.
- Referenzintegrität auf Service-Ebene erzwingen: VLANs, Geräte, Subnetze, IPs und VPN-Tunnel (inkl. local/remote Subnets) dürfen nur innerhalb erlaubter Tenant-Beziehungen verknüpft werden.
- Geräte-Create/Update-Vertrag korrigieren: Standort/Rack verpflichtend modellieren oder DB-Constraint an den gewünschten Lager-Workflow anpassen; Updates als echtes PATCH oder vollständiges PUT ausführen.
- Eingabevalidierung mit Bean Validation ergänzen: Pflichtfelder, Identifier/Slug, CIDR, IP/MAC, VLAN 1-4094, Rack-Höhe und U-Positionen.

## P1 - Kernfunktionen

- Entra ID/OAuth2-SSO als zusätzliche Login-Option ergänzen (interne JWT-Auth existiert bereits).
- Rack-Ansicht vervollständigen: Drag-and-drop-Persistenz, Kollisionsprüfung und Kapazitätsgrenzen gegen das Backend absichern.
- Switch-Ports und Kabelverbindungen Ende-zu-Ende prüfen und vervollständigen (Datenmodell existiert; Linkstatus und UI-Abdeckung offen).
- Hardware-Seite tenant-spezifisch filtern (API-Parameter `tenantId` existiert; UI-Nutzung sicherstellen).
- IPAM vervollständigen: IP muss im Subnet liegen, Netzwerk-/Broadcast-Adressen behandeln, Überschneidungen verhindern und freie Adressen korrekt berechnen.
- VPN-Tunnel tenant-sicher validieren und `secretRef` nur berechtigten Rollen anzeigen.
- Notes und Custom Fields an existierende Zielobjekte binden (entityId-Existenz prüfen) und beim Zugriff tenant-spezifisch autorisieren.
- Fehlerantworten vervollständigen: 403/404 und stabile Fehlercodes ergänzen (400/409 mit deutschen Meldungen existieren).

## P2 - Betrieb und Qualität

- Frontend-Code-Splitting pro Route einführen und das Initial-Bundle verkleinern.
- Frontend-Lint auf grün bringen und in CI als Pflichtprüfung ausführen.
- Integrations- und Controller-Tests mit PostgreSQL/Testcontainers ergänzen; Tenant-Isolation und Foreign-Key-Fälle abdecken.
- End-to-End-Tests für Tenant, Gerät, Subnet, IP-Zuweisung, VPN-Tunnel und Löschkonflikte ergänzen.
- Docker Compose um Frontend/Reverse Proxy erweitern; Healthchecks und produktionsfähige CORS-Konfiguration ergänzen.
- Audit Log für Änderungen an Geräten, Netzwerken, Zuweisungen, Notes und VPN-Tunneln implementieren.
- Strukturierte Logs, Request-ID, Metriken und zentrale Fehlerüberwachung ergänzen.
- Datenexport und Backup/Restore für Tenant-Dokumentationen bereitstellen.

## P3 - Produktfeatures

- Globale Suche über Tenants, Geräte, IPs, Seriennummern, MACs, Notes und Custom Fields.
- Verträge, Lizenzen und Zertifikate mit Ablaufdatum, Erinnerungen und Verantwortlichen verwalten.
- Dokumente und Anhänge pro Objekt speichern, versionieren und durchsuchen.
- Netzwerk-Topologie aus Interfaces und Connections visualisieren.
- Vorlagen für neue Tenants, Sites, Racks, VLANs und Standard-Dokumentation bereitstellen.
- Reporting: IP-Auslastung, Rack-Kapazität, Lifecycle-Status, offene Aufgaben und ablaufende Verträge.
- Import/Export für CSV/Excel sowie Discovery-Import aus Netzwerk- und RMM-Systemen.
- Änderungsfreigaben und Aufgaben-Workflow mit Zuweisung, Status und Fälligkeit ergänzen.

## Wettbewerbsanalyse: Hudu und IT Glue

Die beiden Produkte decken weit mehr als Infrastruktur-Inventar ab. Ihr gemeinsamer Kern ist eine verknüpfte Wissensbasis aus strukturierten Assets, Dokumenten, Zugangsdaten, Prozessen und Integrationen. Einzelne Funktionen koennen vom gebuchten Tarif oder Zusatzprodukt abhaengen.

| Bereich | Hudu | IT Glue | Aktueller Projektstand | Entscheidung |
| --- | --- | --- | --- | --- |
| Strukturierte, anpassbare Assets | Asset Layouts mit Feldtypen, Vorlagen und Pflichtfeldern | Flexible Assets und Vorlagenbibliothek | Feste Modelle plus einfache Custom Fields | **P1:** Generische Asset-Typen fuer Anwendungen, Anbieter, Vertraege, Lizenzen und Kontakte einfuehren |
| Beziehungen zwischen Eintraegen | Beziehungen zwischen Assets, Passwoertern, Dokumenten, Prozessen und Websites | Relationship Mapping zwischen Konfigurationen, Dokumenten und weiteren Assets | Nur fest im Datenmodell definierte Beziehungen | **P1:** Generische, typisierte Beziehungen mit Rueckverweisen und Vorschau bauen |
| Wissensbasis und SOPs | Knowledge Base, Prozesse, Vorlagen und Checklisten | Dokumente, KB, SOPs und Checklisten | Markdown-Notes, aber keine echte KB oder Prozessausfuehrung | **P1:** Durchsuchbare Dokumente und SOP-Checklisten; Prozessausfuehrungen danach |
| Globale Suche | Suche ueber globale und kundenspezifische Inhalte | Einheitliche Suche ueber dokumentierte Inhalte | Command Palette navigiert, sucht aber nicht umfassend in Fachdaten | **P1:** Tenant-uebergreifende, berechtigungssichere Suche mit Filtern |
| Audit und Versionierung | Aktivitaetsverlauf, Versionen, Flags und Reviews | Unveraenderlicher Audit Trail, Versionen und Rollback | Zeitstempel, aber keine Aenderungshistorie | **P1:** Audit Trail und Versionshistorie fuer sensible sowie redaktionelle Inhalte |
| Ablaufdaten und Dokumentationsqualitaet | Expirations, Website/SSL-Tracking, Flags, Reviews und Gold Standards | Domain/SSL-Tracking, Flags und Completion Profile | Health-Score und Handlungsbedarf pro Tenant existieren; keine Ablaufdaten/Reviews | **P1:** Ablaufdaten, Verantwortliche, Erinnerungen und Review-Status ergaenzen |
| Dateien und Bilder | Dateien, Fotos und Asset-Anhaenge | File Storage und Office-Dokumente | Nicht vorhanden | **P1:** Sichere Anhaenge mit Metadaten; Fotogalerie und Office-Editor spaeter |
| Archivierung | Museum fuer archivierte Inhalte | Archivierung mit protokollierter Wiederherstellung | Nicht vorhanden | **P1:** Soft Delete/Archiv mit Restore und Aufbewahrungsregeln |
| Passwoerter und TOTP | Integrierter Passwort-Tresor und OTP | Passwortverwaltung, Vault, OTP und weitere Sicherheitsfunktionen | `secretRef` verweist bereits auf externe Geheimnisse | **Nicht selbst als Erstes bauen:** Externe Tresore anbinden und nur Referenzen/Berechtigungen verwalten |
| Import, Export und Runbooks | CSV-Import/-Export, Vorlagen und externes Teilen | Account-Export, API und PDF-Runbooks | Nicht vorhanden | **P2:** Vollstaendiger Tenant-Export fuer Backup, Offboarding und Notfallzugriff |
| Integrationen und Discovery | API, Integrationen und Asset Discovery | PSA/RMM-Integrationen, API und Network Glue | Nicht vorhanden | **P2:** Zuerst stabile API und Mapping; danach Entra/M365, PSA/RMM und Netzwerk-Discovery |
| Kundenportal und Freigaben | Client Portal und externe Freigaben | MyGlue mit Branding und Mobile-Zugriff | Nicht vorhanden | **P3:** Lesender, gezielt freigegebener Kundenbereich; kein Vollportal im ersten Release |
| IPAM, Racks und Topologie | IPAM, Rack Management und Netzwerkdokumentation | Netzwerkdaten und Diagramme vor allem ueber Network Glue | IPAM, Public IPs, Racks, Switch-Ports, VPN und Hardware im Domänenmodell mit weitgehend echter UI | **Differenzierer:** Diesen Bereich zuerst wirklich Ende-zu-Ende fertigstellen (Validierung, Topologie, Restluecken) |
| Mobile App und Browser-Erweiterung | Vorhanden | Vorhanden | Responsive Web-UI | **Spaeter:** Erst gute mobile Web-/PWA-Nutzung; native App und Extension nur bei belegtem Bedarf |
| KI-Funktionen | KI-gestuetzte Dokumentationsfunktionen werden angeboten | Automatisierung und KI-Funktionen werden vermarktet | Nicht vorhanden | **Vorerst nicht priorisieren:** Erst Datenqualitaet, Suche, Rechte und Integrationen stabilisieren |

## Empfohlener Produktfokus

MSPDokuTool sollte Hudu oder IT Glue nicht vollstaendig kopieren. Eine belastbare Positionierung ist **infrastrukturnahe MSP-Dokumentation**: Hardware, Sites, Racks, Switch-Ports, IPAM und VPN werden mit flexiblen Dokumentationsobjekten, Beziehungen und Automatisierung verbunden.

### Unverzichtbare Paritaet

- Sichere Mandantentrennung, Rollen, SSO/MFA, Audit Trail und Versionshistorie.
- Strukturierte Asset-Typen mit Vorlagen, Pflichtfeldern und kundenspezifischen Erweiterungen.
- Universelle Beziehungen zwischen Infrastruktur, Dokumenten, Kontakten, Anbietern, Vertraegen und Lizenzen.
- Globale, berechtigungssichere Suche mit Schnellnavigation und Filtern.
- Wissensbasis, SOPs, Checklisten, Anhaenge, Archiv und Wiederherstellung.
- Ablaufdaten, Reviews, Verantwortliche, Erinnerungen und Anzeige der Dokumentationsvollstaendigkeit.
- Offene API sowie zuverlaessiger Import und vollstaendiger Tenant-Export.

### Bewusste Differenzierung

- IPAM nicht als einfache Liste, sondern mit CIDR-Pruefung, Konflikterkennung, Reservierungen und Auslastung bauen.
- Racks, Geraete, Switch-Ports, VLANs, Kabelverbindungen und VPN-Tunnel in einem konsistenten Infrastrukturgraphen verbinden.
- Techniker-Workflows optimieren: schnelle Erfassung, Vorlagen, Tastaturbedienung, Bulk-Aktionen und nachvollziehbare letzte Aenderungen.
- Discovery-Daten nie ungeprueft ueberschreiben: Unterschiede anzeigen und kontrolliert uebernehmen.
- Self-hosted Betrieb als Vorteil nutzen, ohne auf sichere Defaults, Updates und Backup/Restore zu verzichten.

### Bewusst spaeter oder extern loesen

- Kein eigener Passwort-Tresor, keine Passwortrotation und kein Offline-Tresor im ersten Produktzyklus. Bitwarden, 1Password oder ein anderes Secrets-System ueber Referenzen integrieren.
- Kein eigenes Domain-, SSL- oder Uptime-Monitoring. Bestehende Monitoring-Systeme anbinden und deren Status dokumentieren.
- Keine native Mobile-App und keine Browser-Erweiterung, solange eine responsive PWA den Techniker-Workflow abdeckt.
- Kein eingebauter Office-Editor, keine umfangreiche Fotogalerie und kein vollstaendiges White-Label-Kundenportal im Kernrelease.
- Keine KI-Generierung auf unvollstaendigen oder unzureichend berechtigten Daten. KI erst nach Suche, Audit, Rechtekonzept und Datenqualitaet.
- Keine Cross-Account-Migration oder komplexe MSP-zu-MSP-Freigabe, bevor Export/Import und Tenant-Isolation belastbar sind.

## Umsetzungsreihenfolge

1. **Fundament:** P0-Fehler beheben, Authentifizierung aktivieren, Tenant-Isolation testen und Audit Trail einfuehren.
2. **Techniker-Alltag:** Infrastruktur-Flows fertigstellen, Suche, Beziehungen, Dokumente, Anhaenge, Archiv und Ablaufdaten liefern.
3. **Standardisierung:** Asset-Typen, Vorlagen, Pflichtfelder, Vollstaendigkeitsregeln, SOPs und Checklisten ergaenzen.
4. **Automatisierung:** API, CSV-Import, Tenant-Export und erste Entra/M365-/PSA-/RMM-Integrationen bauen.
5. **Erweiterung:** Discovery, Topologie, Kundenfreigaben, Reports und optionale PWA-Funktionen anhand realer Nutzung priorisieren.

## Quellen zur Wettbewerbsanalyse

- [Hudu Product Overview](https://www.hudu.com/product/overview)
- [Hudu Asset Layouts](https://support.hudu.com/hc/en-us/articles/7905521347991-Asset-Layouts)
- [Hudu Relationships](https://support.hudu.com/hc/en-us/articles/8251478937751-Relationships)
- [Hudu Processes](https://support.hudu.com/hc/en-us/articles/9143382484759-Processes)
- [IT Glue Structured Documentation](https://www.itglue.com/features/structured-documentation/)
- [IT Glue Features](https://www.itglue.com/features/)
- [IT Glue Runbooks](https://www.itglue.com/blog/feature-release-runbooks/)
- [IT Glue Export and Backup](https://help.itglue.kaseya.com/help/Content/1-admin/import-and-export/exporting-and-backing-up-account-data.html)

## Definition of Done

- Daten werden persistent gespeichert und nach Reload korrekt angezeigt.
- Jeder tenant-bezogene Zugriff ist serverseitig autorisiert und getestet.
- Fehler werden im UI verständlich dargestellt; keine Erfolgsmeldung ohne erfolgreichen API-Call.
- Backend-Unit-/Integrationstests, Frontend-Build und Lint sind grün.
- Mobile und Desktop sind funktional geprüft; Tastaturbedienung und grundlegende Accessibility sind abgedeckt.
