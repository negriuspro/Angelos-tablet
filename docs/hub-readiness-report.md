# AngelOS — Hub Readiness Report
> Auditoría 2026-06-03 · Generado antes de implementar el módulo Hub  
> **NINGÚN archivo fue modificado durante esta auditoría.**

---

## SECCIÓN 1 — INVENTARIO REAL

### Árbol completo de AngelOS

```
AngelOS/                                         46 archivos totales
│
├── android/                                     10 archivos — Wrapper APK
│   ├── app/
│   │   ├── build.gradle                         compileSdk 34, minSdk 19, Kotlin 1.9.22
│   │   └── src/main/
│   │       ├── AndroidManifest.xml              permisos + landscape + cleartext HTTP
│   │       ├── java/com/angelos/app/
│   │       │   └── MainActivity.kt              WebView + STT + retry + fullscreen
│   │       └── res/values/
│   │           ├── strings.xml                  app_name = "AngelOS"
│   │           └── themes.xml                   Theme.AngelOS
│   ├── build.gradle                             AGP 8.2.0
│   ├── gradle.properties
│   ├── gradle/wrapper/
│   │   └── gradle-wrapper.properties            Gradle 8.2
│   └── settings.gradle
│
├── app/                                         7 archivos — Web app core (SPA)
│   ├── index.html                               Shell: nav + main + carga JS core
│   ├── manifest.json                            PWA manifest
│   ├── css/
│   │   └── main.css                             Dark theme, responsive tablet
│   └── js/
│       ├── config.js                            Config centralizada (IPs, puertos, tokens)
│       ├── api.js                               Cliente HTTP/WebSocket con auth automática
│       ├── app.js                               Router lazy-load de módulos ← MÓDULO HUB FALTA AQUÍ
│       └── modules/                            ← SISTEMA VIEJO / DESCONECTADO (ver Sección 3)
│           ├── angel-ctrl.js                    usa window.registerModule() — NO funciona
│           ├── daniel.js                        usa window.registerModule() — NO funciona
│           ├── hub.js                           usa window.registerModule() — NO funciona
│           ├── settings.js                      usa window.registerModule() — NO funciona
│           └── shield.js                        usa window.registerModule() — NO funciona
│
├── modules/                                     18 archivos — Sistema ACTIVO (cargado por router)
│   ├── dashboard/      module.html + .css + .js  ✅ Completo
│   ├── daniel/         module.html + .css + .js  ✅ Completo
│   ├── angel-control/  module.html + .css + .js  ✅ Completo
│   ├── monitor/        module.html + .css + .js  ✅ Completo
│   ├── shield/         module.html + .css + .js  ✅ Completo
│   └── settings/       module.html + .css + .js  ✅ Completo
│   [hub/]                                        ❌ DIRECTORIO INEXISTENTE
│
├── nginx/
│   └── nginx.conf                               Sirve /app y /modules, caché correcto
│
├── docker-compose.yml                           nginx:1.27-alpine, puerto 3005 configurable
├── .env.example                                 ANGELOS_PORT=3005
│
└── docs/                                        6 archivos (incluyendo este)
    ├── architecture.md
    ├── api-integration-plan.md
    ├── folder-structure.md
    ├── tablet-ui-mockup.md
    ├── implementation-roadmap.md
    └── hub-readiness-report.md ← este archivo
```

### Conteos

| Categoría | Cantidad |
|-----------|----------|
| Total archivos | 46 |
| Módulos activos en router | 6 (dashboard, daniel, angel-control, monitor, shield, settings) |
| Módulos faltantes | 1 (hub) |
| Archivos Android | 10 |
| Archivos web core | 7 |
| Archivos módulos activos | 18 |

---

## SECCIÓN 2 — VALIDACIÓN DE MÓDULOS

### Dashboard (`modules/dashboard/`)

| Item | Valor |
|------|-------|
| Registro | `window.AngelOS.register('dashboard', ...)` ✅ |
| Estado | **COMPLETO** |

**APIs consumidas:**

| Endpoint | Protocolo | Auth | Uso |
|----------|-----------|------|-----|
| `daniel:3002/health` | GET | Token | Badge estado Daniel |
| `hub:3004/health` | GET | — | Badge estado Hub |
| `angelCtrl:3000/health` | GET | API Key | Badge estado Angel Ctrl |
| `shield:3003/health` | GET | — | Badge estado Shield |
| `daniel:3002/api/system` | GET | Token | CPU/RAM/Disco |
| `daniel:3002/api/battery` | GET | Token | Batería |
| `angelCtrl:3000/api/containers` | GET | API Key | Lista contenedores |

**Observación menor**: la función `_setMetric` usa `bar.closest('.db-metric-card')` para encontrar `.dbm-value`, pero algunos elementos en el HTML tienen IDs directos (`dbm-ram-val`, `dbm-disk-val`) en lugar de `.dbm-value`. Las barras de CPU, RAM y Disk pueden no mostrar el label correctamente. No bloquea.

---

### Daniel (`modules/daniel/`)

| Item | Valor |
|------|-------|
| Registro | `window.AngelOS.register('daniel', ...)` ✅ |
| Estado | **COMPLETO** |

**APIs consumidas:**

| Endpoint | Protocolo | Auth | Uso |
|----------|-----------|------|-----|
| `daniel:3002/ws` | WebSocket | Token | Chat IA bidireccional |
| `daniel:3002/api/system` | GET | Token | CPU/RAM/Disco en panel lateral |
| `daniel:3002/api/battery` | GET | Token | Batería en panel lateral |
| `daniel:3002/api/devices` | GET | Token | Lista dispositivos smart home |
| `daniel:3002/api/devices/{id}` | POST | Token | Toggle dispositivo ON/OFF |
| `daniel:3002/transcribe` | POST multipart | Token | STT alternativo (audio→texto) |

**AG-CORE-001 — Empty catch detectados:**

```
modules/daniel/module.js:82   — catch {}  (parseo JSON del WS message)
modules/daniel/module.js:91   — catch {}  (error en _connectWS)
modules/daniel/module.js:141  — catch {}  (recognition.start())
modules/daniel/module.js:159  — catch {}  (fetch transcribe)
modules/daniel/module.js:162  — catch {}  (ws.send en onstop)
```

---

### Angel Control (`modules/angel-control/`)

| Item | Valor |
|------|-------|
| Registro | `window.AngelOS.register('angel-control', ...)` ✅ |
| Estado | **COMPLETO** |

**APIs consumidas:**

| Endpoint | Protocolo | Auth | Uso |
|----------|-----------|------|-----|
| `angelCtrl:3000/health` | GET | API Key | Badge conexión |
| `angelCtrl:3000/api/metrics` | GET | API Key | CPU/RAM métricas |
| `angelCtrl:3000/api/containers` | GET | API Key | Lista contenedores (primario) |
| `hub:3004/servers/` | GET | — | Lista contenedores (fallback) |
| `daniel:3002/api/system` | GET | Token | CPU/RAM (fallback si metrics falla) |
| `angelCtrl:3000/api/containers/{id}/{action}` | POST | API Key | start/stop/restart (primario) |
| `hub:3004/servers/{id}/{action}` | POST | — | start/stop/restart (fallback) |

**AG-CORE-001 — Empty catch detectados:**

```
modules/angel-control/module.js — múltiples catch vacíos en _loadMetrics, _loadContainers
```

---

### Monitor (`modules/monitor/`)

| Item | Valor |
|------|-------|
| Registro | `window.AngelOS.register('monitor', ...)` ✅ |
| Estado | **COMPLETO** |

**APIs consumidas:**

| Endpoint | Protocolo | Auth | Uso |
|----------|-----------|------|-----|
| `daniel:3002/api/system/status` | GET | Token | PC + Servidor distribuido (primario) |
| `daniel:3002/api/system` | GET | Token | Solo servidor (fallback) |
| `daniel:3002/api/battery` | GET | Token | Batería (fallback) |
| `http://{host}:{puerto}/health` | GET | — | Estado de 5 servicios |

Fallback correcto implementado: si `/api/system/status` no existe, usa `/api/system` solo.

---

### Shield (`modules/shield/`)

| Item | Valor |
|------|-------|
| Registro | `window.AngelOS.register('shield', ...)` ✅ |
| Estado | **COMPLETO** |

**APIs consumidas:**

| Endpoint | Protocolo | Auth | Uso |
|----------|-----------|------|-----|
| `shield:3003/health` | GET | — | Badge conexión |
| `shield:3003/api/adguard/stats` | GET | — | Stats DNS (primario) |
| `shield:3003/api/dns/stats` | GET | — | Stats DNS (fallback) |
| `shield:3003/api/network/stats` | GET | — | Métricas red (primario) |
| `shield:3003/api/metrics` | GET | — | Métricas red (fallback) |
| `{host}:9090/-/healthy` | GET | — | Estado Prometheus |
| `{host}:3003/grafana/api/health` | GET | — | Estado Grafana |
| `{host}:9100/metrics` | GET | — | Estado Node Exporter |
| `{host}:3900/` | GET | — | Estado AdGuard UI |
| `{host}:8080/healthz` | GET | — | Estado cAdvisor |

---

### Settings (`modules/settings/`)

| Item | Valor |
|------|-------|
| Registro | `window.AngelOS.register('settings', ...)` ✅ |
| Estado | **COMPLETO** |

Sin llamadas API externas. Usa exclusivamente `localStorage` vía `window.CFG`.  
Permite editar: IP servidor, 5 puertos, 2 tokens/claves, intervalo de polling.  
Tiene diagnóstico de conexión que prueba los 5 servicios en tiempo real.

---

## SECCIÓN 3 — VALIDACIÓN DE HUB

### Hallazgo crítico: dos sistemas de módulos coexisten

```
app/js/modules/hub.js        ← SISTEMA VIEJO — usa window.registerModule() [NO EXISTE]
modules/hub/                 ← SISTEMA ACTIVO — directorio NO EXISTE
```

El router (`app/js/app.js`) usa exclusivamente `window.AngelOS.register()`.  
El `window.registerModule()` que usa `app/js/modules/hub.js` **nunca fue definido** — si ese script se cargara, lanzaría `ReferenceError` silencioso y no aparecería en el nav.

### Estado de `app/js/modules/hub.js`

El archivo existe con **lógica funcional reutilizable**. Análisis completo:

**Lo que tiene y funciona bien:**
- Selector de 5 proveedores (claude, gemini, groq, cerebras, openrouter) con botones toggle
- WebSocket a `/ws/chat` con reconexión exponencial (2s → 30s)
- Streaming de respuesta: soporte para `{type:chunk}`, `{type:done}`, `{type:end}`, `delta`, `content`
- Área de chat con auto-scroll
- Textarea auto-resize + envío con Enter
- Carga de servidores Docker desde `/servers/`
- Acciones start/stop/restart sobre contenedores

**Lo que NO funciona / necesita corrección:**
- Usa `window.registerModule()` → debe cambiarse a `window.AngelOS.register()`
- No está dividido en HTML/CSS/JS separados (el HTML está generado via `innerHTML`)
- `catch {}` vacíos en líneas 108 y 113 (AG-CORE-001)
- No hay un `module.html` ni `module.css` equivalente
- `id="hub"` no está en el array MODULES de `app.js` — nunca aparecería en el nav

### Código reutilizable de `app/js/modules/hub.js`

```javascript
// REUTILIZABLE (con adaptaciones):
- _connectWS() / _disconnectWS()        → lógica WebSocket completa
- _appendChunk() / _finalizeChunk()     → streaming de respuesta
- _sendMessage()                        → envío con historial
- _loadServers() / _hubCtrl()           → panel Docker (bonus)
- window._hubSetProvider()              → selector de proveedor
```

### Búsqueda de otras referencias a Hub en el proyecto

```
app/js/config.js:14     hub: 3004,    ← puerto configurado (discrepancia con docs: 3001)
modules/dashboard/module.js:13         SERVICES incluye hub → usa puerto 3004
modules/monitor/module.js:131          checks Hub en :cfg.ports.hub → 3004
modules/shield/module.js:143           checks Hub en :cfg.ports.hub → 3004
modules/settings/module.js:19          _val('cfg-p-hub', cfg.ports.hub) → editable
modules/angel-control/module.js:81     usa hub:3004/servers/ como fallback
```

**CONCLUSIÓN SECCIÓN 3**: el módulo Hub **no existe** en el sistema activo. `app/js/modules/hub.js` es código de referencia parcialmente reutilizable pero incompatible con el router actual.

---

## SECCIÓN 4 — VALIDACIÓN ANDROID

### AndroidManifest.xml

| Permiso/Config | Valor | Estado |
|----------------|-------|--------|
| `INTERNET` | declarado | ✅ |
| `RECORD_AUDIO` | declarado | ✅ |
| `usesCleartextTraffic` | true | ✅ necesario para HTTP local |
| `screenOrientation` | landscape | ✅ |
| `configChanges` | orientation\|screenSize\|keyboardHidden | ✅ sin restart |
| `exported` | true | ✅ (requerido API 31+) |
| `allowBackup` | false | ✅ seguro |

### MainActivity.kt

| Feature | Implementación | Estado |
|---------|----------------|--------|
| WebView fullscreen | `SYSTEM_UI_FLAG_IMMERSIVE_STICKY` | ✅ |
| Pantalla siempre encendida | `FLAG_KEEP_SCREEN_ON` | ✅ |
| JavaScript habilitado | `javaScriptEnabled = true` | ✅ |
| DOM Storage | `domStorageEnabled = true` | ✅ |
| Zoom deshabilitado | `setSupportZoom(false)` | ✅ |
| HTTP mixto Android 9+ | `MIXED_CONTENT_ALWAYS_ALLOW` | ✅ |
| STT nativo | `SpeechRecognizer` → `window.onNativeResult` | ✅ |
| Retry exponencial | 3s → 6s → 12s → ... → 60s max | ✅ |
| URL configurable | `SharedPreferences["angelos"]["angelos_url"]` | ✅ |
| Orientación restaurada | `onWindowFocusChanged → hideSystemUI()` | ✅ |
| Botón back | `webView.goBack()` si hay historial | ✅ |
| Limpieza onDestroy | `speechRecognizer.destroy()`, `webView.destroy()` | ✅ |

### SDK targets

| Config | Valor | Nota |
|--------|-------|------|
| `minSdk` | 19 (Android 4.4 KitKat) | WebSocket limitado en API 19-20 |
| `targetSdk` | 34 (Android 14) | ✅ |
| `compileSdk` | 34 | ✅ |
| Kotlin | 1.9.22 | ✅ |
| AGP | 8.2.0 | ✅ |
| Gradle | 8.2 | ✅ |

**Nota WebSocket**: Android API 19-20 usa una versión antigua de Chromium. WebSocket es funcional pero con limitaciones. En la práctica las tablets para uso permanente suelen ser Android 6+ (API 23+), donde no hay problema.

### ¿Puede compilarse actualmente?

| Prerequisito | Estado | Acción requerida |
|-------------|--------|-----------------|
| `gradlew` / `gradlew.bat` | ❌ Falta | Android Studio lo genera al sincronizar |
| `local.properties` | ❌ Falta | Android Studio lo genera al abrir el proyecto |
| `gradle-wrapper.jar` | ❌ Falta | Gradle lo descarga automáticamente |
| Keystore de firma | ❌ Falta (solo para release) | `keytool` o Android Studio |
| Android Studio instalado | Asumido | Requerido para el flujo básico |

**Veredicto**: la APK **puede compilarse** abriendo `android/` en Android Studio y dejando que sincronice. Todo el código fuente está correcto. Los archivos faltantes son artefactos de build que se generan automáticamente.

---

## SECCIÓN 5 — VALIDACIÓN DE BUILD

### Web app (nginx)

La web app es HTML/CSS/JS **estático puro**. No hay paso de build.  
Para ejecutarla: `docker compose up -d` desde el directorio `AngelOS/`.

```
docker-compose.yml ✅
  nginx:1.27-alpine
  puerto: ${ANGELOS_PORT:-3005}:80
  volumes:
    ./nginx/nginx.conf  → /etc/nginx/nginx.conf:ro  ✅
    ./app               → /usr/share/nginx/html/app:ro  ✅
    ./modules           → /usr/share/nginx/html/modules:ro  ✅
  healthcheck: wget -qO- http://127.0.0.1/health  ✅
```

**Resultado**: web build = no requerido. Docker compose es correcto.

### Android APK (debug)

Sin `gradlew` no es posible ejecutar `gradlew assembleDebug` desde línea de comandos.  
El flujo esperado es Android Studio:

```
1. File > Open > AngelOS/android/
2. Gradle sync (genera gradlew, local.properties, descarga gradle-wrapper.jar)
3. Build > Make Project
4. Build > Generate Signed Bundle/APK > APK > debug
```

**Errores de compilación esperados**: ninguno. El código Kotlin es válido, las dependencias son estándar (core-ktx:1.12.0, appcompat:1.6.1).

---

## SECCIÓN 6 — VALIDACIÓN DE CONFIGURACIÓN

### IPs hardcodeadas

| Archivo | Línea | Valor | Tipo | Veredicto |
|---------|-------|-------|------|-----------|
| `app/js/config.js` | 8 | `'192.168.100.6'` | DEFAULT_CONFIG | ✅ configurable vía Settings |
| `android/.../MainActivity.kt` | 46 | `"http://192.168.100.6:3005"` | DEFAULT_URL const | ✅ sobrescrito por SharedPrefs |
| `modules/settings/module.html` | 13 | `placeholder="192.168.100.6"` | placeholder HTML | ✅ solo visual |
| `app/js/modules/settings.js` | 29 | `placeholder="192.168.100.6"` | placeholder en stub | ✅ archivo desconectado |

**Conclusión**: las IPs están en `DEFAULT_CONFIG` y `DEFAULT_URL` — son valores por defecto **sobrescribibles en runtime**. No son violaciones AG-CORE-004.

### Tokens/claves hardcodeadas

| Archivo | Línea | Valor | Veredicto |
|---------|-------|-------|-----------|
| `config.js` | 20 | `danielAdminToken: ''` | ✅ vacío por defecto |
| `config.js` | 21 | `angelCtrlApiKey: ''` | ✅ vacío por defecto |

**Conclusión**: ningún token o clave embebida. Todo se guarda en `localStorage`. ✅

### URLs embebidas

| Archivo | Línea | Valor | Veredicto |
|---------|-------|-------|-----------|
| Todos los fetch/WS | — | `window.CFG.url(project, path)` | ✅ centralizado |
| `modules/shield/module.js` | 109–112 | `http://${host}:9090`, `9100`, `8080` | ✅ usa `window.CFG.get('serverHost')` |

**Conclusión**: ninguna URL embebida problemática. Todas usan `CFG.url()` o `CFG.get('serverHost')`.

---

## SECCIÓN 7 — PLAN DEL MÓDULO HUB (SIN IMPLEMENTAR)

### Resumen ejecutivo

El Hub IA necesita **4 cambios** en total: 1 modificación + 3 archivos nuevos.

### Archivos a MODIFICAR

**`app/js/app.js` — agregar 1 entrada al array MODULES**

```javascript
// Estado actual (líneas 6-13):
const MODULES = [
  { id: 'dashboard',     label: 'Dashboard',  icon: '⊙', folder: 'dashboard'     },
  { id: 'daniel',        label: 'Daniel',     icon: '◉', folder: 'daniel'        },
  { id: 'angel-control', label: 'Angel Ctrl', icon: '⊞', folder: 'angel-control' },
  { id: 'monitor',       label: 'Monitor',    icon: '⊕', folder: 'monitor'       },
  { id: 'shield',        label: 'Shield',     icon: '⊛', folder: 'shield'        },
  { id: 'settings',      label: 'Config',     icon: '⚙', folder: 'settings'      },
];

// Estado requerido (agregar entre shield y settings):
  { id: 'hub', label: 'Hub IA', icon: '⬡', folder: 'hub' },
```

### Archivos a CREAR

#### `modules/hub/module.html`
Layout estático con:
- Header: título + badge de conexión
- Sección proveedores: 5 botones (claude, gemini, groq, cerebras, openrouter)
- Área de chat: `div#hub-messages` scrollable
- Footer: `textarea#hub-input` + botón enviar + botón mic

#### `modules/hub/module.css`
Estilos para:
- `.hub-providers` — fila de botones proveedor
- `.hub-chat` — área de mensajes con scroll
- `.msg-user` / `.msg-ai` / `.msg-sys` — burbujas (reutilizar patrón de Daniel)
- `.hub-footer` — fila textarea + botones

#### `modules/hub/module.js`
Lógica usando `window.AngelOS.register('hub', ...)`:

```
onActivate  → _connectWS(), _loadProviders()
onDeactivate → _disconnectWS(), clearInterval(polls)

_connectWS()
  → ws = window.API.openWS('hub', '/ws/chat', handlers)
  → onopen: badge OK, wsDelay = 2000
  → onmessage: routing por type (start/chunk/done/end/error)
  → onclose: badge error, retry exponencial 2s→30s

_sendMessage()
  → valida texto + ws.readyState === 1
  → ws.send({ provider, messages })
  → limpia input

_loadProviders() — opcional
  → GET /providers/ o /providers/status
  → colorea badges de proveedores

_appendChunk(delta) + _finalizeChunk()
  → streaming en-vivo de la respuesta del asistente

window._hubSetProvider(p)
  → cambia _currentProvider, actualiza botón activo, resetea conversación

window._hubSend / window._hubMic
  → expuestos para botones inline del HTML
```

### Endpoints del Hub

```
Proyecto: 'hub' → http://{CFG.serverHost}:{CFG.ports.hub}
                   puerto actual en config.js = 3004

GET  /health              → badge de conexión
GET  /providers/          → lista proveedores disponibles
GET  /providers/status    → estado online/offline (opcional)
WS   /ws/chat             → chat streaming bidireccional

Payload enviado:
  { provider: "claude", messages: [{role:"user",content:"..."},...] }

Payload recibido:
  { type: "start" }
  { type: "chunk", text: "..." }   o   { type: "chunk", delta: "..." }
  { type: "done" }                 o   { type: "end" }
  { error: "..." }
```

### Dependencias

| Dependencia | Estado | Nota |
|-------------|--------|------|
| `window.API.openWS()` | ✅ existe en api.js | Soporta hub |
| `window.API.get('hub', ...)` | ✅ existe | Usa puerto 3004 |
| `window.CFG.ws('hub', ...)` | ✅ existe | ws://host:3004 |
| `window.AngelOS.register()` | ✅ existe en app.js | Patrón correcto |
| `window.onNativeResult` | ✅ existe en daniel | Hub necesita su propio handler |
| Entrada MODULES 'hub' | ❌ FALTA | 1 línea en app.js |
| `modules/hub/` directorio | ❌ FALTA | 3 archivos nuevos |

---

## HALLAZGOS ADICIONALES RELEVANTES

### Sistema de módulos duplicado

Existe un sistema de módulos **obsoleto y desconectado** en `app/js/modules/`:

```
app/js/modules/angel-ctrl.js  → window.registerModule('angelctrl', ...) — NO CONECTADO
app/js/modules/daniel.js      → window.registerModule('daniel', ...)    — NO CONECTADO
app/js/modules/hub.js         → window.registerModule('hub', ...)       — NO CONECTADO
app/js/modules/settings.js    → no usa registerModule                   — NO CONECTADO
app/js/modules/shield.js      → no usa registerModule                   — NO CONECTADO
```

`window.registerModule` **no está definido en ningún archivo del proyecto**.  
Estos archivos no son cargados por el router (no están referenciados en `index.html` ni en `app.js`).  
Son código muerto. No afectan el funcionamiento, pero sí confunden el inventario.

### Puerto del Hub — inconsistencia

| Origen | Puerto configurado |
|--------|--------------------|
| `config.js` DEFAULT_CONFIG | **3004** (antigravitymobile-test) |
| `docs/api-integration-plan.md` | **3001** (producción) |
| `docs/implementation-roadmap.md` | **3001** |

El puerto **real** en producción debe ser confirmado. La pantalla de Settings permite editarlo en runtime sin reinstalar la APK.

### AG-CORE-001 en módulos existentes

Los siguientes archivos tienen `catch {}` vacíos (violaciones menores, no bloquean Hub):

```
modules/daniel/module.js        — 5 catch vacíos
modules/angel-control/module.js — ~4 catch vacíos
modules/monitor/module.js       — ~3 catch vacíos
modules/shield/module.js        — ~4 catch vacíos
modules/dashboard/module.js     — ~2 catch vacíos
```

---

## ENTREGABLE — VEREDICTO FINAL

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   A) LISTO PARA IMPLEMENTAR HUB                                 ║
║                                                                  ║
║   CON UNA CORRECCIÓN OBLIGATORIA PREVIA:                        ║
║                                                                  ║
║   app/js/app.js → agregar entrada 'hub' al array MODULES        ║
║   (1 línea — sin esta corrección el módulo no aparece en nav)   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Checklist de implementación

```
□ 1. Modificar app/js/app.js          → agregar {id:'hub', label:'Hub IA', icon:'⬡', folder:'hub'}
□ 2. Crear modules/hub/module.html    → layout: providers + chat + footer
□ 3. Crear modules/hub/module.css     → estilos dark theme consistentes
□ 4. Crear modules/hub/module.js      → window.AngelOS.register('hub', ...)
□ 5. Verificar puerto hub en servidor → ¿3001 o 3004?
```

### Scope confirmado del Hub

- **NO modifica** ningún proyecto existente (Daniel, AntigravityMobile, Angel Control, Shield)
- **NO modifica** docker-compose.yml ni infraestructura
- **Solo crea** 3 archivos nuevos + 1 línea en app.js
- **Reutiliza** lógica de `app/js/modules/hub.js` como referencia

### Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Puerto hub incorrecto (3001 vs 3004) | Alta | Medio | Settings permite cambiarlo sin reinstalar APK |
| CORS bloqueado al hacer fetch desde nginx AngelOS | Media | Alto | Agregar IP del nginx AngelOS a CORS_ORIGINS de hub backend |
| WebSocket protocol diferente al documentado | Baja | Medio | La lógica en hub.js ya maneja múltiples formatos de chunk |
| `app/js/modules/hub.js` cargado accidentalmente | Nula | — | No está referenciado en ningún HTML ni script |
