const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const files = {
  html: path.join(ROOT, 'index.html'),
  manifest: path.join(ROOT, 'manifest.json'),
  svg: path.join(ROOT, 'icon.svg')
};

// ── Optimize HTML: ARIA, meta, SEO, headings ──
function optimizeHTML(html) {
  // 1) Meta description + keywords (after last existing meta)
  html = html.replace(
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="mobile-web-app-capable" content="yes"><meta name="description" content="PLANIFY — Planificador de horarios inteligente. Organiza tus actividades académicas, laborales y personales con dashboard de cumplimiento, balance de vida y reportes semanales."><meta name="keywords" content="planificador, horarios, productividad, gestión del tiempo, planner, organización, estudio, trabajo">'
  );

  // 2) ARIA: close buttons & icon-only buttons
  const ariaPatches = [
    // close panel
    { from: '<span class="sp-close" onclick="togglePanel()">✕</span>', to: '<span class="sp-close" onclick="togglePanel()" role="button" aria-label="Cerrar panel">✕</span>' },
    // cloud button
    { from: '<div class="cloud-btn" id="cloud-btn" onclick="togglePanel()">⚙️</div>', to: '<div class="cloud-btn" id="cloud-btn" onclick="togglePanel()" role="button" aria-label="Abrir panel de control">⚙️</div>' },
    // side-overlay
    { from: '<div class="side-overlay" id="side-overlay" onclick="togglePanel()"></div>', to: '<div class="side-overlay" id="side-overlay" onclick="togglePanel()" aria-hidden="true"></div>' },
    // close modal in edit modal
    { from: '<button class="btn-cancel" onclick="cerrarModal()">Cancelar</button>', to: '<button class="btn-cancel" onclick="cerrarModal()" aria-label="Cancelar edición">Cancelar</button>' },
    // close compra modal
    { from: '<br><button class="btn-cancel" style="margin-top:6px;padding:5px 20px;background:#f1f2f6;border:none;border-radius:6px;cursor:pointer;font-size:0.75em;" onclick="cerrarModalCompra()">Cerrar</button>', to: '<br><button class="btn-cancel" style="margin-top:6px;padding:5px 20px;background:#f1f2f6;border:none;border-radius:6px;cursor:pointer;font-size:0.75em;" onclick="cerrarModalCompra()" aria-label="Cerrar ventana de licencia">Cerrar</button>' },
    // close activar
    { from: '<button class="btn-cancel" onclick="cerrarActivar()">Cancelar</button>', to: '<button class="btn-cancel" onclick="cerrarActivar()" aria-label="Cancelar activación">Cancelar</button>' },
    // close login
    { from: '<button class="btn-cancel" onclick="cerrarLogin()">Cerrar</button>', to: '<button class="btn-cancel" onclick="cerrarLogin()" aria-label="Cerrar inicio de sesión">Cerrar</button>' },
    // close recover
    { from: '<button class="btn-cancel" onclick="cerrarRecuperarPassword()">Cancelar</button>', to: '<button class="btn-cancel" onclick="cerrarRecuperarPassword()" aria-label="Cancelar recuperación">Cancelar</button>' },
    // close admin
    { from: '<div style="text-align:center;"><button class="btn-cancel" onclick="cerrarAdmin()">Cerrar</button></div>', to: '<div style="text-align:center;"><button class="btn-cancel" onclick="cerrarAdmin()" aria-label="Cerrar panel de administración">Cerrar</button></div>' },
    // close report
    { from: '<button class="btn-cancel" onclick="cerrarReporte()">Cancelar</button>', to: '<button class="btn-cancel" onclick="cerrarReporte()" aria-label="Cancelar envío de reporte">Cancelar</button>' },
    // view buttons
    { from: '<button class="active" onclick="cambiarVista(\'table\')" id="btn-view-table">📋 Planificador</button>', to: '<button class="active" onclick="cambiarVista(\'table\')" id="btn-view-table" aria-label="Vista planificador">📋 Planificador</button>' },
    { from: '<button onclick="cambiarVista(\'dashboard\')" id="btn-view-dashboard">📊 Dashboard</button>', to: '<button onclick="cambiarVista(\'dashboard\')" id="btn-view-dashboard" aria-label="Vista dashboard">📊 Dashboard</button>' },
    // fullscreen button
    { from: '<button class="sp-btn" id="btn-fullscreen" onclick="conmutarPantallaCompleta()">⛶ Pantalla completa</button>', to: '<button class="sp-btn" id="btn-fullscreen" onclick="conmutarPantallaCompleta()" aria-label="Alternar pantalla completa">⛶ Pantalla completa</button>' },
    // dark mode
    { from: '<button class="sp-btn" id="btn-dark-mode" onclick="toggleDarkMode()">🌙 Oscuro</button>', to: '<button class="sp-btn" id="btn-dark-mode" onclick="toggleDarkMode()" aria-label="Alternar modo oscuro">🌙 Oscuro</button>' },
    // close-other-sessions
    { from: '<button class="sp-btn" id="btn-cerrar-otras" onclick="cerrarOtrasSesiones()" style="font-size:0.78em;width:100%">🔒 Cerrar sesión en otros dispositivos</button>', to: '<button class="sp-btn" id="btn-cerrar-otras" onclick="cerrarOtrasSesiones()" style="font-size:0.78em;width:100%" aria-label="Cerrar sesiones en otros dispositivos">🔒 Cerrar sesión en otros dispositivos</button>' },
    // CTA link (buy license)
    { from: '<a style="color:#6a1b9a;cursor:pointer;font-weight:bold;" onclick="mostrarCompra()">🔥 Compra la licencia aquí</a>', to: '<a style="color:#6a1b9a;cursor:pointer;font-weight:bold;" onclick="mostrarCompra()" aria-label="Comprar licencia">🔥 Compra la licencia aquí</a>' },
    // cta-box
    { from: '<div class="cta-box" onclick="mostrarCompra()">', to: '<div class="cta-box" onclick="mostrarCompra()" role="button" aria-label="Comprar licencia">' },
    // demo-texto link
    { from: '<span class="demo-texto">Versión Demo · <a style="cursor:pointer;color:#764ba2;font-weight:bold;" onclick="mostrarCompra()">Compra tu licencia</a></span>', to: '<span class="demo-texto">Versión Demo · <a style="cursor:pointer;color:#764ba2;font-weight:bold;" onclick="mostrarCompra()" aria-label="Comprar licencia">Compra tu licencia</a></span>' },
    // recover link
    { from: '<p style="margin:8px 0 0;font-size:0.75em;"><a style="color:#667eea;cursor:pointer;text-decoration:underline;" onclick="mostrarRecuperarPassword()">¿Olvidaste tu contraseña?</a></p>', to: '<p style="margin:8px 0 0;font-size:0.75em;"><a style="color:#667eea;cursor:pointer;text-decoration:underline;" onclick="mostrarRecuperarPassword()" aria-label="Recuperar contraseña">¿Olvidaste tu contraseña?</a></p>' },
  ];

  for (const p of ariaPatches) {
    if (html.includes(p.from)) {
      html = html.replace(p.from, p.to);
    } else {
      console.warn('  [WARN] No se encontró patrón ARIA:', p.from.substring(0, 60) + '...');
    }
  }

  // 3) Add aria-label to .done-check elements in grid (they are created by JS — handled in app.js)
  // Not needed here since they're injected by renderizar()

  // 4) Facebook SVG: add role="img" and <title>
  html = html.replace(
    '<svg viewBox="0 0 36 36"><path d="M15.2 34V19.8h-4.7v-5.5h4.7v-4c0-4.6 2.8-7.2 7-7.2 2 0 3.7.15 4.2.22v4.9H23c-2.3 0-2.8 1.1-2.8 2.7v3.5h5.6l-.7 5.5h-4.9V34"/></svg>',
    '<svg viewBox="0 0 36 36" role="img" aria-label="Facebook"><title>Facebook</title><path d="M15.2 34V19.8h-4.7v-5.5h4.7v-4c0-4.6 2.8-7.2 7-7.2 2 0 3.7.15 4.2.22v4.9H23c-2.3 0-2.8 1.1-2.8 2.7v3.5h5.6l-.7 5.5h-4.9V34"/></svg>'
  );

  // 5) Add role="dialog" and aria-modal to modal overlays
  html = html.replace(/<div class="modal-overlay" id="modal-/g, '<div class="modal-overlay" id="modal-');
  // More precise: add to each modal overlay
  const modalIds = ['modal', 'modal-compra', 'modal-activar', 'modal-login', 'modal-recover', 'modal-admin', 'modal-report'];
  for (const mid of modalIds) {
    const search = '<div class="modal-overlay" id="' + mid + '"';
    if (html.includes(search)) {
      // Only add if not already there
      if (!html.includes(search + ' role=')) {
        html = html.replace(search, search + ' role="dialog" aria-modal="true" aria-label="' + getModalLabel(mid) + '"');
      }
    }
  }

  // 6) Tutorial buttons aria
  html = html.replace('<button class="t-skip" onclick="cerrarTutorial()">Saltar</button>', '<button class="t-skip" onclick="cerrarTutorial()" aria-label="Saltar tutorial">Saltar</button>');
  html = html.replace('<button class="t-prev" onclick="pasoTutorial(-1)" style="display:none;" id="t-prev">← Anterior</button>', '<button class="t-prev" onclick="pasoTutorial(-1)" style="display:none;" id="t-prev" aria-label="Paso anterior">← Anterior</button>');
  html = html.replace('<button class="t-next" onclick="pasoTutorial(1)" id="t-next">Siguiente →</button>', '<button class="t-next" onclick="pasoTutorial(1)" id="t-next" aria-label="Paso siguiente">Siguiente →</button>');

  return html;
}

function getModalLabel(id) {
  const labels = {
    'modal': 'Editar actividad',
    'modal-compra': 'Comprar licencia',
    'modal-activar': 'Activar licencia',
    'modal-login': 'Iniciar sesión',
    'modal-recover': 'Recuperar contraseña',
    'modal-admin': 'Panel de administración',
    'modal-report': 'Enviar reporte semanal'
  };
  return labels[id] || 'Ventana modal';
}

// ── Optimize SVG icon ──
function optimizeSVG(svg) {
  if (svg.includes('aria-label')) return svg;
  return svg.replace('<svg', '<svg role="img" aria-label="PLANIFY icono"');
}

// ── Main ──
function run() {
console.log('');
console.log('═ A11Y + SEO OPTIMIZATION');
console.log('');

// HTML
const html = fs.readFileSync(files.html, 'utf8');
const htmlOpt = optimizeHTML(html);
if (htmlOpt !== html) {
  fs.writeFileSync(files.html, htmlOpt, 'utf8');
  console.log('  index.html: ARIA + SEO patches applied');
} else {
  console.log('  index.html: no changes needed');
}

// SVG
if (fs.existsSync(files.svg)) {
  const svg = fs.readFileSync(files.svg, 'utf8');
  const svgOpt = optimizeSVG(svg);
  if (svgOpt !== svg) {
    fs.writeFileSync(files.svg, svgOpt, 'utf8');
    console.log('  icon.svg: aria-label added');
  } else {
    console.log('  icon.svg: already optimized');
  }
}

console.log('');
console.log('  A11Y + SEO OK');
console.log('');
}

module.exports = { run };
