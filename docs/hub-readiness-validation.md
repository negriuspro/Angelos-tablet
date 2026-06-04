# FASE 0 — Hub Readiness Validation
> Generado: 2026-06-03 · No se modificó ningún archivo durante esta validación.

---

## Estado actual de `app/js/modules/hub.js`

### Existencia
✅ El archivo **existe** en `app/js/modules/hub.js`

### Sistema de registro
❌ Usa `window.registerModule('hub', ...)` — **esta función no existe en ningún archivo del proyecto**

### Conexión con el router
❌ **NO está conectado** al router de `app/js/app.js`
- El array `MODULES` en `app.js` tiene 6 entradas: dashboard, daniel, angel-control, monitor, shield, settings
- `'hub'` no está en ese array
- El router nunca solicita `/modules/hub/module.html`, `/modules/hub/module.css` ni `/modules/hub/module.js`

### ¿Se carga actualmente?
❌ **NO**. El archivo `app/js/modules/hub.js` no está referenciado en:
- `app/index.html` (no hay `<script src>` que lo incluya)
- `app/js/app.js` (el router no lo conoce)
- Ningún otro archivo del proyecto

### ¿Causa errores actualmente?
✅ **NO**. Al no ser cargado, es código muerto inerte.

---

## Dependencias encontradas en `hub.js`

| Dependencia | Existe | Compatibilidad |
|-------------|--------|----------------|
| `window.API.openWS('hub', ...)` | ✅ `api.js` | ✅ Compatible |
| `window.API.get('hub', ...)` | ✅ `api.js` | ✅ Compatible |
| `window.API.post('hub', ...)` | ✅ `api.js` | ✅ Compatible |
| `window.CFG.url('hub', ...)` | ✅ `config.js` | ✅ Compatible |
| `window.CFG.ws('hub', ...)` | ✅ `config.js` | ✅ Compatible |
| `window.registerModule()` | ❌ No existe | ❌ Incompatible |

### Configuración de red (config.js)
```javascript
hub: 3004,  // antigravitymobile-test — editable en Settings
```
La clave `'hub'` ya está registrada en `DEFAULT_CONFIG.ports`. ✅

---

## APIs utilizadas en `hub.js`

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/ws/chat` | WebSocket | Chat streaming IA |
| `/servers/` | GET | Lista contenedores Docker |
| `/servers/{id}/{action}` | POST | start/stop/restart contenedor |

### No utiliza (aún, pero son endpoints conocidos del backend)
- `GET /health`
- `GET /providers/`
- `GET /providers/status`

---

## WebSockets utilizados

```javascript
ws = window.API.openWS('hub', '/ws/chat', handlers)
// → ws://192.168.100.6:3004/ws/chat  (IP tomada de CFG, no hardcodeada)
```

### Protocolo de mensajes (enviado)
```json
{ "provider": "claude", "messages": [{"role":"user","content":"..."}] }
```

### Protocolo de mensajes (recibido)
```json
{ "type": "start" }
{ "type": "chunk", "delta": "..." }   ← también soporta "content" y "text"
{ "type": "done" }                    ← también soporta "end"
{ "error": "mensaje de error" }
```

---

## Compatibilidad con el sistema actual

| Aspecto | Estado | Nota |
|---------|--------|------|
| `window.API.openWS()` | ✅ Compatible | api.js lo define |
| `window.CFG.url/ws()` | ✅ Compatible | config.js lo define |
| Puerto hub configurable | ✅ Sí | Settings lo edita en runtime |
| IPs hardcodeadas | ✅ Ninguna | Todo vía CFG |
| Puertos hardcodeados | ✅ Ninguno | Todo vía CFG.ports.hub |
| Patrón de registro | ❌ Incompatible | Usa registerModule, no AngelOS.register |
| Dividido en HTML/CSS/JS | ❌ No | Todo en un solo archivo |
| Directorio `modules/hub/` | ❌ No existe | Debe crearse |

---

## Conflictos detectados

### CONFLICTO #1 — Sistema de registro incorrecto
```
hub.js usa:    window.registerModule('hub', {...})
Debe usar:     window.AngelOS.register('hub', {...})
```
`window.registerModule` no está definido → `ReferenceError` en ejecución.

### CONFLICTO #2 — Módulo no declarado en router
```
app.js MODULES = [ dashboard, daniel, angel-control, monitor, shield, settings ]
                                                            ↑ 'hub' FALTA
```
Sin esta entrada, el módulo nunca aparece en el menú de navegación.

### CONFLICTO #3 — Directorio modules/hub/ no existe
```
El router solicita: /modules/hub/module.html → 404 Not Found
                    /modules/hub/module.css  → ignorado (CSS opcional)
                    /modules/hub/module.js   → fallo de carga → error en consola
```

### CONFLICTO #4 — `window.onNativeResult` compartido
```
Daniel define: window.onNativeResult  (al cargarse el módulo)
Hub define:    window.onNativeResult  (también debe capturar STT)
```
Solución: Hub sobreescribe en onActivate y restaura en onDeactivate.

### AG-CORE-001 — Empty catch blocks en hub.js
```javascript
hub.js:108  } catch {}   ← _connectWS sin log
hub.js:113  } catch {}   ← ws.close() sin log
```

---

## Resumen de validación

```
✅ La lógica de hub.js es REUTILIZABLE como base
✅ Las APIs de api.js y config.js soportan 'hub' sin cambios
✅ No hay IPs ni puertos hardcodeados en hub.js
❌ El sistema de registro es incompatible → debe adaptarse
❌ No existe modules/hub/ → debe crearse
❌ 'hub' no está en el array MODULES de app.js → debe agregarse
```
