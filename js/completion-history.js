(function (root, factory) {
  "use strict";
  var scheduleTime = typeof module === "object" && module.exports ? require("./schedule-time.js") : root && root.PLANIFY_SCHEDULE_TIME;
  var core = factory(scheduleTime);
  if (typeof module === "object" && module.exports) module.exports = core;
  if (root) root.PLANIFY_COMPLETION_HISTORY = core.create(root);
})(typeof window !== "undefined" ? window : null, function (scheduleTime) {
  "use strict";

  var STORAGE_KEY = "planify_cumplimiento_historial_v1";
  var WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

  function validDateKey(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var date = new Date(value + "T12:00:00Z");
    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function dateKeyInZone(value, timeZone) {
    var date = value instanceof Date ? value : new Date(value == null ? Date.now() : value);
    if (isNaN(date.getTime())) return "";
    var parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "America/Lima", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(date);
    var values = {};
    parts.forEach(function (part) { if (part.type !== "literal") values[part.type] = part.value; });
    return values.year + "-" + values.month + "-" + values.day;
  }

  function addDays(dateKey, amount) {
    if (!validDateKey(dateKey)) return "";
    var date = new Date(dateKey + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() + Number(amount || 0));
    return date.toISOString().slice(0, 10);
  }

  function mondayOf(dateKey) {
    if (!validDateKey(dateKey)) return "";
    var date = new Date(dateKey + "T12:00:00Z");
    var offset = (date.getUTCDay() + 6) % 7;
    return addDays(dateKey, -offset);
  }

  function weekdayIndex(value, fallback) {
    var name = String(value || "").trim().toLocaleLowerCase("es-PE");
    for (var i = 0; i < WEEKDAYS.length; i += 1) {
      if (name.slice(0, 3) === WEEKDAYS[i].slice(0, 3)) return i;
    }
    return Number.isInteger(fallback) && fallback >= 0 && fallback < 7 ? fallback : -1;
  }

  function isMeaningfulCell(cell) {
    if (!cell || typeof cell !== "object" || Number(cell.rowspan) === 0) return false;
    var title = String(cell.t || cell.texto || cell.title || "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
    return Boolean(title && title !== "—" && title !== "-");
  }

  function rowDurationHours(rows, index, cell) {
    if (scheduleTime && typeof scheduleTime.activityInterval === "function") {
      var actual = scheduleTime.activityInterval(rows, index, cell, 60);
      if (actual.ok) return actual.durationMinutes / 60;
    }
    rows = Array.isArray(rows) ? rows : [];
    var label = String(rows[index] && rows[index].hora || "");
    var times = label.match(/\d{1,2}:\d{2}/g) || [];
    var start = times.length ? Number(times[0].split(":")[0]) * 60 + Number(times[0].split(":")[1]) : null;
    var end = times.length > 1 ? Number(times[1].split(":")[0]) * 60 + Number(times[1].split(":")[1]) : null;
    var span = Math.max(1, Number(cell && cell.rowspan) || 1);
    if (start != null && end != null) {
      if (end <= start) end += 1440;
      return Math.max(0.25, (end - start) / 60) * span;
    }
    var nextLabel = String(rows[index + 1] && rows[index + 1].hora || "");
    var nextMatch = nextLabel.match(/\d{1,2}:\d{2}/);
    var nextStart = nextMatch ? Number(nextMatch[0].split(":")[0]) * 60 + Number(nextMatch[0].split(":")[1]) : null;
    if (start != null && nextStart != null) {
      if (nextStart <= start) nextStart += 1440;
      return Math.max(0.25, (nextStart - start) / 60) * span;
    }
    return span;
  }

  function validState(state) {
    if (!state || typeof state !== "object" || Array.isArray(state) || state.schemaVersion !== 1 ||
        typeof state.trackingStartedAt !== "string" || isNaN(Date.parse(state.trackingStartedAt)) ||
        !state.days || typeof state.days !== "object" || Array.isArray(state.days) || Object.keys(state.days).length > 3660) return false;
    return Object.keys(state.days).every(function (dateKey) {
      var day = state.days[dateKey];
      if (!validDateKey(dateKey) || !day || typeof day !== "object" || Array.isArray(day) ||
          typeof day.updatedAt !== "string" || isNaN(Date.parse(day.updatedAt)) ||
          !day.activities || typeof day.activities !== "object" || Array.isArray(day.activities) || Object.keys(day.activities).length > 5000 ||
          !day.snapshot || typeof day.snapshot !== "object" || Array.isArray(day.snapshot) || Object.keys(day.snapshot).length > 5000) return false;
      var validActivities = Object.keys(day.activities).every(function (id) {
        return typeof id === "string" && id.length > 0 && id.length <= 100 && typeof day.activities[id] === "boolean";
      });
      var validSnapshot = Object.keys(day.snapshot).every(function (id) {
        var item = day.snapshot[id];
        return typeof id === "string" && id.length > 0 && id.length <= 100 && item && typeof item === "object" &&
          typeof item.title === "string" && item.title.length <= 2000 &&
          typeof item.hours === "number" && Number.isFinite(item.hours) && item.hours > 0 && item.hours <= 24;
      });
      var allStatusesHaveSnapshot = Object.keys(day.activities).every(function (id) { return Object.prototype.hasOwnProperty.call(day.snapshot, id); });
      return validActivities && validSnapshot && allStatusesHaveSnapshot;
    });
  }

  function stateForWeek(schedule, state, weekStart) {
    var days = Array.isArray(schedule && schedule.dias) ? schedule.dias : [];
    var rows = Array.isArray(schedule && schedule.filas) ? schedule.filas : [];
    var byDay = Array.from({ length: 7 }, function () { return 0; });
    var trackedByDay = Array.from({ length: 7 }, function () { return 0; });
    var completedByDay = Array.from({ length: 7 }, function () { return 0; });
    var datesByDay = Array.from({ length: 7 }, function () { return ""; });
    var recordedByDay = Array.from({ length: 7 }, function () { return false; });
    var recordedDates = {};
    days.forEach(function (day, index) {
      var dayIndex = weekdayIndex(day, index);
      if (dayIndex >= 0 && !datesByDay[dayIndex]) datesByDay[dayIndex] = addDays(weekStart, dayIndex);
    });
    WEEKDAYS.forEach(function (_, index) { if (!datesByDay[index]) datesByDay[index] = addDays(weekStart, index); });
    rows.forEach(function (row) {
      var cells = Array.isArray(row && row.celdas) ? row.celdas : [];
      cells.forEach(function (cell, columnIndex) {
        if (!isMeaningfulCell(cell)) return;
        var dayIndex = weekdayIndex(days[columnIndex], columnIndex);
        if (dayIndex < 0) return;
        byDay[dayIndex] += 1;
      });
    });
    WEEKDAYS.forEach(function (_, dayIndex) {
      var dateKey = datesByDay[dayIndex];
      var dayRecord = state && state.days && state.days[dateKey];
      if (!dayRecord) return;
      recordedDates[dateKey] = true;
      recordedByDay[dayIndex] = true;
      Object.keys(dayRecord.snapshot).forEach(function (activityId) {
        trackedByDay[dayIndex] += 1;
        if (dayRecord.activities[activityId] === true) completedByDay[dayIndex] += 1;
      });
    });
    var completed = completedByDay.reduce(function (sum, value) { return sum + value; }, 0);
    var total = byDay.reduce(function (sum, value) { return sum + value; }, 0);
    var trackedTotal = trackedByDay.reduce(function (sum, value) { return sum + value; }, 0);
    var recordedDayCount = Object.keys(recordedDates).length;
    return {
      weekStart: weekStart,
      datesByDay: datesByDay,
      byDay: byDay,
      trackedByDay: trackedByDay,
      completedByDay: completedByDay,
      recordedByDay: recordedByDay,
      total: total,
      trackedTotal: trackedTotal,
      completed: completed,
      percent: trackedTotal ? Math.round(completed * 100 / trackedTotal) : 0,
      recordedDayCount: recordedDayCount,
      recordedDates: recordedDates,
      hasHistory: recordedDayCount > 0
    };
  }

  function create(host) {
    host = host || {};
    var selectedWeekStart = mondayOf(dateKeyInZone(new Date(), "America/Lima"));
    var state = null;
    var storageAvailable = true;
    var lastError = "";
    var wrapped = false;

    function liveSchedule() {
      if (typeof host.getDatosCompletos !== "function") return { dias: [], filas: [] };
      try {
        var data = host.getDatosCompletos();
        return data && Array.isArray(data.filas) ? data : { dias: [], filas: [] };
      } catch (error) { return { dias: [], filas: [] }; }
    }

    function makeId() {
      try { return "act-" + host.crypto.randomUUID(); }
      catch (error) { return "act-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12); }
    }

    function ensureActivityIds() {
      var schedule = liveSchedule();
      var used = {};
      var changed = false;
      (schedule.filas || []).forEach(function (row) {
        (row.celdas || []).forEach(function (cell) {
          if (!cell || typeof cell !== "object") return;
          if (!isMeaningfulCell(cell)) {
            if (cell.planifyActivityId) { delete cell.planifyActivityId; changed = true; }
            return;
          }
          var id = String(cell.planifyActivityId || "");
          if (!id || used[id]) id = makeId();
          if (cell.planifyActivityId !== id) { cell.planifyActivityId = id; changed = true; }
          used[id] = true;
        });
      });
      if (changed && typeof host.autoGuardar === "function") host.autoGuardar();
      return schedule;
    }

    function newState() {
      return { schemaVersion: 1, trackingStartedAt: new Date().toISOString(), days: {} };
    }

    function saveState(next) {
      if (!storageAvailable || !validState(next)) return false;
      try {
        host.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        state = next;
        return true;
      } catch (error) {
        storageAvailable = false;
        lastError = "No se pudo guardar el historial en este navegador.";
        return false;
      }
    }

    function loadState() {
      if (state) return state;
      try {
        var raw = host.localStorage.getItem(STORAGE_KEY);
        if (raw == null) {
          state = newState();
          saveState(state);
          return state;
        }
        var parsed = JSON.parse(raw);
        if (!validState(parsed)) throw new Error("Formato inválido");
        state = parsed;
        return state;
      } catch (error) {
        storageAvailable = false;
        lastError = "No se pudo leer el historial; no se modificó tu horario.";
        return null;
      }
    }

    function dateForColumn(schedule, columnIndex, weekStart) {
      var dayName = Array.isArray(schedule.dias) ? schedule.dias[columnIndex] : "";
      var dayIndex = weekdayIndex(dayName, columnIndex);
      return dayIndex >= 0 ? addDays(weekStart || selectedWeekStart, dayIndex) : "";
    }

    function snapshotForDate(dateKey) {
      var schedule = ensureActivityIds();
      var snapshot = {};
      var dateWeekStart = mondayOf(dateKey);
      (schedule.filas || []).forEach(function (row, rowIndex) {
        (row.celdas || []).forEach(function (cell, columnIndex) {
          if (!isMeaningfulCell(cell) || !cell.planifyActivityId || dateForColumn(schedule, columnIndex, dateWeekStart) !== dateKey) return;
          var title = String(cell.t || cell.texto || cell.title || "").trim();
          snapshot[cell.planifyActivityId] = { title: title, hours: rowDurationHours(schedule.filas, rowIndex, cell) };
        });
      });
      return snapshot;
    }

    function changed(dateKey) {
      if (host.document && typeof host.CustomEvent === "function") {
        host.document.dispatchEvent(new host.CustomEvent("planify:completion-changed", { detail: { date: dateKey } }));
      }
    }

    function setActivity(dateKey, activityId, done, targetState) {
      if (!validDateKey(dateKey) || !activityId || !storageAvailable) return false;
      var current = targetState || loadState();
      if (!current) return false;
      var existingDay = current.days[dateKey];
      if (!targetState && existingDay && existingDay.activities[activityId] === Boolean(done)) return true;
      var next = targetState || JSON.parse(JSON.stringify(current));
      var day = next.days[dateKey] || { updatedAt: new Date().toISOString(), activities: {}, snapshot: snapshotForDate(dateKey) };
      if (!day.snapshot[activityId]) {
        var currentSchedule = liveSchedule();
        var item = null;
        (currentSchedule.filas || []).forEach(function (row, rowIndex) {
          (row.celdas || []).forEach(function (cell, columnIndex) {
            if (cell && cell.planifyActivityId === activityId && dateForColumn(currentSchedule, columnIndex, mondayOf(dateKey)) === dateKey) {
              item = { title: String(cell.t || cell.texto || cell.title || "").trim(), hours: rowDurationHours(currentSchedule.filas, rowIndex, cell) };
            }
          });
        });
        if (item) day.snapshot[activityId] = item;
      }
      day.activities[activityId] = Boolean(done);
      day.updatedAt = new Date().toISOString();
      next.days[dateKey] = day;
      if (targetState) return true;
      if (!saveState(next)) return false;
      changed(dateKey);
      return true;
    }

    function toggleCell(rowIndex, columnIndex) {
      var schedule = ensureActivityIds();
      var cell = schedule.filas[Number(rowIndex)] && schedule.filas[Number(rowIndex)].celdas && schedule.filas[Number(rowIndex)].celdas[Number(columnIndex)];
      if (!isMeaningfulCell(cell)) return false;
      var dateKey = dateForColumn(schedule, Number(columnIndex));
      var current = loadState();
      if (!current) return false;
      var day = current.days[dateKey];
      var isDone = Boolean(day && day.activities[cell.planifyActivityId]);
      return setActivity(dateKey, cell.planifyActivityId, !isDone);
    }

    function markWeek(done) {
      var schedule = ensureActivityIds();
      var current = loadState();
      if (!current) return false;
      var next = JSON.parse(JSON.stringify(current));
      var changedDates = {};
      (schedule.filas || []).forEach(function (row) {
        (row.celdas || []).forEach(function (cell, columnIndex) {
          if (!isMeaningfulCell(cell) || !cell.planifyActivityId) return;
          var dateKey = dateForColumn(schedule, columnIndex);
          var existing = next.days[dateKey];
          if (existing && existing.activities[cell.planifyActivityId] === Boolean(done)) return;
          var day = existing || { updatedAt: new Date().toISOString(), activities: {}, snapshot: snapshotForDate(dateKey) };
          day.activities[cell.planifyActivityId] = Boolean(done);
          day.updatedAt = new Date().toISOString();
          next.days[dateKey] = day;
          changedDates[dateKey] = true;
        });
      });
      if (!Object.keys(changedDates).length) return true;
      if (!saveState(next)) return false;
      Object.keys(changedDates).forEach(changed);
      return true;
    }

    function isDone(dateKey, activityId) {
      var current = loadState();
      return Boolean(current && current.days[dateKey] && current.days[dateKey].activities[activityId] === true);
    }

    function applyTableMarks() {
      var schedule = liveSchedule();
      var table = host.document && host.document.getElementById("tabla");
      if (!table) return;
      table.querySelectorAll("td.celda[data-fi][data-ci]").forEach(function (td) {
        var row = schedule.filas[Number(td.dataset.fi)];
        var cell = row && row.celdas && row.celdas[Number(td.dataset.ci)];
        var marked = Boolean(cell && isMeaningfulCell(cell) && isDone(dateForColumn(schedule, Number(td.dataset.ci)), cell.planifyActivityId));
        var check = td.querySelector(".done-check");
        if (!check) return;
        check.textContent = marked ? "✓" : "";
        check.classList.toggle("done", marked);
        check.classList.toggle("is-complete", marked);
        td.classList.toggle("is-complete", marked);
      });
    }

    function wrapCoreHandlers() {
      if (wrapped || typeof host.renderizar !== "function") return;
      wrapped = true;
      var originalRender = host.renderizar;
      host.renderizar = function () {
        ensureActivityIds();
        var result = originalRender.apply(this, arguments);
        applyTableMarks();
        return result;
      };
      host.toggleDone = function (rowIndex, columnIndex) {
        if (!toggleCell(rowIndex, columnIndex)) {
          if (!storageAvailable && typeof host.notificarChoque === "function") host.notificarChoque(lastError, "#ef4444");
          return;
        }
        applyTableMarks();
      };
      host.marcarTodo = function (done) {
        if (!markWeek(done)) {
          if (!storageAvailable && typeof host.notificarChoque === "function") host.notificarChoque(lastError, "#ef4444");
          return;
        }
        applyTableMarks();
      };
    }

    function setSelectedWeekStart(dateKey) {
      var monday = mondayOf(dateKey);
      if (monday) selectedWeekStart = monday;
      applyTableMarks();
      return selectedWeekStart;
    }

    function init() {
      loadState();
      ensureActivityIds();
      wrapCoreHandlers();
      if (host.document) {
        host.document.addEventListener("click", function (event) {
          var target = event.target && event.target.closest && event.target.closest("#btn-prev-sem,#btn-next-sem");
          if (!target) return;
          selectedWeekStart = addDays(selectedWeekStart, target.id === "btn-prev-sem" ? -7 : 7);
          host.setTimeout(applyTableMarks, 0);
        });
        host.document.addEventListener("planify:completion-changed", function () {
          if (host.document.getElementById("trust-dashboard-close") && typeof host.__PLANIFY_REFRESH_DASHBOARD === "function") host.__PLANIFY_REFRESH_DASHBOARD();
          applyTableMarks();
        });
      }
      if (typeof host.renderizar === "function") host.renderizar();
    }

    loadState();
    init();
    return {
      storageKey: STORAGE_KEY,
      validState: validState,
      localDateKey: function (value) { return dateKeyInZone(value, "America/Lima"); },
      todayKey: function () { return dateKeyInZone(new Date(), "America/Lima"); },
      mondayOf: mondayOf,
      addDays: addDays,
      weekdayIndex: weekdayIndex,
      getWeekStart: function () { return selectedWeekStart; },
      setWeekStart: setSelectedWeekStart,
      dateForColumn: dateForColumn,
      isDone: isDone,
      set: function (dateKey, activityId, done) { return setActivity(dateKey, activityId, done); },
      toggle: toggleCell,
      markWeek: markWeek,
      ensureActivityIds: ensureActivityIds,
      refresh: applyTableMarks,
          weekStats: function (schedule, start) { return stateForWeek(schedule, loadState(), start || selectedWeekStart); },
      state: function () { return loadState(); },
      exportState: function () { var current = loadState(); return current ? JSON.parse(JSON.stringify(current)) : null; },
      mergeStates: function (local, incoming) {
        if (!validState(incoming) || (local != null && !validState(local))) return null;
        var merged = local ? JSON.parse(JSON.stringify(local)) : JSON.parse(JSON.stringify(incoming));
        merged.days = Object.assign({}, local ? local.days : {});
        Object.keys(incoming.days).forEach(function (dateKey) { merged.days[dateKey] = incoming.days[dateKey]; });
        if (!local || Date.parse(incoming.trackingStartedAt) < Date.parse(local.trackingStartedAt)) merged.trackingStartedAt = incoming.trackingStartedAt;
        merged.schemaVersion = 1;
        return merged;
      },
      replaceState: function (next) { return saveState(next); },
      isStorageAvailable: function () { return storageAvailable; },
      lastError: function () { return lastError; }
    };
  }

  return {
    storageKey: STORAGE_KEY,
    validDateKey: validDateKey,
    localDateKey: dateKeyInZone,
    addDays: addDays,
    mondayOf: mondayOf,
    weekdayIndex: weekdayIndex,
    isMeaningfulCell: isMeaningfulCell,
    rowDurationHours: rowDurationHours,
    validState: validState,
    calculateWeek: stateForWeek,
    create: create
  };
});
