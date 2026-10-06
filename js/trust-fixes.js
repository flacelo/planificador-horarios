(function () {
  "use strict";

  var LEGACY_DASHBOARDS = [
    "#dashboard-overlay-v674",
    "#dashboard-overlay-v673",
    "#dashboard-overlay-v672",
    "#dashboard-view-body-v671",
    "#dashboard-view"
  ];
  var previousBodyOverflow = "";
  var previousHtmlOverflow = "";
  var dashboardReturnFocus = null;
  var dashboardSelectedWeekStart = null;
  var tutorialStep = 0;

  if (!document.querySelector("link[data-planify-follow-up]")) {
    var followUpStyles = document.createElement("link");
    followUpStyles.rel = "stylesheet";
    followUpStyles.href = "css/ux-follow-up.css?v=1";
    followUpStyles.dataset.planifyFollowUp = "true";
    document.head.appendChild(followUpStyles);
  }

  var TUTORIAL_STEPS = [
    { icon: "👋", title: "Vuelve a esta guía cuando quieras", text: "El tutorial está disponible desde el encabezado. Cada paso señala un control concreto de PLANIFY.", target: "#tutorial-btn", where: "Botón 📖 Tutorial, en el encabezado." },
    { icon: "🗓️", title: "Abre tu semana", text: "Toca Semanal en la barra inferior. Allí puedes revisar los días y escribir una actividad directamente en una celda.", target: ".bottom-nav [data-tab='semanal']", where: "Semanal, en la barra fija inferior." },
    { icon: "✍️", title: "Escribe en el horario", text: "En la tabla semanal, pulsa una celda y escribe. Para cambiar el texto, vuelve a tocarlo; no necesitas abrir una ventana de edición.", target: "#tabla tbody td", where: "Cualquier celda de actividad dentro de la cuadrícula semanal." },
    { icon: "📝", title: "Organiza también tu día", text: "Diario/Notas está en la misma barra inferior. Toca ese botón para escribir tus notas y revisar tu día.", target: ".bottom-nav [data-tab='diario']", where: "Diario/Notas, en la barra fija inferior." },
    { icon: "⚙️", title: "Ajustes y exportación", text: "Abre el engranaje para entrar al Panel de control. En la pestaña Ajustes encontrarás las opciones para descargar tu horario.", target: "#cloud-btn", where: "Botón ⚙️ flotante del Panel de control." }
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function removeLegacyDashboards() {
    document.querySelectorAll(LEGACY_DASHBOARDS.join(",")).forEach(function (node) {
      node.remove();
    });
  }

  function isMeaningfulCell(cell) {
    if (!cell || typeof cell !== "object") return false;
    var text = String(cell.t || cell.texto || cell.title || "").trim();
    return Boolean(text && text !== "—" && text !== "-");
  }

  function readSchedule() {
    var keys = ["horario_data_semanal", "horario_datos", "horario_completo"];
    for (var i = 0; i < keys.length; i += 1) {
      try {
        var parsed = JSON.parse(localStorage.getItem(keys[i]) || "null");
        if (parsed && Array.isArray(parsed.filas)) {
          return { dias: Array.isArray(parsed.dias) ? parsed.dias : [], filas: parsed.filas };
        }
      } catch (error) {
        console.warn("PLANIFY: no se pudo leer " + keys[i], error);
      }
    }
    return { dias: [], filas: [] };
  }

  function timeToMinutes(value) {
    var match = String(value || "").match(/(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  function rowDurationHours(rows, index, cell) {
    var scheduleTime = window.PLANIFY_SCHEDULE_TIME;
    if (scheduleTime && typeof scheduleTime.activityInterval === "function") {
      var actual = scheduleTime.activityInterval(rows, index, cell, 60);
      if (actual.ok) return actual.durationMinutes / 60;
    }
    var label = String(rows[index] && rows[index].hora || "");
    var times = label.match(/\d{1,2}:\d{2}/g) || [];
    var start = timeToMinutes(times[0]);
    var end = timeToMinutes(times[1]);
    if (start != null && end != null) {
      if (end <= start) end += 24 * 60;
      return Math.max(0.25, (end - start) / 60) * Math.max(1, Number(cell.rowspan) || 1);
    }
    var nextStart = timeToMinutes(rows[index + 1] && rows[index + 1].hora);
    if (start != null && nextStart != null) {
      if (nextStart <= start) nextStart += 24 * 60;
      return Math.max(0.25, (nextStart - start) / 60) * Math.max(1, Number(cell.rowspan) || 1);
    }
    return Math.max(1, Number(cell.rowspan) || 1);
  }

  function classifyCell(cell) {
    var raw = (String(cell.c || "") + " " + String(cell.t || cell.texto || "")).toLowerCase();
    if (/estudi|clase|univers|laborat|proyect|trabaj|enseñ|curso|reuni|oficina/.test(raw)) return "Estudio / Trabajo";
    if (/ejerc|salud|deport|gym|entren|médic|medic|fisi/.test(raw)) return "Salud / Ejercicio";
    if (/comida|almuerzo|cena|desay|aliment|cocina/.test(raw)) return "Alimentación";
    if (/dorm|sueño|libre|descans|ocio|amig|desconex/.test(raw)) return "Descanso / Vida personal";
    if (/rutina|aseo|ducha|medita|orden|hogar/.test(raw)) return "Rutina / Cuidado";
    return "Otros";
  }

  function calculateMetrics(weekStart) {
    var schedule = readSchedule();
    var byDay = Array.from({ length: Math.max(7, schedule.dias.length || 0) }, function () { return 0; });
    var completedByDay = Array.from({ length: Math.max(7, schedule.dias.length || 0) }, function () { return 0; });
    var history = window.PLANIFY_COMPLETION_HISTORY;
    var dated = history && typeof history.weekStats === "function" ? history.weekStats(schedule, weekStart) : null;
    var categories = {};
    var total = 0;
    var completed = 0;
    var hours = 0;

    schedule.filas.forEach(function (row, rowIndex) {
      var cells = Array.isArray(row.celdas) ? row.celdas : [];
      cells.forEach(function (cell, dayIndex) {
        if (!isMeaningfulCell(cell)) return;
        total += 1;
        byDay[dayIndex] = (byDay[dayIndex] || 0) + 1;
        var duration = rowDurationHours(schedule.filas, rowIndex, cell);
        hours += duration;
        var category = classifyCell(cell);
        categories[category] = (categories[category] || 0) + duration;
      });
    });

    var plannedDayCount = byDay.slice(0, 7).filter(function (count) { return count > 0; }).length;
    var dominant = "Sin datos";
    var dominantHours = 0;
    Object.keys(categories).forEach(function (name) {
      if (categories[name] > dominantHours) {
        dominant = name;
        dominantHours = categories[name];
      }
    });

    if (dated) {
      completed = dated.completed;
      byDay = dated.trackedByDay.slice();
      completedByDay = dated.completedByDay.slice();
    }
    var daysCompleted = byDay.reduce(function (count, dayTotal, index) {
      return count + (dayTotal > 0 && completedByDay[index] === dayTotal ? 1 : 0);
    }, 0);
    var areaCount = Object.keys(categories).filter(function (name) { return categories[name] > 0; }).length;
    return {
      total: total,
      completed: completed,
      percent: dated ? dated.percent : 0,
      trackedTotal: dated ? dated.trackedTotal : 0,
      hours: hours,
      byDay: byDay.slice(0, 7),
      completedByDay: completedByDay.slice(0, 7),
      daysCompleted: daysCompleted,
      recordedDayCount: dated ? dated.recordedDayCount : 0,
      hasHistory: Boolean(dated && dated.hasHistory),
      weekStart: dated ? dated.weekStart : weekStart || "",
      datesByDay: dated ? dated.datesByDay : [],
      recordedByDay: dated ? dated.recordedByDay : [],
      plannedDayCount: plannedDayCount,
      areaCount: areaCount,
      categories: categories,
      dominant: dominant,
      dominantPercent: hours ? Math.round(dominantHours * 100 / hours) : 0
    };
  }

  function formatHours(hours) {
    return hours ? (Math.round(hours * 10) / 10).toLocaleString("es-PE") + " h" : "0 h";
  }

  function readFocusStats() {
    try {
      var stored = JSON.parse(localStorage.getItem("planify_focus_session_v1") || "null") || {};
      return {
        completedMinutes: Math.max(0, Number(stored.completedMinutes) || 0),
        completedSessions: Math.max(0, Number(stored.completedSessions) || 0)
      };
    } catch (error) {
      return { completedMinutes: 0, completedSessions: 0 };
    }
  }

  function formatFocusMinutes(minutes) {
    if (!minutes) return "0 min";
    if (minutes < 60) return minutes + " min";
    var hours = Math.floor(minutes / 60);
    var remainder = minutes % 60;
    return hours + " h" + (remainder ? " " + remainder + " min" : "");
  }

  function dashboardLeadMarkup(metrics) {
    var message = !metrics.hasHistory ? "Empieza a registrar cómo te fue esta semana." :
      metrics.percent === 100 ? "Has marcado todos los bloques de tu horario." :
      metrics.percent >= 50 ? "Ya marcaste más de la mitad de tu horario." :
      metrics.percent > 0 ? "Cada bloque marcado cuenta. Sigue a tu ritmo." :
      "Tu horario está preparado. Empieza por un bloque.";
    var progressText = metrics.hasHistory ? metrics.completed + " de " + metrics.trackedTotal + " bloques marcados en fechas registradas" :
      "Aún no hay marcas para estas fechas";
    return '<section class="dashboard-calm-lead" aria-label="Avance del horario semanal"><div class="dashboard-calm-lead-copy">' +
      '<span class="dashboard-calm-kicker">CUMPLIMIENTO DE ESTA SEMANA</span><h3>' + escapeHtml(message) + '</h3>' +
      '<p>' + escapeHtml(progressText) + '</p>' +
      '<div class="dashboard-calm-progress" role="progressbar" aria-label="Bloques marcados en el horario" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + metrics.percent + '"><span style="width:' + metrics.percent + '%"></span></div>' +
      '<small class="dashboard-calm-history-note">' + (metrics.hasHistory ? "El avance corresponde solo a las fechas registradas; los datos anteriores no se inventaron." : "Las marcas antiguas no tenían una fecha asociada, así que no cuentan para este periodo.") + '</small></div>' +
      '<div class="dashboard-calm-percent"><strong>' + (metrics.hasHistory ? metrics.percent + "%" : "—") + '</strong><span>' + (metrics.hasHistory ? "de los bloques registrados" : "sin datos para estas fechas") + '</span></div></section>';
  }

  function dashboardCard(label, value, note, color) {
    return '<article class="trust-metric" style="--metric-color:' + color + '">' +
      '<span class="trust-metric-label">' + escapeHtml(label) + '</span>' +
      '<strong>' + escapeHtml(value) + '</strong><small>' + escapeHtml(note) + '</small></article>';
  }

  function barsMarkup(values, completedValues, dates, recordedDays) {
    var labels = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
    var max = Math.max.apply(Math, values.concat([1]));
    return labels.map(function (label, index) {
      var count = values[index] || 0;
      var completed = Math.min(count, completedValues[index] || 0);
      var height = count ? Math.max(12, Math.round(count * 100 / max)) : 3;
      var completion = count ? Math.round(completed * 100 / count) : 0;
      var date = Array.isArray(dates) ? dates[index] : "";
      var recorded = Array.isArray(recordedDays) && recordedDays[index];
      return '<div class="trust-bar-column" role="img" aria-label="' + label + (date ? " " + date : "") + (recorded ? ': ' + completed + ' de ' + count + ' bloques registrados completados' : ': sin registro') + '" title="' + (recorded ? completed + ' de ' + count + ' bloques completados' : 'Sin registro para esta fecha') + '">' +
        '<span class="trust-bar-value">' + (recorded ? completed + '/' + count : "—") + '</span>' +
        '<span class="trust-bar" style="height:' + height + '%"><i class="trust-bar-completed" style="height:' + completion + '%"></i></span>' +
        '<span class="trust-bar-label">' + label + '</span></div>';
    }).join("");
  }

  function categoriesMarkup(metrics) {
    var palette = ["#38bdf8", "#a855f7", "#4ade80", "#facc15", "#fb7185", "#94a3b8"];
    var entries = Object.keys(metrics.categories)
      .map(function (name) { return [name, metrics.categories[name]]; })
      .sort(function (a, b) { return b[1] - a[1]; });
    if (!entries.length) return '<div class="trust-empty-small">Todavía no hay áreas para comparar.</div>';
    return entries.map(function (entry, index) {
      var percent = metrics.hours ? Math.round(entry[1] * 100 / metrics.hours) : 0;
      return '<div class="trust-category"><div><span>' + escapeHtml(entry[0]) + '</span><strong>' + percent + '%</strong></div>' +
        '<span class="trust-category-track"><i style="width:' + percent + '%;background:' + palette[index % palette.length] + '"></i></span></div>';
    }).join("");
  }

  function dashboardRecommendations(metrics, profile, focusStats) {
    var ideas = [];
    if (!metrics.total) ideas.push(["🌱", "Crea tu primera semana", "Elige una de las rutas guiadas y obtendrás una base que luego podrás editar.", "start"]);
    else if (!metrics.hasHistory) ideas.push(["🎯", "Empieza a registrar tu avance", "Marca cada actividad al terminarla. PLANIFY la guardará en la fecha de la semana que estés planificando.", "change"]);
    else if (!metrics.completed) ideas.push(["🎯", "Empieza por un bloque", "Tu horario está listo. Elige un bloque para comenzar y ajústalo si no encaja con tu día.", "change"]);
    else if (metrics.percent < 35) ideas.push(["🎯", "Revisa lo que queda pendiente", "Compara tu horario con la semana que realmente tuviste y ajusta los bloques que no encajaron.", "change"]);
    else if (metrics.percent < 75) ideas.push(["↗", "Protege lo que ya funciona", "Hay avance real. Conserva tus mejores días y mueve solo lo que suele quedar pendiente.", "change"]);
    else ideas.push(["✨", "Tu sistema está funcionando", "Mantén la estructura y revisa una sola mejora para la próxima semana.", "change"]);
    if (metrics.areaCount < 3 && metrics.total) ideas.push(["⚖️", "Revisa el equilibrio", "Tu horario se concentra en pocas áreas. Decide si quieres proteger descanso, alimentación o movimiento.", "preferences"]);
    if (profile.sleepChallenge && profile.sleepChallenge !== "none") ideas.push(["🌙", "Cuida el cierre del día", "Reserva una rutina tranquila y busca orientación profesional si el problema de sueño persiste.", "preferences"]);
    if (profile.foodProfile && profile.foodProfile !== "none") ideas.push(["🍽️", "Hazlo personal y observable", "Conserva horarios regulares y registra qué alimentos toleras; evita cambiar una dieta clínica sin orientación profesional.", "preferences"]);
    if (Array.isArray(profile.ventures) && profile.ventures.length) ideas.push(["🚀", "Dale un siguiente paso a tu emprendimiento", "Reserva un avance concreto para " + (profile.ventures[0].name || "tu emprendimiento") + ", no solo tiempo genérico.", "change"]);
    if (metrics.total && !focusStats.completedSessions) ideas.push(["⏱️", "Prueba una sesión de enfoque", "Elige un bloque pequeño y trabaja sin intentar resolver toda la semana de una vez.", "focus"]);
    return ideas.slice(0, 3);
  }

  function recommendationMarkup(ideas) {
    var labels = { start: "Crear horario", change: "Pedir un cambio", focus: "Iniciar enfoque", preferences: "Revisar perfil" };
    return ideas.map(function (idea) {
      return '<article class="dashboard-calm-idea"><span aria-hidden="true">' + idea[0] + '</span><div><strong>' + escapeHtml(idea[1]) + '</strong><p>' + escapeHtml(idea[2]) + '</p></div><button type="button" data-dashboard-action="' + idea[3] + '">' + labels[idea[3]] + '</button></article>';
    }).join("");
  }

  function dashboardWeekLabel(weekStart) {
    if (!weekStart || !window.PLANIFY_COMPLETION_HISTORY) return "Esta semana";
    var endKey = window.PLANIFY_COMPLETION_HISTORY.addDays(weekStart, 6);
    var start = new Date(weekStart + "T12:00:00");
    var end = new Date(endKey + "T12:00:00");
    var formatter = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "America/Lima" });
    return "Semana del " + formatter.format(start) + " al " + formatter.format(end);
  }

  function openDashboard() {
    var activeElement = document.activeElement;
    dashboardReturnFocus = activeElement && activeElement.closest && activeElement.closest("#planify-dashboard-safe") ? dashboardReturnFocus : activeElement;
    removeLegacyDashboards();
    var existing = document.getElementById("planify-dashboard-safe");
    if (existing) existing.remove();
    var history = window.PLANIFY_COMPLETION_HISTORY;
    var weekStart = dashboardSelectedWeekStart || (history ? history.getWeekStart() : "");
    if (!dashboardSelectedWeekStart) dashboardSelectedWeekStart = weekStart;
    var metrics = calculateMetrics(weekStart);
    var profile = readPersonalProfile();
    var focusStats = readFocusStats();
    var name = String(profile.name || localStorage.getItem("planify_nombre") || "").trim().split(/\s+/)[0];
    var overlay = document.createElement("section");
    overlay.id = "planify-dashboard-safe";
    overlay.className = "trust-dashboard planify-dashboard-v2";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Dashboard de progreso");
    var ideas = dashboardRecommendations(metrics, profile, focusStats);
    var content = metrics.total ?
      dashboardLeadMarkup(metrics) +
      '<div class="dashboard-calm-stats">' +
      dashboardCard("Tiempo planificado", formatHours(metrics.hours), "En los bloques de tu horario", "#76c9ad") +
      dashboardCard("Días con plan", metrics.plannedDayCount + " / 7", "Días con bloques", "#82a9e8") +
      dashboardCard("Enfoque realizado", formatFocusMinutes(focusStats.completedMinutes), focusStats.completedSessions + (focusStats.completedSessions === 1 ? " sesión terminada" : " sesiones terminadas"), "#d7a8dc") +
      '</div>' +
      '<section class="dashboard-calm-section"><div class="dashboard-calm-section-heading"><span class="dashboard-calm-kicker">MIRA TU SEMANA</span><h3>Cómo está distribuido tu plan</h3></div>' +
      '<div class="trust-dashboard-grid"><article class="trust-chart"><h4>Bloques por día</h4><p class="dashboard-calm-chart-note">' + (metrics.hasHistory ? "Solo cuentan los días con seguimiento; los demás aparecen sin registro." : "Las marcas antiguas no tenían una fecha asociada.") + '</p><div class="trust-bars" role="group" aria-label="Bloques marcados por día de la semana">' + barsMarkup(metrics.byDay, metrics.completedByDay, metrics.datesByDay, metrics.recordedByDay) + '</div><div class="dashboard-calm-chart-legend"><span><i class="is-complete"></i>Hechos en esa fecha</span><span>— Sin registro</span></div></article>' +
      '<article class="trust-chart"><h4>Tiempo por área</h4><div class="trust-categories">' + categoriesMarkup(metrics) + '</div></article></div></section>' +
      '<section class="dashboard-calm-next"><div class="dashboard-calm-section-heading"><span class="dashboard-calm-kicker">UN PASO A LA VEZ</span><h3>Tu siguiente paso</h3></div>' + recommendationMarkup(ideas.slice(0, 1)) +
      (ideas.length > 1 ? '<details class="dashboard-calm-more"><summary>Ver otras sugerencias</summary><div>' + recommendationMarkup(ideas.slice(1)) + '</div></details>' : "") + '</section>' :
      '<section class="dashboard-calm-empty"><span class="dashboard-calm-empty-icon" aria-hidden="true">✦</span><div><span class="dashboard-calm-kicker">TU PUNTO DE PARTIDA</span><h3>Primero armemos una semana que se parezca a ti.</h3><p>Cuando tengas actividades, aquí verás tus avances y una sugerencia clara para ajustar tu plan.</p><button type="button" data-dashboard-action="start">Crear mi horario</button>' +
      (focusStats.completedSessions ? '<small>Ya completaste ' + focusStats.completedSessions + (focusStats.completedSessions === 1 ? ' sesión' : ' sesiones') + ' de enfoque.</small>' : "") + '</div></section>';
    overlay.innerHTML = '<div class="trust-dashboard-inner"><header class="trust-dashboard-header"><div><span class="trust-dashboard-eyebrow">TU PROGRESO, SIN COMPLICACIONES</span><h2>' + escapeHtml(name ? "Tu progreso, " + name : "Tu progreso") + '</h2>' +
      '<p>Tu cumplimiento se guarda por fecha; la distribución de horas refleja el horario que tienes ahora.</p></div><button type="button" id="trust-dashboard-close">← Volver al planificador</button></header>' +
      '<nav class="dashboard-view-nav" aria-label="Vistas del planificador"><button type="button" data-dashboard-view="diario">📝 <span>Diario</span></button><button type="button" data-dashboard-view="semanal">📅 <span>Semanal</span></button><button type="button" data-dashboard-view="mensual">📆 <span>Mensual</span></button><button type="button" data-dashboard-view="anual">🗓️ <span>Anual</span></button><button type="button" aria-current="page">📊 <span>Dashboard</span></button></nav>' +
      (metrics.total ? '<nav class="dashboard-week-nav" aria-label="Elegir semana del Dashboard"><button type="button" data-dashboard-week-shift="-7" aria-label="Semana anterior">←</button><strong>' + escapeHtml(dashboardWeekLabel(metrics.weekStart)) + '</strong><button type="button" data-dashboard-week-shift="7" aria-label="Semana siguiente">→</button></nav>' : "") +
      content + '<p class="dashboard-calm-disclaimer">PLANIFY muestra orientación general. Para decisiones de salud, consulta a un profesional.</p></div>';
    document.body.appendChild(overlay);
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.classList.add("planify-dashboard-open");
    document.getElementById("trust-dashboard-close").focus();
  }

  window.__PLANIFY_REFRESH_DASHBOARD = function () {
    if (document.getElementById("planify-dashboard-safe")) openDashboard();
  };

  function closeDashboard() {
    var overlay = document.getElementById("planify-dashboard-safe");
    if (overlay) overlay.remove();
    removeLegacyDashboards();
    document.body.style.overflow = previousBodyOverflow;
    document.documentElement.style.overflow = previousHtmlOverflow;
    document.documentElement.classList.remove("planify-dashboard-open");
    dashboardSelectedWeekStart = null;
    if (dashboardReturnFocus && document.contains(dashboardReturnFocus) && typeof dashboardReturnFocus.focus === "function") dashboardReturnFocus.focus();
    dashboardReturnFocus = null;
  }

  function renderTutorial() {
    var step = TUTORIAL_STEPS[tutorialStep];
    var overlay = document.getElementById("planify-tutorial-safe");
    if (!overlay) return;
    document.querySelectorAll(".trust-tutorial-highlight").forEach(function (target) { target.classList.remove("trust-tutorial-highlight"); });
    if (tutorialStep === 2 && typeof window.cambiarTab === "function") window.cambiarTab("semanal");
    var target = null;
    try { target = document.querySelector(step.target); } catch (error) {}
    if (target && target.getClientRects().length) {
      target.classList.add("trust-tutorial-highlight");
      var bounds = target.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > window.innerHeight) target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    overlay.querySelector(".trust-tutorial-icon").textContent = step.icon;
    overlay.querySelector(".trust-tutorial-title").textContent = step.title;
    overlay.querySelector(".trust-tutorial-text").textContent = step.text;
    overlay.querySelector(".trust-tutorial-where strong").textContent = step.where;
    overlay.querySelector(".trust-tutorial-counter").textContent = (tutorialStep + 1) + " de " + TUTORIAL_STEPS.length;
    overlay.querySelector(".trust-tutorial-progress i").style.width = ((tutorialStep + 1) * 100 / TUTORIAL_STEPS.length) + "%";
    overlay.querySelector("#trust-tutorial-back").hidden = tutorialStep === 0;
    overlay.querySelector("#trust-tutorial-next").textContent = tutorialStep === TUTORIAL_STEPS.length - 1 ? "¡Listo, empezar!" : "Siguiente →";
  }

  function openTutorial() {
    var old = document.getElementById("planify-tutorial-safe");
    if (old) old.remove();
    tutorialStep = 0;
    var overlay = document.createElement("section");
    overlay.id = "planify-tutorial-safe";
    overlay.className = "trust-tutorial-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Tutorial de PLANIFY");
    overlay.innerHTML = '<div class="trust-tutorial-card"><button type="button" id="trust-tutorial-close" class="trust-tutorial-close" aria-label="Cerrar tutorial">×</button>' +
      '<div class="trust-tutorial-counter"></div><div class="trust-tutorial-progress"><i></i></div><div class="trust-tutorial-icon"></div>' +
      '<h2 class="trust-tutorial-title"></h2><p class="trust-tutorial-text"></p><div class="trust-tutorial-where"><span>📍 Dónde pulsar</span><strong></strong></div><footer><button type="button" id="trust-tutorial-back" class="trust-secondary">← Atrás</button>' +
      '<button type="button" id="trust-tutorial-next" class="trust-primary">Siguiente →</button></footer></div>';
    document.body.appendChild(overlay);
    renderTutorial();
    document.getElementById("trust-tutorial-next").focus();
  }

  function closeTutorial() {
    var overlay = document.getElementById("planify-tutorial-safe");
    if (overlay) overlay.remove();
    document.querySelectorAll(".trust-tutorial-highlight").forEach(function (target) { target.classList.remove("trust-tutorial-highlight"); });
  }

  function isDashboardTrigger(target) {
    var trigger = target.closest("button,a,[role='button']");
    if (!trigger || trigger.closest("#planify-dashboard-safe")) return false;
    var id = String(trigger.id || "").toLowerCase();
    var text = String(trigger.textContent || "").trim().toLowerCase();
    return id === "btn-sidebar-dashboard" || id === "btn-view-dashboard" || text === "dashboard" || text === "📊 dashboard" || text === "ver dashboard";
  }

  function readPersonalProfile() {
    try { return JSON.parse(localStorage.getItem("planify_personalizacion_v1") || "null") || {}; }
    catch (error) { return {}; }
  }

  function profileArea(profile) {
    if (profile.specialtyOther) return profile.specialtyOther;
    var labels = {
      industrial: "Ingeniería Industrial", systems: "Sistemas y Software", civil: "Ingeniería Civil", mining: "Ingeniería de Minas",
      environmental: "Ingeniería Ambiental", mechanical: "Ingeniería Mecánica", electrical: "Electricidad y Electrónica", chemical: "Ingeniería Química",
      medicine: "Medicina", nursing: "Enfermería", nutrition: "Nutrición", psychology: "Psicología", dentistry: "Odontología", therapy: "Rehabilitación",
      administration: "Administración", accounting: "Contabilidad", economics: "Economía y Finanzas", marketing: "Marketing y Ventas"
    };
    return labels[profile.specialty] || profile.careerOther || profile.jobRole || "tu área principal";
  }

  function personalSuggestions(profile, horizon) {
    var area = profileArea(profile);
    var studies = profile.occupation === "study" || profile.occupation === "both";
    var works = profile.occupation === "work" || profile.occupation === "both" || profile.occupation === "entrepreneur";
    var list = horizon === "annual" ? [
      "Elige un resultado importante para cada trimestre y deja semanas de recuperación.",
      "Reserva una revisión al final de cada mes para decidir qué mantener, mover o soltar.",
      "Separa con anticipación vacaciones, evaluaciones, entregas o temporadas de mayor carga."
    ] : [
      "Elige una meta verificable para este mes y divídela en avances semanales.",
      "Aparta una semana más ligera para retrasos, descanso o ajustes.",
      "Cierra el mes revisando qué actividades sí te acercaron a tu objetivo."
    ];
    if (studies) list[0] = horizon === "annual" ? "Distribuye cursos, evaluaciones y un proyecto de " + area + " por ciclos o trimestres." : "Elige el curso o proyecto de " + area + " que tendrá prioridad este mes.";
    if (works) list[1] = horizon === "annual" ? "Marca entregas, campañas o temporadas fuertes de trabajo antes de llenar el resto del año." : "Reserva hitos semanales para tu trabajo" + (profile.jobRole ? " como " + String(profile.jobRole).slice(0, 55) : "") + ", no solo fechas finales.";
    if (profile.foodProfile && profile.foodProfile !== "none") list.push("Incluye un registro personal de comidas y tolerancia; conserva siempre las indicaciones de tu profesional.");
    if (profile.sleepChallenge && profile.sleepChallenge !== "none") list.push("Revisa cada semana si tu rutina nocturna está dejando suficiente margen real para descansar.");
    return list.slice(0, 4);
  }

  function guidanceMarkup(profile, horizon) {
    var name = String(profile.name || localStorage.getItem("planify_nombre") || "").trim().split(/\s+/)[0];
    var title = horizon === "annual" ? "Tu brújula para el año" : "Ideas para que este mes se parezca más a ti";
    return '<section class="trust-personal-guidance trust-personal-' + horizon + '" data-planify-guidance="' + horizon + '"><div class="trust-guidance-heading"><span>' + (horizon === "annual" ? "◇" : "○") + '</span><div><strong>' + escapeHtml(name ? name + ", " + title.charAt(0).toLowerCase() + title.slice(1) : title) + '</strong><small>Sugerencias basadas en tu ocupación y objetivos; tú decides cuáles usar.</small></div></div><ul>' + personalSuggestions(profile, horizon).map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join("") + '</ul></section>';
  }

  function ensurePersonalGuidance() {
    var profile = readPersonalProfile();
    var daily = document.querySelector("#view-diario");
    if (daily && !daily.querySelector('[data-planify-guidance="daily"]')) {
      var name = String(profile.name || localStorage.getItem("planify_nombre") || "").trim().split(/\s+/)[0];
      daily.insertAdjacentHTML("afterbegin", '<section class="trust-friendly-guide" data-planify-guidance="daily"><div><span>☀</span><div><strong>' + escapeHtml(name ? "Hola, " + name + ". Este espacio es tuyo." : "Este espacio es tuyo") + '</strong><small>Empieza por una sola cosa. PLANIFY te acompaña sin obligarte a llenar todo.</small></div></div><div><button type="button" data-trust-action="goal">Anotar mi meta</button><button type="button" data-trust-action="change">Pedir un cambio</button><button type="button" data-trust-action="restart">Revisar mis preferencias</button></div></section>');
    }
    var monthly = document.querySelector("#view-mensual");
    if (monthly && !monthly.querySelector('[data-planify-guidance="monthly"]')) monthly.insertAdjacentHTML("afterbegin", guidanceMarkup(profile, "monthly"));
    var annual = document.querySelector("#vista-anual-metas");
    if (annual && !document.querySelector('[data-planify-guidance="annual"]')) annual.insertAdjacentHTML("afterbegin", guidanceMarkup(profile, "annual"));
  }

  function activatePanelTab(tabId) {
    var panel = document.getElementById("side-panel");
    if (!panel) return;
    panel.querySelectorAll(".panel-tabs .tab-btn").forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-tab") === tabId);
    });
    panel.querySelectorAll(".tab-content").forEach(function (content) {
      var active = content.id === tabId;
      content.classList.toggle("active", active);
      content.style.display = active ? "block" : "none";
    });
  }

  function openPanel(tabId) {
    var panel = document.getElementById("side-panel");
    var opener = document.getElementById("cloud-btn");
    if (!panel) return;
    if (!panel.classList.contains("open") && opener) opener.click();
    window.setTimeout(function () { activatePanelTab(tabId || "tab-perfil"); }, 30);
  }

  function ensurePanelExperience() {
    var panel = document.getElementById("side-panel");
    if (!panel) return;
    var header = panel.querySelector(".sp-header");
    if (header && !header.querySelector(".trust-panel-close")) header.insertAdjacentHTML("beforeend", '<button type="button" class="trust-panel-close" data-panel-action="close" aria-label="Cerrar panel">×</button>');
    if (!panel.querySelector(".trust-panel-intro")) {
      var tabs = panel.querySelector(".panel-tabs");
      if (tabs) tabs.insertAdjacentHTML("beforebegin", '<section class="trust-panel-intro"><span>PERSONALIZA SIN PERDERTE</span><strong>Tu espacio de control</strong><p>Empieza por tu perfil o ve directo a la herramienta que necesitas.</p><div><button type="button" data-panel-jump="tab-perfil">👤 Mis datos</button><button type="button" data-panel-jump="tab-personalizar">🗓️ Horario y vistas</button><button type="button" data-panel-jump="tab-ajustes">📤 Exportar</button></div></section>');
    }
    if (!panel.querySelector(".tab-content.active")) activatePanelTab("tab-perfil");
  }

  function ensureDashboardNav() {
    document.querySelectorAll(".bottom-nav").forEach(function (nav) {
      if (nav.querySelector('[data-tab="dashboard"]')) return;
      nav.insertAdjacentHTML("beforeend", '<button type="button" class="tab-btn trust-dashboard-nav" data-tab="dashboard" aria-label="Ver mi avance">📊 <span>Avance</span></button>');
    });
  }

  function ensureStartHub() {
    if (document.querySelector(".trust-start-hub")) return;
    var anchor = document.querySelector(".main-card-container");
    if (!anchor || !anchor.parentNode) return;
    var completed = localStorage.getItem("planify_bienvenida_estado") === "completada";
    var hub = document.createElement("section");
    hub.className = "trust-start-hub" + (completed ? " is-compact" : "");
    hub.innerHTML = '<div class="trust-start-heading"><div><span>EMPIEZA COMO PREFIERAS</span><h2>' + (completed ? "¿Qué quieres hacer ahora?" : "Tu horario, con el nivel de ayuda que tú elijas") + '</h2><p>Elige una forma de comenzar. Después podrás editar tu horario y explorar las demás vistas.</p></div>' + (completed ? '<button type="button" data-start-action="toggle">Ver las opciones</button>' : '') + '</div><div class="trust-start-options"><button type="button" data-start-action="manual"><span>✍️</span><strong>Planificar por mi cuenta</strong><small>Empieza con una tabla vacía y añade tus actividades.</small><em>Control total</em></button><button type="button" class="is-recommended" data-start-action="quick"><b>RECOMENDADO</b><span>🧩</span><strong>Crear mi horario rápido</strong><small>Dinos una actividad, tus días y horas. Luego podrás editar la propuesta.</small><em>Solo lo esencial</em></button><button type="button" data-start-action="detailed"><span>✨</span><strong>Personalizar a fondo</strong><small>Incluye compromisos, proyectos, energía y bienestar.</small><em>Más preguntas</em></button></div><div class="trust-start-destinations"><span>Tu espacio incluye</span><b>📝 Diario</b><b>📅 Semanal</b><b>📆 Mensual</b><b>🗓️ Anual</b><b>📊 Dashboard</b></div>';
    anchor.parentNode.insertBefore(hub, anchor);
  }

  function ensureFocusEntry() {
    if (document.getElementById("planify-focus-open")) return;
    var actions = document.querySelector(".header-actions");
    if (!actions) return;
    var button = document.createElement("button");
    button.type = "button";
    button.id = "planify-focus-open";
    button.className = "trust-focus-entry";
    button.innerHTML = "⏱️ <span>Enfoque</span>";
    button.setAttribute("aria-label", "Abrir temporizador de enfoque");
    actions.insertBefore(button, actions.firstChild);
  }

  function loadFocusExperience() {
    if (!document.getElementById("planify-focus-style")) {
      var style = document.createElement("link");
      style.id = "planify-focus-style";
      style.rel = "stylesheet";
      style.href = "css/focus-session.css?v=2";
      document.head.appendChild(style);
    }
    if (!document.getElementById("planify-focus-task-style")) {
      var taskStyle = document.createElement("link");
      taskStyle.id = "planify-focus-task-style";
      taskStyle.rel = "stylesheet";
      taskStyle.href = "css/focus-task.css?v=1";
      document.head.appendChild(taskStyle);
    }
    if (!document.getElementById("planify-focus-breath-style")) {
      var breathStyle = document.createElement("link");
      breathStyle.id = "planify-focus-breath-style";
      breathStyle.rel = "stylesheet";
      breathStyle.href = "css/focus-breath.css?v=1";
      document.head.appendChild(breathStyle);
    }
    if (!document.getElementById("planify-focus-script")) {
      function loadFocusSession() {
        if (document.getElementById("planify-focus-script")) return;
        var focusScript = document.createElement("script");
        focusScript.id = "planify-focus-script";
        focusScript.src = "js/focus-session.js?v=4";
        focusScript.async = false;
        document.head.appendChild(focusScript);
      }
      if (window.PLANIFY_FOCUS_ACTIVITY_HISTORY) loadFocusSession();
      else {
        var historyScript = document.getElementById("planify-focus-activity-history-script") || document.createElement("script");
        historyScript.addEventListener("load", loadFocusSession, { once: true });
        historyScript.addEventListener("error", loadFocusSession, { once: true });
        if (!historyScript.id) {
          historyScript.id = "planify-focus-activity-history-script";
          historyScript.src = "js/focus-activity-history.js?v=1";
          historyScript.async = false;
          document.head.appendChild(historyScript);
        }
      }
    }
  }

  function loadReminderService() {
    if (document.getElementById("planify-reminder-script")) return;
    var script = document.createElement("script");
    script.id = "planify-reminder-script";
    script.src = "js/reminder-service.js?v=1";
    script.defer = true;
    document.head.appendChild(script);
  }

  function loadDayFlow() {
    if (!document.getElementById("planify-day-flow-style")) {
      var style = document.createElement("link");
      style.id = "planify-day-flow-style";
      style.rel = "stylesheet";
      style.href = "css/day-flow.css?v=1";
      document.head.appendChild(style);
    }
    if (!document.getElementById("planify-day-flow-script")) {
      var script = document.createElement("script");
      script.id = "planify-day-flow-script";
      script.src = "js/day-flow.js?v=4";
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  function loadCompletionHistory(onReady) {
    if (window.PLANIFY_COMPLETION_HISTORY) { if (onReady) onReady(); return; }
    var existing = document.getElementById("planify-completion-history-script");
    var script = existing || document.createElement("script");
    if (onReady) script.addEventListener("load", onReady, { once: true });
    if (!existing) {
      script.id = "planify-completion-history-script";
      script.src = "js/completion-history.js?v=3";
      script.async = false;
      script.onerror = function () { console.warn("PLANIFY: no se pudo cargar el historial por fecha."); };
      document.head.appendChild(script);
    }
  }

  function loadScheduleTime(onReady) {
    if (window.PLANIFY_SCHEDULE_TIME) { if (onReady) onReady(); return; }
    var existing = document.getElementById("planify-schedule-time-script");
    var script = existing || document.createElement("script");
    if (onReady) {
      script.addEventListener("load", onReady, { once: true });
      script.addEventListener("error", onReady, { once: true });
    }
    if (!existing) {
      script.id = "planify-schedule-time-script";
      script.src = "js/schedule-time.js?v=3";
      script.async = false;
      document.head.appendChild(script);
    }
  }

  function loadVariableDuration() {
    if (!document.getElementById("planify-variable-duration-style")) {
      var style = document.createElement("link");
      style.id = "planify-variable-duration-style";
      style.rel = "stylesheet";
      style.href = "css/variable-duration.css?v=1";
      document.head.appendChild(style);
    }
    if (document.getElementById("planify-variable-duration-script")) return;
    var script = document.createElement("script");
    script.id = "planify-variable-duration-script";
    script.src = "js/variable-duration.js?v=1";
    script.async = false;
    document.head.appendChild(script);
  }

  function loadDashboardPolish() {
    if (document.getElementById("planify-dashboard-polish")) return;
    var style = document.createElement("link");
    style.id = "planify-dashboard-polish";
    style.rel = "stylesheet";
    style.href = "css/dashboard-polish.css?v=1";
    document.head.appendChild(style);
  }

  function loadDashboardCalm() {
    if (document.getElementById("planify-dashboard-calm")) return;
    var style = document.createElement("link");
    style.id = "planify-dashboard-calm";
    style.rel = "stylesheet";
    style.href = "css/dashboard-calm.css?v=5";
    document.head.appendChild(style);
  }

  function loadInterfacePolish() {
    if (document.getElementById("planify-interface-polish")) return;
    var style = document.createElement("link");
    style.id = "planify-interface-polish";
    style.rel = "stylesheet";
    style.href = "css/interface-polish.css?v=2";
    document.head.appendChild(style);
  }

  function loadBrandExperience() {
    if (!document.getElementById("planify-brand-style")) {
      var style = document.createElement("link");
      style.id = "planify-brand-style";
      style.rel = "stylesheet";
      style.href = "css/brand-system.css?v=6";
      document.head.appendChild(style);
    }
    if (!document.getElementById("planify-brand-script")) {
      var script = document.createElement("script");
      script.id = "planify-brand-script";
      script.src = "js/brand-home.js?v=6";
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  function loadPanelRedesign() {
    if (!document.getElementById("planify-panel-redesign-style")) {
      var style = document.createElement("link");
      style.id = "planify-panel-redesign-style";
      style.rel = "stylesheet";
      style.href = "css/panel-redesign.css?v=15";
      document.head.appendChild(style);
    }
    if (!document.getElementById("planify-panel-redesign-script")) {
      var script = document.createElement("script");
      script.id = "planify-panel-redesign-script";
      script.src = "js/panel-redesign.js?v=11";
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  function loadWeeklyCalm() {
    if (!document.getElementById("planify-weekly-calm-style")) {
      var style = document.createElement("link");
      style.id = "planify-weekly-calm-style";
      style.rel = "stylesheet";
      style.href = "css/weekly-calm.css?v=10";
      document.head.appendChild(style);
    }
    if (!document.getElementById("planify-weekly-calm-script")) {
      var script = document.createElement("script");
      script.id = "planify-weekly-calm-script";
      script.src = "js/weekly-calm.js?v=8";
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  function loadMonthlyCalm() {
    if (!document.getElementById("planify-monthly-calm-style")) {
      var style = document.createElement("link");
      style.id = "planify-monthly-calm-style";
      style.rel = "stylesheet";
      style.href = "css/monthly-calm.css?v=8";
      document.head.appendChild(style);
    }
    if (!document.getElementById("planify-monthly-calm-script")) {
      var script = document.createElement("script");
      script.id = "planify-monthly-calm-script";
      script.src = "js/monthly-calm.js?v=2";
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  function loadAnnualCalm() {
    if (!document.getElementById("planify-annual-calm-style")) {
      var style = document.createElement("link");
      style.id = "planify-annual-calm-style";
      style.rel = "stylesheet";
      style.href = "css/annual-calm.css?v=1";
      document.head.appendChild(style);
    }
    if (!document.getElementById("planify-annual-calm-script")) {
      var script = document.createElement("script");
      script.id = "planify-annual-calm-script";
      script.src = "js/annual-calm.js?v=1";
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  function loadDailyCalm() {
    if (!document.getElementById("planify-daily-calm-style")) {
      var style = document.createElement("link");
      style.id = "planify-daily-calm-style";
      style.rel = "stylesheet";
      style.href = "css/daily-calm.css?v=2";
      document.head.appendChild(style);
    }
    if (!document.getElementById("planify-daily-calm-script")) {
      var script = document.createElement("script");
      script.id = "planify-daily-calm-script";
      script.src = "js/daily-calm.js?v=2";
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  function loadDailyPersistence() {
    if (document.getElementById("planify-daily-persistence-script")) return;
    var script = document.createElement("script");
    script.id = "planify-daily-persistence-script";
    script.src = "js/daily-persistence.js?v=1";
    script.defer = true;
    document.head.appendChild(script);
  }

  function loadDailyBackup() {
    if (document.getElementById("planify-daily-backup-script")) return;
    var script = document.createElement("script");
    script.id = "planify-daily-backup-script";
    script.src = "js/daily-backup.js?v=11";
    script.defer = true;
    document.head.appendChild(script);
  }

  function loadPwaExperience() {
    if (!document.getElementById("planify-pwa-style")) {
      var style = document.createElement("link");
      style.id = "planify-pwa-style";
      style.rel = "stylesheet";
      style.href = "css/pwa-experience.css?v=2";
      document.head.appendChild(style);
    }
    if (!document.getElementById("planify-pwa-script")) {
      var script = document.createElement("script");
      script.id = "planify-pwa-script";
      script.src = "js/pwa-experience.js?v=2";
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  function loadMobileCoach() {
    if (!document.getElementById("planify-mobile-coach-style")) {
      var style = document.createElement("link");
      style.id = "planify-mobile-coach-style";
      style.rel = "stylesheet";
      style.href = "css/mobile-coach.css?v=1";
      document.head.appendChild(style);
    }
    if (!document.getElementById("planify-mobile-coach-script")) {
      var script = document.createElement("script");
      script.id = "planify-mobile-coach-script";
      script.src = "js/mobile-coach.js?v=2";
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var startAction = target.closest("[data-start-action]");
    if (startAction) {
      event.preventDefault();
      var startName = startAction.getAttribute("data-start-action");
      if (startName === "toggle") {
        var startHub = startAction.closest(".trust-start-hub");
        if (startHub) startHub.classList.toggle("is-expanded");
        return;
      }
      if (window.PLANIFY_WELCOME && typeof window.PLANIFY_WELCOME.open === "function") window.PLANIFY_WELCOME.open(startName);
      else {
        var welcomeButton = document.getElementById("welcome-flow-open");
        if (welcomeButton) welcomeButton.click();
      }
      return;
    }
    var panelJump = target.closest("[data-panel-jump]");
    if (panelJump) { event.preventDefault(); activatePanelTab(panelJump.getAttribute("data-panel-jump")); return; }
    if (target.closest('[data-panel-action="close"]')) { event.preventDefault(); var panelOpener = document.getElementById("cloud-btn"); if (panelOpener) panelOpener.click(); return; }
    var dashboardView = target.closest("[data-dashboard-view]");
    if (dashboardView) {
      event.preventDefault();
      var viewName = dashboardView.getAttribute("data-dashboard-view");
      closeDashboard();
      var viewButton = document.querySelector('.bottom-nav [data-tab="' + viewName + '"]');
      if (viewButton) viewButton.click();
      return;
    }
    var dashboardWeekShift = target.closest("[data-dashboard-week-shift]");
    if (dashboardWeekShift) {
      event.preventDefault();
      var history = window.PLANIFY_COMPLETION_HISTORY;
      if (history) {
        dashboardSelectedWeekStart = history.addDays(dashboardSelectedWeekStart || history.getWeekStart(), Number(dashboardWeekShift.getAttribute("data-dashboard-week-shift")));
        openDashboard();
      }
      return;
    }
    var dashboardAction = target.closest("[data-dashboard-action]");
    if (dashboardAction) {
      event.preventDefault();
      var dashboardActionName = dashboardAction.getAttribute("data-dashboard-action");
      closeDashboard();
      if (dashboardActionName === "start" && window.PLANIFY_WELCOME) window.PLANIFY_WELCOME.open("guided");
      if (dashboardActionName === "change") {
        if (window.PLANIFY_WELCOME && typeof window.PLANIFY_WELCOME.requestChange === "function") window.PLANIFY_WELCOME.requestChange();
        else { var changeButton = document.getElementById("schedule-change-open"); if (changeButton) changeButton.click(); }
      }
      if (dashboardActionName === "focus" && window.PLANIFY_FOCUS && typeof window.PLANIFY_FOCUS.open === "function") window.PLANIFY_FOCUS.open();
      if (dashboardActionName === "preferences") openPanel("tab-perfil");
      return;
    }
    if (target.closest("#cloud-btn")) window.setTimeout(function () { ensurePanelExperience(); activatePanelTab("tab-perfil"); }, 60);
    if (isDashboardTrigger(target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openDashboard();
      return;
    }
    if (target.closest('#tutorial-btn,[data-action="open-tutorial"],.btn-tutorial')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openTutorial();
      return;
    }
    if (target.closest("#planify-focus-open")) {
      event.preventDefault();
      if (window.PLANIFY_FOCUS && typeof window.PLANIFY_FOCUS.open === "function") window.PLANIFY_FOCUS.open();
      return;
    }
    var trustAction = target.closest("[data-trust-action]");
    if (trustAction) {
      event.preventDefault();
      var actionName = trustAction.getAttribute("data-trust-action");
      if (actionName === "goal") {
        var goal = document.querySelector(".goals-section textarea,.goals-section input");
        if (goal) { goal.scrollIntoView({ behavior: "smooth", block: "center" }); goal.focus(); }
      }
      if (actionName === "change") {
        var changeButton = document.getElementById("schedule-change-open");
        if (changeButton) changeButton.click();
      }
      if (actionName === "restart") {
        var restartButton = document.getElementById("welcome-flow-open");
        if (restartButton) restartButton.click();
      }
      return;
    }
    if (target.closest("#trust-dashboard-close")) { event.preventDefault(); closeDashboard(); return; }
    if (target.closest("#trust-tutorial-close")) { event.preventDefault(); closeTutorial(); return; }
    if (target.closest("#trust-tutorial-back")) { event.preventDefault(); tutorialStep = Math.max(0, tutorialStep - 1); renderTutorial(); return; }
    if (target.closest("#trust-tutorial-next")) {
      event.preventDefault();
      if (tutorialStep >= TUTORIAL_STEPS.length - 1) closeTutorial();
      else { tutorialStep += 1; renderTutorial(); }
      return;
    }
    var tutorialOverlay = target.closest("#planify-tutorial-safe");
    if (tutorialOverlay && target === tutorialOverlay) closeTutorial();
  }, true);

  document.addEventListener("keydown", function (event) {
    var dashboard = document.getElementById("planify-dashboard-safe");
    if (dashboard && event.key === "Tab") {
      var focusable = Array.prototype.slice.call(dashboard.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex='-1'])"))
        .filter(function (element) {
          var closedDetails = element.closest("details:not([open])");
          return !element.hidden && element.getAttribute("aria-hidden") !== "true" && element.getClientRects().length > 0 && (!closedDetails || element.tagName === "SUMMARY");
        });
      if (focusable.length) {
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dashboard.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dashboard.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      } else {
        event.preventDefault();
        document.getElementById("trust-dashboard-close").focus();
      }
      return;
    }
    if (event.key !== "Escape") return;
    closeTutorial();
    closeDashboard();
  });

  function init() {
    document.documentElement.classList.add("planify-trust-ready");
    removeLegacyDashboards();
    if (!document.getElementById("welcome-flow-style")) {
      var welcomeStyle = document.createElement("link");
      welcomeStyle.id = "welcome-flow-style";
      welcomeStyle.rel = "stylesheet";
      welcomeStyle.href = "css/welcome-flow.css?v=1.19";
      document.head.appendChild(welcomeStyle);
    }
    if (!document.getElementById("welcome-flow-script")) {
      var welcomeScript = document.createElement("script");
      welcomeScript.id = "welcome-flow-script";
      welcomeScript.src = "js/welcome-flow.js?v=1.27";
      welcomeScript.defer = true;
      document.head.appendChild(welcomeScript);
    }
    ensurePersonalGuidance();
    ensurePanelExperience();
    ensureDashboardNav();
    ensureStartHub();
    ensureFocusEntry();
    loadFocusExperience();
    loadReminderService();
    loadInterfacePolish();
    loadPwaExperience();
    loadMobileCoach();
    loadScheduleTime(function () {
      loadCompletionHistory(function () {
        loadDayFlow();
        loadDailyBackup();
      });
      loadVariableDuration();
    });
    loadDashboardPolish();
    loadDashboardCalm();
    loadBrandExperience();
    loadPanelRedesign();
    loadWeeklyCalm();
    loadMonthlyCalm();
    loadAnnualCalm();
    loadDailyCalm();
    loadDailyPersistence();
    window.setTimeout(ensurePersonalGuidance, 500);
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (!(node instanceof Element)) return;
          if (document.getElementById("planify-dashboard-safe") && LEGACY_DASHBOARDS.some(function (selector) { return node.matches(selector); })) node.remove();
        });
      });
      window.clearTimeout(window.__planifyGuidanceTimer);
      window.__planifyGuidanceTimer = window.setTimeout(function () {
        ensurePersonalGuidance();
        ensurePanelExperience();
        ensureDashboardNav();
        ensureStartHub();
        ensureFocusEntry();
      }, 80);
    }).observe(document.body, { childList: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
