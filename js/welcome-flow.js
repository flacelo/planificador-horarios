(function () {
  "use strict";

  var DAYS = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"];
  var DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  var welcomeReturnFocus = null;
  var applyingProposal = false;
  var weeklyResizeDrag = null;
  var suppressWeeklyResizeClickUntil = 0;
  var ventureSequence = 0;
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
    startedFromHub: false,
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
    dismissedVentureProjects: [],
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
    caffeineCutoff: "not-specified",
    sleepChallenge: "none",
    movementStyle: "activebreaks",
    movementMinutes: 10,
    commuteMinutes: 0,
    preparationMinutes: 0,
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
    commandMessage: "",
    commandDraft: "",
    feedbackUndo: [],
    previewColumnWidths: {}
  };

  function firstName() {
    return scheduleText(state.userName, 35).split(/\s+/)[0] || "";
  }

  function named(text) {
    return firstName() ? firstName() + ", " + text : text.charAt(0).toUpperCase() + text.slice(1);
  }

  function minuteControl(label, id, value, suggestions, min, max, field, attributes, help) {
    var presetMarkup = suggestions.map(function (minutes) {
      var labelText = minutes === 0 ? (field === "commute" ? "Sin traslado" : "No reservar") : minutes + " min";
      return '<button type="button" class="welcome-flow-minute-choice" data-minute-choice="' + minutes + '" data-minute-target="' + id + '" aria-pressed="' + (Number(value) === minutes ? "true" : "false") + '">' + labelText + '</button>';
    }).join("");
    return '<div class="welcome-flow-minute-field"><label for="' + id + '">' + label + '</label><div class="welcome-flow-minute-input-wrap"><input id="' + id + '" type="number" inputmode="numeric" min="' + min + '" max="' + max + '" step="1" required value="' + Number(value) + '" data-custom-minute="' + field + '" ' + (attributes || "") + '><span>minutos</span></div><div class="welcome-flow-minute-choices" role="group" aria-label="Tiempos sugeridos para ' + label.replace(/<[^>]*>/g, "") + '">' + presetMarkup + '</div><small class="welcome-flow-minute-error" data-minute-error="' + id + '" aria-live="polite"></small>' + (help ? '<small class="welcome-flow-field-help">' + help + '</small>' : '') + '</div>';
  }

  function validateMinuteFields() {
    var overlay = document.getElementById("welcome-flow-overlay");
    if (!overlay) return true;
    var invalid = null;
    overlay.querySelectorAll("input[data-custom-minute]").forEach(function (input) {
      var value = input.value.trim();
      var number = Number(value);
      var min = Number(input.min);
      var max = Number(input.max);
      var valid = /^\d+$/.test(value) && Number.isInteger(number) && number >= min && number <= max;
      var message = valid ? "" : value ? "Escribe minutos enteros entre " + min + " y " + max + "." : "Escribe los minutos o elige un tiempo sugerido.";
      input.setAttribute("aria-invalid", valid ? "false" : "true");
      var error = overlay.querySelector('[data-minute-error="' + input.id + '"]');
      if (error) error.textContent = message;
      if (!valid && !invalid) invalid = input;
    });
    if (invalid) {
      invalid.focus();
      return false;
    }
    return true;
  }

  function syncMinuteChoiceState(target) {
    var overlay = document.getElementById("welcome-flow-overlay");
    if (!overlay || !target) return;
    overlay.querySelectorAll('[data-minute-target="' + target.id + '"]').forEach(function (button) {
      button.setAttribute("aria-pressed", Number(button.getAttribute("data-minute-choice")) === Number(target.value) ? "true" : "false");
    });
    target.setAttribute("aria-invalid", "false");
    var error = overlay.querySelector('[data-minute-error="' + target.id + '"]');
    if (error) error.textContent = "";
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

  function syncVentureProjects() {
    state.projects = state.projects.filter(function (project) {
      return project.ventureId == null || state.ventures.some(function (venture) { return String(venture.id) === String(project.ventureId); });
    });
    state.ventures.forEach(function (venture) {
      var ventureId = String(venture.id || "");
      if (!venture.name || !venture.details || !ventureId || state.dismissedVentureProjects.indexOf(ventureId) >= 0 || state.projects.some(function (project) { return String(project.ventureId || "") === ventureId; })) return;
      state.projects.push({ title: venture.name + ": " + venture.details, type: "venture", sessions: 2, duration: state.blockDuration, preferred: state.energyPeak, days: [], ventureId: ventureId });
    });
  }

  function inferPriority(goal) {
    var value = normalizeCommandText(goal || "");
    if (/\b(posterg|procrast|dejo para despues)\b/.test(value)) return "procrastination";
    if (/\b(estudi|curso|clase|examen|repas|tesis|formacion|practica clinica)\b/.test(value)) return "study";
    if (/\b(trabaj|turno|reunion|cliente|informe|entrega|proyecto laboral)\b/.test(value)) return "work";
    if (/\b(habito|ejerc|dormir|salud|bienestar|personal)\b/.test(value)) return "personal";
    if (hasRole("study") && !hasRole("work")) return "study";
    if (hasRole("work") && !hasRole("study")) return "work";
    return "balance";
  }

  function distributeDays(days, count) {
    if (!Array.isArray(days) || !days.length) return [];
    var total = Math.max(1, Math.min(days.length, Number(count) || days.length));
    if (total === days.length) return days.slice();
    if (total === 1) return [days[Math.floor((days.length - 1) / 2)]];
    var selected = [];
    for (var index = 0; index < total; index += 1) {
      var day = days[Math.round(index * (days.length - 1) / (total - 1))];
      if (selected.indexOf(day) < 0) selected.push(day);
    }
    return selected;
  }

  function fixedDays(item) {
    if (item && Array.isArray(item.days)) return item.days.map(Number);
    return [Number(item && item.day || 0)];
  }

  function expandedFixed() {
    var result = [];
    state.fixed.forEach(function (item) {
      fixedDays(item).forEach(function (day) {
        var dayTasks = item.dayTasks && Array.isArray(item.dayTasks[day]) ? item.dayTasks[day].filter(Boolean) : [];
        var dayTitle = dayTasks.length ? dayTasks.join(" · ") : item.dayTitles && item.dayTitles[day] || item.title;
        result.push(Object.assign({}, item, { day: day, title: dayTitle }));
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

  function splitDeclaredActivities(value) {
    return scheduleText(value, 180).split(/\s*(?:;|,|\n|\s+y\s+)\s*/i).map(function (item) {
      return item.replace(/^(?:y|e)\s+/i, "").trim();
    }).filter(function (item) { return item.length > 2; }).slice(0, 7);
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
      personal: "Cuidar mis hábitos y proyectos personales",
      procrastination: "Evitar postergar lo importante"
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

  function inlineCategory(text, fallback) {
    var value = normalizeCommandText(text || "");
    if (!value.trim()) return "libre";
    if (/estudi|curso|clase|examen|repas|tesis/.test(value)) return "estudio";
    if (/trabaj|reuni|cliente|informe|proyecto|turno/.test(value)) return "clase";
    if (/comer|almuer|cena|desay|snack|pausa/.test(value)) return "comida";
    if (/ejerc|gimnas|correr|entren|caminar/.test(value)) return "flexible";
    if (/dorm|descans|desconex|libre/.test(value)) return "desconexion";
    return fallback && fallback !== "libre" ? fallback : "clase";
  }

  function saveInlineActivity(input) {
    var day = Number(input.getAttribute("data-inline-day"));
    var index = Number(input.getAttribute("data-inline-index"));
    var span = Math.max(1, Number(input.getAttribute("data-inline-span")) || 1);
    var text = input.value.trim();
    var category = inlineCategory(text, input.getAttribute("data-inline-category"));
    for (var offset = 0; offset < span; offset += 1) {
      state.edits[day + "_" + (index + offset)] = { category: category, text: text, gap: false };
    }
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
    var quickGoal = overlay.querySelector("#welcome-quick-goal");
    if (quickGoal) state.goal = scheduleText(quickGoal.value, 160);
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
        return { id: state.ventures[index] && state.ventures[index].id || "venture-" + (++ventureSequence), name: scheduleText(input.value, 160), details: scheduleText(details && details.value, 400) };
      }).filter(function (venture) { return venture.name || venture.details; });
    }
    state.priority = inferPriority(state.goal);
    var selectedDays = Array.from(overlay.querySelectorAll("input[name='welcome-day']:checked")).map(function (input) { return Number(input.value); });
    if (overlay.querySelector("input[name='welcome-day']")) state.days = selectedDays;
    if (overlay.querySelector("input[name='welcome-day']")) state.weeklyFrequency = Math.max(1, state.days.length);
    var start = overlay.querySelector("#welcome-start");
    var end = overlay.querySelector("#welcome-end");
    if (start) state.start = start.value;
    if (end) state.end = end.value;
    var blockDuration = overlay.querySelector("#welcome-block-duration-custom");
    if (blockDuration && /^\d+$/.test(blockDuration.value)) state.blockDuration = Number(blockDuration.value);
    var energy = overlay.querySelector("input[name='welcome-energy']:checked");
    if (energy) state.energyPeak = energy.value;
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
    if (movementMinutes && /^\d+$/.test(movementMinutes.value)) state.movementMinutes = Number(movementMinutes.value);
    var commute = overlay.querySelector("#welcome-commute");
    if (commute && /^\d+$/.test(commute.value)) state.commuteMinutes = Number(commute.value);
    var preparation = overlay.querySelector("#welcome-preparation");
    if (preparation && /^\d+$/.test(preparation.value)) state.preparationMinutes = Number(preparation.value);
    var freeMinutes = overlay.querySelector("#welcome-free-minutes");
    if (freeMinutes && /^\d+$/.test(freeMinutes.value)) state.freeMinutes = Number(freeMinutes.value);
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
        var dayTasks = {};
        overlay.querySelectorAll('[data-fixed-day-task="' + index + '"]').forEach(function (taskInput) {
          var day = taskInput.getAttribute("data-fixed-title-day");
          var taskIndex = Number(taskInput.getAttribute("data-fixed-task-index"));
          dayTasks[day] = dayTasks[day] || [];
          dayTasks[day][taskIndex] = scheduleText(taskInput.value, 100);
        });
        return {
          title: scheduleText(input.value, 70),
          type: (overlay.querySelector('[data-fixed-type="' + index + '"]') || {}).value || "fixed",
          days: fixedSelectedDays,
          dayTasks: dayTasks,
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
        var projectDurationInput = overlay.querySelector('[data-project-duration="' + index + '"]');
        return {
          title: scheduleText(input.value, 80),
          type: (overlay.querySelector('[data-project-type="' + index + '"]') || {}).value || "project",
          sessions: Number((overlay.querySelector('[data-project-sessions="' + index + '"]') || {}).value || 1),
          duration: projectDurationInput && projectDurationInput.value.trim() ? Number(projectDurationInput.value) : Number(state.projects[index] && state.projects[index].duration || state.blockDuration),
          preferred: (overlay.querySelector('[data-project-preferred="' + index + '"]') || {}).value || "any",
          days: Array.from(overlay.querySelectorAll('[data-project-day="' + index + '"]:checked')).map(function (dayInput) { return Number(dayInput.value); }),
          ventureId: state.projects[index] && state.projects[index].ventureId != null ? String(state.projects[index].ventureId) : null
        };
      }).filter(function (item) { return item.title; });
    }
    syncVentureProjects();
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
    if (waterEvery && /^\d+$/.test(waterEvery.value)) state.waterEvery = Number(waterEvery.value);
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
    var skippedChoice = state.startedFromHub ? 1 : 0;
    var total = totalSteps() - skippedChoice;
    var current = step + 1 - skippedChoice;
    return '<header class="welcome-flow-header"><div class="welcome-flow-progress" aria-label="Paso ' + current + ' de ' + total + '">' +
      '<i style="width:' + (current * 100 / total) + '%"></i></div><span class="welcome-flow-step">PASO ' + current + ' DE ' + total + '</span>' +
      '<button type="button" class="welcome-flow-close" data-welcome-action="close" aria-label="Cerrar">×</button>' +
      '<span class="welcome-flow-emoji">' + (["🧭", "🌱", "🗓️", "🔔", "🔎", "⚙️", "🏡", "✨"][step] || "✨") + '</span><h2 id="welcome-flow-title" tabindex="-1">' + title + '</h2>' +
      '<p>' + subtitle + '</p></header>';
  }

  function renderModeStep() {
    var modes = [
      ["manual", "✍️", "Quiero planificar por mi cuenta", "Irás directo al planificador vacío con todas las herramientas para construir y editar tu horario.", "Control total · puedes pedir ayuda después"],
      ["quick", "🧩", "Crear mi horario rápido", "Elige tus días y horas; después podrás revisar y editar una propuesta inicial.", "Solo lo esencial · recomendado"],
      ["guided", "🗓️", "Ayúdame paso a paso", "Incluye tus compromisos fijos y recibe una propuesta editable.", "Más detalle"],
      ["detailed", "✨", "Personalizar a fondo", "Incluye estudios, trabajos, emprendimientos, energía, bienestar y recordatorios.", "Más preguntas"]
    ];
    return renderHeader(0, "¿Cómo te gustaría crear tu horario?", "Elige la ayuda que prefieras. Todas las rutas terminan en un horario editable.") +
      '<div class="welcome-flow-fields welcome-flow-name"><label>¿Cómo te gustaría que te llamemos? <span class="welcome-flow-optional">(nombre o apodo)</span><input id="welcome-name" maxlength="50" value="' + escapeHtml(state.userName) + '" placeholder="Ej.: Flavio"></label></div>' +
      '<div class="welcome-flow-options welcome-flow-modes">' + modes.map(function (mode) {
        return '<button type="button" class="welcome-flow-mode ' + (state.mode === mode[0] ? "is-selected" : "") + '" data-welcome-mode="' + mode[0] + '" aria-pressed="' + (state.mode === mode[0] ? "true" : "false") + '"><span>' + mode[1] + '</span><span><strong>' + mode[2] + '</strong><small>' + mode[3] + '</small><em>' + mode[4] + '</em></span><i>✓</i></button>';
      }).join("") + '</div>' +
      '<div class="welcome-flow-example-callout"><span>👀</span><div><strong>¿Prefieres mirar antes?</strong><small>Te enseñamos un ejemplo completo sin guardar ni cambiar tus datos.</small></div><button type="button" class="welcome-flow-secondary" data-welcome-action="example">Ver ejemplo</button></div>' +
      '<footer class="welcome-flow-footer"><span>Nada queda bloqueado: puedes cambiar de método después.</span><button class="welcome-flow-primary" data-welcome-action="next">Continuar →</button></footer>';
  }

  function renderCoreStep() {
    var occupations = [["study", "Estudio o me estoy formando"], ["work", "Tengo uno o más trabajos"], ["entrepreneur", "Tengo uno o más emprendimientos"], ["home", "Hogar / cuidados"], ["other", "También hago otra cosa"]];
    var dayOptions = DAY_LABELS.map(function (day, index) {
      return '<label class="welcome-flow-day"><input type="checkbox" name="welcome-day" value="' + index + '" ' +
        (state.days.indexOf(index) >= 0 ? "checked" : "") + '><span><strong>' + day + '</strong><small class="welcome-day-on">Activo</small><small class="welcome-day-off">Libre</small></span></label>';
    }).join("");
    var dayCustomization = state.days.map(function (day) {
      var times = state.dayTimes[day] || {};
      return '<div class="welcome-flow-day-time"><strong>' + DAY_LABELS[day] + '</strong><label>Desde<select data-day-time="' + day + '" data-day-start>' + timeOptions(times.start || state.start) + '</select></label><label>Hasta<select data-day-time="' + day + '" data-day-end>' + timeOptions(times.end || state.end) + '</select></label></div>';
    }).join("");
    var studies = hasRole("study") && state.mode !== "quick";
    var works = hasRole("work") && state.mode !== "quick";
    var entrepreneurs = hasRole("entrepreneur") && state.mode !== "quick";
    var ventureMarkup = state.ventures.map(function (venture, index) {
      return '<div class="welcome-flow-venture-row"><label>Nombre del emprendimiento<input data-venture-name="' + index + '" value="' + escapeHtml(venture.name) + '" placeholder="Ej.: tienda en línea, consultoría, marca personal"></label><label>¿Qué tareas sueles hacer en él? <span class="welcome-flow-optional">(opcional)</span><textarea data-venture-details="' + index + '" rows="2" placeholder="Ej.: responder pedidos, crear contenido o revisar ventas">' + escapeHtml(venture.details) + '</textarea><small class="welcome-flow-field-help">Escribe actividades concretas, no una meta general. Las añadiremos a tu lista para que decidas cuándo hacerlas.</small></label><button type="button" data-welcome-action="remove-venture" data-venture-index="' + index + '">Quitar</button></div>';
    }).join("");
    var careerLabels = [["medicine", "Medicina / ciencias de la salud"], ["engineering", "Ingeniería / tecnología"], ["business", "Negocios / administración"], ["law", "Derecho / ciencias sociales"], ["arts", "Arte / diseño / comunicación"], ["other", "Otra carrera o especialidad"]];
    var specialtyOptions = state.career === "engineering" ? [["industrial","Ingeniería Industrial"],["systems","Ingeniería de Sistemas / Software"],["civil","Ingeniería Civil"],["mining","Ingeniería de Minas"],["environmental","Ingeniería Ambiental"],["mechanical","Ingeniería Mecánica"],["electrical","Ingeniería Eléctrica / Electrónica"],["chemical","Ingeniería Química"],["other","Otra ingeniería"]] : state.career === "medicine" ? [["medicine","Medicina humana"],["nursing","Enfermería"],["nutrition","Nutrición"],["psychology","Psicología"],["dentistry","Odontología"],["therapy","Terapia / rehabilitación"],["other","Otra carrera de salud"]] : state.career === "business" ? [["administration","Administración"],["accounting","Contabilidad"],["economics","Economía / Finanzas"],["marketing","Marketing / Ventas"],["other","Otra especialidad"]] : [["general","Mi especialidad principal"],["other","Quiero escribirla"]];
    if (!specialtyOptions.some(function (item) { return item[0] === state.specialty; })) state.specialty = specialtyOptions[0][0];
    var studyContextOptions = state.career === "medicine" ? [["theory","Cursos y exámenes teóricos"],["practice","Prácticas clínicas"],["rotation","Rotaciones o guardias"],["mixed","Una combinación de todo"]] : state.career === "engineering" ? [["classes","Cursos y ejercicios"],["labs","Laboratorios o talleres"],["projects","Proyectos y entregables"],["mixed","Una combinación de todo"]] : [["classes","Clases y evaluaciones"],["practice","Prácticas o actividades aplicadas"],["projects","Proyectos y entregables"],["mixed","Una combinación de todo"]];
    if (!studyContextOptions.some(function (item) { return item[0] === state.studyContext; })) state.studyContext = studyContextOptions[0][0];
    var combinedRoles = hasRole("study") && hasRole("work");
    return renderHeader(1, named("cuéntanos qué ocupa tu vida ahora"), state.mode === "quick" ? "Escribe una actividad concreta y elige tus días y horas. Podrás cambiar la propuesta después." : "Las preguntas se adaptan a las actividades que elijas.") +
      '<div class="welcome-flow-fields"><label class="welcome-flow-core-name">Tu nombre o apodo <span class="welcome-flow-optional">(opcional)</span><input id="welcome-name" maxlength="50" value="' + escapeHtml(state.userName) + '" placeholder="¿Cómo te gustaría que te llamemos?"></label><fieldset><legend>¿Qué cosas forman parte de tu vida actualmente?</legend><small class="welcome-flow-field-help">Puedes marcar varias: por ejemplo, estudiar, trabajar y llevar dos emprendimientos al mismo tiempo.</small><div class="welcome-flow-choice-pills welcome-flow-role-pills">' +
      '<label class="welcome-flow-combined-role"><input type="checkbox" name="welcome-role-combined" ' + (combinedRoles ? "checked" : "") + '><span>Estudio y trabajo</span></label>' +
      occupations.map(function (item) { return '<label><input type="checkbox" name="welcome-role" value="' + item[0] + '" ' + (state.roles.indexOf(item[0]) >= 0 ? "checked" : "") + '><span>' + item[1] + '</span></label>'; }).join("") +
      '</div><label class="welcome-flow-reveal" data-occupation-other ' + (hasRole("other") ? "" : "hidden") + '>Cuéntanos con libertad qué más forma parte de tu rutina<textarea id="welcome-occupation-other" rows="3" placeholder="Ej.: trabajo por turnos, cuido a mis hijos y apoyo un negocio familiar">' + escapeHtml(state.occupationOther) + '</textarea></label></fieldset>' +
      (studies ? '<label>¿Qué estudias o en qué área te estás formando?<select id="welcome-career">' + careerLabels.map(function (item) { return '<option value="' + item[0] + '" ' + (state.career === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label>' + (state.career === "other" ? '<label>Escribe tu carrera o especialidad<input id="welcome-career-other" maxlength="70" value="' + escapeHtml(state.careerOther) + '" placeholder="Ej.: Arquitectura"></label>' : '<label>' + (state.career === "engineering" ? "¿Qué ingeniería estudias?" : state.career === "medicine" ? "¿Qué carrera o área de salud estudias?" : "¿Cuál es tu especialidad?") + '<select id="welcome-specialty">' + specialtyOptions.map(function (item) { return '<option value="' + item[0] + '" ' + (state.specialty === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label>' + (state.specialty === "other" ? '<label>Escribe tu especialidad<input id="welcome-specialty-other" maxlength="70" value="' + escapeHtml(state.specialtyOther) + '" placeholder="Ej.: Ingeniería de Seguridad Industrial"></label>' : '')) + '<fieldset><legend>' + (state.career === "medicine" ? "¿Qué ocupa más tu etapa de formación ahora?" : state.career === "engineering" ? "¿Qué tipo de trabajo académico ocupa más tu semana?" : "¿Qué tipo de actividad académica ocupa más tu semana?") + '</legend><div class="welcome-flow-choice-pills">' + studyContextOptions.map(function (item) { return '<label><input type="radio" name="welcome-study-context" value="' + item[0] + '" ' + (state.studyContext === item[0] ? "checked" : "") + '><span>' + item[1] + '</span></label>'; }).join("") + '</div></fieldset>' : '') +
      (works ? '<label>Cuéntanos a qué te dedicas en tu trabajo o trabajos <span class="welcome-flow-optional">(sin límite breve)</span><textarea id="welcome-job-role" rows="3" placeholder="Ej.: por las mañanas soy asistente contable y dos noches por semana atiendo clientes por mi cuenta">' + escapeHtml(state.jobRole) + '</textarea><small class="welcome-flow-field-help">Puedes escribir varios cargos, lugares o responsabilidades. Lo usaremos para distinguir tus bloques laborales y tus recomendaciones.</small></label><fieldset><legend>¿Tus horarios de trabajo suelen ser…?</legend><div class="welcome-flow-choice-pills">' + [["fixed","Mayormente fijos"],["variable","Cambian por día o turno"],["flexible","Yo decido cuándo trabajar"]].map(function (item) { return '<label><input type="radio" name="welcome-job-pattern" value="' + item[0] + '" ' + (state.jobPattern === item[0] ? "checked" : "") + '><span>' + item[1] + '</span></label>'; }).join("") + '</div></fieldset>' : '') +
      (entrepreneurs ? '<section class="welcome-flow-question-group welcome-flow-ventures"><div class="welcome-flow-group-heading"><strong>Tus emprendimientos</strong><small>Añade tantos como necesites. Más adelante elegirás cuánto tiempo y qué días dedicar a cada uno.</small></div>' + ventureMarkup + '<button type="button" class="welcome-flow-add-fixed" data-welcome-action="add-venture">＋ Añadir emprendimiento</button></section>' : '') +
      (state.mode === "quick" ? '<label class="welcome-flow-quick-goal">¿Qué actividad quieres incluir primero?<input id="welcome-quick-goal" maxlength="160" required value="' + escapeHtml(state.goal) + '" placeholder="Ej.: estudiar inglés o avanzar mi proyecto"><small class="welcome-flow-field-help">Reservaremos un bloque para esta actividad en cada día activo. Podrás moverlo o borrarlo antes de guardar.</small></label>' : '') +
      '<fieldset><legend>¿Qué días quieres organizar?</legend><div class="welcome-flow-days">' + dayOptions + '</div><small class="welcome-flow-field-help">Los días marcados se planificarán. Los que dicen “Libre” quedarán sin actividades; también puedes activar sábado o domingo.</small><button type="button" class="welcome-flow-customize-days" data-welcome-action="toggle-day-times">' + (state.showDayCustomization ? "Ocultar horas de cada día" : "🕐 Personalizar las horas de cada día") + '</button>' + (state.showDayCustomization ? '<div class="welcome-flow-day-times">' + dayCustomization + '</div>' : '') + '</fieldset>' +
      '<div class="welcome-flow-time-grid"><label>Empiezo mi día<select id="welcome-start">' + timeOptions(state.start) + '</select></label>' +
      '<label>Termino mis actividades sobre<select id="welcome-end">' + timeOptions(state.end) + '</select></label></div>' +
      '<small class="welcome-flow-field-help">El planificador distribuirá la prioridad entre los días que marcaste. Podrás pulir la semana completa antes de guardarla.</small></div>' +
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
      var fixedType = item.type || "fixed";
      var dayTaskFields = fixedType === "work" ? itemDays.map(function (dayIndex) {
        var tasks = Array.isArray(item.dayTasks && item.dayTasks[dayIndex]) ? item.dayTasks[dayIndex] : item.dayTitles && item.dayTitles[dayIndex] ? [item.dayTitles[dayIndex]] : [""];
        return '<fieldset class="welcome-flow-workday-tasks" style="grid-column:1/-1;display:grid;gap:7px;margin:0;padding:10px;border:1px solid #dbe3f0;border-radius:10px"><legend>¿Qué sueles hacer el ' + DAY_LABELS[dayIndex] + '? <span class="welcome-flow-optional">(opcional)</span></legend>' + tasks.map(function (task, taskIndex) {
          return '<label><span class="sr-only">Actividad ' + (taskIndex + 1) + '</span><input data-fixed-day-task="' + index + '" data-fixed-title-day="' + dayIndex + '" data-fixed-task-index="' + taskIndex + '" maxlength="100" value="' + escapeHtml(task || "") + '" placeholder="Ej.: inspecciones, informes, reuniones"></label>';
        }).join("") + '<button type="button" style="min-height:38px;padding:8px 10px;border:1px dashed #a5b4fc;border-radius:9px;background:#f5f3ff;color:#4338ca;font-weight:750" data-welcome-action="add-workday-task" data-fixed-index="' + index + '" data-fixed-day-index="' + dayIndex + '">＋ Añadir otra actividad</button><small>Escribe cada tarea por separado; puedes añadir más de una para este mismo día.</small></fieldset>';
      }).join("") : "";
      return '<div class="welcome-flow-fixed-row" data-fixed-row="' + index + '"><div class="welcome-flow-time-grid"><label>Nombre del bloque fijo<input data-fixed-title="' + index + '" maxlength="70" value="' + escapeHtml(item.title) + '" placeholder="' + (fixedType === "work" ? "Ej.: Turno de trabajo" : contextExamples) + '"></label><label>¿Qué tipo de compromiso es?<select data-fixed-type="' + index + '">' + typeOptions.map(function (option) { return '<option value="' + option[0] + '" ' + (fixedType === option[0] ? "selected" : "") + '>' + option[1] + '</option>'; }).join("") + '</select></label></div>' +
        '<fieldset class="welcome-flow-fixed-days"><legend>¿Qué días ocurre exactamente?</legend><div class="welcome-flow-mini-days">' + DAY_LABELS.map(function (day, dayIndex) { return '<label><input type="checkbox" data-fixed-day="' + index + '" value="' + dayIndex + '" ' + (itemDays.indexOf(dayIndex) >= 0 ? "checked" : "") + '><span>' + day.slice(0, 3) + '</span></label>'; }).join("") + '</div><small>Marca únicamente los días en que se repite. Si el jueves no tienes que ir, déjalo sin marcar.</small></fieldset>' + dayTaskFields +
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
      '<div data-reminder-detail="water">' + minuteControl("¿Cada cuántos minutos quieres que te recuerde tomar agua?", "welcome-water-every", state.waterEvery, [60, 90, 120, 180], 15, 360, "water", "", "Puedes escribir otro intervalo. Los recordatorios son opcionales y solo aparecen si activas las pausas de agua.") + '</div>' +
      '<label data-reminder-detail="medicine">¿Qué te indicó tu profesional o qué ya decidiste registrar?<input id="welcome-medicine-name" maxlength="100" value="' + escapeHtml(state.medicineName) + '" placeholder="Escribe solo algo que ya utilizas por indicación o decisión propia"></label>' +
      '<label data-reminder-detail="medicine">¿A qué hora?<select id="welcome-medicine-time">' + timeOptions(state.medicineTime) + '</select></label>' +
      '<label data-reminder-detail="study">¿Qué técnica de estudio prefieres?<select id="welcome-technique">' + [["pomodoro", "Pomodoro: 25 min y pausa de 5"],["deep", "Enfoque: 50 min y pausa de 10"],["custom", "Prefiero decidir mis propios tiempos"]].map(function (item) { return '<option value="' + item[0] + '" ' + (state.technique === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label>' +
      '<label data-reminder-detail="custom">¿Qué quieres recordar?<input id="welcome-custom-reminder" maxlength="70" value="' + escapeHtml(state.customReminder) + '" placeholder="Ej.: enviar informe a mi equipo"></label>' +
      '<label data-reminder-detail="custom">¿A qué hora?<select id="welcome-custom-reminder-time">' + timeOptions(state.customReminderTime) + '</select></label>' +
      '<p class="welcome-flow-note">Los avisos se mostrarán mientras tengas esta página abierta. Permite las notificaciones del navegador cuando te lo pida. En medicamentos o suplementos, PLANIFY solo agenda lo que tú ya tengas indicado; no recomienda productos ni dosis y te recuerda consultar con un profesional.</p></div>' +
      '<footer class="welcome-flow-footer"><button class="welcome-flow-secondary" data-welcome-action="back">← Atrás</button><button class="welcome-flow-primary" data-welcome-action="next">Seguir →</button></footer>';
  }

  function renderDecisionStep() {
    return renderHeader(state.step, "¿Quieres verlo ya o seguimos afinándolo?", "Ya podemos crear una buena base. Tú decides si prefieres verla ahora o contarnos un poco más.") +
      '<div class="welcome-flow-fields"><fieldset><legend>¿Cuánto suele durarte un bloque que quieres dedicar a una actividad?</legend>' + minuteControl("Duración del bloque", "welcome-block-duration-custom", state.blockDuration, [15, 25, 30, 45, 50, 60], 5, 180, "block-duration", "", "Puedes elegir una sugerencia o escribir otra cantidad. El plan respetará este tiempo como punto de partida, no como predicción del tiempo de una tarea.") + '</fieldset>' +
      '<div class="welcome-flow-path-choice"><button type="button" class="' + (state.mode === "quick" ? "is-recommended" : "") + '" data-welcome-action="generate-now">' + (state.mode === "quick" ? '<em>RECOMENDADO</em>' : '') + '<span>⚡</span><strong>Ver mi horario ahora</strong><small>Generamos una propuesta con lo que ya respondiste. Seguirá siendo editable.</small></button>' +
      '<button type="button" class="' + (state.mode === "quick" ? "" : "is-recommended") + '" data-welcome-action="more-questions">' + (state.mode === "quick" ? '' : '<em>RECOMENDADO</em>') + '<span>✨</span><strong>Seguir con más preguntas</strong><small>Afinaremos energía, frecuencia, comidas, traslados y tiempo libre para acercarnos más a tu vida real.</small></button></div></div>' +
      '<footer class="welcome-flow-footer"><button class="welcome-flow-secondary" data-welcome-action="back">← Atrás</button><span>No perderás ninguna respuesta.</span></footer>';
  }

  function renderRhythmStep() {
    var energies = [["morning", "🌅 Mañana", "Suelo pensar con más claridad temprano"], ["afternoon", "☀️ Tarde", "Rindo mejor después del mediodía"], ["evening", "🌙 Noche", "Me concentro mejor al final del día"], ["variable", "🔄 Depende del día", "Prefiero repartirlo"]];
    var styles = [["gentle", "Empezar con calma", "Primero preparo el día y luego voy a lo importante"], ["priority", "Ir a lo importante", "Quiero aprovechar mi primera franja disponible"]];
    var projectMarkup = state.projects.map(function (project, index) {
      var projectDays = Array.isArray(project.days) ? project.days : [];
      return '<div class="welcome-flow-project-row"><div class="welcome-flow-time-grid"><label>Actividad que quieres incluir<input data-project-title="' + index + '" maxlength="80" value="' + escapeHtml(project.title) + '" placeholder="Ej.: estudiar anatomía, preparar informe, responder pedidos"></label><label>Tipo<select data-project-type="' + index + '">' + [["course","Curso / estudio"],["project","Proyecto"],["venture","Emprendimiento"],["personal","Personal"]].map(function (item) { return '<option value="' + item[0] + '" ' + (project.type === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label></div>' +
        '<div class="welcome-flow-project-settings"><label>¿Cuántos días por semana quieres reservarle?<select data-project-sessions="' + index + '">' + [1,2,3,4,5,6,7].map(function (count) { return '<option value="' + count + '" ' + (Number(project.sessions) === count ? "selected" : "") + '>' + count + (count === 1 ? " día" : " días") + '</option>'; }).join("") + '</select></label>' + minuteControl("Minutos que quieres reservar cada día", "welcome-project-duration-" + index, project.duration || state.blockDuration, [15, 25, 30, 45, 60, 90, 120], 5, 480, "project-duration", 'data-project-duration="' + index + '"', "El horario reservará exactamente estos minutos, si caben antes de tus compromisos y del tiempo libre que pediste.") + '<label>¿En qué momento prefieres hacerlo?<select data-project-preferred="' + index + '">' + [["any","Cuando haya espacio"],["morning","Por la mañana"],["afternoon","Por la tarde"],["evening","Por la noche"]].map(function (item) { return '<option value="' + item[0] + '" ' + (project.preferred === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label></div>' +
        '<fieldset class="welcome-flow-fixed-days"><legend>Días preferidos <span class="welcome-flow-optional">(opcional)</span></legend><div class="welcome-flow-mini-days">' + DAY_LABELS.map(function (day, dayIndex) { return '<label><input type="checkbox" data-project-day="' + index + '" value="' + dayIndex + '" ' + (projectDays.indexOf(dayIndex) >= 0 ? "checked" : "") + '><span>' + day.slice(0,3) + '</span></label>'; }).join("") + '</div><small>Si no marcas días, buscaremos automáticamente los mejores espacios.</small></fieldset><button type="button" class="welcome-flow-remove-fixed" data-welcome-action="remove-project" data-project-index="' + index + '">Quitar</button></div>';
    }).join("");
    return renderHeader(state.step, named("organicemos tus cursos y proyectos"), "Tú indicas qué quieres incluir, cuántas veces y cuánto tiempo reservar. No calculamos cuánto tardarás en terminarlo.") +
      '<div class="welcome-flow-fields"><fieldset><legend>¿En qué momento sueles rendir mejor?</legend><div class="welcome-flow-rich-options">' + energies.map(function (item) {
        return '<label><input type="radio" name="welcome-energy" value="' + item[0] + '" ' + (state.energyPeak === item[0] ? "checked" : "") + '><span><strong>' + item[1] + '</strong><small>' + item[2] + '</small></span></label>';
      }).join("") + '</div></fieldset>' +
      '<section class="welcome-flow-question-group"><div class="welcome-flow-group-heading"><strong>¿Qué actividades concretas quieres ver en tu horario?</strong><small>Incluimos aquí lo que escribiste para tus emprendimientos. Añade cursos, tareas o proyectos; decide cuántos días y minutos quieres reservar para cada uno.</small></div>' + projectMarkup + '<button type="button" class="welcome-flow-add-fixed" data-welcome-action="add-project">＋ Añadir curso, proyecto o tarea</button></section>' +
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
      }).join("") + '</div></fieldset><div class="welcome-flow-time-grid"><label>¿Quieres reservar algún snack entre comidas?<select id="welcome-snacks">' + [[0,"No por ahora"],[1,"Sí, 1 snack"],[2,"Sí, 2 snacks"]].map(function (item) { return '<option value="' + item[0] + '" ' + (state.snacksPerDay === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select><small class="welcome-flow-field-help">Si eliges uno, buscaré una pausa a media mañana; si eliges dos, también una por la tarde.</small></label><label>¿Hasta qué hora prefieres consumir cafeína?<select id="welcome-caffeine-cutoff">' + [["not-specified","Prefiero no indicarlo"],["no-caffeine","No consumo cafeína"],["12:00","Hasta las 12:00 p. m."],["14:00","Hasta las 2:00 p. m."],["16:00","Hasta las 4:00 p. m."],["18:00","Hasta las 6:00 p. m."]].map(function (item) { return '<option value="' + item[0] + '" ' + (state.caffeineCutoff === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select><small class="welcome-flow-field-help">Elige “No consumo cafeína” si no tomas café, té, bebidas energéticas u otras fuentes con cafeína.</small></label></div>' +
      '<fieldset><legend>¿Hay algo que debamos respetar al organizar tus comidas?</legend><div class="welcome-flow-rich-options welcome-flow-food-options">' + foodProfiles.map(function (item) { return '<label><input type="radio" name="welcome-food-profile" value="' + item[0] + '" ' + (state.foodProfile === item[0] ? "checked" : "") + '><span><strong>' + item[1] + '</strong><small>' + item[2] + '</small></span></label>'; }).join("") + '</div></fieldset><label>Alimentos que prefieres evitar o indicaciones que ya sigues <span class="welcome-flow-optional">(opcional)</span><input id="welcome-food-notes" maxlength="100" value="' + escapeHtml(state.foodNotes) + '" placeholder="Ej.: evito lácteos; mi nutricionista indicó..."><small class="welcome-flow-field-help">Solo mostraremos tu nota como recordatorio personal. Para síntomas o suplementos, consulta a un profesional de salud.</small></label><label class="welcome-flow-check-card"><input id="welcome-hydration" type="checkbox" ' + (state.hydration ? "checked" : "") + '><span><strong>Quiero pausas para tomar agua</strong><small>Colocaremos recordatorios suaves durante tus horas activas.</small></span></label></section>' +
      '<section class="welcome-flow-food-guidance"><div><span>🍽️</span><strong>Ideas generales, no una dieta</strong><p>PLANIFY puede sugerir una comida sencilla combinando alimentos que tú toleres: una fuente de proteína, vegetales o fruta, cereal o tubérculo y agua. Si tienes colon irritable, alergias, síntomas o una dieta indicada, prioriza tu registro personal y la orientación de un médico o nutricionista.</p></div><div><span>💊</span><strong>Recordar no es recetar</strong><p>Puedes programar algo que ya uses, pero PLANIFY no elegirá medicamentos, vitaminas, suplementos ni dosis por ti.</p></div></section>' +
      '<div class="welcome-flow-time-grid">' + minuteControl("¿Cuánto tardas en el trayecto de ida desde casa? (por ejemplo, al trabajo o a la universidad)", "welcome-commute", state.commuteMinutes, [0, 10, 15, 20, 30, 45, 60, 90], 0, 240, "commute", "", "Escribe solo el tiempo de ida. Si normalmente no haces ese trayecto, elige “Sin traslado”.") + minuteControl("¿Cuánto tiempo quieres reservar para prepararte antes de salir? (opcional)", "welcome-preparation", state.preparationMinutes, [0, 10, 15, 20, 30, 45, 60], 0, 240, "preparation", "", "Elige “No reservar” si no quieres añadir ese bloque.") +
      minuteControl("Al terminar tus actividades, ¿cuántos minutos quieres dejar sin obligaciones?", "welcome-free-minutes", state.freeMinutes, [0, 15, 30, 45, 60, 90, 120], 0, 360, "free", "", "Ese tramo quedará sin trabajo, estudio ni tareas para que puedas descansar o decidir después.") + '</div>' +
      '<section class="welcome-flow-weekend-card"><div class="welcome-flow-group-heading"><strong>¿Cómo quieres tratar tu fin de semana?</strong><small>Solo lo aplicaremos si activaste sábado o domingo. Cada uno puede tener una intención diferente.</small></div><div class="welcome-flow-time-grid"><label>Mi sábado ideal<select id="welcome-saturday-style">' + [["recover","Recuperar energía y descansar"],["projects","Avanzar proyectos pendientes"],["social","Familia, amistades o salir"],["chores","Casa, compras y diligencias"],["flexible","Dejarlo mayormente abierto"]].map(function (item) { return '<option value="' + item[0] + '" ' + (state.saturdayStyle === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label><label>Mi domingo ideal<select id="welcome-sunday-style">' + [["reset","Descansar y recargar"],["planning","Planificar la nueva semana"],["family","Compartir con familia o amistades"],["prepare","Adelantar comidas, ropa o materiales"],["free","Dejarlo libre"]].map(function (item) { return '<option value="' + item[0] + '" ' + (state.sundayStyle === item[0] ? "selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label></div></section>' +
      '<section class="welcome-flow-wellbeing"><div class="welcome-flow-group-heading"><strong>Sueño y recuperación</strong><small>Usaremos esto para proteger una rutina nocturna, no para diagnosticar problemas de sueño.</small></div><div class="welcome-flow-time-grid"><label>¿Cuántas horas te gustaría dormir?<select id="welcome-sleep-hours">' + [6,7,8,9,10].map(function (hours) { return '<option value="' + hours + '" ' + (state.sleepHours === hours ? "selected" : "") + '>' + hours + ' horas</option>'; }).join("") + '</select></label>' +
      '<label>¿A qué hora te gustaría estar durmiendo?<select id="welcome-bedtime">' + timeOptions(state.bedtime) + '</select></label></div><fieldset><legend>¿Cómo suelen ser tus noches?</legend><div class="welcome-flow-choice-pills">' + sleepChallenges.map(function (item) { return '<label><input type="radio" name="welcome-sleep-challenge" value="' + item[0] + '" ' + (state.sleepChallenge === item[0] ? "checked" : "") + '><span>' + item[1] + '</span></label>'; }).join("") + '</div></fieldset></section>' +
      '<label class="welcome-flow-check-card"><input id="welcome-quiet-evening" type="checkbox" ' + (state.quietEvening ? "checked" : "") + '><span><strong>🌙 Quiero noches más tranquilas</strong><small>Después de las 7:00 p. m. evitaremos colocar trabajo o estudio, siempre que tus compromisos fijos lo permitan.</small></span></label>' +
      '<section class="welcome-flow-wellbeing"><div class="welcome-flow-group-heading"><strong>Movimiento que sí encaje contigo</strong><small>No necesitas saber de ejercicio: elegiremos el formato, y tú podrás cambiarlo después.</small></div><div class="welcome-flow-rich-options welcome-flow-movement-options">' + movementStyles.map(function (item) { return '<label><input type="radio" name="welcome-movement-style" value="' + item[0] + '" ' + (state.movementStyle === item[0] ? "checked" : "") + '><span><strong>' + item[1] + '</strong><small>' + item[2] + '</small></span></label>'; }).join("") + '</div>' + minuteControl("¿Cuántos minutos quieres reservar para moverte?", "welcome-movement-minutes", state.movementMinutes, [0, 10, 15, 20, 30, 45, 60], 0, 240, "movement", "", "Puedes escribir otra cantidad. Si elegiste no incluir movimiento, usa “No reservar”.") + '</section>' +
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
      html += '<option value="' + value + '" ' + (value === selected ? "selected" : "") + '>' + formatClock(value) + '</option>';
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

  function formatClock(value) {
    var minutes = typeof value === "number" ? value : timeToMinutes(value);
    if (window.PLANIFY_SCHEDULE_TIME && typeof window.PLANIFY_SCHEDULE_TIME.formatTime12 === "function") return window.PLANIFY_SCHEDULE_TIME.formatTime12(minutes);
    var hour = Math.floor(minutes / 60) % 24;
    var minute = minutes % 60;
    return (hour % 12 || 12) + ":" + String(minute).padStart(2, "0") + (hour < 12 ? " a. m." : " p. m.") + (minutes === 1440 ? " (+1 día)" : "");
  }

  function formatClockRange(value) {
    if (window.PLANIFY_SCHEDULE_TIME && typeof window.PLANIFY_SCHEDULE_TIME.formatRange12 === "function") return window.PLANIFY_SCHEDULE_TIME.formatRange12(value);
    var times = String(value || "").match(/\d{2}:\d{2}/g) || [];
    return times.length === 2 ? formatClock(times[0]) + " – " + formatClock(times[1]) + (timeToMinutes(times[1]) <= timeToMinutes(times[0]) ? " (+1 día)" : "") : value;
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
      html += '<option value="' + value + '" ' + (value === selected ? "selected" : "") + '>' + formatClock(value) + '</option>';
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

  function parsePreviewRevision(value) {
    var normalized = normalizeCommandText(scheduleText(value, 180));
    if (!normalized) return { error: "Escribe el ajuste que quieres probar." };
    var exact = parseScheduleCommand(value);
    if (!exact.error) return { type: "slot", request: exact };
    var dayNames = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
    var day = dayNames.findIndex(function (name) { return new RegExp("\\b" + name + "\\b").test(normalized); });
    if (day >= 0 && /\b(libre|libera|liberar|descanso|sin actividades|nada programado)\b/.test(normalized)) return { type: "free-day", day: day };
    if (/\b(turnos?|guardias?)\b/.test(normalized) && /\b(cambian|varian|rotativos?|distintos)\b/.test(normalized)) {
      return { error: "No voy a adivinar tus turnos. Añade los días y horas que conoces en “Compromisos fijos”; los demás espacios quedarán disponibles." };
    }
    if (/\b(reparte|distribuye|altern|varia|diferentes dias|no repitas)\b/.test(normalized)) return { type: "spread" };
    if (/\b(tarde|por la tarde)\b/.test(normalized)) return { type: "time-of-day", value: "afternoon" };
    if (/\b(noche|por la noche|nocturno)\b/.test(normalized)) return { type: "time-of-day", value: "evening" };
    if (/\b(temprano|manana|por la manana)\b/.test(normalized)) return { type: "time-of-day", value: "morning" };
    if (/\b(menos carga|mas descanso|mas libre|mas liviano|mas ligera|menos intensidad|menos actividades)\b/.test(normalized)) return { type: "less-load" };
    if (/\b(mas enfoque|mas tiempo|mas estudio|mas trabajo|mas prioridad)\b/.test(normalized)) return { type: "more-focus" };
    if (/\b(equilibra|mas equilibrio|balancea)\b/.test(normalized)) return { type: "balance" };
    return { error: "No entendí ese ajuste todavía. Prueba “viernes libre”, “más descanso”, “reparte mejor” o indica un día y un rango de horas." };
  }

  function commandEditorMarkup(context) {
    if (context === "preview") {
      return '<section class="welcome-flow-command welcome-flow-refine"><span aria-hidden="true">🪄</span><div><strong>¿Qué te gustaría mejorar antes de guardar?</strong><small>El planificador local entiende algunos cambios habituales. Si una petición no queda clara, no la inventará.</small><label class="sr-only" for="welcome-change-command">Describe un cambio para toda tu propuesta</label><textarea id="welcome-change-command" maxlength="180" rows="2" placeholder="Ej.: Deja el viernes libre; reparte mejor el estudio; prefiero avanzar por la tarde.">' + escapeHtml(state.commandDraft) + '</textarea><div class="welcome-flow-refine-suggestions"><button type="button" data-welcome-command="Deja el viernes libre">Viernes libre</button><button type="button" data-welcome-command="Reparte mejor mis actividades">Repartir mejor</button><button type="button" data-welcome-command="Prefiero avanzar por la tarde">Por la tarde</button></div><button type="button" class="welcome-flow-refine-apply" data-welcome-action="apply-command">Actualizar toda la propuesta</button>' + (state.feedbackUndo.length ? '<button type="button" class="welcome-flow-refine-undo" data-welcome-action="undo-revision">Deshacer último ajuste</button>' : '') + '<em role="status" aria-live="polite">' + escapeHtml(state.commandMessage || "Nada se guarda hasta que elijas “Guardar este horario”.") + '</em></div></section>';
    }
    return '<section class="welcome-flow-command"><span aria-hidden="true">🪄</span><div><strong>Pide un cambio concreto</strong><small>El asistente local entiende cambios con día y hora. Tus datos no salen de este navegador.</small><div class="welcome-flow-command-row"><input id="schedule-change-command" maxlength="180" placeholder="Ej.: Pon gimnasio el martes de 6:00 p. m. a 7:00 p. m."><button type="button" data-welcome-action="apply-saved-command">Hacer cambio</button></div><em>' + escapeHtml(state.commandMessage || "También puedes escribir: “Deja libre el domingo de 3:00 p. m. a 5:00 p. m.”.") + '</em></div></section>';
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

  function rememberFeedbackRevision() {
    state.feedbackUndo.push({
      manualRequests: state.manualRequests.map(function (item) { return Object.assign({}, item); }),
      edits: JSON.parse(JSON.stringify(state.edits)),
      rowTimes: JSON.parse(JSON.stringify(state.rowTimes)),
      days: state.days.slice(),
      weeklyFrequency: state.weeklyFrequency,
      energyPeak: state.energyPeak,
      priority: state.priority,
      previewDay: state.previewDay,
      previewMode: state.previewMode
    });
    if (state.feedbackUndo.length > 8) state.feedbackUndo.shift();
  }

  function applyPreviewRevision(command) {
    var parsed = parsePreviewRevision(command);
    if (parsed.error) return parsed.error;
    if (parsed.type === "slot") {
      var conflict = expandedFixed().find(function (fixed) {
        return fixed.day === parsed.request.day && parsed.request.start < timeToMinutes(fixed.end) && parsed.request.end > timeToMinutes(fixed.start);
      });
      if (conflict) return "Ese cambio se cruza con “" + conflict.title + "”. No moví el compromiso fijo.";
      var requestConflict = state.manualRequests.find(function (item) {
        return Number(item.day) === parsed.request.day && parsed.request.start < Number(item.end) && parsed.request.end > Number(item.start);
      });
      if (requestConflict) return "Ese horario se cruza con otro ajuste que ya pediste. Deshazlo o elige un rango distinto.";
    }
    var hasConcreteGoal = splitDeclaredActivities(state.goal).some(function (activity) { return !/posterg|procrast|dejo para despues/i.test(normalizeCommandText(activity)); });
    if ((parsed.type === "less-load" || parsed.type === "more-focus") && !hasConcreteGoal) return "Para ajustar los días de enfoque necesito una actividad concreta. No elegiré una tarea por ti.";
    if (parsed.type === "less-load" && state.weeklyFrequency <= 1) return "Ya dejamos solo un día de enfoque; puedes pedir más espacios libres o ajustar otro aspecto.";
    if (parsed.type === "more-focus" && state.weeklyFrequency >= Math.max(1, state.days.length)) return "Ya hay un bloque de enfoque en cada día activo. Puedes indicar una actividad y un horario para reorganizarla.";

    rememberFeedbackRevision();
    var message = "";
    if (parsed.type === "slot") {
      var request = parsed.request;
      if (state.days.indexOf(request.day) < 0) state.days.push(request.day);
      state.manualRequests.push(request);
      state.previewDay = request.day;
      state.previewMode = "daily";
      message = "Propuesta actualizada: " + DAY_LABELS[request.day] + ", " + minutesToTime(request.start) + "–" + minutesToTime(request.end) + (request.text ? " · " + request.text : " libre") + ".";
    } else if (parsed.type === "free-day") {
      var dayTime = state.dayTimes[parsed.day] || {};
      var start = timeToMinutes(dayTime.start || state.start);
      var end = timeToMinutes(dayTime.end || state.end);
      state.manualRequests = state.manualRequests.filter(function (item) { return Number(item.day) !== parsed.day; });
      state.manualRequests.push({ day: parsed.day, start: start, end: end, text: "", category: "libre" });
      state.previewDay = parsed.day;
      state.previewMode = "daily";
      message = "Propuesta actualizada: " + DAY_LABELS[parsed.day] + " queda libre, salvo los compromisos fijos que ya indicaste.";
    } else if (parsed.type === "less-load") {
      state.weeklyFrequency = Math.max(1, state.weeklyFrequency - 1);
      message = "Propuesta actualizada: distribuí el enfoque en menos días y dejé más espacios disponibles.";
    } else if (parsed.type === "more-focus") {
      state.weeklyFrequency = Math.min(Math.max(1, state.days.length), state.weeklyFrequency + 1);
      message = "Propuesta actualizada: añadí un día para avanzar tu prioridad.";
    } else if (parsed.type === "spread") {
      state.energyPeak = "variable";
      message = "Propuesta actualizada: repartí los bloques en distintos momentos de tus días activos.";
    } else if (parsed.type === "time-of-day") {
      state.energyPeak = parsed.value;
      message = "Propuesta actualizada: prioricé tus bloques de enfoque " + (parsed.value === "afternoon" ? "por la tarde" : parsed.value === "evening" ? "por la noche" : "por la mañana") + ".";
    } else if (parsed.type === "balance") {
      state.priority = "balance";
      message = "Propuesta actualizada: equilibré la prioridad con los demás espacios de la semana.";
    }
    state.commandDraft = "";
    state.commandMessage = message + " Revisa el horario; todavía no se ha guardado.";
    state.edits = {};
    state.rowTimes = {};
    state.editing = false;
    render();
    return null;
  }

  function undoFeedbackRevision() {
    var previous = state.feedbackUndo.pop();
    if (!previous) return;
    state.manualRequests = previous.manualRequests;
    state.days = previous.days;
    state.weeklyFrequency = previous.weeklyFrequency;
    state.energyPeak = previous.energyPeak;
    state.priority = previous.priority;
    state.previewDay = previous.previewDay;
    state.previewMode = previous.previewMode;
    state.commandDraft = "";
    state.commandMessage = "Deshice el último ajuste. Tu propuesta anterior sigue sin guardar.";
    state.edits = previous.edits;
    state.rowTimes = previous.rowTimes;
    state.editing = false;
    render();
  }

  function placeWeeklyRange(day, source, nextStart, nextEnd, requestedTargetDay) {
    if (!source || nextEnd <= nextStart) return "El bloque necesita una hora de inicio y una hora final válidas.";
    var proposal = buildProposal();
    var sourceDay = Number(day);
    var targetDay = requestedTargetDay == null ? sourceDay : Number(requestedTargetDay);
    var dayBounds = proposal.dayBounds[targetDay] || {};
    var dayStart = Number(dayBounds.start);
    var dayEnd = Number(dayBounds.end);
    if (nextStart < dayStart || nextEnd > dayEnd) return "Ese bloque saldría de las horas que elegiste para " + DAY_LABELS[targetDay] + ".";
    if (targetDay === sourceDay && nextStart === source.start && nextEnd === source.end) return "";

    var fixedConflict = expandedFixed().find(function (fixed) {
      return Number(fixed.day) === targetDay && nextStart < timeToMinutes(fixed.end) && nextEnd > timeToMinutes(fixed.start);
    });
    if (fixedConflict) return "Ese espacio coincide con el compromiso fijo “" + fixedConflict.title + "”. No lo moví.";

    var requestConflict = state.manualRequests.find(function (item) {
      var overlapsSource = Number(item.day) === sourceDay && Number(item.start) === source.start && Number(item.end) === source.end;
      var sameActivity = targetDay === sourceDay && String(item.text || "").trim() === String(source.text || "").trim();
      return !overlapsSource && Boolean(String(item.text || "").trim()) && Number(item.day) === targetDay && nextStart < Number(item.end) && nextEnd > Number(item.start) && !sameActivity;
    });
    if (requestConflict) return "Ese espacio ya tiene un cambio manual. Elige otro horario para no reemplazarlo.";

    var occupied = proposal.filas.some(function (row, rowIndex) {
      var rowTimes = String(row.hora || "").match(/\d{2}:\d{2}/g) || [];
      var cell = row.celdas[targetDay];
      if (rowTimes.length !== 2 || !cell || !cell.t || cell.c === "libre" || Number(cell.rowspan) === 0) return false;
      var cellStart = timeToMinutes(rowTimes[0]);
      var span = Math.max(1, Number(cell.rowspan) || 1);
      var lastRow = proposal.filas[Math.min(proposal.filas.length - 1, rowIndex + span - 1)];
      var lastTimes = lastRow && String(lastRow.hora || "").match(/\d{2}:\d{2}/g) || rowTimes;
      var cellEnd = timeToMinutes(lastTimes[1] || rowTimes[1]);
      var isSource = targetDay === sourceDay && cellStart === source.start && cellEnd === source.end;
      var sameActivity = targetDay === sourceDay && String(cell.t || "").trim() === String(source.text || "").trim();
      return !isSource && cellStart < nextEnd && cellEnd > nextStart && !sameActivity;
    });
    if (occupied) return "Ese horario ya tiene otra actividad. Elige un espacio libre para mover el bloque.";

    var previousRequest = state.manualRequests.find(function (item) {
      return Number(item.day) === sourceDay && Number(item.start) === source.start && Number(item.end) === source.end && Boolean(String(item.text || "").trim());
    });
    var focusCreditMinutes = previousRequest ? Math.max(0, Number(previousRequest.focusCreditMinutes) || 0) : proposal.filas.reduce(function (total, row, index) {
      var times = String(row.hora || "").match(/\d{2}:\d{2}/g) || [];
      if (times.length !== 2 || timeToMinutes(times[0]) < source.start || timeToMinutes(times[1]) > source.end) return total;
      return total + (Number(proposal.focusCredits[sourceDay + "_" + index]) || 0);
    }, 0);
    var replacedProjectIds = previousRequest && Array.isArray(previousRequest.replacedProjectIds) ? previousRequest.replacedProjectIds.slice() : [];
    proposal.filas.forEach(function (row, index) {
      var times = String(row.hora || "").match(/\d{2}:\d{2}/g) || [];
      if (times.length !== 2 || timeToMinutes(times[0]) < source.start || timeToMinutes(times[1]) > source.end) return;
      var projectId = proposal.projectOrigins[sourceDay + "_" + index];
      if (projectId && replacedProjectIds.indexOf(projectId) < 0) replacedProjectIds.push(projectId);
    });

    rememberFeedbackRevision();
    proposal.filas.forEach(function (row, index) {
      var rowTimes = String(row.hora || "").match(/\d{2}:\d{2}/g) || [];
      if (rowTimes.length !== 2) return;
      var rowStart = timeToMinutes(rowTimes[0]);
      var rowEnd = timeToMinutes(rowTimes[1]);
      if (rowStart < source.end && rowEnd > source.start) delete state.edits[sourceDay + "_" + index];
      if (rowStart < nextEnd && rowEnd > nextStart) delete state.edits[targetDay + "_" + index];
    });
    state.manualRequests = state.manualRequests.filter(function (item) {
      var isSource = Number(item.day) === sourceDay && Number(item.start) === source.start && Number(item.end) === source.end;
      var overlapsTarget = Number(item.day) === targetDay && Number(item.start) < nextEnd && Number(item.end) > nextStart;
      var sameMergedActivity = targetDay === sourceDay && overlapsTarget && String(item.text || "").trim() === String(source.text || "").trim();
      return !isSource && !sameMergedActivity && !(overlapsTarget && !String(item.text || "").trim());
    });
    var moving = targetDay !== sourceDay || nextEnd - nextStart === source.end - source.start && nextStart !== source.start;
    if (targetDay !== sourceDay) {
      state.manualRequests.push({ day: sourceDay, start: source.start, end: source.end, text: "", category: "libre", focusCreditMinutes: focusCreditMinutes });
    } else if (!moving) {
      if (nextStart > source.start) state.manualRequests.push({ day: sourceDay, start: source.start, end: nextStart, text: "", category: "libre" });
      if (nextEnd < source.end) state.manualRequests.push({ day: sourceDay, start: nextEnd, end: source.end, text: "", category: "libre" });
    } else {
      state.manualRequests.push({ day: sourceDay, start: source.start, end: source.end, text: "", category: "libre" });
    }
    state.manualRequests.push({ day: targetDay, start: nextStart, end: nextEnd, text: source.text, category: source.category, focusCreditMinutes: targetDay === sourceDay ? focusCreditMinutes : 0, replacedProjectIds: replacedProjectIds });
    state.previewDay = targetDay;
    state.previewMode = "weekly";
    state.commandMessage = "Listo: el bloque quedó de " + formatClock(nextStart) + " a " + formatClock(nextEnd) + ". Revisa la propuesta; aún no se ha guardado.";
    state.editing = false;
    render();
    return "";
  }

  function showWeeklyResizeFeedback(message) {
    var status = document.querySelector(".welcome-flow-weekly-action-status");
    if (status) status.innerHTML = message ? '<span role="status" aria-live="polite">' + escapeHtml(message) + '</span>' : "";
  }

  function weeklyQuickActions(canJoinBefore, canJoinAfter, canShorten) {
    var buttons = [];
    if (canJoinBefore) buttons.push('<button type="button" data-week-quick="before" aria-label="Unir con el espacio anterior del mismo día">Unir ↑</button>');
    if (canJoinAfter) buttons.push('<button type="button" data-week-quick="after" aria-label="Unir con el espacio siguiente del mismo día">Unir ↓</button>');
    if (canShorten) buttons.push('<button type="button" data-week-quick="shorten" aria-label="Acortar este bloque y liberar el último espacio">Acortar</button>');
    return buttons.length ? '<div class="welcome-flow-week-quick-actions" aria-label="Ajustar duración del bloque">' + buttons.join("") + '</div>' : "";
  }

  function canJoinWeeklyNeighbor(proposal, day, rowIndex, span, direction) {
    var neighborIndex = direction === "before" ? rowIndex - 1 : rowIndex + span;
    var neighbor = proposal.filas[neighborIndex];
    var bounds = proposal.dayBounds[day];
    if (!neighbor || !bounds) return false;
    var times = String(neighbor.hora || "").match(/\d{2}:\d{2}/g) || [];
    if (times.length !== 2 || timeToMinutes(times[0]) < bounds.start || timeToMinutes(times[1]) > bounds.end) return false;
    var cell = neighbor.celdas && neighbor.celdas[day];
    return !cell || Number(cell.rowspan) !== 0 && !String(cell.t || "").trim();
  }

  function adjustWeeklyCellByOne(cell, direction) {
    if (!cell || cell.getAttribute("data-week-fixed") === "true") return;
    var input = cell.querySelector("[data-week-inline-edit],[data-day-inline-edit]");
    var text = String(input ? input.value : cell.getAttribute("data-week-text") || "").trim();
    if (!text) { showWeeklyResizeFeedback("Escribe primero una actividad para poder unirla."); return; }
    var source = {
      start: timeToMinutes(cell.getAttribute("data-week-start")),
      end: timeToMinutes(cell.getAttribute("data-week-end")),
      text: text,
      category: cell.getAttribute("data-week-category") || "clase"
    };
    var boundaries = weeklyTimeBoundaries();
    var edge = direction === "before" ? source.start : source.end;
    var index = boundaries.indexOf(edge);
    var next = boundaries[index + (direction === "before" || direction === "shorten" ? -1 : 1)];
    if (index < 0 || next == null || direction === "shorten" && next <= source.start) {
      showWeeklyResizeFeedback("Llegaste al límite de este bloque; el horario no cambió.");
      return;
    }
    var nextStart = direction === "before" ? next : source.start;
    var nextEnd = direction === "before" ? source.end : next;
    var day = Number(cell.getAttribute("data-week-day"));
    var viewSelector = cell.closest(".welcome-flow-weekly-mobile-view") ? ".welcome-flow-weekly-mobile-view" : ".welcome-flow-weekly-desktop";
    var error = placeWeeklyRange(day, source, nextStart, nextEnd);
    showWeeklyResizeFeedback(error || (direction === "shorten" ? "Bloque acortado; el espacio final quedó libre." : state.example ? "Celdas unidas en el ejemplo; no se guardará." : "Celdas unidas en un solo bloque. Puedes deshacer el cambio antes de guardar."));
    if (!error) {
      var updated = Array.prototype.slice.call(document.querySelectorAll(viewSelector + ' [data-week-cell][data-week-day="' + day + '"][data-week-start="' + minutesToTime(nextStart) + '"]')).find(function (candidate) {
        return candidate.getClientRects().length > 0;
      });
      var button = updated && (updated.querySelector('[data-week-quick="' + direction + '"]') || updated.querySelector("[data-week-quick]"));
      if (button) button.focus({ preventScroll: true });
    }
  }

  function setPreviewColumnWidth(day, requestedWidth) {
    var index = Number(day);
    if (!Number.isInteger(index) || index < 0 || index >= DAYS.length) return 0;
    var width = Math.round(Math.max(84, Math.min(320, Number(requestedWidth) || 84)));
    state.previewColumnWidths[index] = width;
    var table = document.querySelector(".welcome-flow-weekly");
    if (!table) return width;
    var column = table.querySelector('col[data-week-column="' + index + '"]');
    if (column) column.style.width = width + "px";
    var grip = table.querySelector('th[data-week-column-resize="' + index + '"] [data-week-width-grip]');
    if (grip) grip.setAttribute("aria-valuenow", String(width));
    var total = 88 + DAYS.reduce(function (sum, _, columnIndex) {
      return sum + (Number(state.previewColumnWidths[columnIndex]) || 84);
    }, 0);
    table.style.width = total + "px";
    table.style.minWidth = total + "px";
    return width;
  }

  function weeklyTimeBoundaries() {
    return Array.from(new Set(buildProposal().filas.reduce(function (list, row) {
      var times = String(row.hora || "").match(/\d{2}:\d{2}/g) || [];
      return list.concat(times.map(timeToMinutes));
    }, []))).sort(function (a, b) { return a - b; });
  }

  function weeklyBoundaryAtPointer(drag, clientY) {
    if (!drag.boundaries.length) return null;
    if (drag.table && drag.table.matches("table")) {
      var rows = Array.prototype.slice.call(drag.table.querySelectorAll("tbody tr[data-week-row-index]"));
      var candidates = [];
      rows.forEach(function (row) {
        var rect = row.getBoundingClientRect();
        var start = row.getAttribute("data-week-row-start");
        var end = row.getAttribute("data-week-row-end");
        if (start) candidates.push({ y: rect.top, time: timeToMinutes(start) });
        if (end) candidates.push({ y: rect.bottom, time: timeToMinutes(end) });
      });
      if (!candidates.length) return null;
      if (clientY < candidates[0].y - 28 || clientY > candidates[candidates.length - 1].y + 28) return null;
      var nearest = candidates.reduce(function (best, candidate) {
        return Math.abs(candidate.y - clientY) < Math.abs(best.y - clientY) ? candidate : best;
      });
      return nearest.time;
    }
    // La vista de un día agrupa bloques; sus <li> no equivalen a intervalos de tiempo.
    // Un paso táctil corresponde al siguiente límite real de la propuesta.
    var origin = drag.side === "start" ? drag.source.start : drag.source.end;
    var index = drag.boundaries.indexOf(origin);
    if (index < 0) return null;
    var offset = Math.round((clientY - drag.startY) / 44);
    return drag.boundaries[Math.max(0, Math.min(drag.boundaries.length - 1, index + offset))];
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
          if (!next || next.rowspan === 0 || next.t !== first.t) break;
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
    var allProjects = state.projects.slice();
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
    var selectedDuration = Number(state.blockDuration);
    if (!Number.isInteger(selectedDuration) || selectedDuration < 5 || selectedDuration > 180) selectedDuration = 30;
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
    if (state.lifeDetailsUsed && /^\d{2}:\d{2}$/.test(state.caffeineCutoff || "")) activeDays.forEach(function (day) {
      var caffeineAt = timeToMinutes(state.caffeineCutoff);
      if (caffeineAt >= dayBounds[day].start && caffeineAt < dayBounds[day].end) reminderTimes.push({ type: "caffeine", at: caffeineAt, day: day });
    });
    if (state.mode === "detailed" && state.reminders.medicine) activeDays.forEach(function (day) { reminderTimes.push({ type: "medicine", at: timeToMinutes(state.medicineTime), day: day }); });
    if (state.mode === "detailed" && state.reminders.custom && state.customReminder) activeDays.forEach(function (day) { reminderTimes.push({ type: "custom", at: timeToMinutes(state.customReminderTime), day: day }); });
    var commuteBlocks = [];
    var commuteOmittedDays = [];
    var commuteMinutes = Math.max(0, Number(state.commuteMinutes) || 0);
    var preparationMinutes = Math.max(0, Number(state.preparationMinutes) || 0);
    if (state.lifeDetailsUsed && (commuteMinutes || preparationMinutes)) activeDays.forEach(function (day) {
      var firstDestination = fixedEntries.filter(function (item) {
        return item.title && Number(item.day) === day && ["work", "course", "practice"].indexOf(item.type) >= 0;
      }).sort(function (left, right) { return timeToMinutes(left.start) - timeToMinutes(right.start); })[0];
      if (!firstDestination) return;
      var destinationStart = timeToMinutes(firstDestination.start);
      var commuteStart = destinationStart - commuteMinutes;
      var preparationStart = commuteStart - preparationMinutes;
      var routeParts = [];
      if (preparationMinutes) routeParts.push({ day: day, start: preparationStart, end: commuteStart, text: "Prepararme para salir", category: "rutina" });
      if (commuteMinutes) routeParts.push({ day: day, start: commuteStart, end: destinationStart, text: "Traslado · Casa → trabajo o estudios", category: "rutina" });
      var conflictsWithCommitment = fixedEntries.some(function (item) {
        return item !== firstDestination && item.title && Number(item.day) === day && routeParts.some(function (part) {
          return part.start < timeToMinutes(item.end) && part.end > timeToMinutes(item.start);
        });
      });
      var conflictsWithManualChange = state.manualRequests.some(function (item) {
        return Number(item.day) === day && routeParts.some(function (part) { return part.start < Number(item.end) && part.end > Number(item.start); });
      });
      if (preparationStart < 0 || conflictsWithCommitment || conflictsWithManualChange) {
        commuteOmittedDays.push(day);
        return;
      }
      commuteBlocks = commuteBlocks.concat(routeParts);
      if (preparationMinutes || commuteMinutes) dayBounds[day].start = Math.min(dayBounds[day].start, preparationStart);
    });
    startMinutes = Math.min.apply(null, activeDays.map(function (day) { return dayBounds[day].start; }));
    endMinutes = Math.max.apply(null, activeDays.map(function (day) { return dayBounds[day].end; }));
    activeDays.forEach(function (day) { edges.push(dayBounds[day].start); });
    commuteBlocks.forEach(function (block) { edges.push(block.start, block.end); });
    var planningDays = activeDays.filter(function (day) {
      var bounds = dayBounds[day];
      return !state.manualRequests.some(function (item) {
        return Number(item.day) === day && !item.text && item.category === "libre" && item.start <= bounds.start && item.end >= bounds.end;
      });
    });
    var projectBlocks = [];
    var unplacedProjectBlocks = [];
    allProjects.forEach(function (project, projectIndex) {
      var projectDays = Array.isArray(project.days) && project.days.length ? project.days : distributeDays(planningDays, project.sessions);
      var projectDuration = Number(project.duration || selectedDuration);
      if (!Number.isInteger(projectDuration) || projectDuration < 5 || projectDuration > 480) projectDuration = selectedDuration;
      projectDays.forEach(function (day, sessionIndex) {
        if (activeDays.indexOf(Number(day)) < 0) return;
        var originId = projectIndex + ":" + Number(day) + ":" + sessionIndex;
        if (state.manualRequests.some(function (item) { return Array.isArray(item.replacedProjectIds) && item.replacedProjectIds.indexOf(originId) >= 0; })) return;
        var bounds = dayBounds[day];
        var dayEnd = bounds.end;
        if (state.freeMinutes) dayEnd = Math.min(dayEnd, bounds.end - Number(state.freeMinutes));
        if (state.quietEvening) dayEnd = Math.min(dayEnd, 19 * 60);
        var bedtime = timeToMinutes(state.bedtime);
        if (state.wantMoreQuestions && bedtime > bounds.start && bedtime < bounds.end) {
          dayEnd = Math.min(dayEnd, bedtime - Math.max(0, Number(state.sleepHours || 8) - 8) * 30);
        }
        var earliest = bounds.start + (state.startStyle === "gentle" ? selectedDuration : 0);
        var placedProject = false;
        for (var candidate = earliest; candidate + projectDuration <= dayEnd; candidate += selectedDuration) {
          var period = candidate < 12 * 60 ? "morning" : candidate < 18 * 60 ? "afternoon" : "evening";
          if (project.preferred && project.preferred !== "any" && project.preferred !== period) continue;
          var overlapsFixed = fixedEntries.some(function (item) {
            return item.title && Number(item.day) === Number(day) && candidate < timeToMinutes(item.end) && candidate + projectDuration > timeToMinutes(item.start);
          });
          var overlapsManual = state.manualRequests.some(function (item) {
            return Number(item.day) === Number(day) && candidate < item.end && candidate + projectDuration > item.start;
          });
          var overlapsCommute = commuteBlocks.some(function (item) {
            return Number(item.day) === Number(day) && candidate < item.end && candidate + projectDuration > item.start;
          });
          var overlapsProject = projectBlocks.some(function (item) {
            return Number(item.day) === Number(day) && candidate < item.end && candidate + projectDuration > item.start;
          });
          if (overlapsFixed || overlapsManual || overlapsCommute || overlapsProject) continue;
          projectBlocks.push({ day: Number(day), start: candidate, end: candidate + projectDuration, project: project, originId: originId });
          edges.push(candidate, candidate + projectDuration);
          placedProject = true;
          break;
        }
        if (!placedProject) unplacedProjectBlocks.push({ day: Number(day), title: project.title, duration: projectDuration });
      });
    });
    edges = Array.from(new Set(edges)).filter(function (edge) { return edge >= startMinutes && edge <= endMinutes; }).sort(function (a, b) { return a - b; });
    var rows = [];
    var focusCredits = {};
    var projectOrigins = {};
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
      personal: { text: "Hábito o proyecto personal", category: "flexible" },
      procrastination: { text: "Empezar una tarea que suelo postergar", category: "flexible" }
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
    if (state.priority === "procrastination" && !state.goal) goalText = "Elegir una tarea pendiente y empezar por el siguiente paso";
    var goalActivities = splitDeclaredActivities(state.goal).filter(function (activity) {
      return !/posterg|procrast|dejo para despues/i.test(normalizeCommandText(activity));
    });
    var hasConcreteGoal = goalActivities.length > 0;
    var focusDays = !state.goal || state.priority === "procrastination" && !hasConcreteGoal ? [] : distributeDays(planningDays, state.weeklyFrequency);
    var targetMinutesPerDay = selectedDuration * Math.max(1, Number(state.sessionsPerDay) || 1);
    activeDays.forEach(function (day) {
      var dayStart = dayBounds[day].start;
      var dayEnd = dayBounds[day].end;
      var focusDayIndex = focusDays.indexOf(day);
      var creditedMinutes = state.manualRequests.reduce(function (total, item) {
        return Number(item.day) === day ? total + Math.max(0, Number(item.focusCreditMinutes) || 0) : total;
      }, 0);
      var focusTargetMinutes = focusDayIndex < 0 ? 0 : Math.max(0, targetMinutesPerDay - creditedMinutes);
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
        var commute = commuteBlocks.find(function (item) { return Number(item.day) === day && slotStart >= item.start && slotEnd <= item.end; });
        var projectBlock = projectBlocks.find(function (item) { return Number(item.day) === day && slotStart >= item.start && slotEnd <= item.end; });
        var text = "";
        var category = "libre";
        var reminder = false;
        var reminderLabels = [];
        if (fixed) {
          text = fixed.title;
          category = fixed.type === "course" || fixed.type === "practice" || /clase|estudio|curso/i.test(text) ? "estudio" : fixed.type === "work" || /trabajo|reuni|empresa|informe/i.test(text) ? "clase" : "rutina";
        } else if (manual) {
          text = manual.text;
          category = manual.category;
        } else if (commute) {
          text = commute.text;
          category = commute.category;
        } else if (projectBlock) {
          text = projectBlock.project.title;
          category = projectBlock.project.type === "course" ? "estudio" : projectBlock.project.type === "personal" ? "flexible" : "clase";
          projectOrigins[day + "_" + rowIndex] = projectBlock.originId;
        } else if (fullGeneratedSlot && slotStart >= protectedFreeStart) {
          text = "Tiempo libre protegido";
          category = "desconexion";
        } else if (fullGeneratedSlot && placed < focusTargetMinutes && slotStart >= focusStart) {
          text = goalActivities.length > 1 ? goalActivities[focusDayIndex % goalActivities.length] : goalText;
          if (state.mode === "detailed" && state.priority === "study" && state.reminders.study && state.technique !== "custom") {
            text += state.technique === "deep" ? " · Enfoque 50/10" : " · Pomodoro 25/5";
          }
          category = focus.category;
          placed += slotEnd - slotStart;
          focusCredits[day + "_" + rowIndex] = slotEnd - slotStart;
          reminder = state.mode === "detailed" && ((state.priority === "study" && state.reminders.study) || (state.priority === "work" && state.reminders.work) || (state.priority === "balance" && (state.reminders.study || state.reminders.work)));
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
          text = category === "libre" ? "" : subtleIcon(category, String(edit.text || defaultTextForCategory(category)).trim());
        }
        if (text) row.celdas[day] = { t: subtleIcon(category, text), c: category, done: false, reminder: reminder, reminderLabel: reminderLabels.join(" · "), rowspan: 1 };
      });
    });
    mergeConsecutiveCells(rows);
    return { dias: DAYS.slice(), filas: rows, focusCredits: focusCredits, projectOrigins: projectOrigins, plannedDays: activeDays, focusDays: focusDays, dayBounds: dayBounds, commuteBlocks: commuteBlocks, commuteOmittedDays: commuteOmittedDays, unplacedProjectBlocks: unplacedProjectBlocks };
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
    var previewTimes = proposal.dayBounds[previewDay] || state.dayTimes[previewDay] || {};
    var previewStart = typeof previewTimes.start === "number" ? previewTimes.start : timeToMinutes(previewTimes.start || state.start);
    var previewEnd = typeof previewTimes.end === "number" ? previewTimes.end : timeToMinutes(previewTimes.end || state.end);
    var previewRows = proposal.filas.map(function (row, rowIndex) { return { row: row, rowIndex: rowIndex }; }).filter(function (entry) {
      var bounds = entry.row.hora.match(/\d{2}:\d{2}/g) || [];
      return bounds.length === 2 && timeToMinutes(bounds[0]) >= previewStart && timeToMinutes(bounds[1]) <= previewEnd;
    });
    var sampleDay = previewRows.filter(function (entry) {
      var visibleCell = entry.row.celdas[previewDay];
      return !visibleCell || visibleCell.rowspan !== 0;
    }).map(function (entry) {
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
      var span = Math.max(1, Number(cell && cell.rowspan) || 1);
      var lastDayRow = proposal.filas[Math.min(proposal.filas.length - 1, rowIndex + span - 1)];
      var lastDayTimes = lastDayRow && String(lastDayRow.hora || "").match(/\d{2}:\d{2}/g);
      if (!state.editing && lastDayTimes && lastDayTimes[1]) blockEnd = lastDayTimes[1];
      var isFixedBlock = expandedFixed().some(function (fixed) {
        return Number(fixed.day) === previewDay && timeToMinutes(blockStart) < timeToMinutes(fixed.end) && timeToMinutes(blockEnd) > timeToMinutes(fixed.start);
      });
      var weekCellAttributes = ' data-week-cell data-week-day="' + previewDay + '" data-week-index="' + rowIndex + '" data-week-span="' + span + '" data-week-start="' + blockStart + '" data-week-end="' + blockEnd + '" data-week-category="' + escapeHtml(category) + '" data-week-text="' + escapeHtml(text) + '" data-week-fixed="' + (isFixedBlock ? "true" : "false") + '"';
      var mobileAction = isFixedBlock ? '<small class="welcome-flow-week-fixed">Compromiso fijo</small>' : text ? '<span class="welcome-flow-resize-grip is-start" data-week-resize="start" role="separator" tabindex="0" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="1440" aria-valuenow="' + timeToMinutes(blockStart) + '" aria-valuetext="' + formatClock(blockStart) + '" aria-label="Ajustar inicio de ' + escapeHtml(text) + '"></span><span class="welcome-flow-resize-grip is-end" data-week-resize="end" role="separator" tabindex="0" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="1440" aria-valuenow="' + timeToMinutes(blockEnd) + '" aria-valuetext="' + formatClock(blockEnd) + '" aria-label="Ajustar fin de ' + escapeHtml(text) + '; arrastra para alargar, acortar o unir con la misma actividad"></span>' : "";
      if (text && !isFixedBlock) mobileAction += weeklyQuickActions(
        canJoinWeeklyNeighbor(proposal, previewDay, rowIndex, span, "before"),
        canJoinWeeklyNeighbor(proposal, previewDay, rowIndex, span, "after"), span > 1);
      var inlineText = '<textarea rows="1" class="welcome-flow-inline-activity" data-day-inline-edit data-inline-day="' + previewDay + '" data-inline-index="' + rowIndex + '" data-inline-span="' + span + '" data-inline-category="' + escapeHtml(category) + '" aria-label="Editar actividad del ' + DAY_LABELS[previewDay] + ', ' + formatClock(blockStart) + ' a ' + formatClock(blockEnd) + '" placeholder="Escribe aquí o deja el espacio libre">' + escapeHtml(text) + '</textarea>';
      return '<li class="welcome-flow-simple-row welcome-flow-weekly-day-row"' + weekCellAttributes + '><span>' + formatClock(blockStart) + ' – ' + formatClock(blockEnd) + '</span><i class="welcome-flow-category-dot welcome-flow-category-' + escapeHtml(category) + '"></i><div class="welcome-flow-weekly-day-activity">' + inlineText + reminderLabel + mobileAction + '</div></li>';
    }).join("");
    var dayTabs = proposal.plannedDays.map(function (day) {
      return '<button type="button" data-preview-day="' + day + '" class="' + (day === previewDay ? "is-selected" : "") + '">' + DAY_LABELS[day] + '</button>';
    }).join("");
    var weeklyDayTabs = proposal.plannedDays.map(function (day) {
      return '<button type="button" data-weekly-preview-day="' + day + '" class="' + (day === previewDay ? "is-selected" : "") + '" aria-pressed="' + (day === previewDay ? "true" : "false") + '">' + DAY_LABELS[day] + '</button>';
    }).join("");
    var weeklySkipped = {};
    var defaultWeekWidth = Math.max(700, Math.min(1400, (window.innerWidth || 1024) - 48));
    var defaultDayWidth = Math.max(132, Math.round((defaultWeekWidth - 88) / DAYS.length));
    var dayColumnWidths = DAYS.map(function (_, day) {
      var width = Number(state.previewColumnWidths[day]);
      if (!Number.isFinite(width)) width = defaultDayWidth;
      width = Math.max(84, Math.min(320, width));
      state.previewColumnWidths[day] = width;
      return width;
    });
    var weeklyTableWidth = 88 + dayColumnWidths.reduce(function (sum, width) { return sum + width; }, 0);
    var weeklyColGroup = '<colgroup><col style="width:88px">' + dayColumnWidths.map(function (width, day) { return '<col data-week-column="' + day + '" style="width:' + width + 'px">'; }).join("") + '</colgroup>';
    var weeklyHeaders = DAYS.map(function (day, dayIndex) {
      return '<th class="welcome-flow-weekly-day-heading" data-week-column-resize="' + dayIndex + '">' + day.slice(0, 3) + '<span class="welcome-flow-column-grip" data-week-width-grip role="separator" tabindex="0" aria-orientation="vertical" aria-valuemin="84" aria-valuemax="320" aria-valuenow="' + dayColumnWidths[dayIndex] + '" aria-label="Ancho de ' + DAY_LABELS[dayIndex] + '. Arrastra a un lado o usa flechas izquierda y derecha."></span></th>';
    }).join("");
    var weeklyRows = proposal.filas.map(function (row, rowIndex) {
      var rowTimes = String(row.hora || "").match(/\d{2}:\d{2}/g) || [];
      return '<tr data-week-row-index="' + rowIndex + '" data-week-row-start="' + (rowTimes[0] || "") + '" data-week-row-end="' + (rowTimes[1] || "") + '"><th>' + escapeHtml(formatClockRange(row.hora)) + '</th>' + row.celdas.map(function (cell, day) {
        if (weeklySkipped[day + "_" + rowIndex] || cell && cell.rowspan === 0) return "";
        var active = proposal.plannedDays.indexOf(day) >= 0;
        var text = cell && cell.t ? cell.t : "";
        var reminder = cell && cell.reminder ? '<span class="welcome-flow-reminder-badge" title="' + escapeHtml(cell.reminderLabel || "Recordatorio") + '">🔔</span>' : "";
        var span = Math.max(1, Number(cell && cell.rowspan) || 1);
        for (var offset = 1; offset < span; offset += 1) weeklySkipped[day + "_" + (rowIndex + offset)] = true;
        var cellStart = rowTimes[0] || "";
        var cellEndRow = proposal.filas[Math.min(proposal.filas.length - 1, rowIndex + span - 1)];
        var cellEndTimes = cellEndRow && String(cellEndRow.hora || "").match(/\d{2}:\d{2}/g) || rowTimes;
        var cellEnd = cellEndTimes[1] || rowTimes[1] || "";
        var category = cell && cell.c || "libre";
        var isFixed = active && expandedFixed().some(function (fixed) {
          return Number(fixed.day) === day && timeToMinutes(cellStart) < timeToMinutes(fixed.end) && timeToMinutes(cellEnd) > timeToMinutes(fixed.start);
        });
        var quickActions = text && !isFixed ? weeklyQuickActions(
          canJoinWeeklyNeighbor(proposal, day, rowIndex, span, "before"),
          canJoinWeeklyNeighbor(proposal, day, rowIndex, span, "after"), span > 1) : "";
        var cellContent = active ? '<div class="welcome-flow-week-cell-content"><textarea rows="1" class="welcome-flow-week-inline-activity" data-week-inline-edit data-inline-day="' + day + '" data-inline-index="' + rowIndex + '" data-inline-span="' + span + '" data-inline-category="' + escapeHtml(category) + '" aria-label="Actividad del ' + DAY_LABELS[day] + ', ' + formatClock(cellStart) + ' a ' + formatClock(cellEnd) + '" placeholder="Añadir actividad">' + escapeHtml(text) + '</textarea>' + reminder +
          (text && !isFixed ? '<span class="welcome-flow-resize-grip is-start" data-week-resize="start" role="separator" tabindex="0" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="1440" aria-valuenow="' + timeToMinutes(cellStart) + '" aria-valuetext="' + formatClock(cellStart) + '" aria-label="Ajustar inicio de ' + escapeHtml(text) + '"></span><span class="welcome-flow-resize-grip is-end" data-week-resize="end" role="separator" tabindex="0" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="1440" aria-valuenow="' + timeToMinutes(cellEnd) + '" aria-valuetext="' + formatClock(cellEnd) + '" aria-label="Ajustar fin de ' + escapeHtml(text) + '; arrastra para alargar, acortar o unir con la misma actividad"></span>' : isFixed ? '<small class="welcome-flow-week-fixed">Compromiso fijo</small>' : '') + quickActions + '</div>' : '<span>—</span>';
        return '<td rowspan="' + span + '" class="welcome-week-cell welcome-flow-category-' + escapeHtml(category) + (active ? "" : " is-free-day") + (span > 1 ? " is-merged" : "") + '"' + (active ? ' data-week-cell data-week-day="' + day + '" data-week-index="' + rowIndex + '" data-week-span="' + span + '" data-week-start="' + cellStart + '" data-week-end="' + cellEnd + '" data-week-category="' + escapeHtml(category) + '" data-week-text="' + escapeHtml(text) + '" data-week-fixed="' + (isFixed ? "true" : "false") + '"' : '') + '>' + cellContent + '</td>';
      }).join("") + '</tr>';
    }).join("");
    var previewSwitch = '<div class="welcome-flow-view-switch" aria-label="Cambiar vista"><button type="button" data-preview-mode="daily" class="' + (state.previewMode === "daily" ? "is-selected" : "") + '">☀️ Vista diaria</button><button type="button" data-preview-mode="weekly" class="' + (state.previewMode === "weekly" ? "is-selected" : "") + '">📅 Vista semanal</button></div>';
    var specialtyName = specialtyLabel();
    var dailyCompanion = state.editing ? "" : '<section class="welcome-flow-daily-companion"><div class="welcome-flow-companion-intro"><span>☀</span><div><strong>Tu día también tendrá un espacio personal</strong><small>No será solo una lista: podrás registrar cómo llegas, tu intención y cómo terminó el día.</small></div></div><div class="welcome-flow-companion-grid"><article><small>¿Cómo llegas hoy?</small><div class="welcome-flow-moods" aria-label="Ejemplo de estados de ánimo"><button type="button">○ Tranquilo</button><button type="button">△ Cansado</button><button type="button">◇ Motivado</button></div></article><article><small>Intención principal</small><strong>' + escapeHtml(state.goal || (state.projects.length ? "Tus proyectos declarados" : "Tus compromisos y espacios disponibles")) + '</strong><span>' + escapeHtml(specialtyName ? "Enfoque adaptado a " + specialtyName : "Adaptado a tu ocupación") + '</span></article><article><small>Mini balance del día</small><span>Meta principal · energía · productividad</span><span>Agradecimiento · notas · cuidado personal</span></article></div></section>';
    var dailyView = '<div class="welcome-flow-day-tabs">' + dayTabs + '</div>' + dailyCompanion + '<div class="welcome-flow-preview"><div class="welcome-flow-preview-head"><strong>Vista de ' + DAY_LABELS[previewDay] + '</strong><span>' + formatClockRange(minutesToTime(previewStart) + " – " + minutesToTime(previewEnd)) + '</span></div><p class="welcome-flow-simple-help">Toca cualquier actividad para escribir directamente. Si dejas el campo vacío, ese espacio queda libre.</p><ul>' + sampleDay + '</ul></div>';
    var weeklyView = '<p class="welcome-flow-simple-help">Escribe una actividad y pulsa «Unir ↑» o «Unir ↓» para sumar un espacio libre del mismo día. «Acortar» libera el último tramo. Las actividades iguales y seguidas se unen solas. <span class="welcome-flow-desktop-tip">También puedes arrastrar los bordes; el borde derecho del nombre del día cambia su ancho.</span></p><div class="welcome-flow-weekly-action-status" role="status" aria-live="polite"></div><div class="welcome-flow-weekly-desktop"><div class="welcome-flow-weekly-wrap"><table class="welcome-flow-weekly" style="width:' + weeklyTableWidth + 'px;min-width:' + weeklyTableWidth + 'px">' + weeklyColGroup + '<thead><tr><th>Hora</th>' + weeklyHeaders + '</tr></thead><tbody>' + weeklyRows + '</tbody></table></div></div><div class="welcome-flow-weekly-mobile-view"><div class="welcome-flow-day-tabs" aria-label="Elegir día de la semana">' + weeklyDayTabs + '</div><div class="welcome-flow-preview"><div class="welcome-flow-preview-head"><strong>Vista de ' + DAY_LABELS[previewDay] + '</strong><span>' + formatClockRange(minutesToTime(previewStart) + " – " + minutesToTime(previewEnd)) + '</span></div><ul>' + sampleDay + '</ul></div></div>';
    var replacing = hasTasks(parseJson(localStorage.getItem("horario_data_semanal")));
    var previewTitle = state.example ? "Así podría quedar un horario hecho para ti" : (firstName() ? firstName() + ", tu primera propuesta está lista" : "Tu primera propuesta está lista");
    var previewSubtitle = state.example ? "Este ejemplo es solo una demostración y no modificará tu horario." : "Esta es una propuesta editable. Puedes pulir la semana completa aquí, antes de guardarla.";
    var focusDayCount = proposal.focusDays.length;
    var quickActions = state.example || !focusDayCount ? "" : '<div class="welcome-flow-quick"><span>¿Qué te gustaría cambiar?</span><button type="button" data-welcome-action="more-focus">🎯 Más días de enfoque</button><button type="button" data-welcome-action="more-rest">🌿 Más espacios libres</button><button type="button" data-welcome-action="regenerate">🔄 Cambiar momento sugerido</button></div>';
    var footer = state.example ? '<footer class="welcome-flow-footer"><button class="welcome-flow-secondary" data-welcome-action="close">Cerrar ejemplo</button><button class="welcome-flow-primary" data-welcome-action="use-example">Crear el mío con estas preguntas →</button></footer>' :
      '<footer class="welcome-flow-footer"><button class="welcome-flow-secondary" data-welcome-action="back">← Cambiar respuestas</button><button class="welcome-flow-primary" data-welcome-action="apply">' + (replacing ? "Reemplazar horario" : "Guardar este horario") + '</button></footer>';
    var weeklyMinutes = focusDayCount * Math.max(1, state.sessionsPerDay) * state.blockDuration;
    var focusSummary = focusDayCount ? Math.floor(weeklyMinutes / 60) + ' h ' + (weeklyMinutes % 60) + ' min de enfoque incluidos en la propuesta' : 'Sin bloques de enfoque añadidos sin una actividad concreta';
    if (proposal.unplacedProjectBlocks.length) focusSummary += ' · ' + proposal.unplacedProjectBlocks.length + ' bloques no encontraron espacio; revisa días y minutos';
    return renderHeader(proposalStep(), previewTitle, previewSubtitle) +
      '<div class="welcome-flow-preview-summary"><span>🎯 ' + escapeHtml(state.goal || (state.projects.length ? "Tus proyectos declarados" : "Tus compromisos y espacios")) + '</span><span>🗓️ ' + activeLabels.map(escapeHtml).join(" · ") + '</span><span>⏱️ ' +
      focusSummary + '</span><span>🧱 Bloque elegido: ' + state.blockDuration + ' min (editable; no predice cuánto tardas)</span>' +
      (state.mode === "detailed" && Object.keys(state.reminders).some(function (key) { return state.reminders[key]; }) ? '<span>🔔 Recordatorios: ' + Object.keys(state.reminders).filter(function (key) { return state.reminders[key]; }).length + '</span>' : '') +
      (state.lifeDetailsUsed && state.snacksPerDay ? '<span>☕ ' + state.snacksPerDay + (state.snacksPerDay === 1 ? ' snack reservado' : ' snacks reservados') + '</span>' : '') +
      (state.lifeDetailsUsed && state.hydration ? '<span>◌ Pausas de agua</span>' : '') +
      (state.mode === "detailed" && state.reminders.study && state.priority === "study" ? '<span>🧠 Técnica: ' + (state.technique === "deep" ? "Enfoque 50/10" : state.technique === "pomodoro" ? "Pomodoro 25/5" : "A tu ritmo") + '</span>' : '') + '</div>' +
      '<div class="welcome-flow-influence"><strong>Así usamos tus respuestas</strong>' + (focusDayCount ? '<span>Reservamos ' + state.sessionsPerDay + (state.sessionsPerDay === 1 ? ' momento' : ' momentos') + ' de ' + state.blockDuration + ' minutos en ' + focusDayCount + (focusDayCount === 1 ? ' día' : ' días') + ', preferentemente ' + ({ morning: "por la mañana", afternoon: "por la tarde", evening: "por la noche", variable: "en momentos variados" }[state.energyPeak] || "cuando tengas espacio") + '.</span>' : state.priority === "procrastination" ? '<span>No fijamos una hora para la procrastinación: no necesitas adivinar cuándo ocurre. Dejamos los espacios disponibles; si indicas una tarea concreta, podremos proponer cuándo avanzar en ella.</span>' : '') + '<span>' + (state.freeMinutes ? "Dejamos los últimos " + state.freeMinutes + " minutos del día sin obligaciones." : "Los demás espacios quedan disponibles; no les asignamos actividades ni tiempos que no indicaste.") + '</span>' + (state.projects.length ? '<span>Distribuimos ' + state.projects.length + (state.projects.length === 1 ? ' curso, proyecto o meta' : ' cursos, proyectos o metas') + ' según su frecuencia y momento preferido.</span>' : '') + (state.lifeDetailsUsed && state.caffeineCutoff === "no-caffeine" ? '<span>Indicaste que no consumes cafeína; no añadimos un límite de consumo.</span>' : state.lifeDetailsUsed && /^\d{2}:\d{2}$/.test(state.caffeineCutoff || "") ? '<span>Marcamos el límite de cafeína que elegiste: ' + escapeHtml(formatClock(state.caffeineCutoff)) + '.</span>' : '') + (state.lifeDetailsUsed && (state.commuteMinutes || state.preparationMinutes) ? proposal.commuteBlocks.length ? '<span>Con el compromiso fijo que indicaste, ubicamos únicamente el tiempo que elegiste para prepararte y/o ir desde casa antes del primer turno. No inventamos el trayecto de regreso.</span>' : '<span>No añadimos preparación ni traslado porque falta un compromiso fijo de trabajo o estudios que sirva de destino; puedes registrarlo antes de guardar.</span>' : '') + (proposal.commuteOmittedDays.length ? '<span>No añadimos el traslado en ' + proposal.commuteOmittedDays.map(function (day) { return DAY_LABELS[day]; }).join(', ') + ' porque se cruzaría con otro compromiso, un cambio que pediste o el día anterior.</span>' : '') + (state.lifeDetailsUsed ? '<span>Las comidas, pausas y otras actividades quedan disponibles hasta que indiques en qué momento y cuánto tiempo quieres reservar.</span>' : state.wantMoreQuestions ? '<span>Omitiste los detalles de vida diaria; podrás añadirlos después.</span>' : '<span>Elegiste generar ahora; estas preferencias se pueden afinar después.</span>') + '</div>' +
      quickActions + (state.example ? "" : commandEditorMarkup("preview")) + previewSwitch + (state.previewMode === "weekly" && !state.editing ? weeklyView : dailyView) +
      '<p class="welcome-flow-repeat-note">' + (state.fixed.length ? 'Se respetaron ' + expandedFixed().length + ' apariciones de tus compromisos fijos. ' : '') + 'Después podrás ajustar cada día por separado desde tu horario semanal.</p>' +
      (state.example ? '<p class="welcome-flow-safe-note">Puedes explorar este ejemplo con tranquilidad: no se guardará ni cambiará tus datos.</p>' : replacing ? '<div class="welcome-flow-warning"><strong>Ya tienes un horario semanal guardado.</strong><span>Si aplicas esta propuesta, lo reemplazaremos. PLANIFY conservará una copia local que podrás restaurar desde Panel de control → Descargas.</span></div>' :
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
    var previousWeeklyWrap = previousCard && previousCard.querySelector(".welcome-flow-weekly-wrap");
    var previousWeeklyLeft = previousWeeklyWrap ? previousWeeklyWrap.scrollLeft : 0;
    var previousWeeklyTop = previousWeeklyWrap ? previousWeeklyWrap.scrollTop : 0;
    var previousMobileList = previousCard && previousCard.querySelector(".welcome-flow-weekly-mobile-view .welcome-flow-preview ul");
    var previousMobileTop = previousMobileList ? previousMobileList.scrollTop : 0;
    var sameStep = overlay.dataset.welcomeStep === String(state.step);
    var focused = overlay.contains(document.activeElement) ? document.activeElement : null;
    var focusSelector = focused && focused.id ? "#" + CSS.escape(focused.id) : null;
    if (!focusSelector && focused) {
      ["data-welcome-mode", "data-welcome-action", "data-preview-mode", "data-preview-day"].some(function (name) {
        var value = focused.getAttribute(name);
        if (value === null) return false;
        focusSelector = "[" + name + '="' + CSS.escape(value) + '"]';
        return true;
      });
    }
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
    overlay.dataset.welcomeStep = String(state.step);
    var nextCard = overlay.querySelector(".welcome-flow-card");
    if (nextCard && previousScroll && sameStep) nextCard.scrollTop = previousScroll;
    var nextWeeklyWrap = nextCard && nextCard.querySelector(".welcome-flow-weekly-wrap");
    if (nextWeeklyWrap && sameStep) { nextWeeklyWrap.scrollLeft = previousWeeklyLeft; nextWeeklyWrap.scrollTop = previousWeeklyTop; }
    var nextMobileList = nextCard && nextCard.querySelector(".welcome-flow-weekly-mobile-view .welcome-flow-preview ul");
    if (nextMobileList && sameStep) nextMobileList.scrollTop = previousMobileTop;
    syncReminderDetails();
    overlay.querySelectorAll("textarea[data-week-inline-edit],textarea[data-day-inline-edit]").forEach(function (field) {
      field.style.height = "auto";
      field.style.height = Math.max(32, field.scrollHeight) + "px";
    });
    if (focused) {
      var nextFocus = sameStep && focusSelector ? overlay.querySelector(focusSelector) : null;
      if (!nextFocus) nextFocus = overlay.querySelector("#welcome-flow-title");
      if (nextFocus) nextFocus.focus({ preventScroll: true });
    }
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
    var existingOverlay = document.getElementById("welcome-flow-overlay");
    if (!existingOverlay || !existingOverlay.contains(document.activeElement)) welcomeReturnFocus = document.activeElement;
    state.step = 0;
    state.mode = ["manual", "quick", "guided", "detailed"].indexOf(preferredMode) >= 0 ? preferredMode : "quick";
    state.startedFromHub = Boolean(preferredMode && preferredMode !== "manual");
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
    if (state.mode === "quick") {
      state.career = "other";
      state.specialty = "general";
    }
    state.jobRole = "";
    state.jobPattern = "fixed";
    state.ventures = [];
    state.dismissedVentureProjects = [];
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
    state.caffeineCutoff = "not-specified";
    state.sleepChallenge = "none";
    state.movementStyle = "activebreaks";
    state.movementMinutes = 10;
    state.commuteMinutes = 0;
    state.preparationMinutes = 0;
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
    state.commandDraft = "";
    state.feedbackUndo = [];
    state.previewColumnWidths = {};
    state.step = state.startedFromHub ? 1 : 0;
    render();
    var title = document.getElementById("welcome-flow-title");
    if (title) title.focus({ preventScroll: true });
  }

  function close(markDismissed) {
    var overlay = document.getElementById("welcome-flow-overlay");
    if (overlay) overlay.remove();
    if (markDismissed) {
      try { localStorage.setItem("planify_bienvenida_estado", "descartada"); } catch (error) {}
    }
    var focusTarget = [welcomeReturnFocus, document.getElementById("welcome-flow-open"), document.querySelector('[data-brand-action="paths"]')].find(function (element) {
      return element && element.isConnected && element !== document.body && element.getClientRects().length > 0;
    });
    if (focusTarget) focusTarget.focus({ preventScroll: true });
    welcomeReturnFocus = null;
  }

  function dismissApplyConfirmation() {
    var dialog = document.getElementById("welcome-flow-confirm");
    if (dialog) {
      dialog.close();
      dialog.remove();
    }
    var applyButton = document.querySelector('#welcome-flow-overlay [data-welcome-action="apply"]');
    if (applyButton) applyButton.focus({ preventScroll: true });
  }

  function requestApplyProposal() {
    if (state.example) return;
    readPreviewEdits();
    var validationError = validatePreviewBlocks();
    if (validationError) {
      showPreviewError(validationError);
      return;
    }
    if (document.getElementById("welcome-flow-confirm")) return;
    var replacing = hasTasks(parseJson(localStorage.getItem("horario_data_semanal")));
    var dialog = document.createElement("dialog");
    dialog.id = "welcome-flow-confirm";
    dialog.className = "welcome-flow-confirm";
    dialog.setAttribute("aria-labelledby", "welcome-flow-confirm-title");
    dialog.setAttribute("aria-describedby", "welcome-flow-confirm-description");
    dialog.innerHTML = '<span class="welcome-flow-confirm-icon" aria-hidden="true">' + (replacing ? "↻" : "✓") + '</span>' +
      '<h2 id="welcome-flow-confirm-title">' + (replacing ? "¿Reemplazar tu horario actual?" : "¿Usar este horario?") + '</h2>' +
      '<p id="welcome-flow-confirm-description">' + (replacing ? "Tu horario actual será sustituido. PLANIFY conservará una copia local que podrás recuperar desde Descargas. Para guardarla fuera de este navegador, descarga también un respaldo." : "Esta propuesta se guardará como tu horario semanal. Podrás seguir editándola después.") + '</p>' +
      '<div class="welcome-flow-confirm-actions"><button type="button" data-welcome-action="cancel-apply">Cancelar</button><button type="button" data-welcome-action="confirm-apply">' + (replacing ? "Reemplazar horario" : "Usar este horario") + '</button></div>';
    document.getElementById("welcome-flow-overlay").appendChild(dialog);
    dialog.addEventListener("cancel", function (event) { event.preventDefault(); dismissApplyConfirmation(); });
    dialog.showModal();
    dialog.querySelector('[data-welcome-action="cancel-apply"]').focus();
  }

  function applyProposal() {
    if (applyingProposal || !document.getElementById("welcome-flow-confirm")) return;
    applyingProposal = true;
    var confirmButton = document.querySelector('#welcome-flow-confirm [data-welcome-action="confirm-apply"]');
    if (confirmButton) confirmButton.disabled = true;
    var proposal = buildProposal();
    var weeklyKey = "horario_data_semanal";
    var previousWeekly = localStorage.getItem(weeklyKey);
    var previousType = localStorage.getItem("horario_planner_type");
    var profileKey = "planify_personalizacion_v1";
    var previousProfile = localStorage.getItem(profileKey);
    var previousWelcomeState = localStorage.getItem("planify_bienvenida_estado");
    var previousName = localStorage.getItem("planify_nombre");
    var lastViewKey = "planify_ultima_vista_v1";
    var previousLastView = localStorage.getItem(lastViewKey);
    var appliedWelcomeKey = "planify_bienvenida_aplicada_pendiente_v1";
    var previousAppliedWelcome = localStorage.getItem(appliedWelcomeKey);
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
      localStorage.setItem(lastViewKey, "semanal");
      localStorage.setItem(appliedWelcomeKey, "1");
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
        commuteMinutes: state.commuteMinutes,
        preparationMinutes: state.preparationMinutes,
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
      var restored = true;
      [[weeklyKey, previousWeekly], ["horario_planner_type", previousType],
        ["planify_bienvenida_estado", previousWelcomeState], ["planify_nombre", previousName],
        [profileKey, previousProfile], [lastViewKey, previousLastView],
        [appliedWelcomeKey, previousAppliedWelcome], [backupKey, null]].forEach(function (entry) {
        try {
          if (entry[1] == null) localStorage.removeItem(entry[0]);
          else localStorage.setItem(entry[0], entry[1]);
          if (localStorage.getItem(entry[0]) !== entry[1]) restored = false;
        } catch (restoreError) { restored = false; }
      });
      applyingProposal = false;
      dismissApplyConfirmation();
      showPreviewError(restored ? "No se pudo guardar. Tus datos anteriores siguen intactos; comprueba el espacio disponible e inténtalo otra vez." :
        "No se pudo completar ni comprobar la restauración de todos los datos. No cierres esta página; revisa tu horario antes de volver a intentarlo.");
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
      if ((input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) && input.matches("[data-day-inline-edit],[data-week-inline-edit]")) {
        saveInlineActivity(input);
        if (input instanceof HTMLTextAreaElement) {
          input.style.height = "auto";
          input.style.height = Math.max(32, input.scrollHeight) + "px";
        }
        return;
      }
      if (!(input instanceof HTMLInputElement) || !input.matches("[data-welcome-edit-text]")) return;
      var index = Number(input.getAttribute("data-welcome-index"));
      saveRowEdit(index);
    });
    document.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || !document.getElementById("welcome-flow-overlay")) return;
      var target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      var widthGrip = target.closest("[data-week-width-grip]");
      var header = widthGrip && widthGrip.closest("th[data-week-column-resize]");
      if (header) {
        var columnDay = Number(header.getAttribute("data-week-column-resize"));
        var table = header.closest("table");
        var startWidth = Number(state.previewColumnWidths[columnDay]) || 84;
        if (!table || !Number.isInteger(columnDay)) return;
        weeklyResizeDrag = { kind: "column", pointerId: event.pointerId, day: columnDay, startX: event.clientX, startWidth: startWidth, element: widthGrip, table: table, moved: false };
        try { widthGrip.setPointerCapture(event.pointerId); } catch (error) {}
        event.preventDefault();
        return;
      }
      var grip = target.closest("[data-week-resize]");
      var cell = grip && grip.closest("[data-week-cell]");
      if (!cell || cell.getAttribute("data-week-fixed") === "true" || !String(cell.getAttribute("data-week-text") || "").trim()) return;
      var side = grip.getAttribute("data-week-resize");
      var source = {
        start: timeToMinutes(cell.getAttribute("data-week-start")),
        end: timeToMinutes(cell.getAttribute("data-week-end")),
        text: cell.getAttribute("data-week-text") || "",
        category: cell.getAttribute("data-week-category") || "clase"
      };
      weeklyResizeDrag = { kind: "duration", side: side, pointerId: event.pointerId, day: Number(cell.getAttribute("data-week-day")), startX: event.clientX, startY: event.clientY, nextStart: source.start, nextEnd: source.end, source: source, element: cell, grip: grip, table: cell.closest("table") || cell.closest("ul"), boundaries: weeklyTimeBoundaries(), moved: false, validTarget: false };
      try { grip.setPointerCapture(event.pointerId); } catch (error) {}
      cell.classList.add("is-resizing");
      event.preventDefault();
    }, true);
    document.addEventListener("pointermove", function (event) {
      var drag = weeklyResizeDrag;
      if (!drag || event.pointerId !== drag.pointerId) return;
      var deltaX = event.clientX - drag.startX;
      var deltaY = event.clientY - drag.startY;
      if (!drag.moved && Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 6) return;
      drag.moved = true;
      event.preventDefault();
      if (drag.kind === "column") {
        setPreviewColumnWidth(drag.day, drag.startWidth + deltaX);
        return;
      }
      var boundary = weeklyBoundaryAtPointer(drag, event.clientY);
      if (boundary == null) {
        drag.validTarget = false;
        showWeeklyResizeFeedback("No hay un límite horario válido aquí. No se cambió nada.");
        return;
      }
      drag.validTarget = boundary > (drag.side === "start" ? 0 : drag.source.start) && boundary < (drag.side === "start" ? drag.source.end : 1441);
      if (drag.side === "start") drag.nextStart = boundary;
      else drag.nextEnd = boundary;
      var readout = drag.element.querySelector(".welcome-flow-resize-readout");
      if (!readout) {
        readout = document.createElement("span");
        readout.className = "welcome-flow-resize-readout";
        drag.element.appendChild(readout);
      }
      readout.textContent = formatClock(drag.nextStart) + " – " + formatClock(drag.nextEnd);
      drag.element.classList.toggle("is-resize-invalid", !drag.validTarget);
      showWeeklyResizeFeedback(drag.validTarget ? "Vista previa: " + readout.textContent + ". Suelta para confirmar." : "El inicio debe ir antes del fin. No se cambiará el horario.");
    }, true);
    function finishWeeklyResize(event, cancelled) {
      var drag = weeklyResizeDrag;
      if (!drag || event.pointerId !== drag.pointerId) return;
      weeklyResizeDrag = null;
      if (drag.element) drag.element.classList.remove("is-resizing");
      if (drag.element) drag.element.classList.remove("is-resize-invalid");
      if (drag.element) {
        var readout = drag.element.querySelector(".welcome-flow-resize-readout");
        if (readout) readout.remove();
      }
      if (cancelled) {
        if (drag.kind === "column") setPreviewColumnWidth(drag.day, drag.startWidth);
        showWeeklyResizeFeedback("Ajuste cancelado; el horario quedó igual.");
        return;
      }
      if (!drag.moved) return;
      event.preventDefault();
      if (drag.kind === "column") {
        var finalWidth = Number(state.previewColumnWidths[drag.day]) || drag.startWidth;
        showWeeklyResizeFeedback("Columna ensanchada a " + finalWidth + " px. Este cambio solo afecta la vista.");
        return;
      }
      if (!drag.validTarget) {
        showWeeklyResizeFeedback("Suelta dentro de una fila válida del mismo día; el horario quedó igual.");
        return;
      }
      if (drag.nextEnd <= drag.nextStart || drag.nextStart === drag.source.start && drag.nextEnd === drag.source.end) {
        showWeeklyResizeFeedback(drag.nextEnd <= drag.nextStart ? "El límite debe quedar después del inicio. No cambié el horario." : "Mueve la línea un poco más, hasta el siguiente intervalo horario. El bloque sigue igual.");
        return;
      }
      var error = placeWeeklyRange(drag.day, drag.source, drag.nextStart, drag.nextEnd);
      showWeeklyResizeFeedback(error || state.commandMessage);
    }
    document.addEventListener("pointerup", function (event) { finishWeeklyResize(event, false); }, true);
    document.addEventListener("pointercancel", function (event) { finishWeeklyResize(event, true); }, true);
    document.addEventListener("lostpointercapture", function (event) { finishWeeklyResize(event, true); }, true);
    document.addEventListener("keydown", function (event) {
      var target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (event.key === "Escape" && weeklyResizeDrag) {
        var drag = weeklyResizeDrag;
        weeklyResizeDrag = null;
        if (drag.element) drag.element.classList.remove("is-resizing");
        if (drag.element) drag.element.classList.remove("is-resize-invalid");
        if (drag.element) {
          var readout = drag.element.querySelector(".welcome-flow-resize-readout");
          if (readout) readout.remove();
        }
        if (drag.kind === "column") setPreviewColumnWidth(drag.day, drag.startWidth);
        showWeeklyResizeFeedback("Ajuste cancelado; el horario quedó igual.");
        event.preventDefault();
        return;
      }
      var header = target.matches("[data-week-width-grip]") ? target.closest("th[data-week-column-resize]") : null;
      if (header && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        var day = Number(header.getAttribute("data-week-column-resize"));
        var delta = event.key === "ArrowRight" ? 24 : -24;
        var width = setPreviewColumnWidth(day, (Number(state.previewColumnWidths[day]) || 84) + delta);
        showWeeklyResizeFeedback("Ancho de " + DAY_LABELS[day] + ": " + width + " px. El cambio solo afecta la vista.");
        return;
      }
      var grip = target.closest("[data-week-resize]");
      var cell = grip && grip.closest("[data-week-cell]");
      if (!cell || cell.getAttribute("data-week-fixed") === "true" || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
      event.preventDefault();
      var proposal = buildProposal();
      var times = proposal.filas.map(function (row) { return (String(row.hora || "").match(/\d{2}:\d{2}/g) || []).map(timeToMinutes); }).filter(function (pair) { return pair.length === 2; });
      var boundaries = Array.from(new Set(times.reduce(function (list, pair) { return list.concat(pair); }, []))).sort(function (a, b) { return a - b; });
      var source = { start: timeToMinutes(cell.getAttribute("data-week-start")), end: timeToMinutes(cell.getAttribute("data-week-end")), text: cell.getAttribute("data-week-text") || "", category: cell.getAttribute("data-week-category") || "clase" };
      var side = grip.getAttribute("data-week-resize");
      var current = side === "start" ? source.start : source.end;
      var index = boundaries.indexOf(current);
      var step = event.key === "ArrowDown" ? 1 : -1;
      var next = boundaries[index + step];
      if (index < 0 || next == null) { showWeeklyResizeFeedback("Ese es el límite del horario; no cambié el bloque."); return; }
      var nextStart = side === "start" ? next : source.start;
      var nextEnd = side === "end" ? next : source.end;
      var error = placeWeeklyRange(Number(cell.getAttribute("data-week-day")), source, nextStart, nextEnd);
      showWeeklyResizeFeedback(error || state.commandMessage);
    }, true);
    document.addEventListener("change", function (event) {
      if ((event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) && event.target.matches("[data-day-inline-edit],[data-week-inline-edit]")) {
        saveInlineActivity(event.target);
        window.setTimeout(render, 0);
        return;
      }
      if (event.target.matches && (event.target.matches("[data-fixed-day]") || event.target.matches("[data-fixed-type]"))) {
        getDraftFromForm();
        render();
        return;
      }
      if (event.target instanceof HTMLInputElement && event.target.matches("input[name='welcome-role']")) {
        getDraftFromForm();
        render();
        return;
      }
      if (event.target instanceof HTMLInputElement && event.target.matches("input[name='welcome-role-combined']")) {
        var roles = Array.from(document.querySelectorAll("input[name='welcome-role']:checked")).map(function (input) { return input.value; }).filter(function (role) { return role !== "study" && role !== "work"; });
        if (event.target.checked) roles.push("study", "work");
        var studyRole = document.querySelector('input[name="welcome-role"][value="study"]');
        var workRole = document.querySelector('input[name="welcome-role"][value="work"]');
        if (studyRole) studyRole.checked = event.target.checked;
        if (workRole) workRole.checked = event.target.checked;
        state.roles = roles;
        syncOccupationFromRoles();
        getDraftFromForm();
        render();
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
      if (event.target instanceof HTMLInputElement && event.target.matches("input[data-custom-minute]")) {
        syncMinuteChoiceState(event.target);
        getDraftFromForm();
        return;
      }
      var select = event.target;
      if (!(select instanceof HTMLSelectElement)) return;
      if (select.id === "welcome-career" || select.id === "welcome-specialty") {
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
      var suggestion = target.closest("[data-welcome-command]");
      if (suggestion) {
        event.preventDefault();
        state.commandDraft = suggestion.getAttribute("data-welcome-command") || "";
        var commandField = document.querySelector("#welcome-change-command");
        if (commandField) { commandField.value = state.commandDraft; commandField.focus(); }
        return;
      }
      var quickAction = target.closest("[data-week-quick]");
      if (quickAction) {
        event.preventDefault();
        adjustWeeklyCellByOne(quickAction.closest("[data-week-cell]"), quickAction.getAttribute("data-week-quick"));
        return;
      }
      var minuteChoice = target.closest("[data-minute-choice]");
      if (minuteChoice) {
        event.preventDefault();
        var minuteTarget = document.getElementById(minuteChoice.getAttribute("data-minute-target"));
        if (!minuteTarget) return;
        minuteTarget.value = minuteChoice.getAttribute("data-minute-choice");
        syncMinuteChoiceState(minuteTarget);
        getDraftFromForm();
        return;
      }
      var previewMode = target.closest("[data-preview-mode]");
      if (previewMode) {
        event.preventDefault();
        state.previewMode = previewMode.getAttribute("data-preview-mode");
        if (state.previewMode === "weekly") state.editing = false;
        render();
        return;
      }
      var weeklyPreviewDay = target.closest("[data-weekly-preview-day]");
      if (weeklyPreviewDay) {
        event.preventDefault();
        state.previewDay = Number(weeklyPreviewDay.getAttribute("data-weekly-preview-day"));
        state.previewMode = "weekly";
        state.editing = false;
        render();
        return;
      }
      var previewDay = target.closest("[data-preview-day]");
      if (previewDay) {
        event.preventDefault();
        state.previewDay = Number(previewDay.getAttribute("data-preview-day"));
        state.previewMode = "daily";
        state.editing = previewDay.hasAttribute("data-week-edit-day");
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
        if (state.mode === "quick") {
          state.career = "other";
          state.specialty = "general";
        }
        state.startedFromHub = false;
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
      if (["next", "generate-now", "more-questions", "preview", "preview-extra-now", "skip-rhythm", "skip-life"].indexOf(name) >= 0 && !validateMinuteFields()) return;
      if (name === "close") { close(true); return; }
      if (name === "close-schedule-assistant") {
        var scheduleOverlay = document.getElementById("schedule-change-overlay");
        if (scheduleOverlay) scheduleOverlay.remove();
        return;
      }
      if (name === "apply-command") {
        var commandInput = document.querySelector("#welcome-change-command");
        state.commandDraft = commandInput ? commandInput.value : state.commandDraft;
        var revisionError = applyPreviewRevision(state.commandDraft);
        if (revisionError) {
          state.commandMessage = revisionError;
          render();
          return;
        }
        return;
      }
      if (name === "undo-revision") { undoFeedbackRevision(); return; }
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
        state.fixed.push({ title: "", type: "fixed", days: [], day: 0, start: fixedStart, end: fixedEnd });
        render();
        var newTitle = document.querySelector("[data-fixed-title='" + (state.fixed.length - 1) + "']");
        if (newTitle) newTitle.focus();
        return;
      }
      if (name === "add-fixed-template") {
        getDraftFromForm();
        var template = action.getAttribute("data-fixed-template") || "fixed";
        var titles = { course: state.career === "medicine" ? "Curso o práctica" : "Curso o clase", practice: state.career === "medicine" ? "Práctica clínica o guardia" : "Laboratorio o práctica", work: "Turno de trabajo" };
        var templateStart = template === "work" ? "08:00" : "09:00";
        var templateEnd = template === "work" ? "13:00" : "10:00";
        state.fixed.push({ title: titles[template] || "", type: template, days: [], day: 0, start: templateStart, end: templateEnd });
        render();
        var templateTitle = document.querySelector("[data-fixed-title='" + (state.fixed.length - 1) + "']");
        if (templateTitle) { templateTitle.focus(); templateTitle.select(); }
        return;
      }
      if (name === "add-workday-task") {
        getDraftFromForm();
        var fixedIndex = Number(action.getAttribute("data-fixed-index"));
        var dayIndex = Number(action.getAttribute("data-fixed-day-index"));
        var fixedItem = state.fixed[fixedIndex];
        if (!fixedItem) return;
        fixedItem.dayTasks = fixedItem.dayTasks || {};
        fixedItem.dayTasks[dayIndex] = Array.isArray(fixedItem.dayTasks[dayIndex]) ? fixedItem.dayTasks[dayIndex] : fixedItem.dayTitles && fixedItem.dayTitles[dayIndex] ? [fixedItem.dayTitles[dayIndex]] : [""];
        fixedItem.dayTasks[dayIndex].push("");
        render();
        var newTaskIndex = fixedItem.dayTasks[dayIndex].length - 1;
        var newTask = document.querySelector('[data-fixed-day-task="' + fixedIndex + '"][data-fixed-title-day="' + dayIndex + '"][data-fixed-task-index="' + newTaskIndex + '"]');
        if (newTask) newTask.focus();
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
        state.ventures.push({ id: "venture-" + (++ventureSequence), name: "", details: "" });
        render();
        var ventureName = document.querySelector('[data-venture-name="' + (state.ventures.length - 1) + '"]');
        if (ventureName) ventureName.focus();
        return;
      }
      if (name === "remove-venture") {
        getDraftFromForm();
        var ventureIndex = Number(action.getAttribute("data-venture-index"));
        var removedVenture = state.ventures[ventureIndex];
        if (removedVenture) state.projects = state.projects.filter(function (project) { return String(project.ventureId || "") !== String(removedVenture.id); });
        state.ventures.splice(ventureIndex, 1);
        render();
        return;
      }
      if (name === "remove-project") {
        getDraftFromForm();
        var projectIndex = Number(action.getAttribute("data-project-index"));
        var removedProject = state.projects[projectIndex];
        if (removedProject && removedProject.ventureId != null && state.dismissedVentureProjects.indexOf(String(removedProject.ventureId)) < 0) state.dismissedVentureProjects.push(String(removedProject.ventureId));
        state.projects.splice(projectIndex, 1);
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
        state.preparationMinutes = 15;
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
        if (name === "more-focus") state.weeklyFrequency = Math.min(Math.max(1, state.days.length), state.weeklyFrequency + 1);
        if (name === "more-rest") state.weeklyFrequency = Math.max(1, state.weeklyFrequency - 1);
        if (name === "balance") state.priority = "balance";
        state.edits = {};
        state.rowTimes = {};
        state.editing = false;
        render();
        return;
      }
      if (name === "regenerate") {
        var moments = ["morning", "afternoon", "evening", "variable"];
        state.energyPeak = moments[(moments.indexOf(state.energyPeak) + 1) % moments.length];
        state.commandMessage = "Cambié el momento sugerido a " + ({ morning: "la mañana", afternoon: "la tarde", evening: "la noche", variable: "momentos variados" }[state.energyPeak]) + ". Revisa la propuesta antes de guardarla.";
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
          state.preparationMinutes = 0;
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
            try {
              localStorage.setItem("planify_bienvenida_estado", "completada");
              if (state.userName) localStorage.setItem("planify_nombre", state.userName);
            } catch (error) {}
            close(false);
            var emptyButton = Array.from(document.querySelectorAll("button")).find(function (button) { return /empezar vacío/i.test(button.textContent || ""); });
            if (emptyButton) emptyButton.click();
            if (typeof window.cambiarTab === "function") window.cambiarTab("semanal");
            else if (typeof window.cambiarVistaPlanify === "function") window.cambiarVistaPlanify("semanal");
            var weeklyTab = document.querySelector('.bottom-nav [data-tab="semanal"]');
            if (weeklyTab) weeklyTab.focus({ preventScroll: true });
            return;
          }
          state.step = 1;
        } else if (state.step === 1) {
          if (state.mode === "quick" && !state.goal) {
            var quickGoalField = document.querySelector("#welcome-quick-goal");
            if (quickGoalField) {
              if (!quickGoalField.parentElement.querySelector(".welcome-flow-error")) quickGoalField.insertAdjacentHTML("afterend", '<span class="welcome-flow-error" role="alert">Escribe una actividad para crear una propuesta útil.</span>');
              quickGoalField.focus();
            }
            return;
          }
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
          var detailedUnassigned = state.fixed.some(function (item) { return item.title && !fixedDays(item).length; });
          if (detailedUnassigned) {
            var detailedRows = document.querySelector(".welcome-flow-fixed-row");
            if (detailedRows) detailedRows.insertAdjacentHTML("afterend", '<span class="welcome-flow-error">Elige los días de cada turno o compromiso fijo antes de seguir.</span>');
            return;
          }
          var detailedWorks = hasRole("work");
          var detailedHasWork = state.fixed.some(function (item) { return item.title && (item.type === "work" || /trabaj|turno|oficina|empresa/i.test(item.title)); });
          if (detailedWorks && state.jobPattern !== "flexible" && !detailedHasWork) {
            var detailedNeeded = document.querySelector(".welcome-flow-needed");
            if (detailedNeeded) detailedNeeded.insertAdjacentHTML("afterend", '<span class="welcome-flow-error welcome-flow-needed-error">Antes de seguir, añade al menos un horario de trabajo o elige “Yo decido cuándo hacerlo” si no tienes horas fijas.</span>');
            return;
          }
          state.step = 3;
        } else if (state.step === 2 && state.mode === "guided") {
          var guidedUnassigned = state.fixed.some(function (item) { return item.title && !fixedDays(item).length; });
          if (guidedUnassigned) {
            var guidedRows = document.querySelector(".welcome-flow-fixed-row");
            if (guidedRows) guidedRows.insertAdjacentHTML("afterend", '<span class="welcome-flow-error">Elige los días de cada turno o compromiso fijo antes de seguir.</span>');
            return;
          }
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
        if (state.step === 0) state.startedFromHub = false;
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
      if (name === "apply") requestApplyProposal();
      if (name === "cancel-apply") dismissApplyConfirmation();
      if (name === "confirm-apply") applyProposal();
    }, true);

    document.addEventListener("keydown", function (event) {
      var overlay = document.getElementById("welcome-flow-overlay");
      if (!overlay || document.getElementById("schedule-change-overlay")) return;
      if (document.getElementById("welcome-flow-confirm")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      } else if (event.key === "Tab") {
        var controls = Array.from(overlay.querySelectorAll("button, input, select, textarea, a[href], [tabindex]")).filter(function (control) {
          return control.tabIndex >= 0 && !control.disabled && !control.closest('[hidden], [inert], [aria-hidden="true"]') && control.getClientRects().length > 0;
        });
        var first = controls[0];
        var last = controls[controls.length - 1];
        if (!first) return;
        if (!overlay.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus({ preventScroll: true });
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    });

    var initialRoute = window.PLANIFY_START_ROUTE;
    if (["manual", "quick", "detailed"].indexOf(initialRoute) >= 0) {
      window.PLANIFY_START_ROUTE = "";
      open(initialRoute);
    }
  }

  window.PLANIFY_WELCOME = { open: open, requestChange: openScheduleAssistant };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
