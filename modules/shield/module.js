/**
 * AngelOS — Módulo Shield
 * DNS AdGuard + monitoreo Prometheus/Grafana + estado de red.
 * API: antigravity-shield:3003
 */
(function () {
  'use strict';

  let _pollTimer = null;

  window._SH = { refresh: _loadAll };

  window.AngelOS.register('shield', {
    onActivate() {
      _loadAll();
      _pollTimer = setInterval(_loadAll, 20000);
    },
    onDeactivate() {
      clearInterval(_pollTimer);
    },
  });

  async function _loadAll() {
    await Promise.all([
      _loadHealth(),
      _loadDnsStats(),
      _loadNetStats(),
      _checkMonitoring(),
      _loadOverall(),
    ]);
  }

  // ── Health ─────────────────────────────────────────────────────────────────
  async function _loadHealth() {
    try {
      await window.API.get('shield', '/health');
      _badge('sh-conn', 'Conectado', 'ok');
    } catch {
      _badge('sh-conn', 'Sin conexión', 'err');
    }
  }

  // ── Stats AdGuard DNS ──────────────────────────────────────────────────────
  async function _loadDnsStats() {
    const el = _q('sh-dns-stats');
    if (!el) return;
    try {
      // El Shield backend proxea AdGuard a través de su API
      const data = await window.API.get('shield', '/api/adguard/stats')
        .catch(() => window.API.get('shield', '/api/dns/stats'))
        .catch(() => null);

      if (!data) {
        el.innerHTML = _row('DNS', '<span class="badge badge-ok">Activo</span>') +
                       _row('Stats', '<span style="color:var(--dim)">No expuestas</span>');
        return;
      }

      const total   = data.num_dns_queries        || 0;
      const blocked = data.num_blocked_filtering  || 0;
      const pct     = total ? Math.round((blocked / total) * 100) : 0;

      el.innerHTML = [
        _row('Consultas hoy',  `<span class="sh-stat-val">${total.toLocaleString()}</span>`),
        _row('Bloqueadas',     `<span class="sh-stat-val blocked">${blocked.toLocaleString()} (${pct}%)</span>`),
        _row('Clientes activos', `<span class="sh-stat-val">${data.num_active_clients || '—'}</span>`),
        _row('Avg latencia',   `<span class="sh-stat-val">${data.avg_processing_time != null ? Math.round(data.avg_processing_time) + ' ms' : '—'}</span>`),
      ].join('');
    } catch {
      el.innerHTML = '<div class="error">Error cargando stats DNS</div>';
    }
  }

  // ── Stats de red ───────────────────────────────────────────────────────────
  async function _loadNetStats() {
    const el = _q('sh-net-stats');
    if (!el) return;
    try {
      const data = await window.API.get('shield', '/api/network/stats')
        .catch(() => window.API.get('shield', '/api/metrics'))
        .catch(() => null);

      if (!data) {
        el.innerHTML = _row('Estado', '<span class="badge badge-ok">Red OK</span>') +
                       _row('Métricas', '<span style="color:var(--dim)">No disponibles</span>');
        return;
      }

      const rows = [];
      if (data.devices_total  != null) rows.push(_row('Dispositivos', `<span class="sh-stat-val">${data.devices_total}</span>`));
      if (data.devices_online != null) rows.push(_row('Online', `<span class="sh-stat-val ok">${data.devices_online}</span>`));
      if (data.cpu_percent    != null) rows.push(_row('CPU Shield', `<span class="sh-stat-val">${Math.round(data.cpu_percent)}%</span>`));
      if (data.ram_percent    != null) rows.push(_row('RAM Shield', `<span class="sh-stat-val">${Math.round(data.ram_percent)}%</span>`));
      if (!rows.length) rows.push(_row('Datos', '<span style="color:var(--dim)">Sin estructura conocida</span>'));

      el.innerHTML = rows.join('');
    } catch {
      el.innerHTML = '<div class="empty">Métricas de red no disponibles</div>';
    }
  }

  // ── Servicios de monitoreo (Prometheus, Grafana, Loki, cAdvisor) ────────────
  async function _checkMonitoring() {
    const el = _q('sh-monitoring');
    if (!el) return;
    const host = window.CFG.get('serverHost');
    // Puertos internos del stack de monitoreo (expuestos localmente en el servidor)
    const checks = [
      { name: 'Prometheus',    url: `http://${host}:9090/-/healthy` },
      { name: 'Grafana',       url: `http://${host}:3003/grafana/api/health` },
      { name: 'Node Exporter', url: `http://${host}:9100/metrics` },
      { name: 'AdGuard UI',    url: `http://${host}:3900/` },
      { name: 'cAdvisor',      url: `http://${host}:8080/healthz` },
    ];

    const results = await Promise.all(checks.map(async c => {
      try {
        const r = await fetch(c.url, { signal: AbortSignal.timeout(3000) });
        return { name: c.name, ok: r.ok || r.status < 500 };
      } catch {
        return { name: c.name, ok: false };
      }
    }));

    el.innerHTML = results.map(r => `
      <div class="sh-mon-card">
        <span class="sh-mon-name">${r.name}</span>
        <span class="badge ${r.ok ? 'badge-ok' : 'badge-err'}">${r.ok ? 'OK' : 'DOWN'}</span>
      </div>
    `).join('');
  }

  // ── Estado general ─────────────────────────────────────────────────────────
  async function _loadOverall() {
    const el = _q('sh-overall');
    if (!el) return;
    const cfg  = window.CFG.getAll();
    const host = cfg.serverHost;

    const services = [
      { name: 'Daniel',      port: cfg.ports.daniel,    path: '/health'    },
      { name: 'Hub',         port: cfg.ports.hub,       path: '/health'    },
      { name: 'Angel Ctrl',  port: cfg.ports.angelCtrl, path: '/health'    },
      { name: 'Shield',      port: cfg.ports.shield,    path: '/health'    },
      { name: 'AdGuard',     port: cfg.ports.adguard,   path: '/'          },
    ];

    const results = await Promise.all(services.map(async s => {
      try {
        const r = await fetch(`http://${host}:${s.port}${s.path}`, { signal: AbortSignal.timeout(3000) });
        return { ...s, ok: r.ok };
      } catch {
        return { ...s, ok: false };
      }
    }));

    const ok  = results.filter(r => r.ok).length;
    const all = results.length;

    el.innerHTML = `
      <div class="sh-overall-row">
        <span style="color:var(--dim)">Servicios activos</span>
        <span style="color:${ok === all ? 'var(--accent2)' : ok > 0 ? 'var(--warn)' : 'var(--error)'};font-weight:bold">
          ${ok} / ${all}
        </span>
      </div>
      ${results.map(r => `
        <div class="sh-overall-row">
          <span style="color:var(--dim)">${r.name} :${r.port}</span>
          <span class="badge ${r.ok ? 'badge-ok' : 'badge-err'}">${r.ok ? 'OK' : 'DOWN'}</span>
        </div>
      `).join('')}
    `;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function _row(label, valHtml) {
    return `<div class="sh-stat-row"><span class="sh-stat-label">${label}</span>${valHtml}</div>`;
  }
  function _q(id) { return document.getElementById(id); }
  function _badge(id, text, type) {
    const e = _q(id);
    if (e) { e.textContent = text; e.className = 'badge badge-' + type; }
  }

})();
