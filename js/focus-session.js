(function () {
  "use strict";

  var STORAGE_KEY = "planify_focus_session_v1";
  var tickId = null;
  var breathTickId = null;
  var breathPause = { active: false, endsAt: null };
  var focusModalHistoryActive = false;
  var BREATH_PAUSE_SECONDS = 60;
  var defaults = {
    phase: "focus",
    focusMinutes: 25,
    breakMinutes: 5,
    remainingSeconds: 25 * 60,
    running: false,
    endsAt: null,
    completedMinutes: 0,
    completedSessions: 0,
    selectedActivity: null,
    sessionActivity: null,
    sessionId: null
  };

  function validDateKey(value) {
    if (window.PLANIFY_FOCUS_ACTIVITY_HISTORY) return window.PLANIFY_FOCUS_ACTIVITY_HISTORY.validDateKey(value);
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var date = new Date(value + "T12:00:00Z");
    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function cleanActivity(value) {
    if (!value || typeof value !== "object") return null;
    var activityId = String(value.activityId || "").trim();
    var title = String(value.title || "").trim();
    if (!activityId || activityId.length > 160 || !title || title.length > 240 || !validDateKey(value.dateKey)) return null;
    return { activityId: activityId, dateKey: value.dateKey, title: title };
  }

  function sameActivity(left, right) {
    return (!left && !right) || (!!left && !!right && left.activityId === right.activityId && left.dateKey === right.dateKey);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function createSessionId() {
    try { if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID(); } catch (error) {}
    return "focus-" + Date.now() + "-" + Math.random().toString(36).slice(2, 14);
  }

  function readState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {};
      var state = Object.assign({}, defaults, saved);
      state.focusMinutes = Number(state.focusMinutes) || defaults.focusMinutes;
      state.breakMinutes = Number(state.breakMinutes) || defaults.breakMinutes;
      state.remainingSeconds = Math.max(0, Number(state.remainingSeconds) || (state.phase === "break" ? state.breakMinutes * 60 : state.focusMinutes * 60));
      state.completedMinutes = Math.max(0, Number(state.completedMinutes) || 0);
      state.completedSessions = Math.max(0, Number(state.completedSessions) || 0);
      state.selectedActivity = cleanActivity(state.selectedActivity);
      state.sessionActivity = cleanActivity(state.sessionActivity);
      state.sessionId = typeof state.sessionId === "string" && state.sessionId.length <= 160 ? state.sessionId : null;
      if (state.phase !== "focus") { state.sessionActivity = null; state.sessionId = null; }
      if (state.running) {
        var recoveredRemaining = state.endsAt ? Math.ceil((Number(state.endsAt) - Date.now()) / 1000) : state.remainingSeconds;
        state.running = false;
        state.endsAt = null;
        state.remainingSeconds = recoveredRemaining > 0 ? recoveredRemaining : (state.phase === "break" ? state.breakMinutes * 60 : state.focusMinutes * 60);
      }
      return state;
    } catch (error) {
      return Object.assign({}, defaults);
    }
  }

  var state = readState();

  function saveState(nextState) {
    if (nextState) state = nextState;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) { return false; }
  }

  function pad(value) { return String(value).padStart(2, "0"); }

  function formatClock(seconds) {
    seconds = Math.max(0, Math.ceil(seconds));
    return pad(Math.floor(seconds / 60)) + ":" + pad(seconds % 60);
  }

  function currentRemaining() {
    if (!state.running || !state.endsAt) return state.remainingSeconds;
    return Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
  }

  function phaseLabel() { return state.phase === "break" ? "Pausa" : "Enfoque"; }
  function phaseEmoji() { return state.phase === "break" ? "🌿" : "🎯"; }
  function phaseDuration() { return (state.phase === "break" ? state.breakMinutes : state.focusMinutes) * 60; }

  function writeCompletionAtomically(nextState, nextActivityHistory) {
    var historyApi = window.PLANIFY_FOCUS_ACTIVITY_HISTORY;
    var updates = {};
    if (nextActivityHistory) {
      if (!historyApi || !historyApi.validState(nextActivityHistory)) return false;
      updates[historyApi.storageKey] = JSON.stringify(nextActivityHistory);
    }
    updates[STORAGE_KEY] = JSON.stringify(nextState);
    var previous = {};
    try {
      Object.keys(updates).forEach(function (key) { previous[key] = localStorage.getItem(key); });
      Object.keys(updates).forEach(function (key) {
        localStorage.setItem(key, updates[key]);
        if (localStorage.getItem(key) !== updates[key]) throw new Error("No se pudo verificar el guardado.");
      });
      return true;
    } catch (error) {
      Object.keys(previous).reverse().forEach(function (key) {
        try {
          if (previous[key] === null) localStorage.removeItem(key);
          else localStorage.setItem(key, previous[key]);
        } catch (rollbackError) { /* Continue restoring the remaining local keys. */ }
      });
      return false;
    }
  }

  function writeLiveMessage(message) {
    var live = document.getElementById("planify-focus-live");
    if (live) live.textContent = message;
  }

  function breathCopy() {
    var language = "es";
    try { language = localStorage.getItem("planify_idioma") || "es"; } catch (error) {}
    if (language === "en") return {
      title: "Mindful pause",
      prompt: "Breathe at your own pace",
      hint: "Follow the gentle cue if it feels comfortable. You can stop at any time.",
      start: "🌿 Start 1-minute pause",
      stop: "Stop pause",
      inhale: "Breathe in gently",
      exhale: "Breathe out slowly",
      started: "Breathing pause started. Breathe at your own pace.",
      stopped: "Breathing pause stopped.",
      completed: "Breathing pause complete. Return to your break whenever you are ready."
    };
    return {
      title: "Pausa consciente",
      prompt: "Respira a tu ritmo",
      hint: "Sigue la guía solo si te resulta cómoda. Puedes detenerte cuando quieras.",
      start: "🌿 Iniciar pausa de 1 minuto",
      stop: "Detener pausa",
      inhale: "Inhala suavemente",
      exhale: "Exhala despacio",
      started: "Pausa de respiración iniciada. Respira a tu ritmo.",
      stopped: "Pausa de respiración detenida.",
      completed: "Pausa de respiración terminada. Vuelve a tu descanso cuando quieras."
    };
  }

  function updateBreathUI(syncAnimation) {
    var container = document.getElementById("planify-focus-breath");
    if (!container) return;

    var copy = breathCopy();
    var active = breathPause.active && state.phase === "break";
    var startButton = document.getElementById("planify-focus-breath-start");
    var stopButton = document.getElementById("planify-focus-breath-stop");
    var cue = document.getElementById("planify-focus-breath-cue");
    var clock = document.getElementById("planify-focus-breath-clock");
    var visual = document.getElementById("planify-focus-breath-visual");
    var remaining = active ? Math.max(0, Math.ceil((breathPause.endsAt - Date.now()) / 1000)) : BREATH_PAUSE_SECONDS;
    var elapsed = BREATH_PAUSE_SECONDS - remaining;
    var cycleSeconds = elapsed % 10;

    container.classList.toggle("is-active", active);
    if (startButton) startButton.hidden = active;
    if (stopButton) {
      stopButton.hidden = !active;
      stopButton.textContent = copy.stop;
    }
    if (clock) clock.textContent = formatClock(remaining);
    if (cue) cue.textContent = active ? (cycleSeconds < 4 ? copy.inhale : copy.exhale) : copy.prompt;
    if (visual) {
      if (active && syncAnimation) visual.style.animationDelay = "-" + cycleSeconds + "s";
      else if (!active) visual.style.animationDelay = "";
    }
    if (startButton) startButton.textContent = copy.start;
  }

  function stopBreathing(message, restoreFocus, suppressFocus) {
    var wasActive = breathPause.active;
    var stopButton = document.getElementById("planify-focus-breath-stop");
    var stopHadFocus = Boolean(stopButton && document.activeElement === stopButton);
    if (breathTickId !== null) window.clearInterval(breathTickId);
    breathTickId = null;
    breathPause.active = false;
    breathPause.endsAt = null;
    updateBreathUI(true);
    if (wasActive && message) writeLiveMessage(message);
    if (!suppressFocus && (restoreFocus || stopHadFocus)) {
      var startButton = document.getElementById("planify-focus-breath-start");
      if (startButton && typeof startButton.focus === "function") startButton.focus();
    }
  }

  function tickBreathing() {
    if (!breathPause.active || !breathPause.endsAt) return;
    if (Date.now() >= breathPause.endsAt) {
      stopBreathing(breathCopy().completed, false, false);
      return;
    }
    updateBreathUI(false);
  }

  function startBreathing() {
    if (state.phase !== "break" || breathPause.active) return;
    breathPause.active = true;
    breathPause.endsAt = Date.now() + BREATH_PAUSE_SECONDS * 1000;
    if (breathTickId !== null) window.clearInterval(breathTickId);
    breathTickId = window.setInterval(tickBreathing, 1000);
    writeLiveMessage(breathCopy().started);
    updateBreathUI(true);
    var stopButton = document.getElementById("planify-focus-breath-stop");
    if (stopButton && typeof stopButton.focus === "function") stopButton.focus();
  }

  function showToast(message) {
    var old = document.getElementById("planify-focus-toast");
    if (old) old.remove();
    var toast = document.createElement("div");
    toast.id = "planify-focus-toast";
    toast.className = "planify-focus-toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(function () { if (toast.parentNode) toast.remove(); }, 5000);
  }

  function notify(message) {
    showToast(message);
    writeLiveMessage(message);
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification("PLANIFY", { body: message }); } catch (error) {}
    }
  }

  function settlePhase() {
    if (state.phase === "focus") {
      var next = Object.assign({}, state, {
        running: false,
        endsAt: null,
        phase: "break",
        remainingSeconds: state.breakMinutes * 60,
        sessionActivity: null,
        sessionId: null
      });
      var api = window.PLANIFY_FOCUS_ACTIVITY_HISTORY;
      var nextHistory = null;
      var duplicate = false;
      var recordError = "";
      if (state.sessionActivity && state.sessionId) {
        if (!api) recordError = "El historial por actividad todavía no está disponible.";
        else {
          var existing = api.read(localStorage);
          if (!existing.ok) recordError = existing.error;
          else {
            var result = api.addSession(existing.state, {
              sessionId: state.sessionId,
              activityId: state.sessionActivity.activityId,
              dateKey: state.sessionActivity.dateKey,
              title: state.sessionActivity.title,
              minutes: state.focusMinutes,
              completedAt: new Date().toISOString()
            });
            if (!result.ok) recordError = result.error;
            else if (result.duplicate) duplicate = true;
            else nextHistory = result.state;
          }
        }
      }
      if (!recordError && !duplicate) {
        next.completedMinutes += state.focusMinutes;
        next.completedSessions += 1;
      }
      if (recordError || !writeCompletionAtomically(next, nextHistory)) {
        next.completedMinutes = state.completedMinutes;
        next.completedSessions = state.completedSessions;
        state = next;
        saveState();
        stopTick();
        showToast("La sesión terminó, pero no se pudo guardar completa. No sumé datos parciales.");
        writeLiveMessage(recordError || "No se pudo guardar de forma segura el registro de enfoque.");
      } else {
        state = next;
        stopTick();
        if (window.PLANIFY_DAY_FLOW && typeof window.PLANIFY_DAY_FLOW.refresh === "function") window.PLANIFY_DAY_FLOW.refresh();
        notify(duplicate ? "Esta sesión ya estaba registrada; evité contarla dos veces." : "¡Sesión de enfoque completada! Tómate una pausa breve cuando quieras.");
      }
    } else {
      stopBreathing("", false, true);
      state.running = false;
      state.endsAt = null;
      state.remainingSeconds = 0;
      state.phase = "focus";
      state.remainingSeconds = state.focusMinutes * 60;
      state.sessionActivity = null;
      state.sessionId = null;
      notify("Pausa completada. Cuando estés listo, inicia tu siguiente bloque de enfoque.");
      saveState();
      stopTick();
    }
    render();
  }

  function tick() {
    var remaining = currentRemaining();
    state.remainingSeconds = remaining;
    if (state.running && remaining <= 0) {
      settlePhase();
      return;
    }
    saveState();
    updateClockOnly();
  }

  function startTick() {
    stopTick();
    tickId = window.setInterval(tick, 1000);
  }

  function stopTick() {
    if (tickId) window.clearInterval(tickId);
    tickId = null;
  }

  function startOrPause() {
    if (state.running) {
      state.remainingSeconds = currentRemaining();
      state.running = false;
      state.endsAt = null;
      stopTick();
      saveState();
      writeLiveMessage("Temporizador en pausa.");
    } else {
      if (state.phase === "focus" && !state.sessionId) {
        state.sessionId = createSessionId();
        state.sessionActivity = state.selectedActivity ? Object.assign({}, state.selectedActivity) : null;
      }
      state.running = true;
      state.endsAt = Date.now() + Math.max(1, state.remainingSeconds) * 1000;
      startTick();
      saveState();
      writeLiveMessage("Temporizador iniciado.");
    }
    render();
  }

  function resetPhase() {
    stopBreathing("", false, true);
    state.running = false;
    state.endsAt = null;
    state.remainingSeconds = phaseDuration();
    if (state.phase === "focus") {
      state.sessionActivity = null;
      state.sessionId = null;
    }
    stopTick();
    saveState();
    writeLiveMessage("Temporizador reiniciado.");
    render();
  }

  function switchPhase() {
    stopBreathing("", false, true);
    state.running = false;
    state.endsAt = null;
    state.phase = state.phase === "focus" ? "break" : "focus";
    state.remainingSeconds = phaseDuration();
    state.sessionActivity = null;
    state.sessionId = null;
    stopTick();
    saveState();
    writeLiveMessage("Ahora tienes un bloque de " + phaseLabel().toLowerCase() + ".");
    render();
  }

  function setDuration(name, value) {
    var minutes = Number(value);
    if (!minutes || state.running) return;
    state[name] = minutes;
    state.remainingSeconds = phaseDuration();
    saveState();
    render();
  }

  function requestNotifications() {
    if (!("Notification" in window)) {
      showToast("Este navegador no permite notificaciones. El aviso seguirá apareciendo dentro de PLANIFY.");
      return;
    }
    if (Notification.permission === "granted") {
      showToast("Las notificaciones ya están activadas para PLANIFY.");
      render();
      return;
    }
    Notification.requestPermission().then(function (permission) {
      showToast(permission === "granted" ? "Notificaciones activadas. Te avisaremos mientras PLANIFY esté abierta." : "Seguiremos mostrando avisos dentro de PLANIFY.");
      render();
    }).catch(function () {
      showToast("No se pudo activar la notificación. Puedes usar los avisos dentro de PLANIFY.");
    });
  }

  function close() {
    var modal = document.getElementById("planify-focus-modal");
    stopBreathing("", false, true);
    if (modal) modal.remove();
    if (focusModalHistoryActive) {
      focusModalHistoryActive = false;
      if (window.history && window.history.state && window.history.state.planifyFocusModal) {
        window.history.back();
      }
    }
  }

  function updateClockOnly() {
    var clock = document.querySelector("[data-focus-clock]");
    var toggle = document.querySelector("[data-focus-action='toggle']");
    var status = document.querySelector("[data-focus-status]");
    if (clock) clock.textContent = formatClock(currentRemaining());
    if (toggle) toggle.textContent = state.running ? "⏸ Pausar" : "▶ Empezar";
    if (status) status.textContent = state.running ? "En curso" : "Listo cuando tú quieras";
  }

  function progressValue() {
    var total = Math.max(1, phaseDuration());
    return Math.max(0, Math.min(100, Math.round((1 - currentRemaining() / total) * 100)));
  }

  function scheduleReminderMarkup() {
    if (!window.PLANIFY_REMINDERS || typeof window.PLANIFY_REMINDERS.today !== "function") {
      return '<p class="planify-focus-schedule is-empty">🔔 Cargando los avisos de tu horario…</p>';
    }
    var reminders = window.PLANIFY_REMINDERS.today();
    if (!reminders.length) return '<p class="planify-focus-schedule is-empty">🔔 Hoy no tienes avisos programados. Puedes crearlos desde la bienvenida guiada.</p>';
    return '<div class="planify-focus-schedule"><strong>🔔 Avisos de hoy</strong><div>' + reminders.slice(0, 3).map(function (item) {
      return '<span><b>' + item.time + '</b> ' + String(item.text).replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</span>';
    }).join("") + (reminders.length > 3 ? '<small>+ ' + (reminders.length - 3) + ' más en tu horario</small>' : "") + '</div></div>';
  }

  function breathMarkup() {
    if (state.phase !== "break") return "";
    var copy = breathCopy();
    return '<section id="planify-focus-breath" class="planify-focus-breath" aria-labelledby="planify-focus-breath-title">' +
      '<div class="planify-focus-breath-layout"><div id="planify-focus-breath-visual" class="planify-focus-breath-visual" aria-hidden="true"><span>✦</span></div>' +
      '<div class="planify-focus-breath-copy"><strong id="planify-focus-breath-title">' + copy.title + '</strong>' +
      '<p id="planify-focus-breath-cue">' + (breathPause.active ? copy.inhale : copy.prompt) + '</p>' +
      '<small>' + copy.hint + '</small><span id="planify-focus-breath-clock" class="planify-focus-breath-clock" role="timer">' + formatClock(breathPause.active ? Math.max(0, Math.ceil((breathPause.endsAt - Date.now()) / 1000)) : BREATH_PAUSE_SECONDS) + '</span></div></div>' +
      '<div class="planify-focus-breath-actions"><button type="button" id="planify-focus-breath-start" data-focus-action="breath-start"' + (breathPause.active ? ' hidden' : '') + '>' + copy.start + '</button>' +
      '<button type="button" id="planify-focus-breath-stop" data-focus-action="breath-stop"' + (breathPause.active ? '' : ' hidden') + '>' + copy.stop + '</button></div></section>';
  }

  function selectedActivityMarkup() {
    var activity = state.selectedActivity;
    if (!activity) {
      return '<div class="planify-focus-task is-personal"><span>MODO PERSONAL</span><p>Esta sesión se guarda en tu acumulado general, sin asociarse a una actividad.</p></div>';
    }
    var date = new Date(activity.dateKey + "T12:00:00");
    var dateLabel = isNaN(date.getTime()) ? activity.dateKey : new Intl.DateTimeFormat("es-PE", {
      weekday: "long", day: "numeric", month: "short", year: "numeric"
    }).format(date);
    var detail = "El tiempo se suma a esta actividad cuando completes el temporizador; no la marca como hecha.";
    var api = window.PLANIFY_FOCUS_ACTIVITY_HISTORY;
    if (api) {
      var saved = api.read(localStorage);
      if (saved.ok) {
        var stats = api.stats(saved.state, activity.dateKey, activity.activityId);
        if (stats.sessions) detail = stats.sessions + (stats.sessions === 1 ? " sesión" : " sesiones") +
          " · " + stats.minutes + " min enfocados. " + detail;
      }
    }
    return '<div class="planify-focus-task"><span>' + (state.phase === "break" ? "ACTIVIDAD SELECCIONADA" : "ENFOQUE PARA") +
      '</span><strong>' + escapeHtml(activity.title) + '</strong><small>' + escapeHtml(dateLabel) + '</small><p>' + escapeHtml(detail) + '</p></div>';
  }

  function render() {
    var modal = document.getElementById("planify-focus-modal");
    if (!modal) return;
    var permission = "Notification" in window ? Notification.permission : "unsupported";
    var notificationText = permission === "granted" ? "✓ Avisos del navegador activados" : permission === "denied" ? "Avisos dentro de PLANIFY activos" : "Activar avisos del navegador";
    modal.innerHTML = '<div class="planify-focus-card" role="dialog" aria-modal="true" aria-labelledby="planify-focus-title">' +
      '<button type="button" class="planify-focus-close" data-focus-action="close" aria-label="Cerrar temporizador">×</button>' +
      '<span class="planify-focus-eyebrow">' + (state.selectedActivity ? "SESIÓN VINCULADA" : "SESIÓN PERSONAL") + '</span><h2 id="planify-focus-title">' + phaseEmoji() + ' ' + phaseLabel() + ' sin presión</h2>' +
      '<p class="planify-focus-intro">Elige un bloque pequeño, avanza y descansa. Tus minutos se guardan solo en este navegador.</p>' +
      selectedActivityMarkup() +
      '<div class="planify-focus-clock" style="--focus-progress:' + progressValue() + '%"><strong data-focus-clock>' + formatClock(currentRemaining()) + '</strong><span data-focus-status>' + (state.running ? "En curso" : "Listo cuando tú quieras") + '</span></div>' +
      '<div class="planify-focus-controls"><button type="button" class="planify-focus-primary" data-focus-action="toggle">' + (state.running ? "⏸ Pausar" : "▶ Empezar") + '</button><button type="button" data-focus-action="reset">↺ Reiniciar</button><button type="button" data-focus-action="switch">' + (state.phase === "focus" ? "🌿 Tomar pausa" : "🎯 Volver a enfoque") + '</button></div>' +
      breathMarkup() +
      '<div class="planify-focus-settings"><label>Enfoque<select data-focus-setting="focus" ' + (state.running ? "disabled" : "") + '><option value="25"' + (state.focusMinutes === 25 ? " selected" : "") + '>25 minutos</option><option value="50"' + (state.focusMinutes === 50 ? " selected" : "") + '>50 minutos</option></select></label>' +
      '<label>Pausa<select data-focus-setting="break" ' + (state.running ? "disabled" : "") + '><option value="5"' + (state.breakMinutes === 5 ? " selected" : "") + '>5 minutos</option><option value="10"' + (state.breakMinutes === 10 ? " selected" : "") + '>10 minutos</option></select></label></div>' +
      '<div class="planify-focus-summary"><span>⏱️ ' + state.completedSessions + (state.completedSessions === 1 ? " sesión completada" : " sesiones completadas") + '</span><span>✨ ' + state.completedMinutes + " min de enfoque acumulado" + '</span></div>' +
      scheduleReminderMarkup() +
      '<button type="button" class="planify-focus-notifications" data-focus-action="notifications" ' + (permission === "granted" ? "disabled" : "") + '>🔔 ' + notificationText + '</button>' +
      '<p class="planify-focus-note">Los avisos funcionan mientras PLANIFY esté abierta. No sustituye indicaciones profesionales ni bloquea otras aplicaciones.</p>' +
      '<span id="planify-focus-live" class="sr-only" role="status" aria-live="polite"></span></div>';
    updateBreathUI(true);
  }

  function showFocusModal() {
    var old = document.getElementById("planify-focus-modal");
    if (old) {
      stopBreathing("", false, true);
      old.remove();
    }
    var overlay = document.createElement("section");
    overlay.id = "planify-focus-modal";
    overlay.className = "planify-focus-overlay";
    document.body.appendChild(overlay);
    if (!focusModalHistoryActive && window.history && window.history.pushState) {
      var previousHistoryState = window.history.state;
      var modalHistoryState = previousHistoryState && typeof previousHistoryState === "object" ? Object.assign({}, previousHistoryState, { planifyFocusModal: true }) : { planifyFocusModal: true, planifyPreviousHistoryState: previousHistoryState };
      window.history.pushState(modalHistoryState, "", window.location.href);
      focusModalHistoryActive = true;
    }
    render();
    var closeButton = overlay.querySelector("[data-focus-action='close']");
    if (closeButton) closeButton.focus();
    if (state.running) startTick();
  }

  function open(context) {
    var hasContext = arguments.length > 0 && context != null;
    var nextActivity = hasContext ? cleanActivity(context) : null;
    if (hasContext && !nextActivity) {
      showToast("No pude asociar la sesión con esa actividad; no se atribuirán minutos.");
      return false;
    }
    var partialFocus = state.phase === "focus" && (Boolean(state.sessionId) || state.remainingSeconds < phaseDuration());
    if (partialFocus && hasContext && !sameActivity(nextActivity, state.sessionActivity)) {
      showFocusModal();
      var activeTitle = state.sessionActivity ? " «" + state.sessionActivity.title + "»" : " personal";
      showToast("La sesión en curso sigue vinculada a" + activeTitle + ". Reiníciala antes de cambiar.");
      writeLiveMessage("Se conservó el contexto original. Reinicia el temporizador para elegir otra actividad.");
      return false;
    }
    if (!partialFocus) {
      if (hasContext) state.selectedActivity = nextActivity;
      else if (state.phase === "focus") state.selectedActivity = null;
    }
    // Persist the recovered paused state on open as well as fresh selections.
    // This prevents a page reload from leaving a stale `running: true` value
    // in storage while keeping the original activity/session identity intact.
    saveState();
    showFocusModal();
    return true;
  }

  document.addEventListener("click", function (event) {
    var target = event.target instanceof Element ? event.target.closest("[data-focus-action]") : null;
    if (!target) {
      if (event.target && event.target.id === "planify-focus-modal") close();
      return;
    }
    event.preventDefault();
    var action = target.getAttribute("data-focus-action");
    if (action === "close") close();
    if (action === "toggle") startOrPause();
    if (action === "reset") resetPhase();
    if (action === "switch") switchPhase();
    if (action === "notifications") requestNotifications();
    if (action === "breath-start") startBreathing();
    if (action === "breath-stop") stopBreathing(breathCopy().stopped, true, false);
  });

  document.addEventListener("change", function (event) {
    var target = event.target;
    if (!(target instanceof HTMLSelectElement) || !target.matches("[data-focus-setting]")) return;
    setDuration(target.getAttribute("data-focus-setting") + "Minutes", target.value);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.getElementById("planify-focus-modal")) close();
  });

  window.addEventListener("popstate", function () {
    if (!document.getElementById("planify-focus-modal")) return;
    focusModalHistoryActive = false;
    stopBreathing("", false, true);
    var modal = document.getElementById("planify-focus-modal");
    if (modal) modal.remove();
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      if (state.running) tick();
      if (breathPause.active) tickBreathing();
    }
  });

  window.PLANIFY_FOCUS = { open: open, close: close, getState: function () { return Object.assign({}, state, { remainingSeconds: currentRemaining() }); } };
  if (state.running) startTick();
})();
