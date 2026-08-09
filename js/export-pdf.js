/* PLANIFY v6.98 - EXPORTACIÓN PDF AISLANDO SOLO LA VISTA ACTIVA */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
      const btnPdf = e.target.closest('#btn-export-pdf');
      if (!btnPdf) return;

      e.preventDefault();

      // 1. Detectar dinámicamente la vista activa entre las vistas principales
      let vistaActiva = null;
      const vistas = document.querySelectorAll('.tab-content, .view-content, [data-tab-content]');
      vistas.forEach(function(v) {
        if (vistaActiva) return;
        if (v.classList && (v.classList.contains('active') || v.classList.contains('visible')) || (v.style && v.style.display === 'block')) {
          vistaActiva = v;
        }
      });
      if (!vistaActiva) {
        vistaActiva = document.querySelector('.tab-content, .view-content, [data-tab-content]');
      }
      if (!vistaActiva) {
        vistaActiva = document.querySelector('.main-grid-container, #planner-view, .cal-container, main, #main-container') || document.body;
      }

      // 2. Crear una ventana o iframe temporal de impresión 100% aislado
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;

      // 3. Copiar las hojas de estilo del documento original para mantener el formato impecable
      let estilosHTML = '';
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(style => {
        estilosHTML += style.outerHTML;
      });

      // 4. Inyectar ÚNICAMENTE la vista activa, descartando cualquier otra vista
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>PLANIFY - Exportación PDF</title>
          ${estilosHTML}
          <style>
            body { background: #ffffff !important; color: #000000 !important; padding: 20px !important; }
            .sidebar, #panel-control, .modal-overlay, button, .btn { display: none !important; }
            .tab-content, .view-content, [data-tab-content] { display: none !important; }
            .tab-content.active, .view-content.active, [data-tab-content].active { display: block !important; }
            table, .main-grid-container { width: 100% !important; margin: 0 !important; box-shadow: none !important; }
          </style>
        </head>
        <body>
          ${vistaActiva.outerHTML}
        </body>
        </html>
      `);
      doc.close();

      // 5. Disparar la impresión del contenido aislado
      setTimeout(function() {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();

        // Remover el iframe temporal después de imprimir
        setTimeout(function() {
          document.body.removeChild(iframe);
        }, 1000);
      }, 300);
    });
  });
})();
