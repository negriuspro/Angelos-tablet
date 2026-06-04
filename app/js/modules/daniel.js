/**
 * AngelOS — Módulo Daniel
 * Chat IA con voz, historial, smart home, batería y sistema.
 * Migrado desde: daniel/android/JarvisApp/MainActivity.kt + daniel/client/app.js
 */

(function () {
  'use strict';

  let ws = null;
  let wsDelay = 2000;
  let wsTimer = null;

  // STT
  let recognition = null;
  let isListening = false;
  let mediaRecorder = null;
  let audioChunks = [];

  // DOM refs (se setean en onActivate)
  let _root = null;

  // ── Registro del módulo ───────────────────────────────────────────────────
  window.registerModule('daniel', {
    onActivate(container) {
      _root = container;
      _render();
      _connectWS();
      _loadStatus();
    },
    onDeactivate() {
      _disconnectWS();
      _stopSTT();
    },
  });

  // ── Render del módulo ─────────────────────────────────────────────────────
  function _render() {
    _root.innerHTML = `
      <div class="mod-title">◉ Daniel — Asistente IA</div>

      <div id="daniel-status-bar" style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <span id="dan-conn" class="badge badge-off">Sin conexión</span>
        <span id="dan-sys"  class="badge badge-off">Sistema —</span>
        <span id="dan-bat"  class="badge badge-off">Batería —</span>
      </div>

      <!-- Chat principal -->
      <div id="chat-shell">
        <div id="chat-messages">
          <div class="msg msg-sys">Di "Daniel" o toca el micrófono para activar</div>
        </div>
        <div id="chat-footer">
          <textarea id="chat-input" placeholder="Escribe un comando…" rows="1"></textarea>
          <button id="mic-btn" title="Micrófono">🎤</button>
          <button class="btn btn-primary btn-sm" id="send-btn">▶</button>
        </div>
      </div>

      <!-- Panel lateral: smart home, sistema, historial -->
      <div id="daniel-panels" style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">

        <div class="card">
          <div class="card-title">⚡ Smart Home</div>
          <div id="devices-list"><div class="loading">Cargando…</div></div>
        </div>

        <div class="card">
          <div class="card-title">📊 Sistema Servidor</div>
          <div class="metric-row" id="sys-metrics">
            <div class="metric-item">
              <div class="metric-lbl"><span>CPU</span><span class="metric-val" id="m-cpu">—</span></div>
              <div class="bar-track"><div class="bar-fill" id="b-cpu"></div></div>
            </div>
            <div class="metric-item">
              <div class="metric-lbl"><span>RAM</span><span class="metric-val" id="m-ram">—</span></div>
              <div class="bar-track"><div class="bar-fill" id="b-ram"></div></div>
            </div>
            <div class="metric-item">
              <div class="metric-lbl"><span>Disco</span><span class="metric-val" id="m-disk">—</span></div>
              <div class="bar-track"><div class="bar-fill" id="b-disk"></div></div>
            </div>
          </div>
        </div>

      </div>
    `;

    // Eventos
    _$('send-btn').onclick = _sendText;
    _$('mic-btn').onclick  = _toggleMic;
    _$('chat-input').onkeydown = e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendText(); }
    };
    // Auto-resize textarea
    _$('chat-input').oninput = function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    };

    // Iniciar polling de métricas
    _pollMetrics();
    _loadDevices();
  }

  // ── WebSocket ─────────────────────────────────────────────────────────────
  function _connectWS() {
    _disconnectWS();
    try {
      ws = window.API.openWS('daniel', '/ws', {
        onopen() {
          _setBadge('dan-conn', 'Conectado', 'ok');
          wsDelay = 2000;
        },
        onmessage({ data }) {
          // Protocolo tablet: servidor pide grabar audio
          if (data === '__tablet_mic__') {
            _startRecording();
            return;
          }
          let text = data;
          try {
            const parsed = JSON.parse(data);
            if (parsed.reply !== undefined) text = parsed.reply;
          } catch {}
          if (text) _appendMsg('ai', text);
        },
        onclose() {
          _setBadge('dan-conn', 'Sin conexión', 'err');
          wsTimer = setTimeout(_connectWS, wsDelay);
          wsDelay = Math.min(wsDelay * 2, 30000);
        },
      });
    } catch (e) {
      _setBadge('dan-conn', 'Error WS', 'err');
    }
  }

  function _disconnectWS() {
    clearTimeout(wsTimer);
    if (ws) { try { ws.close(); } catch {} ws = null; }
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  function _sendText() {
    const input = _$('chat-input');
    const text = input.value.trim();
    if (!text || !ws || ws.readyState !== 1) return;
    _appendMsg('user', text);
    ws.send(JSON.stringify({ text }));
    input.value = '';
    input.style.height = 'auto';
  }

  function _appendMsg(role, text) {
    const msgs = _$('chat-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = `msg msg-${role === 'user' ? 'user' : role === 'ai' ? 'ai' : 'sys'}`;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  // ── STT — Web Speech API (navegador) ─────────────────────────────────────
  function _toggleMic() {
    if (isListening) { _stopSTT(); return; }
    // Si estamos en WebView Android nativo, el bridge lo maneja
    if (window.ANDROID_NATIVE) {
      _appendMsg('sys', 'STT nativo Android activo');
      return;
    }
    _startBrowserSTT();
  }

  function _startBrowserSTT() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      _appendMsg('sys', 'STT no disponible — escribe tu mensaje');
      return;
    }
    recognition = new SR();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      isListening = true;
      const mic = _$('mic-btn');
      if (mic) { mic.textContent = '⏹'; mic.classList.add('listening'); }
    };
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript.trim();
      if (text) {
        const input = _$('chat-input');
        if (input) input.value = text;
        _sendText();
      }
    };
    recognition.onend = _stopSTT;
    recognition.onerror = _stopSTT;
    try { recognition.start(); } catch {}
  }

  // Bridge Android — llamado desde MainActivity.kt
  window.onNativeResult = function (text, isFinal) {
    if (!isFinal) return;
    const input = _$('chat-input');
    if (input) input.value = text;
    _sendText();
  };

  function _startRecording() {
    // Grabación Whisper cuando el servidor lo pide vía __tablet_mic__
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const form = new FormData();
        form.append('audio', blob, 'audio.webm');
        try {
          const res = await fetch(window.CFG.url('daniel', '/transcribe'), { method: 'POST', body: form });
          const { text } = await res.json();
          if (text && ws && ws.readyState === 1) ws.send(JSON.stringify({ text }));
        } catch {}
      };
      mediaRecorder.start();
      setTimeout(() => { if (mediaRecorder?.state === 'recording') mediaRecorder.stop(); }, 8000);
    }).catch(() => {});
  }

  function _stopSTT() {
    isListening = false;
    const mic = _$('mic-btn');
    if (mic) { mic.textContent = '🎤'; mic.classList.remove('listening'); }
    if (recognition) { try { recognition.stop(); } catch {} recognition = null; }
  }

  // ── Métricas del sistema ──────────────────────────────────────────────────
  async function _loadStatus() {
    try {
      const data = await window.API.get('daniel', '/api/system');
      _updateMetrics(data);
      // Batería
      const bat = await window.API.get('daniel', '/api/battery');
      if (bat.available) {
        const pct = Math.round(bat.percent);
        const plug = bat.plugged ? '⚡' : '🔋';
        _setBadge('dan-bat', `${plug} ${pct}%`, pct < 20 ? 'warn' : 'ok');
      }
    } catch { _setBadge('dan-sys', 'Sin datos', 'err'); }
  }

  function _pollMetrics() {
    _loadStatus();
    setTimeout(_pollMetrics, window.CFG.get('pollInterval') || 10000);
  }

  function _updateMetrics(d) {
    _setText('m-cpu',  d.cpu  + '%');
    _setText('m-ram',  d.ram  + '%');
    _setText('m-disk', d.disk + '%');
    _setBar('b-cpu',  d.cpu);
    _setBar('b-ram',  d.ram);
    _setBar('b-disk', d.disk);
    _setBadge('dan-sys', `CPU ${d.cpu}% RAM ${d.ram}%`, d.cpu > 90 || d.ram > 90 ? 'warn' : 'ok');
  }

  // ── Smart Home ────────────────────────────────────────────────────────────
  async function _loadDevices() {
    const el = _$('devices-list');
    if (!el) return;
    try {
      const { devices } = await window.API.get('daniel', '/api/devices');
      if (!devices || !devices.length) { el.innerHTML = '<div class="empty">Sin dispositivos</div>'; return; }
      el.innerHTML = devices.map(d => `
        <div class="toggle-wrap" style="margin-bottom:8px;">
          <span style="font-size:11px;color:var(--text)">${d.name}</span>
          <div class="toggle">
            <button class="tog-btn ${d.switch ? 'on' : 'off'}" onclick="window._danToggle('${d.id}', true)" >ON</button>
            <button class="tog-btn ${d.switch ? 'off' : 'on'}" onclick="window._danToggle('${d.id}', false)">OFF</button>
          </div>
        </div>
      `).join('');
    } catch { el.innerHTML = '<div class="error">Error cargando dispositivos</div>'; }
  }

  window._danToggle = async function (id, on) {
    try {
      await window.API.post('daniel', `/api/devices/${id}`, { on });
      _loadDevices();
    } catch {}
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _$(id) { return _root ? _root.querySelector('#' + id) || document.getElementById(id) : document.getElementById(id); }
  function _setText(id, val) { const el = _$(id); if (el) el.textContent = val; }
  function _setBar(id, pct) {
    const el = _$(id);
    if (!el) return;
    el.style.width = Math.min(pct, 100) + '%';
    el.className = 'bar-fill' + (pct > 90 ? ' crit' : pct > 75 ? ' warn' : '');
  }
  function _setBadge(id, text, type = 'off') {
    const el = _$(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'badge badge-' + type;
  }

})();
