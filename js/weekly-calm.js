/* A calmer weekly layout around the existing schedule and its handlers. */
(function () {
  "use strict";

  function init() {
    var view = document.getElementById("view-semanal");
    var tableView = document.getElementById("view-table");
    var nav = document.getElementById("nav-bar-semanal");
    var actions = tableView && tableView.querySelector(".table-actions");
    var table = document.getElementById("table-wrap");
    if (!view || !tableView || !nav || !actions || !table || view.classList.contains("weekly-calm-ready")) return;

    var intro = document.createElement("header");
    intro.className = "weekly-calm-intro";
    intro.innerHTML = '<span class="weekly-calm-eyebrow">TU TIEMPO, A TU MANERA</span>' +
      '<h2>Tu semana, de un vistazo</h2>' +
      '<p>Cada espacio de la tabla se puede editar. Ajusta tus planes cuando cambie tu día.</p>';
    view.insertBefore(intro, nav);
    nav.setAttribute("aria-label", "Cambiar de semana");
    var previous = document.getElementById("btn-prev-sem");
    var next = document.getElementById("btn-next-sem");
    if (previous) previous.setAttribute("aria-label", "Semana anterior");
    if (next) next.setAttribute("aria-label", "Semana siguiente");

    var gridBar = document.createElement("div");
    gridBar.className = "weekly-calm-grid-bar";
    var heading = document.createElement("div");
    heading.className = "weekly-calm-grid-title";
    heading.innerHTML = '<span>MI HORARIO</span><h3>Actividades de la semana</h3>';
    gridBar.appendChild(heading);

    var more = document.createElement("details");
    more.className = "weekly-calm-more";
    more.innerHTML = '<summary>Opciones del horario <span aria-hidden="true">⌄</span></summary>';
    more.appendChild(actions);
    gridBar.appendChild(more);
    tableView.insertBefore(gridBar, table);

    var dayButtons = [];
    var selectedDay = 0;
    var selectedSummary = document.createElement("div");
    selectedSummary.className = "weekly-calm-selected-day";
    selectedSummary.setAttribute("aria-live", "polite");
    selectedSummary.innerHTML = '<div class="weekly-calm-selected-copy"><strong class="weekly-calm-selected-name"></strong>' +
      '<span class="weekly-calm-selected-count"></span></div>' +
      '<div class="weekly-calm-progress" role="progressbar" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0">' +
      '<span></span></div>';

    function syncMergedControls() {
      table.querySelectorAll("#tabla td.merged-cell[data-fi][data-ci]").forEach(function (cell) {
        cell.tabIndex = 0;
        cell.setAttribute("aria-label", "Editar bloque unido: " + cell.textContent.trim());
      });
      var mergeInfo = document.getElementById("merge-info");
      var count = table.querySelectorAll("#tabla td.merged-cell").length;
      if (mergeInfo && count) mergeInfo.textContent = count + " bloques unidos. Toca uno para editarlo. Para separarlo, cancela la edición y usa Dividir en estos ajustes.";
    }
    function syncScheduleCells() {
      var headers = table.querySelectorAll("#thead tr:first-child th");
      var rows = table.querySelectorAll("#tbody tr");
      table.querySelectorAll("#tabla td.celda[data-fi][data-ci]").forEach(function (cell) {
        var rowIndex = Number(cell.dataset.fi);
        var dayIndex = Number(cell.dataset.ci);
        var row = rows[rowIndex];
        var header = headers[dayIndex + 1];
        var timeInput = row && row.cells[0] && row.cells[0].querySelector("input");
        var time = timeInput ? timeInput.value.trim() : "";
        var day = header ? header.textContent.trim() : "Día";
        var copy = cell.cloneNode(true);
        copy.querySelectorAll(".done-check, .reminder-bell, .merge-indicator").forEach(function (control) {
          control.remove();
        });
        var activity = (copy.textContent || "").replace(/\s+/g, " ").trim();
        var empty = !activity || /^[—–-]+$/.test(activity);
        var normalized = activity.toLocaleLowerCase("es");
        var kind = "default";
        if (/almuerzo|cena|desayuno|comida|merienda/.test(normalized)) kind = "food";
        else if (/libre|descans|desconex|dormir|sueño|siesta|personal|amigos|familia/.test(normalized)) kind = "rest";
        else if (/ejercicio|deporte|salud|medic|rutina|entrenamiento|fisiolog/.test(normalized)) kind = "wellbeing";
        else if (/estudio|proyecto|clase|enseñanza|curso|laboratorio|riesgos|proceso|minero|inspecciones|saneamiento|integrador|preparación/.test(normalized)) kind = "focus";
        var check = cell.querySelector(".done-check");
        var completed = cell.classList.contains("done") || cell.classList.contains("is-complete") ||
          !!(check && (check.classList.contains("checked") || check.classList.contains("done") || check.classList.contains("is-complete")));
        ["default", "food", "rest", "wellbeing", "focus"].forEach(function (name) {
          cell.classList.toggle("weekly-kind-" + name, name === kind);
        });
        cell.classList.toggle("weekly-cell-empty", empty);
        cell.classList.toggle("weekly-cell-done", completed);
        cell.tabIndex = 0;
        var action = cell.classList.contains("merged-cell") ? " Toca o pulsa Enter para editar el bloque unido." :
          empty ? " Toca para añadir una actividad." : " Toca para editarla.";
        cell.setAttribute("aria-label", day + (time ? ", " + time : "") + ": " + (empty ? "espacio libre" : activity) +
          (completed ? ", completada." : ".") + action);
      });
      syncDaySummaries();
    }

    function syncDaySummaries() {
      if (!dayButtons.length) return;
      var cells = Array.prototype.slice.call(table.querySelectorAll("#tbody td.celda[data-ci]"));
      var summaries = dayButtons.map(function (button) {
        var dayIndex = Number(button.dataset.dayIndex);
        var planned = cells.filter(function (cell) {
          return Number(cell.dataset.ci) === dayIndex && !cell.classList.contains("weekly-cell-empty");
        });
        var done = planned.filter(function (cell) { return cell.classList.contains("weekly-cell-done"); }).length;
        var count = button.querySelector(".weekly-calm-day-count");
        if (count) count.textContent = planned.length ? done + "/" + planned.length : "—";
        button.setAttribute("aria-label", "Ver " + (dayLabels[dayIndex] || "día") + (planned.length ?
          ", " + done + " de " + planned.length + " actividades completadas" : ", sin actividades planificadas"));
        return { planned: planned.length, done: done };
      });
      var selected = summaries[selectedDay] || { planned: 0, done: 0 };
      var name = selectedSummary.querySelector(".weekly-calm-selected-name");
      var count = selectedSummary.querySelector(".weekly-calm-selected-count");
      var progress = selectedSummary.querySelector(".weekly-calm-progress");
      var fill = progress && progress.querySelector("span");
      var dayName = dayLabels[selectedDay] || "Día";
      if (name) name.textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      if (count) count.textContent = selected.planned ? selected.done + " de " + selected.planned + " actividades completadas" : "Sin actividades planificadas";
      if (progress) {
        progress.setAttribute("aria-label", "Progreso de actividades del " + dayName);
        progress.setAttribute("aria-valuemax", String(selected.planned));
        progress.setAttribute("aria-valuenow", String(selected.done));
      }
      if (fill) fill.style.width = selected.planned ? Math.round(selected.done * 100 / selected.planned) + "%" : "0%";
    }
    function openMergedEditor(cell) {
      if (!cell || typeof window.abrirModal !== "function") return;
      window.abrirModal(Number(cell.dataset.fi), Number(cell.dataset.ci));
      var rows = table.querySelector("#tbody").rows;
      var firstRow = rows[Number(cell.dataset.fi)];
      var lastRow = rows[Number(cell.dataset.fi) + cell.rowSpan - 1];
      var firstTime = firstRow && firstRow.cells[0].querySelector("input");
      var lastTime = lastRow && lastRow.cells[0].querySelector("input");
      var start = firstTime && firstTime.value.match(/\d{1,2}:\d{2}/g);
      var end = lastTime && lastTime.value.match(/\d{1,2}:\d{2}/g);
      var title = document.getElementById("modal-titulo");
      if (title && start && end) title.textContent = title.textContent.split(" — ")[0] + " — " + start[0] + " – " + end[end.length - 1];
    }
    table.addEventListener("click", function (event) {
      syncMergedControls();
      var cell = event.target.closest("#tabla td.merged-cell.merge-selected[data-fi][data-ci]");
      if (cell && !event.target.closest(".done-check")) openMergedEditor(cell);
      if (event.target.closest("#tabla .done-check")) window.setTimeout(syncScheduleCells, 0);
    });
    table.addEventListener("change", syncScheduleCells);
    table.addEventListener("keydown", function (event) {
      var cell = event.target.closest("#tabla td.merged-cell[data-fi][data-ci]");
      if (!cell || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      openMergedEditor(cell);
    });
    table.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      var cell = event.target.closest("#tabla td.celda[data-fi][data-ci]");
      if (!cell || cell.classList.contains("merged-cell") || event.target.closest(".done-check, input, button, a")) return;
      event.preventDefault();
      cell.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    });
    syncMergedControls();
    syncScheduleCells();
    document.addEventListener("click", function (event) {
      if (more.open && !more.contains(event.target)) more.open = false;
    });

    var newSchedule = actions.querySelector(".btn-dark");
    if (newSchedule) {
      newSchedule.textContent = "Crear un horario nuevo";
      newSchedule.removeAttribute("style");
    }

    var hint = document.createElement("p");
    hint.className = "weekly-calm-scroll-hint";
    hint.textContent = "Elige un día para ver sus actividades con más espacio.";
    tableView.insertBefore(hint, table);

    var dayPicker = document.createElement("div");
    dayPicker.className = "weekly-calm-day-picker";
    dayPicker.setAttribute("role", "group");
    dayPicker.setAttribute("aria-label", "Elegir día para ver el horario");
    var dayLabels = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
    var dayHeaders = table.querySelectorAll("#thead tr:first-child th");
    for (var dayIndex = 1; dayIndex < dayHeaders.length; dayIndex++) {
      var dayName = dayLabels[dayIndex - 1] || dayHeaders[dayIndex].textContent.trim().toLowerCase();
      var dayButton = document.createElement("button");
      dayButton.type = "button";
      dayButton.className = "weekly-calm-day-button";
      var dayLabel = document.createElement("span");
      dayLabel.className = "weekly-calm-day-label";
      dayLabel.textContent = dayHeaders[dayIndex].textContent.trim().slice(0, 3);
      var dayCount = document.createElement("span");
      dayCount.className = "weekly-calm-day-count";
      dayCount.textContent = "—";
      dayButton.appendChild(dayLabel);
      dayButton.appendChild(dayCount);
      dayButton.setAttribute("aria-label", "Ver " + dayName);
      dayButton.setAttribute("aria-pressed", dayIndex === 1 ? "true" : "false");
      dayButton.dataset.dayIndex = String(dayIndex - 1);
      dayPicker.appendChild(dayButton);
      dayButtons.push(dayButton);
    }
    tableView.insertBefore(dayPicker, table);
    tableView.insertBefore(selectedSummary, table);

    function applyMobileDay() {
      var compact = window.matchMedia && window.matchMedia("(max-width: 700px)").matches;
      tableView.dataset.mobileDay = String(selectedDay);
      var headers = table.querySelectorAll("#thead tr:first-child th");
      headers.forEach(function (cell, index) {
        cell.style.display = !compact || index === 0 || index - 1 === selectedDay ? "" : "none";
      });
      table.querySelectorAll("#tbody td[data-ci]").forEach(function (cell) {
        cell.style.display = !compact || Number(cell.dataset.ci) === selectedDay ? "" : "none";
      });
      dayButtons.forEach(function (button) {
        button.setAttribute("aria-pressed", Number(button.dataset.dayIndex) === selectedDay ? "true" : "false");
      });
      syncDaySummaries();
    }
    dayPicker.addEventListener("click", function (event) {
      var button = event.target.closest(".weekly-calm-day-button");
      if (!button) return;
      selectedDay = Number(button.dataset.dayIndex);
      applyMobileDay();
    });
    window.addEventListener("resize", applyMobileDay, { passive: true });
    new MutationObserver(function () {
      syncMergedControls();
      syncScheduleCells();
      applyMobileDay();
    }).observe(table, { childList: true, subtree: true });
    applyMobileDay();

    var legend = document.getElementById("leyenda");
    if (legend && legend.parentNode === tableView) {
      var legendDetails = document.createElement("details");
      legendDetails.className = "weekly-calm-legend";
      legendDetails.innerHTML = "<summary>Ver colores y categorías</summary>";
      legend.parentNode.insertBefore(legendDetails, legend);
      legendDetails.appendChild(legend);
    }

    view.classList.add("weekly-calm-ready");
    document.documentElement.classList.add("planify-weekly-calm-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
