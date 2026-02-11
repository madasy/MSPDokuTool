# IAM & RBAC Design Concept

## 1. Rollen-Übersicht & Scope

Das System unterscheidet zwischen **MSP-Rollen** (Mandantenübergreifend) und **Tenant-Rollen** (Mandantenspezifisch).

### MSP-Level Rollen (Global)
*   **MSP Global Admin:** Darf alles. Systemkonfiguration, Tenant-Erstellung, User-Management.
*   **MSP Tech:** Operativer Zugriff auf alle (oder zugewiesene) Tenants. Darf Doku erstellen/ändern/löschen.
*   **MSP ReadOnly:** Lesezugriff auf alle Tenants (z.B. Support Level 1, Sales).

### Tenant-Level Rollen (Scoped on Tenant ID)
*   **Tenant Admin (Kunde):** Verwaltet Zuweisungen innerhalb des eigenen Tenants. Darf alles im Tenant sehen/ändern.
*   **Tenant Editor:** Darf Assets/Doku im Tenant bearbeiten (Standard-IT-Mitarbeiter des Kunden).
*   **Tenant Viewer:** Nur Lesezugriff (z.B. Management, normale User).
*   **Auditor/External:** Stark eingeschränkter Lesezugriff (z.B. nur Verträge & Logs, keine Passwörter).

---

## 2. RBAC Matrix (Berechtigungen)

| Feature / Aktion | MSP Admin | MSP Tech | MSP Read | T-Admin | T-Edit | T-View | Auditor |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **System Management** |
| Create/Delete Tenants | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Configure SSO/IdP | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **User & Access** |
| Manage Tenant Users | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Generate Share Links | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Infrastructure (Racks/Net)** |
| View Assets/Topology | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create/Edit Assets | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Delete Assets | ✅ | ✅ | ❌ | ✅ | ⚠️(Own) | ❌ | ❌ |
| **Sensitive Data** |
| View Passwords/Keys | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| View Public IPs (DC) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Business Data** |
| View Contracts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Audit Logs | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

*Legende: ✅ = Erlaubt, ❌ = Verboten, ⚠️ = Eingeschränkt (z.B. nur selbst erstellte oder Warnhinweis)*

---

## 3. Entra ID Mapping & Isolation

### Isolation Strategy (Code Level)
Jeder API-Request muss durch einen Security-Filter, der prüft:
1.  **Authentication:** Ist das JWT valide?
2.  **Context:** Auf welche `tenant_id` wird zugegriffen?
3.  **Authorization:** Hat der User eine Rolle, die Zugriff auf diese `tenant_id` erlaubt?

**Regel:**
*   MSP-Rollen haben Wildcard-Zugriff: `tenant_id: *` (oder Liste aller IDs).
*   Tenant-Rollen haben expliziten Scope: `tenant_id: "uuid-firma-a"`.

### Entra ID Group Mapping
Wir nutzen Entra ID Gruppen (Security Groups), um Rollen zuzuweisen. Das Backend mappt `Group ObjectID` -> `Internal Role`.

**Beispiel-Konfiguration (DB-Tabelle `role_mappings`):**

| Entra Group Name (Beispiel) | Entra Group ID (OID) | Mapped Role | Target Tenant |
| :--- | :--- | :--- | :--- |
| `SG-MSP-Admins` | `Guid-1111...` | `ROLE_MSP_ADMIN` | `*` (Global) |
| `SG-MSP-Technicians` | `Guid-2222...` | `ROLE_MSP_TECH` | `*` (Global) |
| `SG-CustomerA-Admins` | `Guid-3333...` | `ROLE_TENANT_ADMIN` | `Tenant-A-UUID` |
| `SG-CustomerA-IT` | `Guid-4444...` | `ROLE_TENANT_EDITOR`| `Tenant-A-UUID` |
| `SG-External-Audit` | `Guid-5555...` | `ROLE_AUDITOR` | `Tenant-B-UUID` |

**Flow:**
1.  User loggt ein -> JWT enthält `groups` Claim (Liste von OIDs).
2.  Backend lädt Mappings für diese OIDs.
3.  SecurityContext wird gebaut: `User hat ROLE_MSP_TECH` ODER `User hat ROLE_TENANT_ADMIN für Tenant A`.

---

## 4. Spezialfälle

### Confluence Iframe View
*   Der User im Iframe ist via SSO authentifiziert.
*   Er hat z.B. nur `ROLE_TENANT_VIEWER`.
*   Er sieht im Iframe exakt das Gleiche wie in der App, nur ohne Navigation/Sidebar (reine Content-View).

### "Break Glass" Access
*   Falls SSO ausfällt: Ein lokaler `superadmin` User (nur DB-basiert) für Notfall-Wartung. Muss extrem geschützt/überwacht werden.

### ABAC (Attribute Based Access Control) - Optional / Future
*   Falls ein Kunde Standorte trennen will: "User darf nur Racks in `Berlin` sehen".
*   Umsetzung: Tagging von Assets (`location:Berlin`) und User-Attributen. Für MVP vorerst **Out of Permission Scope**.
