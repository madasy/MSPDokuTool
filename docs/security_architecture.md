# Security & Identity Architecture

## 1. Authentication Plan: Iframe & SSO

**Challenge:** Moderne Browser (Safari ITP, Chrome Privacy Sandbox) blockieren standardmäßig Third-Party Cookies. Ein iframe (MSP-Tool) in Confluence (fremde Domain) kann daher oft nicht auf bestehende SSO-Sessions zugreifen ("Silent Refresh" schlägt fehl). Zudem verbieten Identity Provider (wie Microsoft Entra ID) oft das Rendern ihrer Login-Seite in einem iframe (`X-Frame-Options: DENY`).

**Empfohlene Lösung: "Popup-based Auth Flow" mit MSAL.js**

### Der Flow
1.  **User öffnet Confluence-Seite:** Der MSP-Tool-Iframe wird geladen.
2.  **Initial Check:** Iframe versucht via MSAL.js `ssoSilent`.
    *   *Szenario A (Klappt):* Browser erlaubt 3rd-Party-Cookies oder Token ist im LocalStorage -> **Eingeloggt.**
    *   *Szenario B (Blockiert/Neu):* Auth schlägt fehl.
3.  **User Interaktion:** Iframe zeigt Button "Anzeigen" oder "Login mit Office 365".
4.  **Popup Login:**
    *   Klick öffnet ein **Popup-Fenster** zur MSP-Tool-Domain (`/auth/login`).
    *   Popup leitet zu Microsoft Entra ID weiter (Top-Level Window -> Full Access to Cookies/Session).
    *   User loggt sich ein (oder ist durch Confluence-Nutzung schon im Browser eingeloggt -> Auto-Redirect).
    *   Entra ID schickt User zurück zum MSP-Tool Popup.
5.  **Token Handover:**
    *   Das Popup erhält das ID/Access Token.
    *   Es speichert das Token (z.B. Session Storage / In-Memory).
    *   Es schließt sich selbst und informiert den Iframe (Opener) via `postMessage`.
6.  **Iframe Reload:** Iframe empfängt Nachricht, holt Token und zeigt den Inhalt.

**Vorteile:**
*   Funktioniert in allen Browsern (auch Safari).
*   Umgeht `X-Frame-Options: DENY` des IdP.
*   Kein "Redirect Loop" im Iframe.

---

## 2. API Security & Session Handling

### Backend (Spring Security)
*   **Protokoll:** OAuth2 / OIDC (Resource Server).
*   **Token:** JWT (Stateless). Kein Session-Cookie nötig für API-Calls.
*   **Validierung:** backend prüft Signatur gegen Entra ID Public Keys (JWK Set).

### Security Headers (Wichtig für Iframe-Embedding)
Damit der Iframe in Confluence (z.B. `https://kunde.atlassian.net`) laden darf, muss das Backend korrekte Header senden:

*   **Content-Security-Policy (CSP):**
    ```
    frame-ancestors 'self' https://*.atlassian.net https://*.kunde-intern.de;
    ```
    *Erlaubt das Einbetten nur auf vertrauenswürdigen Domains.*
*   **CORS (Cross-Origin Resource Sharing):**
    *   Muss die Origin des Confluence-Iframes erlauben, wenn JavaScript Calls gemacht werden.
*   **X-Frame-Options:** Veraltet, wird durch CSP `frame-ancestors` ersetzt. Nicht `DENY` oder `SAMEORIGIN` setzen, sonst geht der Iframe nicht!

---

## 3. Link-Sharing-Modell

**Anforderung:** Keine öffentlichen Links ("Capability URLs").
**Lösung:** "Identity-Based Sharing"

### Funktionsweise
1.  **Link erstellen:** Admin klickt "Share".
2.  **Zielgruppe definieren:** Admin wählt eine **Entra ID Security Group** (z.B. "Kunde A IT-Admins") oder spezifische E-Mail-Adressen.
3.  **Link Generierung:** Der Link ist rein referenziell: `https://msp-tool.com/tenant/123/rack/4`. Er enthält **kein** Secret.
4.  **Zugriff:**
    *   Externer User klickt Link.
    *   Muss sich via Microsoft SSO anmelden (Gast-Account im Entra Tenant des MSPs oder Federation).
    *   Backend prüft: `Ist User Member of Group X?` -> Zugriff gewährt.

### Guest Access (B2B)
Für Kunden-Mitarbeiter nutzen wir **Entra ID B2B Guest Accounts**.
*   Vorteil: Kunde nutzt sein eigenes Firmen-Login.
*   Wir müssen keine Passwörter verwalten.

---

## 4. Threat Model (Top Risiken & Mitigation)

| Risiko | Beschreibung | Mitigation |
| :--- | :--- | :--- |
| **Clickjacking** | Angreifer legt unsichtbaren Iframe über harmlose Seite, um Klicks abzufangen. | **CSP `frame-ancestors`** strikt auf bekannte Confluence-Domains beschränken (`whitelist`). |
| **Token Theft (XSS)** | JS-Code im Iframe klaut Access Token. | Token nur im Memory halten (nicht LocalStorage wenn möglich), kurze Lebensdauer (1h), Refresh via Secure Cookie oder Silent Iframe. Strikte CSP für Scripts (`script-src 'self'`). |
| **Broken Access Control** | User A errät URL von Tenant B. | Serverseitige Prüfung bei JEDEM Request: `Check(User, TenantID)`. Partitionierte Datenhaltung. |
| **Phishing via Popup** | Fake-Popup sieht aus wie MS Login. | User Awareness. MSAL nutzt vertrauenswürdige MS-Domains. |
| **Confluence Admin Abuse** | Confluence Admin injiziert Skript, das Daten aus dem Iframe liest. | Browser "Same-Origin Policy" verhindert Zugriff von Confluence-Parent auf MSP-Iframe-DOM, solange Cross-Origin (unterschiedliche Domains). |

## 5. Zusammenfassung für Umsetzung
1.  **Frontend:** Implementierung von MSAL.js mit Popup-Logic für Login.
2.  **Backend:** Konfiguration der CSP-Header (`frame-ancestors`) dynamisch per Config.
3.  **Entra ID:** App Registration mit Redirect URIs für SPA.
