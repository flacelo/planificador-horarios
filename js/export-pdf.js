/* PLANIFY v6.93 - MÓDULO AUTÓNOMO DE EXPORTACIÓN PDF LIMPIO */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const btnPdf = document.getElementById('btn-export-pdf');
    if (btnPdf) {
      btnPdf.addEventListener('click', function(e) {
        e.preventDefault();

        // 1. Ocultar o cerrar temporalmente el panel lateral y overlays
        const sidebar = document.querySelector('.sidebar, #sidebar, #panel-control, .sidebar-panel');
        const overlay = document.querySelector('.modal-overlay, .sidebar-overlay');

        if (sidebar) sidebar.style.display = 'none';
        if (overlay) overlay.style.display = 'none';

        // 2. Disparar ventana de impresión/PDF
        setTimeout(function() {
          window.print();

          // 3. Restaurar la visibilidad del panel tras lanzar la impresión
          setTimeout(function() {
            if (sidebar) sidebar.style.display = '';
            if (overlay) overlay.style.display = '';
          }, 500);
        }, 100);
      });
    }
  });
})();
