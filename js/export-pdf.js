/* PLANIFY v7.11 - EXPORTACIÓN PDF CON CLONADO FORZADO VISIBLE Y MULTIPÁGINA */
(function() {
  var OPCIONES = [
    { id: 'vista-semanal', sel: '#vista-semanal, #view-semanal', label: 'Vista Semanal', def: true },
    { id: 'vista-mensual', sel: '#vista-mensual, #view-mensual', label: 'Vista Mensual', def: true },
    { id: 'vista-diaria', sel: '#vista-diaria, #view-diario', label: 'Vista Diaria', def: false },
    { id: 'vista-anual', sel: '#vista-anual-metas', label: 'Vista Anual', def: false }
  ];
  var MODALES_UI = [
    '.modal-overlay', '.sidebar-overlay', '.side-overlay', '#side-overlay',
    '.sidebar-panel', '.side-panel', '#side-panel', '.panel-control', '#panel-control',
    '#modal-ajustes', '#modal-settings', '.modal'
  ];

  function detectarVistaActiva() {
    var activa = null;
    OPCIONES.forEach(function(o) {
      if (activa) return;
      var el = document.querySelector(o.sel);
      if (el && el.style && el.style.display !== 'none') activa = el;
    });
    if (!activa) {
      document.querySelectorAll('.view-content.active, .tab-content.active, [data-tab-content].active').forEach(function(el) {
        if (activa) return;
        var id = el.id || '';
        if (id.indexOf('tab-') === 0) return;
        if (MODALES_UI.some(function(s) { return s.indexOf('#') === 0 && el.id === s.slice(1); })) return;
        activa = el;
      });
    }
    if (!activa) activa = document.querySelector('.view-content, [data-tab-content]');
    if (!activa) activa = document.querySelector('main, #main-container');
    if (!activa) activa = document.body;
    return activa;
  }

  // Clona el nodo y fuerza visibilidad TOTAL en el clon (nunca hereda display:none de la vista inactiva)
  function clonarVistaVisible(el) {
    var clon = el.cloneNode ? el.cloneNode(true) : el;
    clon.style.display = 'block';
    clon.style.visibility = 'visible';
    clon.style.opacity = '1';
    if (clon.classList && clon.classList.add) clon.classList.add('active');
    return clon.outerHTML;
  }

  function cerrarModal() {
    var m = document.getElementById('modal-export-pdf');
    if (m) {
      if (m.parentNode) m.parentNode.removeChild(m);
      var ov = document.getElementById('modal-export-pdf-overlay');
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    }
  }

  function abrirModal() {
    cerrarModal();
    var overlay = document.createElement('div');
    overlay.id = 'modal-export-pdf-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.55);z-index:99998;display:flex;align-items:center;justify-content:center;';

    var panel = document.createElement('div');
    panel.id = 'modal-export-pdf';
    panel.style.cssText = 'background:#fff;border-radius:16px;padding:24px 26px;width:min(420px,92vw);box-shadow:0 20px 60px rgba(15,23,42,.35);font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;';

    var titulo = document.createElement('div');
    titulo.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
    titulo.innerHTML = '<strong style="font-size:17px;">📄 Exportar a PDF</strong><button type="button" style="border:none;background:none;font-size:20px;cursor:pointer;line-height:1;color:#64748b;" data-planify-cerrar="1" aria-label="Cerrar">✕</button>';
    panel.appendChild(titulo);

    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:12.5px;color:#64748b;margin-bottom:14px;';
    sub.textContent = 'Selecciona las vistas a incluir (cada una será una página):';
    panel.appendChild(sub);

    OPCIONES.forEach(function(o) {
      var fila = document.createElement('label');
      fila.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 12px;margin-bottom:8px;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;font-size:14px;';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = o.def;
      cb.style.cssText = 'width:17px;height:17px;accent-color:#6a1b9a;cursor:pointer;';
      cb.setAttribute('data-planify-vista', o.id);
      fila.appendChild(cb);
      var span = document.createElement('span');
      span.textContent = o.label;
      fila.appendChild(span);
      panel.appendChild(fila);
    });

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btn-generar-pdf';
    btn.textContent = 'Generar y Descargar PDF';
    btn.style.cssText = 'width:100%;margin-top:12px;padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#7b1fa2,#4a148c);color:#fff;font-size:14.5px;font-weight:600;cursor:pointer;';
    panel.appendChild(btn);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(ev) {
      if (ev.target === overlay) cerrarModal();
    });
    panel.addEventListener('click', function(ev) {
      if (ev.target.closest && ev.target.closest('[data-planify-cerrar]')) cerrarModal();
    });
  }

  function imprimirVistas(nodosHTML, clasesPrint) {
    var iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    var doc = iframe.contentWindow.document;
    var estilosHTML = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(function(style) {
      estilosHTML += style.outerHTML;
    });

    doc.open();
    doc.write('<!DOCTYPE html><html><head><title>PLANIFY - Exportación PDF</title>' +
      estilosHTML +
      '<style>' +
      'body { background: #ffffff !important; color: #111827 !important; padding: 16px 20px !important; }' +
      '@media print { .pdf-page-break { page-break-after: always; break-after: page; } }' +
      '.sidebar, #panel-control, #side-panel, .side-panel, .sidebar-panel, .modal-overlay, .side-overlay, .sidebar-overlay, .modal, button, .btn, #modal-export-pdf-overlay { display: none !important; }' +
      '.tab-content, .view-content, [data-tab-content] { display: none !important; }' +
      '[data-planify-print] { display: block !important; }' +
      '[data-planify-print] .pdf-seccion { display: block !important; visibility: visible !important; opacity: 1 !important; }' +
      '[data-planify-print] .tab-content, [data-planify-print] .view-content, [data-planify-print] [data-tab-content] { display: block !important; visibility: visible !important; opacity: 1 !important; }' +
      'table { border-collapse: collapse !important; width: 100% !important; margin: 0 0 4px !important; box-shadow: none !important; }' +
      'table, th, td, .celda, .grid-cell, .month-cell { border: 1px solid #e2e8f0 !important; }' +
      'th, td, .celda, .grid-cell, .month-cell, .cell-content { padding: 8px 10px !important; border-radius: 6px !important; }' +
      '.cal-evento, .evento, .event-item, .card, .dash-card, .tour-card { border-radius: 8px !important; }' +
      '.pdf-seccion { page-break-inside: avoid; }' +
      '</style></head>' +
      '<body class="' + (clasesPrint || '') + '">' +
      '<div data-planify-print="1">' + nodosHTML + '</div>' +
      '</body></html>');
    doc.close();

    setTimeout(function() {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(function() {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 500);
    }, 300);
  }

  function generarPDF() {
    var checks = document.querySelectorAll('#modal-export-pdf-overlay input[data-planify-vista]');
    var seleccionadas = [];
    checks.forEach(function(cb) {
      if (cb.checked) seleccionadas.push(cb.getAttribute('data-planify-vista'));
    });
    if (seleccionadas.length === 0) {
      var activa = detectarVistaActiva();
      var idA = activa.id || '';
      OPCIONES.forEach(function(o) {
        if (o.sel.split(',').some(function(s) { return s.trim() === '#' + idA; })) seleccionadas.push(o.id);
      });
      if (seleccionadas.length === 0) seleccionadas.push('vista-semanal');
    }

    var partes = [];
    var clasesPrint = [];
    OPCIONES.forEach(function(o) {
      if (seleccionadas.indexOf(o.id) === -1) return;
      var el = document.querySelector(o.sel);
      if (!el) return;
      var idReal = el.id ? String(el.id) : 'vista-' + o.id;
      var sufijo = String(idReal).replace(/^#?view-|^#?vista-/, '');
      clasesPrint.push('printing-' + sufijo);
      clasesPrint.push('printing-' + idReal);
      if (partes.length > 0) partes.push('<div class="pdf-page-break"></div>');
      partes.push('<section class="pdf-seccion" style="display:block;visibility:visible;opacity:1;">' + clonarVistaVisible(el) + '</section>');
    });
    if (partes.length === 0) partes.push('<div>No hay vistas disponibles para exportar.</div>');

    cerrarModal();
    imprimirVistas(partes.join(''), clasesPrint.join(' '));
  }

  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
      var btnPdf = e.target.closest('#btn-export-pdf');
      if (btnPdf) {
        e.preventDefault();
        abrirModal();
        return;
      }
      var btnGen = e.target.closest('#btn-generar-pdf');
      if (btnGen) {
        e.preventDefault();
        generarPDF();
      }
    });
  });
})();
