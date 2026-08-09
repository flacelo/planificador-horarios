/* PLANIFY v7.00 - EXPORTACIÓN PDF AISLANDO LA VISTA ACTIVA (DOBLE VARIANTE DE IDS) */
(function() {
  var VISTAS = [
    '#vista-semanal', '#vista-mensual', '#vista-diario',
    '#view-semanal', '#view-mensual', '#view-diario',
    '#view-table', '#view-dashboard', '#vista-anual-metas'
  ];
  var MODALES = [
    '.modal-overlay', '.sidebar-overlay', '.side-overlay', '#side-overlay',
    '.sidebar-panel', '.side-panel', '#side-panel', '.panel-control', '#panel-control',
    '#modal-ajustes', '#modal-settings', '.modal'
  ];

  function ocultar(sel, activa, restauraciones) {
    var el = document.querySelector(sel);
    if (!el || el === activa) return;
    var disp = { value: el.style.getPropertyValue('display'), prio: el.style.getPropertyPriority('display') };
    restauraciones.push({ el: el, disp: disp });
    el.style.setProperty('display', 'none', 'important');
  }

  function restaurar(restauraciones) {
    restauraciones.forEach(function(r) {
      if (r.disp.prio) {
        r.el.style.setProperty('display', r.disp.value, r.disp.prio);
      } else if (r.disp.value) {
        r.el.style.display = r.disp.value;
      } else {
        r.el.style.removeProperty('display');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
      var btnPdf = e.target.closest('#btn-export-pdf');
      if (!btnPdf) return;

      e.preventDefault();

      // 1. Detectar la vista visible actual entre las variantes conocidas
      var activa = null;
      VISTAS.forEach(function(sel) {
        if (activa) return;
        var el = document.querySelector(sel);
        if (el && el.style && el.style.display !== 'none') activa = el;
      });
      // 1b. Fallback: cualquier nodo con clase .active que NO sea pestaña de panel ni modal
      if (!activa) {
        document.querySelectorAll('.view-content.active, .tab-content.active, [data-tab-content].active').forEach(function(el) {
          if (activa) return;
          var id = el.id || '';
          if (id.indexOf('tab-') === 0) return;
          if (MODALES.some(function(s) { return s.indexOf('#') === 0 && el.id === s.slice(1); })) return;
          activa = el;
        });
      }
      if (!activa) activa = document.querySelector('.view-content, [data-tab-content]');
      if (!activa) activa = document.querySelector('main, #main-container');
      if (!activa) activa = document.body;

      var idReal = activa.id ? String(activa.id) : 'vista-activa';
      var sufijo = String(idReal).replace(/^#?view-|^#?vista-/, '');
      var clasePrint = 'printing-' + sufijo;
      var clasesPrint = [clasePrint, 'printing-' + idReal];

      // 2. Ocultar temporalmente TODAS las demás vistas y modales, guardando su estado
      var restauraciones = [];
      VISTAS.forEach(function(sel) { ocultar(sel, activa, restauraciones); });
      MODALES.forEach(function(sel) { ocultar(sel, activa, restauraciones); });

      // 3. Marcar el body con las clases de impresión (ambas variantes de id)
      var bodyClasePrevia = null;
      if (document.body && document.body.classList) {
        bodyClasePrevia = document.body.className || '';
        clasesPrint.forEach(function(c) { document.body.classList.add(c); });
      }

      // 4. Crear el iframe temporal de impresión 100% aislado
      var iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      var doc = iframe.contentWindow.document;

      // 5. Copiar las hojas de estilo del documento original
      var estilosHTML = '';
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(function(style) {
        estilosHTML += style.outerHTML;
      });

      // 6. Inyectar ÚNICAMENTE la vista activa envuelta en un contenedor garantizado visible
      doc.open();
      doc.write('<!DOCTYPE html><html><head><title>PLANIFY - Exportación PDF</title>' +
        estilosHTML +
        '<style>' +
        'body { background: #ffffff !important; color: #000000 !important; padding: 20px !important; }' +
        '.sidebar, #panel-control, #side-panel, .side-panel, .sidebar-panel, .modal-overlay, .side-overlay, .sidebar-overlay, .modal, button, .btn { display: none !important; }' +
        '.tab-content, .view-content, [data-tab-content] { display: none !important; }' +
        '[data-planify-print] { display: block !important; }' +
        '[data-planify-print] .tab-content, [data-planify-print] .view-content, [data-planify-print] [data-tab-content] { display: block !important; }' +
        '[data-planify-print] #' + idReal + ' { display: block !important; }' +
        'table, .main-grid-container { width: 100% !important; margin: 0 !important; box-shadow: none !important; }' +
        '</style></head><body><div data-planify-print="1">' +
        (activa.outerHTML || '') +
        '</div></body></html>');
      doc.close();

      // 7. Disparar la impresión del contenido aislado y restaurar el DOM al completar
      setTimeout(function() {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();

        setTimeout(function() {
          restaurar(restauraciones);
          if (document.body && document.body.classList && bodyClasePrevia !== null) {
            clasesPrint.forEach(function(c) { document.body.classList.remove(c); });
          }
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 500);
      }, 300);
    });
  });
})();
