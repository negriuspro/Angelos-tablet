# AngelOS — Mockup de Interfaz para Tablet
> Diseño en modo landscape (tablet horizontal)  
> Resolución objetivo: 1280×800 px mínimo

---

## Layout General (todas las pantallas)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ██████ │                                                                  │
│ ANGEL  │                  ÁREA DE CONTENIDO                              │
│  OS    │                  (cambia según módulo activo)                   │
│ ──── │                                                                  │
│  ⊙   │                                                                  │
│ dash   │                                                                  │
│  ──── │                                                                  │
│  ◉   │                                                                  │
│ daniel │                                                                  │
│  ──── │                                                                  │
│  ⊞   │                                                                  │
│ angel  │                                                                  │
│  ctrl  │                                                                  │
│  ──── │                                                                  │
│  ⊕   │                                                                  │
│ monit  │                                                                  │
│  ──── │                                                                  │
│  ⊛   │                                                                  │
│ hub    │                                                                  │
│  ──── │                                                                  │
│  ★   │                                                                  │
│ shield │                                                                  │
│  ──── │                                                                  │
│  ⚙   │                                                                  │
│ config │                                                                  │
└──────────────────────────────────────────────────────────────────────────┘
 ←80px→  ←────────────────────── resto del ancho ──────────────────────→
```

---

## Pantalla 1: Dashboard

```
┌────────┬─────────────────────────────────────────────────────────────────┐
│  NAV   │  ⊙ Dashboard                          🕐 14:32:47              │
│        ├─────────────────────────────────────────────────────────────────┤
│  ⊙     │                                                                 │
│ dash ← │  SERVICIOS                                                      │
│        │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  ◉     │  │  Daniel  │ │   Hub    │ │AngelCtrl │ │  Shield  │          │
│ daniel │  │  Online  │ │  Online  │ │  Online  │ │  Online  │          │
│        │  │  :3002   │ │  :3001   │ │  :3000   │ │  :3003   │          │
│  ⊞     │  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│ angel  │                                                                 │
│  ctrl  │  SISTEMA                              CONTENEDORES   22/28 ✓   │
│        │  CPU  ████████░░░░░  45%              ┌─────────────────────┐  │
│  ⊕     │  RAM  █████████████  71%              │ ● daniel_backend    │  │
│ monit  │  DISK ██████░░░░░░░  38%              │ ● mobile_nginx      │  │
│        │  BAT  ████████████░  87% ⚡           │ ● angel-ctrl_redis  │  │
│  ⊛     │                                       │ ● shield_postgres   │  │
│ hub    │                                       │ ● adguardhome       │  │
│        │                                       │ ○ ag-ai (stopped)   │  │
│  ★     │                                       └─────────────────────┘  │
│ shield │                                                                 │
│        │  Clic en servicio → navega al módulo                           │
│  ⚙     │                                                                 │
│ config │                                                                 │
└────────┴─────────────────────────────────────────────────────────────────┘
```

---

## Pantalla 2: Daniel (Chat + Smart Home)

```
┌────────┬────────────────────────────────┬────────────────────────────────┐
│  NAV   │  ◉ Daniel              ● Conect│  MÉTRICAS         SMART HOME  │
│        │                                │  CPU  ███░░░░  23%  ─────────  │
│        ├────────────────────────────────┤  RAM  █████░░  71%  Sala      │
│  ◉ ←  │ [ia] Hola, ¿en qué te ayudo?  │  DISK ███░░░░  38%  Luz  [ON] │
│ daniel │                                │  BAT  ████░░  87%⚡ ─────────  │
│        │ [yo] ¿Qué temperatura hace     │                     Recámara  │
│        │      afuera?                   │                     AC   [OFF] │
│        │                                │                     ─────────  │
│        │ [ia] Actualmente hay 24°C      │                     Cocina    │
│        │      con cielos despejados...  │                     Luz  [ON] │
│        │                                │                               │
│        │                                │                     [↺ Recar] │
│        │                                │                               │
│        ├────────────────────────────────┤                               │
│        │ [textarea              ] 🎤 ▶ │                               │
│        │ Escribe un mensaje...          │                               │
└────────┴────────────────────────────────┴────────────────────────────────┘
           ←──── chat 55% ─────────────→  ←── info 40% ──────────────────→
```

---

## Pantalla 3: Hub IA (módulo a crear)

```
┌────────┬──────────────────────────────────────────────────────────────────┐
│  NAV   │  ⊛ Hub IA                              ● Hub conectado          │
│        ├──────────────────────────────────────────────────────────────────┤
│        │  PROVEEDOR                                                       │
│  ⊛ ←  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  hub   │  │ ◉ Claude │ │  Groq   │ │ Gemini  │ │Cerebras  │           │
│        │  │  Sonnet  │ │ llama3  │ │  Pro    │ │  8b      │           │
│        │  │  ● ON    │ │  ● ON   │ │  ● ON   │ │  ● ON    │           │
│        │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│        │                                                                  │
│        │  CONVERSACIÓN                                                    │
│        │  ┌────────────────────────────────────────────────────────────┐ │
│        │  │ [claude] ¡Hola! Soy Claude. ¿En qué puedo ayudarte hoy?  │ │
│        │  │                                                             │ │
│        │  │                              [yo] Explícame el ecosistema │ │
│        │  │                                   de mis proyectos Docker  │ │
│        │  │                                                             │ │
│        │  │ [claude] Tu ecosistema tiene 5 proyectos principales:     │ │
│        │  │          Daniel, AntigravityMobile, Angel Control...       │ │
│        │  └────────────────────────────────────────────────────────────┘ │
│        │  ┌────────────────────────────────────────────────┐  ▶ Enviar  │
│        │  │ Escribe tu mensaje aquí...                      │  🎤 Voz   │
│        │  └────────────────────────────────────────────────┘            │
└────────┴──────────────────────────────────────────────────────────────────┘
```

---

## Pantalla 4: Angel Control (Docker)

```
┌────────┬──────────────────────────────────────────────────────────────────┐
│  NAV   │  ⊞ Angel Control                       ● Conectado             │
│        ├──────────────────────────────────────────────────────────────────┤
│        │  CPU 45%  RAM 71%      TOTAL:28  ●RUN:22  ○STOP:6              │
│        │  [Todos▼] [Running] [Stopped]                     [↺ Refrescar]│
│  ⊞ ←  │  ┌──────────────────────────────────────────────────────────┐   │
│ angel  │  │ ● daniel_nginx        nginx:1.27    Up 3 days       [■][↺]│  │
│  ctrl  │  │ ● daniel_backend      python:3.12   Up 3 days       [■][↺]│  │
│        │  │ ● daniel_redis        redis:7.4     Up 3 days       [■][↺]│  │
│        │  │ ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──      │  │
│        │  │ ● mobile_nginx        built         Up 2 days       [■][↺]│  │
│        │  │ ● mobile_backend      python:3.12   Up 2 days       [■][↺]│  │
│        │  │ ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──      │  │
│        │  │ ○ angel_ctrl_backend  python:3.12   Exited 1h       [▶][↺]│  │
│        │  │ ● angel_ctrl_redis    redis:7       Up 2 days       [■][↺]│  │
│        │  │ ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──      │  │
│        │  │ ● shield_postgres     postgres:16   Up 5 days       [■][↺]│  │
│        │  └──────────────────────────────────────────────────────────┘   │
└────────┴──────────────────────────────────────────────────────────────────┘
   [■] = detener  [▶] = iniciar  [↺] = reiniciar
```

---

## Pantalla 5: Monitor del Sistema

```
┌────────┬────────────────────────────────┬────────────────────────────────┐
│  NAV   │  ⊕ Monitor           ↺  14:32 │  SERVICIOS                    │
│        ├────────────────────────────────┤                                │
│  ⊕ ←  │  PC PRINCIPAL       ● Online  │  Daniel    :3002   ✓  12ms   │
│ monit  │  PC-je416                      │  Hub       :3001   ✓   8ms   │
│        │  CPU  ████████░░░  78%         │  AngelCtrl :3000   ✓  15ms   │
│        │  RAM  ████████████  92% ⚠️    │  Shield    :3003   ✓  45ms   │
│        │  DISK ██████░░░░░  55%         │  AdGuard   :3900   ✓  11ms   │
│        │  BAT  ███████████░  87% ⚡    │                                │
│        │  IP: 192.168.100.5             │                                │
│        │  Uptime: 2d 4h 12m            │                                │
│        │  ────────────────────────      │                                │
│        │  SERVIDOR UBUNTU   ● Online   │                                │
│        │  ubuntu-server                 │                                │
│        │  CPU  ████░░░░░░░  35%         │                                │
│        │  RAM  █████████░░  71%         │                                │
│        │  DISK ██████░░░░░  58%         │                                │
│        │  Docker: 22 ctrs activos       │                                │
│        │  IP: 192.168.100.6             │                                │
│        │  Uptime: 5d 11h 40m           │                                │
└────────┴────────────────────────────────┴────────────────────────────────┘
```

---

## Pantalla 6: Shield (DNS + Seguridad)

```
┌────────┬────────────────────────────────┬────────────────────────────────┐
│  NAV   │  ★ Shield DNS                  │  MONITORING STACK             │
│        │                    ● Conectado │                                │
│        ├────────────────────────────────┤  Prometheus  ● OK             │
│  ★ ←  │  DNS HOY                       │  Grafana     ● OK             │
│ shield │  Consultas:    15,420          │  NodeExport  ● OK             │
│        │  Bloqueadas:    3,210  (20%)   │  AdGuard UI  ● OK             │
│        │  Clientes:      8              │  cAdvisor    ○ DOWN           │
│        │  Latencia avg:  4 ms           │                                │
│        │  ────────────────────────      │  ESTADO SERVICIOS             │
│        │  RED                           │                                │
│        │  Dispositivos:  12             │  Daniel      ● OK             │
│        │  Online:        9              │  Hub         ● OK             │
│        │  CPU Shield:   23%             │  Angel Ctrl  ● OK             │
│        │  RAM Shield:   41%             │  Shield      ● OK             │
│        │                               │  AdGuard     ● OK             │
│        │                               │                                │
│        │                               │  4 / 5 servicios activos      │
└────────┴────────────────────────────────┴────────────────────────────────┘
```

---

## Pantalla 7: Configuración

```
┌────────┬──────────────────────────────────────────────────────────────────┐
│  NAV   │  ⚙ Configuración                                               │
│        ├──────────────────────────────────────────────────────────────────┤
│        │                                                                  │
│  ⚙ ←  │  SERVIDOR                         PUERTOS                       │
│ config │  IP / Hostname: [192.168.100.6]   Daniel:    [3002]             │
│        │                                   Hub:       [3001]             │
│        │  CREDENCIALES                     Angel Ctrl:[3000]             │
│        │  Daniel Token:  [••••••••••••••]  Shield:    [3003]             │
│        │  Angel API Key: [••••••••••••••]  AdGuard:   [3900]             │
│        │                                                                  │
│        │  Intervalo polling: [10000] ms                                  │
│        │                                                                  │
│        │  [💾 Guardar]  [↺ Restablecer defaults]                        │
│        │                                               ✓ Guardado        │
│        │  ────────────────────────────────────────────────────────────   │
│        │  DIAGNÓSTICO DE CONEXIÓN                                        │
│        │  [🔍 Probar conexiones]                                         │
│        │                                                                  │
│        │  Daniel     :3002  ✓ 12ms    Hub        :3001  ✓  8ms         │
│        │  Angel Ctrl :3000  ✓ 15ms    Shield     :3003  ✓ 45ms         │
│        │  AdGuard    :3900  ✓ 11ms                                      │
│        │                                                                  │
│        │  ────────────────────────────────────────────────────────────   │
│        │  Acerca de AngelOS · URL: http://192.168.100.6:3005             │
└────────┴──────────────────────────────────────────────────────────────────┘
```

---

## Paleta de Colores (dark theme)

```css
--bg:      #0a0f1a    /* fondo principal */
--surface: #111827    /* tarjetas, paneles */
--border:  #1f2937    /* bordes sutiles */
--accent:  #6366f1    /* azul-morado (botones activos) */
--accent2: #22c55e    /* verde (estado OK) */
--warn:    #f59e0b    /* amarillo (advertencia) */
--error:   #ef4444    /* rojo (error / down) */
--dim:     #6b7280    /* texto secundario */
--text:    #f9fafb    /* texto principal */
```

---

## Diseño para Uso Permanente (kiosk mode)

- **Pantalla siempre encendida**: `FLAG_KEEP_SCREEN_ON` en Kotlin
- **Sin barras del sistema**: fullscreen inmersivo + sticky
- **Sin zoom**: `setSupportZoom(false)`, `user-scalable=no`
- **Orientación fija**: `android:screenOrientation="landscape"`
- **Retroiluminación baja** recomendada para uso nocturno (a nivel OS Android)
- **Fuente**: Roboto Mono para métricas/datos (carga desde Google Fonts en primera carga)
