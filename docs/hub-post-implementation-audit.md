# Hub — Post-Implementation Audit
> Fecha: 2026-06-03 · Auditor: técnico independiente  
> **No se modificó ningún archivo durante esta auditoría.**

---

## 1. Contenido verificado de los archivos implementados

### `modules/hub/module.js` — 334 líneas

```
IIFE wrapping                    ✅  Namespace aislado
window._HUB namespace            ✅  setProvider, refreshServers, ctrlServer
window.AngelOS.register('hub')   ✅  Sistema correcto
onActivate()                     ✅  Captura STT, render, bindEvents, connectWS, loadServers
onDeactivate()                   ✅  Restaura STT, disconnectWS, stopSTT
_connectWS() / _disconnectWS()   ✅  WebSocket con retry exponencial 2s→30s
_appendChunk() / _finalizeChunk()✅  Streaming en-vivo con auto-scroll
_sendMessage()                   ✅  Valida texto + estado WS antes de enviar
_appendMsg()                     ✅  Roles: user / ai / sys
_toggleMic() / _startBrowserSTT()✅  WebSpeech API + bridge Android
_stopSTT() / _micState()         ✅  Cleanup y estado visual del botón
_loadServers() / _ctrlServer()   ✅  Panel Docker con acciones
_bindEvents()                    ✅  addEventListener (no onclick inline en JS)
_q() / _setBadge()               ✅  Helpers estándar del proyecto
```

### `modules/hub/module.html` — 30 líneas

```
.mod-header con mod-title        ✅  Consistente con otros módulos
#hub-conn badge                  ✅  Badge de conexión WS
#hub-providers div               ✅  Contenedor para botones de proveedor (renderizado por JS)
#hub-shell / #hub-messages       ✅  Área de chat scrollable
#hub-footer / #hub-input         ✅  Textarea + mic + send
#hub-servers                     ✅  Panel Docker
Todos los IDs prefijados hub-*   ✅  Sin conflictos con otros módulos
```

### `modules/hub/module.css` — 105 líneas

```
.hub-providers                   ✅  Flex wrap para botones de proveedor
.hub-prov-btn + .hub-prov-btn.active ✅ Estilo visual correcto
#hub-shell height: 60vh - 80px   ✅  Similar a Daniel (60vh - 60px)
#hub-messages scrollable         ✅  Con webkit-overflow-scrolling
#hub-footer flex align-end       ✅  Igual que Daniel
#hub-input textarea              ✅  Igual que Daniel, con focus accent
.hub-docker-card margin-top      ✅  Separación del panel Docker
Responsive @media queries        ✅  Portrait tablet + altura pequeña
```

---

## 2. Comparación con módulos existentes

### Patrón de registro

| Módulo | Registro | Correcto |
|--------|----------|----------|
| Dashboard | `window.AngelOS.register('dashboard', ...)` | ✅ |
| Daniel | `window.AngelOS.register('daniel', ...)` | ✅ |
| Angel Control | `window.AngelOS.register('angel-control', ...)` | ✅ |
| Monitor | `window.AngelOS.register('monitor', ...)` | ✅ |
| Shield | `window.AngelOS.register('shield', ...)` | ✅ |
| **Hub** | `window.AngelOS.register('hub', ...)` | ✅ |

### Patrón de ciclo de vida

| Módulo | onActivate | onDeactivate |
|--------|-----------|-------------|
| Dashboard | `_startClock(); _loadAll(); setInterval(...)` | `clearInterval x2` |
| Daniel | `_connectWS(); _pollMetrics(); loadDevices()` | `_disconnectWS(); _stopSTT(); clearInterval` |
| Angel Control | `_initFilterBtns(); _loadAll(); setInterval(...)` | `clearInterval` |
| Monitor | `_loadAll(); setInterval(...)` | `clearInterval` |
| **Hub** | `captura STT; _renderProviders(); _bindEvents(); _connectWS(); _loadServers()` | `restaura STT; _disconnectWS(); _stopSTT()` |

**Hub sigue el patrón exacto. Limpieza completa en onDeactivate. ✅**

### Helper DOM

| Módulo | Helper | Implementación |
|--------|--------|----------------|
| Daniel | `_q(id)` | `document.getElementById(id)` |
| Angel Control | `_q(id)` | `document.getElementById(id)` |
| Monitor | `_q(id)` | `document.getElementById(id)` |
| Shield | `_q(id)` | `document.getElementById(id)` |
| **Hub** | `_q(id)` | `document.getElementById(id)` |

**Idéntico en todos los módulos. ✅**

---

## 3. Verificación: init() / destroy() / render()

> El usuario solicitó verificar `init()`, `destroy()`, `render()`.

**AngelOS NO usa esos métodos.** El sistema usa:
- `onActivate()` ← equivalente a init + render
- `onDeactivate()` ← equivalente a destroy

Confirmado leyendo `app/js/app.js` líneas 48-83:
```javascript
if (_instances[moduleId]?.onActivate) {
  _instances[moduleId].onActivate(main);  // ← único método llamado al entrar
}
// ...
if (_activeId && _instances[_activeId]?.onDeactivate) {
  try { _instances[_activeId].onDeactivate(); } catch {}  // ← único método llamado al salir
}
```

Hub usa exactamente el contrato que el router espera. ✅

---

## 4. WebSocket exacto y URL final construida

### Ruta solicitada por el módulo
```javascript
// modules/hub/module.js, línea 93:
_ws = window.API.openWS('hub', '/ws/chat', handlers)
```

### Construcción en api.js + config.js
```javascript
// api.js openWS():
const url = window.CFG.ws(project, path);

// config.js CFG.ws():
ws(project, path = '') {
  const host = this._data.serverHost;   // '192.168.100.6' (default, editable)
  const port = this._data.ports[project]; // ports.hub = 3004 (default, editable)
  return `ws://${host}:${port}${path}`;
}
```

### URL final construida (con valores por defecto)
```
ws://192.168.100.6:3004/ws/chat
```

### URL correcta para producción (puerto real del backend)
```
ws://192.168.100.6:3001/ws/chat   ← AntigravityMobile nginx: ${PUBLIC_HTTP_PORT:-3001}
```

> ⚠️ DISCREPANCIA DE PUERTO — Ver Sección 7.

---

## 5. Endpoints exactos utilizados

### HTTP GET — Lista de servidores
```javascript
// module.js línea 263:
window.API.get('hub', '/servers/')
// URL construida: http://192.168.100.6:3004/servers/
// URL correcta:   http://192.168.100.6:3001/servers/
```

### HTTP POST — Acciones Docker
```javascript
// module.js línea 298:
window.API.post('hub', `/servers/${id}/${action}`, {})
// URL: http://192.168.100.6:3001/servers/{id}/start|stop|restart
```

---

## 6. Verificación de valores hardcodeados

### Búsqueda en modules/hub/ (grep exhaustivo)

| Patrón | Matches en modules/hub/ |
|--------|------------------------|
| `192.168.` | **0** ✅ |
| `localhost` | **0** ✅ |
| `:\d{4}` (puerto literal) | **0** ✅ |
| `token` / `api_key` / `secret` | **0** ✅ |
| `changeme` / `password` | **0** ✅ |
| `window.registerModule` | **0** ✅ |

Toda la configuración de red pasa por:
```javascript
window.API.openWS('hub', ...)    // usa CFG.ws()
window.API.get('hub', ...)       // usa CFG.url()
window.API.post('hub', ...)      // usa CFG.url()
```

**Veredicto IPs/puertos/tokens hardcodeados: NINGUNO ✅**

---

## 7. Validación de endpoints del backend real

### Análisis de `AntigravityMobile/hub/main.py`

El hub de AntigravityMobile incluye estos routers:
```python
app.include_router(health_router)     # /health, /models
app.include_router(chat_router)       # /ws/chat  ← WebSocket
app.include_router(daniel_router)     # /daniel/*
app.include_router(claude_code_router)# /claude-code/*
app.include_router(servers_router)    # /servers, /servers/{id}/*
app.include_router(agi_agent_router)  # /agi-agent/*
app.include_router(files_router)      # /files/*
app.include_router(providers_router)  # /providers/status
```

### `/ws/chat` — Chat WebSocket

**Estado: ✅ EXISTE y es compatible**

```python
# routes/chat.py, línea 25:
@router.websocket("/ws/chat")
async def chat_ws(ws: WebSocket):
    data = json.loads(raw)
    provider = data.get("provider", "claude")    # ← Hub envía esto ✅
    messages = data.get("messages", [])          # ← Hub envía esto ✅
    model = data.get("model")                    # ← Hub puede añadir esto
    # ...
    await manager.send(ws, json.dumps({"type": "start", "provider": provider}))
    # chunks:
    await manager.send(ws, json.dumps({"type": "chunk", "text": chunk}))
    # fin:
    await manager.send(ws, json.dumps({"type": "end"}))
```

**Matching con module.js:**

| Campo backend | Enviado por Hub | Resultado |
|---------------|-----------------|-----------|
| `provider` | `_currentProvider` | ✅ Match |
| `messages` | `_messages[]` | ✅ Match |
| `{"type":"chunk","text":chunk}` | `msg.text || ''` | ✅ Match |
| `{"type":"end"}` | `msg.type === 'end'` | ✅ Match |
| `{"type":"start"}` | `return` (ignorado) | ✅ Match |

### `/servers/` — Lista de contenedores

**Estado: ✅ EXISTE y es compatible**

```python
# routes/servers.py, línea 65:
@router.get("")    # prefix="/servers" → GET /servers
async def list_containers(all: bool = Query(default=True)):
    return {"containers": await _run_blocking(op)}
```

**Ruta real**: `GET /servers` (FastAPI redirige `/servers/` → `/servers` automáticamente)

**Respuesta**: `{"containers": [{"id","name","image","status","state","running",...}]}`

**Module.js maneja esto**:
```javascript
const containers = Array.isArray(data)
  ? data
  : (data.containers || data.servers || []);  // ← data.containers ✅
```

### `/servers/{id}/start|stop|restart`

**Estado: ✅ EXISTEN**

```python
@router.post("/{container_id}/start")    # → POST /servers/{id}/start  ✅
@router.post("/{container_id}/stop")     # → POST /servers/{id}/stop   ✅
@router.post("/{container_id}/restart")  # → POST /servers/{id}/restart ✅
```

### `/providers/status`

**Estado: ✅ EXISTE** (pero Hub module no lo llama — funciona sin él)

```python
# routes/providers.py:
@router.get("/providers/status")
def providers_status():
    return {"groq": bool(...), "cerebras": bool(...), ...}
```

### `/providers/` (lista completa)

**Estado: ❌ NO EXISTE** — solo existe `/providers/status`

El Hub module **no llama este endpoint** → no hay error. Característica no implementada.

### `/health`

**Estado: ✅ EXISTE**

```python
@router.get("/health")
async def health():
    return {"status": "online", "system": "Antigravity Hub", "timestamp": ...}
```

---

## 8. Incompatibilidades detectadas

### 🔴 INCOMPATIBILIDAD #1 — Puerto incorrecto (ALTA SEVERIDAD)

| | Valor |
|--|-------|
| `AngelOS/config.js` `ports.hub` | `3004` (antigravitymobile-test) |
| `AntigravityMobile/docker-compose.yml` | `"${PUBLIC_HTTP_PORT:-3001}:3000"` → **puerto 3001** |
| Puerto FastAPI interno | `8000` (solo interno, no accesible desde tablet) |

**Efecto**: Hub module intenta conectarse a `ws://192.168.100.6:3004/ws/chat` pero el backend escucha en `:3001`. La conexión WebSocket fallará con "Desconectado".

**Solución**: En AngelOS, navegar a ⚙ Settings → Hub: **cambiar 3004 → 3001** → Guardar. Sin tocar código. Sin reinstalar APK.

---

### 🟡 INCOMPATIBILIDAD #2 — Docker label filter (MEDIA SEVERIDAD)

El backend hub filtra contenedores:
```python
# config.py:
docker_allowed_label: str = "com.antigravity.manage=true"

# servers.py:
containers = client.containers.list(all=all, filters={"label": settings.docker_allowed_label})
```

Solo contenedores con `com.antigravity.manage: "true"` en su `docker-compose.yml` son visibles.

**Efecto**: El panel Docker del Hub muestra únicamente los contenedores de los proyectos Antigravity. Otros contenedores del servidor (externos al ecosistema) no aparecen.

**Esto es comportamiento esperado e intencionado**, no un bug.

---

### 🟡 INCOMPATIBILIDAD #3 — CORS si APP_BASE_URL está configurado (MEDIA SEVERIDAD)

```python
# main.py líneas 18-22:
_cors_origins = [settings.app_base_url] if settings.app_base_url else []
if not _cors_origins or "localhost" in settings.app_base_url:
    _cors_origins = ["*"]
```

| Escenario | `app_base_url` en `.env` | CORS | AngelOS |
|-----------|--------------------------|------|---------|
| Default (no configurado) | `"http://localhost"` | `["*"]` | ✅ Sin problema |
| Producción configurado | `"http://192.168.100.X:3001"` | Solo esa IP | ⚠️ Podría bloquear AngelOS |

**Solución si falla**: agregar IP de AngelOS nginx a `APP_BASE_URL` del `.env` del hub o usar `CORS_ORIGINS=*`.

---

### 🟡 INCOMPATIBILIDAD #4 — `.mod-header` sin flex CSS (BAJA SEVERIDAD)

**El HTML de Hub (y de Daniel) usa**:
```html
<div class="mod-header">
  <span class="mod-title">⬡ Hub IA</span>
  <span id="hub-conn" class="badge">Desconectado</span>
</div>
```

**main.css no define `.mod-header`**. Resultado:
- El div es un bloque normal
- `.mod-title` ocupa toda la línea (span con display:inline)
- Badge aparece en la **misma línea que el título** (inline, no apilado)
- Visualmente similar a lo diseñado en los mockups, pero sin alineación derecha del badge

**Efecto**: Cosmético leve. El badge aparece inmediatamente después del título, no alineado a la derecha. Todos los módulos que usan `.mod-header` tienen el mismo comportamiento.

**No es un bug del Hub** — es consistente con Daniel y otros.

---

### ✅ NO ES INCOMPATIBILIDAD — init/destroy/render no definidos

El sistema AngelOS usa `onActivate` / `onDeactivate`, no `init`/`destroy`/`render`. Hub implementa el contrato correcto del router. ✅

---

### ✅ NO ES INCOMPATIBILIDAD — Proveedores parciales

Backend soporta: `claude, groq, cerebras, gemini, codex, openrouter, sambanova`  
Hub module expone: `claude, gemini, groq, cerebras, openrouter`

`codex` y `sambanova` están en el backend pero no en la UI. El backend acepta cualquier proveedor del backend si se envía — solo no hay botón para ellos. No es un error.

---

## VEREDICTO FINAL

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   🟡  FUNCIONAL CON RIESGOS                                        │
│                                                                     │
│   El módulo está correctamente implementado.                       │
│   El código es compatible con el backend real.                     │
│   Hay 1 acción obligatoria antes de usar:                          │
│                                                                     │
│   → Cambiar hub port de 3004 → 3001 en AngelOS Settings           │
│     (sin tocar código, sin reinstalar APK)                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Tabla de compatibilidad final

| Verificación | Estado | Severidad |
|-------------|--------|-----------|
| `window.AngelOS.register()` correcto | ✅ | — |
| `onActivate / onDeactivate` correctos | ✅ | — |
| WebSocket `/ws/chat` existe en backend | ✅ | — |
| Protocolo WS (provider+messages) coincide | ✅ | — |
| Chunks recibidos como `{"type":"chunk","text":...}` | ✅ | — |
| Fin de stream como `{"type":"end"}` | ✅ | — |
| `/servers/` existe y respuesta compatible | ✅ | — |
| `/servers/{id}/start\|stop\|restart` existen | ✅ | — |
| `/health` existe | ✅ | — |
| Sin IPs hardcodeadas | ✅ | — |
| Sin puertos hardcodeados | ✅ | — |
| Sin tokens hardcodeados | ✅ | — |
| AG-CORE-001: 0 empty catches | ✅ | — |
| STT capture/restore en activate/deactivate | ✅ | — |
| **Puerto 3004 ≠ 3001 (producción)** | ⚠️ | **Alta — acción requerida** |
| Docker label filter (solo contenedores managed) | ⚠️ | Media — comportamiento esperado |
| CORS si APP_BASE_URL configurado | ⚠️ | Media — verificar en `.env` |
| `.mod-header` sin flex CSS | ⚠️ | Baja — cosmético |

### Acción requerida única

```
AngelOS → ⚙ Configuración → Hub: [3004] → [3001] → 💾 Guardar → 🔍 Probar
```
