/* PLANIFY v6.94 - MÓDULO AUTÓNOMO DE EXPORTACIÓN PDF CON CIERRE DE PANEL */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
      const btnPdf = e.target.closest('#btn-export-pdf');
      if (!btnPdf) return;

      e.preventDefault();

      // 1. Identificar el botón de cerrar del sidebar/panel o los selectores del panel
      const btnCerrarPanel = document.querySelector('#btn-close-sidebar, .close-sidebar, .sidebar-close, #btn-panel-close');
      const sidebar = document.querySelector('.sidebar, #sidebar, #panel-control, .sidebar-panel');
      const overlay = document.querySelector('.modal-overlay, .sidebar-overlay, .overlay');

      // Guardar el estado previo para reabrirlo después
      const estabaVisible = sidebar && (sidebar.classList.contains('active') || sidebar.classList.contains('open') || sidebar.style.display !== 'none');

      // 2. Forzar el cierre o remoción física temporal del panel
      if (btnCerrarPanel) {
        btnCerrarPanel.click();
      } else if (sidebar) {
        sidebar.classList.remove('active', 'open');
        sidebar.style.display = 'none';
      }
      if (overlay) overlay.style.display = 'none';

      // 3. Esperar a que la animación de cierre termine (250ms) y disparar impresión limpia
      setTimeout(function() {
        window.print();

        // 4. Tras la impresión, restaurar el panel si estaba abierto
        setTimeout(function() {
          if (estabaVisible && sidebar) {
            sidebar.style.display = '';
            sidebar.classList.add('active');
            if (overlay) overlay.style.display = '';
          }
        }, 300);
      }, 250);
    });
  });
})();
