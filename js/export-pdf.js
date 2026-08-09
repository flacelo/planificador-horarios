/* PLANIFY v6.96 - EXPORTACIÓN PDF CON DESBLOQUEO COMPLETO DE VIEWPORT */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
      const btnPdf = e.target.closest('#btn-export-pdf');
      if (!btnPdf) return;

      e.preventDefault();

      // 1. Localizar sidebar, overlay y contenedores de modales
      const sidebar = document.querySelector('.sidebar, #sidebar, #panel-control, .sidebar-panel, [class*="sidebar"]');
      const overlay = document.querySelector('.modal-overlay, .sidebar-overlay, .overlay, .backdrop, [class*="overlay"]');
      const btnCerrar = document.querySelector('#btn-close-sidebar, .close-sidebar, .sidebar-close, #btn-panel-close');

      // 2. Liberar body/html de cualquier clase o estilo de bloqueo
      document.documentElement.classList.remove('sidebar-open', 'modal-open', 'no-scroll');
      document.body.classList.remove('sidebar-open', 'modal-open', 'no-scroll');
      document.documentElement.style.overflow = 'visible';
      document.body.style.overflow = 'visible';

      // 3. Simular clic de cierre y forzar ocultamiento físico
      if (btnCerrar) btnCerrar.click();

      if (sidebar) {
        sidebar.classList.remove('active', 'open', 'show');
        sidebar.style.setProperty('display', 'none', 'important');
      }
      if (overlay) {
        overlay.classList.remove('active', 'open', 'show');
        overlay.style.setProperty('display', 'none', 'important');
      }

      // 4. Forzar al motor gráfico del navegador a redibujar antes de imprimir
      requestAnimationFrame(function() {
        setTimeout(function() {
          window.print();

          // 5. Restaurar visibilidad tras imprimir
          setTimeout(function() {
            if (sidebar) sidebar.style.display = '';
            if (overlay) overlay.style.display = '';
          }, 400);
        }, 200);
      });
    });
  });
})();
