/**
 * AngelOS — Módulo Daniel
 * Chat IA con voz, historial, smart home, métricas.
 * API: daniel:3002
 */
(function () {
  'use strict';

  let _ws = null, _wsDelay = 2000, _wsTimer = null;
  let _recognition = null, _isListening = false;
  let _mediaRecorder = null, _audioChunks = [];
  let _pollTimer = null;

  // API pública del módulo para botones inline en el HTML
  window._DAN = {
    loadDevices,
    toggleDevice: async (id, on) => {
      try { await window.API.post('daniel', `/api/devices/${id}`, { on }); loadDevices(); }
      catch (e) { console.warn('[Daniel] toggle:', e.message); }
    },
  };

  // Expone el bridge Android al módulo activo
  window.onNativeResult = function (text, isFinal) {
    if (!isFinal) return;
    const input = _q('chat-input');
    if (input) { input.value = text; _sendText(); }
  };

  window.AngelOS.register('daniel', {
    onActivate() {
      _connectWS();
      _pollMetrics();
      loadDevices();
    },
    onDeactivate() {
      _disconnectWS();
      _stopSTT();
      clearInterval(_pollTimer);
    },
  });

  // ── Eventos (se conectan cada vez que el HTML se inyecta) ──────────────────
  // app.js inyecta el HTML y luego llama onActivate, así que el DOM ya existe.
  document.addEventListener('click', function handler(e) {
    if (e.target.id === 'dan-send') _sendText();
    if (e.target.id === 'dan-mic')  _toggleMic();
  }, { once: false, capture: false });

  // Enter en textarea (sin Shift)
  document.addEventListener('keydown', function (e) {
    if (e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      _sendText();
    }
  });

  // Auto-resize textarea
  document.addEventListener('input', function (e) {
    if (e.target.id === 'chat-input') {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
    }
  });

  // ── WebSocket ──────────────────────────────────────────────────────────────
  function _connectWS() {
    _disconnectWS();
    _setBadge('dan-conn', 'Conectando…', 'off');
    try {
      _ws = window.API.openWS('daniel', '/ws', {
        onopen() {
          _setBadge('dan-conn', 'Conectado', 'ok');
          _wsDelay = 2000;
        },
        onmessage({ data }) {
          if (data === '__tablet_mic__') { _startRecording(); return; }
          let text = data;
          try {
            const p = JSON.parse(data);
            if (p.reply !== undefined) text = p.reply;
          } catch {}
          if (text) _appendMsg('ai', text);
        },
        onclose() {
          _setBadge('dan-conn', 'Reconectando…', 'warn');
          _wsTimer = setTimeout(_connectWS, _wsDelay);
          _wsDelay = Math.min(_wsDelay * 2, 30000);
        },
      });
    } catch { _setBadge('dan-conn', 'Error WS', 'err'); }
  }

  function _disconnectWS() {
    clearTimeout(_wsTimer);
    if (_ws) { try { _ws.close(); } catch {} _ws = null; }
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  function _sendText() {
    const input = _q('chat-input');
    const text  = input?.value.trim();
    if (!text || !_ws || _ws.readyState !== 1) return;
    _appendMsg('user', text);
    _ws.send(JSON.stringify({ text }));
    input.value = '';
    input.style.height = 'auto';
  }

  function _appendMsg(role, text) {
    const msgs = _q('chat-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = `msg msg-${role === 'user' ? 'user' : role === 'ai' ? 'ai' : 'sys'}`;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  // ── STT ────────────────────────────────────────────────────────────────────
  function _toggleMic() {
    if (_isListening) { _stopSTT(); return; }
    if (window.ANDROID_NATIVE) { _appendMsg('sys', 'STT nativo Android activo'); return; }
    _startBrowserSTT();
  }

  function _startBrowserSTT() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { _appendMsg('sys', 'STT no disponible — escribe el mensaje'); return; }
    _recognition = new SR();
    _recognition.lang = 'es-ES';
    _recognition.continuous = false;
    _recognition.interimResults = false;
    _recognition.onstart = () => { _isListening = true; _micState('listening'); };
    _recognition.onresult = (e) => {
      const text = e.results[0][0].transcript.trim();
      if (text) { const input = _q('chat-input'); if (input) input.value = text; _sendText(); }
    };
    _recognition.onend   = _stopSTT;
    _recognition.onerror = _stopSTT;
    try { _recognition.start(); } catch {}
  }

  function _startRecording() {
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      _audioChunks = [];
      _mediaRecorder = new MediaRecorder(stream);
      _mediaRecorder.ondataavailable = e => _audioChunks.push(e.data);
      _mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(_audioChunks, { type: 'audio/webm' });
        const form = new FormData();
        form.append('audio', blob, 'audio.webm');
        try {
          const res  = await fetch(window.CFG.url('daniel', '/transcribe'), { method: 'POST', body: form });
          const { text } = await res.json();
          if (text && _ws?.readyState === 1) _ws.send(JSON.stringify({ text }));
        } catch {}
      };
      _mediaRecorder.start();
      setTimeout(() => { if (_mediaRecorder?.state === 'recording') _mediaRecorder.stop(); }, 8000);
    }).catch(() => {});
  }

  function _stopSTT() {
    _isListening = false;
    _micState('');
    if (_recognition) { try { _recognition.stop(); } catch {} _recognition = null; }
  }

  function _micState(state) {
    const btn = _q('dan-mic');
    if (!btn) return;
    btn.className = 'mic-btn' + (state ? ' ' + state : '');
    btn.textContent = state === 'listening' ? '⏹' : '🎤';
  }

  // ── Métricas ───────────────────────────────────────────────────────────────
  async function _loadMetrics() {
    try {
      const d = await window.API.get('daniel', '/api/system');
      _setBar('dan-cpu',  d.cpu,  d.cpu  + '%');
      _setBar('dan-ram',  d.ram,  d.ram  + '%');
      _setBar('dan-disk', d.disk, d.disk + '%');
    } catch {}
    try {
      const b = await window.API.get('daniel', '/api/battery');
      if (b.available) {
        const pct = Math.round(b.percent);
        _setBadge('dan-bat', (b.plugged ? '⚡' : '🔋') + ' ' + pct + '%', pct < 20 ? 'warn' : 'ok');
      }
    } catch {}
  }

  function _pollMetrics() {
    _loadMetrics();
    _pollTimer = setInterval(_loadMetrics, window.CFG.get('pollInterval') || 10000);
  }

  // ── Smart Home ─────────────────────────────────────────────────────────────
  async function loadDevices() {
    const el = _q('dan-devices');
    if (!el) return;
    el.innerHTML = '<div class="loading">Cargando…</div>';
    try {
      const { devices } = await window.API.get('daniel', '/api/devices');
      if (!devices?.length) { el.innerHTML = '<div class="empty">Sin dispositivos</div>'; return; }
      el.innerHTML = devices.map(d => `
        <div class="dev-row">
          <div>
            <div class="dev-name">${d.name}</div>
            <div class="dev-online ${d.online ? 'on' : ''}">${d.online ? 'Online' : 'Offline'}</div>
          </div>
          <div class="toggle">
            <button class="tog-btn ${d.switch ? 'on' : 'off'}"
                    onclick="window._DAN.toggleDevice('${d.id}', ${!d.switch})">
              ${d.switch ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      el.innerHTML = `<div class="error">Error: ${e.message}</div>`;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function _q(id) { return document.getElementById(id); }

  function _setBadge(id, text, type = 'off') {
    const el = _q(id);
    if (el) { el.textContent = text; el.className = 'badge badge-' + type; }
  }

  function _setBar(prefix, pct, label) {
    const bar = _q(prefix + '-bar');
    const val = _q(prefix);
    if (bar) {
      bar.style.width = Math.min(pct, 100) + '%';
      bar.className = 'bar-fill' + (pct > 90 ? ' crit' : pct > 75 ? ' warn' : '');
    }
    if (val) val.textContent = label;
  }

})();
