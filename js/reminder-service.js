(function () {
  "use strict";

  var CHECK_EVERY_MS = 20000;
  var DAY_NAMES = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

  function normalize(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  function parseSchedule() {
    var keys = ["horario_data_semanal", "horario_datos", "horario_completo"];
    for (var i = 0; i < keys.length; i += 1) {
      try {
        var parsed = JSON.parse(localStorage.getItem(keys[i]) || "null");
        if (parsed && Array.isArray(parsed.filas)) return parsed;
      } catch (error) {}
    }
    return { dias: [], filas: [] };
  }

  function getDayIndex(date) {
    return (date.getDay() + 6) % 7;
  }

  function rowStart(row) {
    var match = String(row && row.hora || "").match(/(\d{1,2}):(\d{2})/);
    return match ? String(match[1]).padStart(2, "0") + ":" + match[2] : "";
  }

  function reminderText(cell) {
    var label = String(cell && cell.reminderLabel || "").trim();
    if (label) return label;
    var text = String(cell && (cell.t || cell.texto || cell.title) || "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
    return text || "Recordatorio de tu horario";
  }

  function safeKey(value) {
    return normalize(value).replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  }

  function notify(message) {
    var old = document.getElementById("planify-schedule-reminder-toast");
    if (old) old.remove();
    var toast = document.createElement("div");
    toast.id = "planify-schedule-reminder-toast";
    toast.className = "planify-focus-toast planify-schedule-reminder-toast";
    toast.setAttribute("role", "status");
    toast.textContent = "🔔 " + message;
    document.body.appendChild(toast);
    window.setTimeout(function () { if (toast.parentNode) toast.remove(); }, 6500);
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification("PLANIFY · recordatorio", { body: message }); } catch (error) {}
    }
  }

  function dueReminders(now) {
    var schedule = parseSchedule();
    var dayIndex = getDayIndex(now);
    var expectedDay = DAY_NAMES[dayIndex];
    var configuredDay = normalize(Array.isArray(schedule.dias) && schedule.dias[dayIndex]);
    if (configuredDay && configuredDay !== expectedDay) {
      // Algunos horarios usan nombres abreviados; si no coinciden, respetamos la posición semanal.
    }
    var time = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    var dateKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
    var found = [];
    schedule.filas.forEach(function (row) {
      if (rowStart(row) !== time) return;
      var cell = Array.isArray(row.celdas) ? row.celdas[dayIndex] : null;
      if (!cell || !cell.reminder || Number(cell.rowspan) === 0) return;
      var text = reminderText(cell);
      var key = "planify_reminder_sent_" + dateKey + "_" + time.replace(":", "") + "_" + dayIndex + "_" + safeKey(text);
      try {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, "1");
      } catch (error) {}
      found.push(text);
    });
    return found;
  }

  function checkNow() {
    var reminders = dueReminders(new Date());
    if (reminders.length) notify(reminders.join(" · "));
    return reminders;
  }

  function todaySchedule() {
    var schedule = parseSchedule();
    var dayIndex = getDayIndex(new Date());
    return schedule.filas.map(function (row) {
      var cell = Array.isArray(row.celdas) ? row.celdas[dayIndex] : null;
      if (!cell || !cell.reminder || Number(cell.rowspan) === 0) return null;
      return { time: rowStart(row), text: reminderText(cell) };
    }).filter(Boolean);
  }

  function init() {
    checkNow();
    window.setInterval(checkNow, CHECK_EVERY_MS);
  }

  window.PLANIFY_REMINDERS = { checkNow: checkNow, today: todaySchedule };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
