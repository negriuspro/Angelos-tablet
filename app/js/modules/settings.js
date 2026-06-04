/**
 * AngelOS — Módulo Configuración
 * Edición de IPs, puertos y tokens directamente desde la tablet.
 */

(function () {
  'use strict';

  let _root = null;

  window.registerModule('settings', {
    onActivate(container) {
      _root = container;
      _render();
    },
    onDeactivate() {},
  });

  function _render() {
    const cfg = window.CFG.getAll();
    _root.innerHTML = `
      <div class="mod-title">⚙ Configuración</div>

      <div class="card">
        <div class="card-title">Servidor Ubuntu</div>
        <div class="field-group">
          <div class="field">
            <label>IP del Servidor</label>
            <input id="cfg-host" type="text" value="${cfg.serverHost}" placeholder="192.168.100.6">
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Puertos de Proyectos</div>
        <div class="field-group">
          <div class="field">
            <label>Daniel</label>
            <input id="cfg-port-daniel" type="number" value="${cfg.ports.daniel}">
          </div>
          <div class="field">
            <label>Antigravity Hub</label>
            <input id="cfg-port-hub" type="number" value="${cfg.ports.hub}">
          </div>
          <div class="field">
            <label>Angel Ctrl</label>
            <input id="cfg-port-angelCtrl" type="number" value="${cfg.ports.angelCtrl}">
          </div>
          <div class="field">
            <label>Shield</label>
            <input id="cfg-port-shield" type="number" value="${cfg.ports.shield}">
          </div>
          <div class="field">
            <label>AdGuard Admin</label>
            <input id="cfg-port-adguard" type="number" value="${cfg.ports.adguard}">
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Credenciales</div>
        <div class="field-group">
          <div class="field">
            <label>Daniel Admin Token</label>
            <input id="cfg-daniel-token" type="password" value="${cfg.danielAdminToken}" placeholder="Dejar vacío si no aplica">
          </div>
          <div class="field">
            <label>Angel Ctrl API Key</label>
            <input id="cfg-angelctrl-key" type="password" value="${cfg.angelCtrlApiKey}" placeholder="Dejar vacío si no aplica">
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Comportamiento</div>
        <div class="field-group">
          <div class="field">
            <label>Intervalo de polling (ms)</label>
            <input id="cfg-poll" type="number" value="${cfg.pollInterval}" min="2000" max="60000" step="1000">
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:4px;">
        <button class="btn btn-primary btn-block" id="cfg-save">✓ Guardar</button>
        <button class="btn btn-block" id="cfg-reset">↺ Restablecer</button>
      </div>
      <div id="cfg-msg" style="margin-top:10px;text-align:center;font-size:11px;color:var(--dim);letter-spacing:2px;"></div>

      <div class="card" style="margin-top:14px;">
        <div class="card-title">Sobre AngelOS</div>
        <div style="font-size:11px;color:var(--dim);line-height:1.8;">
          Versión: 1.0.0<br>
          Plataforma: Tablet / Android legacy<br>
          Servidor: <span id="cfg-server-info">${cfg.serverHost}</span><br>
          Módulos activos: Daniel · Hub · Angel Ctrl · Shield
        </div>
      </div>
    `;

    _$('cfg-save').onclick  = _save;
    _$('cfg-reset').onclick = _reset;
  }

  function _save() {
    const host = _$('cfg-host')?.value.trim();
    if (!host) { _msg('IP del servidor requerida', 'error'); return; }

    window.CFG.save({
      serverHost: host,
      danielAdminToken: _$('cfg-daniel-token')?.value || '',
      angelCtrlApiKey:  _$('cfg-angelctrl-key')?.value || '',
      pollInterval:     parseInt(_$('cfg-poll')?.value || '10000'),
      ports: {
        daniel:    parseInt(_$('cfg-port-daniel')?.value   || '3002'),
        hub:       parseInt(_$('cfg-port-hub')?.value      || '3004'),
        angelCtrl: parseInt(_$('cfg-port-angelCtrl')?.value || '3000'),
        shield:    parseInt(_$('cfg-port-shield')?.value   || '3003'),
        adguard:   parseInt(_$('cfg-port-adguard')?.value  || '3900'),
      },
    });
    _msg('Configuración guardada', 'ok');
  }

  function _reset() {
    localStorage.removeItem('angelos_config');
    window.CFG._data = window.CFG._load();
    _render();
    _msg('Configuración restablecida', 'warn');
  }

  function _msg(text, type) {
    const el = _$('cfg-msg');
    if (!el) return;
    const colors = { ok: 'var(--accent2)', error: 'var(--error)', warn: 'var(--warn)' };
    el.style.color = colors[type] || 'var(--dim)';
    el.textContent = text;
    setTimeout(() => { if (el) el.textContent = ''; }, 3000);
  }

  function _$(id) { return document.getElementById(id); }

})();
