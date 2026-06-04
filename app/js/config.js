/**
 * AngelOS — Configuración de servidores
 * Editable desde la pantalla de Configuración dentro de la app.
 */

const DEFAULT_CONFIG = {
  // IP o dominio del servidor Ubuntu
  serverHost: '192.168.100.6',

  // Puertos de cada proyecto (según docker-compose.yml de cada uno)
  ports: {
    daniel:       3002,   // asistente-daniel nginx
    hub:          3004,   // antigravitymobile-test (funcional) | prod: 3001
    angelCtrl:    3000,   // angel-ctrl nginx
    shield:       3003,   // antigravity-shield nginx
    adguard:      3900,   // adguard admin
  },

  // Credenciales (se guardan en localStorage)
  danielAdminToken: '',
  angelCtrlApiKey:  '',

  // Comportamiento
  pollInterval:  10000,  // ms entre actualizaciones de métricas
  wsReconnDelay: 3000,   // ms antes de reconectar WebSocket
};

class Config {
  constructor() {
    this._data = this._load();
  }

  _load() {
    try {
      const saved = JSON.parse(localStorage.getItem('angelos_config') || '{}');
      return Object.assign({}, DEFAULT_CONFIG, saved, {
        ports: Object.assign({}, DEFAULT_CONFIG.ports, saved.ports || {}),
      });
    } catch {
      return Object.assign({}, DEFAULT_CONFIG);
    }
  }

  save(patch) {
    if (patch.ports) {
      this._data.ports = Object.assign({}, this._data.ports, patch.ports);
      delete patch.ports;
    }
    Object.assign(this._data, patch);
    localStorage.setItem('angelos_config', JSON.stringify(this._data));
  }

  get(key) { return this._data[key]; }

  url(project, path = '') {
    const host = this._data.serverHost;
    const port = this._data.ports[project];
    return `http://${host}:${port}${path}`;
  }

  ws(project, path = '') {
    const host = this._data.serverHost;
    const port = this._data.ports[project];
    return `ws://${host}:${port}${path}`;
  }

  getAll() { return Object.assign({}, this._data); }
}

window.CFG = new Config();
