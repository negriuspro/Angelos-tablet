/**
 * AngelOS — Módulo Antigravity Shield
 * Estado DNS/AdGuard, métricas de red, alertas.
 * Consume: antigravity-shield:3003
 */

(function () {
  'use strict';

  let _root = null;
  let _pollTimer = null;

  window.registerModule('shield', {
    onActivate(container) {
      _root = container;
      _render();
      _loadAll();
      _pollTimer = setInterval(_loadAll, 20000);
    },
    onDeactivate() {
      clearInterval(_pollTimer);
    },
  });

  function _render() {
    _root.innerHTML = `
      <div class="mod-title">⊛ Antigravity Shield</div>

      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <span id="sh-conn"   class="badge badge-off">Verificando…</span>
        <span id="sh-dns"    class="badge badge-off">DNS —</span>
        <button class="btn btn-sm" onclick="window._shRefresh()">↺ Refrescar</button>
      </div>

      <!-- Stats AdGuard -->
      <div class="grid-2" style="margin-bottom:12px;">
        <div class="card">
          <div class="card-title">🛡 DNS Stats (hoy)</div>
          <div id="sh-dns-stats" style="font-size:13px;line-height:2;color:var(--text);">
            <div class="loading">Cargando…</div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">📊 Sistema Shield</div>
          <div class="metric-row" id="sh-metrics">
            <div class="loading">Cargando…</div>
          </div>
        </div>
      </div>

      <!-- Estado de servicios -->
      <div class="card">
        <div class="card-title">Estado de Servicios</div>
        <div id="sh-services"><div class="loading">Verificando…</div></div>
      </div>
    `;
  }

  async function _loadAll() {
    await Promise.all([_loadHealth(), _loadDnsStats(), _loadMetrics(), _checkServices()]);
  }

  async function _loadHealth() {
    try {
      await window.API.get('shield', '/health');
      _setBadge('sh-conn', 'Conectado', 'ok');
    } catch {
      _setBadge('sh-conn', 'Sin conexión', 'err');
    }
  }

  async function _loadDnsStats() {
    const el = _$('sh-dns-stats');
    if (!el) return;
    try {
      // AdGuard expone stats en /api/stats (proxied por nginx del shield)
      const data = await window.API.get('shield', '/api/adguard/stats').catch(() => null);
      if (!data) {
        el.innerHTML = '<div class="empty">Stats no disponibles</div>';
        _setBadge('sh-dns', 'DNS activo', 'ok');
        return;
      }
      el.innerHTML = `
        Consultas: <b style="color:var(--accent)">${(data.num_dns_queries || 0).toLocaleString()}</b><br>
        Bloqueadas: <b style="color:var(--error)">${(data.num_blocked_filtering || 0).toLocaleString()}</b><br>
        % bloqueado: <b style="color:var(--warn)">${data.num_dns_queries ? Math.round((data.num_blocked_filtering / data.num_dns_queries) * 100) : 0}%</b><br>
        Clientes: <b style="color:var(--text)">${data.num_active_clients || '—'}</b>
      `;
      const blocked = data.num_dns_queries
        ? Math.round((data.num_blocked_filtering / data.num_dns_queries) * 100)
        : 0;
      _setBadge('sh-dns', `DNS ${blocked}% bloq.`, blocked > 30 ? 'ok' : 'warn');
    } catch {
      el.innerHTML = '<div class="error">Error cargando stats</div>';
    }
  }

  async function _loadMetrics() {
    const el = _$('sh-metrics');
    if (!el) return;
    try {
      const data = await window.API.get('shield', '/api/metrics').catch(() => null);
      if (!data) { el.innerHTML = '<div class="empty">Métricas no expuestas</div>'; return; }
      const metrics = [
        { label: 'CPU',   val: data.cpu_percent  || 0 },
        { label: 'RAM',   val: data.ram_percent  || 0 },
        { label: 'Disco', val: data.disk_percent || 0 },
      ];
      el.innerHTML = metrics.map(m => `
        <div class="metric-item">
          <div class="metric-lbl"><span>${m.label}</span><span class="metric-val">${Math.round(m.val)}%</span></div>
          <div class="bar-track"><div class="bar-fill${m.val > 90 ? ' crit' : m.val > 75 ? ' warn' : ''}" style="width:${Math.min(m.val,100)}%"></div></div>
        </div>
      `).join('');
    } catch {
      el.innerHTML = '<div class="empty">Sin métricas</div>';
    }
  }

  async function _checkServices() {
    const el = _$('sh-services');
    if (!el) return;
    const cfg = window.CFG.getAll();
    const host = cfg.serverHost;
    const checks = [
      { name: 'Shield Backend',    url: `http://${host}:${cfg.ports.shield}/health` },
      { name: 'AdGuard Home',      url: `http://${host}:${cfg.ports.adguard}/` },
      { name: 'Angel Ctrl',        url: `http://${host}:${cfg.ports.angelCtrl}/health` },
      { name: 'Antigravity Hub',   url: `http://${host}:${cfg.ports.hub}/health` },
      { name: 'Daniel',            url: `http://${host}:${cfg.ports.daniel}/health` },
    ];

    el.innerHTML = '<div class="loading">Verificando…</div>';
    const results = await Promise.all(checks.map(async c => {
      try {
        const r = await fetch(c.url, { signal: AbortSignal.timeout(4000) });
        return { name: c.name, ok: r.ok };
      } catch {
        return { name: c.name, ok: false };
      }
    }));

    el.innerHTML = results.map(r => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:12px;color:var(--text)">${r.name}</span>
        <span class="badge ${r.ok ? 'badge-ok' : 'badge-err'}">${r.ok ? 'OK' : 'DOWN'}</span>
      </div>
    `).join('');
  }

  window._shRefresh = _loadAll;

  function _$(id) { return _root ? _root.querySelector('#' + id) || document.getElementById(id) : document.getElementById(id); }
  function _setBadge(id, text, type = 'off') {
    const el = _$(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'badge badge-' + type;
  }

})();
