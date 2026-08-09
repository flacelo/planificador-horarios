/* PLANIFY v6.96 - EXPORTACIÓN PDF LIMPIA CON CIERRE AUTOMÁTICO DE PANEL */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
      const btnPdf = e.target.closest('#btn-export-pdf');
      if (!btnPdf) return;

      e.preventDefault();

      // 1. Clic automático en el botón de cerrar sidebar/panel si existe
      const btnCerrar = document.querySelector('#btn-close-sidebar, .close-sidebar, .sidebar-close, #btn-panel-close, .close-btn');
      if (btnCerrar) {
        btnCerrar.click();
      }

      // 2. Remover clases de bloqueo en html y body
      document.documentElement.classList.remove('sidebar-open', 'modal-open', 'no-scroll');
      document.body.classList.remove('sidebar-open', 'modal-open', 'no-scroll');
      document.documentElement.style.overflow = 'visible';
      document.body.style.overflow = 'visible';

      // 3. Forzar ocultamiento físico del panel y overlay
      const sidebar = document.querySelector('.sidebar, #sidebar, #panel-control, .sidebar-panel, [class*="sidebar"]');
      const overlay = document.querySelector('.modal-overlay, .sidebar-overlay, .overlay, .backdrop');

      if (sidebar) {
        sidebar.classList.remove('active', 'open', 'show');
        sidebar.style.setProperty('display', 'none', 'important');
      }
      if (overlay) {
        overlay.classList.remove('active', 'open', 'show');
        overlay.style.setProperty('display', 'none', 'important');
      }

      // 4. Esperar a que la pantalla se redibuje limpia y disparar la impresión
      requestAnimationFrame(function() {
        setTimeout(function() {
          window.print();

          // Restaurar visualización tras imprimir
          setTimeout(function() {
            if (sidebar) sidebar.style.display = '';
            if (overlay) overlay.style.display = '';
          }, 400);
        }, 250);
      });
    });
  });
})();
