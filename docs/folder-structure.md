# AngelOS — Estructura de Carpetas
> Estado: auditoría 2026-06-03  
> ✅ = existe · ❌ = falta · ⚠️ = incompleto

---

## Estructura Actual

```
AngelOS/
│
├── android/                          ✅ Wrapper APK Android
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/angelos/app/
│   │   │   │   └── MainActivity.kt   ✅ WebView + STT + retry
│   │   │   ├── AndroidManifest.xml   ✅ permisos, landscape, HTTP cleartext
│   │   │   └── res/
│   │   │       ├── values/
│   │   │       │   ├── strings.xml   ✅ app_name = "AngelOS"
│   │   │       │   └── themes.xml    ✅ Theme.AngelOS
│   │   └── build.gradle              ✅ SDK 34, minSdk 19, Kotlin 1.9.22
│   ├── build.gradle                  ✅ AGP 8.2.0
│   ├── settings.gradle               ✅
│   ├── gradle.properties             ✅
│   └── gradle/wrapper/
│       └── gradle-wrapper.properties ✅ Gradle 8.2
│
├── app/                              ✅ Web app servida por nginx
│   ├── index.html                    ✅ Shell principal (nav + main)
│   ├── manifest.json                 ✅ PWA manifest
│   ├── css/
│   │   └── main.css                  ✅ estilos globales + dark theme
│   └── js/
│       ├── config.js                 ✅ Config centralizada (IPs, puertos, tokens)
│       ├── api.js                    ✅ Cliente HTTP/WebSocket + auth headers
│       └── app.js                    ✅ Router de módulos, lazy load
│
├── modules/                          ✅ Módulos cargados dinámicamente
│   ├── dashboard/                    ✅ Vista general + servicios + métricas
│   │   ├── module.html               ✅
│   │   ├── module.css                ✅
│   │   └── module.js                 ✅ Servicios, métricas, containers, reloj
│   │
│   ├── daniel/                       ✅ Asistente IA + smart home
│   │   ├── module.html               ✅
│   │   ├── module.css                ✅
│   │   └── module.js                 ✅ Chat, WebSocket, STT, devices, metrics
│   │
│   ├── angel-control/                ✅ Panel Docker
│   │   ├── module.html               ✅
│   │   ├── module.css                ✅
│   │   └── module.js                 ✅ Containers, acciones, filtros, métricas
│   │
│   ├── monitor/                      ✅ Monitor de sistema
│   │   ├── module.html               ✅ PC + Ubuntu bars + servicios
│   │   ├── module.css                ✅
│   │   └── module.js                 ✅ PC+server stats, servicios, uptime
│   │
│   ├── shield/                       ✅ DNS + seguridad
│   │   ├── module.html               ✅
│   │   ├── module.css                ✅
│   │   └── module.js                 ✅ AdGuard stats, monitoring, overall
│   │
│   ├── settings/                     ✅ Configuración
│   │   ├── module.html               ✅
│   │   ├── module.css                ✅
│   │   └── module.js                 ✅ IP/puertos, tokens, diagnóstico
│   │
│   └── hub/                          ❌ MÓDULO FALTANTE
│       ├── module.html               ❌ Chat + selector de proveedor
│       ├── module.css                ❌ estilos del módulo
│       └── module.js                 ❌ WS chat, providers, estado
│
├── nginx/
│   └── nginx.conf                    ✅ Sirve /app y /modules, headers cache
│
├── docker-compose.yml                ✅ nginx:1.27-alpine, puerto 3005
│
├── .env.example                      ✅ ANGELOS_PORT=3005
│
└── docs/                             ✅ (recién creada)
    ├── architecture.md               ✅ (este documento)
    ├── api-integration-plan.md       ✅
    ├── folder-structure.md           ✅
    ├── tablet-ui-mockup.md           ✅
    └── implementation-roadmap.md     ✅
```

---

## Lo que Falta

### 1. `modules/hub/` — Módulo Hub IA
Tres archivos a crear:

```
modules/hub/
├── module.html   → Layout: selector proveedor + chat + estado providers
├── module.css    → Estilos del módulo (consistente con el resto)
└── module.js     → WebSocket /ws/chat, /providers/, /providers/status
```

### 2. Build artifacts Android (se generan localmente)
Estos archivos NO deben estar en el repositorio. Se crean en la máquina de desarrollo:

```
android/
├── local.properties          ← lo crea Android Studio (ruta SDK local)
├── gradle/wrapper/
│   └── gradle-wrapper.jar    ← descargado por Gradle automáticamente
├── gradlew                   ← script Unix (necesario para CI)
└── gradlew.bat               ← script Windows
```

Para generar la APK desde Android Studio:
1. Abrir `android/` como proyecto
2. `Build > Generate Signed Bundle/APK > APK`
3. Crear keystore de firma (o usar debug keystore)

### 3. Keystore de firma (para release)
```
android/keystore/
└── angelos-release.jks   ← generado una sola vez con keytool
```

---

## Convención de Módulos

Cada módulo sigue la misma estructura y contrato:

```javascript
// En module.js — obligatorio:
window.AngelOS.register('nombre-modulo', {
  onActivate(container) { /* llamado al navegar aquí */ },
  onDeactivate()        { /* llamado al salir */ },
});

// Namespace público para botones inline en HTML:
window._XX = {           // XX = 2 letras del módulo
  refresh: () => _loadAll(),
  action:  (id, arg) => _doSomething(id, arg),
};
```

---

## Archivos NO modificar (proyectos principales)

```
daniel/           ← NO TOCAR
AntigravityMobile/ ← NO TOCAR
interfazdocker/   ← NO TOCAR
Shield/           ← NO TOCAR
```
