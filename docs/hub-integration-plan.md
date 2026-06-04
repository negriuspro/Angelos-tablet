# FASE 1 — Hub Integration Plan
> Plan de integración basado en análisis de código existente.  
> No se modificó ningún archivo durante la elaboración de este plan.

---

## Análisis de `app/js/modules/hub.js`

### ¿Contiene Chat IA?
✅ **SÍ** — via WebSocket `/ws/chat` con reconexión exponencial.

### ¿Contiene Streaming?
✅ **SÍ** — manejo de `{type:chunk}`, `{delta}`, `{content}`, `{text}`.  
Incluye `_appendChunk()` y `_finalizeChunk()`.

### ¿Contiene Multi-proveedor?
✅ **SÍ** — 5 proveedores: claude, gemini, groq, cerebras, openrouter.  
Selector de botones con toggle visual.

### ¿Contiene Panel Docker?
✅ **SÍ** — carga `/servers/`, muestra lista de contenedores, acciones start/stop/restart.

### ¿Contiene Gestión de archivos?
❌ **NO** — no existe en hub.js ni en los backends documentados.

### ¿Contiene Estado de proveedores?
⚠️ **PARCIAL** — hay lógica de badges (`badge-ok/badge-err`) pero no hace polling a `/providers/status`. Se puede agregar opcionalmente.

---

## Partes de hub.js que SE REUTILIZAN (adaptadas)

| Función | Reutilizable | Adaptación necesaria |
|---------|-------------|---------------------|
| `_connectWS()` | ✅ | Agregar logs en catch (AG-CORE-001) |
| `_disconnectWS()` | ✅ | Ninguna |
| `_appendChunk()` | ✅ | Cambiar ID `chat-messages` → `hub-messages` |
| `_finalizeChunk()` | ✅ | Agregar push a `_messages` array |
| `_sendMessage()` | ✅ | Ninguna |
| `_appendMsg()` | ✅ | Cambiar ID `chat-messages` → `hub-messages` |
| `_hubSetProvider()` | ✅ | Renombrar a `_setProvider()`, cambiar clase `provider-btn` → `hub-prov-btn` |
| `_loadServers()` | ✅ | Mantener para panel Docker |
| `_hubCtrl()` | ✅ | Mantener para acciones start/stop/restart |

## Partes de hub.js que NO SE REUTILIZAN

| Código | Razón |
|--------|-------|
| `window.registerModule('hub', ...)` | Sistema incorrecto — reemplazar por `window.AngelOS.register()` |
| `_render()` completo | Generaba HTML via innerHTML — reemplazar con module.html estático |
| Estilos inline (`style="..."`) | Mover a module.css |
| `_$()` helper privado | Reemplazar con `_q(id) { return document.getElementById(id); }` (mismo patrón que otros módulos) |
| `catch {}` vacíos | Reemplazar con logs (AG-CORE-001) |

---

## Partes NUEVAS a agregar (no existían en hub.js)

| Feature | Descripción |
|---------|-------------|
| STT integration | `window.onNativeResult` capturado en onActivate, restaurado en onDeactivate |
| `_bindEvents()` | Eventos via addEventListener (mejor que onclick inline para cleanup) |
| Auto-resize textarea | Mismo patrón que Daniel |
| `window._HUB` namespace | Funciones públicas para botones inline en HTML |
| Provider polling | `GET /providers/status` opcional — badge verde/rojo por proveedor |
| Hub health check | `GET /health` al activar para badge inicial |

---

## Plan de archivos

### MODIFICAR (1 archivo, 1 línea)

```
app/js/app.js

Línea actual 12:
  { id: 'shield',   label: 'Shield',  icon: '⊛', folder: 'shield'   },

Línea nueva (insertar ANTES de settings):
  { id: 'hub',      label: 'Hub IA',  icon: '⬡', folder: 'hub'      },
```

### CREAR (3 archivos)

```
modules/hub/
├── module.html   ← Layout: header + providers + chat + footer
├── module.css    ← Estilos Hub-específicos, scoped a #hub-* IDs
└── module.js     ← window.AngelOS.register('hub', ...) + toda la lógica
```

---

## Convención seguida por el sistema

```javascript
// Patrón correcto (confirmado en dashboard, daniel, angel-control, monitor, shield, settings):
window.AngelOS.register('MODULE_ID', {
  onActivate(container) { /* container = #main element */ },
  onDeactivate() { /* cleanup */ },
});

// Namespace público para botones en HTML:
window._XX = { action: ..., refresh: ... };

// Helper DOM (todos los módulos lo usan):
function _q(id) { return document.getElementById(id); }
```

---

## IDs de elementos HTML

Para evitar conflictos con Daniel (que usa `#chat-messages`, `#chat-input`, etc.), Hub usa namespace propio:

| ID | Tipo | Descripción |
|----|------|-------------|
| `hub-conn` | badge | Estado de conexión WebSocket |
| `hub-providers` | div | Contenedor de botones de proveedor |
| `hub-p-{name}` | button | Botón de cada proveedor |
| `hub-shell` | div | Contenedor principal del chat |
| `hub-messages` | div | Área de mensajes scrollable |
| `hub-footer` | div | Footer con input y botones |
| `hub-input` | textarea | Input del usuario |
| `hub-mic` | button | Botón de micrófono |
| `hub-send` | button | Botón de envío |

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Puerto 3004 incorrecto | Alta | Settings editable en runtime sin reinstalar APK |
| Backend hub caído | Media | Badge "Desconectado" + retry automático |
| CORS bloqueado | Media | Configurar CORS_ORIGINS en backend hub |
| `window.onNativeResult` conflicto con Daniel | Baja | Capturar/restaurar en onActivate/onDeactivate |
| Panel Docker redundante con Angel Control | Informativo | Feature bonus — se puede ocultar por preferencia |
