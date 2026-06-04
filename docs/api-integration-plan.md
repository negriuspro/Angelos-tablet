# AngelOS — Plan de Integración de APIs
> Versión 1.0 · 2026-06-03  
> Documenta qué APIs consume cada módulo, cómo se autentican y qué falta.

---

## Resumen de Conexiones por Módulo

| Módulo | Proyecto backend | Protocolo | Auth | Estado |
|--------|-----------------|-----------|------|--------|
| Dashboard | Daniel + Angel Ctrl | HTTP | Token + API Key | ✅ |
| Daniel | Daniel :3002 | HTTP + WebSocket | Token | ✅ |
| Angel Control | Angel Ctrl :3000 + Hub :3001 (fallback) | HTTP | API Key | ✅ |
| Monitor | Daniel :3002 | HTTP | Token | ✅ |
| Shield | Shield :3003 | HTTP | — | ✅ |
| Settings | — (localStorage) | — | — | ✅ |
| **Hub** | **AntigravityMobile :3001** | **HTTP + WebSocket** | **—** | **❌ Falta** |

---

## 1. Módulo Daniel

**Backend:** `http://{host}:3002`  
**Auth:** Header `X-Daniel-Admin-Token: {token}`

### Endpoints utilizados

| Endpoint | Método | Uso en AngelOS |
|----------|--------|----------------|
| `/health` | GET | Badge de conexión |
| `/api/system` | GET | CPU%, RAM%, Disk% del servidor |
| `/api/system/status` | GET | Estado PC principal + servidor (distribuido) |
| `/api/battery` | GET | Batería del servidor (si aplica) |
| `/api/devices` | GET | Lista de dispositivos smart home |
| `/api/devices/{id}` | POST `{on: bool}` | Toggle dispositivo |
| `/ws` | WebSocket | Chat IA en tiempo real |
| `/transcribe` | POST (multipart) | Audio → texto (STT alternativo) |

### Flujo WebSocket Daniel
```
WS conecta → onopen: badge "Conectado"
  message:
    - "__tablet_mic__" → inicia grabación audio
    - JSON {reply: "..."} → agrega al chat
    - texto plano → agrega al chat
  onclose → retry exponencial (2s → 30s)
  send → JSON {text: "mensaje del usuario"}
```

---

## 2. Módulo Angel Control

**Backend primario:** `http://{host}:3000`  
**Backend fallback:** `http://{host}:3001` (Hub)  
**Auth:** Header `X-Api-Key: {key}` (solo Angel Ctrl)

### Endpoints utilizados

| Endpoint | Backend | Método | Uso |
|----------|---------|--------|-----|
| `/health` | Angel Ctrl | GET | Badge conexión |
| `/api/metrics` | Angel Ctrl | GET | CPU%, RAM% |
| `/api/containers` | Angel Ctrl | GET | Lista contenedores |
| `/api/containers/{id}/{action}` | Angel Ctrl | POST | start/stop/restart |
| `/api/system` | Daniel (fallback) | GET | Métricas si Angel Ctrl sin /api/metrics |
| `/servers/` | Hub (fallback) | GET | Lista contenedores alternativa |
| `/servers/{id}/{action}` | Hub (fallback) | POST | Acciones alternativas |

### Estructura de respuesta esperada (containers)
```json
[
  {
    "id": "abc123",
    "name": "daniel_backend",
    "image": "daniel-backend:latest",
    "status": "Up 2 hours",
    "state": "running",
    "running": true
  }
]
```

---

## 3. Módulo Shield

**Backend:** `http://{host}:3003`  
**Auth:** Sin auth en endpoints leídos (o gestionada por Shield internamente)

### Endpoints utilizados

| Endpoint | Fallback | Uso |
|----------|----------|-----|
| `/health` | — | Badge conexión |
| `/api/adguard/stats` | `/api/dns/stats` | Stats DNS AdGuard |
| `/api/network/stats` | `/api/metrics` | Red y métricas |
| Prometheus: `http://{host}:9090/-/healthy` | — | Estado Prometheus |
| Grafana: `http://{host}:3003/grafana/api/health` | — | Estado Grafana |
| Node Exporter: `http://{host}:9100/metrics` | — | Estado node-exporter |
| AdGuard UI: `http://{host}:3900/` | — | Admin AdGuard |
| cAdvisor: `http://{host}:8080/healthz` | — | Estado cAdvisor |

### Estructura respuesta AdGuard stats esperada
```json
{
  "num_dns_queries": 15420,
  "num_blocked_filtering": 3210,
  "num_active_clients": 8,
  "avg_processing_time": 4
}
```

---

## 4. Módulo Monitor

**Backend:** `http://{host}:3002` (Daniel)

### Endpoints utilizados

| Endpoint | Uso |
|----------|-----|
| `/api/system/status` | Estado PC + servidor distribuido |
| `/api/system` | Fallback: solo servidor |
| `/api/battery` | Batería servidor |

### Estructura esperada `/api/system/status`
```json
{
  "pc": {
    "hostname": "PC-Principal",
    "online": true,
    "cpu_percent": 45,
    "ram_percent": 62,
    "disk_percent": 38,
    "battery_percent": 87,
    "power_plugged": true,
    "ip_address": "192.168.100.5",
    "uptime": 86400
  },
  "server": {
    "hostname": "ubuntu-server",
    "cpu_percent": 23,
    "ram_percent": 71,
    "disk_percent": 55,
    "docker_containers_running": 22,
    "ip_address": "192.168.100.6",
    "uptime": 432000
  }
}
```
> Si este endpoint no existe, el módulo hace fallback a `/api/system` (solo servidor).

---

## 5. Módulo Hub (❌ FALTANTE — diseño propuesto)

**Backend:** `http://{host}:3001` (AntigravityMobile hub)  
**Auth:** Sin auth requerida por el hub (rate limiting por IP)

### Endpoints a consumir

| Endpoint | Método | Uso propuesto |
|----------|--------|---------------|
| `/health` | GET | Badge de conexión |
| `/providers/` | GET | Lista de proveedores IA disponibles |
| `/providers/status` | GET | Estado online/offline de cada proveedor |
| `/models/` | GET | Modelos disponibles por proveedor |
| `/servers/` | GET | Contenedores (redundancia con Angel Ctrl) |
| `/ws/chat` | WebSocket | Chat IA en tiempo real |

### Flujo WebSocket Hub (mismo que AntigravityMobile)
```
WS conecta a /ws/chat
  send → JSON {
    "text": "mensaje",
    "provider": "claude|groq|gemini|cerebras",
    "model": "claude-opus-4-5"
  }
  receive:
    {"type": "start"}              → inicia burbuja asistente
    {"type": "chunk", "text": ""} → agrega texto en streaming
    {"type": "end"}                → finaliza respuesta
```

### Estructura `/providers/`
```json
[
  {
    "provider_id": "claude",
    "label": "Claude (Antigravity)",
    "health": "online",
    "models": ["claude-sonnet-4-5", "claude-opus-4-5"]
  },
  {
    "provider_id": "groq",
    "label": "Groq",
    "health": "online",
    "models": ["llama3-8b-8192"]
  }
]
```

---

## ApiClient (implementado en api.js)

```javascript
// Toda comunicación pasa por este cliente centralizado

window.API.get('daniel',    '/api/system')     // GET http://{host}:3002/api/system
window.API.post('angelCtrl', '/api/containers/{id}/start', {})  // con X-Api-Key header
window.API.openWS('daniel', '/ws', handlers)   // ws://{host}:3002/ws
```

### Auth automática por proyecto
| Proyecto | Header añadido automáticamente |
|----------|-------------------------------|
| `daniel` | `X-Daniel-Admin-Token` desde `CFG.danielAdminToken` |
| `angelCtrl` | `X-Api-Key` desde `CFG.angelCtrlApiKey` |
| `hub`, `shield` | Sin auth extra |

---

## Riesgos de Integración

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Shield `/api/adguard/stats` no expuesto externamente | Media | Fallback a `/api/dns/stats` ya implementado |
| Daniel `/api/system/status` no implementado | Media | Fallback a `/api/system` ya implementado |
| Hub WebSocket protocol diferente en algún endpoint | Baja | Revisar antes de codear el módulo Hub |
| Puertos diferentes en producción vs config.js | Baja | Settings permite editar puertos en runtime |
| CORS bloqueado para fetch cross-origin | Media | Configurar CORS_ORIGINS en cada backend para incluir IP de nginx AngelOS |
