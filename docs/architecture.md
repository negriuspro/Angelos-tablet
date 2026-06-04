# AngelOS — Arquitectura
> Versión 2.0 · Auditoría 2026-06-03  
> Estado: **80% implementado** — falta módulo Hub + build APK

---

## Decisión Tecnológica: HTML + WebView APK ✅ (ya implementado)

### Comparativa realizada

| Criterio | Flutter APK | HTML + WebView APK | Decisión |
|----------|-------------|-------------------|----------|
| RAM consumida | ~50-100 MB runtime | ~80-120 MB (Chromium) | Empate |
| Tamaño APK | 15-20 MB | 2-5 MB | **WebView** ✓ |
| Android antiguo (API 19+) | Requiere Flutter 3.x | Native KitKat+ | **WebView** ✓ |
| Reutiliza código web existente | No | Sí — nginx ya sirve el HTML | **WebView** ✓ |
| Actualizar sin reinstalar | No | Sí — cambias JS en servidor | **WebView** ✓ |
| WebSocket soporte | Excelente | Bueno (API 23+) | Flutter leve ✓ |
| STT nativo Android | Sí | Via bridge Kotlin→JS | Empate |
| Mantenimiento | Dart/Flutter | JS puro (ya conocido) | **WebView** ✓ |

**Ganador: HTML + WebView APK**  
Razón principal: el contenido web ya existe y es servido por nginx en Docker. La tablet solo carga `http://IP:3005`. Actualizar la interfaz no requiere recompilar ni reinstalar la APK.

---

## Arquitectura General

```
┌──────────────────────────────────────────────────────────────┐
│                    TABLET ANDROID                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           MainActivity.kt (Kotlin)                   │    │
│  │  - WebView fullscreen                               │    │
│  │  - STT nativo (SpeechRecognizer API)                │    │
│  │  - window.ANDROID_NATIVE = true                     │    │
│  │  - window.onNativeResult(text, isFinal)             │    │
│  │  - Retry exponencial (3s → 60s)                     │    │
│  │  - FLAG_KEEP_SCREEN_ON                              │    │
│  └───────────────────┬─────────────────────────────────┘    │
│                      │ carga URL configurable                │
│                      │ default: http://192.168.100.6:3005    │
└──────────────────────┼───────────────────────────────────────┘
                       │ WiFi LAN / Tailscale
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              SERVIDOR UBUNTU (Docker)                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AngelOS :3005 — nginx estático                      │   │
│  │  Sirve: app/ y modules/                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────┐  ┌──────────────┐  ┌────────────┐  ┌────────┐   │
│  │Daniel │  │AntigravityHub│  │Angel Ctrl  │  │Shield  │   │
│  │:3002  │  │:3001 (hub)   │  │:3000       │  │:443    │   │
│  └───────┘  └──────────────┘  └────────────┘  └────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## Flujo de Datos

```
Tablet WebView
    │
    ├─ Carga index.html desde AngelOS nginx
    │
    ├─ config.js   → lee localStorage para IPs/puertos
    ├─ api.js      → cliente HTTP/WebSocket centralizado
    ├─ app.js      → router de módulos (lazy load)
    │
    └─ Al navegar a módulo:
        ├─ Carga /modules/{nombre}/module.html  (HTML del módulo)
        ├─ Carga /modules/{nombre}/module.css   (estilos)
        └─ Carga /modules/{nombre}/module.js    (lógica)
            │
            ├─ fetch() a Daniel      http://{host}:3002/api/*
            ├─ WebSocket a Daniel    ws://{host}:3002/ws
            ├─ fetch() a Hub         http://{host}:3001/api/*
            ├─ WebSocket a Hub       ws://{host}:3001/ws/*
            ├─ fetch() a AngelCtrl   http://{host}:3000/api/*  (X-Api-Key header)
            └─ fetch() a Shield      http://{host}:3003/api/*
```

---

## Módulos Implementados

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| Dashboard | ✅ Completo | Servicios online, métricas, contenedores, reloj |
| Daniel | ✅ Completo | Chat WS, STT, métricas, smart home, dispositivos |
| Angel Control | ✅ Completo | Contenedores Docker, filtros, acciones, métricas |
| Monitor | ✅ Completo | PC + Ubuntu: CPU/RAM/disco, uptime, servicios |
| Shield | ✅ Completo | DNS AdGuard, métricas red, monitoring stack |
| Settings | ✅ Completo | IP/puertos, tokens, diagnóstico conexiones |
| **Hub** | ❌ **Faltante** | Chat IA multi-proveedor, estado proveedores |

---

## Configuración (sin IPs hardcodeadas)

### Web (localStorage)
La app guarda en `localStorage['angelos_config']`:
```json
{
  "serverHost": "192.168.100.6",
  "ports": {
    "daniel": 3002,
    "hub": 3001,
    "angelCtrl": 3000,
    "shield": 3003,
    "adguard": 3900
  },
  "danielAdminToken": "",
  "angelCtrlApiKey": "",
  "pollInterval": 10000
}
```

### Android (SharedPreferences)
La APK guarda en `SharedPreferences["angelos"]["angelos_url"]`:
- URL completa de AngelOS: `http://192.168.100.6:3005`
- Editable desde la pantalla de Settings de AngelOS

### Conexión dual
| Modo | Configuración |
|------|---------------|
| LAN WiFi | IP local: `192.168.100.6` |
| Tailscale | IP Tailscale del servidor Ubuntu |
| Ambas | Configurables en Settings sin reinstalar APK |

---

## Seguridad

| Elemento | Solución |
|----------|----------|
| Token Daniel | Header `X-Daniel-Admin-Token` via ApiClient |
| API Key Angel Ctrl | Header `X-Api-Key` via ApiClient |
| HTTP en Android 9+ | `android:usesCleartextTraffic="true"` (red local) |
| Credenciales | localStorage del WebView (no exportables) |
| Timeout de requests | `AbortSignal.timeout(4000)` en todos los fetch |

---

## Limitaciones Conocidas

1. **Sin HTTPS**: la tablet accede por HTTP. Aceptable en red local privada.
2. **WebView y WebSocket**: funcional en Android 5+ (API 21+). El target mínimo es API 19 (KitKat) donde WS puede ser limitado.
3. **Hub module faltante**: sin este módulo no hay acceso a Chat IA multi-proveedor.
4. **Módulos del nginx**: los módulos se cargan desde el servidor. Si el servidor está caído, los módulos no cargan (by design — AngelOS requiere el servidor).
