package com.msp.doku.controller

import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class RootController {

    @GetMapping("/", "/.")
    fun index(): ResponseEntity<String> {
        val html = """
            <!doctype html>
            <html lang="de">
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>MSP Doku Tool</title>
                <style>
                  body {
                    margin: 0;
                    font-family: Sora, Manrope, system-ui, sans-serif;
                    background: #f8fafc;
                    color: #0f172a;
                  }
                  main {
                    max-width: 720px;
                    margin: 64px auto;
                    padding: 32px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 24px;
                    box-shadow: 0 10px 30px -24px rgba(15, 23, 42, 0.35);
                  }
                  h1 {
                    margin: 0 0 12px;
                    font-size: 28px;
                  }
                  p {
                    margin: 0 0 16px;
                    line-height: 1.6;
                    color: #475569;
                  }
                  code {
                    background: #f1f5f9;
                    padding: 2px 6px;
                    border-radius: 8px;
                  }
                  ul {
                    margin: 20px 0 0;
                    padding-left: 20px;
                    color: #334155;
                  }
                  a {
                    color: #0f766e;
                    text-decoration: none;
                  }
                  a:hover {
                    text-decoration: underline;
                  }
                </style>
              </head>
              <body>
                <main>
                  <h1>MSP Doku Tool Backend</h1>
                  <p>Der Backend-Server laeuft. Unter <code>/</code> gibt es keine React-App-Auslieferung.</p>
                  <p>Im Entwicklungsmodus starte das Frontend ueber Vite und oeffne <a href="http://localhost:5173">http://localhost:5173</a>.</p>
                  <ul>
                    <li>API Health: <a href="/actuator/health">/actuator/health</a></li>
                    <li>API Basis: <code>/api</code></li>
                  </ul>
                </main>
              </body>
            </html>
        """.trimIndent()

        return ResponseEntity
            .ok()
            .contentType(MediaType.TEXT_HTML)
            .body(html)
    }
}
