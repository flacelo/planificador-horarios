/* The report is generated on-device; there is no email transport. */
(function () {
  "use strict";

  function downloadWeeklyReport() {
    var message = document.getElementById("msg-report-email");
    var button = document.getElementById("btn-enviar-reporte");
    try {
      if (typeof window.getMailReportTemplate !== "function") throw new Error("No pude preparar el reporte.");
      var report = window.getMailReportTemplate();
      if (typeof report !== "string" || !report.trim()) throw new Error("El reporte está vacío.");
      var blob = new Blob([report], { type: "text/html;charset=utf-8" });
      var url = window.URL.createObjectURL(blob);
      var link = document.createElement("a");
      var date = new Date();
      var datePart = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
      link.href = url;
      link.download = "planify-reporte-semanal-" + datePart + ".html";
      link.hidden = true;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 1500);
      if (typeof window.cerrarReporte === "function") window.cerrarReporte();
      else {
        var modal = document.getElementById("modal-report");
        if (modal) modal.classList.remove("active");
      }
      var notice = document.createElement("div");
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      notice.className = "planify-local-report-notice";
      notice.textContent = "Reporte descargado en este dispositivo. No se envió ningún correo.";
      notice.style.cssText = "position:fixed;z-index:2147483000;left:50%;bottom:24px;transform:translateX(-50%);width:min(92vw,520px);padding:14px 18px;border:1px solid #3c8e78;border-radius:14px;background:#143c3b;color:#edfff8;box-shadow:0 12px 32px rgba(0,0,0,.24);font:700 .9rem/1.4 system-ui,sans-serif;text-align:center";
      document.body.appendChild(notice);
      window.setTimeout(function () { notice.remove(); }, 5000);
    } catch (error) {
      if (message) message.textContent = error && error.message ? error.message : "No pude descargar el reporte. Tu horario sigue intacto.";
      if (button) {
        button.disabled = false;
        button.textContent = "Descargar reporte";
      }
    }
  }

  function prepareReportDialog() {
    var modal = document.getElementById("modal-report");
    if (!modal) return;
    modal.setAttribute("aria-label", "Descargar reporte semanal");
    var heading = modal.querySelector("h3");
    if (heading) heading.textContent = "📊 Descargar reporte semanal";
    var description = modal.querySelector("p");
    if (description) description.textContent = "Guarda un resumen local que puedes abrir o imprimir. Planify no envía correos.";
    var email = document.getElementById("inp-report-email");
    if (email) email.remove();
    var message = document.getElementById("msg-report-email");
    if (message) {
      message.textContent = "";
      message.setAttribute("role", "status");
      message.setAttribute("aria-live", "polite");
    }
    var cancel = modal.querySelector(".btn-cancel");
    if (cancel) cancel.textContent = "Cancelar";
    var button = document.getElementById("btn-enviar-reporte");
    if (button) {
      button.textContent = "Descargar reporte";
      button.setAttribute("aria-label", "Descargar reporte semanal en este dispositivo");
      button.onclick = downloadWeeklyReport;
    }
    var reportCard = modal.querySelector(".modal");
    if (reportCard) reportCard.setAttribute("aria-label", "Descargar reporte semanal");
  }

  window.enviarReporteSemanal = downloadWeeklyReport;
  window.descargarReporteSemanal = downloadWeeklyReport;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", prepareReportDialog, { once: true });
  else prepareReportDialog();
})();
