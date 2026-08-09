/* PLANIFY v6.95 - EXPORTACIÓN PDF CON CIERRE Y ESPERA DE ANIMACIÓN */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
      const btnPdf = e.target.closest('#btn-export-pdf');
      if (!btnPdf) return;

      e.preventDefault();

      // 1. Buscar los elementos del panel y overlays
      const sidebar = document.querySelector('.sidebar, #sidebar, #panel-control, .sidebar-panel, [class*="sidebar"]');
      const overlay = document.querySelector('.modal-overlay, .sidebar-overlay, .overlay, .backdrop');
      const btnCerrar = document.querySelector('#btn-close-sidebar, .close-sidebar, .sidebar-close, #btn-panel-close');

      // 2. Simular clic de cierre o remover clases activas de inmediato
      if (btnCerrar) {
        btnCerrar.click();
      }

      if (sidebar) {
        sidebar.classList.remove('active', 'open', 'show');
        sidebar.style.display = 'none';
      }
      if (overlay) {
        overlay.classList.remove('active', 'open', 'show');
        overlay.style.display = 'none';
      }

      // 3. Esperar 350ms a que el navegador redibuje la pantalla completamente limpia
      setTimeout(function() {
        window.print();

        // 4. Restaurar estilos tras cerrar la ventana de impresión
        setTimeout(function() {
          if (sidebar) sidebar.style.display = '';
          if (overlay) overlay.style.display = '';
        }, 500);
      }, 350);
    });
  });
})();
