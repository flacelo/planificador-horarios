/* PLANIFY v6.90 - MÓDULO INDEPENDIENTE DE EXPORTACIÓN PDF */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const btnPdf = document.getElementById('btn-export-pdf');
    if (btnPdf) {
      btnPdf.addEventListener('click', function(e) {
        e.preventDefault();
        window.print();
      });
    }
  });
})();
