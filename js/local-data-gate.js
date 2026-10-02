/* Keep a previous person's local plan hidden until this browser's owner chooses. */
(function () {
  "use strict";

  var SESSION_KEY = "planify_local_data_choice_v1";
  var ARCHIVE_PREFIX = "planify_local_data_archive_v1:";
  var PERSONAL_KEYS = new Set(["report_email"]);
  var PREFERENCE_KEYS = new Set([
    "horario_dark_mode", "horario_fin", "horario_inicio", "horario_intervalo",
    "horario_paleta", "horario_planner_type", "horario_proteccion", "horario_tema",
    "horario_tipografia", "horario_tour_visto", "horario_tutorial_visto",
    "planify_bienvenida_estado", "planify_fuente_seleccionada", "planify_idioma",
    "planify_mobile_coach_hidden", "planify_theme", "planify_tipo_planificador",
    "planify_ultima_vista_v1", "planify_vista_activa"
  ]);
  var SCHEDULE_KEYS = new Set(["horario_completo", "horario_datos"]);
  var NON_CONTENT_FIELDS = new Set(["schemaVersion", "version", "trackingStartedAt", "updatedAt", "revision"]);

  function storageKeys(storage) {
    var keys = [];
    for (var index = 0; index < storage.length; index += 1) {
      var key = storage.key(index);
      if (key) keys.push(key);
    }
    return keys;
  }

  function isPersonalKey(key) {
    if (key.indexOf(ARCHIVE_PREFIX) === 0) return false;
    return !PREFERENCE_KEYS.has(key) &&
      (key.indexOf("horario_") === 0 || key.indexOf("planify_") === 0 || PERSONAL_KEYS.has(key));
  }

  function usefulText(value) {
    var text = String(value || "").trim();
    return Boolean(text && text !== "—" && text !== "-" && text.toLowerCase() !== "libre");
  }

  function hasActivity(value) {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(hasActivity);
    var labels = ["t", "texto", "text", "title", "titulo", "actividad", "activity", "task", "nombre", "name"];
    for (var index = 0; index < labels.length; index += 1) {
      if (usefulText(value[labels[index]])) return true;
    }
    return Object.keys(value).some(function (key) {
      if (key === "dias" || key === "day" || key === "fecha" || key === "date") return false;
      return hasActivity(value[key]);
    });
  }

  function hasSavedContent(key, rawValue) {
    if (rawValue == null || !String(rawValue).trim()) return false;
    if (key.indexOf("horario_data_") === 0 || SCHEDULE_KEYS.has(key)) {
      try {
        return hasActivity(JSON.parse(rawValue));
      } catch (error) {
        return true;
      }
    }
    try {
      var parsed = JSON.parse(rawValue);
      return hasStoredContent(parsed);
    } catch (error) {
      return usefulText(rawValue);
    }
  }

  function hasStoredContent(value) {
    if (value == null || value === false || value === 0) return false;
    if (typeof value === "string") return usefulText(value);
    if (typeof value === "number") return Number.isFinite(value) && value !== 0;
    if (typeof value === "boolean") return value;
    if (Array.isArray(value)) return value.some(hasStoredContent);
    if (typeof value === "object") {
      return Object.keys(value).some(function (key) {
        return !NON_CONTENT_FIELDS.has(key) && hasStoredContent(value[key]);
      });
    }
    return false;
  }

  function archiveHasPersonalContent(values) {
    return Object.keys(values).some(function (key) {
      return isPersonalKey(key) && hasSavedContent(key, values[key]);
    });
  }

  function personalKeysWithData() {
    var keys = storageKeys(localStorage).filter(isPersonalKey);
    return keys.filter(function (key) {
      return hasSavedContent(key, localStorage.getItem(key));
    });
  }

  function archives() {
    return storageKeys(localStorage).filter(function (key) {
      return key.indexOf(ARCHIVE_PREFIX) === 0;
    }).map(function (key) {
      try {
        var value = JSON.parse(localStorage.getItem(key) || "null");
        if (value && value.version === 1 && value.values && typeof value.values === "object" &&
            archiveHasPersonalContent(value.values)) {
          return { key: key, savedAt: value.savedAt || "", values: value.values };
        }
      } catch (error) { /* Ignore an unreadable archive without touching it. */ }
      return null;
    }).filter(Boolean).sort(function (left, right) {
      return String(right.savedAt).localeCompare(String(left.savedAt));
    });
  }

  function createArchive() {
    var keys;
    try { keys = storageKeys(localStorage).filter(isPersonalKey); }
    catch (error) { return { ok: false, message: "No pude acceder al almacenamiento local. No toqué tus datos." }; }
    var values = Object.create(null);
    keys.forEach(function (key) { values[key] = localStorage.getItem(key); });
    if (!keys.length) return { ok: true, empty: true };

    var archiveKey = ARCHIVE_PREFIX + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    var archive = { version: 1, savedAt: new Date().toISOString(), values: values };
    try {
      localStorage.setItem(archiveKey, JSON.stringify(archive));
      var stored = JSON.parse(localStorage.getItem(archiveKey) || "null");
      if (!stored || !stored.values || Object.keys(values).some(function (key) {
        return stored.values[key] !== values[key];
      })) throw new Error("No pude verificar la copia guardada.");
    } catch (error) {
      try { localStorage.removeItem(archiveKey); } catch (cleanupError) { /* Keep originals untouched. */ }
      return { ok: false, message: "No pude guardar una copia de seguridad. No cambié ni borré tus datos." };
    }

    try {
      keys.forEach(function (key) { localStorage.removeItem(key); });
    } catch (error) {
      return { ok: false, archiveKey: archiveKey, message: "La copia quedó guardada, pero no pude vaciar todos los datos. No cerraré esta pantalla; puedes restaurar la copia." };
    }
    return { ok: true, archiveKey: archiveKey };
  }

  function restoreArchive(archiveKey) {
    var archive;
    var currentKeys;
    try {
      archive = archives().find(function (item) { return item.key === archiveKey; });
      currentKeys = storageKeys(localStorage).filter(isPersonalKey);
    } catch (error) {
      return { ok: false, message: "No pude acceder al almacenamiento local. La copia sigue guardada." };
    }
    if (!archive) return { ok: false, message: "No pude leer esa copia. No cambié los datos actuales." };
    var values = archive.values;
    var restoreKeys = Object.keys(values).filter(isPersonalKey);
    try {
      currentKeys.forEach(function (key) { localStorage.removeItem(key); });
      restoreKeys.forEach(function (key) {
        if (typeof values[key] === "string") localStorage.setItem(key, values[key]);
      });
    } catch (error) {
      return { ok: false, message: "No pude completar la restauración. La copia sigue guardada; vuelve a intentarlo con más espacio disponible." };
    }
    return { ok: true };
  }

  function unlock() {
    document.documentElement.classList.remove("planify-data-gate-active");
    var gate = document.getElementById("planify-local-data-gate");
    if (gate) gate.remove();
  }

  function addStyles() {
    if (document.getElementById("planify-local-data-gate-styles")) return;
    var style = document.createElement("style");
    style.id = "planify-local-data-gate-styles";
    style.textContent =
      "html.planify-data-gate-active,html.planify-data-gate-active body{overflow:hidden!important}" +
      "html.planify-data-gate-active body>*:not(#planify-local-data-gate){visibility:hidden!important;pointer-events:none!important}" +
      "#planify-local-data-gate{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;overflow:auto;padding:20px;background:radial-gradient(circle at 12% 8%,rgba(77,196,162,.16),transparent 35%),#0d1723;color:#eef8f5;font:500 16px/1.5 'Outfit','Inter',system-ui,sans-serif;box-sizing:border-box}" +
      "#planify-local-data-gate *{box-sizing:border-box}" +
      "#planify-local-data-gate .local-data-card{width:min(100%,520px);padding:clamp(22px,5vw,34px);border:1px solid #34505a;border-radius:24px;background:#172534;box-shadow:0 24px 72px rgba(0,0,0,.32)}" +
      "#planify-local-data-gate .local-data-eyebrow{color:#82e2c7;font-size:.72rem;font-weight:800;letter-spacing:.13em}" +
      "#planify-local-data-gate h1{margin:9px 0 10px;color:#f6fcfa;font-size:clamp(1.5rem,5vw,2rem);line-height:1.14;letter-spacing:-.03em}" +
      "#planify-local-data-gate p{margin:0 0 14px;color:#c3d4d7;font-size:.95rem}" +
      "#planify-local-data-gate .local-data-note{padding:12px 14px;border:1px solid #34505a;border-radius:13px;background:#10212d;color:#c5d8d9;font-size:.82rem}" +
      "#planify-local-data-gate .local-data-actions{display:grid;gap:10px;margin-top:20px}" +
      "#planify-local-data-gate button{min-height:48px;padding:12px 16px;border:1px solid #4b726f;border-radius:13px;background:#a8f0cc;color:#153a35;font-family:inherit;font-size:.94rem;font-weight:750;line-height:1.3;cursor:pointer}" +
      "#planify-local-data-gate button[data-action='fresh'],#planify-local-data-gate button[data-action='blank']{background:#1d3040;color:#edf8f5;border-color:#45616a}" +
      "#planify-local-data-gate button:focus-visible{outline:3px solid #91f4d0;outline-offset:3px}" +
      "#planify-local-data-gate .local-data-error{min-height:1.3em;margin:12px 0 0;color:#ffc2b8;font-size:.84rem}" +
      "body.tema-claro #planify-local-data-gate{background:radial-gradient(circle at 12% 8%,rgba(77,196,162,.14),transparent 35%),#eef5f2;color:#19343b}" +
      "body.tema-claro #planify-local-data-gate .local-data-card{border-color:#c8ddd6;background:#fff;box-shadow:0 24px 72px rgba(26,63,57,.16)}" +
      "body.tema-claro #planify-local-data-gate h1{color:#18353b}" +
      "body.tema-claro #planify-local-data-gate p{color:#526970}" +
      "body.tema-claro #planify-local-data-gate .local-data-note{border-color:#d5e5e2;background:#f4faf8;color:#526970}" +
      "body.tema-claro #planify-local-data-gate button[data-action='fresh'],body.tema-claro #planify-local-data-gate button[data-action='blank']{background:#f2f7f5;color:#24464a;border-color:#cbded9}" +
      "#planify-archive-recovery{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0;padding:12px 14px;border:1px solid #8bd9c4;border-radius:13px;background:#eafff7;color:#174e4b;font:600 14px/1.4 'Outfit','Inter',system-ui,sans-serif}" +
      "#planify-archive-recovery button{min-height:44px;padding:8px 12px;border:1px solid #419988;border-radius:9px;background:#fff;color:#14695e;font-family:inherit;font-size:13px;font-weight:700;line-height:1.3;cursor:pointer}" +
      "#planify-archive-recovery button:focus-visible{outline:3px solid #0d9488;outline-offset:2px}" +
      "@media(max-width:600px){#planify-archive-recovery{align-items:stretch;flex-direction:column}#planify-archive-recovery button{width:100%}}" +
      "@media(prefers-reduced-motion:reduce){#planify-local-data-gate *{scroll-behavior:auto!important;transition:none!important}}";
    document.head.appendChild(style);
  }

  function renderArchiveRecovery() {
    addStyles();
    var notice = document.createElement("aside");
    notice.id = "planify-archive-recovery";
    notice.setAttribute("aria-label", "Recuperar un horario anterior");
    notice.innerHTML = '<span>¿Buscas un horario anterior guardado en este navegador?</span>' +
      '<button type="button">Recuperar una copia</button>';
    var hub = document.querySelector && document.querySelector(".trust-start-hub");
    (hub || document.body).appendChild(notice);
    notice.addEventListener("click", function (event) {
      if (!event.target.closest("button")) return;
      try { renderGate(personalKeysWithData(), archives()); }
      catch (error) { /* Keep the recovery notice if storage is unavailable. */ }
    });
  }

  function renderGate(currentKeys, savedArchives) {
    document.documentElement.classList.add("planify-data-gate-active");
    addStyles();
    var hasCurrent = currentKeys.length > 0;
    var latestArchive = savedArchives[0];
    var title = hasCurrent ? "Este navegador ya tiene un plan guardado" : "Hay una copia anterior en este navegador";
    var description = hasCurrent
      ? "Antes de mostrarlo, confirma si este horario es tuyo. Si compartes el dispositivo, podría pertenecer a otra persona."
      : "No hay un plan activo. Puedes recuperar la copia anterior o seguir con un espacio vacío.";
    var primaryAction = hasCurrent ? "continue" : "restore";
    var primaryLabel = hasCurrent ? "Sí, continuar con este plan" : "Restaurar la copia anterior";
    var secondaryAction = hasCurrent ? "fresh" : "blank";
    var secondaryLabel = hasCurrent ? "No es mío · empezar en blanco" : "Continuar con un espacio vacío";
    var gate = document.createElement("section");
    gate.id = "planify-local-data-gate";
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-modal", "true");
    gate.setAttribute("aria-labelledby", "planify-local-data-title");
    gate.innerHTML =
      '<div class="local-data-card"><span class="local-data-eyebrow">TUS DATOS, BAJO TU CONTROL</span>' +
      '<h1 id="planify-local-data-title">' + title + '</h1><p>' + description + '</p>' +
      '<div class="local-data-note">PLANIFY guarda tu información solo en este navegador; no usa una cuenta ni sincroniza entre dispositivos. El contenido permanecerá oculto hasta que elijas.</div>' +
      '<div class="local-data-actions"><button type="button" data-action="' + primaryAction + '">' + primaryLabel + '</button>' +
      '<button type="button" data-action="' + secondaryAction + '">' + secondaryLabel + '</button></div>' +
      '<p class="local-data-error" role="status" aria-live="polite"></p></div>';
    document.body.appendChild(gate);
    var primary = gate.querySelector("button");
    if (primary) primary.focus();

    gate.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-action]");
      if (!button) return;
      var action = button.getAttribute("data-action");
      var status = gate.querySelector(".local-data-error");
      if (action === "continue" || action === "blank") {
        unlock();
        return;
      }
      if (action === "fresh") {
        var result = createArchive();
        if (!result.ok) {
          if (status) status.textContent = result.message;
          if (result.archiveKey && !gate.querySelector('[data-action="rollback"]')) {
            var recovery = document.createElement("button");
            recovery.type = "button";
            recovery.setAttribute("data-action", "rollback");
            recovery.textContent = "Restaurar la copia recién guardada";
            gate.querySelector(".local-data-actions").appendChild(recovery);
          }
          return;
        }
        try { sessionStorage.setItem(SESSION_KEY, "fresh"); } catch (error) { /* The next visit will offer the saved archive. */ }
        window.location.reload();
        return;
      }
      if (action === "rollback") {
        var recoveryArchive = archives()[0];
        var rollback = recoveryArchive && restoreArchive(recoveryArchive.key);
        if (!rollback || !rollback.ok) {
          if (status) status.textContent = rollback && rollback.message || "No encontré la copia para restaurar.";
          return;
        }
        unlock();
        return;
      }
      if (action === "restore" && latestArchive) {
        var restored = restoreArchive(latestArchive.key);
        if (!restored.ok) {
          if (status) status.textContent = restored.message;
          return;
        }
        window.location.reload();
      }
    });
    gate.addEventListener("keydown", function (event) {
      if (event.key !== "Tab") return;
      var buttons = Array.prototype.slice.call(gate.querySelectorAll("button"));
      if (!buttons.length) return;
      if (event.shiftKey && document.activeElement === buttons[0]) {
        event.preventDefault();
        buttons[buttons.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) {
        event.preventDefault();
        buttons[0].focus();
      }
    });
  }

  function testHooks() {
    return {
      isPersonalKey: isPersonalKey,
      hasSavedContent: hasSavedContent,
      personalKeysWithData: personalKeysWithData,
      archives: archives,
      createArchive: createArchive,
      restoreArchive: restoreArchive
    };
  }

  if (window.__PLANIFY_PRIVACY_TEST__) window.__PLANIFY_PRIVACY_TEST_HOOKS__ = testHooks();
  var sessionChoice = "";
  try { sessionChoice = sessionStorage.getItem(SESSION_KEY) || ""; } catch (error) { /* Continue with a decision gate if storage is unavailable. */ }
  if (sessionChoice) {
    var consumedFreshChoice = false;
    try {
      sessionStorage.removeItem(SESSION_KEY);
      consumedFreshChoice = sessionStorage.getItem(SESSION_KEY) === null;
    } catch (error) { /* A stale choice must never bypass the gate. */ }
    if (sessionChoice === "fresh" && consumedFreshChoice) return;
  }

  var currentData;
  var savedArchives;
  try {
    currentData = personalKeysWithData();
    savedArchives = archives();
  } catch (error) {
    return;
  }
  if (currentData.length) renderGate(currentData, savedArchives);
  else if (savedArchives.length) renderArchiveRecovery();
})();
