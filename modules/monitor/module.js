/**
 * AngelOS — Módulo Monitor
 * PC Principal (agente remoto) + Servidor Ubuntu + estado de red.
 * API: daniel:3002/api/system/status  |  /api/system  |  /api/battery
 */
(function () {
  'use strict';

  let _pollTimer = null;

  window._MON = { refresh: _loadAll };

  window.AngelOS.register('monitor', {
    onActivate() {
      _loadAll();
      _pollTimer = setInterval(_loadAll, window.CFG.get('pollInterval') || 10000);
    },
    onDeactivate() {
      clearInterval(_pollTimer);
    },
  });

  // ── Carga completa ─────────────────────────────────────────────────────────
  async function _loadAll() {
    await Promise.all([_loadSystemStatus(), _checkServices()]);
    _stamp();
  }

  // ── Timestamp ──────────────────────────────────────────────────────────────
  function _stamp() {
    const el = _q('mon-updated');
    if (el) el.textContent = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // ── System status (PC + Servidor) ──────────────────────────────────────────
  async function _loadSystemStatus() {
    // Intenta primero el endpoint de monitoreo distribuido
    try {
      const data = await window.API.get('daniel', '/api/system/status');
      // Esperamos: { pc: {...}, server: {...} } o el texto formateado
      if (data.pc || data.server) {
        _renderPC(data.pc);
        _renderServer(data.server);
        return;
      }
    } catch {}

    // Fallback: /api/system (solo servidor) + /api/battery
    try {
      const [sys, bat] = await Promise.all([
        window.API.get('daniel', '/api/system'),
        window.API.get('daniel', '/api/battery').catch(() => ({ available: false })),
      ]);
      // PC sin datos del agente
      _renderPC(null);
      // Servidor con datos locales
      _renderServer({
        hostname:     sys.hostname || window.CFG.get('serverHost'),
        cpu_percent:  sys.cpu,
        ram_percent:  sys.ram,
        disk_percent: sys.disk,
        battery_percent: bat.available ? bat.percent : null,
        power_plugged:   bat.available ? bat.plugged  : null,
        docker_containers_running: null,
        ip_address:   window.CFG.get('serverHost'),
        uptime:       null,
      });
    } catch {
      _setBadge('mon-sv-badge', 'Sin conexión', 'err');
    }
  }

  // ── Render PC Principal ────────────────────────────────────────────────────
  function _renderPC(pc) {
    if (!pc) {
      _setBadge('mon-pc-badge', 'Agente no conectado', 'warn');
      _q('mon-pc-host') && (_q('mon-pc-host').textContent = 'PC Principal');
      return;
    }
    _q('mon-pc-host') && (_q('mon-pc-host').textContent = pc.hostname || 'PC Principal');
    _setBadge('mon-pc-badge', pc.online !== false ? 'Online' : 'Offline', pc.online !== false ? 'ok' : 'err');

    _setBar('mon-pc-cpu',  pc.cpu_percent  || 0);
    _setBar('mon-pc-ram',  pc.ram_percent  || 0);
    _setBar('mon-pc-disk', pc.disk_percent || 0);

    const bat = pc.battery_percent;
    if (bat != null) {
      const pct = Math.round(bat);
      _setBar('mon-pc-bat', pct, (pc.power_plugged ? '⚡ ' : '🔋 ') + pct + '%');
    } else {
      _setVal('mon-pc-bat', 'N/A');
    }

    const meta = _q('mon-pc-meta');
    if (meta && pc.uptime) {
      meta.textContent = 'Uptime: ' + _fmtUptime(pc.uptime) + (pc.ip_address ? '\nIP: ' + pc.ip_address : '');
    }
  }

  // ── Render Servidor Ubuntu ─────────────────────────────────────────────────
  function _renderServer(sv) {
    if (!sv) return;
    _q('mon-sv-host') && (_q('mon-sv-host').textContent = sv.hostname || 'Servidor Ubuntu');
    _setBadge('mon-sv-badge', 'Online', 'ok');

    _setBar('mon-sv-cpu',  sv.cpu_percent  || 0);
    _setBar('mon-sv-ram',  sv.ram_percent  || 0);
    _setBar('mon-sv-disk', sv.disk_percent || 0);

    const docker = sv.docker_containers_running;
    _setVal('mon-sv-docker', docker != null ? docker + ' ctrs' : '—');

    const meta = _q('mon-sv-meta');
    if (meta) {
      const parts = [];
      if (sv.ip_address) parts.push('IP: ' + sv.ip_address);
      if (sv.uptime)     parts.push('Uptime: ' + _fmtUptime(sv.uptime));
      meta.textContent = parts.join('\n');
    }
  }

  // ── Verificar servicios ────────────────────────────────────────────────────
  async function _checkServices() {
    const el = _q('mon-services');
    if (!el) return;
    const cfg   = window.CFG.getAll();
    const host  = cfg.serverHost;
    const checks = [
      { name: 'Daniel',     url: `http://${host}:${cfg.ports.daniel}/health`    },
      { name: 'Hub',        url: `http://${host}:${cfg.ports.hub}/health`       },
      { name: 'Angel Ctrl', url: `http://${host}:${cfg.ports.angelCtrl}/health` },
      { name: 'Shield',     url: `http://${host}:${cfg.ports.shield}/health`    },
      { name: 'AdGuard',    url: `http://${host}:${cfg.ports.adguard}/`         },
    ];

    const results = await Promise.all(checks.map(async c => {
      const t0 = Date.now();
      try {
        const res = await fetch(c.url, { signal: AbortSignal.timeout(4000) });
        return { name: c.name, ok: res.ok, ms: Date.now() - t0 };
      } catch {
        return { name: c.name, ok: false, ms: null };
      }
    }));

    el.innerHTML = results.map(r => `
      <div class="mon-svc">
        <div>
          <div class="mon-svc-name">${r.name}</div>
          <div class="mon-svc-latency">${r.ms != null ? r.ms + ' ms' : '—'}</div>
        </div>
        <span class="badge ${r.ok ? 'badge-ok' : 'badge-err'}">${r.ok ? 'OK' : 'DOWN'}</span>
      </div>
    `).join('');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function _fmtUptime(secs) {
    if (!secs) return '?';
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d) return `${d}d ${h}h ${m}m`;
    if (h) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function _q(id) { return document.getElementById(id); }

  function _setVal(id, v) { const e = _q(id); if (e) e.textContent = v; }

  function _setBar(prefix, pct, label) {
    const bar = _q(prefix + '-bar');
    const val = _q(prefix);
    const p   = Math.min(Math.round(pct), 100);
    if (bar) {
      bar.style.width = p + '%';
      bar.className   = 'bar-fill' + (p > 90 ? ' crit' : p > 75 ? ' warn' : '');
    }
    if (val) val.textContent = label !== undefined ? label : p + '%';
  }

  function _setBadge(id, text, type) {
    const e = _q(id);
    if (e) { e.textContent = text; e.className = 'badge badge-' + type; }
  }

})();
