/* PLANIFY v6.97 - EXPORTACIÓN PDF MEDIANTE CAPTURA DE VISTA LIMPIA */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
      const btnPdf = e.target.closest('#btn-export-pdf');
      if (!btnPdf) return;

      e.preventDefault();

      // 1. Identificar la vista o cuadrícula activa de la agenda
      const vistaActiva = document.querySelector('.main-grid-container, #planner-view, .cal-container, main, #main-container') || document.body;

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

      // 4. Inyectar contenido limpio sin panel lateral ni overlays
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
