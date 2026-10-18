(function () {
  "use strict";

  var STORAGE_KEYS = ["horario_data_semanal", "horario_datos", "horario_completo"];
  var REFRESH_MS = 30000;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function readSchedule() {
    for (var i = 0; i < STORAGE_KEYS.length; i += 1) {
      try {
        var value = JSON.parse(localStorage.getItem(STORAGE_KEYS[i]) || "null");
        if (value && Array.isArray(value.filas)) return { key: STORAGE_KEYS[i], value: value };
      } catch (error) {}
    }
    return { key: STORAGE_KEYS[0], value: { dias: [], filas: [] } };
  }

  function getDateKey(date) {
    var history = window.PLANIFY_COMPLETION_HISTORY;
    return history ? history.localDateKey(date) : date.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  }

  function getDayIndex(dateKey, days) {
    var date = new Date(dateKey + "T12:00:00Z");
    if (isNaN(date.getTime())) return -1;
    var weekday = (date.getUTCDay() + 6) % 7;
    var names = Array.isArray(days) ? days : [];
    var history = window.PLANIFY_COMPLETION_HISTORY;
    return history ? names.findIndex(function (name, index) { return history.weekdayIndex(name, index) === weekday; }) : weekday;
  }

  function minutesFromText(value) {
    var match = String(value || "").match(/(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  function formatTime(minutes) {
    if (minutes == null) return "";
    if (window.PLANIFY_SCHEDULE_TIME && typeof window.PLANIFY_SCHEDULE_TIME.formatTime12 === "function") return window.PLANIFY_SCHEDULE_TIME.formatTime12(minutes);
    var hour = Math.floor((minutes % 1440) / 60);
    var minute = minutes % 60;
    return (hour % 12 || 12) + ":" + String(minute).padStart(2, "0") + (hour < 12 ? " a. m." : " p. m.") + (minutes >= 1440 ? " (+1 día)" : "");
  }

  function titleFor(cell) {
    return String(cell && (cell.t || cell.texto || cell.title) || "")
      .replace(/^[^\p{L}\p{N}]+/u, "")
      .trim();
  }

  function isMeaningful(cell) {
    var title = titleFor(cell);
    return Boolean(title && title !== "—" && title !== "-") && Number(cell.rowspan) !== 0;
  }

  function categoryFor(cell) {
    var raw = (String(cell && cell.c || "") + " " + titleFor(cell)).toLowerCase();
    if (/estudi|clase|curso|univers|proyect/.test(raw)) return "📚 Estudio";
    if (/trabaj|reuni|oficina|emprend/.test(raw)) return "💼 Trabajo";
    if (/comida|almuerzo|cena|desay|snack/.test(raw)) return "🍽️ Comida";
    if (/ejerc|gym|deport|salud/.test(raw)) return "🏃 Bienestar";
    if (/dorm|descans|libre|ocio/.test(raw)) return "🌙 Descanso";
    if (/rutina|aseo|ducha|medita/.test(raw)) return "☀️ Rutina";
    return "✦ Plan del día";
  }

  // preview = true sirve para mostrar el horario en otras vistas (p. ej. el mes): no asigna ids ni marca avances.
  function getItemsForKey(dateKey, preview) {
    var history = window.PLANIFY_COMPLETION_HISTORY;
    var stored = readSchedule();
    if (history && !preview) stored.value = history.ensureActivityIds();
    var rows = stored.value.filas || [];
    var today = dateKey;
    var dayIndex = getDayIndex(today, stored.value.dias);
    var items = [];
    rows.forEach(function (row, index) {
      var cell = Array.isArray(row.celdas) ? row.celdas[dayIndex] : null;
      if (!isMeaningful(cell)) return;
      var timing = window.PLANIFY_SCHEDULE_TIME && window.PLANIFY_SCHEDULE_TIME.activityInterval(rows, index, cell, 60);
      var start = timing && timing.ok ? timing.start : minutesFromText(row.hora);
      var end = timing && timing.ok ? timing.end : null;
      if (start == null) return;
      if (end == null) {
        var labelTimes = String(row.hora || "").match(/\d{1,2}:\d{2}/g) || [];
        end = labelTimes.length > 1 ? minutesFromText(labelTimes[1]) : null;
        if (end == null) {
          var next = rows[index + 1] && minutesFromText(rows[index + 1].hora);
          end = next != null && next > start ? next : start + 60 * Math.max(1, Number(cell.rowspan) || 1);
        }
        if (end <= start) end += 1440;
      }
      items.push({
        start: start,
        end: end,
        title: titleFor(cell),
        category: categoryFor(cell),
        activityId: String(cell.planifyActivityId || ""),
        dateKey: today,
        done: !preview && Boolean(history && cell.planifyActivityId && history.isDone(today, cell.planifyActivityId)),
        row: index,
        day: dayIndex,
        storage: stored
      });
    });
    return items.sort(function (a, b) { return a.start - b.start; });
  }

  function getTodayItems(now) {
    now = now || new Date();
    return getItemsForKey(getDateKey(now), false);
  }

  function durationLabel(minutes) {
    if (minutes <= 1) return "ahora mismo";
    if (minutes < 60) return "en " + minutes + " min";
    var hours = Math.floor(minutes / 60);
    var remainder = minutes % 60;
    return "en " + hours + " h" + (remainder ? " " + remainder + " min" : "");
  }

  // Primera palabra del nombre que la app ya guarda (perfil o nombre del inicio); no se escribe nada nuevo.
  function firstName() {
    var name = "";
    try {
      var profile = JSON.parse(localStorage.getItem("planify_personalizacion_v1") || "null") || {};
      name = String(profile.name || "");
    } catch (error) { name = ""; }
    if (!name.trim()) {
      try { name = String(localStorage.getItem("planify_nombre") || ""); } catch (error) { name = ""; }
    }
    return name.trim().split(/\s+/)[0] || "";
  }

  function greetingText(now) {
    var hour = now.getHours();
    var base = hour >= 5 && hour < 12 ? "Buenos días" : hour >= 12 && hour < 19 ? "Buenas tardes" : "Buenas noches";
    var name = firstName();
    return name ? base + ", " + name : base;
  }

  // Barra "Tu día": sale del avance que ya se guarda (momentos hechos / momentos de hoy); sin momentos no se muestra.
  function progressMarkup(completed, total) {
    if (!total) return "";
    var label = completed + " de " + total + " momentos hechos";
    var percent = Math.round((completed / total) * 100);
    return '<div class="day-flow-progress"><span>Tu día</span>' +
      '<div class="day-flow-bar" role="progressbar" aria-label="Progreso de tu día: ' + label + '" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + completed + '"><i style="width:' + percent + '%"></i></div>' +
      '<small>' + (completed === total ? "¡Día completo! " : "") + label + '</small></div>';
  }

  function flowMarkup(now, items) {
    var currentMinutes = now.getHours() * 60 + now.getMinutes();
    var current = items.find(function (item) { return item.start <= currentMinutes && item.end > currentMinutes && !item.done; });
    var next = items.find(function (item) { return item.start > currentMinutes && !item.done; });
    var completed = items.filter(function (item) { return item.done; }).length;
    var reminders = window.PLANIFY_REMINDERS && typeof window.PLANIFY_REMINDERS.today === "function" ? window.PLANIFY_REMINDERS.today() : [];
    var headline = current ? "En curso" : next ? "Tu siguiente paso" : items.length ? "Tu día está al día" : "Tu día está abierto";
    var activity = current || next;
    var detail = "";
    var action = "";
    if (activity) {
      if (current) detail = "Termina a las " + formatTime(activity.end) + " · quedan " + durationLabel(Math.max(1, activity.end - currentMinutes));
      else detail = "Empieza a las " + formatTime(activity.start) + " · " + durationLabel(Math.max(0, activity.start - currentMinutes));
      action = '<button type="button" class="day-flow-primary" data-day-flow-action="focus" data-focus-activity-id="' + escapeHtml(activity.activityId) + '" data-focus-date-key="' + escapeHtml(activity.dateKey) + '" data-focus-title="' + escapeHtml(activity.title) + '">⏱️ Enfocarme</button>' +
        '<button type="button" class="day-flow-secondary" data-day-flow-action="schedule">Ver horario</button>' +
        (current ? '<button type="button" class="day-flow-check" data-day-flow-action="complete" data-row="' + activity.row + '">✓ Hecho</button>' : "");
    } else if (items.length) {
      detail = completed === items.length ? "Ya completaste todo lo que estaba planificado para hoy. Disfruta tu cierre del día." : "No queda una actividad pendiente con hora para hoy. Revisa tu horario si quieres reorganizar algo.";
      action = '<button type="button" class="day-flow-primary" data-day-flow-action="schedule">Ver mi horario</button>';
    } else {
      // Sin momentos, la acción principal es la meta del día (justo debajo); aquí solo queda la ayuda opcional.
      detail = "Empieza por tu meta de hoy. Si quieres, también puedes crear tu día con ayuda.";
      action = '<button type="button" class="day-flow-secondary" data-day-flow-action="create">Crear mi día con ayuda</button>';
    }
    var list = items.slice(0, 4).map(function (item) {
      var status = item.done ? " is-done" : (current && item.row === current.row ? " is-current" : "");
      return '<li class="' + status + '"><time>' + formatTime(item.start) + '</time><span>' + escapeHtml(item.title) + '</span>' + (item.done ? '<b>✓</b>' : "") + '</li>';
    }).join("");
    return '<section class="planify-day-flow" aria-label="Tu jornada de hoy">' +
      '<div class="day-flow-main"><div class="day-flow-greeting"><strong class="day-flow-hello">' + escapeHtml(greetingText(now)) + '</strong>' +
      '<div class="day-flow-date">Hoy · ' + escapeHtml(now.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })) + '</div></div>' +
      '<div class="day-flow-head"><span class="day-flow-icon">' + (current ? "⏳" : next ? "🎯" : "☀️") + '</span><div><strong>' + headline + '</strong>' +
      (activity ? '<h3>' + escapeHtml(activity.title) + '</h3><small>' + escapeHtml(activity.category) + " · " + escapeHtml(detail) + '</small>' : '<p>' + escapeHtml(detail) + '</p>') + '</div></div>' +
      '<div class="day-flow-actions">' + action + '</div></div>' +
      '<aside class="day-flow-glance">' + progressMarkup(completed, items.length) +
      '<div><span>AVISOS</span><strong>' + reminders.length + '</strong><small>' + (reminders.length ? "para hoy" : "sin avisos") + '</small></div></aside>' +
      (items.length ? '<details class="day-flow-list"><summary>Ver mi jornada de hoy</summary><ul>' + list + '</ul></details>' : "") +
      '</section>';
  }

  function render() {
    var daily = document.getElementById("view-diario");
    if (!daily) return;
    var old = daily.querySelector(".planify-day-flow");
    var now = new Date();
    var items = getTodayItems(now);
    var minutes = now.getHours() * 60 + now.getMinutes();
    var section = document.createElement("div");
    section.innerHTML = flowMarkup(now, items);
    var next = section.firstElementChild;
    // Acción principal según el momento: si hay un momento en curso o pendiente, manda la tarjeta Hoy; si no, la meta.
    if (daily.dataset) daily.dataset.dayMoment = items.some(function (item) { return !item.done && item.end > minutes; }) ? "activity" : "free";
    if (old) old.replaceWith(next);
    else {
      var guide = daily.querySelector(".trust-friendly-guide");
      if (guide) guide.insertAdjacentElement("afterend", next);
      else daily.insertAdjacentElement("afterbegin", next);
    }
  }

  function markCurrentComplete(rowIndex) {
    var stored = readSchedule();
    var history = window.PLANIFY_COMPLETION_HISTORY;
    if (history) stored.value = history.ensureActivityIds();
    var today = getDateKey(new Date());
    var dayIndex = getDayIndex(today, stored.value.dias);
    var row = stored.value.filas && stored.value.filas[Number(rowIndex)];
    var cell = row && Array.isArray(row.celdas) && row.celdas[dayIndex];
    if (!cell || !history) return;
    history.ensureActivityIds();
    if (!cell.planifyActivityId || !history.set(today, cell.planifyActivityId, true)) return;
    if (typeof window.renderizar === "function") {
      try { window.renderizar(); } catch (error) {}
    }
    render();
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-day-flow-action]");
    if (!button) return;
    event.preventDefault();
    var action = button.getAttribute("data-day-flow-action");
    if (action === "focus" && window.PLANIFY_FOCUS && typeof window.PLANIFY_FOCUS.open === "function") {
      var activityId = button.getAttribute("data-focus-activity-id") || "";
      var dateKey = button.getAttribute("data-focus-date-key") || "";
      var title = button.getAttribute("data-focus-title") || "";
      if (activityId && dateKey) window.PLANIFY_FOCUS.open({ activityId: activityId, dateKey: dateKey, title: title });
      else window.PLANIFY_FOCUS.open();
    }
    if (action === "schedule" && typeof window.cambiarTab === "function") window.cambiarTab("semanal");
    if (action === "create" && window.PLANIFY_WELCOME && typeof window.PLANIFY_WELCOME.open === "function") window.PLANIFY_WELCOME.open("inicio");
    if (action === "goal") {
      var goal = document.querySelector(".goals-section textarea,.goals-section input");
      if (goal) { goal.scrollIntoView({ behavior: "smooth", block: "center" }); goal.focus(); }
    }
    if (action === "complete") markCurrentComplete(button.getAttribute("data-row"));
  });

  function init() {
    render();
    window.setInterval(render, REFRESH_MS);
    window.addEventListener("storage", render);
    new MutationObserver(function () {
      var daily = document.getElementById("view-diario");
      if (daily && !daily.querySelector(".planify-day-flow")) render();
    }).observe(document.body, { childList: true, subtree: true });
  }

  window.PLANIFY_DAY_FLOW = { refresh: render, today: getTodayItems, forDate: function (dateKey) { return getItemsForKey(dateKey, true); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
