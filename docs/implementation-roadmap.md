# AngelOS — Roadmap de Implementación
> Estado actual: 2026-06-03  
> La app tiene el 83% del trabajo completo. Solo falta un módulo y el build APK.

---

## Estado Actual por Componente

### Web App (servida por nginx :3005)

| Componente | Estado | Descripción |
|------------|--------|-------------|
| `app/index.html` | ✅ Completo | Shell con nav lateral |
| `app/css/main.css` | ✅ Completo | Dark theme, responsive tablet |
| `app/js/config.js` | ✅ Completo | IPs/puertos/tokens configurables |
| `app/js/api.js` | ✅ Completo | HTTP + WebSocket + auth headers |
| `app/js/app.js` | ✅ Completo | Router lazy-load de módulos |
| `modules/dashboard/` | ✅ Completo | Servicios, métricas, containers, reloj |
| `modules/daniel/` | ✅ Completo | Chat, WS, STT, smart home, métricas |
| `modules/angel-control/` | ✅ Completo | Containers, acciones, filtros |
| `modules/monitor/` | ✅ Completo | PC+Ubuntu stats, servicios, uptime |
| `modules/shield/` | ✅ Completo | DNS, monitoring stack, health |
| `modules/settings/` | ✅ Completo | IP/puertos, tokens, diagnóstico |
| `modules/hub/` | ❌ **Falta** | Chat IA multi-proveedor |

### Android APK Wrapper

| Componente | Estado | Descripción |
|------------|--------|-------------|
| `MainActivity.kt` | ✅ Completo | WebView + STT + retry + fullscreen |
| `AndroidManifest.xml` | ✅ Completo | Permisos, landscape, cleartext |
| `build.gradle` (app) | ✅ Completo | SDK 34, minSdk 19, Kotlin 1.9.22 |
| `build.gradle` (root) | ✅ Completo | AGP 8.2.0 |
| `gradle.properties` | ✅ Completo | |
| `gradle-wrapper.properties` | ✅ Completo | Gradle 8.2 |
| **Keystore de firma** | ❌ **Falta** | Para generar APK release |
| **`local.properties`** | ⚠️ Automático | Android Studio lo genera |
| **`gradle-wrapper.jar`** | ⚠️ Automático | Gradle lo descarga |
| **`gradlew` / `gradlew.bat`** | ⚠️ Falta | Scripts de build CLI |

---

## Fase 1: Módulo Hub (próximo paso — ESPERANDO APROBACIÓN)

**Tiempo estimado:** 2-3 horas  
**Riesgo:** Bajo — sigue el mismo patrón que los otros módulos  
**No toca** ningún proyecto existente

### Archivos a crear

```
modules/hub/
├── module.html    → Layout de la pantalla
├── module.css     → Estilos del módulo
└── module.js      → Lógica: WebSocket + providers + estado
```

### Funcionalidades del módulo Hub

1. **Selector de proveedores** — botones para Claude, Groq, Gemini, Cerebras
2. **Estado de proveedores** — verde/rojo según `/providers/status`
3. **Chat en streaming** — WebSocket `/ws/chat` con formato `start/chunk/end`
4. **STT integrado** — botón mic, usa STT Android nativo si está disponible
5. **Historial en memoria** — se resetea al cambiar de proveedor o navegar

### Dependencias API del Hub

```
GET  http://{host}:3001/providers/        → lista proveedores
GET  http://{host}:3001/providers/status  → estado online/offline
WS   ws://{host}:3001/ws/chat            → chat streaming
     send: {text, provider, model}
     recv: {type:start} {type:chunk,text} {type:end}
```

---

## Fase 2: Build del APK (después de aprobar Fase 1)

**Tiempo estimado:** 30 minutos  
**Requisito:** Android Studio instalado o línea de comandos con SDK

### Opción A: Android Studio (recomendado)

```
1. Abrir Android Studio
2. File > Open > seleccionar AngelOS/android/
3. Esperar que Gradle sincronice
4. Build > Generate Signed Bundle/APK
5. Seleccionar "APK"
6. Crear o usar keystore existente
7. Seleccionar release
8. Instalar en tablet vía adb o transferencia directa
```

### Opción B: Línea de comandos

```powershell
# Desde AngelOS/android/

# Debug APK (para pruebas, sin firma)
.\gradlew assembleDebug
# Resultado: app/build/outputs/apk/debug/app-debug.apk

# Release APK (requiere keystore)
.\gradlew assembleRelease
# Resultado: app/build/outputs/apk/release/app-release.apk
```

### Crear keystore (una sola vez)

```powershell
keytool -genkey -v `
  -keystore android/keystore/angelos-release.jks `
  -alias angelos `
  -keyalg RSA `
  -keysize 2048 `
  -validity 36500 `
  -dname "CN=AngelOS, OU=Antigravity, O=Personal, C=MX"
```

### Instalar en tablet vía ADB

```powershell
# Con tablet conectada por USB (modo depuración activado)
adb install app/build/outputs/apk/debug/app-debug.apk

# O copiar el APK directamente a la tablet y abrirlo
# (requiere "Orígenes desconocidos" activado en Android)
```

---

## Fase 3: Configuración post-instalación (5 minutos)

```
1. Abrir AngelOS en la tablet
2. Navegar a ⚙ Configuración
3. Ingresar IP del servidor Ubuntu (o IP Tailscale)
4. Ingresar token Daniel (si está configurado)
5. Ingresar API Key de Angel Control
6. Presionar "💾 Guardar"
7. Presionar "🔍 Probar conexiones" → verificar que todos estén OK
8. Navegar a ⊙ Dashboard → todo debería aparecer online
```

---

## Cronograma Resumido

```
HOY
 │
 ├── [ESPERANDO APROBACIÓN] → Aprobación del diseño
 │
 ├── Fase 1 (2-3h): Crear modules/hub/
 │       module.html + module.css + module.js
 │
 ├── Fase 2 (30min): Build APK
 │       Android Studio: Generate Signed APK
 │
 └── Fase 3 (5min): Configurar tablet
         Ingresar IP + tokens + verificar
```

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Hub WebSocket protocol distinto | Baja | Medio | Probar desde browser antes de codear |
| CORS bloqueado en fetch cross-origin | Media | Alto | Agregar IP tablet/nginx a CORS_ORIGINS de cada backend |
| `providers/status` endpoint no existe | Media | Bajo | Módulo funciona sin él (solo desactiva badges) |
| Tablet API 19 con WS limitado | Baja | Alto | Target real probablemente Android 6+ (API 23+) |
| Gradle versión incompatible | Baja | Bajo | El gradle-wrapper.properties ya fija versión 8.2 |

---

## CORS — Acción Requerida Antes de Usar la Tablet

Los backends necesitan aceptar requests desde la IP/puerto de la tablet (o desde la IP de nginx AngelOS).

**En cada proyecto que requiere CORS:**

```bash
# En .env de cada proyecto, agregar la IP del nginx AngelOS
CORS_ORIGINS=http://192.168.100.6:3005,http://192.168.100.X:PORT

# Reiniciar el backend después de cambiar .env
docker compose up -d backend
```

**Proyectos que necesitan actualización CORS:**
- `daniel` → `DANIEL_CORS_ORIGINS` o equivalente
- `interfazdocker` → `CORS_ORIGINS`
- `AntigravityMobile` → nginx ya permite todo (no necesita cambio)
- `Shield` → `CORS_ORIGINS`

> **IMPORTANTE:** No modificar docker-compose.yml ni nada del servidor. Solo actualizar el `.env` de cada proyecto con la IP correcta.

---

## Decisión Pendiente de Aprobación

Antes de comenzar la Fase 1 se necesita aprobación del diseño documentado en:
- `docs/architecture.md`
- `docs/api-integration-plan.md`
- `docs/folder-structure.md`
- `docs/tablet-ui-mockup.md`
- `docs/implementation-roadmap.md` (este archivo)

**¿Se aprueba proceder con la Fase 1 (módulo Hub)?**
