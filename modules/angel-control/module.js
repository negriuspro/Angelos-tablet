/**
 * AngelOS — Módulo Angel Control
 * Gestión completa de contenedores Docker + métricas del sistema.
 * API primaria: angel-ctrl:3000  |  fallback: hub:3004/servers
 */
(function () {
  'use strict';

  let _containers = [];
  let _filter     = 'all';
  let _pollTimer  = null;

  window._AC = {
    refresh:      () => _loadAll(),
    action:       (id, action) => _doAction(id, action),
    setFilter:    (f) => _setFilter(f),
  };

  window.AngelOS.register('angel-control', {
    onActivate() {
      _initFilterBtns();
      _loadAll();
      _pollTimer = setInterval(_loadAll, 15000);
    },
    onDeactivate() {
      clearInterval(_pollTimer);
    },
  });

  // ── Filtros ────────────────────────────────────────────────────────────────
  function _initFilterBtns() {
    document.querySelectorAll('.ac-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => _setFilter(btn.dataset.filter));
    });
  }

  function _setFilter(f) {
    _filter = f;
    document.querySelectorAll('.ac-filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === f);
    });
    _renderContainers();
  }

  // ── Carga ──────────────────────────────────────────────────────────────────
  async function _loadAll() {
    await Promise.all([_loadHealth(), _loadMetrics(), _loadContainers()]);
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
      const d = await window.API.get('angelCtrl', '/api/metrics');
      _setText('ac-cpu', Math.round(d.cpu_percent  || 0) + '%');
      _setText('ac-ram', Math.round(d.ram_percent  || 0) + '%');
    } catch {
      // Si angel-ctrl no tiene /api/metrics, intentar con Daniel
      try {
        const d = await window.API.get('daniel', '/api/system');
        _setText('ac-cpu', d.cpu  + '%');
        _setText('ac-ram', d.ram  + '%');
      } catch {}
    }
  }

  async function _loadContainers() {
    try {
      // Intentar Angel Ctrl primero, luego Hub como fallback
      let data;
      try {
        data = await window.API.get('angelCtrl', '/api/containers');
      } catch {
        data = await window.API.get('hub', '/servers/');
      }
      _containers = Array.isArray(data) ? data : (data.containers || data.servers || []);
    } catch (e) {
      const el = document.getElementById('ac-containers');
      if (el) el.innerHTML = `<div class="error">Error: ${e.message}</div>`;
      return;
    }

    // Resumen
    const running = _containers.filter(_isRunning);
    _setText('ac-total',   _containers.length);
    _setText('ac-running', running.length);
    _setText('ac-stopped', _containers.length - running.length);

    _renderContainers();
  }

  function _renderContainers() {
    const el = document.getElementById('ac-containers');
    if (!el) return;

    let list = _containers;
    if (_filter === 'running') list = list.filter(_isRunning);
    if (_filter === 'stopped') list = list.filter(c => !_isRunning(c));

    if (!list.length) {
      el.innerHTML = '<div class="empty">Sin contenedores para mostrar</div>';
      return;
    }

    el.innerHTML = list.map(c => {
      const running     = _isRunning(c);
      const restarting  = (c.status || c.state || '').includes('restart');
      const stateClass  = restarting ? 'restarting' : running ? 'running' : 'stopped';
      return `
        <div class="ac-card ${stateClass}">
          <div class="ac-info">
            <div class="ac-name">${c.name}</div>
            <div class="ac-detail">${c.image || ''} · ${c.status || c.state || '—'}</div>
          </div>
          <div class="ac-actions">
            ${running
              ? `<button class="btn btn-danger btn-sm" onclick="window._AC.action('${c.id}','stop')">■</button>`
              : `<button class="btn btn-primary btn-sm" onclick="window._AC.action('${c.id}','start')">▶</button>`
            }
            <button class="btn btn-sm" onclick="window._AC.action('${c.id}','restart')">↺</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Acciones ───────────────────────────────────────────────────────────────
  async function _doAction(id, action) {
    const btn = event?.target;
    if (btn) { btn.disabled = true; btn.textContent = '…'; }

    try {
      // Intentar Angel Ctrl primero, luego Hub
      try {
        await window.API.post('angelCtrl', `/api/containers/${id}/${action}`, {});
      } catch {
        await window.API.post('hub', `/servers/${id}/${action}`, {});
      }
      setTimeout(_loadContainers, 1800);
    } catch (e) {
      alert(`Error al ${action}: ${e.message}`);
    } finally {
      if (btn) { btn.disabled = false; }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function _isRunning(c) {
    return c.running || c.state === 'running' || c.status === 'running'
        || (c.status || '').startsWith('Up');
  }

  function _q(id)      { return document.getElementById(id); }
  function _setText(id, v) { const e = _q(id); if (e) e.textContent = v; }
  function _setBadge(id, text, type) {
    const e = _q(id);
    if (e) { e.textContent = text; e.className = 'badge badge-' + type; }
  }

})();
