/* PLANIFY v6.99 - EXPORTACIÓN PDF CON AISLAMIENTO ESTRICTO DE LA VISTA ACTIVA */
(function() {
  var VISTAS_PDF = ['#view-semanal', '#view-mensual', '#view-diario', '#view-table', '#view-dashboard'];

  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
      var btnPdf = e.target.closest('#btn-export-pdf');
      if (!btnPdf) return;

      e.preventDefault();

      // 1. Detectar la vista activa entre los contenedores principales
      var activa = null;
      VISTAS_PDF.forEach(function(sel) {
        if (activa) return;
        var el = document.querySelector(sel);
        if (el && el.style && el.style.display !== 'none') activa = el;
      });
      if (!activa) activa = document.querySelector('.view-content.active, [data-tab-content].active');
      if (!activa) activa = document.querySelector('.view-content, [data-tab-content]');
      if (!activa) activa = document.querySelector('main, #main-container') || document.body;

      var sufijo = activa && activa.id ? String(activa.id).replace(/^view-/, '') : 'vista';
      var clasePrint = 'printing-' + sufijo;

      // 2. Manipulación temporal del DOM real: ocultar TODAS las demás vistas
      var restauraciones = [];
      VISTAS_PDF.forEach(function(sel) {
        var el = document.querySelector(sel);
        if (!el) return;
        if (el === activa) return;
        restauraciones.push({ el: el, prev: el.style.getPropertyValue('display'), prio: el.style.getPropertyPriority('display') });
        el.style.setProperty('display', 'none', 'important');
      });

      // 3. Marcar el body con la clase de impresión de la vista activa
      var bodyClasesPrevias = null;
      if (document.body && document.body.classList) {
        bodyClasesPrevias = document.body.className || '';
        document.body.classList.add(clasePrint);
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

      // 6. Inyectar ÚNICAMENTE la vista activa con descarte quirúrgico de las demás
      doc.open();
      doc.write('<!DOCTYPE html><html><head><title>PLANIFY - Exportación PDF</title>' +
        estilosHTML +
        '<style>' +
        'body { background: #ffffff !important; color: #000000 !important; padding: 20px !important; }' +
        '.sidebar, #panel-control, #side-panel, .side-panel, .modal-overlay, .side-overlay, .sidebar-overlay, button, .btn { display: none !important; }' +
        '.tab-content, .view-content, [data-tab-content] { display: none !important; }' +
        '#view-semanal, #view-mensual, #view-diario, #view-table, #view-dashboard { display: none !important; }' +
        '#' + (activa.id || 'view-mensual') + ' { display: block !important; }' +
        'table, .main-grid-container { width: 100% !important; margin: 0 !important; box-shadow: none !important; }' +
        '</style></head><body>' +
        (activa.outerHTML || '') +
        '</body></html>');
      doc.close();

      // 7. Disparar la impresión del contenido aislado y restaurar el DOM tras completar
      setTimeout(function() {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();

        setTimeout(function() {
          // 8. Restaurar el estado original del DOM
          restauraciones.forEach(function(r) {
            if (r.prio) {
              r.el.style.setProperty('display', r.prev, r.prio);
            } else if (r.prev) {
              r.el.style.display = r.prev;
            } else {
              r.el.style.removeProperty('display');
            }
          });
          if (document.body && document.body.classList && bodyClasesPrevias !== null) {
            document.body.classList.remove(clasePrint);
          }
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 500);
      }, 300);
    });
  });
})();
