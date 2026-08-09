/* PLANIFY v7.01 - CAPTURA PDF 100% SILENCIOSA SIN TOCAR EL DOM DE LA APLICACIÓN */
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

  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
      var btnPdf = e.target.closest('#btn-export-pdf');
      if (!btnPdf) return;

      e.preventDefault();

      // 1. Detectar la vista activa SIN modificar el DOM real (solo lectura)
      var activa = null;
      VISTAS.forEach(function(sel) {
        if (activa) return;
        var el = document.querySelector(sel);
        if (el && el.style && el.style.display !== 'none') activa = el;
      });
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

      // 2. Iframe offscreen silencioso (nada del DOM del usuario se modifica)
      var iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      var doc = iframe.contentWindow.document;

      // 3. Copiar las hojas de estilo del documento original
      var estilosHTML = '';
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(function(style) {
        estilosHTML += style.outerHTML;
      });

      // 4. Clonar ÚNICAMENTE la vista activa en el DOM virtual del iframe.
      //    Las clases printing-* se aplican SOLO al body del iframe (no al real)
      //    para neutralizar las reglas @media print body:not(.printing-*) de las hojas copiadas.
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
        '</style></head>' +
        '<body class="printing-' + sufijo + ' printing-' + idReal + '">' +
        '<div data-planify-print="1">' +
        (activa.outerHTML || '') +
        '</div></body></html>');
      doc.close();

      // 5. Disparar la impresión del clon aislado y limpiar el iframe
      setTimeout(function() {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();

        setTimeout(function() {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 500);
      }, 300);
    });
  });
})();
