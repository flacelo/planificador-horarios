(function () {
  "use strict";

  var DAYS = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"];
  var DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  var ACTIVITY_CHOICES = [
    ["libre", "Tiempo libre"],
    ["estudio", "Estudio / enfoque"],
    ["clase", "Clase / trabajo"],
    ["comida", "Comida / pausa"],
    ["flexible", "Ejercicio / actividad"],
    ["rutina", "Rutina personal"],
    ["desconexion", "Descanso"],
    ["custom", "Otra actividad"]
  ];
  var state = {
    step: 0,
    mode: "guided",
    userName: "",
    priority: "study",
    roles: ["study"],
    occupation: "study",
    occupationOther: "",
    career: "engineering",
    careerOther: "",
    studyContext: "classes",
    specialty: "industrial",
    specialtyOther: "",
    jobRole: "",
    jobPattern: "fixed",
    ventures: [],
    goal: "",
    days: [0, 1, 2, 3, 4],
    start: "07:00",
    end: "22:00",
    blockDuration: 30,
    wantMoreQuestions: false,
    energyPeak: "morning",
    weeklyFrequency: 5,
    sessionsPerDay: 1,
    startStyle: "gentle",
    meals: ["breakfast", "lunch", "dinner"],
    snacksPerDay: 0,
    foodProfile: "none",
    foodNotes: "",
    hydration: true,
    caffeineCutoff: "16:00",
    sleepChallenge: "none",
    movementStyle: "activebreaks",
    movementMinutes: 10,
    commuteMinutes: 0,
    freeMinutes: 60,
    quietEvening: false,
    saturdayStyle: "recover",
    sundayStyle: "reset",
    sleepHours: 8,
    bedtime: "23:00",
    lifeDetailsUsed: false,
    dayTimes: {},
    showDayCustomization: false,
    fixed: [],
    projects: [],
    manualRequests: [],
    activities: ["exercise", "free"],
    breakStyle: "balanced",
    likes: "",
    reminders: { water: false, medicine: false, study: false, work: false, custom: false },
    waterEvery: 120,
    medicineName: "",
    medicineTime: "09:00",
    customReminder: "",
    customReminderTime: "15:00",
    technique: "pomodoro",
    variant: 0,
    edits: {},
    rowTimes: {},
    example: false,
    editing: false,
    previewMode: "daily",
    previewDay: 0,
    commandMessage: ""
  };

  function firstName() {
    return scheduleText(state.userName, 35).split(/\s+/)[0] || "";
  }

  function named(text) {
    return firstName() ? firstName() + ", " + text : text.charAt(0).toUpperCase() + text.slice(1);
  }

  function hasRole(role) {
    var roles = Array.isArray(state.roles) && state.roles.length ? state.roles : [state.occupation];
    if (role === "study") return roles.indexOf("study") >= 0 || state.occupation === "both";
    if (role === "work") return roles.indexOf("work") >= 0 || state.occupation === "work" || state.occupation === "both";
    if (role === "entrepreneur") return roles.indexOf("entrepreneur") >= 0 || state.occupation === "entrepreneur";
    return roles.indexOf(role) >= 0;
  }

  function syncOccupationFromRoles() {
    var roles = Array.isArray(state.roles) ? state.roles : [];
    if (roles.indexOf("study") >= 0 && roles.indexOf("work") >= 0) state.occupation = "both";
    else if (roles.indexOf("study") >= 0) state.occupation = "study";
    else if (roles.indexOf("work") >= 0) state.occupation = "work";
    else if (roles.indexOf("entrepreneur") >= 0) state.occupation = "entrepreneur";
    else if (roles.indexOf("home") >= 0) state.occupation = "home";
    else state.occupation = "other";
  }

  function fixedDays(item) {
    if (item && Array.isArray(item.days)) return item.days.map(Number);
    return [Number(item && item.day || 0)];
  }

  function expandedFixed() {
    var result = [];
    state.fixed.forEach(function (item) {
      fixedDays(item).forEach(function (day) {
        result.push(Object.assign({}, item, { day: day }));
      });
    });
    return result;
  }

  function hasTasks(value) {
    if (!value || typeof value !== "object") return false;
    var rows = Array.isArray(value) ? value : value.filas;
    return Array.isArray(rows) && rows.some(function (row) {
      return row && Array.isArray(row.celdas) && row.celdas.some(function (cell) {
        var text = String(cell && (cell.t || cell.texto || cell.title) || "").trim();
        return text && text !== "—" && text !== "-";
      });
    });
  }

  function hasExistingPlan() {
    var keys = ["horario_data_semanal", "horario_data_diario", "horario_data_mensual", "horario_data_anual", "horario_completo", "horario_datos"];
    return keys.some(function (key) {
      try { return hasTasks(JSON.parse(localStorage.getItem(key) || "null")); }
      catch (error) { return Boolean(localStorage.getItem(key)); }
    });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function scheduleText(value, maxLength) {
    return String(value == null ? "" : value).replace(/<[^>]*>/g, " ").replace(/[<>]/g, "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength || 120);
  }

  function addEntryButton() {
    var actions = document.querySelector(".header-actions");
    if (!actions || document.getElementById("welcome-flow-open")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.id = "welcome-flow-open";
    button.className = "welcome-flow-open";
    button.textContent = "✨ Crear mi horario";
    button.setAttribute("aria-haspopup", "dialog");
    actions.insertBefore(button, actions.firstChild);
  }

  function addScheduleAssistantButton() {
    var actions = document.querySelector(".header-actions");
    if (!actions || document.getElementById("schedule-change-open")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.id = "schedule-change-open";
    button.className = "welcome-flow-open welcome-flow-change-open";
    button.textContent = "🪄 Pedir un cambio";
    button.setAttribute("aria-haspopup", "dialog");
    actions.insertBefore(button, actions.firstChild);
  }

  function createOverlay() {
    var existing = document.getElementById("welcome-flow-overlay");
    if (existing) existing.remove();
    var overlay = document.createElement("section");
    overlay.id = "welcome-flow-overlay";
    overlay.className = "welcome-flow-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "welcome-flow-title");
    document.body.appendChild(overlay);
    return overlay;
  }

  function priorityLabel(priority) {
    return {
      study: "Estudiar y aprender",
      work: "Trabajar y avanzar proyectos",
      balance: "Equilibrar estudio, trabajo y vida personal",
      personal: "Cuidar mis hábitos y proyectos personales"
    }[priority] || "Organizar mi semana";
  }

  function specialtyLabel() {
    if (state.specialty === "other") return state.specialtyOther || state.careerOther || "tu especialidad";
    return {
      industrial: "Ingeniería Industrial", systems: "Ingeniería de Sistemas / Software", civil: "Ingeniería Civil", mining: "Ingeniería de Minas",
      environmental: "Ingeniería Ambiental", mechanical: "Ingeniería Mecánica", electrical: "Ingeniería Eléctrica / Electrónica", chemical: "Ingeniería Química",
      medicine: "Medicina humana", nursing: "Enfermería", nutrition: "Nutrición", psychology: "Psicología", dentistry: "Odontología", therapy: "Terapia / rehabilitación",
      administration: "Administración", accounting: "Contabilidad", economics: "Economía / Finanzas", marketing: "Marketing / Ventas", general: "tu especialidad"
    }[state.specialty] || state.careerOther || "tu área principal";
  }

  function defaultTextForCategory(category) {
    return {
      estudio: "Estudio enfocado",
      clase: "Clase o trabajo",
      comida: "Comida y pausa",
      flexible: "Ejercicio o actividad personal",
      rutina: "Rutina personal",
      desconexion: "Descanso y desconexión"
    }[category] || "";
  }

  function readPreviewEdits() {
    var overlay = document.getElementById("welcome-flow-overlay");
    if (!overlay) return;
    overlay.querySelectorAll("[data-welcome-edit-text]").forEach(function (input) {
      var index = Number(input.getAttribute("data-welcome-index"));
      var select = overlay.querySelector('[data-welcome-edit-category][data-welcome-index="' + index + '"]');
      var start = overlay.querySelector('[data-welcome-edit-start][data-welcome-index="' + index + '"]');
      var end = overlay.querySelector('[data-welcome-edit-end][data-welcome-index="' + index + '"]');
      if (!select) return;
      var editKey = state.previewDay + "_" + index;
      if (start && end) state.rowTimes[index] = { start: start.value, end: end.value };
      state.edits[editKey] = {
        category: select.value,
        text: input.value.trim(),
        gap: Boolean(state.edits[editKey] && state.edits[editKey].gap)
      };
    });
  }

  function decisionStep() {
    return state.mode === "quick" ? 2 : state.mode === "guided" ? 3 : 4;
  }

  function rhythmStep() {
    return decisionStep() + 1;
  }

  function lifeStep() {
    return decisionStep() + 2;
  }

  function proposalStep() {
    return decisionStep() + 3;
  }

  function getDraftFromForm() {
    var overlay = document.getElementById("welcome-flow-overlay");
    if (!overlay) return;
    var oldStart = state.start;
    var oldEnd = state.end;
    if (state.step === proposalStep()) readPreviewEdits();
    var userName = overlay.querySelector("#welcome-name");
    if (userName) state.userName = scheduleText(userName.value, 50);
    var selectedPriority = overlay.querySelector("input[name='welcome-priority']:checked");
    if (selectedPriority) state.priority = selectedPriority.value;
    if (overlay.querySelector("input[name='welcome-role']")) {
      state.roles = Array.from(overlay.querySelectorAll("input[name='welcome-role']:checked")).map(function (input) { return input.value; });
      syncOccupationFromRoles();
    }
    var occupationOther = overlay.querySelector("#welcome-occupation-other");
    if (occupationOther) state.occupationOther = scheduleText(occupationOther.value, 2000);
    var career = overlay.querySelector("#welcome-career");
    if (career) state.career = career.value;
    var careerOther = overlay.querySelector("#welcome-career-other");
    if (careerOther) state.careerOther = scheduleText(careerOther.value, 70);
    var studyContext = overlay.querySelector("input[name='welcome-study-context']:checked");
    if (studyContext) state.studyContext = studyContext.value;
    var specialty = overlay.querySelector("#welcome-specialty");
    if (specialty) state.specialty = specialty.value;
    var specialtyOther = overlay.querySelector("#welcome-specialty-other");
    if (specialtyOther) state.specialtyOther = scheduleText(specialtyOther.value, 70);
    var jobRole = overlay.querySelector("#welcome-job-role");
    if (jobRole) state.jobRole = scheduleText(jobRole.value, 2000);
    var jobPattern = overlay.querySelector("input[name='welcome-job-pattern']:checked");
    if (jobPattern) state.jobPattern = jobPattern.value;
    var ventureNames = overlay.querySelectorAll("[data-venture-name]");
    if (ventureNames.length) {
      state.ventures = Array.from(ventureNames).map(function (input) {
        var index = Number(input.getAttribute("data-venture-name"));
        var details = overlay.querySelector('[data-venture-details="' + index + '"]');
        return { name: scheduleText(input.value, 160), details: scheduleText(details && details.value, 400) };
      }).filter(function (venture) { return venture.name || venture.details; });
    }
    var goal = overlay.querySelector("#welcome-goal");
    if (goal) state.goal = scheduleText(goal.value, 90);
    var selectedDays = Array.from(overlay.querySelectorAll("input[name='welcome-day']:checked")).map(function (input) { return Number(input.value); });
    if (overlay.querySelector("input[name='welcome-day']")) state.days = selectedDays;
    var start = overlay.querySelector("#welcome-start");
    var end = overlay.querySelector("#welcome-end");
    if (start) state.start = start.value;
    if (end) state.end = end.value;
    var blockDuration = overlay.querySelector("input[name='welcome-block-duration']:checked");
    if (blockDuration) state.blockDuration = Number(blockDuration.value);
    var energy = overlay.querySelector("input[name='welcome-energy']:checked");
    if (energy) state.energyPeak = energy.value;
    var frequency = overlay.querySelector("#welcome-frequency");
    if (frequency) state.weeklyFrequency = Number(frequency.value);
    var sessionsPerDay = overlay.querySelector("#welcome-sessions-per-day");
    if (sessionsPerDay) state.sessionsPerDay = Number(sessionsPerDay.value);
    var startStyle = overlay.querySelector("input[name='welcome-start-style']:checked");
    if (startStyle) state.startStyle = startStyle.value;
    if (overlay.querySelector("input[name='welcome-meal']")) {
      state.meals = Array.from(overlay.querySelectorAll("input[name='welcome-meal']:checked")).map(function (input) { return input.value; });
    }
    var snacks = overlay.querySelector("#welcome-snacks");
    if (snacks) state.snacksPerDay = Number(snacks.value);
    var foodProfile = overlay.querySelector("input[name='welcome-food-profile']:checked");
    if (foodProfile) state.foodProfile = foodProfile.value;
    var foodNotes = overlay.querySelector("#welcome-food-notes");
    if (foodNotes) state.foodNotes = scheduleText(foodNotes.value, 100);
    var hydration = overlay.querySelector("#welcome-hydration");
    if (hydration) state.hydration = hydration.checked;
    var caffeineCutoff = overlay.querySelector("#welcome-caffeine-cutoff");
    if (caffeineCutoff) state.caffeineCutoff = caffeineCutoff.value;
    var sleepChallenge = overlay.querySelector("input[name='welcome-sleep-challenge']:checked");
    if (sleepChallenge) state.sleepChallenge = sleepChallenge.value;
    var movementStyle = overlay.querySelector("input[name='welcome-movement-style']:checked");
    if (movementStyle) state.movementStyle = movementStyle.value;
    var movementMinutes = overlay.querySelector("#welcome-movement-minutes");
    if (movementMinutes) state.movementMinutes = Number(movementMinutes.value);
    var commute = overlay.querySelector("#welcome-commute");
    if (commute) state.commuteMinutes = Number(commute.value);
    var freeMinutes = overlay.querySelector("#welcome-free-minutes");
    if (freeMinutes) state.freeMinutes = Number(freeMinutes.value);
    var quietEvening = overlay.querySelector("#welcome-quiet-evening");
    if (quietEvening) state.quietEvening = quietEvening.checked;
    var saturdayStyle = overlay.querySelector("#welcome-saturday-style");
    if (saturdayStyle) state.saturdayStyle = saturdayStyle.value;
    var sundayStyle = overlay.querySelector("#welcome-sunday-style");
    if (sundayStyle) state.sundayStyle = sundayStyle.value;
    var sleepHours = overlay.querySelector("#welcome-sleep-hours");
    if (sleepHours) {
      state.sleepHours = Number(sleepHours.value);
      state.lifeDetailsUsed = true;
    }
    var bedtime = overlay.querySelector("#welcome-bedtime");
    if (bedtime) state.bedtime = bedtime.value;
    overlay.querySelectorAll("[data-day-time]").forEach(function (field) {
      var day = Number(field.getAttribute("data-day-time"));
      state.dayTimes[day] = state.dayTimes[day] || {};
      if (field.hasAttribute("data-day-start")) state.dayTimes[day].start = field.value;
      if (field.hasAttribute("data-day-end")) state.dayTimes[day].end = field.value;
    });
    var fixedTitles = overlay.querySelectorAll("[data-fixed-title]");
    if (fixedTitles.length) {
      state.fixed = Array.from(fixedTitles).map(function (input) {
        var index = Number(input.getAttribute("data-fixed-title"));
        var fixedDayInputs = overlay.querySelectorAll('[data-fixed-day="' + index + '"]:checked');
        var fixedSelectedDays = Array.from(fixedDayInputs).map(function (dayInput) { return Number(dayInput.value); });
        return {
          title: scheduleText(input.value, 70),
          type: (overlay.querySelector('[data-fixed-type="' + index + '"]') || {}).value || "fixed",
          days: fixedSelectedDays,
          day: fixedSelectedDays.length ? fixedSelectedDays[0] : 0,
          start: (overlay.querySelector('[data-fixed-start="' + index + '"]') || {}).value || "09:00",
          end: (overlay.querySelector('[data-fixed-end="' + index + '"]') || {}).value || "10:00"
        };
      }).filter(function (item) { return item.title; });
    }
    var projectTitles = overlay.querySelectorAll("[data-project-title]");
    if (projectTitles.length) {
      state.projects = Array.from(projectTitles).map(function (input) {
        var index = Number(input.getAttribute("data-project-title"));
        return {
          title: scheduleText(input.value, 80),
          type: (overlay.querySelector('[data-project-type="' + index + '"]') || {}).value || "project",
          sessions: Number((overlay.querySelector('[data-project-sessions="' + index + '"]') || {}).value || 1),
          duration: Number((overlay.querySelector('[data-project-duration="' + index + '"]') || {}).value || state.blockDuration),
          preferred: (overlay.querySelector('[data-project-preferred="' + index + '"]') || {}).value || "any",
          days: Array.from(overlay.querySelectorAll('[data-project-day="' + index + '"]:checked')).map(function (dayInput) { return Number(dayInput.value); })
        };
      }).filter(function (item) { return item.title; });
    }
    if (overlay.querySelector("input[name='welcome-activity']")) {
      state.activities = Array.from(overlay.querySelectorAll("input[name='welcome-activity']:checked")).map(function (input) { return input.value; });
    }
    var breakStyle = overlay.querySelector("input[name='welcome-break-style']:checked");
    if (breakStyle) state.breakStyle = breakStyle.value;
    var likes = overlay.querySelector("#welcome-likes");
    if (likes) state.likes = scheduleText(likes.value, 100);
    if (overlay.querySelector("input[name='welcome-reminder']")) {
      state.reminders = { water: false, medicine: false, study: false, work: false, custom: false };
      overlay.querySelectorAll("input[name='welcome-reminder']:checked").forEach(function (input) { state.reminders[input.value] = true; });
    }
    var waterEvery = overlay.querySelector("#welcome-water-every");
    var medicineName = overlay.querySelector("#welcome-medicine-name");
    var medicineTime = overlay.querySelector("#welcome-medicine-time");
    var customReminder = overlay.querySelector("#welcome-custom-reminder");
    var customReminderTime = overlay.querySelector("#welcome-custom-reminder-time");
    var technique = overlay.querySelector("#welcome-technique");
    if (waterEvery) state.waterEvery = Number(waterEvery.value);
    if (medicineName) state.medicineName = scheduleText(medicineName.value, 60);
    if (medicineTime) state.medicineTime = medicineTime.value;
    if (customReminder) state.customReminder = scheduleText(customReminder.value, 70);
    if (customReminderTime) state.customReminderTime = customReminderTime.value;
    if (technique) state.technique = technique.value;
    if (state.start !== oldStart || state.end !== oldEnd) {
      state.edits = {};
      state.rowTimes = {};
    }
  }

  function totalSteps() {
    if (state.mode === "manual") return 1;
    return proposalStep() + 1;
  }

  function renderHeader(step, title, subtitle) {
    var total = totalSteps();
    return '<header class="welcome-flow-header"><div class="welcome-flow-progress" aria-label="Paso ' + (step + 1) + ' de ' + total + '">' +
      '<i style="width:' + ((step + 1) * 100 / total) + '%"></i></div><span class="welcome-flow-step">PASO ' + (step + 1) + ' DE ' + total + '</span>' +
      '<button type="button" class="welcome-flow-close" data-welcome-action="close" aria-label="Cerrar">×</button>' +
      '<span class="welcome-flow-emoji">' + (["🧭", "🌱", "🗓️", "🔔", "🔎", "⚙️", "🏡", "✨"][step] || "✨") + '</span><h2 id="welcome-flow-title">' + title + '</h2>' +
      '<p>' + subtitle + '</p></header>';
  }

  function renderModeStep() {
    var modes = [
      ["manual", "✍️", "Quiero planificar por mi cuenta", "Irás directo al planificador vacío con todas las herramientas para construir y editar tu horario.", "Control total · puedes pedir ayuda después"],
      ["guided", "🧩", "Ayúdame paso a paso", "Responderás preguntas esenciales y recibirás una propuesta editable que podrás retocar tú o con el asistente.", "5–7 min · recomendado"],
      ["detailed", "✨", "Quiero una propuesta casi lista", "Conoceremos tus estudios, trabajos, emprendimientos, energía, bienestar y recordatorios.", "8–12 min · mayor personalización"]
    ];
    return renderHeader(0, "¿Cómo te gustaría crear tu horario?", "Elige una ruta clara. En las tres podrás editar a mano, pedir cambios al asistente y revisar tu avance en el Dashboard.") +
      '<div class="welcome-flow-fields welcome-flow-name"><label>¿Cómo te gustaría que te llamemos? <span class="welcome-flow-optional">(nombre o apodo)</span><input id="welcome-name" maxlength="50" value="' + escapeHtml(state.userName) + '" placeholder="Ej.: Flavio"></label></div>' +
      '<div class="welcome-flow-options welcome-flow-modes">' + modes.map(function (mode) {
        return '<button type="button" class="welcome-flow-mode ' + (state.mode === mode[0] ? "is-selected" : "") + '" data-welcome-mode="' + mode[0] + '" aria-pressed="' + (state.mode === mode[0] ? "true" : "false") + '"><span>' + mode[1] + '</span><span><strong>' + mode[2] + '</strong><small>' + mode[3] + '</small><em>' + mode[4] + '</em></span><i>✓</i></button>';
      }).join("") + '</div>' +
      '<div class="welcome-flow-example-callout"><span>👀</span><div><strong>¿Prefieres mirar antes?</strong><small>Te enseñamos un ejemplo completo sin guardar ni cambiar tus datos.</small></div><button type="button" class="welcome-flow-secondary" data-welcome-action="example">Ver ejemplo</button></div>' +
      '<footer class="welcome-flow-footer"><span>Nada queda bloqueado: puedes cambiar de método después.</span><button class="welcome-flow-primary" data-welcome-action="next">Continuar →</button></footer>';
  }

  function renderCoreStep() {
    var priorities = [["study", "📚", "Avanzar en mis estudios o formación"], ["work", "💼", "Sacar adelante trabajo, clientes o proyectos"], ["balance", "⚖️", "Cumplir mis responsabilidades sin descuidarme"], ["personal", "🌿", "Ser constante con un objetivo o hábito personal"]];
    var occupations = [["study", "Estudio o me estoy formando"], ["work", "Tengo uno o más trabajos"], ["entrepreneur", "Tengo uno o más emprendimientos"], ["home", "Hogar / cuidados"], ["other", "También hago otra cosa"]];
    var priorityHelp = {
      study: "Reservaremos primero espacios tranquilos para estudiar o aprender.",
      work: "Daremos prioridad a tus tareas, proyectos o trabajo importante.",
      balance: "Repartiremos el tiempo entre obligaciones, avance personal y descanso.",
      personal: "Protegeremos primero tus hábitos, bienestar y proyectos personales."
    };
    var dayOptions = DAY_LABELS.map(function (day, index) {
      return '<label class="welcome-flow-day"><input type="checkbox" name="welcome-day" value="' + index + '" ' +
        (state.days.indexOf(index) >= 0 ? "checked" : "") + '><span><strong>' + day + '</strong><small class="welcome-day-on">Activo</small><small class="welcome-day-off">Libre</small></span></label>';
    }).join("");
    var dayCustomization = state.days.map(function (day) {
      var times = state.dayTimes[day] || {};
      return '<div class="welcome-flow-day-time"><strong>' + DAY_LABELS[day] + '</strong><label>Desde<select data-day-time="' + day + '" data-day-start>' + timeOptions(times.start || state.start) + '</select></label><label>Hasta<select data-day-time="' + day + '" data-day-end>' + timeOptions(times.end || state.end) + '</select></label></div>';
    }).join("");
    var studies = hasRole("study");
    var works = hasRole("work");
    var entrepreneurs = hasRole("entrepreneur");
    var ventureMarkup = state.ventures.map(function (venture, index) {
      return '<div class="welcome-flow-venture-row"><label>Nombre del emprendimiento<input data-venture-name="' + index + '" value="' + escapeHtml(venture.name) + '" placeholder="Ej.: tienda en línea, consultoría, marca personal"></label><label>¿Qué necesitas avanzar durante la semana?<textarea data-venture-details="' + index + '" rows="2" placeholder="Ej.: responder pedidos, crear contenido y revisar ventas">' + escapeHtml(venture.details) + '</textarea></label><button type="button" data-welcome-action="remove-venture" data-venture-index="' + index + '">Quitar</button></div>';
    }).join("");
    var careerLabels = [["medicine", "Medicina / ciencias de la salud"], ["engineering", "Ingeniería / tecnología"], ["business", "Negocios / administración"], ["law", "Derecho / ciencias sociales"], ["arts", "Arte / diseño / comunicación"], ["other", "Otra carrera o especialidad"]];
    var specialtyOptions = state.career === "engineering" ? [["industrial","Ingeniería Industrial"],["systems","Ingeniería de Sistemas / Software"],["civil","Ingeniería Civil"],["mining","Ingeniería de Minas"],["environmental","Ingeniería Ambiental"],["mechanical","Ingeniería Mecánica"],["electrical","Ingeniería Eléctrica / Electrónica"],["chemical","Ingeniería Química"],["other","Otra ingeniería"]] : state.career === "medicine" ? [["medicine","Medicina humana"],["nursing","Enfermería"],["nutrition","Nutrición"],["psychology","Psicología"],["dentistry","Odontología"],["therapy","Terapia / rehabilitación"],["other","Otra carrera de salud"]] : state.career === "business" ? [["administration","Administración"],["accounting","Contabilidad"],["economics","Economía / Finanzas"],["marketing","Marketing / Ventas"],["other","Otra especialidad"]] : [["general","Mi especialidad principal"],["other","Quiero escribirla"]];
    if (!specialtyOptions.some(function (item) { return item[0] === state.specialty; })) state.specialty = specialtyOptions[0][0];
    var studyContextOptions = state.career === "medicine" ? [["theory","Cursos y exámenes teóricos"],["practice","Prácticas clínicas"],["rotation","Rotaciones o guardias"],["mixed","Una combinación de todo"]] : state.career === "engineering" ? [["classes","Cursos y ejercicios"],["labs","Laboratorios o talleres"],["projects","Proyectos y entregables"],["mixed","Una combinación de todo"]] : [["classes","Clases y evaluaciones"],["practice","Prácticas o actividades aplicadas"],["projects","Proyectos y entregables"],["mixed","Una combinación de todo"]];
    if (!studyContextOptions.some(function (item) { return item[0] === state.studyContext; })) state.studyContext = studyContextOptions[0][0];
    var goalPlaceholder = studies && state.career === "medicine" ? "Ej.: preparar Anatomía y llegar listo a prácticas" : studies && state.career === "engineering" ? "Ej.: terminar el proyecto de programación y repasar Cálculo" : works ? "Ej.: entregar la propuesta del cliente y avanzar mi proyecto" : "Ej.: entrenar tres veces y ordenar mis pendientes";
    return renderHeader(1, named("cuéntanos qué ocupa tu vida ahora"), "No asumiremos que todos viven igual: las siguientes preguntas cambiarán según lo que elijas.") +
      '<div class="welcome-flow-fields"><fieldset><legend>¿Qué cosas forman parte de tu vida actualmente?</legend><small class="welcome-flow-field-help">Puedes marcar varias: por ejemplo, estudiar, trabajar y llevar dos emprendimientos al mismo tiempo.</small><div class="welcome-flow-choice-pills welcome-flow-role-pills">' +
      occupations.map(function (item) { return '<label><input type="checkbox" name="welcome-role" value="' + item[0] + '" ' + (state.roles.indexOf(item[0]) >= 0 ? "checked" : "") + '><span>' + item[1] + '</span></label>'; }).join("") +
      '</div><label class="welcome-flow-reveal" data-occupation-other ' + (hasRole("other") ? "" : "hidden") + '>Cuéntanos con libertad qué más forma parte de tu rutina<textarea id="welcome-occupation-other" rows="3" placeholder="Ej.: trabajo por turnos, cuido a mis hijos y apoyo un negocio familiar">' + escapeHtml(state.occupationOther) + '</textarea></label></fieldset>' +
      (studies ? '<label>¿Qué estudias o en qué área te estás formando?<select id="welcome-career">' + careerLabels.map(function (item) { return '<option value="' + item[0] + '" ' + (state.career === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label>' + (state.career === "other" ? '<label>Escribe tu carrera o especialidad<input id="welcome-career-other" maxlength="70" value="' + escapeHtml(state.careerOther) + '" placeholder="Ej.: Arquitectura"></label>' : '<label>' + (state.career === "engineering" ? "¿Qué ingeniería estudias?" : state.career === "medicine" ? "¿Qué carrera o área de salud estudias?" : "¿Cuál es tu especialidad?") + '<select id="welcome-specialty">' + specialtyOptions.map(function (item) { return '<option value="' + item[0] + '" ' + (state.specialty === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label>' + (state.specialty === "other" ? '<label>Escribe tu especialidad<input id="welcome-specialty-other" maxlength="70" value="' + escapeHtml(state.specialtyOther) + '" placeholder="Ej.: Ingeniería de Seguridad Industrial"></label>' : '')) + '<fieldset><legend>' + (state.career === "medicine" ? "¿Qué ocupa más tu etapa de formación ahora?" : state.career === "engineering" ? "¿Qué tipo de trabajo académico ocupa más tu semana?" : "¿Qué tipo de actividad académica ocupa más tu semana?") + '</legend><div class="welcome-flow-choice-pills">' + studyContextOptions.map(function (item) { return '<label><input type="radio" name="welcome-study-context" value="' + item[0] + '" ' + (state.studyContext === item[0] ? "checked" : "") + '><span>' + item[1] + '</span></label>'; }).join("") + '</div></fieldset>' : '') +
      (works ? '<label>Cuéntanos a qué te dedicas en tu trabajo o trabajos <span class="welcome-flow-optional">(sin límite breve)</span><textarea id="welcome-job-role" rows="3" placeholder="Ej.: por las mañanas soy asistente contable y dos noches por semana atiendo clientes por mi cuenta">' + escapeHtml(state.jobRole) + '</textarea><small class="welcome-flow-field-help">Puedes escribir varios cargos, lugares o responsabilidades. Lo usaremos para distinguir tus bloques laborales y tus recomendaciones.</small></label><fieldset><legend>¿Tus horarios de trabajo suelen ser…?</legend><div class="welcome-flow-choice-pills">' + [["fixed","Mayormente fijos"],["variable","Cambian por día o turno"],["flexible","Yo decido cuándo trabajar"]].map(function (item) { return '<label><input type="radio" name="welcome-job-pattern" value="' + item[0] + '" ' + (state.jobPattern === item[0] ? "checked" : "") + '><span>' + item[1] + '</span></label>'; }).join("") + '</div></fieldset>' : '') +
      (entrepreneurs ? '<section class="welcome-flow-question-group welcome-flow-ventures"><div class="welcome-flow-group-heading"><strong>Tus emprendimientos</strong><small>Añade tantos como necesites. Más adelante elegirás cuánto tiempo y qué días dedicar a cada uno.</small></div>' + ventureMarkup + '<button type="button" class="welcome-flow-add-fixed" data-welcome-action="add-venture">＋ Añadir emprendimiento</button></section>' : '') +
      '<fieldset><legend>¿Qué resultado te haría sentir que esta semana valió la pena?</legend><div class="welcome-flow-choice-pills">' +
      priorities.map(function (item) { return '<label><input type="radio" name="welcome-priority" value="' + item[0] + '" ' + (state.priority === item[0] ? "checked" : "") + '><span>' + item[1] + ' ' + item[2] + '</span></label>'; }).join("") +
      '</div><p class="welcome-flow-answer-feedback" data-priority-feedback>✨ ' + priorityHelp[state.priority] + '</p></fieldset><label>Completa ese resultado con tus palabras <span class="welcome-flow-optional">(opcional, pero recomendado)</span><input id="welcome-goal" maxlength="90" value="' + escapeHtml(state.goal) + '" placeholder="' + goalPlaceholder + '"></label>' +
      '<fieldset><legend>¿Qué días quieres organizar?</legend><div class="welcome-flow-days">' + dayOptions + '</div><small class="welcome-flow-field-help">Los días marcados se planificarán. Los que dicen “Libre” quedarán sin actividades; también puedes activar sábado o domingo.</small><button type="button" class="welcome-flow-customize-days" data-welcome-action="toggle-day-times">' + (state.showDayCustomization ? "Ocultar horas de cada día" : "🕐 Personalizar las horas de cada día") + '</button>' + (state.showDayCustomization ? '<div class="welcome-flow-day-times">' + dayCustomization + '</div>' : '') + '</fieldset>' +
      '<div class="welcome-flow-time-grid"><label>Empiezo mi día<select id="welcome-start">' + timeOptions(state.start) + '</select></label>' +
      '<label>Termino mis actividades sobre<select id="welcome-end">' + timeOptions(state.end) + '</select></label></div>' +
      '<label>¿En cuántos días de esta semana quieres avanzar en ese resultado?<select id="welcome-frequency">' + [1,2,3,4,5,6,7].map(function (count) { return '<option value="' + count + '" ' + (state.weeklyFrequency === count ? "selected" : "") + '>' + count + (count === 1 ? " día" : " días") + '</option>'; }).join("") + '</select><small class="welcome-flow-field-help">Todavía no son horas. Más adelante elegirás cuántos momentos reservar y cuánto durará cada uno.</small></label></div>' +
      '<footer class="welcome-flow-footer"><button class="welcome-flow-secondary" data-welcome-action="back">← Atrás</button><button class="welcome-flow-primary" data-welcome-action="next">Seguir →</button></footer>';
  }

  function renderCommitmentsStep() {
    var studies = hasRole("study");
    var works = hasRole("work");
    var hasWorkSchedule = state.fixed.some(function (item) { return item.title && (item.type === "work" || /trabaj|turno|oficina|empresa/i.test(item.title)); });
    var hasStudySchedule = state.fixed.some(function (item) { return item.title && (item.type === "course" || item.type === "practice"); });
    var typeOptions = [["fixed", "Compromiso fijo"], ["course", "Curso / clase"], ["practice", state.career === "medicine" ? "Práctica / guardia" : "Práctica / laboratorio"], ["work", "Trabajo / turno"], ["meeting", "Reunión / atención"], ["personal", "Compromiso personal"]];
    var contextExamples = state.career === "medicine" ? "Ej.: Anatomía, práctica clínica o guardia" : state.career === "engineering" ? "Ej.: Cálculo, laboratorio o taller" : works ? "Ej.: trabajo, turno, reunión o cliente" : "Ej.: clase, cita o compromiso familiar";
    var fixedMarkup = state.fixed.map(function (item, index) {
      var itemDays = fixedDays(item);
      return '<div class="welcome-flow-fixed-row" data-fixed-row="' + index + '"><div class="welcome-flow-time-grid"><label>¿Qué actividad no puedes mover?<input data-fixed-title="' + index + '" maxlength="70" value="' + escapeHtml(item.title) + '" placeholder="' + contextExamples + '"></label><label>¿Qué tipo de compromiso es?<select data-fixed-type="' + index + '">' + typeOptions.map(function (option) { return '<option value="' + option[0] + '" ' + (item.type === option[0] ? "selected" : "") + '>' + option[1] + '</option>'; }).join("") + '</select></label></div>' +
        '<fieldset class="welcome-flow-fixed-days"><legend>¿Qué días ocurre exactamente?</legend><div class="welcome-flow-mini-days">' + DAY_LABELS.map(function (day, dayIndex) { return '<label><input type="checkbox" data-fixed-day="' + index + '" value="' + dayIndex + '" ' + (itemDays.indexOf(dayIndex) >= 0 ? "checked" : "") + '><span>' + day.slice(0, 3) + '</span></label>'; }).join("") + '</div><small>Marca únicamente los días en que se repite. Si el jueves no tienes que ir, déjalo sin marcar.</small></fieldset>' +
        '<div class="welcome-flow-time-grid"><label>Desde<select data-fixed-start="' + index + '">' + blockTimeOptions(item.start, false) + '</select></label><label>Hasta<select data-fixed-end="' + index + '">' + blockTimeOptions(item.end, true) + '</select></label></div>' +
        '<button type="button" class="welcome-flow-remove-fixed" data-welcome-action="remove-fixed" data-fixed-index="' + index + '" aria-label="Quitar actividad">Quitar</button></div>';
    }).join("");
    var activityChoices = [["study", "📚 Estudiar / practicar"], ["work", "💼 Trabajo o proyecto"], ["exercise", "🏃 Ejercicio / movimiento"], ["home", "🏠 Tareas de casa"], ["family", "💛 Familia o amistades"], ["creative", "🎨 Hobby / crear algo"], ["free", "🌿 Tiempo libre"]];
    var activityMarkup = activityChoices.map(function (item) {
      return '<label class="welcome-flow-activity-choice"><input type="checkbox" name="welcome-activity" value="' + item[0] + '" ' + (state.activities.indexOf(item[0]) >= 0 ? "checked" : "") + '><span>' + item[1] + '</span></label>';
    }).join("");
    var chosenActivityLabels = activityChoices.filter(function (item) { return state.activities.indexOf(item[0]) >= 0; }).map(function (item) { return item[1]; });
    var activityFeedback = chosenActivityLabels.length ? "✨ Añadiremos espacios para: " + chosenActivityLabels.join(" · ") + "." : "Puedes dejarlo vacío: mantendremos más espacios libres.";
    var breakOptions = [["often", "Pausa entre cada bloque"], ["balanced", "Pausas cada cierto tiempo"], ["flexible", "Dejar pausas libres, según el día"]];
    var quickTemplates = (studies ? '<button type="button" data-welcome-action="add-fixed-template" data-fixed-template="course">＋ Añadir curso o clase</button>' + (state.career === "medicine" ? '<button type="button" data-welcome-action="add-fixed-template" data-fixed-template="practice">＋ Añadir práctica o guardia</button>' : '<button type="button" data-welcome-action="add-fixed-template" data-fixed-template="practice">＋ Añadir laboratorio o práctica</button>') : '') + (works ? '<button type="button" data-welcome-action="add-fixed-template" data-fixed-template="work">＋ Añadir trabajo o turno</button>' : '') + '<button type="button" data-welcome-action="add-fixed">＋ Otro compromiso</button>';
    return renderHeader(2, named("coloquemos primero lo que no puede moverse"), "Puedes repetir una misma clase o turno en varios días, y dejar libre un día distinto aunque normalmente trabajes o estudies.") +
      '<div class="welcome-flow-fields"><section class="welcome-flow-question-group"><div class="welcome-flow-group-heading"><strong>' + (studies && works ? "Cursos, trabajo y otros compromisos" : studies ? "Cursos, prácticas y otros compromisos" : works ? "Trabajo, turnos y otros compromisos" : "Tus compromisos fijos") + '</strong><small>Añade una fila por cada horario diferente. Si algo cambia de hora según el día, añádelo como otra fila.</small></div>' +
      (works && !hasWorkSchedule ? '<div class="welcome-flow-needed"><span>💼</span><div><strong>No olvides añadir tu trabajo o turnos</strong><small>Elegiste que trabajas. Necesito saber qué días y horas ocupa para no colocar estudio, descanso u otras actividades encima.</small></div><button type="button" data-welcome-action="add-fixed-template" data-fixed-template="work">Añadir mi trabajo</button></div>' : '') +
      (studies && !hasStudySchedule ? '<div class="welcome-flow-needed"><span>▣</span><div><strong>Añade al menos tu clase, práctica o curso más importante</strong><small>Así la propuesta distinguirá tus horas obligatorias de tus momentos de estudio autónomo.</small></div></div>' : '') +
      fixedMarkup + '<div class="welcome-flow-template-actions">' + quickTemplates + '</div></section>' +
      '<fieldset><legend>¿Qué te gustaría que aparezca en tu horario?</legend><div class="welcome-flow-activity-grid">' + activityMarkup + '</div><p class="welcome-flow-answer-feedback" data-activity-feedback>' + activityFeedback + '</p></fieldset>' +
      '<fieldset><legend>¿Cómo te gustan los descansos?</legend><div class="welcome-flow-options welcome-flow-break-options">' + breakOptions.map(function (item) {
        return '<label class="welcome-flow-option"><input type="radio" name="welcome-break-style" value="' + item[0] + '" ' + (state.breakStyle === item[0] ? "checked" : "") + '><span><strong>' + item[1] + '</strong><small>' + (item[0] === "often" ? "La propuesta dejará ratos libres entre varias actividades." : item[0] === "balanced" ? "Combina avance, comida y descanso." : "Tendrás más espacios sin asignar para decidir después.") + '</small></span></label>';
      }).join("") + '</div></fieldset>' +
      (state.mode === "detailed" ? '<label>¿Qué disfrutas hacer para recargar energía? <span class="welcome-flow-optional">(opcional)</span><input id="welcome-likes" maxlength="100" value="' + escapeHtml(state.likes) + '" placeholder="Ej.: caminar, leer, música, cocinar"></label>' : '') +
      '<p class="welcome-flow-note">Ejemplo: puedes marcar trabajo de lunes a miércoles de 8:00 a 13:00, dejar el jueves libre y añadir el viernes con otro horario.</p></div>' +
      '<footer class="welcome-flow-footer"><button class="welcome-flow-secondary" data-welcome-action="back">← Atrás</button><button class="welcome-flow-primary" data-welcome-action="next">' + (state.mode === "detailed" ? "Seguir a recordatorios →" : "Seguir →") + '</button></footer>';
  }

  function renderRemindersStep() {
    var choices = [["water", "💧", "Tomar agua", "Repetir durante el día"], ["medicine", "💊", "Recordar algo ya indicado", "Medicamento o suplemento que ya usas"], ["study", "📚", "Empezar a estudiar", "Avisarme cuando toque mi bloque"], ["work", "💼", "Avanzar un trabajo importante", "Avisarme al empezar"], ["custom", "🔔", "Otro recordatorio", "Algo personal que no quiero olvidar"]];
    var reminderOptions = choices.map(function (choice) {
      return '<label class="welcome-flow-reminder-choice"><input type="checkbox" name="welcome-reminder" value="' + choice[0] + '" ' + (state.reminders[choice[0]] ? "checked" : "") + '><span>' + choice[1] + '</span><span><strong>' + choice[2] + '</strong><small>' + choice[3] + '</small></span></label>';
    }).join("");
    return renderHeader(3, "¿Quieres que algo te lo recordemos?", "Marca solo lo que te serviría. Las alarmas son opcionales y puedes cambiarlas después.") +
      '<div class="welcome-flow-reminder-list">' + reminderOptions + '</div>' +
      '<div class="welcome-flow-fields welcome-flow-reminder-details">' +
      '<label data-reminder-detail="water">¿Cada cuánto te gustaría recordar tomar agua?<select id="welcome-water-every">' + [[60,"Cada hora"],[90,"Cada hora y media"],[120,"Cada 2 horas"],[180,"Cada 3 horas"]].map(function (item) { return '<option value="' + item[0] + '" ' + (state.waterEvery === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label>' +
      '<label data-reminder-detail="medicine">¿Qué te indicó tu profesional o qué ya decidiste registrar?<input id="welcome-medicine-name" maxlength="100" value="' + escapeHtml(state.medicineName) + '" placeholder="Escribe solo algo que ya utilizas por indicación o decisión propia"></label>' +
      '<label data-reminder-detail="medicine">¿A qué hora?<select id="welcome-medicine-time">' + timeOptions(state.medicineTime) + '</select></label>' +
      '<label data-reminder-detail="study">¿Qué técnica de estudio prefieres?<select id="welcome-technique">' + [["pomodoro", "Pomodoro: 25 min y pausa de 5"],["deep", "Enfoque: 50 min y pausa de 10"],["custom", "Prefiero decidir mis propios tiempos"]].map(function (item) { return '<option value="' + item[0] + '" ' + (state.technique === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label>' +
      '<label data-reminder-detail="custom">¿Qué quieres recordar?<input id="welcome-custom-reminder" maxlength="70" value="' + escapeHtml(state.customReminder) + '" placeholder="Ej.: enviar informe a mi equipo"></label>' +
      '<label data-reminder-detail="custom">¿A qué hora?<select id="welcome-custom-reminder-time">' + timeOptions(state.customReminderTime) + '</select></label>' +
      '<p class="welcome-flow-note">Los avisos se mostrarán mientras tengas esta página abierta. Permite las notificaciones del navegador cuando te lo pida. En medicamentos o suplementos, PLANIFY solo agenda lo que tú ya tengas indicado; no recomienda productos ni dosis y te recuerda consultar con un profesional.</p></div>' +
      '<footer class="welcome-flow-footer"><button class="welcome-flow-secondary" data-welcome-action="back">← Atrás</button><button class="welcome-flow-primary" data-welcome-action="next">Seguir →</button></footer>';
  }

  function renderDecisionStep() {
    var durations = [[15, "Muy detallado"], [25, "Tipo Pomodoro"], [30, "Equilibrado"], [45, "Profundo"], [50, "Enfoque 50/10"], [60, "Bloques amplios"]];
    return renderHeader(state.step, "¿Quieres verlo ya o seguimos afinándolo?", "Ya podemos crear una buena base. Tú decides si prefieres verla ahora o contarnos un poco más.") +
      '<div class="welcome-flow-fields"><fieldset><legend>¿Cuánto debería durar normalmente cada bloque?</legend><div class="welcome-flow-duration-grid">' + durations.map(function (item) {
        return '<label><input type="radio" name="welcome-block-duration" value="' + item[0] + '" ' + (state.blockDuration === item[0] ? "checked" : "") + '><span><strong>' + item[0] + ' min</strong><small>' + item[1] + '</small></span></label>';
      }).join("") + '</div><small class="welcome-flow-field-help">Esto sí cambia la cuadrícula: puedes tener bloques de 15, 25, 30, 45, 50 o 60 minutos y luego editar cada actividad.</small></fieldset>' +
      '<div class="welcome-flow-path-choice"><button type="button" data-welcome-action="generate-now"><span>⚡</span><strong>Ver mi horario ahora</strong><small>Generamos una propuesta con lo que ya respondiste. Seguirá siendo editable.</small></button>' +
      '<button type="button" class="is-recommended" data-welcome-action="more-questions"><em>RECOMENDADO</em><span>✨</span><strong>Seguir con más preguntas</strong><small>Afinaremos energía, frecuencia, comidas, traslados y tiempo libre para acercarnos más a tu vida real.</small></button></div></div>' +
      '<footer class="welcome-flow-footer"><button class="welcome-flow-secondary" data-welcome-action="back">← Atrás</button><span>No perderás ninguna respuesta.</span></footer>';
  }

  function renderRhythmStep() {
    var energies = [["morning", "🌅 Mañana", "Suelo pensar con más claridad temprano"], ["afternoon", "☀️ Tarde", "Rindo mejor después del mediodía"], ["evening", "🌙 Noche", "Me concentro mejor al final del día"], ["variable", "🔄 Depende del día", "Prefiero repartirlo"]];
    var styles = [["gentle", "Empezar con calma", "Primero preparo el día y luego voy a lo importante"], ["priority", "Ir a lo importante", "Quiero aprovechar mi primera franja disponible"]];
    var projectMarkup = state.projects.map(function (project, index) {
      var projectDays = Array.isArray(project.days) ? project.days : [];
      return '<div class="welcome-flow-project-row"><div class="welcome-flow-time-grid"><label>Nombre del proyecto, curso o meta<input data-project-title="' + index + '" maxlength="80" value="' + escapeHtml(project.title) + '" placeholder="Ej.: Tesis, proyecto del cliente, emprendimiento"></label><label>Tipo<select data-project-type="' + index + '">' + [["course","Curso / estudio"],["project","Proyecto"],["venture","Emprendimiento"],["personal","Meta personal"]].map(function (item) { return '<option value="' + item[0] + '" ' + (project.type === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label></div>' +
        '<div class="welcome-flow-project-settings"><label>Veces por semana<select data-project-sessions="' + index + '">' + [1,2,3,4,5,6,7].map(function (count) { return '<option value="' + count + '" ' + (Number(project.sessions) === count ? "selected" : "") + '>' + count + (count === 1 ? " vez" : " veces") + '</option>'; }).join("") + '</select></label><label>Duración de cada vez<select data-project-duration="' + index + '">' + [15,25,30,45,50,60,90,120].map(function (minutes) { return '<option value="' + minutes + '" ' + (Number(project.duration) === minutes ? "selected" : "") + '>' + (minutes < 60 ? minutes + " min" : minutes === 60 ? "1 hora" : (minutes / 60) + " horas") + '</option>'; }).join("") + '</select></label><label>Me conviene más<select data-project-preferred="' + index + '">' + [["any","Cuando haya espacio"],["morning","Por la mañana"],["afternoon","Por la tarde"],["evening","Por la noche"]].map(function (item) { return '<option value="' + item[0] + '" ' + (project.preferred === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label></div>' +
        '<fieldset class="welcome-flow-fixed-days"><legend>Días preferidos <span class="welcome-flow-optional">(opcional)</span></legend><div class="welcome-flow-mini-days">' + DAY_LABELS.map(function (day, dayIndex) { return '<label><input type="checkbox" data-project-day="' + index + '" value="' + dayIndex + '" ' + (projectDays.indexOf(dayIndex) >= 0 ? "checked" : "") + '><span>' + day.slice(0,3) + '</span></label>'; }).join("") + '</div><small>Si no marcas días, buscaremos automáticamente los mejores espacios.</small></fieldset><button type="button" class="welcome-flow-remove-fixed" data-welcome-action="remove-project" data-project-index="' + index + '">Quitar</button></div>';
    }).join("");
    var weeklyMinutes = Number(state.weeklyFrequency || 1) * Number(state.sessionsPerDay || 1) * Number(state.blockDuration || 30);
    return renderHeader(state.step, named("ahora demos espacio a lo que quieres hacer avanzar"), "Aquí separamos días, momentos y duración para que no tengas que adivinar qué significa una cantidad de horas.") +
      '<div class="welcome-flow-fields"><fieldset><legend>¿En qué momento sueles rendir mejor?</legend><div class="welcome-flow-rich-options">' + energies.map(function (item) {
        return '<label><input type="radio" name="welcome-energy" value="' + item[0] + '" ' + (state.energyPeak === item[0] ? "checked" : "") + '><span><strong>' + item[1] + '</strong><small>' + item[2] + '</small></span></label>';
      }).join("") + '</div></fieldset>' +
      '<div class="welcome-flow-time-grid"><label>En cada uno de esos días, ¿cuántos momentos quieres reservar?<select id="welcome-sessions-per-day">' + [1,2,3].map(function (count) { return '<option value="' + count + '" ' + (state.sessionsPerDay === count ? "selected" : "") + '>' + count + (count === 1 ? " momento" : " momentos") + '</option>'; }).join("") + '</select><small class="welcome-flow-field-help">Un “momento” es un bloque de ' + state.blockDuration + ' minutos dedicado a ese resultado.</small></label><div class="welcome-flow-total-card"><strong>Eso equivale aproximadamente a</strong><span>' + state.weeklyFrequency + ' días × ' + state.sessionsPerDay + ' ' + (state.sessionsPerDay === 1 ? "momento" : "momentos") + ' × ' + state.blockDuration + ' min</span><b>' + Math.floor(weeklyMinutes / 60) + ' h ' + (weeklyMinutes % 60) + ' min por semana</b></div></div>' +
      '<section class="welcome-flow-question-group"><div class="welcome-flow-group-heading"><strong>¿Tienes cursos, proyectos o emprendimientos que quieras avanzar durante la semana?</strong><small>Cada uno tendrá su propia frecuencia, duración y momento preferido.</small></div>' + projectMarkup + '<button type="button" class="welcome-flow-add-fixed" data-welcome-action="add-project">＋ Añadir proyecto, curso o meta</button></section>' +
      '<fieldset><legend>Cuando comienza tu día, ¿cómo prefieres arrancar?</legend><div class="welcome-flow-rich-options welcome-flow-two-options">' + styles.map(function (item) {
        return '<label><input type="radio" name="welcome-start-style" value="' + item[0] + '" ' + (state.startStyle === item[0] ? "checked" : "") + '><span><strong>' + item[1] + '</strong><small>' + item[2] + '</small></span></label>';
      }).join("") + '</div></fieldset></div>' +
      '<footer class="welcome-flow-footer"><button class="welcome-flow-secondary" data-welcome-action="back">← Atrás</button><button class="welcome-flow-secondary" data-welcome-action="skip-rhythm">Omitir este paso</button><button class="welcome-flow-secondary" data-welcome-action="preview-extra-now">Ver horario ahora</button><button class="welcome-flow-primary" data-welcome-action="next">Una parte más →</button></footer>';
  }

  function renderLifeStep() {
    var meals = [["breakfast", "☕ Desayuno"], ["lunch", "🍽️ Almuerzo"], ["dinner", "🌙 Cena"]];
    var foodProfiles = [
      ["none", "Sin consideraciones especiales", "Solo reservaré tus comidas y pausas."],
      ["sensitive", "Hay alimentos que prefiero evitar", "Usaré tus propias notas, sin inventar una dieta."],
      ["ibs", "Tengo colon irritable o sensibilidad digestiva", "Reservaré comidas y un registro de tolerancia; no haré recomendaciones clínicas."],
      ["professional", "Sigo indicaciones de un profesional", "El horario respetará lo que ya te indicaron."]
    ];
    var sleepChallenges = [["none", "Duermo bien la mayoría de noches"], ["falling", "Me cuesta conciliar el sueño"], ["waking", "Me despierto durante la noche"], ["irregular", "Mis horarios de sueño cambian mucho"]];
    var movementStyles = [["unsure", "No sé por dónde empezar", "Propondremos movimiento suave y fácil de probar."], ["activebreaks", "Pausas activas", "Caminatas o estiramientos cortos entre bloques."], ["home", "Ejercicio en casa", "Reservaremos un bloque sencillo en casa."], ["gym", "Gimnasio", "Separaremos tiempo para entrenar y trasladarte."], ["sport", "Deporte", "Apartaremos sesiones para tu deporte."], ["none", "No incluirlo por ahora", "No añadiremos ejercicio automáticamente."]];
    return renderHeader(state.step, "Hagamos que funcione en tu vida real", "Protegemos lo cotidiano para que el horario no se vea bonito solamente, sino que también sea posible cumplirlo.") +
      '<div class="welcome-flow-fields"><section class="welcome-flow-wellbeing"><div class="welcome-flow-group-heading"><strong>Alimentación y energía durante el día</strong><small>Tus respuestas reservarán momentos reales en el horario; no generaremos una dieta médica.</small></div><fieldset><legend>¿Qué comidas quieres que aparezcan?</legend><div class="welcome-flow-choice-pills">' + meals.map(function (item) {
        return '<label><input type="checkbox" name="welcome-meal" value="' + item[0] + '" ' + (state.meals.indexOf(item[0]) >= 0 ? "checked" : "") + '><span>' + item[1] + '</span></label>';
      }).join("") + '</div></fieldset><div class="welcome-flow-time-grid"><label>¿Quieres reservar algún snack entre comidas?<select id="welcome-snacks">' + [[0,"No por ahora"],[1,"Sí, 1 snack"],[2,"Sí, 2 snacks"]].map(function (item) { return '<option value="' + item[0] + '" ' + (state.snacksPerDay === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select><small class="welcome-flow-field-help">Si eliges uno, buscaré una pausa a media mañana; si eliges dos, también una por la tarde.</small></label><label>¿Hasta qué hora prefieres consumir cafeína?<select id="welcome-caffeine-cutoff">' + [["none","No quiero indicarlo"],["12:00","Hasta las 12:00"],["14:00","Hasta las 14:00"],["16:00","Hasta las 16:00"],["18:00","Hasta las 18:00"]].map(function (item) { return '<option value="' + item[0] + '" ' + (state.caffeineCutoff === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select><small class="welcome-flow-field-help">Añadiré un recordatorio discreto con el límite que tú elijas.</small></label></div>' +
      '<fieldset><legend>¿Hay algo que debamos respetar al organizar tus comidas?</legend><div class="welcome-flow-rich-options welcome-flow-food-options">' + foodProfiles.map(function (item) { return '<label><input type="radio" name="welcome-food-profile" value="' + item[0] + '" ' + (state.foodProfile === item[0] ? "checked" : "") + '><span><strong>' + item[1] + '</strong><small>' + item[2] + '</small></span></label>'; }).join("") + '</div></fieldset><label>Alimentos que prefieres evitar o indicaciones que ya sigues <span class="welcome-flow-optional">(opcional)</span><input id="welcome-food-notes" maxlength="100" value="' + escapeHtml(state.foodNotes) + '" placeholder="Ej.: evito lácteos; mi nutricionista indicó..."><small class="welcome-flow-field-help">Solo mostraremos tu nota como recordatorio personal. Para síntomas o suplementos, consulta a un profesional de salud.</small></label><label class="welcome-flow-check-card"><input id="welcome-hydration" type="checkbox" ' + (state.hydration ? "checked" : "") + '><span><strong>Quiero pausas para tomar agua</strong><small>Colocaremos recordatorios suaves durante tus horas activas.</small></span></label></section>' +
      '<section class="welcome-flow-food-guidance"><div><span>🍽️</span><strong>Ideas generales, no una dieta</strong><p>PLANIFY puede sugerir una comida sencilla combinando alimentos que tú toleres: una fuente de proteína, vegetales o fruta, cereal o tubérculo y agua. Si tienes colon irritable, alergias, síntomas o una dieta indicada, prioriza tu registro personal y la orientación de un médico o nutricionista.</p></div><div><span>💊</span><strong>Recordar no es recetar</strong><p>Puedes programar algo que ya uses, pero PLANIFY no elegirá medicamentos, vitaminas, suplementos ni dosis por ti.</p></div></section>' +
      '<div class="welcome-flow-time-grid"><label>¿Cuánto tiempo necesitas para traslados o prepararte?<select id="welcome-commute">' + [[0,"No necesito reservarlo"],[15,"15 minutos"],[30,"30 minutos"],[45,"45 minutos"],[60,"1 hora"],[90,"1 hora y media"]].map(function (item) { return '<option value="' + item[0] + '" ' + (state.commuteMinutes === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label>' +
      '<label>Al terminar tus actividades, ¿cuánto margen quieres dejar sin obligaciones?<select id="welcome-free-minutes">' + [[0,"No reservarlo por ahora"],[30,"30 minutos"],[60,"1 hora"],[90,"1 hora y media"],[120,"2 horas"]].map(function (item) { return '<option value="' + item[0] + '" ' + (state.freeMinutes === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select><small class="welcome-flow-field-help">Por ejemplo, elegir 1 hora significa que la última hora de tu día quedará sin trabajo, estudio ni tareas: podrás descansar, absorber retrasos o decidir qué hacer.</small></label></div>' +
      '<section class="welcome-flow-weekend-card"><div class="welcome-flow-group-heading"><strong>¿Cómo quieres tratar tu fin de semana?</strong><small>Solo lo aplicaremos si activaste sábado o domingo. Cada uno puede tener una intención diferente.</small></div><div class="welcome-flow-time-grid"><label>Mi sábado ideal<select id="welcome-saturday-style">' + [["recover","Recuperar energía y descansar"],["projects","Avanzar proyectos pendientes"],["social","Familia, amistades o salir"],["chores","Casa, compras y diligencias"],["flexible","Dejarlo mayormente abierto"]].map(function (item) { return '<option value="' + item[0] + '" ' + (state.saturdayStyle === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label><label>Mi domingo ideal<select id="welcome-sunday-style">' + [["reset","Descansar y recargar"],["planning","Planificar la nueva semana"],["family","Compartir con familia o amistades"],["prepare","Adelantar comidas, ropa o materiales"],["free","Dejarlo libre"]].map(function (item) { return '<option value="' + item[0] + '" ' + (state.sundayStyle === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label></div></section>' +
      '<section class="welcome-flow-wellbeing"><div class="welcome-flow-group-heading"><strong>Sueño y recuperación</strong><small>Usaremos esto para proteger una rutina nocturna, no para diagnosticar problemas de sueño.</small></div><div class="welcome-flow-time-grid"><label>¿Cuántas horas te gustaría dormir?<select id="welcome-sleep-hours">' + [6,7,8,9,10].map(function (hours) { return '<option value="' + hours + '" ' + (state.sleepHours === hours ? "selected" : "") + '>' + hours + ' horas</option>'; }).join("") + '</select></label>' +
      '<label>¿A qué hora te gustaría estar durmiendo?<select id="welcome-bedtime">' + timeOptions(state.bedtime) + '</select></label></div><fieldset><legend>¿Cómo suelen ser tus noches?</legend><div class="welcome-flow-choice-pills">' + sleepChallenges.map(function (item) { return '<label><input type="radio" name="welcome-sleep-challenge" value="' + item[0] + '" ' + (state.sleepChallenge === item[0] ? "checked" : "") + '><span>' + item[1] + '</span></label>'; }).join("") + '</div></fieldset></section>' +
      '<label class="welcome-flow-check-card"><input id="welcome-quiet-evening" type="checkbox" ' + (state.quietEvening ? "checked" : "") + '><span><strong>🌙 Quiero noches más tranquilas</strong><small>Después de las 7:00 p. m. evitaremos colocar trabajo o estudio, siempre que tus compromisos fijos lo permitan.</small></span></label>' +
      '<section class="welcome-flow-wellbeing"><div class="welcome-flow-group-heading"><strong>Movimiento que sí encaje contigo</strong><small>No necesitas saber de ejercicio: elegiremos el formato, y tú podrás cambiarlo después.</small></div><div class="welcome-flow-rich-options welcome-flow-movement-options">' + movementStyles.map(function (item) { return '<label><input type="radio" name="welcome-movement-style" value="' + item[0] + '" ' + (state.movementStyle === item[0] ? "checked" : "") + '><span><strong>' + item[1] + '</strong><small>' + item[2] + '</small></span></label>'; }).join("") + '</div><label>¿Cuánto tiempo aproximado quieres reservar cuando aparezca?<select id="welcome-movement-minutes">' + [10,15,20,30,45,60].map(function (minutes) { return '<option value="' + minutes + '" ' + (state.movementMinutes === minutes ? "selected" : "") + '>' + minutes + ' minutos</option>'; }).join("") + '</select><small class="welcome-flow-field-help">Lo ajustaremos al tamaño de bloque que elegiste y podrás afinarlo después con precisión de 5 minutos.</small></label></section>' +
      '<p class="welcome-flow-health-note"><strong>Tu seguridad importa.</strong> PLANIFY puede ordenar comidas, pausas, agua, descanso y recordatorios que tú indiques. No diagnostica, no prescribe suplementos y no sustituye a un médico o nutricionista.</p>' +
      '<div class="welcome-flow-final-answer"><span>✅</span><div><strong>Con esto ya tenemos suficiente para una propuesta mucho más personal.</strong><small>Podrás alternar la vista diaria y semanal, editar bloques y regresar si algo no te convence.</small></div></div></div>' +
      '<footer class="welcome-flow-footer"><button class="welcome-flow-secondary" data-welcome-action="back">← Atrás</button><button class="welcome-flow-secondary" data-welcome-action="skip-life">Omitir esta parte</button><button class="welcome-flow-primary" data-welcome-action="preview">Crear mi súper horario →</button></footer>';
  }

  function timeOptions(selected) {
    var html = "";
    for (var minutes = 5 * 60; minutes <= 23 * 60 + 45; minutes += 15) {
      var hour = Math.floor(minutes / 60);
      var minute = minutes % 60;
      var value = String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
      html += '<option value="' + value + '" ' + (value === selected ? "selected" : "") + '>' +
        new Date(2000, 0, 1, hour, minute).toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit" }) + '</option>';
    }
    return html;
  }

  function timeToMinutes(value) {
    var parts = String(value || "").split(":");
    return Number(parts[0]) * 60 + Number(parts[1] || 0);
  }

  function minutesToTime(minutes) {
    return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
  }

  function blockTimeOptions(selected, includeEnd, day) {
    var dayTimes = day === undefined ? {} : state.dayTimes[day] || {};
    var first = timeToMinutes(dayTimes.start || state.start);
    var last = timeToMinutes(dayTimes.end || state.end);
    var html = "";
    var precision = day === undefined ? 15 : 5;
    for (var minutes = first; minutes <= last; minutes += precision) {
      if (!includeEnd && minutes === last) continue;
      var value = minutesToTime(minutes);
      html += '<option value="' + value + '" ' + (value === selected ? "selected" : "") + '>' + value + '</option>';
    }
    return html;
  }

  function normalizeCommandText(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function commandClock(hour, minute, period) {
    var parsedHour = Number(hour);
    var parsedMinute = Number(minute || 0);
    var normalizedPeriod = normalizeCommandText(period).replace(/[^apm]/g, "");
    if (normalizedPeriod.indexOf("p") === 0 && parsedHour < 12) parsedHour += 12;
    if (normalizedPeriod.indexOf("a") === 0 && parsedHour === 12) parsedHour = 0;
    if (!normalizedPeriod && parsedHour <= 7) parsedHour += 12;
    return parsedHour * 60 + parsedMinute;
  }

  function parseScheduleCommand(value) {
    var raw = scheduleText(value, 180);
    var normalized = normalizeCommandText(raw);
    var dayNames = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
    var day = dayNames.findIndex(function (name) { return normalized.indexOf(name) >= 0; });
    var range = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?\s*(?:a|hasta|\-|–)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/i);
    if (day < 0 || !range) return { error: "Incluye un día y un rango de horas. Ejemplo: “Pon gimnasio el martes de 18:00 a 19:00”." };
    var start = commandClock(range[1], range[2], range[3] || range[6]);
    var end = commandClock(range[4], range[5], range[6] || range[3]);
    if (end <= start || start < 5 * 60 || end > 24 * 60) return { error: "No pude entender bien esas horas. Prueba con formato 18:00 a 19:00." };
    var clear = /\b(quita|elimina|borra|deja libre|tiempo libre)\b/.test(normalized);
    var rawDayPatterns = ["lunes", "martes", "mi[eé]rcoles", "jueves", "viernes", "s[aá]bado", "domingo"];
    var text = raw.replace(range[0], " ").replace(new RegExp(rawDayPatterns[day], "ig"), " ").replace(/\b(quiero|quisiera|por favor|pon|poner|coloca|colocar|agrega|agregar|anade|añade|añadir|programa|programar|el|la|los|las|de|desde|para|en|todos?)\b/gi, " ").replace(/\s+/g, " ").trim();
    if (!text && !clear) text = "Actividad personal";
    var category = clear ? "libre" : /estudi|curso|repas|tarea|examen/i.test(text) ? "estudio" : /trabaj|reuni|cliente|informe|proyecto/i.test(text) ? "clase" : /comer|almuer|cena|desay/i.test(text) ? "comida" : /descans|libre/i.test(text) ? "desconexion" : /gimnas|ejerc|correr|entren/i.test(text) ? "flexible" : "rutina";
    return { day: day, start: start, end: end, text: clear ? "" : text, category: category };
  }

  function commandEditorMarkup(context) {
    return '<section class="welcome-flow-command"><span>🪄</span><div><strong>' + (context === "saved" ? "Pide un cambio en tus propias palabras" : "¿Quieres ajustar algo escribiéndolo?") + '</strong><small>Entiendo cambios con día y horas. No necesitas editar la tabla manualmente.</small><div class="welcome-flow-command-row"><input id="' + (context === "saved" ? "schedule-change-command" : "welcome-change-command") + '" maxlength="180" placeholder="Ej.: Pon gimnasio el martes de 18:00 a 19:00"><button type="button" data-welcome-action="' + (context === "saved" ? "apply-saved-command" : "apply-command") + '">Hacer cambio</button></div><em>' + escapeHtml(state.commandMessage || "También puedes escribir: “Deja libre el domingo de 15:00 a 17:00”.") + '</em></div></section>';
  }

  function openScheduleAssistant() {
    var old = document.getElementById("schedule-change-overlay");
    if (old) old.remove();
    var overlay = document.createElement("section");
    overlay.id = "schedule-change-overlay";
    overlay.className = "welcome-flow-overlay schedule-change-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "schedule-change-title");
    overlay.innerHTML = '<div class="welcome-flow-card schedule-change-card"><header class="welcome-flow-header"><button type="button" class="welcome-flow-close" data-welcome-action="close-schedule-assistant" aria-label="Cerrar">×</button><span class="welcome-flow-emoji">🪄</span><h2 id="schedule-change-title">Dime qué quieres cambiar</h2><p>Haré el cambio en tu horario y guardaré una copia antes.</p></header>' + commandEditorMarkup("saved") + '<footer class="welcome-flow-footer"><button type="button" class="welcome-flow-secondary" data-welcome-action="close-schedule-assistant">Cancelar</button></footer></div>';
    document.body.appendChild(overlay);
    var input = overlay.querySelector("#schedule-change-command");
    if (input) input.focus();
  }

  function applyCommandToSavedSchedule(command) {
    var parsed = parseScheduleCommand(command);
    if (parsed.error) return parsed.error;
    var saved = parseJson(localStorage.getItem("horario_data_semanal"));
    if (!saved || !Array.isArray(saved.filas)) return "Primero necesitas crear o guardar un horario semanal.";
    var edges = [];
    saved.filas.forEach(function (row) {
      var times = String(row.hora || "").match(/\d{2}:\d{2}/g) || [];
      if (times.length === 2) edges.push(timeToMinutes(times[0]), timeToMinutes(times[1]));
    });
    edges.push(parsed.start, parsed.end);
    edges = Array.from(new Set(edges)).sort(function (a, b) { return a - b; });
    var oldRows = saved.filas;
    var rebuilt = [];
    for (var i = 0; i < edges.length - 1; i += 1) {
      var start = edges[i], end = edges[i + 1];
      var source = oldRows.find(function (row) { var times = String(row.hora || "").match(/\d{2}:\d{2}/g) || []; return times.length === 2 && start >= timeToMinutes(times[0]) && end <= timeToMinutes(times[1]); });
      if (!source) continue;
      var cells = Array.isArray(source.celdas) ? source.celdas.map(function (cell) { return Object.assign({}, cell); }) : DAYS.map(function () { return { t:"", c:"libre", done:false, reminder:false, rowspan:1 }; });
      if (start >= parsed.start && end <= parsed.end) cells[parsed.day] = { t: parsed.text, c: parsed.category, done: false, reminder: false, rowspan: 1 };
      rebuilt.push({ hora: minutesToTime(start) + " – " + minutesToTime(end), celdas: cells });
    }
    if (!rebuilt.length) return "Ese horario queda fuera de las horas actuales de tu planificador.";
    var backupKey = "planify_cambio_respaldo_" + Date.now();
    localStorage.setItem(backupKey, JSON.stringify({ savedAt: new Date().toISOString(), weeklySchedule: localStorage.getItem("horario_data_semanal") }));
    localStorage.setItem("horario_data_semanal", JSON.stringify({ dias: saved.dias || DAYS.slice(), filas: rebuilt }));
    return "ok";
  }

  function movementPlanLabel() {
    if (!state.lifeDetailsUsed) return "Ejercicio o movimiento";
    return {
      unsure: "Movimiento suave para empezar",
      activebreaks: "Pausa activa · caminar o estirar",
      home: "Movimiento o ejercicio en casa",
      gym: "Entrenamiento en gimnasio",
      sport: "Deporte o entrenamiento"
    }[state.movementStyle] || "Ejercicio o movimiento";
  }

  function subtleIcon(category, text) {
    if (!text || /^[◌▣◇☕↗✦☾]/.test(text)) return text;
    var icon = { estudio: "▣", clase: "◇", comida: "☕", flexible: "↗", rutina: "◌", desconexion: "☾" }[category] || "·";
    return icon + " " + text;
  }

  function mergeConsecutiveCells(rows) {
    for (var day = 0; day < DAYS.length; day += 1) {
      for (var index = 0; index < rows.length; index += 1) {
        var first = rows[index].celdas[day];
        if (!first || !first.t || first.rowspan === 0) continue;
        var span = 1;
        while (index + span < rows.length) {
          var next = rows[index + span].celdas[day];
          if (!next || next.rowspan === 0 || next.t !== first.t || next.c !== first.c) break;
          first.reminder = Boolean(first.reminder || next.reminder);
          if (next.reminderLabel && (!first.reminderLabel || first.reminderLabel.indexOf(next.reminderLabel) < 0)) first.reminderLabel = [first.reminderLabel, next.reminderLabel].filter(Boolean).join(" · ");
          span += 1;
        }
        if (span > 1) {
          first.rowspan = span;
          for (var follower = 1; follower < span; follower += 1) rows[index + follower].celdas[day] = { t: "", c: first.c, done: false, reminder: false, rowspan: 0 };
          index += span - 1;
        }
      }
    }
  }

  function buildProposal() {
    var activeDays = state.days.slice();
    var fixedEntries = expandedFixed();
    var allProjects = state.projects.concat(state.ventures.filter(function (venture) { return venture.name; }).map(function (venture) {
      return { title: "Emprendimiento · " + venture.name, type: "venture", sessions: 2, duration: state.blockDuration, preferred: state.energyPeak, days: [] };
    }));
    fixedEntries.forEach(function (item) {
      if (item.title && activeDays.indexOf(Number(item.day)) < 0) activeDays.push(Number(item.day));
    });
    allProjects.forEach(function (project) {
      (Array.isArray(project.days) ? project.days : []).forEach(function (day) { if (activeDays.indexOf(Number(day)) < 0) activeDays.push(Number(day)); });
    });
    state.manualRequests.forEach(function (item) { if (activeDays.indexOf(Number(item.day)) < 0) activeDays.push(Number(item.day)); });
    activeDays.sort(function (a, b) { return a - b; });
    if (!activeDays.length) activeDays = [0, 1, 2, 3, 4];
    var dayBounds = {};
    activeDays.forEach(function (day) {
      var times = state.dayTimes[day] || {};
      var chosenStart = timeToMinutes(times.start || state.start);
      var chosenEnd = timeToMinutes(times.end || state.end);
      dayBounds[day] = { start: chosenStart, end: chosenEnd };
    });
    var startMinutes = Math.min.apply(null, activeDays.map(function (day) { return dayBounds[day].start; }));
    var endMinutes = Math.max.apply(null, activeDays.map(function (day) { return dayBounds[day].end; }));
    var edges = [];
    var selectedDuration = [15, 25, 30, 45, 50, 60].indexOf(Number(state.blockDuration)) >= 0 ? Number(state.blockDuration) : 30;
    for (var cursor = startMinutes; cursor < endMinutes; cursor += selectedDuration) edges.push(cursor);
    edges.push(endMinutes);
    activeDays.forEach(function (day) { edges.push(dayBounds[day].start, dayBounds[day].end); });
    fixedEntries.forEach(function (item) {
      if (!item.title || activeDays.indexOf(Number(item.day)) < 0) return;
      var fixedStart = timeToMinutes(item.start);
      var fixedEnd = timeToMinutes(item.end);
      if (fixedStart > startMinutes && fixedStart < endMinutes) edges.push(fixedStart);
      if (fixedEnd > startMinutes && fixedEnd < endMinutes) edges.push(fixedEnd);
    });
    state.manualRequests.forEach(function (item) {
      if (activeDays.indexOf(item.day) >= 0) edges.push(item.start, item.end);
    });
    var reminderTimes = [];
    if ((state.lifeDetailsUsed && state.hydration) || (state.mode === "detailed" && state.reminders.water)) {
      activeDays.forEach(function (day) {
        for (var waterAt = dayBounds[day].start + Number(state.waterEvery); waterAt < dayBounds[day].end; waterAt += Number(state.waterEvery)) reminderTimes.push({ type: "water", at: waterAt, day: day });
      });
    }
    if (state.lifeDetailsUsed && state.caffeineCutoff && state.caffeineCutoff !== "none") activeDays.forEach(function (day) {
      var caffeineAt = timeToMinutes(state.caffeineCutoff);
      if (caffeineAt >= dayBounds[day].start && caffeineAt < dayBounds[day].end) reminderTimes.push({ type: "caffeine", at: caffeineAt, day: day });
    });
    if (state.mode === "detailed" && state.reminders.medicine) activeDays.forEach(function (day) { reminderTimes.push({ type: "medicine", at: timeToMinutes(state.medicineTime), day: day }); });
    if (state.mode === "detailed" && state.reminders.custom && state.customReminder) activeDays.forEach(function (day) { reminderTimes.push({ type: "custom", at: timeToMinutes(state.customReminderTime), day: day }); });
    edges = Array.from(new Set(edges)).filter(function (edge) { return edge >= startMinutes && edge <= endMinutes; }).sort(function (a, b) { return a - b; });
    var rows = [];
    for (var edgeIndex = 0; edgeIndex < edges.length - 1; edgeIndex += 1) {
      rows.push({ hora: minutesToTime(edges[edgeIndex]) + " – " + minutesToTime(edges[edgeIndex + 1]), celdas: DAYS.map(function () { return { t: "", c: "libre", done: false, reminder: false, rowspan: 1 }; }) });
    }
    rows.forEach(function (row, rowIndex) {
      var customTime = state.rowTimes[rowIndex];
      if (customTime && customTime.start && customTime.end) row.hora = customTime.start + " – " + customTime.end;
    });
    var priorities = {
      study: { text: "Estudio o aprendizaje", category: "estudio" },
      work: { text: "Trabajo o proyecto", category: "clase" },
      balance: { text: "Avance en una prioridad", category: "flexible" },
      personal: { text: "Hábito o proyecto personal", category: "flexible" }
    };
    var focus = priorities[state.priority] || priorities.study;
    var balancedByOccupation = {
      study: "Estudio y vida personal",
      work: "Trabajo y vida personal",
      both: "Estudio, trabajo y vida personal",
      home: "Hogar, cuidados y tiempo personal",
      other: "Mis actividades y tiempo personal"
    };
    var goalText = state.goal || (state.priority === "balance" ? balancedByOccupation[state.occupation] || balancedByOccupation.other : focus.text);
    var focusDays = activeDays.slice(0, Math.max(1, Math.min(activeDays.length, Number(state.weeklyFrequency) || activeDays.length)));
    var targetMinutesPerDay = selectedDuration * Math.max(1, Number(state.sessionsPerDay) || 1);
    var activityTemplates = {
      study: { text: "Estudio y práctica", category: "estudio" },
      work: { text: "Trabajo o proyecto", category: "clase" },
      exercise: { text: movementPlanLabel(), category: "flexible" },
      home: { text: "Tareas de casa", category: "rutina" },
      family: { text: "Tiempo con familia o amistades", category: "flexible" },
      creative: { text: "Hobby o actividad creativa", category: "flexible" },
      free: { text: "Tiempo libre", category: "desconexion" }
    };
    activeDays.forEach(function (day) {
      var dayStart = dayBounds[day].start;
      var dayEnd = dayBounds[day].end;
      var focusDayIndex = focusDays.indexOf(day);
      var focusTargetMinutes = focusDayIndex < 0 ? 0 : targetMinutesPerDay;
      var focusStart = state.energyPeak === "afternoon" ? Math.max(dayStart, 13 * 60) : state.energyPeak === "evening" ? Math.max(dayStart, 17 * 60) : dayStart;
      if (state.energyPeak === "variable") focusStart = dayStart + (activeDays.indexOf(day) % 2 ? selectedDuration * 2 : selectedDuration);
      if (state.startStyle === "gentle") focusStart += selectedDuration;
      var protectedFreeStart = state.freeMinutes ? dayEnd - Number(state.freeMinutes) : dayEnd + 1;
      if (state.quietEvening) protectedFreeStart = Math.min(protectedFreeStart, 19 * 60);
      var desiredBedtime = timeToMinutes(state.bedtime);
      if (state.wantMoreQuestions && desiredBedtime > dayStart && desiredBedtime < dayEnd) {
        var extraWindDown = Math.max(0, Number(state.sleepHours || 8) - 8) * 30;
        protectedFreeStart = Math.min(protectedFreeStart, desiredBedtime - extraWindDown);
      }
      var placed = 0;
      var breakfastPlaced = false;
      var lunchPlaced = false;
      var dinnerPlaced = false;
      var snacksPlaced = 0;
      var commutePlaced = 0;
      var activityPointer = 0;
      var movementBlocksRemaining = state.activities.indexOf("exercise") >= 0 && state.movementStyle !== "none" ? Math.max(1, Math.ceil(Number(state.movementMinutes || 10) / selectedDuration)) : 0;
      var focusBlocksSinceBreak = 0;
      var needsShortBreak = false;
      var likesAdded = false;
      var weekendPlaced = false;
      var windDownPlaced = false;
      var projectQueue = [];
      allProjects.forEach(function (project) {
        var chosenDays = Array.isArray(project.days) && project.days.length ? project.days : activeDays.slice(0, Math.max(1, Math.min(activeDays.length, Number(project.sessions) || 1)));
        if (chosenDays.indexOf(day) < 0) return;
        var repetitions = Math.max(1, Math.ceil(Number(project.duration || selectedDuration) / selectedDuration));
        for (var projectIndex = 0; projectIndex < repetitions; projectIndex += 1) projectQueue.push(project);
      });
      rows.forEach(function (row, rowIndex) {
        var parts = row.hora.match(/\d{2}:\d{2}/g) || [];
        var slotStart = timeToMinutes(parts[0]);
        var slotEnd = timeToMinutes(parts[1]);
        var fullGeneratedSlot = slotEnd - slotStart === selectedDuration;
        if (slotStart < dayStart || slotEnd > dayEnd) return;
        var fixed = fixedEntries.find(function (item) {
          return item.title && Number(item.day) === day && slotStart >= timeToMinutes(item.start) && slotEnd <= timeToMinutes(item.end);
        });
        var manual = state.manualRequests.find(function (item) { return item.day === day && slotStart >= item.start && slotEnd <= item.end; });
        var text = "";
        var category = "libre";
        var reminder = false;
        var reminderLabels = [];
        if (fixed) {
          text = fixed.title;
          category = /clase|estudio|curso/i.test(text) ? "estudio" : /trabajo|reuni|empresa|informe/i.test(text) ? "clase" : "rutina";
          needsShortBreak = false;
          focusBlocksSinceBreak = 0;
        } else if (manual) {
          text = manual.text;
          category = manual.category;
          needsShortBreak = false;
          focusBlocksSinceBreak = 0;
        } else if (fullGeneratedSlot && slotStart === dayStart) {
          var morningPrep = {
            study: "Prepararme para estudiar",
            work: "Prepararme para trabajar",
            both: "Prepararme para estudiar y trabajar",
            home: "Preparar el día en casa",
            other: "Aseo y preparación para mi día"
          };
          text = state.occupation === "other" && state.occupationOther ? "Preparar mi día · " + state.occupationOther : morningPrep[state.occupation] || morningPrep.other;
          if (state.lifeDetailsUsed) text += " · después de " + state.sleepHours + " h de sueño";
          category = "rutina";
          needsShortBreak = false;
          focusBlocksSinceBreak = 0;
        } else if (fullGeneratedSlot && state.meals.indexOf("breakfast") >= 0 && !breakfastPlaced && slotStart >= dayStart + 45 && slotStart < dayStart + 150) {
          text = "Desayuno y plan del día";
          category = "comida";
          breakfastPlaced = true;
          needsShortBreak = false;
          focusBlocksSinceBreak = 0;
        } else if (fullGeneratedSlot && state.commuteMinutes > commutePlaced && breakfastPlaced && slotStart < 12 * 60) {
          text = "Traslado o preparación";
          category = "rutina";
          commutePlaced += Math.max(5, slotEnd - slotStart);
          needsShortBreak = false;
        } else if (fullGeneratedSlot && snacksPlaced < Number(state.snacksPerDay) && ((snacksPlaced === 0 && slotStart >= 10 * 60 && slotStart < 12 * 60) || (snacksPlaced === 1 && slotStart >= 16 * 60 && slotStart < 18 * 60))) {
          text = state.foodProfile === "none" ? "Snack y pausa" : "Snack elegido por ti · registrar tolerancia";
          category = "comida";
          snacksPlaced += 1;
          needsShortBreak = false;
          focusBlocksSinceBreak = 0;
        } else if (fullGeneratedSlot && state.meals.indexOf("lunch") >= 0 && !lunchPlaced && (Math.floor(slotStart / 60) === 12 || Math.floor(slotStart / 60) === 13)) {
          text = "Almuerzo y descanso";
          category = "comida";
          lunchPlaced = true;
          needsShortBreak = false;
          focusBlocksSinceBreak = 0;
        } else if (fullGeneratedSlot && state.meals.indexOf("dinner") >= 0 && !dinnerPlaced && Math.floor(slotStart / 60) >= 19 && slotStart < 21 * 60) {
          text = "Cena y pausa";
          category = "comida";
          dinnerPlaced = true;
          needsShortBreak = false;
          focusBlocksSinceBreak = 0;
        } else if (fullGeneratedSlot && day >= 5 && !weekendPlaced && slotStart >= Math.max(dayStart + 120, 10 * 60) && slotStart < protectedFreeStart) {
          var weekendChoices = day === 5 ? {
            recover: ["Mañana tranquila y recuperación", "desconexion"], projects: ["Avanzar un proyecto pendiente", "flexible"], social: ["Familia, amistades o salir", "flexible"], chores: ["Casa, compras y diligencias", "rutina"], flexible: ["Espacio abierto para decidir", "desconexion"]
          } : {
            reset: ["Descansar y recargar energía", "desconexion"], planning: ["Preparar y planificar la semana", "rutina"], family: ["Tiempo con familia o amistades", "flexible"], prepare: ["Preparar comidas, ropa o materiales", "rutina"], free: ["Domingo libre", "desconexion"]
          };
          var weekendChoice = weekendChoices[day === 5 ? state.saturdayStyle : state.sundayStyle] || ["Tiempo personal", "desconexion"];
          text = weekendChoice[0];
          category = weekendChoice[1];
          weekendPlaced = true;
        } else if (fullGeneratedSlot && slotStart >= protectedFreeStart) {
          if (!windDownPlaced && state.sleepChallenge !== "none" && slotStart >= Math.max(protectedFreeStart, desiredBedtime - 90)) {
            text = "Rutina nocturna · bajar luces y pantallas";
            windDownPlaced = true;
          } else text = "Tiempo libre protegido";
          category = "desconexion";
          needsShortBreak = false;
          focusBlocksSinceBreak = 0;
        } else if (fullGeneratedSlot && ((state.breakStyle === "often" && needsShortBreak) || (state.breakStyle === "balanced" && focusBlocksSinceBreak >= 2))) {
          var isActivePause = state.movementStyle === "activebreaks" || state.movementStyle === "unsure";
          text = isActivePause ? movementPlanLabel() : "Pausa breve · estirar y despejarme";
          category = isActivePause ? "flexible" : "desconexion";
          needsShortBreak = false;
          focusBlocksSinceBreak = 0;
        } else if (fullGeneratedSlot && projectQueue.length && slotStart >= focusStart && (projectQueue[0].preferred === "any" || projectQueue[0].preferred === "morning" && slotStart < 12 * 60 || projectQueue[0].preferred === "afternoon" && slotStart >= 12 * 60 && slotStart < 18 * 60 || projectQueue[0].preferred === "evening" && slotStart >= 18 * 60)) {
          var plannedProject = projectQueue.shift();
          text = plannedProject.title;
          category = plannedProject.type === "course" ? "estudio" : plannedProject.type === "personal" ? "flexible" : "clase";
          focusBlocksSinceBreak += 1;
          needsShortBreak = true;
        } else if (fullGeneratedSlot && placed < focusTargetMinutes && slotStart >= focusStart) {
          text = goalText;
          if (state.mode === "detailed" && state.priority === "study" && state.reminders.study && state.technique !== "custom") {
            text += state.technique === "deep" ? " · Enfoque 50/10" : " · Pomodoro 25/5";
          }
          category = focus.category;
          placed += slotEnd - slotStart;
          focusBlocksSinceBreak += 1;
          needsShortBreak = true;
          reminder = state.mode === "detailed" && ((state.priority === "study" && state.reminders.study) || (state.priority === "work" && state.reminders.work) || (state.priority === "balance" && (state.reminders.study || state.reminders.work)));
        } else if (fullGeneratedSlot && state.mode === "detailed" && state.likes && !likesAdded && Math.floor(slotStart / 60) >= 17) {
          text = "Recargar energía · " + state.likes;
          category = "flexible";
          likesAdded = true;
        } else if (fullGeneratedSlot && state.activities.length && state.breakStyle !== "flexible" && activityPointer < state.activities.length) {
          var orderedActivities = state.activities.slice();
          if (state.variant % 2) orderedActivities.reverse();
          var activityKey = orderedActivities[activityPointer];
          var activity = activityTemplates[activityKey];
          if (activity && !(activityKey === "exercise" && state.movementStyle === "none")) { text = activity.text; category = activity.category; }
          if (activityKey === "exercise" && movementBlocksRemaining > 1) movementBlocksRemaining -= 1;
          else activityPointer += 1;
        } else if (fullGeneratedSlot && rowIndex === rows.length - 1 && state.breakStyle !== "flexible") {
          text = "Bajar el ritmo y prepararme para descansar";
          category = "desconexion";
        }
        var remindersInSlot = reminderTimes.filter(function (entry) { return entry.day === day && entry.at >= slotStart && entry.at < slotEnd; });
        if ((fullGeneratedSlot || fixed) && remindersInSlot.length) {
          remindersInSlot.forEach(function (entry) {
            var label = entry.type === "water" ? "Tomar agua" : entry.type === "caffeine" ? "Cierre de cafeína elegido" : entry.type === "medicine" ? (state.medicineName || "Tomar medicamento o suplemento indicado") : state.customReminder;
            if (!text) { text = label; category = entry.type === "water" || entry.type === "medicine" || entry.type === "caffeine" ? "rutina" : "clase"; }
            else reminderLabels.push(label);
            reminder = true;
          });
        }
        var edit = state.edits[day + "_" + rowIndex];
        if (edit) {
          category = edit.category;
          text = category === "libre" ? "" : String(edit.text || defaultTextForCategory(category)).trim();
        }
        if (text) row.celdas[day] = { t: subtleIcon(category, text), c: category, done: false, reminder: reminder, reminderLabel: reminderLabels.join(" · "), rowspan: 1 };
      });
    });
    mergeConsecutiveCells(rows);
    return { dias: DAYS.slice(), filas: rows, plannedDays: activeDays };
  }

  function validatePreviewBlocks() {
    readPreviewEdits();
    if (!state.days.length && !state.fixed.some(function (item) { return item.title; })) return "Elige al menos un día para preparar tu horario.";
    var missingFixedDays = state.fixed.find(function (item) { return item.title && !fixedDays(item).length; });
    if (missingFixedDays) return "Marca al menos un día para “" + missingFixedDays.title + "”.";
    for (var dayIndex = 0; dayIndex < state.days.length; dayIndex += 1) {
      var activeDay = state.days[dayIndex];
      var dayTimes = state.dayTimes[activeDay] || {};
      if (timeToMinutes(dayTimes.end || state.end) <= timeToMinutes(dayTimes.start || state.start)) return "En " + DAY_LABELS[activeDay] + ", la hora final debe ser posterior a la inicial.";
    }
    var fixedEntries = expandedFixed();
    for (var fixedIndex = 0; fixedIndex < fixedEntries.length; fixedIndex += 1) {
      var fixed = fixedEntries[fixedIndex];
      if (!fixed.title) continue;
      var fixedStart = timeToMinutes(fixed.start);
      var fixedEnd = timeToMinutes(fixed.end);
      if (fixedEnd <= fixedStart) return "En “" + fixed.title + "”, la hora final debe ser posterior a la inicial.";
      var fixedDayTimes = state.dayTimes[Number(fixed.day)] || {};
      var fixedDayStart = timeToMinutes(fixedDayTimes.start || state.start);
      var fixedDayEnd = timeToMinutes(fixedDayTimes.end || state.end);
      if (fixedStart < fixedDayStart || fixedEnd > fixedDayEnd) return "“" + fixed.title + "” queda fuera de las horas que elegiste para " + DAY_LABELS[Number(fixed.day)] + ". Amplía ese día o ajusta el compromiso.";
      for (var otherIndex = 0; otherIndex < fixedIndex; otherIndex += 1) {
        var other = fixedEntries[otherIndex];
        if (other.title && Number(other.day) === Number(fixed.day) && fixedStart < timeToMinutes(other.end) && fixedEnd > timeToMinutes(other.start)) {
          return "“" + fixed.title + "” se cruza con “" + other.title + "”. Revisa esos dos horarios fijos.";
        }
      }
    }
    var medicineOutsideDay = state.days.find(function (day) { var times = state.dayTimes[day] || {}; return timeToMinutes(state.medicineTime) < timeToMinutes(times.start || state.start) || timeToMinutes(state.medicineTime) >= timeToMinutes(times.end || state.end); });
    if (state.mode === "detailed" && state.reminders.medicine && medicineOutsideDay !== undefined) return "La hora del medicamento queda fuera de las horas activas del " + DAY_LABELS[medicineOutsideDay] + ". Ajusta esa hora o ese día.";
    if (state.mode === "detailed" && state.reminders.custom && !state.customReminder) return "Escribe qué quieres recordar para poder añadirlo a tu horario.";
    var customOutsideDay = state.days.find(function (day) { var times = state.dayTimes[day] || {}; return timeToMinutes(state.customReminderTime) < timeToMinutes(times.start || state.start) || timeToMinutes(state.customReminderTime) >= timeToMinutes(times.end || state.end); });
    if (state.mode === "detailed" && state.reminders.custom && customOutsideDay !== undefined) return "La hora del otro recordatorio queda fuera de las horas activas del " + DAY_LABELS[customOutsideDay] + ". Ajusta esa hora o ese día.";
    var proposal = buildProposal();
    for (var day = 0; day < DAYS.length; day += 1) {
      var blocks = proposal.filas.map(function (row) {
        var times = row.hora.match(/\d{2}:\d{2}/g) || [];
        var cell = row.celdas[day];
        return { start: timeToMinutes(times[0]), end: timeToMinutes(times[1]), active: Boolean(cell && String(cell.t || "").trim()) };
      });
      for (var i = 0; i < blocks.length; i += 1) {
        if (blocks[i].end <= blocks[i].start) return "La hora final debe ser posterior a la hora de inicio.";
      }
      var active = blocks.filter(function (block) { return block.active; }).sort(function (a, b) { return a.start - b.start; });
      for (var j = 1; j < active.length; j += 1) {
        if (active[j].start < active[j - 1].end) return "Hay dos actividades que se cruzan. Ajusta sus horas antes de guardar.";
      }
    }
    return "";
  }

  function showPreviewError(message) {
    var old = document.querySelector(".welcome-flow-preview-error");
    if (old) old.remove();
    var preview = document.querySelector(".welcome-flow-preview") || document.querySelector(".welcome-flow-card");
    if (preview) preview.insertAdjacentHTML("afterend", '<span class="welcome-flow-error welcome-flow-preview-error">' + escapeHtml(message) + '</span>');
  }

  function renderPreview() {
    var proposal = buildProposal();
    if (proposal.plannedDays.indexOf(state.previewDay) < 0) state.previewDay = proposal.plannedDays[0];
    var previewDay = state.previewDay;
    var activeLabels = proposal.plannedDays.map(function (day) { return DAY_LABELS[day]; });
    var previewTimes = state.dayTimes[previewDay] || {};
    var previewStart = timeToMinutes(previewTimes.start || state.start);
    var previewEnd = timeToMinutes(previewTimes.end || state.end);
    var previewRows = proposal.filas.map(function (row, rowIndex) { return { row: row, rowIndex: rowIndex }; }).filter(function (entry) {
      var bounds = entry.row.hora.match(/\d{2}:\d{2}/g) || [];
      return bounds.length === 2 && timeToMinutes(bounds[0]) >= previewStart && timeToMinutes(bounds[1]) <= previewEnd;
    });
    var visiblePreviewRows = state.editing ? previewRows : previewRows.filter(function (entry) {
      var visibleCell = entry.row.celdas[previewDay];
      return !visibleCell || visibleCell.rowspan !== 0;
    });
    var sampleDay = visiblePreviewRows.map(function (entry) {
      var row = entry.row;
      var rowIndex = entry.rowIndex;
      var cell = row.celdas[previewDay];
      var edit = state.edits[previewDay + "_" + rowIndex];
      var category = edit ? edit.category : cell ? cell.c : "libre";
      var text = edit ? edit.text : cell ? cell.t : "";
      if (category !== "libre" && !text) text = defaultTextForCategory(category);
      var times = row.hora.match(/\d{2}:\d{2}/g) || [state.start, state.end];
      var customTime = state.rowTimes[rowIndex];
      var blockStart = customTime && customTime.start ? customTime.start : times[0];
      var blockEnd = customTime && customTime.end ? customTime.end : times[1];
      if (!state.editing && cell && Number(cell.rowspan) > 1) {
        var lastMergedRow = proposal.filas[Math.min(proposal.filas.length - 1, rowIndex + Number(cell.rowspan) - 1)];
        var lastMergedTimes = lastMergedRow && String(lastMergedRow.hora || "").match(/\d{2}:\d{2}/g);
        if (lastMergedTimes && lastMergedTimes[1]) blockEnd = lastMergedTimes[1];
      }
      var reminder = Boolean(cell && cell.reminder);
      var reminderLabel = reminder ? '<span class="welcome-flow-reminder-badge" title="' + escapeHtml(cell && cell.reminderLabel || "Este bloque puede activar un recordatorio") + '">🔔</span>' : "";
      var choices = ACTIVITY_CHOICES.map(function (choice) {
        return '<option value="' + choice[0] + '" ' + (category === choice[0] ? "selected" : "") + '>' + choice[1] + '</option>';
      }).join("");
      if (!state.editing) {
        return '<li class="welcome-flow-simple-row"><span>' + blockStart + ' – ' + blockEnd + '</span><i class="welcome-flow-category-dot welcome-flow-category-' + escapeHtml(category) + '"></i><strong>' + escapeHtml(text || "Tiempo libre") + reminderLabel + '</strong></li>';
      }
      return '<li><div class="welcome-flow-edit-times"><label>Inicio<select data-welcome-edit-start data-welcome-index="' + rowIndex + '">' + blockTimeOptions(blockStart, false, previewDay) + '</select></label>' +
        '<label>Fin<select data-welcome-edit-end data-welcome-index="' + rowIndex + '">' + blockTimeOptions(blockEnd, true, previewDay) + '</select></label></div>' +
        '<select data-welcome-edit-category data-welcome-index="' + rowIndex + '" data-welcome-original-category="' + (cell ? cell.c : "libre") + '" data-welcome-original-text="' + escapeHtml(cell ? cell.t : "") + '" aria-label="Tipo de actividad a las ' + row.hora.split(" – ")[0] + '">' + choices + '</select>' +
        '<input data-welcome-edit-text data-welcome-index="' + rowIndex + '" aria-label="Actividad a las ' + row.hora.split(" – ")[0] + '" type="text" value="' + escapeHtml(text) + '" placeholder="Escribe tu actividad" ' + (category === "libre" ? "disabled" : "") + '>' +
        '<button type="button" class="welcome-flow-gap" data-welcome-gap data-welcome-index="' + rowIndex + '" aria-label="Dejar 15 minutos libres después de esta actividad" ' + (category === "libre" ? "disabled" : "") + '>' + (edit && edit.gap ? "✓ 15 min libres" : "+ 15 min libres") + '</button>' +
        '</li>';
    }).join("");
    var dayTabs = proposal.plannedDays.map(function (day) {
      return '<button type="button" data-preview-day="' + day + '" class="' + (day === previewDay ? "is-selected" : "") + '">' + DAY_LABELS[day] + '</button>';
    }).join("");
    var weeklySkipped = {};
    var weeklyRows = proposal.filas.map(function (row, rowIndex) {
      return '<tr><th>' + escapeHtml(row.hora) + '</th>' + row.celdas.map(function (cell, day) {
        if (weeklySkipped[day + "_" + rowIndex] || cell && cell.rowspan === 0) return "";
        var active = proposal.plannedDays.indexOf(day) >= 0;
        var text = cell && cell.t ? cell.t : "—";
        var reminder = cell && cell.reminder ? '<span class="welcome-flow-reminder-badge" title="' + escapeHtml(cell.reminderLabel || "Recordatorio") + '">🔔</span>' : "";
        var span = Math.max(1, Number(cell && cell.rowspan) || 1);
        for (var offset = 1; offset < span; offset += 1) weeklySkipped[day + "_" + (rowIndex + offset)] = true;
        return '<td rowspan="' + span + '" class="welcome-week-cell welcome-flow-category-' + escapeHtml(cell && cell.c || "libre") + (active ? "" : " is-free-day") + (span > 1 ? " is-merged" : "") + '"><span>' + escapeHtml(text) + reminder + '</span></td>';
      }).join("") + '</tr>';
    }).join("");
    var previewSwitch = '<div class="welcome-flow-view-switch" aria-label="Cambiar vista"><button type="button" data-preview-mode="daily" class="' + (state.previewMode === "daily" ? "is-selected" : "") + '">☀️ Vista diaria</button><button type="button" data-preview-mode="weekly" class="' + (state.previewMode === "weekly" ? "is-selected" : "") + '">📅 Vista semanal</button></div>';
    var specialtyName = specialtyLabel();
    var dailyCompanion = state.editing ? "" : '<section class="welcome-flow-daily-companion"><div class="welcome-flow-companion-intro"><span>☀</span><div><strong>Tu día también tendrá un espacio personal</strong><small>No será solo una lista: podrás registrar cómo llegas, tu intención y cómo terminó el día.</small></div></div><div class="welcome-flow-companion-grid"><article><small>¿Cómo llegas hoy?</small><div class="welcome-flow-moods" aria-label="Ejemplo de estados de ánimo"><button type="button">○ Tranquilo</button><button type="button">△ Cansado</button><button type="button">◇ Motivado</button></div></article><article><small>Intención principal</small><strong>' + escapeHtml(state.goal || priorityLabel(state.priority)) + '</strong><span>' + escapeHtml(specialtyName ? "Enfoque adaptado a " + specialtyName : "Adaptado a tu ocupación") + '</span></article><article><small>Mini balance del día</small><span>Meta principal · energía · productividad</span><span>Agradecimiento · notas · cuidado personal</span></article></div></section>';
    var dailyView = '<div class="welcome-flow-day-tabs">' + dayTabs + '</div>' + dailyCompanion + '<div class="welcome-flow-preview"><div class="welcome-flow-preview-head"><strong>' + (state.editing ? "Edita " : "Vista de ") + DAY_LABELS[previewDay] + '</strong><span>' + ((state.dayTimes[previewDay] || {}).start || state.start) + ' – ' + ((state.dayTimes[previewDay] || {}).end || state.end) + '</span></div>' + (state.editing ? '<p class="welcome-flow-edit-help">La propuesta usa bloques de ' + state.blockDuration + ' minutos. Aquí puedes ajustar sus bordes con precisión de 5 minutos, dejarlos libres o añadir una pausa.</p>' : '<p class="welcome-flow-simple-help">Los periodos seguidos con la misma actividad se muestran como un solo bloque, con inicio y fin claros.</p>') + '<ul>' + sampleDay + '</ul></div>';
    var weeklyView = '<div class="welcome-flow-weekly-wrap"><table class="welcome-flow-weekly"><thead><tr><th>Hora</th>' + DAYS.map(function (day) { return '<th>' + day.slice(0, 3) + '</th>'; }).join("") + '</tr></thead><tbody>' + weeklyRows + '</tbody></table></div>';
    var replacing = hasTasks(parseJson(localStorage.getItem("horario_data_semanal")));
    var previewTitle = state.example ? "Así podría quedar un horario hecho para ti" : (firstName() ? firstName() + ", tu primera propuesta está lista" : "Tu primera propuesta está lista");
    var previewSubtitle = state.example ? "Este ejemplo es solo una demostración y no modificará tu horario." : "Lo armamos con tus respuestas. Puedes usarlo así o hacer ajustes rápidos.";
    var focusDayCount = Math.min(state.weeklyFrequency, proposal.plannedDays.length);
    var quickActions = state.example ? "" : '<div class="welcome-flow-quick"><span>¿Qué te gustaría cambiar?</span><button type="button" data-welcome-action="more-focus">🎯 Más tiempo para mi prioridad</button><button type="button" data-welcome-action="more-rest">🌿 Más espacios libres</button><button type="button" data-welcome-action="balance">⚖️ Repartir mejor</button><button type="button" data-welcome-action="regenerate">🔄 Otra propuesta</button></div>';
    var footer = state.example ? '<footer class="welcome-flow-footer"><button class="welcome-flow-secondary" data-welcome-action="close">Cerrar ejemplo</button><button class="welcome-flow-primary" data-welcome-action="use-example">Crear el mío con estas preguntas →</button></footer>' :
      '<footer class="welcome-flow-footer"><button class="welcome-flow-secondary" data-welcome-action="back">← Cambiar respuestas</button><button class="welcome-flow-secondary" data-welcome-action="toggle-edit">' + (state.editing ? "✓ Terminar edición" : "✏️ Editar detalles") + '</button><button class="welcome-flow-primary" data-welcome-action="apply">' + (replacing ? "Guardar copia y reemplazar" : "Usar este horario") + '</button></footer>';
    var weeklyMinutes = Math.min(state.weeklyFrequency, proposal.plannedDays.length) * Math.max(1, state.sessionsPerDay) * state.blockDuration;
    return renderHeader(proposalStep(), previewTitle, previewSubtitle) +
      '<div class="welcome-flow-preview-summary"><span>🎯 ' + escapeHtml(state.goal || priorityLabel(state.priority)) + '</span><span>🗓️ ' + activeLabels.map(escapeHtml).join(" · ") + '</span><span>⏱️ ' +
      Math.floor(weeklyMinutes / 60) + ' h ' + (weeklyMinutes % 60) + ' min semanales para tu resultado</span><span>🧱 Bloques de ' + state.blockDuration + ' min</span>' +
      (state.mode === "detailed" && Object.keys(state.reminders).some(function (key) { return state.reminders[key]; }) ? '<span>🔔 Recordatorios: ' + Object.keys(state.reminders).filter(function (key) { return state.reminders[key]; }).length + '</span>' : '') +
      (state.lifeDetailsUsed && state.snacksPerDay ? '<span>☕ ' + state.snacksPerDay + (state.snacksPerDay === 1 ? ' snack reservado' : ' snacks reservados') + '</span>' : '') +
      (state.lifeDetailsUsed && state.hydration ? '<span>◌ Pausas de agua</span>' : '') +
      (state.mode === "detailed" && state.reminders.study && state.priority === "study" ? '<span>🧠 Técnica: ' + (state.technique === "deep" ? "Enfoque 50/10" : state.technique === "pomodoro" ? "Pomodoro 25/5" : "A tu ritmo") + '</span>' : '') + '</div>' +
      '<div class="welcome-flow-influence"><strong>Así usamos tus respuestas</strong><span>Reservamos ' + state.sessionsPerDay + (state.sessionsPerDay === 1 ? ' momento' : ' momentos') + ' de ' + state.blockDuration + ' minutos en ' + focusDayCount + (focusDayCount === 1 ? ' día' : ' días') + ', preferentemente ' + ({ morning: "por la mañana", afternoon: "por la tarde", evening: "por la noche", variable: "en momentos variados" }[state.energyPeak] || "cuando tengas espacio") + '.</span><span>' + (state.freeMinutes ? "Dejamos los últimos " + state.freeMinutes + " minutos del día sin obligaciones." : "Dejamos los espacios restantes abiertos para que los decidas después.") + '</span>' + (state.projects.length ? '<span>Distribuimos ' + state.projects.length + (state.projects.length === 1 ? ' curso, proyecto o meta' : ' cursos, proyectos o metas') + ' según su frecuencia y momento preferido.</span>' : '') + (state.lifeDetailsUsed && state.snacksPerDay ? '<span>Reservamos ' + state.snacksPerDay + (state.snacksPerDay === 1 ? ' snack' : ' snacks') + ' y conservamos tu nota de alimentación como referencia personal.</span>' : '') + (state.lifeDetailsUsed && state.hydration ? '<span>Añadimos pausas de agua durante tus horas activas.</span>' : '') + (state.lifeDetailsUsed && state.caffeineCutoff !== "none" ? '<span>Marcamos el límite de cafeína que elegiste: ' + escapeHtml(state.caffeineCutoff) + '.</span>' : '') + (state.lifeDetailsUsed && state.movementStyle !== "none" ? '<span>Incluimos ' + escapeHtml(movementPlanLabel().toLowerCase()) + ' en espacios compatibles.</span>' : '') + (state.lifeDetailsUsed && state.sleepChallenge !== "none" ? '<span>Protegemos una rutina nocturna según lo que nos contaste sobre tu sueño.</span>' : '') + (proposal.plannedDays.indexOf(5) >= 0 ? '<span>Personalizamos el sábado: ' + escapeHtml(({recover:"recuperar energía",projects:"avanzar proyectos",social:"vida social",chores:"casa y diligencias",flexible:"mantenerlo flexible"}[state.saturdayStyle] || "a tu manera")) + '.</span>' : '') + (proposal.plannedDays.indexOf(6) >= 0 ? '<span>Personalizamos el domingo: ' + escapeHtml(({reset:"descansar",planning:"planificar la semana",family:"familia o amistades",prepare:"preparar la semana",free:"mantenerlo libre"}[state.sundayStyle] || "a tu manera")) + '.</span>' : '') + (state.lifeDetailsUsed ? '<span>Respetamos comidas, traslados y tu objetivo de dormir ' + state.sleepHours + ' horas desde las ' + state.bedtime + '.</span>' : state.wantMoreQuestions ? '<span>Omitiste los detalles de vida diaria; podrás añadirlos después.</span>' : '<span>Elegiste generar ahora; estas preferencias se pueden afinar después.</span>') + '</div>' +
      quickActions + (state.example ? "" : commandEditorMarkup("preview")) + previewSwitch + (state.previewMode === "weekly" && !state.editing ? weeklyView : dailyView) +
      '<p class="welcome-flow-repeat-note">' + (state.fixed.length ? 'Se respetaron ' + expandedFixed().length + ' apariciones de tus compromisos fijos. ' : '') + 'Después podrás ajustar cada día por separado desde tu horario semanal.</p>' +
      (state.example ? '<p class="welcome-flow-safe-note">Puedes explorar este ejemplo con tranquilidad: no se guardará ni cambiará tus datos.</p>' : replacing ? '<div class="welcome-flow-warning"><strong>Ya tienes un horario semanal guardado.</strong><span>Si aplicas esta propuesta, lo reemplazaremos. Guardaremos antes una copia local recuperable.</span></div>' :
        '<p class="welcome-flow-safe-note">Todavía no se ha guardado nada. Tu horario solo cambia si eliges usar esta propuesta.</p>') +
      footer;
  }

  function parseJson(value) {
    try { return JSON.parse(value || "null"); } catch (error) { return null; }
  }

  function render() {
    var overlay = document.getElementById("welcome-flow-overlay") || createOverlay();
    var previousCard = overlay.querySelector(".welcome-flow-card");
    var previousScroll = previousCard ? previousCard.scrollTop : 0;
    var content = state.step === 0 ? renderModeStep() :
      state.step === 1 ? renderCoreStep() :
      state.step === 2 && state.mode !== "quick" ? renderCommitmentsStep() :
      state.step === 3 && state.mode === "detailed" ? renderRemindersStep() :
      state.step === decisionStep() ? renderDecisionStep() :
      state.step === rhythmStep() ? renderRhythmStep() :
      state.step === lifeStep() ? renderLifeStep() : renderPreview();
    overlay.innerHTML = '<div class="welcome-flow-card">' +
      content +
      '</div>';
    var nextCard = overlay.querySelector(".welcome-flow-card");
    if (nextCard && previousScroll) nextCard.scrollTop = previousScroll;
    syncReminderDetails();
  }

  function syncReminderDetails() {
    var overlay = document.getElementById("welcome-flow-overlay");
    if (!overlay) return;
    overlay.querySelectorAll("[data-reminder-detail]").forEach(function (detail) {
      var key = detail.getAttribute("data-reminder-detail");
      var input = overlay.querySelector('input[name="welcome-reminder"][value="' + key + '"]');
      detail.hidden = !input || !input.checked;
    });
  }

  function open(preferredMode) {
    state.step = 0;
    state.mode = ["manual", "guided", "detailed"].indexOf(preferredMode) >= 0 ? preferredMode : "guided";
    state.userName = localStorage.getItem("planify_nombre") || "";
    state.priority = "study";
    state.roles = ["study"];
    state.occupation = "study";
    state.occupationOther = "";
    state.career = "engineering";
    state.careerOther = "";
    state.specialty = "industrial";
    state.specialtyOther = "";
    state.studyContext = "classes";
    state.jobRole = "";
    state.jobPattern = "fixed";
    state.ventures = [];
    state.goal = "";
    state.days = [0, 1, 2, 3, 4];
    state.start = localStorage.getItem("horario_inicio") || "07:00";
    state.end = localStorage.getItem("horario_fin") || "22:00";
    state.blockDuration = 30;
    state.wantMoreQuestions = false;
    state.energyPeak = "morning";
    state.weeklyFrequency = 5;
    state.sessionsPerDay = 1;
    state.startStyle = "gentle";
    state.meals = ["breakfast", "lunch", "dinner"];
    state.snacksPerDay = 0;
    state.foodProfile = "none";
    state.foodNotes = "";
    state.hydration = true;
    state.caffeineCutoff = "16:00";
    state.sleepChallenge = "none";
    state.movementStyle = "activebreaks";
    state.movementMinutes = 10;
    state.commuteMinutes = 0;
    state.freeMinutes = 60;
    state.quietEvening = false;
    state.saturdayStyle = "recover";
    state.sundayStyle = "reset";
    state.sleepHours = 8;
    state.bedtime = "23:00";
    state.lifeDetailsUsed = false;
    state.dayTimes = {};
    state.showDayCustomization = false;
    state.fixed = [];
    state.projects = [];
    state.manualRequests = [];
    state.activities = ["exercise", "free"];
    state.breakStyle = "balanced";
    state.likes = "";
    state.reminders = { water: false, medicine: false, study: false, work: false, custom: false };
    state.waterEvery = 120;
    state.medicineName = "";
    state.medicineTime = "09:00";
    state.customReminder = "";
    state.customReminderTime = "15:00";
    state.technique = "pomodoro";
    state.variant = 0;
    state.edits = {};
    state.rowTimes = {};
    state.example = false;
    state.editing = false;
    state.previewMode = "daily";
    state.previewDay = 0;
    state.commandMessage = "";
    render();
    var first = document.querySelector("#welcome-flow-overlay input:checked");
    if (first) first.focus();
  }

  function close(markDismissed) {
    var overlay = document.getElementById("welcome-flow-overlay");
    if (overlay) overlay.remove();
    if (markDismissed) {
      try { localStorage.setItem("planify_bienvenida_estado", "descartada"); } catch (error) {}
    }
  }

  function applyProposal() {
    if (state.example) return;
    readPreviewEdits();
    var validationError = validatePreviewBlocks();
    if (validationError) {
      showPreviewError(validationError);
      return;
    }
    if (!window.confirm("¿Quieres usar esta propuesta en tu horario semanal? Tu horario actual solo cambiará después de confirmar y guardaremos una copia antes.")) return;
    var proposal = buildProposal();
    var weeklyKey = "horario_data_semanal";
    var previousWeekly = localStorage.getItem(weeklyKey);
    var previousType = localStorage.getItem("horario_planner_type");
    var profileKey = "planify_personalizacion_v1";
    var previousProfile = localStorage.getItem(profileKey);
    var backupKey = "planify_bienvenida_respaldo_" + Date.now();
    var backup = {
      savedAt: new Date().toISOString(),
      weeklySchedule: previousWeekly,
      plannerType: previousType,
      personalProfile: previousProfile
    };

    try {
      if (previousWeekly) localStorage.setItem(backupKey, JSON.stringify(backup));
      localStorage.setItem(weeklyKey, JSON.stringify({ dias: proposal.dias, filas: proposal.filas }));
      localStorage.setItem("horario_planner_type", "semanal");
      localStorage.setItem("planify_bienvenida_estado", "completada");
      if (state.userName) localStorage.setItem("planify_nombre", state.userName);
      localStorage.setItem(profileKey, JSON.stringify({
        name: state.userName,
        roles: state.roles,
        occupation: state.occupation,
        occupationOther: state.occupationOther,
        career: state.career,
        careerOther: state.careerOther,
        specialty: state.specialty,
        specialtyOther: state.specialtyOther,
        studyContext: state.studyContext,
        jobRole: state.jobRole,
        ventures: state.ventures,
        goal: state.goal,
        meals: state.meals,
        snacksPerDay: state.snacksPerDay,
        foodProfile: state.foodProfile,
        foodNotes: state.foodNotes,
        hydration: state.hydration,
        caffeineCutoff: state.caffeineCutoff,
        sleepChallenge: state.sleepChallenge,
        movementStyle: state.movementStyle,
        movementMinutes: state.movementMinutes,
        reminders: state.reminders,
        waterEvery: state.waterEvery,
        medicineName: state.medicineName,
        medicineTime: state.medicineTime,
        customReminder: state.customReminder,
        customReminderTime: state.customReminderTime,
        technique: state.technique
      }));
    } catch (error) {
      try {
        if (previousWeekly == null) localStorage.removeItem(weeklyKey);
        else localStorage.setItem(weeklyKey, previousWeekly);
        if (previousType == null) localStorage.removeItem("horario_planner_type");
        else localStorage.setItem("horario_planner_type", previousType);
        if (previousProfile == null) localStorage.removeItem(profileKey);
        else localStorage.setItem(profileKey, previousProfile);
        localStorage.removeItem(backupKey);
      } catch (restoreError) {}
      var overlay = document.getElementById("welcome-flow-overlay");
      var warning = overlay && overlay.querySelector(".welcome-flow-warning");
      if (warning) warning.textContent = "No se pudo guardar por falta de espacio en el navegador. Tus datos anteriores siguen intactos.";
      return;
    }

    close(false);
    window.location.reload();
  }

  function init() {
    addEntryButton();
    addScheduleAssistantButton();
    function saveRowEdit(index, overrides) {
      var category = document.querySelector('[data-welcome-edit-category][data-welcome-index="' + index + '"]');
      var input = document.querySelector('[data-welcome-edit-text][data-welcome-index="' + index + '"]');
      var start = document.querySelector('[data-welcome-edit-start][data-welcome-index="' + index + '"]');
      var end = document.querySelector('[data-welcome-edit-end][data-welcome-index="' + index + '"]');
      var editKey = state.previewDay + "_" + index;
      var previous = state.edits[editKey] || {};
      if (start && end) state.rowTimes[index] = { start: start.value, end: end.value };
      state.edits[editKey] = Object.assign({
        category: category ? category.value : previous.category || "libre",
        text: input ? input.value.trim() : previous.text || "",
        gap: Boolean(previous.gap)
      }, overrides || {});
    }
    document.addEventListener("input", function (event) {
      var input = event.target;
      if (!(input instanceof HTMLInputElement) || !input.matches("[data-welcome-edit-text]")) return;
      var index = Number(input.getAttribute("data-welcome-index"));
      saveRowEdit(index);
    });
    document.addEventListener("change", function (event) {
      if (event.target instanceof HTMLInputElement && event.target.matches("input[name='welcome-role']")) {
        getDraftFromForm();
        render();
        return;
      }
      if (event.target instanceof HTMLInputElement && event.target.matches("input[name='welcome-priority']")) {
        getDraftFromForm();
        var priorityDescriptions = { study: "Reservaremos primero espacios tranquilos para estudiar o aprender.", work: "Daremos prioridad a tus tareas, proyectos o trabajo importante.", balance: "Repartiremos el tiempo entre obligaciones, avance personal y descanso.", personal: "Protegeremos primero tus hábitos, bienestar y proyectos personales." };
        var priorityFeedback = document.querySelector("[data-priority-feedback]");
        if (priorityFeedback) priorityFeedback.textContent = "✨ " + priorityDescriptions[state.priority];
        return;
      }
      if (event.target instanceof HTMLInputElement && event.target.matches("input[name='welcome-day']")) {
        getDraftFromForm();
        if (event.target.checked && Number(event.target.value) >= 5) state.showDayCustomization = true;
        render();
        return;
      }
      if (event.target instanceof HTMLInputElement && event.target.matches("input[name='welcome-activity']")) {
        getDraftFromForm();
        var selectedLabels = Array.from(document.querySelectorAll("input[name='welcome-activity']:checked")).map(function (input) { return input.nextElementSibling ? input.nextElementSibling.textContent.trim() : input.value; });
        var activityAnswer = document.querySelector("[data-activity-feedback]");
        if (activityAnswer) activityAnswer.textContent = selectedLabels.length ? "✨ Añadiremos espacios para: " + selectedLabels.join(" · ") + "." : "Puedes dejarlo vacío: mantendremos más espacios libres.";
        return;
      }
      if (event.target instanceof HTMLInputElement && event.target.matches("input[name='welcome-reminder']")) {
        syncReminderDetails();
        return;
      }
      var select = event.target;
      if (!(select instanceof HTMLSelectElement)) return;
      if (select.id === "welcome-career" || select.id === "welcome-specialty" || select.id === "welcome-frequency" || select.id === "welcome-sessions-per-day") {
        getDraftFromForm();
        render();
        return;
      }
      if (select.matches("[data-welcome-edit-start],[data-welcome-edit-end]")) {
        saveRowEdit(Number(select.getAttribute("data-welcome-index")), { gap: false });
        var gapButton = document.querySelector('[data-welcome-gap][data-welcome-index="' + select.getAttribute("data-welcome-index") + '"]');
        if (gapButton) gapButton.textContent = "+ 15 min libres";
        return;
      }
      if (!select.matches("[data-welcome-edit-category]")) return;
      var index = Number(select.getAttribute("data-welcome-index"));
      var input = document.querySelector('[data-welcome-edit-text][data-welcome-index="' + index + '"]');
      if (!input) return;
      var previous = state.edits[state.previewDay + "_" + index];
      var previousCategory = previous ? previous.category : select.getAttribute("data-welcome-original-category");
      var originalText = select.getAttribute("data-welcome-original-text") || "";
      var stillSuggested = !previous || input.value.trim() === defaultTextForCategory(previousCategory) || input.value.trim() === originalText;
      input.disabled = select.value === "libre";
      if (select.value === "libre") input.value = "";
      else if (select.value !== previousCategory && stillSuggested) input.value = defaultTextForCategory(select.value);
      saveRowEdit(index);
      var categoryGapButton = document.querySelector('[data-welcome-gap][data-welcome-index="' + index + '"]');
      if (categoryGapButton) categoryGapButton.disabled = select.value === "libre";
    });
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof Element)) return;
      var flowOverlay = document.getElementById("welcome-flow-overlay");
      if ((flowOverlay && flowOverlay.contains(target)) || target.closest("#welcome-flow-open") || target.closest("#schedule-change-open") || target.closest("#schedule-change-overlay")) event.stopPropagation();
      var previewMode = target.closest("[data-preview-mode]");
      if (previewMode) {
        event.preventDefault();
        state.previewMode = previewMode.getAttribute("data-preview-mode");
        if (state.previewMode === "weekly") state.editing = false;
        render();
        return;
      }
      var previewDay = target.closest("[data-preview-day]");
      if (previewDay) {
        event.preventDefault();
        state.previewDay = Number(previewDay.getAttribute("data-preview-day"));
        state.previewMode = "daily";
        state.editing = false;
        render();
        return;
      }
      var gapButton = target.closest("[data-welcome-gap]");
      if (gapButton) {
        event.preventDefault();
        var gapIndex = Number(gapButton.getAttribute("data-welcome-index"));
        var gapStart = document.querySelector('[data-welcome-edit-start][data-welcome-index="' + gapIndex + '"]');
        var gapEnd = document.querySelector('[data-welcome-edit-end][data-welcome-index="' + gapIndex + '"]');
        if (!gapStart || !gapEnd) return;
        var alreadyGap = Boolean(state.edits[state.previewDay + "_" + gapIndex] && state.edits[state.previewDay + "_" + gapIndex].gap);
        var nextEnd = timeToMinutes(gapEnd.value) + (alreadyGap ? 15 : -15);
        if (!alreadyGap && nextEnd <= timeToMinutes(gapStart.value)) {
          showPreviewError("Este bloque ya dura 15 minutos. Puedes dejarlo como tiempo libre si quieres una pausa.");
          return;
        }
        var previewTimes = state.dayTimes[state.previewDay] || {};
        if (alreadyGap && nextEnd > timeToMinutes(previewTimes.end || state.end)) nextEnd = timeToMinutes(previewTimes.end || state.end);
        gapEnd.value = minutesToTime(nextEnd);
        gapButton.textContent = alreadyGap ? "+ 15 min libres" : "✓ 15 min libres";
        saveRowEdit(gapIndex, { gap: !alreadyGap });
        var oldError = document.querySelector(".welcome-flow-preview-error");
        if (oldError) oldError.remove();
        return;
      }
      var modeButton = target.closest("[data-welcome-mode]");
      if (modeButton) {
        state.mode = modeButton.getAttribute("data-welcome-mode");
        state.wantMoreQuestions = false;
        state.edits = {};
        state.rowTimes = {};
        render();
        return;
      }
      if (target.closest("#welcome-flow-open")) {
        event.preventDefault();
        open();
        return;
      }
      if (target.closest("#schedule-change-open")) {
        event.preventDefault();
        state.commandMessage = "";
        openScheduleAssistant();
        return;
      }
      var action = target.closest("[data-welcome-action]");
      if (!action) {
        if (target.id === "welcome-flow-overlay") close(true);
        return;
      }
      event.preventDefault();
      var name = action.getAttribute("data-welcome-action");
      if (name === "close") { close(true); return; }
      if (name === "close-schedule-assistant") {
        var scheduleOverlay = document.getElementById("schedule-change-overlay");
        if (scheduleOverlay) scheduleOverlay.remove();
        return;
      }
      if (name === "apply-command") {
        var commandInput = document.querySelector("#welcome-change-command");
        var parsedCommand = parseScheduleCommand(commandInput && commandInput.value);
        if (parsedCommand.error) {
          state.commandMessage = parsedCommand.error;
          render();
          return;
        }
        var commandConflict = expandedFixed().find(function (fixed) { return fixed.day === parsedCommand.day && parsedCommand.start < timeToMinutes(fixed.end) && parsedCommand.end > timeToMinutes(fixed.start); });
        if (commandConflict) {
          state.commandMessage = "Ese cambio se cruza con “" + commandConflict.title + "”. Elige otra hora o cambia primero ese compromiso fijo.";
          render();
          return;
        }
        if (state.days.indexOf(parsedCommand.day) < 0) state.days.push(parsedCommand.day);
        state.manualRequests.push(parsedCommand);
        state.previewDay = parsedCommand.day;
        state.previewMode = "daily";
        state.commandMessage = "Listo: ajusté " + DAY_LABELS[parsedCommand.day] + " de " + minutesToTime(parsedCommand.start) + " a " + minutesToTime(parsedCommand.end) + ".";
        render();
        return;
      }
      if (name === "apply-saved-command") {
        var savedCommandInput = document.querySelector("#schedule-change-command");
        var savedResult;
        try { savedResult = applyCommandToSavedSchedule(savedCommandInput && savedCommandInput.value); }
        catch (error) { savedResult = "No pude aplicar ese cambio. Tu horario anterior sigue intacto."; }
        if (savedResult !== "ok") {
          state.commandMessage = savedResult;
          var savedCommand = savedCommandInput ? savedCommandInput.value : "";
          openScheduleAssistant();
          var restoredInput = document.querySelector("#schedule-change-command");
          if (restoredInput) restoredInput.value = savedCommand;
          return;
        }
        var completedOverlay = document.getElementById("schedule-change-overlay");
        if (completedOverlay) completedOverlay.remove();
        window.location.reload();
        return;
      }
      if (name === "add-fixed") {
        getDraftFromForm();
        var fixedStart = state.start;
        var fixedEnd = minutesToTime(Math.min(timeToMinutes(state.end), timeToMinutes(state.start) + 60));
        state.fixed.push({ title: "", type: "fixed", days: [state.days[0] || 0], day: state.days[0] || 0, start: fixedStart, end: fixedEnd });
        render();
        var newTitle = document.querySelector("[data-fixed-title='" + (state.fixed.length - 1) + "']");
        if (newTitle) newTitle.focus();
        return;
      }
      if (name === "add-fixed-template") {
        getDraftFromForm();
        var template = action.getAttribute("data-fixed-template") || "fixed";
        var titles = { course: state.career === "medicine" ? "Curso o práctica" : "Curso o clase", practice: state.career === "medicine" ? "Práctica clínica o guardia" : "Laboratorio o práctica", work: state.jobRole ? "Trabajo · " + scheduleText(state.jobRole, 45) : "Trabajo o turno" };
        var templateStart = template === "work" ? "08:00" : "09:00";
        var templateEnd = template === "work" ? "13:00" : "10:00";
        state.fixed.push({ title: titles[template] || "", type: template, days: [state.days[0] || 0], day: state.days[0] || 0, start: templateStart, end: templateEnd });
        render();
        var templateTitle = document.querySelector("[data-fixed-title='" + (state.fixed.length - 1) + "']");
        if (templateTitle) { templateTitle.focus(); templateTitle.select(); }
        return;
      }
      if (name === "remove-fixed") {
        getDraftFromForm();
        state.fixed.splice(Number(action.getAttribute("data-fixed-index")), 1);
        render();
        return;
      }
      if (name === "add-project") {
        getDraftFromForm();
        state.projects.push({ title: "", type: "project", sessions: 2, duration: state.blockDuration, preferred: state.energyPeak, days: [] });
        render();
        var projectTitle = document.querySelector("[data-project-title='" + (state.projects.length - 1) + "']");
        if (projectTitle) projectTitle.focus();
        return;
      }
      if (name === "add-venture") {
        getDraftFromForm();
        state.ventures.push({ name: "", details: "" });
        render();
        var ventureName = document.querySelector('[data-venture-name="' + (state.ventures.length - 1) + '"]');
        if (ventureName) ventureName.focus();
        return;
      }
      if (name === "remove-venture") {
        getDraftFromForm();
        state.ventures.splice(Number(action.getAttribute("data-venture-index")), 1);
        render();
        return;
      }
      if (name === "remove-project") {
        getDraftFromForm();
        state.projects.splice(Number(action.getAttribute("data-project-index")), 1);
        render();
        return;
      }
      if (name === "toggle-day-times") {
        getDraftFromForm();
        state.showDayCustomization = !state.showDayCustomization;
        render();
        return;
      }
      if (name === "example") {
        open();
        state.mode = "guided";
        state.priority = "balance";
        state.roles = ["study", "work", "entrepreneur"];
        state.occupation = "both";
        state.userName = "Alex";
        state.career = "engineering";
        state.specialty = "industrial";
        state.occupationOther = "";
        state.jobRole = "Trabajo de medio tiempo";
        state.ventures = [{ name: "Tienda digital", details: "Preparar contenido y revisar pedidos" }];
        state.goal = "Avanzar mis estudios y proyectos";
        state.days = [0, 1, 2, 3, 4];
        state.start = "07:00";
        state.end = "22:00";
        state.blockDuration = 30;
        state.wantMoreQuestions = true;
        state.energyPeak = "morning";
        state.weeklyFrequency = 5;
        state.startStyle = "gentle";
        state.meals = ["breakfast", "lunch", "dinner"];
        state.snacksPerDay = 2;
        state.foodProfile = "sensitive";
        state.foodNotes = "Evitar lo que ya sé que me cae mal";
        state.hydration = true;
        state.caffeineCutoff = "16:00";
        state.sleepChallenge = "falling";
        state.movementStyle = "activebreaks";
        state.movementMinutes = 10;
        state.commuteMinutes = 30;
        state.freeMinutes = 60;
        state.quietEvening = true;
        state.sleepHours = 8;
        state.bedtime = "23:00";
        state.lifeDetailsUsed = true;
        state.dayTimes = {};
        state.showDayCustomization = false;
        state.fixed = [{ title: "Clases de Ingeniería", type: "course", days: [0, 2], day: 0, start: "09:00", end: "11:00" }, { title: "Trabajo de medio tiempo", type: "work", days: [1, 3], day: 1, start: "14:00", end: "18:00" }];
        state.projects = [{ title: "Proyecto del curso", type: "project", sessions: 3, duration: 60, preferred: "afternoon", days: [0, 2, 4] }];
        state.activities = ["exercise", "free"];
        state.breakStyle = "balanced";
        state.reminders = { water: false, medicine: false, study: false, work: false, custom: false };
        state.variant = 0;
        state.edits = {};
        state.rowTimes = {};
        state.example = true;
        state.editing = false;
        state.step = proposalStep();
        render();
        return;
      }
      if (name === "use-example") {
        state.example = false;
        close(false);
        open();
        return;
      }
      if (name === "toggle-edit") {
        if (state.editing) readPreviewEdits();
        state.editing = !state.editing;
        state.previewMode = "daily";
        render();
        return;
      }
      if (name === "more-focus" || name === "more-rest" || name === "balance") {
        if (name === "more-focus") state.sessionsPerDay = Math.min(3, Number(state.sessionsPerDay) + 1);
        if (name === "more-rest") state.sessionsPerDay = Math.max(1, Number(state.sessionsPerDay) - 1);
        if (name === "balance") { state.priority = "balance"; state.goal = ""; }
        state.edits = {};
        state.rowTimes = {};
        state.editing = false;
        render();
        return;
      }
      if (name === "regenerate") {
        state.variant += 1;
        state.edits = {};
        state.rowTimes = {};
        state.editing = false;
        render();
        return;
      }
      if (name === "generate-now" || name === "more-questions") {
        getDraftFromForm();
        state.wantMoreQuestions = name === "more-questions";
        state.edits = {};
        state.rowTimes = {};
        if (state.wantMoreQuestions) {
          state.step = rhythmStep();
        } else {
          var immediateValidationError = validatePreviewBlocks();
          if (immediateValidationError) {
            showPreviewError(immediateValidationError);
            return;
          }
          state.step = proposalStep();
        }
        render();
        return;
      }
      if (name === "skip-rhythm") {
        state.energyPeak = "variable";
        state.weeklyFrequency = Math.max(1, Math.min(5, state.days.length || 5));
        state.startStyle = "gentle";
        state.step = lifeStep();
        render();
        return;
      }
      if (name === "preview-extra-now" || name === "skip-life") {
        if (name === "preview-extra-now") getDraftFromForm();
        if (name === "skip-life") {
          state.meals = [];
          state.snacksPerDay = 0;
          state.foodProfile = "none";
          state.foodNotes = "";
          state.hydration = false;
          state.caffeineCutoff = "none";
          state.sleepChallenge = "none";
          state.movementStyle = "none";
          state.commuteMinutes = 0;
          state.freeMinutes = 0;
          state.quietEvening = false;
          state.sleepHours = 8;
          state.bedtime = "23:00";
          state.lifeDetailsUsed = false;
        }
        var optionalValidationError = validatePreviewBlocks();
        if (optionalValidationError) {
          showPreviewError(optionalValidationError);
          return;
        }
        state.step = proposalStep();
        render();
        return;
      }
      if (name === "next") {
        getDraftFromForm();
        if (state.step === 0) {
          if (state.mode === "manual") {
            close(false);
            var emptyButton = Array.from(document.querySelectorAll("button")).find(function (button) { return /empezar vacío/i.test(button.textContent || ""); });
            if (emptyButton) emptyButton.click();
            if (typeof window.cambiarTab === "function") window.cambiarTab("semanal");
            else if (typeof window.cambiarVistaPlanify === "function") window.cambiarVistaPlanify("semanal");
            return;
          }
          state.step = 1;
        } else if (state.step === 1) {
          if (!state.days.length) {
            var dayGroup = document.querySelector(".welcome-flow-days");
            if (dayGroup) dayGroup.insertAdjacentHTML("afterend", '<span class="welcome-flow-error">Elige al menos un día activo. También puedes escoger solo los días en que realmente tienes tiempo.</span>');
            return;
          }
          if (timeToMinutes(state.end) <= timeToMinutes(state.start)) {
            var timeGrid = document.querySelector(".welcome-flow-time-grid");
            if (timeGrid) timeGrid.insertAdjacentHTML("afterend", '<span class="welcome-flow-error">La hora de término debe ser posterior a la hora de inicio.</span>');
            return;
          }
          state.step = state.mode === "quick" ? decisionStep() : 2;
        } else if (state.step === 2 && state.mode === "detailed") {
          var detailedWorks = hasRole("work");
          var detailedHasWork = state.fixed.some(function (item) { return item.title && (item.type === "work" || /trabaj|turno|oficina|empresa/i.test(item.title)); });
          if (detailedWorks && state.jobPattern !== "flexible" && !detailedHasWork) {
            var detailedNeeded = document.querySelector(".welcome-flow-needed");
            if (detailedNeeded) detailedNeeded.insertAdjacentHTML("afterend", '<span class="welcome-flow-error welcome-flow-needed-error">Antes de seguir, añade al menos un horario de trabajo o elige “Yo decido cuándo hacerlo” si no tienes horas fijas.</span>');
            return;
          }
          state.step = 3;
        } else if (state.step === 2 && state.mode === "guided") {
          var guidedWorks = hasRole("work");
          var guidedHasWork = state.fixed.some(function (item) { return item.title && (item.type === "work" || /trabaj|turno|oficina|empresa/i.test(item.title)); });
          if (guidedWorks && state.jobPattern !== "flexible" && !guidedHasWork) {
            var guidedNeeded = document.querySelector(".welcome-flow-needed");
            if (guidedNeeded) guidedNeeded.insertAdjacentHTML("afterend", '<span class="welcome-flow-error welcome-flow-needed-error">Antes de seguir, añade al menos un horario de trabajo o elige “Yo decido cuándo hacerlo” si no tienes horas fijas.</span>');
            return;
          }
          state.step = decisionStep();
        } else if (state.step === 3 && state.mode === "detailed") {
          state.step = decisionStep();
        } else if (state.step === rhythmStep()) {
          state.step = lifeStep();
        } else {
          return;
        }
        render();
        return;
      }
      if (name === "back") {
        getDraftFromForm();
        if (state.step === proposalStep()) state.step = state.wantMoreQuestions ? lifeStep() : decisionStep();
        else if (state.step === decisionStep()) state.step = state.mode === "quick" ? 1 : state.mode === "guided" ? 2 : 3;
        else state.step = Math.max(0, state.step - 1);
        render();
        return;
      }
      if (name === "preview") {
        getDraftFromForm();
        var validationError = validatePreviewBlocks();
        if (validationError) {
          showPreviewError(validationError);
          return;
        }
        state.step = proposalStep();
        render();
        return;
      }
      if (name === "apply") applyProposal();
    }, true);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && document.getElementById("welcome-flow-overlay")) close(true);
    });

    try {
      var alreadyStarted = localStorage.getItem("planify_bienvenida_estado");
      if (!alreadyStarted && !hasExistingPlan()) {
        window.setTimeout(function () {
          if (!document.getElementById("welcome-flow-overlay")) open();
        }, 800);
      }
    } catch (error) {}
  }

  window.PLANIFY_WELCOME = { open: open, requestChange: openScheduleAssistant };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
