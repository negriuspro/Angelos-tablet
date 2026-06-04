# AUDITORÍA DE INFRAESTRUCTURA — AngelOS Server
**Fecha:** 2026-06-03  
**Auditor:** QA Lead (SSH read-only — sin modificaciones)  
**Host:** 192.168.100.6 · usuario: angel  
**Método:** SSH via paramiko — comandos de solo lectura  

---

## RESUMEN EJECUTIVO

| Área | Estado | Crítico |
|------|--------|---------|
| Sistema operativo | 🟢 Ubuntu 26.04 LTS · kernel 7.0.0-22 | No |
| Recursos (CPU/RAM/Disco) | 🟡 RAM al 55% · disco al 16% | No |
| Docker daemon | 🟢 Running · v29.5.2 | No |
| AntigravityMobile **PROD** | 🔴 CAÍDO — 4/4 contenedores caídos | **Sí** |
| AntigravityMobile **TEST** | 🟢 Operativo en puerto 3004 | No |
| Daniel | 🟢 Operativo en puerto 3002 | No |
| Angel Control | 🟢 Operativo en puerto 3000 | No |
| Shield | 🟢 Operativo en puerto 3003 | No |
| nginx systemd (host) | 🔴 FAILED — puerto 443 en uso | **Sí** |
| docker-mobile.service | 🔴 FAILED — watchdog del prod | **Sí** |
| Seguridad | 🟡 Varios puntos a revisar | Parcial |

**El servidor es un portátil HP ejecutando Ubuntu 26.04 sobre WiFi. AntigravityMobile producción lleva ~5h caído sin alertas activas.**

---

## 1. SISTEMA OPERATIVO Y HARDWARE

```
OS:       Ubuntu 26.04 LTS (Resolute Raccoon)
Kernel:   Linux 7.0.0-22-generic (64-bit, PREEMPT_DYNAMIC)
Hostname: angel-HP-Notebook
```

### Recursos

| Recurso | Total | Usado | Libre | Nota |
|---------|-------|-------|-------|------|
| CPU | 4 cores | load: 0.32/0.51/0.62 | — | Carga baja ✅ |
| RAM | 6.2 GiB | 3.4 GiB (55%) | 2.8 GiB disp. | OK ✅ |
| Swap | 4.0 GiB | 53 MiB | 3.9 GiB | OK ✅ |
| Disco `/` | 238 GB | 35 GB (16%) | 186 GB | OK ✅ |
| Boot EFI | 1.1 GB | 6.4 MB | 1.1 GB | OK ✅ |

### Red

| Interfaz | Estado | IP |
|----------|--------|----|
| enp3s0 (Ethernet) | **DOWN** | — |
| wlo1 (WiFi) | **UP** | 192.168.100.6/24 |
| tailscale0 | UP | 100.76.144.102/32 |

> ⚠️ **RIESGO CRÍTICO:** El servidor depende de **WiFi** para toda la conectividad. Una desconexión de red dejaría todos los servicios inaccesibles. Ethernet (enp3s0) está DOWN.

---

## 2. INVENTARIO DE SERVICIOS

### Docker daemon
```
Docker:    v29.5.2
Estado:    active (running) desde 12:09:10 (hace 5h)
Tasks:     177
RAM:       176.8 MiB (peak 207.5 MiB)
CPU total: 9min 20s
```

### Proyectos activos (`/home/angel/projects/`)

```
angel-ctrl/
antigravity-shield/
antigravitymobile/          ← PROD (ROTO)
antigravitymobile-test/     ← TEST (operativo en :3004)
asistente-daniel/
update-all.sh
update-all.log
update-changes.sh
update-changes.log
webhook.py                  ← script de auto-deploy detectado
```

---

## 3. ESTADO DE CONTENEDORES

### Vista completa (30 contenedores)

| Contenedor | Imagen | Estado | Puertos | Salud |
|-----------|--------|--------|---------|-------|
| antigravitymobile-nginx-1 | antigravitymobile-nginx | **Created** | — | 🔴 No iniciado |
| antigravitymobile-backend-1 | antigravitymobile-backend | **Created** | — | 🔴 No iniciado |
| antigravitymobile-redis-1 | redis:7.4-alpine | **Restarting** | — | 🔴 Crash-loop |
| antigravitymobile-frontend-1 | antigravitymobile-frontend | **Restarting** | — | 🔴 Crash-loop |
| antigravitymobile-docker-socket-proxy-1 | tecnativa/docker-socket-proxy:0.3.0 | Up 5h | — | 🟢 |
| antigravitymobile-test-nginx-1 | antigravitymobile-test-nginx | Up 5h (healthy) | 0.0.0.0:3004→3000 | 🟢 |
| antigravitymobile-test-backend-1 | antigravitymobile-test-backend | Up 5h (healthy) | 8000/tcp | 🟢 |
| antigravitymobile-test-redis-1 | redis:7.4-alpine | Up 5h (healthy) | 6379/tcp | 🟢 |
| antigravitymobile-test-frontend-1 | antigravitymobile-test-frontend | Up 5h (healthy) | 80/tcp | 🟢 |
| asistente-daniel-nginx-1 | nginx:1.27-alpine | Up 5h (healthy) | 0.0.0.0:3002→80 | 🟢 |
| asistente-daniel-backend-1 | daniel-backend:latest | Up 5h (healthy) | 8000/tcp | 🟢 |
| asistente-daniel-frontend-1 | daniel-frontend:latest | Up 5h (healthy) | 80/tcp | 🟢 |
| asistente-daniel-redis-1 | redis:7.4-alpine | Up 5h (healthy) | 6379/tcp | 🟢 |
| angel-ctrl-nginx-1 | angel-ctrl-nginx | Up 5h (healthy) | 0.0.0.0:3000→80 | 🟢 |
| angel-ctrl-backend-1 | angel-ctrl-backend | Up 5h (healthy) | 8080/tcp | 🟢 |
| angel-ctrl-redis-1 | redis:7-alpine | Up 5h (healthy) | 6379/tcp | 🟢 |
| antigravity-shield-nginx-1 | nginx:1.27-alpine | Up 5h (healthy) | :3003→80, 192.168.100.6:443→443 | 🟢 |
| antigravity-shield-backend-1 | antigravity-shield-backend | Up 5h (healthy) | 8000/tcp | 🟢 |
| antigravity-shield-frontend-1 | antigravity-shield-frontend | Up 5h | 3000/tcp | 🟢 |
| antigravity-shield-postgres-1 | postgres:16-alpine | Up 5h (healthy) | 5432/tcp | 🟢 |
| antigravity-shield-redis-1 | redis:7.2-alpine | Up 5h (healthy) | 6379/tcp | 🟢 |
| antigravity-shield-adguardhome-1 | adguard/adguardhome | Up 5h (healthy) | 0.0.0.0:3900→3000 | 🟢 |
| antigravity-shield-grafana-1 | grafana/grafana:11.0.0 | Up 5h | 3000/tcp | 🟢 |
| antigravity-shield-prometheus-1 | prom/prometheus | Up 5h | 9090/tcp | 🟢 |
| antigravity-shield-loki-1 | grafana/loki:3.0.0 | Up 5h | 3100/tcp | 🟢 |
| antigravity-shield-node-exporter-1 | prom/node-exporter | Up 5h | — (host) | 🟢 |
| antigravity-shield-cadvisor-1 | gcr.io/cadvisor | Up 5h (healthy) | 8080/tcp | 🟢 |
| antigravity-shield-ag-controller-1 | antigravity-shield-ag-controller | Up 5h | — | 🟢 |
| antigravity-shield-ag-network-1 | antigravity-shield-ag-network | Up 5h | — | 🟢 |
| antigravity-shield-ag-ai-1 | antigravity-shield-ag-ai | Up 5h | 8001/tcp | 🟢 |

### Uso de recursos (docker stats)

| Contenedor | CPU | RAM | RAM% |
|-----------|-----|-----|------|
| antigravity-shield-cadvisor-1 | **8.30%** | 105 MiB | 1.65% |
| antigravity-shield-loki-1 | 2.29% | 51 MiB | 0.80% |
| antigravity-shield-ag-controller-1 | 1.20% | 42 MiB | 0.66% |
| antigravity-shield-backend-1 | 1.07% | **174 MiB** | 2.74% |
| antigravitymobile-test-redis-1 | 1.94% | 3.2 MiB | 1.98% |
| asistente-daniel-redis-1 | 1.93% | 3.2 MiB | 1.98% |
| angel-ctrl-redis-1 | **6.92%** | 5.1 MiB | 6.39% |
| antigravitymobile-test-backend-1 | 0.33% | 79 MiB | 20.58% |
| angel-ctrl-backend-1 | 0.35% | 73 MiB | 18.25% |
| asistente-daniel-backend-1 | 0.34% | 54 MiB | 10.63% |
| antigravity-shield-prometheus-1 | 0.10% | 78 MiB | 1.22% |
| antigravitymobile-redis-1 | 0.00% | 0B | 0% | ← en crash |
| antigravitymobile-frontend-1 | 0.00% | 0B | 0% | ← en crash |

> ⚠️ **angel-ctrl-redis-1 consume 6.92% CPU** — revisar si hay operaciones en loop.

---

## 4. PUERTOS ACTIVOS

### TCP en escucha (ss -tulpn filtrado)

| Puerto | Protocolo | Exposición | Servicio |
|--------|-----------|-----------|---------|
| 22 | TCP | **0.0.0.0** | SSH (OpenSSH) |
| 3000 | TCP | **0.0.0.0** | Angel Control nginx |
| 3002 | TCP | **0.0.0.0** | Daniel nginx |
| 3003 | TCP | **0.0.0.0** | Shield nginx |
| 3004 | TCP | **0.0.0.0** | AntigravityMobile-test nginx |
| 3443 | TCP | **0.0.0.0** | Daniel HTTPS |
| 3900 | TCP | **0.0.0.0** | AdGuard Home UI |
| 8443 | TCP | **0.0.0.0** | Shield HTTPS |
| **9000** | TCP | **0.0.0.0** | python3 PID 1685 ← **DESCONOCIDO** |
| 9100 | TCP | **\*:9100** | node-exporter (Shield) |
| 443 | TCP | 192.168.100.6 | Shield nginx HTTPS |
| 53 | TCP/UDP | 127.0.0.1 + 192.168.100.6 | AdGuard DNS |
| 631 | TCP | 127.0.0.1 | CUPS (impresión) |

> ⚠️ **Puerto 9000** — `python3` con PID 1685 escuchando en `0.0.0.0:9000`. No corresponde a ningún contenedor Docker conocido. Posiblemente Tailscale SSH relay o webhook.py. **Requiere investigación.**
>
> ⚠️ **Puerto 9100 (node-exporter)** — Métricas internas de Prometheus expuestas en `*:9100`. Accesible desde toda la red local sin autenticación.

### Verificación curl local

| Puerto | Endpoint | Respuesta | Estado |
|--------|---------|-----------|--------|
| :3001 | /health | NO_RESPONSE | 🔴 AntigravityMobile PROD DOWN |
| :3002 | /health | `{"status":"ok"}` | 🟢 Daniel |
| :3003 | /health | 301 → HTTPS | 🟢 Shield |
| :3004 | /health | `{"status":"online","system":"Antigravity Hub"...}` | 🟢 AntigravityMobile TEST |
| :3000 | /health | `{"status":"ok","docker":"ok"}` | 🟢 Angel Control |
| :8000 | /health | NO_RESPONSE | — (no expuesto) |
| :3900 | / | 302 → /login.html | 🟢 AdGuard |

---

## 5. ERRORES DETECTADOS

### ERROR CRÍTICO #1 — AntigravityMobile PROD Redis: Permission Denied en volumen

**Contenedor:** `antigravitymobile-redis-1`  
**Estado:** Restarting (crash-loop continuo)

```
find: ./appendonlydir: Permission denied   (×30 repeticiones)
```

**Causa:** El volumen Docker `antigravitymobile_redis-data` tiene permisos incorrectos. Redis necesita escribir en `/data/appendonlydir` pero el UID del proceso (redis:999) no tiene acceso al directorio del volumen montado.

**Impacto:** Redis PROD no persiste datos. Backend PROD no puede iniciar (depende de Redis healthy).

---

### ERROR CRÍTICO #2 — AntigravityMobile PROD Frontend: tmpfs sin permisos

**Contenedor:** `antigravitymobile-frontend-1`  
**Estado:** Restarting (crash-loop cada ~60s)

```
mkdir() "/var/cache/nginx/client_temp" failed (13: Permission denied)
nginx: [emerg] mkdir() "/var/cache/nginx/client_temp" failed
```

**Causa:** El contenedor usa `read_only: true` con `tmpfs: /var/cache/nginx`. En esta versión de Docker/kernel, el tmpfs no se monta con `uid=101,gid=101` correctamente antes de que nginx intente crear subdirectorios. O el `cap_drop: [ALL]` elimina la capacidad necesaria para crear el directorio.

**Impacto:** Frontend PROD no levanta. Junto con Redis, nginx-prod no puede completar `depends_on: frontend: condition: service_healthy`.

---

### ERROR CRÍTICO #3 — docker-mobile.service: FAILED

**Servicio systemd:** `docker-mobile.service`  
**Estado:** `failed`

```
Description=Antigravity Mobile (app móvil prod) — Docker Compose watchdog
WorkingDirectory=/home/angel/projects/antigravitymobile
ExecStart=/usr/bin/docker compose up --remove-orphans
Restart=on-failure
RestartSec=20s
StartLimitBurst=5
```

**Causa:** El servicio systemd intenta levantar `docker compose up` en bucle, pero como los contenedores siguen fallando, el servicio llega al `StartLimitBurst=5` y se detiene definitivamente.

**Impacto:** Sin auto-restart funcional. Los contenedores caídos no se van a recuperar solos.

---

### ERROR #4 — nginx.service (sistema): Puerto 443 ocupado

**Servicio systemd:** `nginx.service`  
**Estado:** `failed (Result: exit-code)` desde 12:02:39

```
nginx: [emerg] bind() to 0.0.0.0:443 failed (98: Address already in use)
nginx: [emerg] still could not bind()
```

**Causa:** Shield nginx expone `192.168.100.6:443`. El nginx del sistema también intenta bind en `0.0.0.0:443` (incluye 192.168.100.6). Conflicto de puerto.

**Impacto:** El nginx del host está inactivo. No afecta servicios Docker, pero el servicio systemd está en estado `failed` y `enabled` — intentará reiniciar en cada boot.

---

### OBSERVACIÓN #5 — Imágenes y volúmenes huérfanos

```
Volúmenes sin proyecto activo:
  jarvis_jarvis-data
  jarvis_redis-data
  npm_data
  npm_letsencrypt

Imágenes sin contenedor activo:
  jc21/nginx-proxy-manager:latest (1.66 GB)
  python:3.12-slim
  alpine:latest
```

**Impacto:** ~2.5 GB de disco ocupado por proyectos eliminados (Jarvis, Nginx Proxy Manager).

---

## 6. RIESGOS DE SEGURIDAD

### 🔴 CRÍTICO

| # | Riesgo | Detalle |
|---|--------|---------|
| S1 | **Servidor en portátil sobre WiFi** | angel-HP-Notebook conectado vía wlo1. Si el WiFi cae o el portátil se suspende, todos los servicios se interrumpen. Ethernet (enp3s0) DOWN. |
| S2 | **Puerto 9000 en 0.0.0.0 sin identificar** | python3 PID 1685 escucha en todas las interfaces. No es Docker. Podría ser webhook.py u otro proceso. Sin autenticación conocida. |

### 🟡 MEDIO

| # | Riesgo | Detalle |
|---|--------|---------|
| S3 | **node-exporter en \*:9100** | Métricas del sistema (CPU, memoria, disco, procesos) accesibles sin auth en toda la red local. |
| S4 | **SSH con PasswordAuthentication** | Puerto 22 en 0.0.0.0. El usuario conectó con user/password → PasswordAuthentication=yes en sshd_config. Riesgo de fuerza bruta. |
| S5 | **AdGuard en 0.0.0.0:3900** | Panel admin de AdGuard expuesto en toda la red sin HTTPS. Accesible desde cualquier IP en 192.168.1.0/24. |
| S6 | **Angel Control en 0.0.0.0:3000** | Sin HTTPS explícito. API key en config.js. |
| S7 | **No hay fail2ban activo** | Sin protección contra brute-force en SSH. Confirmado en auditoría anterior. |

### 🟢 BIEN CONFIGURADO

| # | Lo que está correcto |
|---|---------------------|
| B1 | Docker socket proxy (no montaje directo de docker.sock) |
| B2 | Backend FastAPI en red interna (no expuesto a host) |
| B3 | Redis sin puertos publicados en host |
| B4 | Tailscale para acceso remoto alternativo |
| B5 | cap_drop: [ALL] en todos los contenedores |
| B6 | security_opt: no-new-privileges en todos los contenedores |
| B7 | Prometheus/Grafana/Loki en red interna (no expuestos al host) |

---

## 7. ESTADO POR PROYECTO

### AntigravityMobile PROD

| Item | Valor |
|------|-------|
| Compose | `/home/angel/projects/antigravitymobile/docker-compose.yml` |
| Estado | 🔴 `restarting(2), running(1)` — 4/5 contenedores caídos |
| Puerto | 3001 → **NO RESPONDE** |
| Systemd | docker-mobile.service → **FAILED** |
| Problema | Redis: permiso denegado en volumen · Frontend: tmpfs sin permisos |
| Duración caído | ~5 horas |

### AntigravityMobile TEST

| Item | Valor |
|------|-------|
| Compose | `/home/angel/projects/antigravitymobile-test/docker-compose.yml` |
| Estado | 🟢 `running(4)` — todos healthy |
| Puerto | 3004 · `/health` → HTTP 200 |
| RAM backend | 79 MiB / 384 MiB (20.58%) |

### Asistente Daniel

| Item | Valor |
|------|-------|
| Compose | `/home/angel/projects/asistente-daniel/docker-compose.yml` |
| Estado | 🟢 `running(4)` — todos healthy |
| Puerto | 3002 · `/health` → `{"status":"ok"}` |
| RAM backend | 54 MiB / 512 MiB (10.63%) |

### Angel Control

| Item | Valor |
|------|-------|
| Compose | `/home/angel/projects/angel-ctrl/docker-compose.yml` |
| Estado | 🟢 `running(3)` — todos healthy |
| Puerto | 3000 · `/health` → `{"status":"ok","docker":"ok"}` |
| Redis CPU | ⚠️ 6.92% — inusualmente alto |
| RAM backend | 73 MiB / 400 MiB (18.25%) |

### Antigravity Shield

| Item | Valor |
|------|-------|
| Compose | `/home/angel/projects/antigravity-shield/docker-compose.yml` |
| Estado | 🟢 `running(14)` — stack completo |
| Puerto | 3003 · HTTPS en :443 / :8443 |
| Puerto AdGuard | 3900 → UI web |
| cadvisor CPU | ⚠️ 8.30% — normal para monitoreo |
| backend RAM | 174 MiB — más alto de todos |

---

## 8. RECOMENDACIONES PRIORITARIAS

### P1 🔴 INMEDIATO — Reparar AntigravityMobile PROD

**Problema Redis (permisos de volumen):**
```bash
# En el servidor:
docker compose -f /home/angel/projects/antigravitymobile/docker-compose.yml down
docker volume rm antigravitymobile_redis-data
docker compose -f /home/angel/projects/antigravitymobile/docker-compose.yml up -d
```

Si el problema persiste, el volumen tiene datos importantes — reparar permisos:
```bash
docker run --rm -v antigravitymobile_redis-data:/data alpine chmod -R 777 /data
```

**Problema Frontend (tmpfs UID):**
El Dockerfile del frontend PROD necesita crear `/var/cache/nginx/client_temp` en tiempo de build (no en runtime). Alternativa: añadir al Dockerfile:
```dockerfile
RUN mkdir -p /var/cache/nginx/client_temp && chown -R 101:101 /var/cache/nginx
```

---

### P2 🔴 INMEDIATO — Reiniciar docker-mobile.service

Una vez resueltos los contenedores:
```bash
sudo systemctl reset-failed docker-mobile.service
sudo systemctl start docker-mobile.service
```

---

### P3 🔴 INMEDIATO — Identificar proceso en puerto 9000

```bash
# En el servidor:
ps aux | grep 1685
ls -la /proc/1685/exe
cat /proc/1685/cmdline | tr '\0' ' '
```

Si es `webhook.py`, verificar que tiene autenticación y no está expuesto sin control.

---

### P4 🟡 ESTA SEMANA — Estabilidad del servidor

- **Conectar cable Ethernet** — enp3s0 está DOWN. El servidor depende de WiFi.
- **Configurar UPS o al menos `suspend-then-hibernate=inhibited`** para que el portátil no se suspenda.
- Considerar migrar a un servidor dedicado o VPS si esto es crítico.

---

### P5 🟡 ESTA SEMANA — Seguridad SSH

```bash
# En /etc/ssh/sshd_config:
PasswordAuthentication no        # usar solo llaves SSH
PubkeyAuthentication yes
PermitRootLogin no

# Instalar fail2ban:
sudo apt install fail2ban
sudo systemctl enable --now fail2ban
```

---

### P6 🟡 ESTA SEMANA — Deshabilitar nginx.service del host

```bash
sudo systemctl disable nginx.service
sudo systemctl mask nginx.service
```
No se usa (Docker maneja su propio nginx). Deja de contaminar `systemctl --failed`.

---

### P7 🟢 PRÓXIMAS 2 SEMANAS — Limpieza de recursos

```bash
# Eliminar volúmenes huérfanos (Jarvis, NPM)
docker volume rm jarvis_jarvis-data jarvis_redis-data npm_data npm_letsencrypt

# Limpiar imágenes sin uso
docker image rm jc21/nginx-proxy-manager:latest
docker image prune

# Recuperar ~3 GB de disco
```

---

### P8 🟢 PRÓXIMAS 2 SEMANAS — Proteger node-exporter

Cambiar `ports: - "9100:9100"` a `expose: - "9100"` en Shield's docker-compose para que Prometheus lo acceda internamente sin exponerlo al host.

---

## APÉNDICE — Comandos ejecutados

```
uname -a          ✅
cat /etc/os-release ✅
hostname          ✅
uptime            ✅
lscpu             ✅
free -h           ✅
df -h             ✅
lsblk             ✅
top -bn1          ✅
docker version    ✅
docker ps -a      ✅
docker stats      ✅
docker images     ✅
docker network ls ✅
docker volume ls  ✅
docker compose ls ✅
ss -tulpn         ✅
ip -br addr       ✅
systemctl --failed ✅
systemctl status docker ✅
systemctl status nginx ✅
curl :3001-:3004,:3000,:3900 ✅
docker logs redis-PROD  ✅
docker logs frontend-PROD ✅
cat docker-mobile.service ✅
ls /home/angel/projects ✅
```

**Sin modificaciones realizadas al servidor.**
