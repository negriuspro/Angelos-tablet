/**
 * AngelOS — Router principal y cargador de módulos
 * Arquitectura: cada módulo vive en /modules/<id>/{module.html, module.js, module.css}
 */

const MODULES = [
  { id: 'dashboard',     label: 'Dashboard',      icon: '⊙', folder: 'dashboard'     },
  { id: 'daniel',        label: 'Daniel',          icon: '◉', folder: 'daniel'        },
  { id: 'angel-control', label: 'Angel Ctrl',      icon: '⊞', folder: 'angel-control' },
  { id: 'monitor',       label: 'Monitor',         icon: '⊕', folder: 'monitor'       },
  { id: 'settings',      label: 'Config',          icon: '⚙', folder: 'settings'      },
];

let _activeId     = null;
let _instances    = {};  // id → module instance (con onActivate/onDeactivate)
let _cssLoaded    = new Set();
let _jsLoaded     = new Set();

// ── Bootstrap ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  _buildNav();
  const last = localStorage.getItem('angelos_module') || 'dashboard';
  _navigate(last);
});

// ── Barra de navegación ───────────────────────────────────────────────────────

function _buildNav() {
  const nav = document.getElementById('nav');
  MODULES.forEach(mod => {
    const btn = document.createElement('button');
    btn.className   = 'nav-btn';
    btn.dataset.mod = mod.id;
    btn.innerHTML   = `<span class="nav-icon">${mod.icon}</span><span class="nav-label">${mod.label}</span>`;
    btn.addEventListener('click', () => _navigate(mod.id));
    nav.appendChild(btn);
  });
}

// ── Router ────────────────────────────────────────────────────────────────────

async function _navigate(moduleId) {
  const mod = MODULES.find(m => m.id === moduleId);
  if (!mod) return;

  // Desactivar módulo anterior
  if (_activeId && _instances[_activeId]?.onDeactivate) {
    try { _instances[_activeId].onDeactivate(); } catch {}
  }

  // Marcar botón activo
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.nav-btn[data-mod="${moduleId}"]`);
  if (btn) btn.classList.add('active');

  _activeId = moduleId;
  localStorage.setItem('angelos_module', moduleId);

  const main = document.getElementById('main');
  main.innerHTML = `<div class="loading">Cargando ${mod.label}…</div>`;

  try {
    // 1. CSS del módulo (una sola vez)
    await _loadCSS(mod);

    // 2. HTML del módulo (siempre fresco — contenido dinámico)
    const html = await _fetchHTML(mod);
    main.innerHTML = html;

    // 3. JS del módulo (una sola vez)
    await _loadJS(mod);

    // 4. Activar
    if (_instances[moduleId]?.onActivate) {
      _instances[moduleId].onActivate(main);
    }
  } catch (e) {
    main.innerHTML = `<div class="error">Error cargando ${mod.label}: ${e.message}</div>`;
    console.error('[AngelOS]', e);
  }
}

// ── Loaders ───────────────────────────────────────────────────────────────────

function _loadCSS(mod) {
  if (_cssLoaded.has(mod.id)) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel   = 'stylesheet';
    link.href  = `/modules/${mod.folder}/module.css`;
    link.onload  = () => { _cssLoaded.add(mod.id); resolve(); };
    link.onerror = () => resolve();  // CSS opcional — continuar si no existe
    document.head.appendChild(link);
  });
}

async function _fetchHTML(mod) {
  const res = await fetch(`/modules/${mod.folder}/module.html`);
  if (!res.ok) throw new Error(`HTTP ${res.status} al cargar template`);
  return res.text();
}

function _loadJS(mod) {
  if (_jsLoaded.has(mod.id)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s   = document.createElement('script');
    s.src     = `/modules/${mod.folder}/module.js?v=${Date.now()}`;
    s.onload  = () => { _jsLoaded.add(mod.id); resolve(); };
    s.onerror = () => reject(new Error(`No se pudo cargar ${mod.folder}/module.js`));
    document.head.appendChild(s);
  });
}

// Los módulos se registran aquí desde su module.js
window.AngelOS = {
  register(id, instance) {
    _instances[id] = instance;
  },
  navigate: _navigate,
  modules: MODULES,
};
