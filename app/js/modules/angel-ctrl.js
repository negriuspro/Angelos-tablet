/**
 * AngelOS — Módulo Angel Ctrl
 * Gestión completa de contenedores Docker + métricas + IA.
 * Consume: interfazdocker (angel-ctrl):3000
 */

(function () {
  'use strict';

  let _root = null;
  let _pollTimer = null;

  window.registerModule('angelctrl', {
    onActivate(container) {
      _root = container;
      _render();
      _loadAll();
    },
    onDeactivate() {
      clearInterval(_pollTimer);
    },
  });

  function _render() {
    _root.innerHTML = `
      <div class="mod-title">⊞ Angel Ctrl — Docker Manager</div>

      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <span id="ac-conn" class="badge badge-off">Verificando…</span>
        <button class="btn btn-sm" onclick="window._acRefresh()">↺ Refrescar</button>
      </div>

      <!-- Métricas -->
      <div class="grid-2" style="margin-bottom:12px;">
        <div class="card">
          <div class="card-title">📊 Métricas</div>
          <div class="metric-row" id="ac-metrics">
            <div class="loading">Cargando…</div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">🐳 Resumen</div>
          <div id="ac-summary" style="font-size:12px;line-height:1.8;color:var(--text);">—</div>
        </div>
      </div>

      <!-- Contenedores -->
      <div class="card">
        <div class="card-title">Contenedores</div>
        <div id="ac-containers"><div class="loading">Cargando…</div></div>
      </div>
    `;

    // Poll cada 15s
    _pollTimer = setInterval(_loadAll, 15000);
  }

  async function _loadAll() {
    await Promise.all([_loadHealth(), _loadContainers(), _loadMetrics()]);
  }

  async function _loadHealth() {
    try {
      await window.API.get('angelCtrl', '/health');
      _setBadge('ac-conn', 'Conectado', 'ok');
    } catch {
      _setBadge('ac-conn', 'Sin conexión', 'err');
    }
  }

  async function _loadMetrics() {
    try {
      const data = await window.API.get('angelCtrl', '/api/metrics');
      const mr = _$('ac-metrics');
      if (!mr) return;
      const metrics = [
        { label: 'CPU',   val: data.cpu_percent  || 0 },
        { label: 'RAM',   val: data.ram_percent  || 0 },
        { label: 'Disco', val: data.disk_percent || 0 },
      ];
      mr.innerHTML = metrics.map(m => `
        <div class="metric-item">
          <div class="metric-lbl"><span>${m.label}</span><span class="metric-val">${Math.round(m.val)}%</span></div>
          <div class="bar-track"><div class="bar-fill${m.val > 90 ? ' crit' : m.val > 75 ? ' warn' : ''}" style="width:${Math.min(m.val,100)}%"></div></div>
        </div>
      `).join('');
    } catch { /* silencioso */ }
  }

  async function _loadContainers() {
    const el = _$('ac-containers');
    const summary = _$('ac-summary');
    if (!el) return;
    try {
      const data = await window.API.get('angelCtrl', '/api/containers');
      const containers = Array.isArray(data) ? data : (data.containers || []);

      if (summary) {
        const running = containers.filter(c => c.running || c.state === 'running').length;
        summary.innerHTML = `
          Total: <b style="color:var(--text)">${containers.length}</b><br>
          Activos: <b style="color:var(--accent2)">${running}</b><br>
          Detenidos: <b style="color:var(--dim)">${containers.length - running}</b>
        `;
      }

      if (!containers.length) { el.innerHTML = '<div class="empty">Sin contenedores</div>'; return; }

      el.innerHTML = `<div class="container-list">${containers.map(c => {
        const running = c.running || c.state === 'running' || c.status === 'running';
        return `
          <div class="container-card ${running ? 'running' : 'stopped'}">
            <div style="flex:1;min-width:0">
              <div class="ct-name">${c.name}</div>
              <div class="ct-status">${c.image || ''} · ${c.status || c.state || '—'}</div>
            </div>
            <div class="ct-actions">
              ${running
                ? `<button class="btn btn-danger btn-sm" onclick="window._acAction('${c.id}','stop')">■ Stop</button>`
                : `<button class="btn btn-primary btn-sm" onclick="window._acAction('${c.id}','start')">▶ Start</button>`
              }
              <button class="btn btn-sm" onclick="window._acAction('${c.id}','restart')">↺</button>
            </div>
          </div>
        `;
      }).join('')}</div>`;
    } catch (e) {
      el.innerHTML = `<div class="error">Error: ${e.message}</div>`;
    }
  }

  window._acRefresh = _loadAll;

  window._acAction = async function (id, action) {
    try {
      await window.API.post('angelCtrl', `/api/containers/${id}/${action}`, {});
      setTimeout(_loadContainers, 2000);
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  function _$(id) { return _root ? _root.querySelector('#' + id) || document.getElementById(id) : document.getElementById(id); }
  function _setBadge(id, text, type = 'off') {
    const el = _$(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'badge badge-' + type;
  }

})();
