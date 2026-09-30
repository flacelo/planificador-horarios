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
      if (mergeInfo && count) mergeInfo.textContent = count + " bloques unidos. Toca cualquier celda y escribe directamente; las actividades contiguas iguales se unirán.";
    }
    function formatVisibleTime(value) {
      var time = window.PLANIFY_SCHEDULE_TIME;
      if (typeof value === "number" && time && typeof time.formatTime12 === "function") return time.formatTime12(value);
      if (time && typeof time.formatRange12 === "function") return time.formatRange12(value);
      if (typeof value === "number") {
        var normalized = ((value % 1440) + 1440) % 1440;
        var hour = Math.floor(normalized / 60);
        var minute = normalized % 60;
        return (hour % 12 || 12) + ":" + String(minute).padStart(2, "0") + (hour < 12 ? " a. m." : " p. m.") + (value >= 1440 ? " (+1 día)" : "");
      }
      return String(value || "").replace(/(\d{1,2}):(\d{2})/g, function (_, hour, minute) {
        var h = Number(hour);
        return (h % 12 || 12) + ":" + minute + (h < 12 || h === 24 ? " a. m." : " p. m.") + (h === 24 ? " (+1 día)" : "");
      });
    }
    function parseVisibleClock(value) {
      var match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?\s*(\(\+1 día\))?$/i);
      if (!match) return null;
      var hour = Number(match[1]);
      var minute = Number(match[2]);
      var meridian = String(match[3] || "").toLowerCase().replace(/[^ap]/g, "");
      if (minute > 59) return null;
      if (meridian) {
        if (hour < 1 || hour > 12) return null;
        hour = hour % 12 + (meridian === "p" ? 12 : 0);
      } else if (hour > 24 || hour === 24 && minute !== 0) return null;
      if (match[4] && hour === 0) hour = 24;
      return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
    }
    function parseVisibleRange(value) {
      var parts = String(value || "").trim().split(/\s+[–-]\s+/);
      if (parts.length !== 2) return null;
      var start = parseVisibleClock(parts[0]);
      var end = parseVisibleClock(parts[1]);
      if (!start || !end) return null;
      var canonical = start + " – " + end;
      var time = window.PLANIFY_SCHEDULE_TIME;
      return !time || typeof time.parseRange !== "function" || time.parseRange(canonical) ? canonical : null;
    }
    function syncVisibleTimes() {
      var rows = typeof filas !== "undefined" && Array.isArray(filas) ? filas : [];
      table.querySelectorAll("#tbody .hora-cell input").forEach(function (input, index) {
        var canonical = rows[index] && rows[index].hora || input.dataset.canonicalTime || input.value;
        input.dataset.canonicalTime = canonical;
        input.dataset.visibleTime = formatVisibleTime(canonical);
        input.value = input.dataset.visibleTime;
        input.setAttribute("aria-label", "Horario de la fila " + (index + 1) + ": " + input.value + ". Puedes escribir una hora con a. m. o p. m.");
      });
    }
    function syncScheduleCells() {
      syncVisibleTimes();
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
        copy.querySelectorAll(".done-check, .reminder-bell, .merge-indicator, .weekly-calm-move-handle").forEach(function (control) {
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
        var moveHandle = cell.querySelector(".weekly-calm-move-handle");
        if (empty) {
          if (moveHandle) moveHandle.remove();
        } else if (!moveHandle) {
          moveHandle = document.createElement("button");
          moveHandle.type = "button";
          moveHandle.className = "weekly-calm-move-handle";
          moveHandle.textContent = "⋯";
          moveHandle.title = "Opciones: toca para mover, ajustar duración o dividir; arrastra ⋯ para mover.";
          cell.appendChild(moveHandle);
        }
        if (moveHandle) moveHandle.setAttribute("aria-label", "Opciones de " + activity + " en " + day + (time ? ", " + time : ""));
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
    var activeInlineEdit = null;
    var activeMove = null;
    var pendingMove = null;
    var moveSelection = null;
    var actionMenu = null;
    var lastUndoRows = null;
    var undoButton = null;
    var suppressHandleClick = false;
    function copyRows(rows) {
      return JSON.parse(JSON.stringify(rows || []));
    }
    function scheduleFallback() {
      var interval = document.getElementById("sel-intervalo");
      return interval && Number(interval.value) > 0 ? Number(interval.value) : 15;
    }
    function setUndoAvailable(available) {
      if (undoButton) undoButton.hidden = !available;
    }
    function persistRows(nextRows, message) {
      var previousRows = copyRows(filas);
      try {
        filas = nextRows;
        if (typeof autoGuardar === "function") autoGuardar();
        lastUndoRows = previousRows;
        setUndoAvailable(true);
        if (typeof window.renderizar === "function") window.renderizar();
        setMoveHint(message);
        return true;
      } catch (error) {
        filas = previousRows;
        if (typeof window.renderizar === "function") window.renderizar();
        setMoveHint("No se pudo guardar el cambio. Dejé el horario como estaba.");
        return false;
      }
    }
    function closeActionMenu(restoreFocus) {
      if (actionMenu) actionMenu.remove();
      actionMenu = null;
      if (restoreFocus && actionHandle && actionHandle.isConnected) actionHandle.focus();
      actionHandle = null;
    }
    var actionHandle = null;
    function textForCell(cell) {
      var copy = cell.cloneNode(true);
      copy.querySelectorAll(".done-check, .reminder-bell, .merge-indicator, .weekly-calm-move-handle, input").forEach(function (control) { control.remove(); });
      return (copy.textContent || "").replace(/\s+/g, " ").trim().replace(/^[—–-]+$/, "");
    }
    function adjacentRows(dayIndex, firstIndex, firstSpan) {
      var rows = typeof filas !== "undefined" && Array.isArray(filas) ? filas : [];
      var current = rows[firstIndex] && String(rows[firstIndex].hora || "").match(/(\d{1,2}:\d{2})/g);
      var next = rows[firstIndex + firstSpan] && String(rows[firstIndex + firstSpan].hora || "").match(/(\d{1,2}:\d{2})/g);
      return current && next && current.length > 1 && next.length > 1 && current[current.length - 1] === next[0];
    }
    function mergeMatchingActivities(dayIndex) {
      if (typeof filas === "undefined" || !Array.isArray(filas)) return;
      for (var index = 0; index < filas.length; index += 1) {
        var first = filas[index] && filas[index].celdas && filas[index].celdas[dayIndex];
        if (!first || !first.t || Number(first.rowspan) === 0) continue;
        var span = Math.max(1, Number(first.rowspan) || 1);
        while (index + span < filas.length && adjacentRows(dayIndex, index, span)) {
          var next = filas[index + span] && filas[index + span].celdas && filas[index + span].celdas[dayIndex];
          if (!next || !next.t || next.c !== first.c || String(next.t).trim() !== String(first.t).trim() || Number(next.rowspan) === 0) break;
          span += Math.max(1, Number(next.rowspan) || 1);
        }
        first.rowspan = span;
        for (var offset = 1; offset < span; offset += 1) {
          if (!filas[index + offset]) continue;
          filas[index + offset].celdas[dayIndex] = { t: "", c: "libre", done: false, reminder: false, rowspan: 1 };
        }
        index += span - 1;
      }
    }
    function commitInlineEdit(input, cancel) {
      var cell = activeInlineEdit && activeInlineEdit.cell;
      if (!cell || !input || !input.isConnected) { activeInlineEdit = null; return; }
      var original = activeInlineEdit.original;
      var nextText = cancel ? original : input.value.trim().slice(0, 120);
      var rowIndex = Number(cell.dataset.fi);
      var dayIndex = Number(cell.dataset.ci);
      var span = Math.max(1, Number(cell.rowSpan) || 1);
      if (typeof filas === "undefined" || !filas[rowIndex] || !Array.isArray(filas[rowIndex].celdas)) {
        activeInlineEdit = null;
        if (typeof window.renderizar === "function") window.renderizar();
        return;
      }
      var existing = filas[rowIndex].celdas[dayIndex] || { t: "", c: "libre", done: false, reminder: false, rowspan: 1 };
      if (!cancel) {
        var category = existing.c && existing.c !== "libre" ? existing.c : (nextText ? "flexible" : "libre");
        for (var offset = 0; offset < span; offset += 1) {
          var row = filas[rowIndex + offset];
          if (!row || !Array.isArray(row.celdas)) continue;
          var previous = row.celdas[dayIndex] || {};
          row.celdas[dayIndex] = Object.assign({}, previous, {
            t: nextText,
            c: category,
            done: nextText === original ? Boolean(previous.done) : false,
            reminder: nextText === original ? Boolean(previous.reminder) : false,
            rowspan: offset === 0 ? span : 1
          });
        }
        if (nextText) mergeMatchingActivities(dayIndex);
        if (typeof autoGuardar === "function") autoGuardar();
      }
      activeInlineEdit = null;
      if (typeof window.renderizar === "function") window.renderizar();
      syncScheduleCells();
    }
    function beginInlineEdit(cell) {
      if (!cell || activeInlineEdit && activeInlineEdit.cell === cell) return;
      if (activeInlineEdit) commitInlineEdit(activeInlineEdit.input, false);
      var initial = textForCell(cell);
      var input = document.createElement("input");
      input.type = "text";
      input.maxLength = 120;
      input.className = "weekly-calm-inline-input";
      input.value = initial;
      input.setAttribute("aria-label", "Escribe directamente la actividad de esta celda");
      input.setAttribute("placeholder", "Añadir actividad");
      input.dataset.inlineScheduleCell = "true";
      activeInlineEdit = { cell: cell, original: initial, input: input };
      Array.prototype.slice.call(cell.childNodes).forEach(function (node) {
        if (node.nodeType === Node.TEXT_NODE || !(node.matches && node.matches(".done-check, .reminder-bell, .merge-indicator"))) node.remove();
      });
      cell.appendChild(input);
      cell.setAttribute("aria-label", "Editando actividad. Escribe y pulsa Enter para guardar, Escape para cancelar.");
      input.focus();
      input.select();
    }
    function targetCellAtPoint(event) {
      var target = document.elementFromPoint(event.clientX, event.clientY);
      return target && target.closest ? target.closest("#tabla td.celda[data-fi][data-ci]") : null;
    }
    function setMoveHint(message) {
      var hint = tableView.querySelector(".weekly-calm-scroll-hint");
      if (hint) hint.textContent = message;
    }
    function moveHandleAtPointer(event) {
      var target = event.target instanceof Element ? event.target : event.target && event.target.parentElement;
      if (!target) return null;
      var handle = target.closest(".weekly-calm-move-handle");
      if (handle) return handle;
      var cell = target.closest("#tabla td.celda[data-fi][data-ci]");
      var candidate = cell && cell.querySelector(".weekly-calm-move-handle");
      if (!candidate) return null;
      var bounds = candidate.getBoundingClientRect();
      return event.clientX >= bounds.left && event.clientX <= bounds.right &&
        event.clientY >= bounds.top && event.clientY <= bounds.bottom ? candidate : null;
    }
    function activityTiming(cell) {
      if (!cell || typeof filas === "undefined") return null;
      var row = Number(cell.dataset.fi);
      var day = Number(cell.dataset.ci);
      var value = filas[row] && filas[row].celdas && filas[row].celdas[day];
      var time = window.PLANIFY_SCHEDULE_TIME;
      var timing = time && time.activityInterval(filas, row, value, scheduleFallback());
      return timing && timing.ok ? { row: row, day: day, value: value, timing: timing } : null;
    }
    function addMenuButton(menu, label, action, disabled) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.dataset.weeklyCellAction = action;
      button.disabled = Boolean(disabled);
      menu.appendChild(button);
      return button;
    }
    function showCellActions(cell, handle) {
      var details = activityTiming(cell);
      if (!details) {
        setMoveHint("No pude leer las horas de ese bloque; el horario sigue igual.");
        return;
      }
      closeActionMenu(false);
      actionHandle = handle;
      var title = textForCell(cell) || "Actividad";
      var headers = table.querySelectorAll("#thead tr:first-child th");
      var dayName = headers[details.day + 1] ? headers[details.day + 1].textContent.trim() : "Día";
      var duration = details.timing.durationMinutes;
      var menu = document.createElement("section");
      menu.className = "weekly-calm-cell-actions";
      menu.setAttribute("role", "group");
      menu.setAttribute("aria-label", "Acciones para " + title + " el " + dayName);
      var heading = document.createElement("strong");
      heading.textContent = title;
      var range = document.createElement("span");
      range.textContent = dayName + " · " + formatVisibleTime(details.timing.start) + "–" + formatVisibleTime(details.timing.end) + " · " + duration + " min";
      var instructions = document.createElement("small");
      instructions.textContent = "Mover: elige otra celda. Alargar o acortar cambia 15 min. Para unir, escribe el mismo nombre en espacios seguidos; se agrupan solos.";
      menu.appendChild(heading);
      menu.appendChild(range);
      menu.appendChild(instructions);
      addMenuButton(menu, "Mover a otra celda", "move", false);
      addMenuButton(menu, "Alargar 15 min", "extend", false);
      addMenuButton(menu, "Acortar 15 min", "shorten", duration <= 5);
      addMenuButton(menu, "Unir celdas con igual actividad", "merge", false);
      if (details.timing.span > 1) addMenuButton(menu, "Dividir en celdas", "split", false);
      document.body.appendChild(menu);
      actionMenu = menu;
      var bounds = handle.getBoundingClientRect();
      var menuBounds = menu.getBoundingClientRect();
      var left = Math.max(12, Math.min(bounds.left, window.innerWidth - menuBounds.width - 12));
      var top = bounds.bottom + menuBounds.height <= window.innerHeight - 12 ? bounds.bottom + 6 : Math.max(12, bounds.top - menuBounds.height - 6);
      menu.style.left = left + "px";
      menu.style.top = top + "px";
      menu.querySelector("button:not(:disabled)").focus();
    }
    function finishMove(event, cancelled) {
      if (!activeMove || event.pointerId !== activeMove.pointerId) return;
      var move = activeMove;
      activeMove = null;
      suppressHandleClick = true;
      window.setTimeout(function () { suppressHandleClick = false; }, 0);
      move.cell.classList.remove("weekly-cell-moving");
      if (move.target) move.target.classList.remove("weekly-drop-target");
      if (cancelled) {
        setMoveHint("Movimiento cancelado. Toca una actividad para escribir o usa «Opciones» para moverla.");
        return;
      }
      var target = targetCellAtPoint(event);
      if (!target) {
        setMoveHint("No encontré una fila de destino. El horario quedó igual.");
        return;
      }
      var time = window.PLANIFY_SCHEDULE_TIME;
      if (!time || typeof time.moveActivity !== "function" || typeof filas === "undefined" || typeof dias === "undefined") {
        setMoveHint("No se pudo mover el bloque. El horario quedó igual.");
        return;
      }
      var interval = document.getElementById("sel-intervalo");
      var fallback = interval && Number(interval.value) > 0 ? Number(interval.value) : 15;
      var result = time.moveActivity({ dias: dias, filas: filas }, move.day, move.row, Number(target.dataset.ci), Number(target.dataset.fi), fallback);
      if (!result.ok) {
        setMoveHint(result.error || "No se pudo mover el bloque. El horario quedó igual.");
        return;
      }
      if (!result.changed) {
        setMoveHint("El bloque ya estaba en esa hora.");
        return;
      }
      var previousRows = filas;
      try {
        filas = result.schedule.filas;
        if (typeof autoGuardar === "function") autoGuardar();
        if (typeof window.renderizar === "function") window.renderizar();
        setMoveHint("Listo: “" + move.text + "” quedó en " + formatVisibleTime(result.start) + " – " + formatVisibleTime(result.end) + ".");
      } catch (error) {
        filas = previousRows;
        if (typeof window.renderizar === "function") window.renderizar();
        setMoveHint("No se pudo guardar el cambio; restauré el horario anterior.");
      }
    }
    table.addEventListener("pointerdown", function (event) {
      var handle = moveHandleAtPointer(event);
      if (!handle || event.button !== 0 || typeof filas === "undefined") return;
      var cell = handle.closest("#tabla td.celda[data-fi][data-ci]");
      if (!cell) return;
      var details = activityTiming(cell);
      if (!details) {
        setMoveHint("No pude leer las horas de ese bloque; no lo moví.");
        return;
      }
      pendingMove = { pointerId: event.pointerId, handle: handle, cell: cell, row: details.row, day: details.day, x: event.clientX, y: event.clientY, text: textForCell(cell) };
    }, true);
    document.addEventListener("pointermove", function (event) {
      if (pendingMove && event.pointerId === pendingMove.pointerId && !activeMove) {
        var distance = Math.hypot(event.clientX - pendingMove.x, event.clientY - pendingMove.y);
        if (distance > 8) {
          activeMove = { pointerId: pendingMove.pointerId, cell: pendingMove.cell, row: pendingMove.row, day: pendingMove.day, text: pendingMove.text, target: null };
          pendingMove.cell.classList.add("weekly-cell-moving");
          setMoveHint("Suelta «" + activeMove.text + "» en la fila donde quieres que empiece.");
          try { pendingMove.handle.setPointerCapture(event.pointerId); } catch (error) {}
          pendingMove = null;
        }
      }
      if (!activeMove || event.pointerId !== activeMove.pointerId) return;
      var target = targetCellAtPoint(event);
      if (activeMove.target && activeMove.target !== target) activeMove.target.classList.remove("weekly-drop-target");
      activeMove.target = target;
      if (!target) {
        setMoveHint("Suelta el bloque sobre una celda para elegir su nueva hora.");
        return;
      }
      target.classList.add("weekly-drop-target");
      var row = typeof filas !== "undefined" && filas[Number(target.dataset.fi)];
      var range = row && String(row.hora || "").match(/\d{1,2}:\d{2}/g) || [];
      setMoveHint(range.length ? "Nueva hora de inicio: " + formatVisibleTime(range[0]) + ". Si hay un cruce, el bloque no se moverá." : "Suelta en la fila donde quieres que empiece.");
    });
    document.addEventListener("pointerup", function (event) {
      if (activeMove) {
        finishMove(event, false);
        pendingMove = null;
        return;
      }
      if (pendingMove && event.pointerId === pendingMove.pointerId) {
        var tap = pendingMove;
        pendingMove = null;
        suppressHandleClick = true;
        window.setTimeout(function () { suppressHandleClick = false; }, 0);
        showCellActions(tap.cell, tap.handle);
        return;
      }
      pendingMove = null;
    });
    document.addEventListener("pointercancel", function (event) { if (activeMove) finishMove(event, true); pendingMove = null; });
    table.addEventListener("click", function (event) {
      if (suppressHandleClick) {
        var suppressedCell = event.target instanceof Element ? event.target.closest("#tabla td.celda[data-fi][data-ci]") : null;
        if (suppressedCell) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
      var handle = moveHandleAtPointer(event);
      if (handle) {
        event.preventDefault();
        event.stopPropagation();
        if (!suppressHandleClick) showCellActions(handle.closest("#tabla td.celda[data-fi][data-ci]"), handle);
        return;
      }
      var cell = event.target.closest("#tabla td.celda[data-fi][data-ci]");
      if (moveSelection && cell && !event.target.closest(".done-check,button,a,input")) {
        event.preventDefault();
        event.stopPropagation();
        var selected = moveSelection;
        moveSelection = null;
        if (selected.cell) selected.cell.classList.remove("weekly-cell-moving");
        var time = window.PLANIFY_SCHEDULE_TIME;
        var result = time && time.moveActivity({ dias: dias, filas: filas }, selected.day, selected.row, Number(cell.dataset.ci), Number(cell.dataset.fi), scheduleFallback());
        if (!result || !result.ok) {
          setMoveHint(result && result.error || "No se pudo mover el bloque. El horario quedó igual.");
          return;
        }
        if (!result.changed) {
          setMoveHint("El bloque ya estaba en esa hora.");
          return;
        }
        persistRows(result.schedule.filas, "Listo: «" + selected.text + "» quedó en " + formatVisibleTime(result.start) + "–" + formatVisibleTime(result.end) + ". Puedes deshacerlo.");
        return;
      }
      if (!cell || event.target.closest(".done-check,button,a,input")) {
        if (event.target.closest(".done-check")) window.setTimeout(syncScheduleCells, 0);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      beginInlineEdit(cell);
    }, true);
    table.addEventListener("keydown", function (event) {
      var input = event.target.closest("input[data-inline-schedule-cell]");
      if (!input) return;
      if (event.key === "Enter") { event.preventDefault(); commitInlineEdit(input, false); }
      if (event.key === "Escape") { event.preventDefault(); commitInlineEdit(input, true); }
    }, true);
    table.addEventListener("focusout", function (event) {
      var input = event.target.closest("input[data-inline-schedule-cell]");
      if (input && activeInlineEdit && activeInlineEdit.input === input) commitInlineEdit(input, false);
    }, true);
    table.addEventListener("change", function (event) {
      var input = event.target.closest("#tabla .hora-cell input");
      if (!input) return;
      var parsed = parseVisibleRange(input.value);
      if (!parsed) {
        input.value = input.dataset.canonicalTime || "";
        var hint = tableView.querySelector(".weekly-calm-scroll-hint");
        if (hint) hint.textContent = "No reconocí ese rango. Prueba 7:00 a. m. – 8:00 a. m.; restauré la hora anterior.";
        return;
      }
      input.value = parsed;
      input.dataset.canonicalTime = parsed;
    }, true);
    table.addEventListener("change", syncScheduleCells);
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
    hint.textContent = "Toca el nombre para editar. Pulsa ⋯ para ver opciones o arrástralo para mover el bloque.";
    tableView.insertBefore(hint, table);
    undoButton = document.createElement("button");
    undoButton.type = "button";
    undoButton.className = "weekly-calm-undo";
    undoButton.textContent = "Deshacer último cambio";
    undoButton.hidden = true;
    tableView.insertBefore(undoButton, table);
    undoButton.addEventListener("click", function () {
      if (!lastUndoRows) return;
      var currentRows = copyRows(filas);
      try {
        filas = lastUndoRows;
        if (typeof autoGuardar === "function") autoGuardar();
        lastUndoRows = null;
        setUndoAvailable(false);
        if (typeof window.renderizar === "function") window.renderizar();
        setMoveHint("Deshice el último cambio. El resto de la semana quedó igual.");
      } catch (error) {
        filas = currentRows;
        if (typeof window.renderizar === "function") window.renderizar();
        setMoveHint("No pude deshacerlo por ahora; el horario actual quedó intacto.");
      }
    });
    document.addEventListener("click", function (event) {
      var target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      var actionButton = target.closest("[data-weekly-cell-action]");
      if (actionButton && actionMenu && actionMenu.contains(actionButton)) {
        event.preventDefault();
        var actionName = actionButton.getAttribute("data-weekly-cell-action");
        var handleCell = actionHandle && actionHandle.closest("#tabla td.celda[data-fi][data-ci]");
        var details = activityTiming(handleCell);
        if (!details) { closeActionMenu(false); setMoveHint("No pude leer el bloque. El horario sigue igual."); return; }
        var title = textForCell(handleCell);
        closeActionMenu(false);
        if (actionName === "move") {
          moveSelection = { cell: handleCell, row: details.row, day: details.day, text: title };
          handleCell.classList.add("weekly-cell-moving");
          setMoveHint("Ahora toca o enfoca la celda de destino para mover «" + title + "». Si está ocupada, no se sobrescribirá.");
          handleCell.focus();
          return;
        }
        var time = window.PLANIFY_SCHEDULE_TIME;
        if (actionName === "extend" || actionName === "shorten") {
          var nextDuration = actionName === "extend" ? details.timing.durationMinutes + 15 : Math.max(5, details.timing.durationMinutes - 15);
          var resized = time && time.setDuration({ dias: dias, filas: filas }, details.day, details.row, nextDuration, scheduleFallback());
          if (!resized || !resized.ok) { setMoveHint(resized && resized.error || "No se pudo cambiar la duración."); return; }
          persistRows(resized.schedule.filas, "«" + title + "»: " + (actionName === "extend" ? "alargado" : "acortado") + " a " + nextDuration + " min, hasta " + formatVisibleTime(resized.end) + ". Puedes deshacerlo.");
          return;
        }
        if (actionName === "split") {
          var split = time && time.splitActivity({ dias: dias, filas: filas }, details.day, details.row, scheduleFallback());
          if (!split || !split.ok) { setMoveHint(split && split.error || "No se pudo dividir el bloque."); return; }
          if (!split.changed) { setMoveHint("Este bloque ya ocupa una sola celda."); return; }
          persistRows(split.schedule.filas, "Bloque dividido en " + split.span + " celdas del mismo día. Puedes editarlas por separado o deshacerlo.");
          return;
        }
        if (actionName === "merge") {
          var originalRows = copyRows(filas);
          mergeMatchingActivities(details.day);
          var mergedRows = copyRows(filas);
          filas = originalRows;
          if (JSON.stringify(originalRows) === JSON.stringify(mergedRows)) {
            setMoveHint("No encontré actividades iguales seguidas para unir en este día.");
            return;
          }
          var mergeDayHeader = table.querySelectorAll("#thead tr:first-child th")[details.day + 1];
          persistRows(mergedRows, "Uní las actividades iguales que estaban en celdas contiguas de " + (mergeDayHeader ? mergeDayHeader.textContent.trim() : "ese día") + ". Puedes deshacerlo.");
        }
        return;
      }
      if (actionMenu && !actionMenu.contains(target)) closeActionMenu(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (actionMenu) { event.preventDefault(); closeActionMenu(true); }
      if (moveSelection) {
        event.preventDefault();
        moveSelection.cell.classList.remove("weekly-cell-moving");
        moveSelection = null;
        setMoveHint("Movimiento cancelado. El horario quedó igual.");
      }
    });

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
