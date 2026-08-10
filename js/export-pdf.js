/* PLANIFY v7.23 - EXPORTACIÓN PDF: FIX LEGIBILIDAD DÍAS Y HORAS EN VISTA SEMANAL */
(function() {
  // Orden cronológico estricto: Diaria -> Semanal -> Mensual -> Anual
  var OPCIONES = [
    { id: 'vista-diaria', sel: '#vista-diaria, #view-diario', label: 'Vista Diaria', def: false },
    { id: 'vista-semanal', sel: '#vista-semanal, #view-semanal', label: 'Vista Semanal', def: true },
    { id: 'vista-mensual', sel: '#vista-mensual, #view-mensual', label: 'Vista Mensual', def: true },
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

  function esColorOscuro(valor) {
    if (!valor) return false;
    var v = String(valor).trim();
    var m = v.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
    var lum = -1;
    if (m) {
      lum = 0.299 * Number(m[1]) + 0.587 * Number(m[2]) + 0.114 * Number(m[3]);
    } else {
      var hx = v.match(/#([0-9a-f]{6}|[0-9a-f]{3})/i);
      if (hx) {
        var h = hx[1];
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        lum = 0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16);
      }
    }
    if (lum !== -1) return lum < 128;
    return v.indexOf('gradient') !== -1;
  }

  function clonarVistaVisible(el) {
    var clon = el.cloneNode ? el.cloneNode(true) : el;
    var nodos = [clon];
    if (clon.querySelectorAll) {
      Array.prototype.push.apply(nodos, clon.querySelectorAll('*'));
    }
    nodos.forEach(function(n) {
      if (n.classList && n.classList.remove) {
        n.classList.remove('tema-estelar', 'tema-ejecutivo', 'dark', 'dark-mode', 'tema-oscuro', 'theme-dark');
      }
      if (n.style) {
        if (esColorOscuro(n.style.backgroundColor)) n.style.backgroundColor = '';
        if (esColorOscuro(n.style.background)) n.style.background = '';
      }
    });
    clon.style.backgroundColor = '#ffffff';
    clon.style.color = '#0f172a';
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
    sub.textContent = 'Selecciona las vistas a incluir (cada una será una página, en orden cronológico):';
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
      'body { background: #ffffff !important; color: #0f172a !important; padding: 0 !important; margin: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '.sidebar, #panel-control, #side-panel, .side-panel, .sidebar-panel, .modal-overlay, .side-overlay, .sidebar-overlay, .modal, button, .btn, #modal-export-pdf-overlay { display: none !important; }' +
      '.no-print, input[type="button"], input[type="submit"], .editar, .edit, .controls, .acciones, .actions, .empty-state, #empty-state, #horario-vacio-banner { display: none !important; }' +
      '.tab-content, .view-content, [data-tab-content] { display: none !important; }' +
      '[data-planify-print] { display: block !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; background: #ffffff !important; color: #0f172a !important; overflow: visible !important; }' +
      '[data-planify-print] * { box-shadow: none !important; }' +
      '[data-planify-print] .pdf-seccion { display: block !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; background: #ffffff !important; color: #0f172a !important; overflow: visible !important; page-break-after: always; break-after: page; page-break-inside: avoid; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] .pdf-seccion:last-child { page-break-after: auto; break-after: auto; }' +
      '[data-planify-print] .tab-content, [data-planify-print] .view-content, [data-planify-print] [data-tab-content] { display: block !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; overflow: visible !important; }' +
      '[data-planify-print] .card, [data-planify-print] .section-card, [data-planify-print] .dash-card, [data-planify-print] .main-card-container, [data-planify-print] .tarjeta-resumen, [data-planify-print] .month-cell { background: #ffffff !important; color: #0f172a !important; }' +
      '[data-planify-print] #view-diario, [data-planify-print] #vista-diario { background: #ffffff !important; color: #0f172a !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; border: 1px solid #cbd5e1 !important; }' +
      '[data-planify-print] #view-diario .notebook-header, [data-planify-print] #vista-diario .notebook-header { background: none !important; border-bottom: 1px solid #e2e8f0 !important; }' +
      '[data-planify-print] #view-diario .notebook-header h2, [data-planify-print] #vista-diario .notebook-header h2 { color: #0f172a !important; }' +
      '[data-planify-print] #view-diario .card-section, [data-planify-print] #vista-diario .card-section { background: #ffffff !important; border: 1px solid #cbd5e1 !important; box-shadow: none !important; color: #0f172a !important; }' +
      '[data-planify-print] #view-diario .section-title, [data-planify-print] #vista-diario .section-title { color: #334155 !important; }' +
      '[data-planify-print] #view-diario .goals-section, [data-planify-print] #view-diario .grateful-section, [data-planify-print] #view-diario .affirmations-section, [data-planify-print] #view-diario .morning-section, [data-planify-print] #vista-diario .goals-section, [data-planify-print] #vista-diario .grateful-section, [data-planify-print] #vista-diario .affirmations-section, [data-planify-print] #vista-diario .morning-section { background: #ffffff !important; border-color: #e2e8f0 !important; }' +
      '[data-planify-print] #view-diario .aesthetic-input, [data-planify-print] #view-diario .aesthetic-textarea, [data-planify-print] #vista-diario .aesthetic-input, [data-planify-print] #vista-diario .aesthetic-textarea { background: #ffffff !important; border: 1px solid #cbd5e1 !important; color: #1e293b !important; }' +
      '[data-planify-print] #view-diario .day-summary, [data-planify-print] #vista-diario .day-summary { background: #ffffff !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; color: #0f172a !important; }' +
      '[data-planify-print] .notebook-container, [data-planify-print] .planner-notebook, [data-planify-print] .notebook-grid, [data-planify-print] .notebook-col { background: #ffffff !important; border: 1px solid #cbd5e1 !important; box-shadow: none !important; color: #0f172a !important; }' +
      '[data-planify-print] #view-diario .mood-btn, [data-planify-print] #view-diario .cloud-btn, [data-planify-print] #view-diario .sleep-clouds, [data-planify-print] #view-diario .aesthetic-btn, [data-planify-print] #vista-diario .mood-btn, [data-planify-print] #vista-diario .cloud-btn, [data-planify-print] #vista-diario .sleep-clouds, [data-planify-print] #vista-diario .aesthetic-btn { background: #ffffff !important; color: #0f172a !important; border: 1px solid #cbd5e1 !important; box-shadow: none !important; }' +
      '[data-planify-print] #view-diario .routine-checkboxes, [data-planify-print] #vista-diario .routine-checkboxes { color: #1e293b !important; }' +
      '[data-planify-print] #view-semanal table, [data-planify-print] #view-table table, [data-planify-print] #vista-semanal table, [data-planify-print] #tabla { table-layout: fixed !important; width: 100% !important; background: #ffffff !important; border-collapse: collapse !important; box-shadow: none !important; }' +
      '[data-planify-print] #view-semanal tr, [data-planify-print] #view-table tr, [data-planify-print] #vista-semanal tr, [data-planify-print] #tabla tr { background: #ffffff !important; }' +
      '[data-planify-print] #view-semanal thead th, [data-planify-print] #view-table thead th, [data-planify-print] #vista-semanal thead th, [data-planify-print] #tabla thead th { background: #f8fafc !important; border: 1px solid #cbd5e1 !important; color: #0f172a !important; font-weight: 700 !important; text-align: center !important; vertical-align: middle !important; padding: 8px 4px !important; }' +
      '[data-planify-print] #view-semanal td, [data-planify-print] #view-table td, [data-planify-print] #vista-semanal td, [data-planify-print] #tabla td, [data-planify-print] #view-semanal .celda, [data-planify-print] #view-table .celda { border: 1px solid #cbd5e1 !important; background: #ffffff !important; color: #0f172a !important; text-align: center !important; vertical-align: middle !important; padding: 6px 4px !important; }' +
      '[data-planify-print] #view-semanal .hora-col, [data-planify-print] #view-table .hora-col, [data-planify-print] #vista-semanal .hora-col, [data-planify-print] #view-semanal .hora-cell, [data-planify-print] #view-table .hora-cell, [data-planify-print] #view-semanal .celda-header, [data-planify-print] #view-table .celda-header { width: 85px !important; text-align: center !important; vertical-align: middle !important; font-weight: 600 !important; color: #334155 !important; }' +
      '[data-planify-print] #view-semanal .cal-evento, [data-planify-print] #view-table .cal-evento, [data-planify-print] #vista-semanal .cal-evento, [data-planify-print] #view-semanal .evento, [data-planify-print] #view-table .evento { display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; font-weight: 500 !important; font-size: 0.85rem !important; color: #0f172a !important; border-radius: 6px !important; }' +
      '[data-planify-print] .leyenda { justify-content: center !important; }' +
      '[data-planify-print] .leyenda span { color: #0f172a !important; background: #f8fafc !important; border: 1px solid #e2e8f0 !important; }' +
      '[data-planify-print] { background: #ffffff !important; box-shadow: none !important; border: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }' +
      '.print-container, .info-banner, .indicacion-horarios, [class*="info-banner"], [class*="indicacion"] { background: #ffffff !important; color: #0f172a !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; }' +
      '[data-planify-print] #view-semanal thead th, [data-planify-print] #view-table thead th, [data-planify-print] #vista-semanal thead th, [data-planify-print] #tabla thead th { background: #f8fafc !important; color: #0f172a !important; font-weight: 600 !important; border: 1px solid #cbd5e1 !important; text-align: center !important; vertical-align: middle !important; padding: 10px 4px !important; }' +
      '[data-planify-print] #view-semanal .cal-evento, [data-planify-print] #view-table .cal-evento, [data-planify-print] #vista-semanal .cal-evento, [data-planify-print] #view-semanal .evento, [data-planify-print] #view-table .evento, [data-planify-print] #view-semanal .evento-item, [data-planify-print] #view-table .evento-item, [data-planify-print] #view-semanal .bloque-horario, [data-planify-print] #view-table .bloque-horario { display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; width: 100% !important; min-height: 100% !important; box-sizing: border-box !important; margin: 0 auto !important; padding: 4px 6px !important; color: #0f172a !important; border-radius: 6px !important; border: 1px solid #cbd5e1 !important; font-size: 0.82rem !important; font-weight: 500 !important; }' +
      '[data-planify-print] #view-semanal .week-header, [data-planify-print] #view-table .week-header, [data-planify-print] #vista-semanal .week-header, [data-planify-print] #view-semanal .week-header-day, [data-planify-print] #view-table .week-header-day, [data-planify-print] #view-semanal .resumen-header, [data-planify-print] #view-table .resumen-header, [data-planify-print] #view-semanal .tarjeta-resumen, [data-planify-print] #view-table .tarjeta-resumen, [data-planify-print] #view-semanal #resumen-hoy, [data-planify-print] #view-table #resumen-hoy, [data-planify-print] #view-semanal [class*="week-title"], [data-planify-print] #view-semanal [class*="semana-"], [data-planify-print] #view-semanal [class*="resumen"], [data-planify-print] #view-table [class*="resumen"], [data-planify-print] #view-semanal .day-summary { background: #ffffff !important; color: #0f172a !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; }' +
      '[data-planify-print] #view-semanal thead th, [data-planify-print] #view-table thead th, [data-planify-print] #vista-semanal thead th, [data-planify-print] #tabla thead th { background: #f8fafc !important; color: #0f172a !important; font-weight: 700 !important; border: 1px solid #cbd5e1 !important; text-align: center !important; vertical-align: middle !important; padding: 10px 4px !important; }' +
      '[data-planify-print] #view-semanal [data-evento], [data-planify-print] #view-table [data-evento], [data-planify-print] #vista-semanal [data-evento] { display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; width: 100% !important; margin: 0 auto !important; padding: 4px 6px !important; box-sizing: border-box !important; border-radius: 6px !important; border: 1px solid #cbd5e1 !important; color: #0f172a !important; font-size: 0.82rem !important; font-weight: 600 !important; }' +
      '[data-planify-print] .leyenda { justify-content: center !important; background: #ffffff !important; }' +
      '[data-planify-print] .leyenda span { color: #0f172a !important; background: #ffffff !important; border: 1px solid #e2e8f0 !important; }' +
      '[data-planify-print] table th, [data-planify-print] td:first-child, [data-planify-print] .hora-cell, [data-planify-print] .hora-col, [data-planify-print] .col-hora, [data-planify-print] .celda-header, [data-planify-print] .pdf-export-container td:first-child { background-color: #f1f5f9 !important; color: #0f172a !important; font-weight: 700 !important; border: 1px solid #cbd5e1 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] th *, [data-planify-print] td:first-child * { color: #0f172a !important; }' +
      'table, .main-grid-container, .cal-container { border-collapse: collapse !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; box-shadow: none !important; }' +
      'table, th, td, tr, .cal-dia, .cell, .week-grid { background: #ffffff !important; color: #0f172a !important; }' +
      '.card, .section-card, .dash-card, .main-card-container, .vista-container, .main-container, .cal-container, .grid-container, .month-grid, .tab-content, .view-content, .modal, .modal-content, .modal-box, input, select, textarea, .tarjeta, [class*="tarjeta"] { background: #ffffff !important; color: #0f172a !important; }' +
      '[class*="tarjeta"] { border: 1px solid #e2e8f0 !important; }' +
      'table, th, td, .celda, .grid-cell, .month-cell { border: 1px solid #cbd5e1 !important; }' +
      'thead th, .cal-dia-nombre, .week-header-day, .day-header, .hora-col, .celda-header, .month-header, .cal-titulo, [class*="month-title"], [class*="cal-title"] { background: #f1f5f9 !important; color: #334155 !important; font-weight: 600 !important; }' +
      'th, td, .celda, .grid-cell, .month-cell, .cell-content { padding: 8px 10px !important; border-radius: 6px !important; }' +
      '.cal-evento, .evento, .event-item, .card, .dash-card, .tour-card { border-radius: 6px !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
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

    // Orden cronológico estricto: las secciones se concatenan iterando OPCIONES, no el orden de selección
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
