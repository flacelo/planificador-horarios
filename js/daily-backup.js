/* Export and restore a scoped PLANIFY backup without exposing unrelated storage. */
(function () {
  "use strict";

  var LEGACY_DAILY_KEYS = [
    "planify_titulo_rutina",
    "planify_diario_titulo_custom",
    "planify_sueño_horas",
    "planify_sueño_seleccionado",
    "planify_rating_diario"
  ];
  var MAX_FILE_BYTES = 10 * 1024 * 1024;
  var WELCOME_BACKUP_PREFIX = "planify_bienvenida_respaldo_";

  function parseJson(value) {
    try { return value ? JSON.parse(value) : null; } catch (error) { return null; }
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    var date = new Date(value + "T12:00:00");
    return !isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4)) &&
      date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10));
  }

  function validSchedule(data) {
    if (!data || !Array.isArray(data.dias) || data.dias.length < 2 || data.dias.length > 31 ||
        !data.dias.every(function (day) { return typeof day === "string"; }) ||
        !Array.isArray(data.filas) || data.filas.length < 1 || data.filas.length > 1000) return false;
    return data.filas.every(function (row) {
      return row && typeof row === "object" && typeof row.hora === "string" && row.hora.trim() &&
        Array.isArray(row.celdas) && row.celdas.length === data.dias.length && row.celdas.every(function (cell) {
          return cell && typeof cell === "object" && (cell.t == null || typeof cell.t === "string");
        });
    });
  }

  function latestPreviousWeek() {
    var keys = [];
    for (var index = 0; index < localStorage.length; index += 1) {
      var key = localStorage.key(index);
      if (key && /^planify_bienvenida_respaldo_\d+$/.test(key)) keys.push(key);
    }
    keys.sort(function (a, b) { return Number(b.slice(WELCOME_BACKUP_PREFIX.length)) - Number(a.slice(WELCOME_BACKUP_PREFIX.length)); });
    for (var i = 0; i < keys.length; i += 1) {
      var raw = localStorage.getItem(keys[i]);
      var backup = parseJson(raw);
      if (!backup || typeof backup.weeklySchedule !== "string") continue;
      var schedule = parseJson(backup.weeklySchedule);
      if (!validSchedule(schedule)) continue;
      var savedAt = new Date(backup.savedAt);
      if (isNaN(savedAt.getTime())) savedAt = new Date(Number(keys[i].slice(WELCOME_BACKUP_PREFIX.length)));
      return { key: keys[i], raw: raw, weeklySchedule: backup.weeklySchedule, savedAt: savedAt };
    }
    return null;
  }

  function previousWeekLabel(copy) {
    if (!copy || isNaN(copy.savedAt.getTime())) return "Copia anterior disponible";
    return "Copia del " + new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(copy.savedAt);
  }

  function refreshPreviousWeek() {
    var button = document.getElementById("btn-restore-previous-week");
    var caption = document.getElementById("planify-previous-week-caption");
    if (!button || !caption) return;
    var copy;
    try { copy = latestPreviousWeek(); } catch (error) { copy = null; }
    button.disabled = !copy;
    caption.textContent = copy ? previousWeekLabel(copy) + " · Solo cambiará tu horario semanal." :
      "Aparecerá aquí cuando reemplaces un horario semanal. Tus otros datos no cambian.";
  }

  function nextWelcomeBackupKey() {
    var stamp = Date.now();
    while (localStorage.getItem(WELCOME_BACKUP_PREFIX + stamp) !== null) stamp += 1;
    return WELCOME_BACKUP_PREFIX + stamp;
  }

  function restorePreviousWeek(copy) {
    var weeklyKey = "horario_data_semanal";
    var typeKey = "horario_planner_type";
    var currentWeekly;
    var currentType;
    var currentProfile;
    try {
      if (localStorage.getItem(copy.key) !== copy.raw || !validSchedule(parseJson(copy.weeklySchedule))) {
        return "La copia cambió o ya no es válida. No se modificó tu horario.";
      }
      currentWeekly = localStorage.getItem(weeklyKey);
      currentType = localStorage.getItem(typeKey);
      currentProfile = localStorage.getItem("planify_personalizacion_v1");
    } catch (error) { return "No se pudo leer la copia. No se modificó tu horario."; }

    var undoKey = null;
    try {
      if (currentWeekly !== null) {
        undoKey = nextWelcomeBackupKey();
        localStorage.setItem(undoKey, JSON.stringify({
          savedAt: new Date().toISOString(),
          weeklySchedule: currentWeekly,
          plannerType: currentType,
          personalProfile: currentProfile
        }));
      }
      localStorage.setItem(weeklyKey, copy.weeklySchedule);
      localStorage.setItem(typeKey, "semanal");
    } catch (error) {
      var restored = true;
      [[weeklyKey, currentWeekly], [typeKey, currentType], [undoKey, null]].forEach(function (entry) {
        if (!entry[0]) return;
        try {
          if (entry[1] === null) localStorage.removeItem(entry[0]);
          else localStorage.setItem(entry[0], entry[1]);
          if (localStorage.getItem(entry[0]) !== entry[1]) restored = false;
        } catch (rollbackError) { restored = false; }
      });
      return restored ? "No se pudo restaurar. El horario que tenías sigue intacto." :
        "No se pudo completar ni comprobar la recuperación. Revisa tu horario antes de intentarlo otra vez.";
    }
    return null;
  }

  function confirmPreviousWeek() {
    var copy;
    try { copy = latestPreviousWeek(); } catch (error) { copy = null; }
    if (!copy) { refreshPreviousWeek(); return showMessage("No encontramos un horario anterior válido en este navegador.", true); }
    if (document.getElementById("planify-previous-week-confirm")) return;
    var opener = document.getElementById("btn-restore-previous-week");
    var dialog = document.createElement("dialog");
    dialog.id = "planify-previous-week-confirm";
    dialog.className = "panel-previous-week-confirm";
    dialog.setAttribute("aria-labelledby", "planify-previous-week-confirm-title");
    dialog.setAttribute("aria-describedby", "planify-previous-week-confirm-description");
    dialog.innerHTML = '<h2 id="planify-previous-week-confirm-title">¿Restaurar tu horario anterior?</h2>' +
      '<p id="planify-previous-week-confirm-description"></p>' +
      '<div><button type="button" data-previous-week-cancel>Cancelar</button><button type="button" data-previous-week-confirm>Restaurar horario</button></div>';
    dialog.querySelector("#planify-previous-week-confirm-description").textContent = previousWeekLabel(copy) +
      " · Solo se reemplazará Semanal. Guardaremos una copia de tu horario actual para que también puedas recuperarlo.";
    document.body.appendChild(dialog);
    function dismiss(message) {
      dialog.close();
      dialog.remove();
      if (opener) opener.focus({ preventScroll: true });
      if (message) showMessage(message, false);
    }
    dialog.addEventListener("cancel", function (event) { event.preventDefault(); dismiss("Restauración cancelada. Tu horario no cambió."); });
    dialog.querySelector("[data-previous-week-cancel]").addEventListener("click", function () { dismiss("Restauración cancelada. Tu horario no cambió."); });
    dialog.querySelector("[data-previous-week-confirm]").addEventListener("click", function (event) {
      event.currentTarget.disabled = true;
      var error = restorePreviousWeek(copy);
      if (error) {
        dismiss();
        refreshPreviousWeek();
        showMessage(error, true);
        return;
      }
      showMessage("Horario anterior restaurado. PLANIFY se actualizará ahora.", false);
      dialog.close();
      dialog.remove();
      window.location.reload();
    });
    dialog.showModal();
    dialog.querySelector("[data-previous-week-cancel]").focus();
  }

  function exportBackup() {
    if (typeof window.getDatosCompletos !== "function") throw new Error("La copia todavía no está disponible.");
    var data = window.getDatosCompletos();
    var history = window.PLANIFY_COMPLETION_HISTORY;
    if (!history || typeof history.exportState !== "function") throw new Error("Espera un momento y vuelve a descargar la copia.");
    var completionState = history.exportState();
    if (!completionState || !history.validState(completionState)) throw new Error("No se pudo leer el historial; no se generó una copia incompleta.");
    var focusHistory = window.PLANIFY_FOCUS_ACTIVITY_HISTORY;
    if (!focusHistory || typeof focusHistory.read !== "function" || typeof focusHistory.validState !== "function") {
      throw new Error("La copia de enfoque todavía no está disponible; vuelve a intentarlo.");
    }
    var focusState = focusHistory.read(localStorage);
    if (!focusState.ok || !focusHistory.validState(focusState.state)) throw new Error("No se pudo leer el historial por actividad; no se generó una copia incompleta.");
    data.backupVersion = 4;
    data.cumplimiento = { historialV1: completionState };
    data.enfoque = { actividadV1: focusState.state };
    var specialty = document.getElementById("sel-especialidad");
    var customSpecialty = document.getElementById("inp-especialidad");
    data.especialidad = specialty ?
      (specialty.value === "Agregar especialidad..." ? (customSpecialty ? customSpecialty.value.trim() : "") : specialty.value) : "";
    var url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    var link = document.createElement("a");
    link.href = url;
    link.download = "planify_respaldo_" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function dailyStateFromBackup(backup) {
    if (!backup.diario || typeof backup.diario !== "object" || Array.isArray(backup.diario)) return null;
    var state = backup.diario.estadoV1;
    if (state != null) {
      if (!state || typeof state !== "object" || Array.isArray(state) || state.schemaVersion !== 1 || !state.days ||
          typeof state.days !== "object" || Array.isArray(state.days)) throw new Error("La sección del diario está dañada.");
      Object.keys(state.days).forEach(function (date) {
        var day = state.days[date];
        if (!validDate(date) || !day || typeof day !== "object" || Array.isArray(day) ||
            typeof day.title !== "string" || typeof day.goals !== "string" || typeof day.grateful !== "string" ||
            typeof day.affirmations !== "string" || !Array.isArray(day.tasks) || !Array.isArray(day.morning) ||
            !day.morning.every(function (checked) { return typeof checked === "boolean"; }) ||
            typeof day.mood !== "string" || typeof day.sleep !== "string" ||
            !Number.isInteger(day.productivity) || day.productivity < 0 || day.productivity > 5 ||
            !day.tasks.every(function (task) {
              return task && typeof task === "object" && typeof task.id === "string" &&
                typeof task.text === "string" && typeof task.done === "boolean";
            })) {
          throw new Error("La copia contiene un registro diario no válido.");
        }
      });
      if (state.activeDate && !validDate(state.activeDate)) throw new Error("La fecha activa de la copia no es válida.");
    }
    var legacy = backup.diario.legacy;
    if (!legacy || typeof legacy !== "object" || Array.isArray(legacy) || Object.keys(legacy).some(function (key) {
      return LEGACY_DAILY_KEYS.indexOf(key) < 0 || typeof legacy[key] !== "string";
    })) throw new Error("Las preferencias antiguas del diario no son válidas.");
    return { state: state, legacy: legacy || {} };
  }

  function completionStateFromBackup(backup) {
    if (!Object.prototype.hasOwnProperty.call(backup, "cumplimiento")) return null;
    var section = backup.cumplimiento;
    var history = window.PLANIFY_COMPLETION_HISTORY;
    if (!section || typeof section !== "object" || Array.isArray(section) ||
        !Object.prototype.hasOwnProperty.call(section, "historialV1") || !history ||
        typeof history.validState !== "function" || !history.validState(section.historialV1)) {
      throw new Error("El historial de cumplimiento está dañado.");
    }
    return section.historialV1;
  }

  function focusActivityStateFromBackup(backup) {
    if (!Object.prototype.hasOwnProperty.call(backup, "enfoque")) return null;
    var section = backup.enfoque;
    var history = window.PLANIFY_FOCUS_ACTIVITY_HISTORY;
    if (!section || typeof section !== "object" || Array.isArray(section) ||
        !Object.prototype.hasOwnProperty.call(section, "actividadV1") || !history ||
        typeof history.validState !== "function" || !history.validState(section.actividadV1)) {
      throw new Error("El historial de enfoque por actividad está dañado.");
    }
    return section.actividadV1;
  }

  function attachControls() {
    var area = document.querySelector("#tab-ajustes .config-actions");
    if (!area || area.dataset.dailyBackupReady) return;
    area.dataset.dailyBackupReady = "1";

    var exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.id = "btn-export-complete-json";
    exportButton.className = "sp-action-btn btn-secondary";
    exportButton.textContent = "Descargar respaldo";
    exportButton.title = "Incluye tu horario, perfil y diario por fecha";
    exportButton.addEventListener("click", function () {
      try {
        exportBackup();
        showMessage("La copia completa se está descargando.", false);
      } catch (error) {
        showMessage("No se pudo preparar la copia JSON.", true);
      }
    });

    var importButton = document.createElement("button");
    importButton.type = "button";
    importButton.id = "btn-import-complete-json";
    importButton.className = "sp-action-btn btn-secondary";
    importButton.textContent = "Restaurar respaldo";
    importButton.title = "Importa una copia descargada desde PLANIFY";

    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json,application/json";
    fileInput.id = "planify-backup-file";
    fileInput.hidden = true;
    fileInput.setAttribute("aria-hidden", "true");
    fileInput.tabIndex = -1;
    fileInput.style.cssText = "display:none!important";
    importButton.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (file) importBackupFile(file);
      fileInput.value = "";
    });

    var message = document.createElement("p");
    message.id = "planify-backup-message";
    message.setAttribute("role", "status");
    message.setAttribute("aria-live", "polite");
    message.className = "panel-backup-message";
    message.textContent = "Incluye tu horario, perfil y diario por fecha.";

    var backup = document.createElement("details");
    backup.className = "panel-backup";
    backup.innerHTML = '<summary><span class="panel-backup-icon" aria-hidden="true">↧</span><span><strong>Copia de seguridad</strong><small>Para guardar o recuperar todos tus datos</small></span></summary><p class="panel-backup-help">Tus datos se guardan en este navegador. Descarga este archivo para conservarlos o llevarlos a otro dispositivo.</p>';
    var actions = document.createElement("div");
    actions.className = "panel-backup-actions";
    actions.appendChild(exportButton);
    actions.appendChild(importButton);
    actions.appendChild(fileInput);
    backup.appendChild(actions);
    var previousWeek = document.createElement("div");
    previousWeek.className = "panel-previous-week";
    previousWeek.innerHTML = '<strong>Horario semanal anterior</strong><p id="planify-previous-week-caption"></p>';
    var previousWeekButton = document.createElement("button");
    previousWeekButton.type = "button";
    previousWeekButton.id = "btn-restore-previous-week";
    previousWeekButton.className = "sp-action-btn btn-secondary";
    previousWeekButton.textContent = "Restaurar horario anterior";
    previousWeekButton.addEventListener("click", confirmPreviousWeek);
    previousWeek.appendChild(previousWeekButton);
    backup.appendChild(previousWeek);
    backup.appendChild(message);
    area.insertAdjacentElement("afterend", backup);
    refreshPreviousWeek();
  }

  function showMessage(text, error) {
    var node = document.getElementById("planify-backup-message");
    if (node) {
      node.textContent = text;
      node.classList.toggle("is-error", !!error);
    }
  }

  function importBackupFile(file) {
    if (file.size > MAX_FILE_BYTES) return showMessage("El archivo supera el límite de 10 MB.", true);
    if (!/\.json$/i.test(file.name) && file.type !== "application/json") return showMessage("Elige un archivo de copia .json.", true);
    var reader = new FileReader();
    reader.onerror = function () { showMessage("No se pudo leer el archivo.", true); };
    reader.onload = function () {
      var backup;
      try { backup = JSON.parse(String(reader.result || "")); }
      catch (error) { return showMessage("El archivo no contiene JSON válido; tus datos no se modificaron.", true); }
      if (!validSchedule(backup)) return showMessage("La copia está incompleta o no tiene un horario válido; tus datos no se modificaron.", true);
      if (backup.backupFormat && (backup.backupFormat !== "planify-backup" || ![2, 3, 4].includes(backup.backupVersion))) {
        return showMessage("Esta versión de copia no es compatible; tus datos no se modificaron.", true);
      }
      if (backup.backupVersion != null && (![2, 3, 4].includes(backup.backupVersion) || backup.backupFormat !== "planify-backup")) {
        return showMessage("La copia declara una versión pero no un formato compatible.", true);
      }
      if ([2, 3, 4].includes(backup.backupVersion) && (!backup.diario || !Object.prototype.hasOwnProperty.call(backup.diario, "estadoV1") || !Object.prototype.hasOwnProperty.call(backup.diario, "legacy"))) {
        return showMessage("La copia está incompleta; tus datos no se modificaron.", true);
      }
      if ([3, 4].includes(backup.backupVersion) && !Object.prototype.hasOwnProperty.call(backup, "cumplimiento")) {
        return showMessage("La copia está incompleta: falta el historial de cumplimiento; tus datos no se modificaron.", true);
      }
      if (backup.backupVersion === 4 && !Object.prototype.hasOwnProperty.call(backup, "enfoque")) {
        return showMessage("La copia está incompleta: falta el historial de enfoque; tus datos no se modificaron.", true);
      }

      var importedDaily;
      var importedCompletions;
      var importedFocusActivity;
      try {
        importedDaily = dailyStateFromBackup(backup);
        importedCompletions = completionStateFromBackup(backup);
        importedFocusActivity = focusActivityStateFromBackup(backup);
      }
      catch (error) { return showMessage(error.message + " Tus datos no se modificaron.", true); }

      var completionHistory = window.PLANIFY_COMPLETION_HISTORY;
      var focusActivityHistory = window.PLANIFY_FOCUS_ACTIVITY_HISTORY;
      var localCompletionRaw = null;
      var localCompletions = null;
      var mergedCompletions = null;
      var completionConflicts = [];
      if (importedCompletions) {
        try { localCompletionRaw = localStorage.getItem(completionHistory.storageKey); }
        catch (error) { return showMessage("No se pudo leer el historial actual. Tus datos no se modificaron.", true); }
        localCompletions = localCompletionRaw ? parseJson(localCompletionRaw) : null;
        if (localCompletionRaw && (!localCompletions || !completionHistory.validState(localCompletions))) {
          return showMessage("El historial actual no se puede leer con seguridad. Tus datos no se modificaron.", true);
        }
        if (localCompletions) Object.keys(importedCompletions.days).forEach(function (date) {
          if (Object.prototype.hasOwnProperty.call(localCompletions.days, date) &&
              JSON.stringify(localCompletions.days[date]) !== JSON.stringify(importedCompletions.days[date])) completionConflicts.push(date);
        });
        mergedCompletions = completionHistory.mergeStates(localCompletions, importedCompletions);
        if (!mergedCompletions) return showMessage("El historial de la copia no se puede combinar con seguridad; tus datos no se modificaron.", true);
      }

      var localFocusRaw = null;
      var localFocus = null;
      var mergedFocus = null;
      if (importedFocusActivity) {
        try { localFocusRaw = localStorage.getItem(focusActivityHistory.storageKey); }
        catch (error) { return showMessage("No se pudo leer el historial de enfoque actual. Tus datos no se modificaron.", true); }
        localFocus = localFocusRaw ? parseJson(localFocusRaw) : null;
        if (localFocusRaw && (!localFocus || !focusActivityHistory.validState(localFocus))) {
          return showMessage("El historial de enfoque actual no se puede leer con seguridad. Tus datos no se modificaron.", true);
        }
        mergedFocus = focusActivityHistory.mergeStates(localFocus, importedFocusActivity);
        if (!mergedFocus) return showMessage("El historial de enfoque de la copia no se puede combinar con seguridad; tus datos no se modificaron.", true);
      }

      var dailyKey = "planify_diario_estado_v1";
      var localDailyRaw = localStorage.getItem(dailyKey);
      var localDaily = parseJson(localDailyRaw);
      if (localDailyRaw && (!localDaily || !localDaily.days || typeof localDaily.days !== "object" || Array.isArray(localDaily.days))) {
        return showMessage("El diario actual no se puede leer con seguridad. Exporta una copia antes de restaurar.", true);
      }
      var mergedDaily = localDaily && typeof localDaily === "object" ? Object.assign({}, localDaily, { days: Object.assign({}, localDaily.days) }) : { schemaVersion: 1, activeDate: "", days: {} };
      var conflicts = [];
      if (importedDaily && importedDaily.state) {
        Object.keys(importedDaily.state.days).forEach(function (date) {
          var incoming = importedDaily.state.days[date];
          if (Object.prototype.hasOwnProperty.call(mergedDaily.days, date) &&
              JSON.stringify(mergedDaily.days[date]) !== JSON.stringify(incoming)) conflicts.push(date);
        });
      }

      var prompt = "Se restaurará el horario y el perfil de la copia. " +
        (importedDaily && importedDaily.state ? "El diario se combinará por fecha y conservará los días que no estén en la copia. " : "El diario actual se conservará porque esta copia antigua no lo incluye. ") +
        (importedCompletions ? "El historial de cumplimiento se combinará por fecha y conservará las fechas locales que no estén en la copia. " : "El historial local de cumplimiento se conservará porque esta copia no lo incluye. ") +
        (importedFocusActivity ? "Las sesiones de enfoque por actividad se combinarán sin duplicar sesiones. " : "El historial local de enfoque por actividad se conservará porque esta copia no lo incluye. ") +
        (conflicts.length ? "Hay " + conflicts.length + " día(s) del diario con cambios distintos; al continuar, usarán la copia importada. " : "") +
        (completionConflicts.length ? "Hay " + completionConflicts.length + " fecha(s) de cumplimiento con cambios distintos; al continuar, usarán la copia importada. " : "") +
        "¿Quieres continuar?";
      if (!window.confirm(prompt)) return showMessage("Restauración cancelada. Tus datos no se modificaron.", false);

      if (importedDaily && importedDaily.state) {
        Object.keys(importedDaily.state.days).forEach(function (date) {
          mergedDaily.days[date] = importedDaily.state.days[date];
        });
        if (importedDaily.state.activeDate && validDate(importedDaily.state.activeDate)) mergedDaily.activeDate = importedDaily.state.activeDate;
      }
      mergedDaily.schemaVersion = 1;

      var typeMap = { Diario: "diario", Semanal: "semanal", Mensual: "mensual", Anual: "anual", Personalizado: "personalizado" };
      var plannerType = typeMap[backup.tipo] || localStorage.getItem("horario_planner_type") || "semanal";
      var schedule = JSON.stringify({ dias: backup.dias, filas: backup.filas });
      var oldValues = {};
      var keysToWrite = ["horario_completo", "horario_data_" + plannerType, "horario_planner_type", "planify_tipo_planificador"];
      var hasProfile = ["nombre", "carrera", "especialidad", "ciclo", "objetivo", "header"].some(function (key) {
        return Object.prototype.hasOwnProperty.call(backup, key) && typeof backup[key] === "string";
      });
      if (hasProfile) keysToWrite.push("planify_panel_profile_v1");
      if (plannerType === "semanal") keysToWrite.push("horario_data_semanal");
      if (importedDaily && importedDaily.state) keysToWrite.push(dailyKey);
      if (mergedCompletions) keysToWrite.push(completionHistory.storageKey);
      if (mergedFocus) keysToWrite.push(focusActivityHistory.storageKey);
      if (importedDaily) LEGACY_DAILY_KEYS.forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(importedDaily.legacy, key)) keysToWrite.push(key);
      });
      keysToWrite.forEach(function (key) { oldValues[key] = localStorage.getItem(key); });

      try {
        var cleanBackup = Object.assign({}, backup);
        localStorage.setItem("horario_completo", JSON.stringify(cleanBackup));
        localStorage.setItem("horario_data_" + plannerType, schedule);
        if (plannerType === "semanal") localStorage.setItem("horario_data_semanal", schedule);
        localStorage.setItem("horario_planner_type", plannerType);
        localStorage.setItem("planify_tipo_planificador", plannerType);
        if (hasProfile) {
          localStorage.setItem("planify_panel_profile_v1", JSON.stringify({
            schemaVersion: 1,
            nombre: typeof backup.nombre === "string" ? backup.nombre : "",
            carrera: typeof backup.carrera === "string" ? backup.carrera : "",
            especialidad: typeof backup.especialidad === "string" ? backup.especialidad : "",
            ciclo: typeof backup.ciclo === "string" ? backup.ciclo : "",
            objetivo: typeof backup.objetivo === "string" ? backup.objetivo : "",
            header: typeof backup.header === "string" ? backup.header : ""
          }));
        }
        if (importedDaily && importedDaily.state) localStorage.setItem(dailyKey, JSON.stringify(mergedDaily));
        if (mergedCompletions) localStorage.setItem(completionHistory.storageKey, JSON.stringify(mergedCompletions));
        if (mergedFocus) localStorage.setItem(focusActivityHistory.storageKey, JSON.stringify(mergedFocus));
        if (importedDaily) LEGACY_DAILY_KEYS.forEach(function (key) {
          if (Object.prototype.hasOwnProperty.call(importedDaily.legacy, key)) localStorage.setItem(key, String(importedDaily.legacy[key]));
        });
      } catch (error) {
        Object.keys(oldValues).forEach(function (key) {
          try {
            if (oldValues[key] === null) localStorage.removeItem(key);
            else localStorage.setItem(key, oldValues[key]);
          } catch (rollbackError) { /* Keep attempting to restore the remaining keys. */ }
        });
        return showMessage("No se pudo guardar la copia completa; PLANIFY restauró los datos anteriores.", true);
      }

      showMessage("Copia restaurada. PLANIFY se actualizará ahora.", false);
      window.setTimeout(function () { window.location.reload(); }, 500);
    };
    reader.readAsText(file);
  }

  function init() {
    attachControls();
    var observer = new MutationObserver(attachControls);
    var panel = document.getElementById("side-panel");
    if (panel) observer.observe(panel, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
