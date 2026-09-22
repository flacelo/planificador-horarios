(function () {
  "use strict";

  var STORAGE_KEY = "planify_focus_session_v1";
  var tickId = null;
  var defaults = {
    phase: "focus",
    focusMinutes: 25,
    breakMinutes: 5,
    remainingSeconds: 25 * 60,
    running: false,
    endsAt: null,
    completedMinutes: 0,
    completedSessions: 0
  };

  function readState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {};
      var state = Object.assign({}, defaults, saved);
      state.focusMinutes = Number(state.focusMinutes) || defaults.focusMinutes;
      state.breakMinutes = Number(state.breakMinutes) || defaults.breakMinutes;
      state.remainingSeconds = Math.max(0, Number(state.remainingSeconds) || (state.phase === "break" ? state.breakMinutes * 60 : state.focusMinutes * 60));
      state.completedMinutes = Math.max(0, Number(state.completedMinutes) || 0);
      state.completedSessions = Math.max(0, Number(state.completedSessions) || 0);
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

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) {}
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

  function writeLiveMessage(message) {
    var live = document.getElementById("planify-focus-live");
    if (live) live.textContent = message;
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
    state.running = false;
    state.endsAt = null;
    state.remainingSeconds = 0;
    if (state.phase === "focus") {
      state.completedMinutes += state.focusMinutes;
      state.completedSessions += 1;
      state.phase = "break";
      state.remainingSeconds = state.breakMinutes * 60;
      notify("¡Sesión de enfoque completada! Tómate una pausa breve cuando quieras.");
    } else {
      state.phase = "focus";
      state.remainingSeconds = state.focusMinutes * 60;
      notify("Pausa completada. Cuando estés listo, inicia tu siguiente bloque de enfoque.");
    }
    saveState();
    stopTick();
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
      state.running = true;
      state.endsAt = Date.now() + Math.max(1, state.remainingSeconds) * 1000;
      startTick();
      saveState();
      writeLiveMessage("Temporizador iniciado.");
    }
    render();
  }

  function resetPhase() {
    state.running = false;
    state.endsAt = null;
    state.remainingSeconds = phaseDuration();
    stopTick();
    saveState();
    writeLiveMessage("Temporizador reiniciado.");
    render();
  }

  function switchPhase() {
    state.running = false;
    state.endsAt = null;
    state.phase = state.phase === "focus" ? "break" : "focus";
    state.remainingSeconds = phaseDuration();
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
    if (modal) modal.remove();
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

  function render() {
    var modal = document.getElementById("planify-focus-modal");
    if (!modal) return;
    var permission = "Notification" in window ? Notification.permission : "unsupported";
    var notificationText = permission === "granted" ? "✓ Avisos del navegador activados" : permission === "denied" ? "Avisos dentro de PLANIFY activos" : "Activar avisos del navegador";
    modal.innerHTML = '<div class="planify-focus-card" role="dialog" aria-modal="true" aria-labelledby="planify-focus-title">' +
      '<button type="button" class="planify-focus-close" data-focus-action="close" aria-label="Cerrar temporizador">×</button>' +
      '<span class="planify-focus-eyebrow">SESIÓN PERSONAL</span><h2 id="planify-focus-title">' + phaseEmoji() + ' ' + phaseLabel() + ' sin presión</h2>' +
      '<p class="planify-focus-intro">Elige un bloque pequeño, avanza y descansa. Tus minutos se guardan solo en este navegador.</p>' +
      '<div class="planify-focus-clock" style="--focus-progress:' + progressValue() + '%"><strong data-focus-clock>' + formatClock(currentRemaining()) + '</strong><span data-focus-status>' + (state.running ? "En curso" : "Listo cuando tú quieras") + '</span></div>' +
      '<div class="planify-focus-controls"><button type="button" class="planify-focus-primary" data-focus-action="toggle">' + (state.running ? "⏸ Pausar" : "▶ Empezar") + '</button><button type="button" data-focus-action="reset">↺ Reiniciar</button><button type="button" data-focus-action="switch">' + (state.phase === "focus" ? "🌿 Tomar pausa" : "🎯 Volver a enfoque") + '</button></div>' +
      '<div class="planify-focus-settings"><label>Enfoque<select data-focus-setting="focus" ' + (state.running ? "disabled" : "") + '><option value="25"' + (state.focusMinutes === 25 ? " selected" : "") + '>25 minutos</option><option value="50"' + (state.focusMinutes === 50 ? " selected" : "") + '>50 minutos</option></select></label>' +
      '<label>Pausa<select data-focus-setting="break" ' + (state.running ? "disabled" : "") + '><option value="5"' + (state.breakMinutes === 5 ? " selected" : "") + '>5 minutos</option><option value="10"' + (state.breakMinutes === 10 ? " selected" : "") + '>10 minutos</option></select></label></div>' +
      '<div class="planify-focus-summary"><span>⏱️ ' + state.completedSessions + (state.completedSessions === 1 ? " sesión completada" : " sesiones completadas") + '</span><span>✨ ' + state.completedMinutes + " min de enfoque acumulado" + '</span></div>' +
      scheduleReminderMarkup() +
      '<button type="button" class="planify-focus-notifications" data-focus-action="notifications" ' + (permission === "granted" ? "disabled" : "") + '>🔔 ' + notificationText + '</button>' +
      '<p class="planify-focus-note">Los avisos funcionan mientras PLANIFY esté abierta. No sustituye indicaciones profesionales ni bloquea otras aplicaciones.</p>' +
      '<span id="planify-focus-live" class="sr-only" role="status" aria-live="polite"></span></div>';
  }

  function open() {
    var old = document.getElementById("planify-focus-modal");
    if (old) old.remove();
    var overlay = document.createElement("section");
    overlay.id = "planify-focus-modal";
    overlay.className = "planify-focus-overlay";
    document.body.appendChild(overlay);
    render();
    var closeButton = overlay.querySelector("[data-focus-action='close']");
    if (closeButton) closeButton.focus();
    if (state.running) startTick();
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
  });

  document.addEventListener("change", function (event) {
    var target = event.target;
    if (!(target instanceof HTMLSelectElement) || !target.matches("[data-focus-setting]")) return;
    setDuration(target.getAttribute("data-focus-setting") + "Minutes", target.value);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.getElementById("planify-focus-modal")) close();
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && state.running) tick();
  });

  window.PLANIFY_FOCUS = { open: open, close: close, getState: function () { return Object.assign({}, state, { remainingSeconds: currentRemaining() }); } };
  if (state.running) startTick();
})();
