/**
 * AngelOS — Módulo Dashboard
 * Vista principal: estado de todos los servicios + métricas + contenedores.
 */
(function () {
  'use strict';

  let _poll = null;
  let _clockTick = null;

  const SERVICES = [
    { id: 'daniel',      name: 'Daniel',     project: 'daniel',     path: '/health',  port: null, nav: 'daniel'        },
    { id: 'hub',         name: 'Hub',        project: 'hub',        path: '/health',  port: null, nav: 'angel-control'  },
    { id: 'angel-ctrl',  name: 'Angel Ctrl', project: 'angelCtrl',  path: '/health',  port: null, nav: 'angel-control'  },
    { id: 'shield',      name: 'Shield',     project: 'shield',     path: '/health',  port: null, nav: 'shield'         },
  ];

  window.AngelOS.register('dashboard', {
    onActivate(container) {
      _startClock();
      _loadAll();
      _poll = setInterval(_loadAll, window.CFG.get('pollInterval') || 10000);
    },
    onDeactivate() {
      clearInterval(_poll);
      clearInterval(_clockTick);
    },
  });

  // ── Reloj ──────────────────────────────────────────────────────────────────
  function _startClock() {
    function tick() {
      const el = document.getElementById('db-time');
      if (el) el.textContent = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    tick();
    _clockTick = setInterval(tick, 1000);
  }

  // ── Carga completa ─────────────────────────────────────────────────────────
  async function _loadAll() {
    await Promise.all([
      _checkServices(),
      _loadMetrics(),
      _loadContainers(),
    ]);
  }

  // ── Estado de servicios ────────────────────────────────────────────────────
  async function _checkServices() {
    const el = document.getElementById('db-services');
    if (!el) return;

    const results = await Promise.all(SERVICES.map(async svc => {
      const url = window.CFG.url(svc.project, svc.path);
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        return { ...svc, ok: res.ok, code: res.status };
      } catch {
        return { ...svc, ok: false, code: 0 };
      }
    }));

    el.innerHTML = results.map(r => `
      <div class="db-svc-card ${r.ok ? 'ok' : 'err'}" onclick="window.AngelOS.navigate('${r.nav}')">
        <div class="db-svc-name">${r.name}</div>
        <span class="badge ${r.ok ? 'badge-ok' : 'badge-err'}">${r.ok ? 'Online' : 'Down'}</span>
        <div class="db-svc-port">:${window.CFG.getAll().ports[r.project] || '—'}</div>
      </div>
    `).join('');
  }

  // ── Métricas del servidor ──────────────────────────────────────────────────
  async function _loadMetrics() {
    try {
      const d = await window.API.get('daniel', '/api/system');
      _setMetric('dbm-cpu-bar',  d.cpu,  d.cpu  + '%');
      _setMetric('dbm-ram-bar',  d.ram,  d.ram  + '%');
      _setMetric('dbm-disk-bar', d.disk, d.disk + '%');
    } catch { /* daniel puede estar caído */ }

    try {
      const b = await window.API.get('daniel', '/api/battery');
      if (b.available) {
        _setMetric('dbm-bat-bar', b.percent, Math.round(b.percent) + '%' + (b.plugged ? ' ⚡' : ''));
      }
    } catch {}
  }

  function _setMetric(barId, pct, label) {
    const bar = document.getElementById(barId);
    if (bar) {
      bar.style.width = Math.min(pct, 100) + '%';
      bar.className = 'bar-fill' + (pct > 90 ? ' crit' : pct > 75 ? ' warn' : '');
      // El valor está en el elemento hermano anterior .dbm-value
      const card = bar.closest('.db-metric-card');
      const val  = card?.querySelector('.dbm-value');
      if (val) val.textContent = label;
    }
  }

  // ── Contenedores Docker ────────────────────────────────────────────────────
  async function _loadContainers() {
    const el      = document.getElementById('db-containers');
    const summary = document.getElementById('db-ct-summary');
    if (!el) return;

    try {
      const data = await window.API.get('angelCtrl', '/api/containers');
      const containers = Array.isArray(data) ? data : (data.containers || []);

      const running = containers.filter(c => c.running || c.state === 'running' || c.status === 'running');
      if (summary) {
        summary.className = 'badge badge-ok';
        summary.textContent = `${running.length}/${containers.length} activos`;
      }

      el.innerHTML = containers.slice(0, 20).map(c => {
        const isRunning = c.running || c.state === 'running' || c.status === 'running';
        return `
          <div class="db-ct-row">
            <div class="db-ct-dot ${isRunning ? 'run' : 'stop'}"></div>
            <div class="db-ct-name">${c.name}</div>
            <div class="db-ct-status">${c.status || c.state || '—'}</div>
          </div>
        `;
      }).join('');
    } catch {
      el.innerHTML = '<div class="error">No se pudo cargar contenedores</div>';
      if (summary) { summary.className = 'badge badge-err'; summary.textContent = 'error'; }
    }
  }

})();
