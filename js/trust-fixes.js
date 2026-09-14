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

  function calculateMetrics() {
    var schedule = readSchedule();
    var byDay = Array.from({ length: Math.max(7, schedule.dias.length || 0) }, function () { return 0; });
    var completedByDay = Array.from({ length: Math.max(7, schedule.dias.length || 0) }, function () { return 0; });
    var categories = {};
    var total = 0;
    var completed = 0;
    var hours = 0;

    schedule.filas.forEach(function (row, rowIndex) {
      var cells = Array.isArray(row.celdas) ? row.celdas : [];
      cells.forEach(function (cell, dayIndex) {
        if (!isMeaningfulCell(cell)) return;
        total += 1;
        if (cell.done || cell.completada) {
          completed += 1;
          completedByDay[dayIndex] = (completedByDay[dayIndex] || 0) + 1;
        }
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

    var daysCompleted = byDay.reduce(function (count, dayTotal, index) {
      return count + (dayTotal > 0 && completedByDay[index] === dayTotal ? 1 : 0);
    }, 0);
    var areaCount = Object.keys(categories).filter(function (name) { return categories[name] > 0; }).length;
    return {
      total: total,
      completed: completed,
      percent: total ? Math.round(completed * 100 / total) : 0,
      hours: hours,
      byDay: byDay.slice(0, 7),
      completedByDay: completedByDay.slice(0, 7),
      daysCompleted: daysCompleted,
      plannedDayCount: byDay.filter(function (count) { return count > 0; }).length,
      areaCount: areaCount,
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

  function dashboardRecommendations(metrics, profile) {
    var ideas = [];
    if (!metrics.total) ideas.push(["🌱", "Crea tu primera semana", "Elige una de las rutas guiadas y obtendrás una base que luego podrás editar.", "start"]);
    else if (metrics.percent < 35) ideas.push(["🎯", "Haz más pequeña la próxima acción", "Tu cumplimiento está por debajo de 35 %. Reduce un bloque o deja más margen entre compromisos.", "change"]);
    else if (metrics.percent < 75) ideas.push(["↗", "Protege lo que ya funciona", "Hay avance real. Conserva tus mejores días y mueve solo lo que suele quedar pendiente.", "change"]);
    else ideas.push(["✨", "Tu sistema está funcionando", "Mantén la estructura y revisa una sola mejora para la próxima semana.", "change"]);
    if (metrics.areaCount < 3 && metrics.total) ideas.push(["⚖️", "Revisa el equilibrio", "Tu horario se concentra en pocas áreas. Decide si quieres proteger descanso, alimentación o movimiento.", "preferences"]);
    if (profile.sleepChallenge && profile.sleepChallenge !== "none") ideas.push(["🌙", "Cuida el cierre del día", "Reserva una rutina tranquila y busca orientación profesional si el problema de sueño persiste.", "preferences"]);
    if (profile.foodProfile && profile.foodProfile !== "none") ideas.push(["🍽️", "Hazlo personal y observable", "Conserva horarios regulares y registra qué alimentos toleras; evita cambiar una dieta clínica sin orientación profesional.", "preferences"]);
    if (Array.isArray(profile.ventures) && profile.ventures.length) ideas.push(["🚀", "Dale un siguiente paso a tu emprendimiento", "Reserva un avance concreto para " + (profile.ventures[0].name || "tu emprendimiento") + ", no solo tiempo genérico.", "change"]);
    return ideas.slice(0, 3);
  }

  function recommendationMarkup(metrics, profile) {
    return dashboardRecommendations(metrics, profile).map(function (idea) {
      return '<article class="trust-recommendation"><span>' + idea[0] + '</span><div><strong>' + escapeHtml(idea[1]) + '</strong><p>' + escapeHtml(idea[2]) + '</p></div><button type="button" data-dashboard-action="' + idea[3] + '">Aplicar</button></article>';
    }).join("");
  }

  function openDashboard() {
    removeLegacyDashboards();
    var existing = document.getElementById("planify-dashboard-safe");
    if (existing) existing.remove();
    var metrics = calculateMetrics();
    var profile = readPersonalProfile();
    var name = String(profile.name || localStorage.getItem("planify_nombre") || "").trim().split(/\s+/)[0];
    var overlay = document.createElement("section");
    overlay.id = "planify-dashboard-safe";
    overlay.className = "trust-dashboard";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Dashboard de progreso");
    overlay.innerHTML = '<div class="trust-dashboard-inner"><header class="trust-dashboard-header"><div><span class="trust-dashboard-eyebrow">TU SEMANA, CON DATOS REALES</span><h2>' + escapeHtml(name ? "Hola, " + name : "Tu centro de progreso") + '</h2>' +
      '<p>Entiende qué estás cumpliendo, cómo repartes tu tiempo y cuál sería el siguiente ajuste más útil.</p></div><button type="button" id="trust-dashboard-close">✕ Volver al planificador</button></header>' +
      '<div class="trust-metrics">' +
      dashboardCard("Cumplimiento semanal", metrics.percent + "%", metrics.total ? "Basado en actividades reales" : "Agrega actividades para comenzar", "#38bdf8") +
      dashboardCard("Tareas finalizadas", metrics.completed + " / " + metrics.total, metrics.total ? "Horario semanal actual" : "Aún no hay tareas", "#a855f7") +
      dashboardCard("Días completados", metrics.daysCompleted + " / " + metrics.plannedDayCount, "Días planificados con todo hecho", "#4ade80") +
      dashboardCard("Áreas planificadas", metrics.areaCount + " / 5", metrics.total ? "Variedad presente, sin inventar un puntaje" : "Aún no hay áreas", "#facc15") +
      '</div>' +
      (metrics.total ? "" : '<div class="trust-empty"><span>🌱</span><div><strong>Tu dashboard está listo para crecer contigo</strong><p>Crea o carga un horario y aquí aparecerá tu progreso real, sin datos de ejemplo.</p></div></div>') +
      '<div class="trust-dashboard-grid"><article class="trust-chart"><h3>Actividades por día</h3><div class="trust-bars">' + barsMarkup(metrics.byDay) + '</div></article>' +
      '<article class="trust-chart"><h3>Distribución por áreas</h3><div class="trust-categories">' + categoriesMarkup(metrics) + '</div></article></div>' +
      '<section class="trust-dashboard-recommendations"><div><span>RECOMENDACIONES PERSONALIZADAS</span><h3>Lo siguiente que te conviene ajustar</h3><p>No son frases genéricas: parten de tu horario, tu cumplimiento y las preferencias que decidiste guardar.</p></div><div class="trust-recommendation-list">' + recommendationMarkup(metrics, profile) + '</div></section>' +
      '<footer class="trust-dashboard-actions"><button type="button" data-dashboard-action="change">🪄 Pedir un cambio</button><button type="button" data-dashboard-action="preferences">⚙️ Revisar preferencias</button><small>Bienestar: PLANIFY ofrece orientación general y recordatorios. No diagnostica ni recomienda medicamentos, suplementos o dosis.</small></footer></div>';
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
      nav.insertAdjacentHTML("beforeend", '<button type="button" class="tab-btn trust-dashboard-nav" data-tab="dashboard">📊 <span>Dashboard</span></button>');
    });
  }

  function ensureStartHub() {
    if (document.querySelector(".trust-start-hub")) return;
    var anchor = document.querySelector(".main-card-container");
    if (!anchor || !anchor.parentNode) return;
    var completed = localStorage.getItem("planify_bienvenida_estado") === "completada";
    var hub = document.createElement("section");
    hub.className = "trust-start-hub" + (completed ? " is-compact" : "");
    hub.innerHTML = '<div class="trust-start-heading"><div><span>EMPIEZA COMO PREFIERAS</span><h2>' + (completed ? "¿Qué quieres hacer ahora?" : "Tu horario, con el nivel de ayuda que tú elijas") + '</h2><p>Después siempre podrás editarlo a mano, pedir un cambio al asistente y medir tu avance en el Dashboard.</p></div>' + (completed ? '<button type="button" data-start-action="toggle">Ver las 3 opciones</button>' : '') + '</div><div class="trust-start-options"><button type="button" data-start-action="manual"><span>✍️</span><strong>Planificar por mi cuenta</strong><small>Abre todas las herramientas y empieza con una tabla vacía.</small><em>Control total</em></button><button type="button" class="is-recommended" data-start-action="guided"><b>RECOMENDADO</b><span>🧩</span><strong>Ayúdame paso a paso</strong><small>Responde lo esencial y recibe una base editable.</small><em>Con acompañamiento</em></button><button type="button" data-start-action="detailed"><span>✨</span><strong>Quiero una propuesta casi lista</strong><small>Incluye estudios, trabajos, emprendimientos, energía y bienestar.</small><em>Mayor personalización</em></button></div><div class="trust-start-destinations"><span>Tu espacio incluye</span><b>📝 Diario</b><b>📅 Semanal</b><b>📆 Mensual</b><b>🗓️ Anual</b><b>📊 Dashboard</b></div>';
    anchor.parentNode.insertBefore(hub, anchor);
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
      welcomeStyle.href = "css/welcome-flow.css?v=1.13";
      document.head.appendChild(welcomeStyle);
    }
    if (!document.getElementById("welcome-flow-script")) {
      var welcomeScript = document.createElement("script");
      welcomeScript.id = "welcome-flow-script";
      welcomeScript.src = "js/welcome-flow.js?v=1.17";
      welcomeScript.defer = true;
      document.head.appendChild(welcomeScript);
    }
    ensurePersonalGuidance();
    ensurePanelExperience();
    ensureDashboardNav();
    ensureStartHub();
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
      }, 80);
    }).observe(document.body, { childList: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
