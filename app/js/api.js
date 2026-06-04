/**
 * AngelOS — Cliente HTTP/WebSocket centralizado
 * Todas las llamadas a las APIs de los proyectos pasan por aquí.
 */

class ApiClient {
  async get(project, path, opts = {}) {
    const url = window.CFG.url(project, path);
    try {
      const headers = this._headers(project, opts.headers);
      const res = await fetch(url, { headers, signal: opts.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      throw new Error(`[${project}] GET ${path}: ${e.message}`);
    }
  }

  async post(project, path, body = {}, opts = {}) {
    const url = window.CFG.url(project, path);
    try {
      const headers = this._headers(project, { 'Content-Type': 'application/json', ...(opts.headers || {}) });
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: opts.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      throw new Error(`[${project}] POST ${path}: ${e.message}`);
    }
  }

  _headers(project, extra = {}) {
    const h = {};
    if (project === 'daniel') {
      const tok = window.CFG.get('danielAdminToken');
      if (tok) h['X-Daniel-Admin-Token'] = tok;
    }
    if (project === 'angelCtrl') {
      const key = window.CFG.get('angelCtrlApiKey');
      if (key) h['X-Api-Key'] = key;
    }
    return Object.assign(h, extra);
  }

  openWS(project, path, handlers = {}) {
    const url = window.CFG.ws(project, path);
    const ws = new WebSocket(url);
    ws.onopen    = handlers.onopen    || (() => {});
    ws.onmessage = handlers.onmessage || (() => {});
    ws.onclose   = handlers.onclose   || (() => {});
    ws.onerror   = () => ws.close();
    return ws;
  }
}

window.API = new ApiClient();
