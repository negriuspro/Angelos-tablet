/**
 * AngelOS — Módulo Hub IA
 * Chat multi-proveedor en streaming + panel Docker.
 * API: antigravitymobile hub (puerto configurado en Settings)
 *
 * Lógica portada y adaptada desde app/js/modules/hub.js.
 * Registro: window.AngelOS.register() — mismo patrón que todos los módulos.
 */
(function () {
  'use strict';

  // ── Estado ──────────────────────────────────────────────────────────────────
  let _ws        = null;
  let _wsDelay   = 2000;
  let _wsTimer   = null;
  let _streamEl  = null;
  let _streamBuf = '';
  let _currentProvider = 'claude';
  let _messages  = [];  // historial de conversación

  let _recognition = null;
  let _isListening = false;
  let _prevNativeResult = null;  // para restaurar en onDeactivate

  const PROVIDERS = ['claude', 'gemini', 'groq', 'cerebras', 'openrouter'];

  // ── Namespace público para botones inline en HTML ────────────────────────────
  window._HUB = {
    setProvider:    (p)       => _setProvider(p),
    refreshServers: ()        => _loadServers(),
    ctrlServer:     (id, act) => _ctrlServer(id, act),
  };

  // ── Registro en el router de AngelOS ────────────────────────────────────────
  window.AngelOS.register('hub', {

    onActivate() {
      // Capturar handler STT anterior para restaurarlo al salir
      _prevNativeResult = window.onNativeResult;
      window.onNativeResult = function (text, isFinal) {
        if (!isFinal) return;
        const input = _q('hub-input');
        if (input) { input.value = text; _sendMessage(); }
      };

      _renderProviders();
      _bindEvents();
      _connectWS();
      _loadServers();
    },

    onDeactivate() {
      // Restaurar handler STT del módulo anterior
      window.onNativeResult = _prevNativeResult;
      _prevNativeResult = null;

      _disconnectWS();
      _stopSTT();
    },
  });

  // ── Selector de proveedores ──────────────────────────────────────────────────
  function _renderProviders() {
    const el = _q('hub-providers');
    if (!el) return;
    el.innerHTML = PROVIDERS.map(p => `
      <button class="hub-prov-btn${p === _currentProvider ? ' active' : ''}"
              id="hub-p-${p}"
              onclick="window._HUB.setProvider('${p}')">
        ${p}
      </button>
    `).join('');
  }

  function _setProvider(p) {
    _currentProvider = p;
    document.querySelectorAll('.hub-prov-btn').forEach(b => b.classList.remove('active'));
    const btn = _q('hub-p-' + p);
    if (btn) btn.classList.add('active');
    // Limpiar historial al cambiar proveedor
    _messages = [];
    _streamEl = null;
    _streamBuf = '';
    _appendMsg('sys', 'Proveedor activo: ' + p);
  }

  // ── WebSocket chat ───────────────────────────────────────────────────────────
  function _connectWS() {
    _disconnectWS();
    _setBadge('hub-conn', 'Conectando…', 'off');

    try {
      _ws = window.API.openWS('hub', '/ws/chat', {
        onopen() {
          _setBadge('hub-conn', 'Conectado', 'ok');
          _wsDelay = 2000;
        },

        onmessage({ data }) {
          try {
            const msg = JSON.parse(data);
            if (msg.type === 'start') {
              // Inicio de streaming — se crea la burbuja en el primer chunk
              return;
            }
            if (msg.type === 'chunk' || msg.delta !== undefined || msg.content !== undefined) {
              _appendChunk(msg.delta || msg.content || msg.text || '');
              return;
            }
            if (msg.type === 'done' || msg.type === 'end') {
              _finalizeChunk();
              return;
            }
            if (msg.error) {
              _finalizeChunk();
              _appendMsg('sys', 'Error del servidor: ' + msg.error);
              return;
            }
          } catch (e) {
            // Texto plano (no JSON) — acumular como chunk
            _appendChunk(data);
          }
        },

        onclose() {
          _setBadge('hub-conn', 'Reconectando…', 'warn');
          _wsTimer = setTimeout(_connectWS, _wsDelay);
          _wsDelay = Math.min(_wsDelay * 2, 30000);
        },
      });
    } catch (e) {
      _setBadge('hub-conn', 'Error WS', 'err');
      console.warn('[Hub._connectWS] fallo al abrir WebSocket:', e.message);
    }
  }

  function _disconnectWS() {
    clearTimeout(_wsTimer);
    if (_ws) {
      try { _ws.close(); } catch (e) { /* cierre ya en curso */ }
      _ws = null;
    }
  }

  // ── Streaming de respuesta ───────────────────────────────────────────────────
  function _appendChunk(delta) {
    if (!delta) return;
    _streamBuf += delta;
    if (!_streamEl) {
      _streamEl = document.createElement('div');
      _streamEl.className = 'msg msg-ai';
      const msgs = _q('hub-messages');
      if (msgs) { msgs.appendChild(_streamEl); msgs.scrollTop = msgs.scrollHeight; }
    }
    _streamEl.textContent = _streamBuf;
    const msgs = _q('hub-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function _finalizeChunk() {
    if (_streamBuf) {
      _messages.push({ role: 'assistant', content: _streamBuf });
    }
    _streamEl  = null;
    _streamBuf = '';
  }

  // ── Envío de mensaje ─────────────────────────────────────────────────────────
  function _sendMessage() {
    const input = _q('hub-input');
    const text  = input?.value.trim();
    if (!text) return;

    if (!_ws || _ws.readyState !== 1) {
      _appendMsg('sys', 'Sin conexión al Hub — reintentando…');
      _connectWS();
      return;
    }

    _appendMsg('user', text);
    _messages.push({ role: 'user', content: text });

    _ws.send(JSON.stringify({
      provider: _currentProvider,
      messages: _messages,
    }));

    input.value = '';
    input.style.height = 'auto';
  }

  function _appendMsg(role, text) {
    const msgs = _q('hub-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = `msg msg-${role === 'user' ? 'user' : role === 'ai' ? 'ai' : 'sys'}`;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  // ── STT ──────────────────────────────────────────────────────────────────────
  function _toggleMic() {
    if (_isListening) { _stopSTT(); return; }
    // Si STT nativo Android está activo, onNativeResult ya lo maneja
    if (window.ANDROID_NATIVE) { return; }
    _startBrowserSTT();
  }

  function _startBrowserSTT() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { _appendMsg('sys', 'STT no disponible — escribe el mensaje'); return; }

    _recognition = new SR();
    _recognition.lang             = 'es-ES';
    _recognition.continuous       = false;
    _recognition.interimResults   = false;

    _recognition.onstart  = () => { _isListening = true; _micState('listening'); };
    _recognition.onresult = (e) => {
      const text = e.results[0][0].transcript.trim();
      if (text) {
        const input = _q('hub-input');
        if (input) { input.value = text; _sendMessage(); }
      }
    };
    _recognition.onend    = _stopSTT;
    _recognition.onerror  = (e) => {
      console.warn('[Hub.STT] error reconocimiento:', e.error);
      _stopSTT();
    };

    try {
      _recognition.start();
    } catch (e) {
      console.warn('[Hub.STT] start() falló:', e.message);
    }
  }

  function _stopSTT() {
    _isListening = false;
    _micState('');
    if (_recognition) {
      try { _recognition.stop(); } catch (e) { /* ya detenido */ }
      _recognition = null;
    }
  }

  function _micState(state) {
    const btn = _q('hub-mic');
    if (!btn) return;
    btn.className   = 'mic-btn' + (state ? ' ' + state : '');
    btn.textContent = state === 'listening' ? '⏹' : '🎤';
  }

  // ── Panel Docker ─────────────────────────────────────────────────────────────
  async function _loadServers() {
    const el = _q('hub-servers');
    if (!el) return;
    el.innerHTML = '<div class="loading">Cargando…</div>';

    try {
      const data = await window.API.get('hub', '/servers/');
      const containers = Array.isArray(data)
        ? data
        : (data.containers || data.servers || []);

      if (!containers.length) {
        el.innerHTML = '<div class="empty">Sin contenedores</div>';
        return;
      }

      el.innerHTML = `<div class="container-list">${containers.map(c => {
        const running = c.running || c.state === 'running' || (c.status || '').startsWith('Up');
        return `
          <div class="container-card ${running ? 'running' : 'stopped'}">
            <div style="flex:1;min-width:0">
              <div class="ct-name">${c.name}</div>
              <div class="ct-status">${c.image || ''} · ${c.status || c.state || '—'}</div>
            </div>
            <div class="ct-actions">
              ${running
                ? `<button class="btn btn-danger btn-sm" onclick="window._HUB.ctrlServer('${c.id}','stop')">■</button>`
                : `<button class="btn btn-primary btn-sm" onclick="window._HUB.ctrlServer('${c.id}','start')">▶</button>`
              }
              <button class="btn btn-sm" onclick="window._HUB.ctrlServer('${c.id}','restart')">↺</button>
            </div>
          </div>
        `;
      }).join('')}</div>`;
    } catch (e) {
      el.innerHTML = `<div class="error">Error cargando contenedores: ${e.message}</div>`;
    }
  }

  async function _ctrlServer(id, action) {
    try {
      await window.API.post('hub', `/servers/${id}/${action}`, {});
      setTimeout(_loadServers, 1800);
    } catch (e) {
      console.warn(`[Hub._ctrlServer] ${action} ${id}:`, e.message);
      alert('Error: ' + e.message);
    }
  }

  // ── Eventos del módulo ───────────────────────────────────────────────────────
  function _bindEvents() {
    _q('hub-send')?.addEventListener('click', _sendMessage);
    _q('hub-mic')?.addEventListener('click', _toggleMic);

    const input = _q('hub-input');
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          _sendMessage();
        }
      });
      input.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
      });
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function _q(id) { return document.getElementById(id); }

  function _setBadge(id, text, type = 'off') {
    const el = _q(id);
    if (el) { el.textContent = text; el.className = 'badge badge-' + type; }
  }

})();
