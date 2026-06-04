/**
 * AngelOS — Módulo Antigravity Hub
 * Chat multi-proveedor IA + gestión de servidores Docker.
 * Consume: antigravitymobile-test:3004
 */

(function () {
  'use strict';

  let ws = null;
  let wsDelay = 2000;
  let wsTimer = null;
  let _currentProvider = 'claude';
  let _messages = [];
  let _root = null;

  const PROVIDERS = ['claude', 'gemini', 'groq', 'cerebras', 'openrouter'];

  window.registerModule('hub', {
    onActivate(container) {
      _root = container;
      _render();
      _loadServers();
    },
    onDeactivate() {
      _disconnectWS();
    },
  });

  function _render() {
    _root.innerHTML = `
      <div class="mod-title">⬡ Antigravity Hub</div>

      <!-- Selector de proveedor -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
        ${PROVIDERS.map(p => `
          <button class="btn btn-sm provider-btn ${p === _currentProvider ? 'btn-primary' : ''}"
                  onclick="window._hubSetProvider('${p}')" id="prov-${p}">
            ${p}
          </button>
        `).join('')}
        <span id="hub-conn" class="badge badge-off" style="margin-left:auto;align-self:center;">Desconectado</span>
      </div>

      <!-- Chat -->
      <div id="chat-shell">
        <div id="chat-messages">
          <div class="msg msg-sys">Selecciona un proveedor y escribe</div>
        </div>
        <div id="chat-footer">
          <textarea id="chat-input" placeholder="Mensaje al hub…" rows="1"></textarea>
          <button class="btn btn-primary btn-sm" id="send-btn">▶</button>
        </div>
      </div>

      <!-- Servidores Docker -->
      <div class="card" style="margin-top:14px;">
        <div class="card-title" style="display:flex;justify-content:space-between;">
          <span>⊞ Contenedores Docker</span>
          <button class="btn btn-sm" onclick="window._hubLoadServers()">↺</button>
        </div>
        <div id="hub-servers"><div class="loading">Cargando…</div></div>
      </div>
    `;

    _$('send-btn').onclick = _sendMessage;
    _$('chat-input').onkeydown = e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendMessage(); }
    };
    _$('chat-input').oninput = function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    };

    _connectWS();
  }

  // ── WebSocket chat ────────────────────────────────────────────────────────
  function _connectWS() {
    _disconnectWS();
    try {
      ws = window.API.openWS('hub', '/ws/chat', {
        onopen() {
          _setBadge('hub-conn', 'Conectado', 'ok');
          wsDelay = 2000;
        },
        onmessage({ data }) {
          try {
            const msg = JSON.parse(data);
            if (msg.type === 'start') return;
            if (msg.type === 'chunk' || msg.delta) {
              _appendChunk(msg.delta || msg.content || '');
            } else if (msg.type === 'done' || msg.type === 'end') {
              _finalizeChunk();
            } else if (msg.error) {
              _appendMsg('sys', 'Error: ' + msg.error);
            }
          } catch {
            _appendChunk(data);
          }
        },
        onclose() {
          _setBadge('hub-conn', 'Desconectado', 'err');
          wsTimer = setTimeout(_connectWS, wsDelay);
          wsDelay = Math.min(wsDelay * 2, 30000);
        },
      });
    } catch {}
  }

  function _disconnectWS() {
    clearTimeout(wsTimer);
    if (ws) { try { ws.close(); } catch {} ws = null; }
  }

  // ── Streaming de respuesta ────────────────────────────────────────────────
  let _streamEl = null;
  let _streamBuf = '';

  function _appendChunk(delta) {
    if (!delta) return;
    _streamBuf += delta;
    if (!_streamEl) {
      _streamEl = document.createElement('div');
      _streamEl.className = 'msg msg-ai';
      const msgs = _$('chat-messages');
      if (msgs) { msgs.appendChild(_streamEl); msgs.scrollTop = msgs.scrollHeight; }
    }
    _streamEl.textContent = _streamBuf;
    const msgs = _$('chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function _finalizeChunk() {
    _streamEl = null;
    _streamBuf = '';
  }

  function _sendMessage() {
    const input = _$('chat-input');
    const text = input?.value.trim();
    if (!text || !ws || ws.readyState !== 1) return;
    _appendMsg('user', text);
    _messages.push({ role: 'user', content: text });
    ws.send(JSON.stringify({ provider: _currentProvider, messages: _messages }));
    input.value = '';
    input.style.height = 'auto';
  }

  function _appendMsg(role, text) {
    const msgs = _$('chat-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = `msg msg-${role}`;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    if (role === 'ai') _messages.push({ role: 'assistant', content: text });
  }

  window._hubSetProvider = function (p) {
    _currentProvider = p;
    document.querySelectorAll('.provider-btn').forEach(b => b.classList.remove('btn-primary'));
    const btn = document.getElementById('prov-' + p);
    if (btn) btn.classList.add('btn-primary');
  };

  // ── Servidores Docker ─────────────────────────────────────────────────────
  async function _loadServers() {
    const el = _$('hub-servers');
    if (!el) return;
    try {
      const data = await window.API.get('hub', '/servers/');
      const containers = Array.isArray(data) ? data : (data.containers || data.servers || []);
      if (!containers.length) { el.innerHTML = '<div class="empty">Sin contenedores</div>'; return; }
      el.innerHTML = `<div class="container-list">${containers.map(c => `
        <div class="container-card ${c.running ? 'running' : 'stopped'}">
          <div style="flex:1">
            <div class="ct-name">${c.name}</div>
            <div class="ct-status">${c.status || c.state || '—'}</div>
          </div>
          <div class="ct-actions">
            ${c.running
              ? `<button class="btn btn-danger btn-sm" onclick="window._hubCtrl('${c.id}','stop')">■</button>`
              : `<button class="btn btn-primary btn-sm" onclick="window._hubCtrl('${c.id}','start')">▶</button>`
            }
            <button class="btn btn-sm" onclick="window._hubCtrl('${c.id}','restart')">↺</button>
          </div>
        </div>
      `).join('')}</div>`;
    } catch (e) {
      el.innerHTML = `<div class="error">Error: ${e.message}</div>`;
    }
  }

  window._hubLoadServers = _loadServers;

  window._hubCtrl = async function (id, action) {
    try {
      await window.API.post('hub', `/servers/${id}/${action}`, {});
      setTimeout(_loadServers, 1500);
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
