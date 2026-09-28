const fs = require('fs');

const SEO_DESCRIPTION = 'PLANIFY — Planificador personal para organizar horarios, hábitos, metas y tiempo de enfoque.';
const SEO_KEYWORDS = 'planificador, horarios, productividad, gestión del tiempo, organización, estudio, trabajo';

function replaceMeta(html, pattern, tag) {
  html = html.replace(pattern, '');
  return html.replace('</head>', tag + '</head>');
}

function transform(input) {
  let html = input;
  html = replaceMeta(html, /<meta\s+name=["']description["'][^>]*>/gi,
    '<meta name="description" content="' + SEO_DESCRIPTION + '">');
  html = replaceMeta(html, /<meta\s+name=["']keywords["'][^>]*>/gi,
    '<meta name="keywords" content="' + SEO_KEYWORDS + '">');
  html = html.replace(/<meta\s+property=["']og:(?:title|description|type|url)["'][^>]*>/gi, '');
  html = html.replace('</head>', '<meta property="og:title" content="PLANIFY — Planificador personal"><meta property="og:description" content="Organiza horarios, hábitos, metas y tiempo de enfoque."><meta property="og:type" content="website"></head>');

  // Estos elementos ya no existen en el HTML actual. Sus antiguas correcciones
  // son opcionales, así que su ausencia nunca debe producir una falsa alarma.
  const legacyPatches = [
    ['<span class="sp-close" onclick="togglePanel()">✕</span>', '<span class="sp-close" onclick="togglePanel()" role="button" tabindex="0" aria-label="Cerrar panel">✕</span>'],
    ['<div class="side-overlay" id="side-overlay" onclick="togglePanel()"></div>', '<div class="side-overlay" id="side-overlay" onclick="togglePanel()" aria-hidden="true"></div>']
  ];
  for (const [from, to] of legacyPatches) if (html.includes(from)) html = html.replace(from, to);

  // A gear is not text; make the current control a native keyboard-operable button.
  html = html.replace(
    /<div class="cloud-btn" id="cloud-btn" onclick="togglePanel\(\)"(?: role="button")?(?: aria-label="Abrir panel de control")?>⚙️<\/div>/,
    '<button type="button" class="cloud-btn" id="cloud-btn" onclick="togglePanel()" aria-label="Abrir panel de control">⚙️</button>'
  );

  html = html.replace(/<div class="(modal-overlay(?: [^"]*)?)" id="([^"]+)"([^>]*)>/g, (tag, className, id, attrs) => {
    const label = ({ modal: 'Editar actividad', 'modal-compra': 'Comprar licencia', 'modal-activar': 'Activar licencia', 'modal-login': 'Iniciar sesión', 'modal-recover': 'Recuperar contraseña', 'modal-admin': 'Panel de administración', 'modal-report': 'Enviar reporte semanal', 'modal-evento': 'Editar evento', 'tutorial-modal': 'Tutorial guiado' })[id] || 'Ventana de PLANIFY';
    if (/\brole=["']dialog["']/i.test(attrs)) return tag;
    return '<div class="' + className + '" id="' + id + '"' + attrs + ' role="dialog" aria-modal="true" aria-label="' + label + '">';
  });

  html = html.replace(/<script[^>]*connect\.facebook\.net[^>]*YOUR_FACEBOOK_APP_ID[^>]*><\/script>/gi, '');
  html = html.replace(/<script[^>]*accounts\.google\.com\/gsi\/client[^>]*><\/script>/gi, '');
  html = html.replace(/data-client_id=["']YOUR_GOOGLE_CLIENT_ID\.apps\.googleusercontent\.com["']/gi, 'data-client_id=""');
  html = html.replace(/admin123/gi, 'credencial del servidor');
  return html;
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
  }
  return result;
}

function validate(html) {
  const ids = new Map();
  const tags = [...html.matchAll(/<([a-z][\w:-]*)\b[^>]*>/gi)];
  for (const match of tags) {
    const attrs = attributes(match[0]);
    if (attrs.id) ids.set(attrs.id, (ids.get(attrs.id) || 0) + 1);
  }
  const duplicateIds = [...ids].filter(([, count]) => count > 1).map(([id]) => id);
  if (duplicateIds.length) throw new Error('IDs HTML duplicados: ' + duplicateIds.join(', '));

  for (const match of tags) {
    const attrs = attributes(match[0]);
    for (const relation of ['aria-labelledby', 'aria-describedby']) {
      for (const id of (attrs[relation] || '').split(/\s+/).filter(Boolean)) {
        if (!ids.has(id)) throw new Error(relation + ' apunta a un ID inexistente: ' + id);
      }
    }
    if (attrs.role === 'dialog' && attrs['aria-modal'] === 'true' && !attrs['aria-label'] && !attrs['aria-labelledby']) {
      throw new Error('Diálogo sin nombre accesible: ' + (attrs.id || 'sin id'));
    }
    if (attrs.role === 'button' && !['button', 'input', 'a'].includes(match[1].toLowerCase()) && attrs.tabindex !== '0') {
      throw new Error('Control role=button no alcanzable con teclado: ' + (attrs.id || match[0].slice(0, 80)));
    }
  }
  if (!/<button\b[^>]*id="cloud-btn"[^>]*aria-label="Abrir panel de control"/i.test(html)) {
    throw new Error('El control actual del panel debe ser un botón nativo con nombre accesible.');
  }
  return true;
}

function run(inputPath, outputPath) {
  if (!inputPath || !outputPath) throw new Error('Se requieren rutas de entrada y salida para optimizar A11Y.');
  const source = fs.readFileSync(inputPath, 'utf8');
  const result = transform(source);
  validate(result);
  fs.writeFileSync(outputPath, result, 'utf8');
  return result;
}

module.exports = { transform, validate, run };
