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
  var tutorialStep = 0;

  var TUTORIAL_STEPS = [
    { icon: "👋", title: "Bienvenido a PLANIFY", text: "Aquí puedes organizar tu día, tu semana, tu mes y tu año sin perder de vista lo que realmente quieres lograr." },
    { icon: "🗓️", title: "Construye tu horario", text: "En Semanal puedes tocar cualquier celda para añadir una actividad. También puedes cargar un modelo y adaptarlo a tu rutina." },
    { icon: "✅", title: "Marca tus avances", text: "Completa las actividades conforme las realices. El resumen y el dashboard usarán esos datos reales para mostrar tu progreso." },
    { icon: "📊", title: "Revisa tu equilibrio", text: "El Dashboard te muestra cuánto has completado, tus horas planificadas y cómo distribuyes tu tiempo entre tus áreas de vida." },
    { icon: "📱", title: "Úsalo donde quieras", text: "PLANIFY funciona en computadora y celular. Tus cambios se guardan automáticamente en este navegador y puedes exportarlos desde Ajustes." }
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
    var label = String(rows[index] && rows[index].hora || "");
    var times = label.match(/\d{1,2}:\d{2}/g) || [];
    var start = timeToMinutes(times[0]);
    var end = timeToMinutes(times[1]);
    if (start != null && end != null) {
      if (end <= start) end += 24 * 60;
      return Math.max(0.25, (end - start) / 60);
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

  function calculateMetrics() {
    var schedule = readSchedule();
    var byDay = Array.from({ length: Math.max(7, schedule.dias.length || 0) }, function () { return 0; });
    var categories = {};
    var total = 0;
    var completed = 0;
    var hours = 0;

    schedule.filas.forEach(function (row, rowIndex) {
      var cells = Array.isArray(row.celdas) ? row.celdas : [];
      cells.forEach(function (cell, dayIndex) {
        if (!isMeaningfulCell(cell)) return;
        total += 1;
        if (cell.done || cell.completada) completed += 1;
        byDay[dayIndex] = (byDay[dayIndex] || 0) + 1;
        var duration = rowDurationHours(schedule.filas, rowIndex, cell);
        hours += duration;
        var category = classifyCell(cell);
        categories[category] = (categories[category] || 0) + duration;
      });
    });

    var dominant = "Sin datos";
    var dominantHours = 0;
    Object.keys(categories).forEach(function (name) {
      if (categories[name] > dominantHours) {
        dominant = name;
        dominantHours = categories[name];
      }
    });

    return {
      total: total,
      completed: completed,
      percent: total ? Math.round(completed * 100 / total) : 0,
      hours: hours,
      byDay: byDay.slice(0, 7),
      categories: categories,
      dominant: dominant,
      dominantPercent: hours ? Math.round(dominantHours * 100 / hours) : 0
    };
  }

  function formatHours(hours) {
    return hours ? (Math.round(hours * 10) / 10).toLocaleString("es-PE") + " h" : "0 h";
  }

  function dashboardCard(label, value, note, color) {
    return '<article class="trust-metric" style="--metric-color:' + color + '">' +
      '<span class="trust-metric-label">' + escapeHtml(label) + '</span>' +
      '<strong>' + escapeHtml(value) + '</strong><small>' + escapeHtml(note) + '</small></article>';
  }

  function barsMarkup(values) {
    var labels = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
    var max = Math.max.apply(Math, values.concat([1]));
    return labels.map(function (label, index) {
      var count = values[index] || 0;
      var height = count ? Math.max(12, Math.round(count * 100 / max)) : 3;
      return '<div class="trust-bar-column" title="' + count + ' actividades"><span class="trust-bar-value">' + count + '</span>' +
        '<span class="trust-bar" style="height:' + height + '%"></span><span class="trust-bar-label">' + label + '</span></div>';
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

  function openDashboard() {
    removeLegacyDashboards();
    var existing = document.getElementById("planify-dashboard-safe");
    if (existing) existing.remove();
    var metrics = calculateMetrics();
    var overlay = document.createElement("section");
    overlay.id = "planify-dashboard-safe";
    overlay.className = "trust-dashboard";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Dashboard de progreso");
    overlay.innerHTML = '<div class="trust-dashboard-inner"><header class="trust-dashboard-header"><div><h2>📊 Tu progreso</h2>' +
      '<p>Métricas calculadas a partir de tu horario semanal guardado.</p></div><button type="button" id="trust-dashboard-close">✕ Volver al planificador</button></header>' +
      '<div class="trust-metrics">' +
      dashboardCard("Cumplimiento semanal", metrics.percent + "%", metrics.total ? "Basado en actividades reales" : "Agrega actividades para comenzar", "#38bdf8") +
      dashboardCard("Tareas finalizadas", metrics.completed + " / " + metrics.total, metrics.total ? "Horario semanal actual" : "Aún no hay tareas", "#a855f7") +
      dashboardCard("Tiempo planificado", formatHours(metrics.hours), metrics.total ? "Suma de tus bloques guardados" : "Aún no hay horas registradas", "#ec4899") +
      dashboardCard("Área dominante", metrics.dominant, metrics.total ? metrics.dominantPercent + "% del tiempo planificado" : "Sin información todavía", "#facc15") +
      '</div>' +
      (metrics.total ? "" : '<div class="trust-empty"><span>🌱</span><div><strong>Tu dashboard está listo para crecer contigo</strong><p>Crea o carga un horario y aquí aparecerá tu progreso real, sin datos de ejemplo.</p></div></div>') +
      '<div class="trust-dashboard-grid"><article class="trust-chart"><h3>Actividades por día</h3><div class="trust-bars">' + barsMarkup(metrics.byDay) + '</div></article>' +
      '<article class="trust-chart"><h3>Distribución por áreas</h3><div class="trust-categories">' + categoriesMarkup(metrics) + '</div></article></div></div>';
    document.body.appendChild(overlay);
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.getElementById("trust-dashboard-close").focus();
  }

  function closeDashboard() {
    var overlay = document.getElementById("planify-dashboard-safe");
    if (overlay) overlay.remove();
    removeLegacyDashboards();
    document.body.style.overflow = previousBodyOverflow;
  }

  function renderTutorial() {
    var step = TUTORIAL_STEPS[tutorialStep];
    var overlay = document.getElementById("planify-tutorial-safe");
    if (!overlay) return;
    overlay.querySelector(".trust-tutorial-icon").textContent = step.icon;
    overlay.querySelector(".trust-tutorial-title").textContent = step.title;
    overlay.querySelector(".trust-tutorial-text").textContent = step.text;
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
      '<h2 class="trust-tutorial-title"></h2><p class="trust-tutorial-text"></p><footer><button type="button" id="trust-tutorial-back" class="trust-secondary">← Atrás</button>' +
      '<button type="button" id="trust-tutorial-next" class="trust-primary">Siguiente →</button></footer></div>';
    document.body.appendChild(overlay);
    renderTutorial();
    document.getElementById("trust-tutorial-next").focus();
  }

  function closeTutorial() {
    var overlay = document.getElementById("planify-tutorial-safe");
    if (overlay) overlay.remove();
  }

  function isDashboardTrigger(target) {
    var trigger = target.closest("button,a,[role='button']");
    if (!trigger || trigger.closest("#planify-dashboard-safe")) return false;
    var id = String(trigger.id || "").toLowerCase();
    var text = String(trigger.textContent || "").trim().toLowerCase();
    return id === "btn-sidebar-dashboard" || id === "btn-view-dashboard" || text === "dashboard" || text === "📊 dashboard" || text === "ver dashboard";
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
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
    if (event.key !== "Escape") return;
    closeTutorial();
    closeDashboard();
  });

  function init() {
    document.documentElement.classList.add("planify-trust-ready");
    removeLegacyDashboards();
    new MutationObserver(function (mutations) {
      if (!document.getElementById("planify-dashboard-safe")) return;
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (!(node instanceof Element)) return;
          if (LEGACY_DASHBOARDS.some(function (selector) { return node.matches(selector); })) node.remove();
        });
      });
    }).observe(document.body, { childList: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
