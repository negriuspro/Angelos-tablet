/**
 * AngelOS — Módulo Settings
 * Configuración de IP, puertos, tokens. Diagnóstico de conexión.
 */
(function () {
  'use strict';

  window.AngelOS.register('settings', {
    onActivate() { _populate(); _bindEvents(); },
    onDeactivate() {},
  });

  // ── Poblar formulario con valores actuales ─────────────────────────────────
  function _populate() {
    const cfg = window.CFG.getAll();

    _val('cfg-host',        cfg.serverHost);
    _val('cfg-p-daniel',    cfg.ports.daniel);
    _val('cfg-p-hub',       cfg.ports.hub);
    _val('cfg-p-angelCtrl', cfg.ports.angelCtrl);
    _val('cfg-p-shield',    cfg.ports.shield);
    _val('cfg-p-adguard',   cfg.ports.adguard);
    _val('cfg-dan-token',   cfg.danielAdminToken || '');
    _val('cfg-ac-key',      cfg.angelCtrlApiKey  || '');
    _val('cfg-poll',        cfg.pollInterval);

    const urlEl = _q('cfg-server-url');
    if (urlEl) urlEl.textContent = `http://${cfg.serverHost}:${cfg.ports.daniel || 3002}`;
  }

  // ── Eventos ────────────────────────────────────────────────────────────────
  function _bindEvents() {
    _q('cfg-save-btn')?.addEventListener('click',  _save);
    _q('cfg-reset-btn')?.addEventListener('click', _reset);
    _q('cfg-test-btn')?.addEventListener('click',  _testConnections);
  }

  // ── Guardar ────────────────────────────────────────────────────────────────
  function _save() {
    const host = _q('cfg-host')?.value.trim();
    if (!host) { _flash('IP requerida', 'badge-err'); return; }

    window.CFG.save({
      serverHost:       host,
      danielAdminToken: _q('cfg-dan-token')?.value || '',
      angelCtrlApiKey:  _q('cfg-ac-key')?.value    || '',
      pollInterval:     parseInt(_q('cfg-poll')?.value || '10000'),
      ports: {
        daniel:    _int('cfg-p-daniel',    3002),
        hub:       _int('cfg-p-hub',       3001),
        angelCtrl: _int('cfg-p-angelCtrl', 3000),
        shield:    _int('cfg-p-shield',    3003),
        adguard:   _int('cfg-p-adguard',   3900),
      },
    });

    _flash('Guardado ✓', 'badge-ok');

    // Actualizar URL en la sección "Acerca de"
    const urlEl = _q('cfg-server-url');
    if (urlEl) urlEl.textContent = `http://${host}:${_int('cfg-p-daniel', 3002)}`;
  }

  // ── Restablecer ────────────────────────────────────────────────────────────
  function _reset() {
    if (!confirm('¿Restablecer todos los valores por defecto?')) return;
    localStorage.removeItem('angelos_config');
    // Recargar config desde defaults
    window.CFG._data = window.CFG._load();
    _populate();
    _flash('Valores restablecidos', 'badge-warn');
  }

  // ── Diagnóstico ────────────────────────────────────────────────────────────
  async function _testConnections() {
    const el = _q('cfg-diag');
    if (!el) return;

    const host = _q('cfg-host')?.value.trim() || window.CFG.get('serverHost');
    const ports = {
      Daniel:       _int('cfg-p-daniel',    3002),
      Hub:          _int('cfg-p-hub',       3001),
      'Angel Ctrl': _int('cfg-p-angelCtrl', 3000),
      Shield:       _int('cfg-p-shield',    3003),
      AdGuard:      _int('cfg-p-adguard',   3900),
    };

    el.innerHTML = '<div class="loading">Probando conexiones…</div>';

    const results = await Promise.all(
      Object.entries(ports).map(async ([name, port]) => {
        const t0 = Date.now();
        try {
          const r = await fetch(`http://${host}:${port}/health`, {
            signal: AbortSignal.timeout(4000),
          });
          return { name, port, ok: r.ok, ms: Date.now() - t0 };
        } catch {
          // Intentar con / si /health no existe
          try {
            const r = await fetch(`http://${host}:${port}/`, {
              signal: AbortSignal.timeout(4000),
            });
            return { name, port, ok: true, ms: Date.now() - t0 };
          } catch {
            return { name, port, ok: false, ms: null };
          }
        }
      })
    );

    el.innerHTML = results.map(r => `
      <div class="cfg-diag-row">
        <div>
          <div class="cfg-diag-name">${r.name} — :${r.port}</div>
          <div class="cfg-diag-ms">${r.ms != null ? r.ms + ' ms' : 'timeout'}</div>
        </div>
        <span class="badge ${r.ok ? 'badge-ok' : 'badge-err'}">${r.ok ? 'OK' : 'Error'}</span>
      </div>
    `).join('');
  }

  // ── Flash badge ────────────────────────────────────────────────────────────
  function _flash(msg, cls) {
    const el = _q('cfg-saved');
    if (!el) return;
    el.textContent  = msg;
    el.className    = 'badge ' + cls;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2500);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function _q(id)        { return document.getElementById(id); }
  function _val(id, v)   { const e = _q(id); if (e) e.value = v; }
  function _int(id, def) { return parseInt(_q(id)?.value || def) || def; }

})();
