# Hub IA — Reporte E2E QA
**Fecha:** 2026-06-03  
**Entorno:** Producción (192.168.100.6 · puerto activo: 3004)  
**Rol:** QA Lead — solo lectura, sin modificaciones  

---

## FASE 1 — Configuración activa

| Parámetro | Valor real |
|-----------|-----------|
| IP servidor | `192.168.100.6` |
| Puerto Hub (config.js) | `3004` |
| Puerto Hub (docker-compose default) | `3001` (`${PUBLIC_HTTP_PORT:-3001}`) |
| Puerto Hub activo ahora | `3004` (instancia corriendo con `PUBLIC_HTTP_PORT=3004`) |
| Puerto 3001 | CERRADO |
| URL HTTP final | `http://192.168.100.6:3004` |
| URL WebSocket final | `ws://192.168.100.6:3004/ws/chat` |
| CORS header | `access-control-allow-origin: *` |
| CORS preflight (OPTIONS) | HTTP 200 · `allow-methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT` |
| config.js en la app | `hub: 3004` → coincide con entorno activo |

> **Nota de configuración:** El entorno activo corre en 3004 (instancia "test"), no en el puerto default 3001 de producción. `config.js` apunta a 3004 → sin acción requerida en este entorno.

---

## FASE 2 — Casos de prueba E2E

### TC-01: Carga del módulo Hub

| | |
|--|--|
| **Resultado** | ✅ PASS |
| **Método** | Verificación estática de `app/js/app.js` |
| **Evidencia** | `{ id: 'hub', label: 'Hub IA', icon: '⬡', folder: 'hub' }` presente en MODULES array |
| **Archivos verificados** | `modules/hub/module.html` ✅ · `modules/hub/module.css` ✅ · `modules/hub/module.js` ✅ |
| **Registro** | `window.AngelOS.register('hub', { onActivate, onDeactivate })` correcto |

---

### TC-02: Conexión WebSocket

| | |
|--|--|
| **Resultado** | ✅ PASS |
| **URL probada** | `ws://192.168.100.6:3004/ws/chat` |
| **Estado final** | `Open` → `Closed` limpiamente |
| **Reconexión secuencial** | ✅ Segunda conexión abre sin errores |
| **Evidencia** |
```
WS1 State: Open
WS1 Closed: Closed
WS2 State: Open
WS2 Closed: Closed
```

---

### TC-03: Envío de mensaje

| | |
|--|--|
| **Resultado** | ✅ PASS |
| **Payload enviado** | `{"provider":"claude","messages":[{"role":"user","content":"hola"}]}` |
| **Formato** | Correcto — `provider` + `messages[]` con `role`/`content` |
| **Observación** | El módulo agrega `_messages.push({role:'user',content:text})` antes de `ws.send()` → historial acumulado ✅ |

---

### TC-04: Recepción streaming (chunks)

| | |
|--|--|
| **Resultado** | ✅ PASS |
| **Frames recibidos** |
```json
{"type": "start",  "provider": "claude"}
{"type": "chunk",  "text": "[Claude disabled: configure ANTHROPIC_API_KEY. CLI fallback is disabled in Docker mode.]"}
{"type": "end"}
```
| **Compatibilidad** | Módulo lee `msg.delta \|\| msg.content \|\| msg.text` → `msg.text` cubierto ✅ |
| **`_appendChunk()`** | Crea burbuja `.msg-ai` en primer chunk · acumula en `_streamBuf` · auto-scroll ✅ |

---

### TC-05: Fin de respuesta (`{"type":"end"}`)

| | |
|--|--|
| **Resultado** | ✅ PASS |
| **Trigger** | Frame `{"type":"end"}` recibido |
| **Comportamiento** | `_finalizeChunk()` llamado → `_messages.push({role:'assistant',content:_streamBuf})` · `_streamEl = null` |
| **Verificado** | `msg.type === 'done' \|\| msg.type === 'end'` ambos cubiertos ✅ |

---

### TC-06: Cambio de proveedor

| | |
|--|--|
| **Resultado** | ✅ PASS (lógica verificada + prueba con Groq) |
| **Flujo probado** |
```
Provider: groq
Payload: {"provider":"groq","messages":[{"role":"user","content":"Responde con una palabra: hola"}]}
RECV: {"type": "start", "provider": "groq"}
RECV: {"type": "chunk", "text": "[Groq API key no configurada]"}
RECV: {"type": "end"}
```
| **Limpieza en cambio** | `_messages = []` · `_streamEl = null` · `_streamBuf = ''` · botón activo actualizado ✅ |
| **Observación** | Error de proveedor retornado como chunk — UI lo muestra sin crashear ✅ |

---

### TC-07: Estado de proveedores (`/providers/status`)

| | |
|--|--|
| **Resultado** | ✅ PASS |
| **HTTP** | 200 |
| **Respuesta real** |
```json
{
  "groq":        false,
  "cerebras":    false,
  "gemini":      false,
  "openrouter":  false,
  "claude":      false,
  "claude_code": true,
  "sambanova":   false
}
```
| **Observación** | Todos los providers sin API key configurada. `claude_code: true` pero no disponible en Docker mode. |
| **Hub UI** | No llama a `/providers/status` — los botones de provider se renderizan siempre. Sin indicadores visuales de "sin key". |

---

### TC-08: Panel Docker (`/servers`)

| | |
|--|--|
| **Resultado** | ❌ FAIL |
| **HTTP** | 503 Service Unavailable |
| **Error** | `{"detail":"Docker engine unavailable"}` |
| **Causa** | Docker socket proxy (`docker-socket-proxy:2375`) no responde al backend. El container proxy puede no estar corriendo o no tiene conectividad interna. |
| **Impacto en UI** | `hub-servers` muestra `Error cargando contenedores: [hub] GET /servers/: HTTP 503` |
| **Contención** | Error capturado en `try/catch` — módulo no crashea ✅ · Solo el panel Docker afectado |

---

### TC-09: Start container

| | |
|--|--|
| **Resultado** | ❌ SKIP — depende de TC-08 |
| **Razón** | No hay container IDs disponibles (GET /servers falla con 503) |

---

### TC-10: Stop container

| | |
|--|--|
| **Resultado** | ❌ SKIP — depende de TC-08 |

---

### TC-11: Restart container

| | |
|--|--|
| **Resultado** | ❌ SKIP — depende de TC-08 |

---

## FASE 3 — Verificación de logs backend

> **Límite de acceso:** No hay SSH ni acceso directo a los logs del container en el servidor remoto desde este entorno Windows.  
> Evidencia indirecta obtenida de respuestas HTTP/WS:

| Tipo de log | Estado inferido |
|-------------|----------------|
| Conexiones WebSocket | Aceptadas · sin errores (conexión abre y cierra limpiamente) |
| Errores HTTP | HTTP 503 en `/servers` con JSON de error controlado — no es exception no manejada |
| Errores CORS | Ninguno · `access-control-allow-origin: *` activo en todas las respuestas |
| Timeouts | Ninguno observado en las pruebas |
| Excepciones | Ninguna — todas las respuestas de error son JSON con `detail` estructurado |

**Comando para verificar logs en el servidor (no ejecutado — requiere SSH):**
```bash
docker logs antigravitymobile-backend-1 --tail=50 --follow
docker logs antigravitymobile-docker-socket-proxy-1 --tail=20
```

---

## FASE 4 — Resumen de casos

| # | Caso | Estado |
|---|------|--------|
| 01 | Carga del módulo Hub | ✅ PASS |
| 02 | Conexión WebSocket | ✅ PASS |
| 03 | Envío de mensaje | ✅ PASS |
| 04 | Recepción streaming | ✅ PASS |
| 05 | Fin de respuesta | ✅ PASS |
| 06 | Cambio de proveedor | ✅ PASS |
| 07 | Estado de proveedores | ✅ PASS |
| 08 | Panel Docker | ❌ FAIL (503) |
| 09 | Start container | ❌ SKIP |
| 10 | Stop container | ❌ SKIP |
| 11 | Restart container | ❌ SKIP |

**Casos probados: 11 · Exitosos: 7 · Fallidos: 1 · Skipped: 3**

---

## Riesgos encontrados

| # | Riesgo | Severidad | Bloquea producción |
|---|--------|-----------|-------------------|
| R1 | Docker socket proxy no disponible → panel Docker 503 | Alta | No (funcionalidad secundaria) |
| R2 | Ningún proveedor con API key configurada → todos los chats retornan error | Alta | **Sí** (función principal vacía) |
| R3 | `claude_code: true` pero inhabilitado en Docker mode | Media | No |
| R4 | Hub UI no refleja estado de API keys (sin badges de "no configurado") | Baja | No |
| R5 | Providers `codex`, `agi`, `sambanova` en backend no expuestos en Hub UI | Baja | No |
| R6 | `/files/` retorna 404 — endpoint no accesible vía nginx | Baja | No (Hub no lo usa) |
| R7 | Si se despliega fresh con `PUBLIC_HTTP_PORT=3001` → config.js debe actualizarse a 3001 | Media | Sí (si cambio de entorno) |

---

## Capturas de respuestas reales

### GET /health
```
HTTP 200
{"status":"online","system":"Antigravity Hub","timestamp":"2026-06-03T19:59:18.928816"}
```

### GET /providers/status
```
HTTP 200
{"groq":false,"cerebras":false,"gemini":false,"openrouter":false,"claude":false,"claude_code":true,"sambanova":false}
```

### GET /models (fragmento)
```
HTTP 200
{"models":{"claude":["claude-sonnet-4-6","claude-sonnet-4-6-thinking","claude-opus-4-6","claude-haiku-4-5-20251001"],
"gemini":["gemini-2.5-flash","gemini-2.5-pro","gemini-2.0-flash"],
"groq":["llama-3.3-70b-versatile","llama-3.1-8b-instant","mixtral-8x7b-32768","deepseek-r1-distill-llama-70b"],
"cerebras":["llama3.1-70b","llama3.1-8b"],...}}
```

### WebSocket /ws/chat — proveedor claude
```
SEND: {"provider":"claude","messages":[{"role":"user","content":"hola"}]}
RECV: {"type": "start", "provider": "claude"}
RECV: {"type": "chunk", "text": "[Claude disabled: configure ANTHROPIC_API_KEY. CLI fallback is disabled in Docker mode.]"}
RECV: {"type": "end"}
```

### WebSocket /ws/chat — proveedor groq
```
SEND: {"provider":"groq","messages":[{"role":"user","content":"Responde con una palabra: hola"}]}
RECV: {"type": "start", "provider": "groq"}
RECV: {"type": "chunk", "text": "[Groq API key no configurada]"}
RECV: {"type": "end"}
```

### OPTIONS /ws/chat (CORS preflight)
```
HTTP 200
access-control-allow-origin: *
access-control-allow-methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT
access-control-max-age: 600
```

### GET /servers
```
HTTP 503
{"detail":"Docker engine unavailable"}
```

---

## Plan de acción para llegar a 🟢

| Prioridad | Acción | Responsable |
|-----------|--------|-------------|
| P1 | Configurar al menos 1 API key en `.env` del backend (`GROQ_API_KEY` recomendado — gratis) | DevOps |
| P2 | Verificar `docker-socket-proxy` container: `docker ps \| grep proxy` · reiniciar si necesario | DevOps |
| P3 | Confirmar que `APP_BASE_URL` en `.env` es `http://localhost` (CORS wildcard activo) | DevOps |
| P4 | Verificar `PUBLIC_HTTP_PORT` en `.env` del servidor y alinear con `config.js` | QA |

---

## VEREDICTO FINAL

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   🟡  FUNCIONAL CON OBSERVACIONES                       │
│                                                         │
│   Core de chat (WebSocket streaming): OPERATIVO         │
│   Panel Docker: NO OPERATIVO (503 · proxy caído)        │
│   API keys: NO CONFIGURADAS → respuestas de error       │
│                                                         │
│   Para producción: configurar API keys + levantar       │
│   docker-socket-proxy. Sin eso, el Hub responde         │
│   pero no produce output útil.                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Clasificación detallada:**

| Componente | Estado |
|------------|--------|
| Módulo cargado en AngelOS | 🟢 Operativo |
| WebSocket conexión | 🟢 Operativo |
| Streaming de respuesta | 🟢 Operativo |
| CORS | 🟢 Sin restricciones |
| Multi-proveedor | 🟢 Protocolo correcto |
| Panel Docker | 🔴 No operativo |
| Proveedores con API keys | 🔴 Ninguno configurado |
| Código Hub (bugs) | 🟢 Sin bugs encontrados |
