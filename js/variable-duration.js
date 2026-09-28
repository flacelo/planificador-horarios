(function () {
  "use strict";

  var time = window.PLANIFY_SCHEDULE_TIME;
  if (!time || !document.getElementById("modal") || document.getElementById("planify-block-duration")) return;

  var state = { applyingValidatedChange: false };
  var originalOpen = window.abrirModal;
  var originalSave = window.okModal;
  var originalConflict = window.verificarChoqueHorario;
  if (typeof originalOpen !== "function" || typeof originalSave !== "function") return;

  function activeWeeklySchedule() {
    return typeof plannerType === "undefined" || plannerType === "semanal";
  }

  function fallbackMinutes() {
    var select = document.getElementById("sel-intervalo");
    var value = select ? Number(select.value) : 15;
    return Number.isInteger(value) && value > 0 ? value : 15;
  }

  function currentCell(rowIndex, dayIndex) {
    var row = typeof filas !== "undefined" && filas[rowIndex];
    return row && Array.isArray(row.celdas) ? row.celdas[dayIndex] : null;
  }

  function currentDuration(rowIndex, dayIndex) {
    var rows = typeof filas !== "undefined" ? filas : [];
    var cell = currentCell(rowIndex, dayIndex);
    var result = time.activityInterval(rows, rowIndex, cell, fallbackMinutes());
    return result.ok ? result.durationMinutes : fallbackMinutes();
  }

  function ensureDurationField() {
    var modal = document.getElementById("modal");
    var category = document.getElementById("modal-categoria");
    if (!modal || !category) return null;
    var field = document.getElementById("planify-block-duration");
    if (field) return field;

    var wrapper = document.createElement("div");
    wrapper.className = "planify-block-duration";
    var label = document.createElement("label");
    label.htmlFor = "planify-block-duration";
    label.textContent = "Duración de la actividad o pausa";
    field = document.createElement("input");
    field.type = "number";
    field.id = "planify-block-duration";
    field.min = "5";
    field.max = "720";
    field.step = "5";
    field.inputMode = "numeric";
    field.setAttribute("aria-describedby", "planify-block-duration-hint planify-block-duration-error");
    var suffix = document.createElement("span");
    suffix.textContent = "min";
    var hint = document.createElement("small");
    hint.id = "planify-block-duration-hint";
    hint.textContent = "De 5 a 720 minutos, en saltos de 5. Solo se ajusta este bloque.";
    var error = document.createElement("p");
    error.id = "planify-block-duration-error";
    error.setAttribute("role", "alert");
    error.hidden = true;
    wrapper.appendChild(label);
    var inputLine = document.createElement("div");
    inputLine.className = "planify-block-duration-input";
    inputLine.appendChild(field);
    inputLine.appendChild(suffix);
    wrapper.appendChild(inputLine);
    wrapper.appendChild(hint);
    wrapper.appendChild(error);
    category.insertAdjacentElement("beforebegin", wrapper);
    field.addEventListener("input", function () { error.hidden = true; });
    return field;
  }

  function selectedIndices() {
    return {
      row: typeof modalFila === "number" ? modalFila : -1,
      day: typeof modalCol === "number" ? modalCol : -1
    };
  }

  function syncDurationField() {
    var field = ensureDurationField();
    if (!field) return;
    var wrapper = field.closest(".planify-block-duration");
    var indices = selectedIndices();
    var isWeekly = activeWeeklySchedule();
    var multiEdit = typeof mergeSeleccion !== "undefined" && Array.isArray(mergeSeleccion) && mergeSeleccion.length > 1;
    wrapper.hidden = !isWeekly;
    field.disabled = !isWeekly || multiEdit;
    if (multiEdit) {
      wrapper.querySelector("small").textContent = "Para cambiar la duración, edita un bloque a la vez.";
      return;
    }
    wrapper.querySelector("small").textContent = "De 5 a 720 minutos, en saltos de 5. Solo se ajusta este bloque.";
    field.value = String(currentDuration(indices.row, indices.day));
    var error = document.getElementById("planify-block-duration-error");
    error.hidden = true;
    error.textContent = "";
  }

  function showDurationError(message) {
    var error = document.getElementById("planify-block-duration-error");
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
    var field = document.getElementById("planify-block-duration");
    if (field) field.focus();
  }

  function syncAfterSave() {
    if (typeof window.renderizar === "function") window.setTimeout(function () {
      if (window.PLANIFY_COMPLETION_HISTORY) window.PLANIFY_COMPLETION_HISTORY.refresh();
    }, 0);
  }

  if (typeof window.calcularEstadisticasSemanales === "function") {
    var originalWeeklyStats = window.calcularEstadisticasSemanales;
    window.calcularEstadisticasSemanales = function () {
      var result = originalWeeklyStats.apply(this, arguments);
      var hoursByCategory = {};
      var totalHours = 0;
      if (!result || typeof filas === "undefined") return result;
      filas.forEach(function (row, rowIndex) {
        (row.celdas || []).forEach(function (cell) {
          if (!time.isMeaningful(cell)) return;
          var range = time.activityInterval(filas, rowIndex, cell, fallbackMinutes());
          if (!range.ok) return;
          var hours = range.durationMinutes / 60;
          var category = cell.c || "libre";
          hoursByCategory[category] = (hoursByCategory[category] || 0) + hours;
          totalHours += hours;
        });
      });
      result.totalHours = totalHours;
      (result.categories || []).forEach(function (category) { category.hours = hoursByCategory[category.id] || 0; });
      return result;
    };
  }

  window.abrirModal = function () {
    var result = originalOpen.apply(this, arguments);
    syncDurationField();
    return result;
  };

  window.verificarChoqueHorario = function () {
    if (state.applyingValidatedChange) return null;
    return typeof originalConflict === "function" ? originalConflict.apply(this, arguments) : null;
  };

  window.okModal = function () {
    var field = document.getElementById("planify-block-duration");
    var indices = selectedIndices();
    var multiEdit = typeof mergeSeleccion !== "undefined" && Array.isArray(mergeSeleccion) && mergeSeleccion.length > 1;
    if (!field || !activeWeeklySchedule() || multiEdit || field.disabled) return originalSave.apply(this, arguments);

    var requested = Number(field.value);
    var current = currentDuration(indices.row, indices.day);
    if (requested === current) return originalSave.apply(this, arguments);
    if (!Number.isInteger(requested) || requested < 5 || requested > 720 || requested % 5 !== 0) {
      showDurationError("Usa un número entero entre 5 y 720, en saltos de 5 minutos.");
      return;
    }

    var before = typeof filas !== "undefined" ? filas : null;
    if (!Array.isArray(before) || typeof dias === "undefined") {
      showDurationError("No se pudo leer el horario. No se aplicó ningún cambio.");
      return;
    }
    var updated = time.setDuration({ dias: dias, filas: before }, indices.day, indices.row, requested, fallbackMinutes());
    if (!updated.ok) {
      showDurationError(updated.error || "No se pudo ajustar la duración. No se modificó el horario.");
      return;
    }

    try {
      filas = updated.schedule.filas;
      state.applyingValidatedChange = true;
      var result = originalSave.apply(this, arguments);
      syncAfterSave();
      return result;
    } catch (error) {
      filas = before;
      state.applyingValidatedChange = false;
      if (typeof window.renderizar === "function") window.renderizar();
      if (typeof window.autoGuardar === "function") window.autoGuardar();
      showDurationError("No se pudo guardar. Restauré el horario que tenías antes del cambio.");
      return;
    } finally {
      state.applyingValidatedChange = false;
    }
  };
})();
