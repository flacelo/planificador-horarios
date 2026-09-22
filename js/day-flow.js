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

  function getDayIndex(date) { return (date.getDay() + 6) % 7; }

  function minutesFromText(value) {
    var match = String(value || "").match(/(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  function formatTime(minutes) {
    if (minutes == null) return "";
    var hour = Math.floor((minutes % 1440) / 60);
    var minute = minutes % 60;
    return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
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

  function getTodayItems(now) {
    now = now || new Date();
    var stored = readSchedule();
    var rows = stored.value.filas || [];
    var dayIndex = getDayIndex(now);
    var items = [];
    rows.forEach(function (row, index) {
      var cell = Array.isArray(row.celdas) ? row.celdas[dayIndex] : null;
      if (!isMeaningful(cell)) return;
      var start = minutesFromText(row.hora);
      if (start == null) return;
      var labelTimes = String(row.hora || "").match(/\d{1,2}:\d{2}/g) || [];
      var end = labelTimes.length > 1 ? minutesFromText(labelTimes[1]) : null;
      if (end == null) {
        var next = rows[index + 1] && minutesFromText(rows[index + 1].hora);
        end = next != null && next > start ? next : start + 60 * Math.max(1, Number(cell.rowspan) || 1);
      }
      if (end <= start) end += 1440;
      items.push({
        start: start,
        end: end,
        title: titleFor(cell),
        category: categoryFor(cell),
        done: Boolean(cell.done || cell.completada),
        row: index,
        day: dayIndex,
        storage: stored
      });
    });
    return items.sort(function (a, b) { return a.start - b.start; });
  }

  function durationLabel(minutes) {
    if (minutes <= 1) return "ahora mismo";
    if (minutes < 60) return "en " + minutes + " min";
    var hours = Math.floor(minutes / 60);
    var remainder = minutes % 60;
    return "en " + hours + " h" + (remainder ? " " + remainder + " min" : "");
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
      action = '<button type="button" class="day-flow-primary" data-day-flow-action="focus">⏱️ Enfocarme</button>' +
        '<button type="button" class="day-flow-secondary" data-day-flow-action="schedule">Ver horario</button>' +
        (current ? '<button type="button" class="day-flow-check" data-day-flow-action="complete" data-row="' + activity.row + '">✓ Hecho</button>' : "");
    } else if (items.length) {
      detail = completed === items.length ? "Ya completaste todo lo que estaba planificado para hoy. Disfruta tu cierre del día." : "No queda una actividad pendiente con hora para hoy. Revisa tu horario si quieres reorganizar algo.";
      action = '<button type="button" class="day-flow-primary" data-day-flow-action="schedule">Ver mi horario</button>';
    } else {
      detail = "Aún no hay bloques para hoy. Puedes crear una propuesta guiada o anotar una sola meta para comenzar.";
      action = '<button type="button" class="day-flow-primary" data-day-flow-action="create">✨ Crear mi día</button>' +
        '<button type="button" class="day-flow-secondary" data-day-flow-action="goal">Anotar mi meta</button>';
    }
    var list = items.slice(0, 4).map(function (item) {
      var status = item.done ? " is-done" : (current && item.row === current.row ? " is-current" : "");
      return '<li class="' + status + '"><time>' + formatTime(item.start) + '</time><span>' + escapeHtml(item.title) + '</span>' + (item.done ? '<b>✓</b>' : "") + '</li>';
    }).join("");
    return '<section class="planify-day-flow" aria-label="Tu jornada de hoy">' +
      '<div class="day-flow-main"><div class="day-flow-kicker">HOY · ' + escapeHtml(now.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })) + '</div>' +
      '<div class="day-flow-head"><span class="day-flow-icon">' + (current ? "⏳" : next ? "🎯" : "☀️") + '</span><div><strong>' + headline + '</strong>' +
      (activity ? '<h3>' + escapeHtml(activity.title) + '</h3><small>' + escapeHtml(activity.category) + " · " + escapeHtml(detail) + '</small>' : '<p>' + escapeHtml(detail) + '</p>') + '</div></div>' +
      '<div class="day-flow-actions">' + action + '</div></div>' +
      '<aside class="day-flow-glance"><div><span>AVANCE</span><strong>' + completed + "/" + items.length + '</strong><small>bloques completados</small></div>' +
      '<div><span>AVISOS</span><strong>' + reminders.length + '</strong><small>' + (reminders.length ? "para hoy" : "sin avisos") + '</small></div></aside>' +
      (items.length ? '<details class="day-flow-list"><summary>Ver mi jornada de hoy</summary><ul>' + list + '</ul></details>' : "") +
      '</section>';
  }

  function render() {
    var daily = document.getElementById("view-diario");
    if (!daily) return;
    var old = daily.querySelector(".planify-day-flow");
    var section = document.createElement("div");
    section.innerHTML = flowMarkup(new Date(), getTodayItems(new Date()));
    var next = section.firstElementChild;
    if (old) old.replaceWith(next);
    else {
      var guide = daily.querySelector(".trust-friendly-guide");
      if (guide) guide.insertAdjacentElement("afterend", next);
      else daily.insertAdjacentElement("afterbegin", next);
    }
  }

  function markCurrentComplete(rowIndex) {
    var stored = readSchedule();
    var dayIndex = getDayIndex(new Date());
    var row = stored.value.filas && stored.value.filas[Number(rowIndex)];
    var cell = row && Array.isArray(row.celdas) && row.celdas[dayIndex];
    if (!cell) return;
    cell.done = true;
    cell.completada = true;
    try { localStorage.setItem(stored.key, JSON.stringify(stored.value)); } catch (error) {}
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
    if (action === "focus" && window.PLANIFY_FOCUS && typeof window.PLANIFY_FOCUS.open === "function") window.PLANIFY_FOCUS.open();
    if (action === "schedule" && typeof window.cambiarTab === "function") window.cambiarTab("semanal");
    if (action === "create" && window.PLANIFY_WELCOME && typeof window.PLANIFY_WELCOME.open === "function") window.PLANIFY_WELCOME.open("guided");
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

  window.PLANIFY_DAY_FLOW = { refresh: render, today: getTodayItems };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
