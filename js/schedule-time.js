(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PLANIFY_SCHEDULE_TIME = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  function parseTime(value) {
    var match = String(value || "").match(/(?:^|\D)(\d{1,2}):(\d{2})(?!\d)/);
    if (!match) return null;
    var hours = Number(match[1]);
    var minutes = Number(match[2]);
    if (minutes > 59 || hours > 24 || (hours === 24 && minutes !== 0)) return null;
    return hours * 60 + minutes;
  }

  function parseRange(value) {
    var matches = String(value || "").match(/(?:^|\D)(\d{1,2}):(\d{2})(?!\d)/g) || [];
    if (!matches.length || matches.length > 2) return null;
    var start = parseTime(matches[0]);
    var end = matches.length > 1 ? parseTime(matches[1]) : null;
    if (start == null || start >= 1440) return null;
    if (end === 0 && start > 0) end = 1440;
    if (end != null && end <= start) end += 1440;
    if (end != null && (end <= start || end - start > 1440)) return null;
    return { start: start, end: end };
  }

  function minutesLabel(minutes) {
    var value = ((minutes % 1440) + 1440) % 1440;
    return String(Math.floor(value / 60)).padStart(2, "0") + ":" + String(value % 60).padStart(2, "0");
  }

  function rangeLabel(start, end) {
    return minutesLabel(start) + " – " + minutesLabel(end);
  }

  function formatTime12(value, options) {
    var minutes = typeof value === "number" ? value : parseTime(value);
    if (minutes == null) return String(value || "");
    options = options || {};
    var normalized = ((minutes % 1440) + 1440) % 1440;
    var hour = Math.floor(normalized / 60);
    var minute = normalized % 60;
    var nextDay = Boolean(options.nextDay) || minutes >= 1440;
    return (hour % 12 || 12) + ":" + String(minute).padStart(2, "0") + (hour < 12 ? " a. m." : " p. m.") + (nextDay ? " (+1 día)" : "");
  }

  function formatRange12(value) {
    var matches = String(value || "").match(/(?:^|\D)(\d{1,2}:\d{2})(?!\d)/g) || [];
    if (matches.length === 1) return formatTime12(matches[0]);
    if (matches.length !== 2) return String(value || "");
    var start = parseTime(matches[0]);
    var end = parseTime(matches[1]);
    if (start == null || end == null) return String(value || "");
    return formatTime12(start) + " – " + formatTime12(end, { nextDay: end === 1440 || end <= start });
  }

  function intervalsFor(rows, fallbackMinutes) {
    rows = Array.isArray(rows) ? rows : [];
    fallbackMinutes = Number.isInteger(Number(fallbackMinutes)) && Number(fallbackMinutes) > 0 ? Number(fallbackMinutes) : 60;
    var intervals = [];
    for (var index = 0; index < rows.length; index += 1) {
      var range = parseRange(rows[index] && rows[index].hora);
      if (!range) return { ok: false, error: "La fila " + (index + 1) + " no tiene una hora válida." };
      var start = range.start;
      var end = range.end;
      if (index && start < intervals[index - 1].end && intervals[index - 1].end >= 23 * 60 && start < 2 * 60) {
        start += 1440;
        if (end != null) end += 1440;
      }
      if (end == null) {
        var next = index + 1 < rows.length ? parseRange(rows[index + 1] && rows[index + 1].hora) : null;
        if (next && next.start !== range.start) {
          end = next.start;
          if (next.start < range.start || start >= 1440) end += 1440;
        } else {
          end = start + fallbackMinutes;
        }
      }
      if (end <= start || end - start > 1440) {
        return { ok: false, error: "La duración de la fila " + (index + 1) + " no es válida." };
      }
      if (index && start < intervals[index - 1].end) {
        return { ok: false, error: "Hay filas con horarios superpuestos. Corrige esos rangos antes de cambiar una duración." };
      }
      intervals.push({ start: start, end: end });
    }
    return { ok: true, intervals: intervals };
  }

  function isMeaningful(cell) {
    if (!cell || typeof cell !== "object" || Number(cell.rowspan) === 0) return false;
    var title = String(cell.t || cell.texto || cell.title || "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
    return Boolean(title && title !== "—" && title !== "-");
  }

  function activityInterval(rows, rowIndex, cell, fallbackMinutes) {
    var result = intervalsFor(rows, fallbackMinutes);
    if (!result.ok || !Number.isInteger(Number(rowIndex)) || rowIndex < 0 || rowIndex >= result.intervals.length) {
      return { ok: false, error: result.error || "No se encontró el inicio del bloque." };
    }
    if (cell && Number(cell.rowspan) === 0) return { ok: false, error: "La fila forma parte de otro bloque." };
    var span = Math.max(1, Number(cell && cell.rowspan) || 1);
    var last = rowIndex + span - 1;
    if (last >= result.intervals.length) return { ok: false, error: "El bloque excede las filas del horario." };
    var start = result.intervals[rowIndex].start;
    var end = result.intervals[last].end;
    var duration = 0;
    for (var index = rowIndex; index <= last; index += 1) duration += result.intervals[index].end - result.intervals[index].start;
    return { ok: true, start: start, end: end, durationMinutes: duration, span: span };
  }

  function cloneCell(cell) {
    return cell && typeof cell === "object" ? Object.assign({}, cell) : { t: "", c: "libre", done: false, reminder: false };
  }

  function cloneSchedule(schedule) {
    return {
      dias: Array.isArray(schedule && schedule.dias) ? schedule.dias.slice() : [],
      filas: (Array.isArray(schedule && schedule.filas) ? schedule.filas : []).map(function (row) {
        var copy = Object.assign({}, row);
        copy.celdas = (Array.isArray(row.celdas) ? row.celdas : []).map(cloneCell);
        return copy;
      })
    };
  }

  function collectActivities(schedule, intervals) {
    var byDay = Array.from({ length: schedule.dias.length }, function () { return []; });
    for (var rowIndex = 0; rowIndex < schedule.filas.length; rowIndex += 1) {
      var row = schedule.filas[rowIndex];
      if (!row || !Array.isArray(row.celdas) || row.celdas.length !== schedule.dias.length) {
        return { ok: false, error: "La estructura de una fila no coincide con los días del horario." };
      }
      for (var dayIndex = 0; dayIndex < schedule.dias.length; dayIndex += 1) {
        var cell = row.celdas[dayIndex];
        if (!isMeaningful(cell)) continue;
        var span = Math.max(1, Number(cell.rowspan) || 1);
        var last = rowIndex + span - 1;
        if (last >= intervals.length) return { ok: false, error: "Un bloque excede el final del horario." };
        byDay[dayIndex].push({ rowIndex: rowIndex, lastRowIndex: last, start: intervals[rowIndex].start, end: intervals[last].end, cell: cloneCell(cell) });
      }
    }
    for (var day = 0; day < byDay.length; day += 1) {
      var activities = byDay[day].sort(function (a, b) { return a.start - b.start; });
      for (var activityIndex = 1; activityIndex < activities.length; activityIndex += 1) {
        if (activities[activityIndex].start < activities[activityIndex - 1].end) {
          return { ok: false, error: "Hay actividades superpuestas en " + schedule.dias[day] + ". Corrige ese día antes de cambiar una duración." };
        }
      }
    }
    return { ok: true, byDay: byDay };
  }

  function emptyCell(previous) {
    var result = cloneCell(previous);
    result.t = "";
    result.c = result.c || "libre";
    result.done = false;
    result.reminder = false;
    result.rowspan = 1;
    delete result.planifyActivityId;
    return result;
  }

  function coveredCell(activity) {
    return { t: "", c: activity.cell.c || "libre", done: false, reminder: false, rowspan: 0 };
  }

  function refineAt(schedule, intervals, activities, cut) {
    var expanded = [];
    for (var index = 0; index < intervals.length; index += 1) {
      var interval = intervals[index];
      var source = schedule.filas[index];
      if (cut > interval.start && cut < interval.end) {
        var first = Object.assign({}, source, { hora: rangeLabel(interval.start, cut) });
        var second = Object.assign({}, source, { hora: rangeLabel(cut, interval.end) });
        expanded.push({ row: first, start: interval.start, end: cut, sourceIndex: index });
        expanded.push({ row: second, start: cut, end: interval.end, sourceIndex: index });
      } else {
        expanded.push({ row: Object.assign({}, source), start: interval.start, end: interval.end, sourceIndex: index });
      }
    }
    if (expanded.length > 1000) return { ok: false, error: "El horario tendría demasiadas filas para editarse con fluidez." };

    var rows = expanded.map(function (item) { return item.row; });
    for (var rowIndex = 0; rowIndex < expanded.length; rowIndex += 1) {
      var item = expanded[rowIndex];
      item.row.celdas = [];
      for (var dayIndex = 0; dayIndex < schedule.dias.length; dayIndex += 1) {
        var active = activities.byDay[dayIndex].filter(function (activity) {
          return activity.start <= item.start && activity.end >= item.end;
        });
        if (active.length > 1) return { ok: false, error: "No se puede subdividir porque hay bloques superpuestos." };
        if (active.length === 1) {
          var current = active[0];
          if (item.start === current.start) {
            var span = 1;
            for (var next = rowIndex + 1; next < expanded.length && expanded[next].start < current.end; next += 1) span += 1;
            var primary = cloneCell(current.cell);
            primary.rowspan = span;
            item.row.celdas.push(primary);
          } else {
            item.row.celdas.push(coveredCell(current));
          }
        } else {
          var original = schedule.filas[item.sourceIndex].celdas[dayIndex];
          item.row.celdas.push(Number(original && original.rowspan) === 0 ? emptyCell(original) : Object.assign(emptyCell(original), { rowspan: 1 }));
        }
      }
    }
    return { ok: true, filas: rows, intervals: expanded.map(function (item) { return { start: item.start, end: item.end }; }) };
  }

  function setDuration(schedule, dayIndex, rowIndex, durationMinutes, fallbackMinutes) {
    var clean = cloneSchedule(schedule);
    var rows = clean.filas;
    if (!clean.dias.length || !rows.length || dayIndex < 0 || dayIndex >= clean.dias.length || rowIndex < 0 || rowIndex >= rows.length) {
      return { ok: false, error: "No se encontró el bloque que quieres editar." };
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 720) {
      return { ok: false, error: "Elige una duración entera entre 5 y 720 minutos." };
    }
    var timeline = intervalsFor(rows, fallbackMinutes);
    if (!timeline.ok) return timeline;
    var activities = collectActivities(clean, timeline.intervals);
    if (!activities.ok) return activities;
    var selected = rows[rowIndex].celdas[dayIndex];
    if (Number(selected && selected.rowspan) === 0) return { ok: false, error: "Selecciona el inicio del bloque, no una fila que ya está unida." };
    var own = activities.byDay[dayIndex].find(function (activity) { return activity.rowIndex === rowIndex; }) || null;
    var start = timeline.intervals[rowIndex].start;
    var end = start + durationMinutes;
    var lastTime = timeline.intervals[timeline.intervals.length - 1].end;
    if (end > lastTime) return { ok: false, error: "Esa duración supera el final del horario." };

    var cursor = start;
    for (var intervalIndex = rowIndex; intervalIndex < timeline.intervals.length && cursor < end; intervalIndex += 1) {
      var interval = timeline.intervals[intervalIndex];
      if (interval.start > cursor) return { ok: false, error: "Ese tramo incluye un espacio sin horario. Ajusta primero los rangos de la tabla." };
      if (interval.end > cursor) cursor = Math.min(end, interval.end);
    }
    if (cursor !== end) return { ok: false, error: "No hay suficiente espacio para esa duración." };

    var conflict = activities.byDay[dayIndex].find(function (activity) {
      return activity !== own && activity.start < end && activity.end > start;
    });
    if (conflict) return { ok: false, error: "Ese bloque se cruzaría con «" + String(conflict.cell.t || "otra actividad") + "». Acorta la duración o mueve primero la otra actividad." };

    var refined = refineAt(clean, timeline.intervals, activities, end);
    if (!refined.ok) return refined;
    var newIntervals = refined.intervals;
    var newStart = newIntervals.findIndex(function (interval) { return interval.start === start; });
    var newEnd = newIntervals.findIndex(function (interval) { return interval.end === end; });
    if (newStart < 0 || newEnd < newStart) return { ok: false, error: "No se pudo alinear el bloque con el horario." };
    var span = newEnd - newStart + 1;
    var primaryCell = refined.filas[newStart].celdas[dayIndex];
    if (!primaryCell || Number(primaryCell.rowspan) === 0) return { ok: false, error: "No se pudo conservar la actividad seleccionada." };

    if (own) {
      var oldEnd = own.end;
      for (var release = newEnd + 1; release < refined.filas.length && newIntervals[release].start < oldEnd; release += 1) {
        refined.filas[release].celdas[dayIndex] = emptyCell(refined.filas[release].celdas[dayIndex]);
      }
    }
    primaryCell.rowspan = span;
    for (var covered = newStart + 1; covered <= newEnd; covered += 1) refined.filas[covered].celdas[dayIndex] = coveredCell({ cell: primaryCell });
    return { ok: true, schedule: { dias: clean.dias, filas: refined.filas }, start: start, end: end, durationMinutes: durationMinutes, changed: true };
  }

  function splitActivity(schedule, dayIndex, rowIndex, fallbackMinutes) {
    var clean = cloneSchedule(schedule);
    var rows = clean.filas;
    if (!clean.dias.length || !rows.length || dayIndex < 0 || dayIndex >= clean.dias.length || rowIndex < 0 || rowIndex >= rows.length) {
      return { ok: false, error: "No se encontró el bloque que quieres dividir." };
    }
    var cell = rows[rowIndex].celdas[dayIndex];
    if (!isMeaningful(cell)) return { ok: false, error: "Selecciona un bloque con actividad para dividir." };
    var timing = activityInterval(rows, rowIndex, cell, fallbackMinutes);
    if (!timing.ok) return timing;
    if (timing.span < 2) return { ok: true, schedule: clean, changed: false, span: 1 };
    for (var offset = 0; offset < timing.span; offset += 1) {
      var part = cloneCell(cell);
      part.rowspan = 1;
      if (offset > 0) {
        delete part.planifyActivityId;
        part.done = false;
        part.reminder = false;
        delete part.reminderLabel;
      }
      rows[rowIndex + offset].celdas[dayIndex] = part;
    }
    return { ok: true, schedule: clean, changed: true, start: timing.start, end: timing.end, span: timing.span };
  }

  function moveActivity(schedule, sourceDay, sourceRow, targetDay, targetRow, fallbackMinutes) {
    var clean = cloneSchedule(schedule);
    var rows = clean.filas;
    if (!clean.dias.length || !rows.length || sourceDay < 0 || sourceDay >= clean.dias.length ||
        targetDay < 0 || targetDay >= clean.dias.length || sourceRow < 0 || sourceRow >= rows.length ||
        targetRow < 0 || targetRow >= rows.length) {
      return { ok: false, error: "No encontré el bloque o el destino del movimiento." };
    }
    var timeline = intervalsFor(rows, fallbackMinutes);
    if (!timeline.ok) return timeline;
    var sourceCell = rows[sourceRow].celdas[sourceDay];
    var sourceRange = activityInterval(rows, sourceRow, sourceCell, fallbackMinutes);
    if (!sourceRange.ok || !isMeaningful(sourceCell)) return { ok: false, error: "Selecciona una actividad para mover." };
    var activities = collectActivities(clean, timeline.intervals);
    if (!activities.ok) return activities;
    var own = activities.byDay[sourceDay].find(function (activity) { return activity.rowIndex === sourceRow; });
    if (!own) return { ok: false, error: "No pude determinar la duración de esa actividad." };

    var start = timeline.intervals[targetRow].start;
    var end = start + sourceRange.durationMinutes;
    var lastTime = timeline.intervals[timeline.intervals.length - 1].end;
    if (end > lastTime) return { ok: false, error: "Ese bloque quedaría fuera del final del horario." };
    if (sourceDay === targetDay && start === sourceRange.start) {
      return { ok: true, schedule: clean, start: start, end: end, durationMinutes: sourceRange.durationMinutes, changed: false };
    }
    var conflict = activities.byDay[targetDay].find(function (activity) {
      return activity !== own && activity.start < end && activity.end > start;
    });
    if (conflict) return { ok: false, error: "Ese espacio coincide con «" + String(conflict.cell.t || "otra actividad") + "». No moví el bloque." };

    var movedCell = cloneCell(sourceCell);
    rows.forEach(function (row, index) {
      var interval = timeline.intervals[index];
      if (interval.start < sourceRange.end && interval.end > sourceRange.start) {
        row.celdas[sourceDay] = emptyCell(row.celdas[sourceDay]);
      }
    });
    rows[targetRow].celdas[targetDay] = Object.assign(emptyCell(rows[targetRow].celdas[targetDay]), movedCell, { rowspan: 1 });
    var resized = setDuration(clean, targetDay, targetRow, sourceRange.durationMinutes, fallbackMinutes);
    if (!resized.ok) return resized;
    return {
      ok: true,
      schedule: resized.schedule,
      start: resized.start,
      end: resized.end,
      durationMinutes: sourceRange.durationMinutes,
      changed: true
    };
  }

  return {
    parseTime: parseTime,
    formatTime12: formatTime12,
    formatRange12: formatRange12,
    parseRange: parseRange,
    rangeLabel: rangeLabel,
    intervalsFor: intervalsFor,
    isMeaningful: isMeaningful,
    activityInterval: activityInterval,
    setDuration: setDuration,
    splitActivity: splitActivity,
    moveActivity: moveActivity
  };
});
