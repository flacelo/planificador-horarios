(function() {
  'use strict';

  var OPCIONES = [
    { id: 'vista-diaria', sel: '#view-diario, #vista-diario', label: 'Vista Diaria', tipo: 'diaria' },
    { id: 'vista-semanal', sel: '#view-semanal, #vista-semanal', label: 'Vista Semanal', tipo: 'semanal' },
    { id: 'vista-mensual', sel: '#view-mensual, #vista-mensual', label: 'Vista Mensual', tipo: 'mensual' },
    { id: 'vista-anual', sel: '#vista-anual-metas, #view-anual, #vista-anual', label: 'Vista Anual', tipo: 'anual' }
  ];

  var SELECTORES_LIMPIEZA = [
    'script', 'iframe', 'button', 'svg', '.no-print', '.empty-state',
    '.table-actions', '.header-controls', '.cal-nav', '.tutorial-overlay',
    '#nav-bar-semanal', '.barra-nav-fecha',
    '.modal-overlay', '.screenshot-warning', '.resizer', '.merge-badge',
    '.lic-msg', '.lic-texto',
    '.btn-remove', '.remove-btn', '.btn-delete', '.btn-eliminar',
    '.btn-eliminar-fila', '.close-btn', '.close-x', '.x-btn',
    '[data-action="delete"]', '[onclick*="eliminar"]', '[onclick*="remove"]'
  ].join(',');

  function escaparHTML(valor) {
    return String(valor == null ? '' : valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function elementosDeOpcion(opcion) {
    return Array.prototype.slice.call(document.querySelectorAll(opcion.sel));
  }

  function estaVisible(elemento) {
    if (!elemento) return false;
    var estilo = window.getComputedStyle ? window.getComputedStyle(elemento) : elemento.style;
    return estilo.display !== 'none' && estilo.visibility !== 'hidden';
  }

  function elementoDeOpcion(opcion) {
    var elementos = elementosDeOpcion(opcion);
    var activo = elementos.find(function(elemento) {
      return elemento.classList && elemento.classList.contains('active');
    });
    if (activo) return activo;
    var visible = elementos.find(estaVisible);
    return visible || elementos[0] || null;
  }

  function opcionActiva() {
    var porClase = OPCIONES.find(function(opcion) {
      return elementosDeOpcion(opcion).some(function(elemento) {
        return elemento.classList && elemento.classList.contains('active') && estaVisible(elemento);
      });
    });
    if (porClase) return porClase;
    return OPCIONES.find(function(opcion) {
      return elementosDeOpcion(opcion).some(estaVisible);
    }) || OPCIONES[0];
  }

  function detectarVistaActiva() {
    return elementoDeOpcion(opcionActiva());
  }
  window.detectarVistaActiva = detectarVistaActiva;

  function textoVisible(elemento, selectores) {
    for (var i = 0; i < selectores.length; i++) {
      var candidato = elemento.querySelector(selectores[i]);
      var texto = candidato ? String(candidato.textContent || '').replace(/\s+/g, ' ').trim() : '';
      if (texto) return texto;
    }
    return '';
  }

  function formatearFecha(valor) {
    if (!valor) return '';
    var partes = String(valor).split('-');
    if (partes.length !== 3) return valor;
    var fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    return fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function rangoSemanaActual() {
    var fecha = new Date();
    var dia = fecha.getDay() || 7;
    var lunes = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - dia + 1);
    var domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
    var inicio = lunes.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
    var fin = domingo.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
    return 'Semana del ' + inicio + ' al ' + fin;
  }

  function subtituloDeVista(opcion, elemento) {
    if (opcion.tipo === 'diaria') {
      var fecha = elemento.querySelector('#planner-date, input[type="date"]');
      return formatearFecha(fecha && fecha.value) || 'Plan del día';
    }
    if (opcion.tipo === 'semanal') {
      return textoVisible(elemento, [
        '#semana-label', '#week-label', '.week-range', '.semana-rango',
        '.semana-actual', '.week-title', '.week-header-title'
      ]) || rangoSemanaActual();
    }
    if (opcion.tipo === 'mensual') {
      return textoVisible(elemento, ['.cal-titulo', '#cal-titulo', '.month-title', '#month-title']) ||
        new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    }
    var textoAnual = textoVisible(elemento, ['.encabezado-anual h1', '.encabezado-anual h2', '.annual-title']);
    var anio = textoAnual.match(/\b(20\d{2})\b/);
    return 'Año ' + (anio ? anio[1] : new Date().getFullYear());
  }

  function reemplazarControl(control) {
    var reemplazo = document.createElement(control.tagName === 'TEXTAREA' ? 'div' : 'span');
    reemplazo.className = 'planify-print-value';
    var tipo = String(control.type || '').toLowerCase();
    var texto = '';
    if (tipo === 'checkbox' || tipo === 'radio') {
      texto = control.checked ? '✓' : '□';
      reemplazo.className += ' planify-print-check';
    } else if (control.tagName === 'SELECT') {
      texto = control.options && control.selectedIndex >= 0 ? control.options[control.selectedIndex].text : '';
    } else {
      texto = control.value || control.getAttribute('placeholder') || '';
    }
    reemplazo.textContent = texto;
    if (control.parentNode) control.parentNode.replaceChild(reemplazo, control);
  }

  function prepararClon(elemento, opcion) {
    var clon = elemento.cloneNode(true);
    clon.removeAttribute('hidden');
    clon.removeAttribute('aria-hidden');
    clon.style.setProperty('display', 'block', 'important');
    clon.style.setProperty('visibility', 'visible', 'important');
    clon.style.setProperty('opacity', '1', 'important');
    clon.style.setProperty('height', 'auto', 'important');
    clon.style.setProperty('max-height', 'none', 'important');
    clon.style.setProperty('overflow', 'visible', 'important');
    clon.classList.add('planify-print-view', 'planify-print-' + opcion.tipo);

    if (opcion.tipo === 'semanal') {
      var tablaSemanal = clon.querySelector('#view-table');
      var dashboardSemanal = clon.querySelector('#view-dashboard');
      if (tablaSemanal) tablaSemanal.style.setProperty('display', 'block', 'important');
      if (dashboardSemanal && dashboardSemanal.parentNode) dashboardSemanal.parentNode.removeChild(dashboardSemanal);
    }

    Array.prototype.forEach.call(clon.querySelectorAll(SELECTORES_LIMPIEZA), function(nodo) {
      if (nodo.parentNode) nodo.parentNode.removeChild(nodo);
    });
    Array.prototype.forEach.call(clon.querySelectorAll('.day-summary'), function(nodo) {
      if (!String(nodo.textContent || '').trim() && nodo.parentNode) nodo.parentNode.removeChild(nodo);
    });
    Array.prototype.forEach.call(clon.querySelectorAll('input, textarea, select'), reemplazarControl);
    Array.prototype.forEach.call(clon.querySelectorAll('[contenteditable]'), function(nodo) {
      nodo.removeAttribute('contenteditable');
    });
    return clon.outerHTML;
  }

  function construirPagina(opcion) {
    var elemento = elementoDeOpcion(opcion);
    if (!elemento) return null;
    var subtitulo = subtituloDeVista(opcion, elemento);
    return '<section class="planify-export-page planify-export-' + opcion.tipo + '" data-planify-page="' + opcion.id + '">' +
      '<header class="planify-export-header"><div class="planify-export-brand">PLANIFY</div>' +
      '<h1>' + escaparHTML(opcion.label) + '</h1><p>' + escaparHTML(subtitulo) + '</p></header>' +
      '<div class="planify-export-viewport"><div class="planify-export-fit">' + prepararClon(elemento, opcion) + '</div></div>' +
      '<footer class="planify-export-footer">Planificador de horarios</footer></section>';
  }

  function cerrarModal() {
    var overlay = document.getElementById('modal-export-pdf-overlay');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  function abrirModal() {
    cerrarModal();
    var activa = opcionActiva();
    var overlay = document.createElement('div');
    overlay.id = 'modal-export-pdf-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.58);z-index:99998;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;';
    var panel = document.createElement('div');
    panel.id = 'modal-export-pdf';
    panel.style.cssText = 'background:#fff;border-radius:16px;padding:24px 26px;width:min(420px,92vw);box-shadow:0 20px 60px rgba(15,23,42,.35);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#0f172a;';
    panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><strong style="font-size:17px;">📄 Exportar a PDF</strong><button type="button" data-planify-cerrar="1" aria-label="Cerrar" style="border:0;background:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button></div><div style="font-size:12.5px;color:#64748b;margin-bottom:14px;">Selecciona las vistas. Cada una ocupará una página, en orden cronológico.</div>';

    OPCIONES.forEach(function(opcion) {
      var fila = document.createElement('label');
      fila.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 12px;margin-bottom:8px;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;font-size:14px;';
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = opcion.id === activa.id;
      checkbox.setAttribute('data-planify-vista', opcion.id);
      checkbox.style.cssText = 'width:17px;height:17px;accent-color:#6a1b9a;cursor:pointer;';
      fila.appendChild(checkbox);
      var texto = document.createElement('span');
      texto.textContent = opcion.label;
      fila.appendChild(texto);
      panel.appendChild(fila);
    });

    var mensaje = document.createElement('div');
    mensaje.id = 'planify-pdf-mensaje';
    mensaje.setAttribute('role', 'alert');
    mensaje.style.cssText = 'display:none;color:#b91c1c;font-size:12px;margin-top:8px;';
    panel.appendChild(mensaje);
    var generar = document.createElement('button');
    generar.type = 'button';
    generar.id = 'btn-generar-pdf';
    generar.textContent = 'Generar y descargar PDF';
    generar.style.cssText = 'width:100%;margin-top:12px;padding:12px;border:0;border-radius:10px;background:linear-gradient(135deg,#7b1fa2,#4a148c);color:#fff;font-size:14.5px;font-weight:600;cursor:pointer;';
    panel.appendChild(generar);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(evento) {
      if (evento.target === overlay || (evento.target.closest && evento.target.closest('[data-planify-cerrar]'))) cerrarModal();
    });
  }

  function estilosDocumento() {
    return [
      '@page { size: A4 landscape; margin: 6mm; }',
      'html,body{margin:0!important;padding:0!important;background:#fff!important;color:#0f172a!important;width:auto!important;height:auto!important;overflow:visible!important}',
      'body#planify-pdf-document{font-family:Inter,"Segoe UI",Arial,sans-serif!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}',
      'body#planify-pdf-document .planify-export-page{width:285mm!important;height:196mm!important;min-height:196mm!important;max-height:196mm!important;margin:0!important;padding:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;box-sizing:border-box!important;break-before:auto!important;page-break-before:auto!important;break-after:page!important;page-break-after:always!important;background:#fff!important}',
      'body#planify-pdf-document .planify-export-page:last-child{break-after:auto!important;page-break-after:auto!important}',
      'body#planify-pdf-document .planify-export-page *{box-sizing:border-box!important;break-before:auto!important;page-break-before:auto!important;break-after:auto!important;page-break-after:auto!important}',
      'body#planify-pdf-document .planify-export-header{flex:0 0 auto!important;min-height:16mm!important;margin:0 0 3mm!important;padding:2mm 4mm 2.5mm!important;border-bottom:1px solid #cbd5e1!important;text-align:center!important;background:#fff!important;color:#0f172a!important}',
      'body#planify-pdf-document .planify-export-brand{color:#6d5bd0!important;font-size:10px!important;font-weight:800!important;letter-spacing:2px!important}',
      'body#planify-pdf-document .planify-export-header h1{margin:1px 0!important;padding:0!important;color:#0f172a!important;font-size:18px!important;line-height:1.15!important;font-weight:800!important;text-transform:none!important}',
      'body#planify-pdf-document .planify-export-header p{margin:1px 0 0!important;color:#475569!important;font-size:10.5px!important;line-height:1.2!important}',
      'body#planify-pdf-document .planify-export-viewport{position:relative!important;flex:1 1 auto!important;min-height:0!important;width:100%!important;overflow:hidden!important}',
      'body#planify-pdf-document .planify-export-fit{width:100%!important;transform-origin:top left!important}',
      'body#planify-pdf-document .planify-export-footer{flex:0 0 4mm!important;padding-top:1mm!important;border-top:1px solid #e2e8f0!important;color:#94a3b8!important;font-size:7.5px!important;text-align:center!important}',
      'body#planify-pdf-document .planify-print-view{display:block!important;visibility:visible!important;opacity:1!important;width:100%!important;max-width:none!important;height:auto!important;min-height:0!important;max-height:none!important;margin:0!important;padding:0!important;overflow:visible!important;background:#fff!important;color:#0f172a!important;box-shadow:none!important;transform:none!important}',
      'body#planify-pdf-document .planify-print-view h1,body#planify-pdf-document .planify-print-view h2,body#planify-pdf-document .planify-print-view h3,body#planify-pdf-document .planify-print-view h4,body#planify-pdf-document .planify-print-view p{margin:0!important;color:#0f172a!important}',
      'body#planify-pdf-document .planify-print-view button,body#planify-pdf-document .planify-print-view svg,body#planify-pdf-document .planify-print-view .no-print{display:none!important}',
      'body#planify-pdf-document .planify-print-value{display:inline-block!important;min-height:18px!important;padding:2px 5px!important;border:1px solid #cbd5e1!important;border-radius:4px!important;background:#fff!important;color:#0f172a!important;font:inherit!important;white-space:pre-wrap!important}',
      'body#planify-pdf-document .planify-print-check{min-width:15px!important;padding:0!important;border:0!important;font-weight:800!important}',
      'body#planify-pdf-document .planify-export-diaria .planner-notebook{width:100%!important;max-width:none!important;padding:3mm!important;margin:0!important;background:#fff!important;box-shadow:none!important;border:1px solid #cbd5e1!important;border-radius:6px!important}',
      'body#planify-pdf-document .planify-export-diaria .notebook-header{display:none!important}',
      'body#planify-pdf-document .planify-export-diaria .notebook-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:3mm!important;align-items:start!important}',
      'body#planify-pdf-document .planify-export-diaria .notebook-col{display:grid!important;gap:2.5mm!important;background:#fff!important;border:0!important}',
      'body#planify-pdf-document .planify-export-diaria .card-section{margin:0!important;padding:2.5mm!important;min-height:0!important;background:#fff!important;color:#0f172a!important;border:1px solid #cbd5e1!important;border-radius:5px!important;box-shadow:none!important;break-inside:avoid!important;font-size:12px!important}',
      'body#planify-pdf-document .planify-export-diaria .section-title{margin:0 0 1.5mm!important;color:#334155!important;font-size:12px!important;font-weight:700!important}',
      'body#planify-pdf-document .planify-export-diaria .planify-print-value{width:100%!important;font-size:11px!important}',
      'body#planify-pdf-document .planify-export-semanal .day-summary{margin:0 0 2mm!important;padding:2mm 3mm!important;min-height:0!important;display:flex!important;flex-wrap:wrap!important;gap:2mm 4mm!important;background:#f8fafc!important;color:#0f172a!important;border:1px solid #cbd5e1!important;border-radius:5px!important;font-size:9px!important}',
      'body#planify-pdf-document .planify-export-semanal .table-wrap{width:100%!important;height:auto!important;max-height:none!important;overflow:visible!important}',
      'body#planify-pdf-document .planify-export-semanal table{width:100%!important;height:auto!important;min-height:0!important;table-layout:fixed!important;border-collapse:collapse!important;background:#fff!important}',
      'body#planify-pdf-document .planify-export-semanal thead{display:table-header-group!important}',
      'body#planify-pdf-document .planify-export-semanal tr{height:auto!important;min-height:0!important;background:#fff!important}',
      'body#planify-pdf-document .planify-export-semanal th{padding:2mm 1mm!important;background:#0f172a!important;color:#fff!important;border:1px solid #64748b!important;font-size:10.5px!important;line-height:1.1!important;font-weight:800!important;text-align:center!important}',
      'body#planify-pdf-document .planify-export-semanal td{height:auto!important;min-height:0!important;padding:1mm!important;background:#fff!important;color:#0f172a!important;border:1px solid #cbd5e1!important;font-size:9.5px!important;line-height:1.15!important;text-align:center!important;vertical-align:middle!important;white-space:normal!important;word-break:break-word!important}',
      'body#planify-pdf-document .planify-export-semanal td:first-child{width:11%!important;background:#f1f5f9!important;color:#0f172a!important;font-weight:700!important}',
      'body#planify-pdf-document .planify-export-semanal .leyenda{display:flex!important;flex-wrap:wrap!important;justify-content:center!important;gap:1.5mm 3mm!important;margin:2mm 0 0!important;padding:1mm!important;color:#334155!important;font-size:7.8px!important}',
      'body#planify-pdf-document .planify-export-mensual .cal-container{width:100%!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;background:#fff!important;box-shadow:none!important}',
      'body#planify-pdf-document .planify-export-mensual .cal-header{display:none!important}',
      'body#planify-pdf-document .planify-export-mensual .cal-grid{display:grid!important;grid-template-columns:repeat(7,1fr)!important;grid-template-rows:auto repeat(6,minmax(18mm,1fr))!important;width:100%!important;height:154mm!important;min-height:0!important;gap:0!important;overflow:hidden!important}',
      'body#planify-pdf-document .planify-export-mensual .cal-dia-nombre{padding:2mm 1mm!important;background:#0f172a!important;color:#fff!important;border:1px solid #94a3b8!important;font-size:9px!important;font-weight:800!important;text-align:center!important}',
      'body#planify-pdf-document .planify-export-mensual .cal-dia,body#planify-pdf-document .planify-export-mensual .month-cell{min-height:18mm!important;padding:1.5mm!important;background:#fff!important;color:#0f172a!important;border:1px solid #cbd5e1!important;font-size:8.5px!important;overflow:hidden!important}',
      'body#planify-pdf-document .planify-export-anual .encabezado-anual{display:none!important}',
      'body#planify-pdf-document .planify-export-anual .grid-12-meses{display:grid!important;grid-template-columns:repeat(4,1fr)!important;grid-template-rows:repeat(3,minmax(0,1fr))!important;gap:2.5mm!important;width:100%!important;height:158mm!important;overflow:hidden!important}',
      'body#planify-pdf-document .planify-export-anual .grid-12-meses>*{min-height:0!important;margin:0!important;padding:2mm!important;background:#fff!important;color:#0f172a!important;border:1px solid #cbd5e1!important;border-radius:5px!important;box-shadow:none!important;font-size:8.5px!important;overflow:hidden!important}',
      '@media print{body#planify-pdf-document .planify-export-page{break-after:page!important;page-break-after:always!important}body#planify-pdf-document .planify-export-page:last-child{break-after:auto!important;page-break-after:auto!important}}'
    ].join('\n');
  }

  function ajustarPaginas(doc) {
    Array.prototype.forEach.call(doc.querySelectorAll('.planify-export-page'), function(pagina) {
      var viewport = pagina.querySelector('.planify-export-viewport');
      var contenido = pagina.querySelector('.planify-export-fit');
      if (!viewport || !contenido) return;
      contenido.style.transform = 'none';
      contenido.style.width = '100%';
      var ancho = Math.max(contenido.scrollWidth, 1);
      var alto = Math.max(contenido.scrollHeight, 1);
      var escala = Math.min(1, viewport.clientWidth / ancho, viewport.clientHeight / alto);
      if (!isFinite(escala) || escala <= 0) escala = 1;
      contenido.style.transform = 'scale(' + escala.toFixed(4) + ')';
      contenido.setAttribute('data-planify-scale', escala.toFixed(3));
    });
  }

  function esperarRecursos(doc) {
    var fuentes = doc.fonts && doc.fonts.ready ? doc.fonts.ready.catch(function() {}) : Promise.resolve();
    var imagenes = Array.prototype.map.call(doc.images || [], function(imagen) {
      if (imagen.complete) return Promise.resolve();
      return new Promise(function(resolver) {
        imagen.addEventListener('load', resolver, { once: true });
        imagen.addEventListener('error', resolver, { once: true });
      });
    });
    return Promise.all([fuentes].concat(imagenes));
  }

  function prepararDocumento(paginas) {
    var anterior = document.getElementById('planify-pdf-frame');
    if (anterior && anterior.parentNode) anterior.parentNode.removeChild(anterior);
    var iframe = document.createElement('iframe');
    iframe.id = 'planify-pdf-frame';
    iframe.title = 'Vista previa de exportación PDF';
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);
    var doc = iframe.contentWindow.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PLANIFY - Exportación PDF</title><style id="planify-pdf-clean-styles">' + estilosDocumento() + '</style></head><body id="planify-pdf-document">' + paginas.join('') + '</body></html>');
    doc.close();
    return iframe;
  }

  function imprimirPaginas(paginas) {
    var iframe = prepararDocumento(paginas);
    var ventana = iframe.contentWindow;
    var doc = ventana.document;
    esperarRecursos(doc).then(function() {
      ajustarPaginas(doc);
      return new Promise(function(resolver) { setTimeout(resolver, 120); });
    }).then(function() {
      ajustarPaginas(doc);
      iframe.setAttribute('data-planify-ready', '1');
      ventana.focus();
      ventana.print();
    });
    ventana.addEventListener('afterprint', function() {
      setTimeout(function() { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 300);
    });
    setTimeout(function() { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 120000);
    return iframe;
  }

  function seleccionDelModal() {
    var seleccionadas = [];
    document.querySelectorAll('#modal-export-pdf-overlay input[data-planify-vista]').forEach(function(checkbox) {
      if (checkbox.checked) seleccionadas.push(checkbox.getAttribute('data-planify-vista'));
    });
    return seleccionadas;
  }

  function generarPDF() {
    var seleccionadas = seleccionDelModal();
    var mensaje = document.getElementById('planify-pdf-mensaje');
    if (!seleccionadas.length) {
      mensaje.textContent = 'Selecciona al menos una vista para continuar.';
      mensaje.style.display = 'block';
      return;
    }
    var paginas = OPCIONES.filter(function(opcion) { return seleccionadas.indexOf(opcion.id) !== -1; })
      .map(construirPagina).filter(Boolean);
    if (!paginas.length) {
      mensaje.textContent = 'No se encontró contenido disponible para imprimir.';
      mensaje.style.display = 'block';
      return;
    }
    cerrarModal();
    imprimirPaginas(paginas);
  }

  window.exportarVistaAPDF = function() {
    var pagina = construirPagina(opcionActiva());
    if (pagina) imprimirPaginas([pagina]);
  };

  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(evento) {
      var botonExportar = evento.target.closest && evento.target.closest('#btn-export-pdf');
      if (botonExportar) {
        evento.preventDefault();
        abrirModal();
        return;
      }
      var botonGenerar = evento.target.closest && evento.target.closest('#btn-generar-pdf');
      if (botonGenerar) {
        evento.preventDefault();
        generarPDF();
      }
    });
  });
})();
