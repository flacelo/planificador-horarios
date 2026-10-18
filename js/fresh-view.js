/* Vista temporal "como si fuera nuevo": Liberday se ve como la primera vez sin tocar los datos reales.
   Mientras la vista está activa, localStorage se lee y se escribe en una memoria temporal de esta pestaña
   (guardada en sessionStorage para que recargar siga en la vista). Los datos reales no se leen, no se mueven y no se borran.
   Si la vista no está activa, este archivo no cambia nada. Debe cargarse antes que cualquier otro script. */
(function () {
  "use strict";

  var FLAG_KEY = "planify_vista_nueva_v1";
  var DATA_KEY = "planify_vista_nueva_datos_v1";
  // Claves donde la persona deja contenido propio (el resto son ajustes que la app escribe sola).
  var CONTENT_KEYS = [
    "horario_data_semanal", "horario_data_anual", "horario_actividades", "planify_nombre",
    "planify_personalizacion_v1", "planify_diario_estado_v1", "planify_metas_anuales",
    "planify_focus_session_v1", "report_email"
  ];

  var proto = window.Storage && window.Storage.prototype;
  var realLocal = null;
  var session = null;
  try { realLocal = window.localStorage; session = window.sessionStorage; } catch (error) { realLocal = null; }
  if (!proto || !realLocal || !session) return;

  var original = {
    getItem: proto.getItem, setItem: proto.setItem, removeItem: proto.removeItem, clear: proto.clear, key: proto.key
  };
  var lengthDescriptor = Object.getOwnPropertyDescriptor(proto, "length");

  function sessionGet(key) { try { return original.getItem.call(session, key); } catch (error) { return null; } }
  function sessionSet(key, value) { try { original.setItem.call(session, key, value); return true; } catch (error) { return false; } }
  function sessionRemove(key) { try { original.removeItem.call(session, key); } catch (error) { /* ignorar */ } }

  var active = sessionGet(FLAG_KEY) === "1";
  var memory = Object.create(null);
  var leaving = false;

  function has(key) { return Object.prototype.hasOwnProperty.call(memory, key); }
  // Al salir no se vuelve a guardar nada: un último guardado de la página no debe dejar rastro.
  function persist() { if (!leaving) sessionSet(DATA_KEY, JSON.stringify(memory)); }

  function hasContent() {
    return CONTENT_KEYS.some(function (key) {
      if (!has(key)) return false;
      var value = String(memory[key] || "").trim();
      if (!value || value === "null" || value === "{}" || value === "[]") return false;
      if (key === "horario_data_semanal" || key === "horario_data_anual") {
        try {
          return JSON.stringify(JSON.parse(value)).match(/"(t|texto|title|titulo)":"[^"—-][^"]*"/) !== null;
        } catch (error) { return true; }
      }
      return true;
    });
  }

  if (active) {
    try {
      var saved = JSON.parse(sessionGet(DATA_KEY) || "{}");
      Object.keys(saved || {}).forEach(function (key) { if (typeof saved[key] === "string") memory[key] = saved[key]; });
    } catch (error) { memory = Object.create(null); }

    proto.getItem = function (key) {
      if (this !== realLocal) return original.getItem.apply(this, arguments);
      return has(String(key)) ? memory[String(key)] : null;
    };
    proto.setItem = function (key, value) {
      if (this !== realLocal) return original.setItem.apply(this, arguments);
      memory[String(key)] = String(value);
      persist();
    };
    proto.removeItem = function (key) {
      if (this !== realLocal) return original.removeItem.apply(this, arguments);
      delete memory[String(key)];
      persist();
    };
    proto.clear = function () {
      if (this !== realLocal) return original.clear.apply(this, arguments);
      memory = Object.create(null);
      persist();
    };
    proto.key = function (index) {
      if (this !== realLocal) return original.key.apply(this, arguments);
      var keys = Object.keys(memory);
      return index >= 0 && index < keys.length ? keys[index] : null;
    };
    if (lengthDescriptor && lengthDescriptor.get && lengthDescriptor.configurable) {
      Object.defineProperty(proto, "length", {
        configurable: true,
        enumerable: lengthDescriptor.enumerable,
        get: function () {
          return this === realLocal ? Object.keys(memory).length : lengthDescriptor.get.call(this);
        }
      });
    }
  }

  // Entrar: se marca la pestaña y se recarga; al recargar, el patch de arriba ya está puesto desde el primer script.
  function start() {
    if (!sessionSet(FLAG_KEY, "1") || sessionGet(FLAG_KEY) !== "1") {
      return { ok: false, message: "Este navegador no permite abrir esta vista." };
    }
    sessionRemove(DATA_KEY);
    window.location.reload();
    return { ok: true };
  }

  // Salir: se descarta la memoria temporal y se recarga con los datos reales, que nunca se tocaron.
  function exit() {
    leaving = true;
    sessionRemove(FLAG_KEY);
    sessionRemove(DATA_KEY);
    window.location.reload();
    return { ok: true };
  }

  window.PLANIFY_FRESH_VIEW = { active: active, start: start, exit: exit, hasContent: hasContent };

  // ---------- Pantalla: tarjeta en ⚙️ → Descargas, aviso fijo, confirmaciones e importar desactivado ----------
  var TEXT = {
    cardTitle: "Ver Liberday como si fuera nuevo",
    cardText: "Entras como una persona nueva, sin tocar tus datos. Lo que hagas ahí no se guarda.",
    cardTextActive: "Ahora estás en esa vista. Tus datos están a salvo.",
    start: "Empezar como si fuera nuevo",
    confirmTitle: "Empezar como si fuera nuevo",
    confirmText: "Vas a ver Liberday como la primera vez. Tus datos no se borran ni se modifican: solo quedan ocultos mientras estés en esta vista.",
    confirmYes: "Empezar",
    cancel: "Cancelar",
    banner: "Estás viendo Liberday como si fuera nuevo. Tus datos están a salvo y no se guardará nada de lo que hagas aquí.",
    back: "Volver a mi plan",
    leaveTitle: "Volver a mi plan",
    leaveText: "Se descartará lo que hiciste en esta vista.",
    stay: "Seguir aquí",
    importOff: "Cargar un respaldo no está disponible en esta vista."
  };

  var banner = null;
  var syncTimer = 0;
  var pending = null;

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  // Si el protector de datos está abierto, deja inertes los elementos que se añaden a la página;
  // por eso el aviso y las confirmaciones viven dentro de él mientras esté abierto.
  function host() { return document.getElementById("planify-local-data-gate") || document.body; }

  function addStyles() {
    if (document.getElementById("planify-fresh-view-style")) return;
    var style = document.createElement("style");
    style.id = "planify-fresh-view-style";
    style.textContent =
      "#planify-fresh-banner{position:sticky;top:0;z-index:900;display:flex;align-items:center;justify-content:space-between;gap:10px 14px;flex-wrap:wrap;box-sizing:border-box;width:100%;padding:10px 64px 10px 16px;background:#0b5f58;color:#fff;font:600 14px/1.4 inherit;box-shadow:0 2px 12px rgba(0,0,0,.25)}" +
      "#planify-fresh-banner span{flex:1 1 220px;min-width:0}" +
      "#planify-fresh-banner button,.planify-fresh-card button,#planify-fresh-dialog button{min-height:44px;padding:8px 14px;border-radius:10px;font:700 14px/1.2 inherit;cursor:pointer}" +
      "#planify-fresh-banner button{border:1px solid #7fd9c2;background:#7fd9c2;color:#103a38}" +
      ".planify-fresh-card{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;padding:12px;border:1px solid rgba(20,184,166,.32);border-radius:13px;background:linear-gradient(135deg,rgba(240,253,250,.9),rgba(238,242,255,.85))}" +
      ".planify-fresh-card>div{display:grid;gap:2px;min-width:0;flex:1}.planify-fresh-card strong{font-size:14px;color:#21304b}.planify-fresh-card small{font-size:12px;line-height:1.4;color:#4b5b72}" +
      ".planify-fresh-card button{flex:0 0 auto;max-width:150px;border:1px solid #14b8a6;background:#fff;color:#0f766e}" +
      "body.dark .planify-fresh-card,body.tema-estelar:not(.light-mode):where(:not(.tema-claro)) .planify-fresh-card{background:linear-gradient(135deg,#13283a,#172441);border-color:rgba(45,212,191,.32)}" +
      "body.dark .planify-fresh-card strong,body.tema-estelar:not(.light-mode):where(:not(.tema-claro)) .planify-fresh-card strong{color:#ecf5ff}" +
      "body.dark .planify-fresh-card small,body.tema-estelar:not(.light-mode):where(:not(.tema-claro)) .planify-fresh-card small{color:#b9c8dc}" +
      "body.dark .planify-fresh-card button,body.tema-estelar:not(.light-mode):where(:not(.tema-claro)) .planify-fresh-card button{background:rgba(255,255,255,.06);color:#9be8d3;border-color:#2dd4bf}" +
      ".planify-fresh-note{margin:6px 0 0;font-size:12px;line-height:1.4;color:#4b5b72}" +
      "body.dark .planify-fresh-note,body.tema-estelar:not(.light-mode):where(:not(.tema-claro)) .planify-fresh-note{color:#b9c8dc}" +
      "#planify-fresh-dialog{position:fixed;inset:0;margin:auto;height:fit-content;max-height:calc(100vh - 32px);overflow:auto;width:min(420px,calc(100vw - 32px));padding:22px;border:1px solid #cbd5e1;border-radius:16px;background:#fff;color:#1d2940;box-shadow:0 20px 60px rgba(15,23,42,.35)}" +
      "#planify-fresh-dialog::backdrop{background:rgba(7,15,31,.62)}#planify-fresh-dialog h2{margin:0 0 8px;font-size:18px}#planify-fresh-dialog p{margin:0 0 14px;font-size:14px;line-height:1.5}" +
      "#planify-fresh-dialog .planify-fresh-actions{display:flex;flex-wrap:wrap;gap:8px}#planify-fresh-dialog .planify-fresh-actions button{flex:1 1 130px;border:1px solid #14b8a6;background:#fff;color:#0f766e}" +
      "#planify-fresh-dialog .planify-fresh-actions button.is-primary{background:#7fd9c2;border-color:#7fd9c2;color:#103a38}" +
      "#planify-fresh-dialog .planify-fresh-error{color:#b91c1c;font-size:13px}" +
      "body.dark #planify-fresh-dialog,body.tema-estelar:not(.light-mode):where(:not(.tema-claro)) #planify-fresh-dialog{background:#13283a;color:#ecf5ff;border-color:#2c4a63}" +
      "body.dark #planify-fresh-dialog .planify-fresh-actions button:not(.is-primary),body.tema-estelar:not(.light-mode):where(:not(.tema-claro)) #planify-fresh-dialog .planify-fresh-actions button:not(.is-primary){background:rgba(255,255,255,.06);color:#9be8d3;border-color:#2dd4bf}" +
      "body.dark #planify-fresh-dialog .planify-fresh-error,body.tema-estelar:not(.light-mode):where(:not(.tema-claro)) #planify-fresh-dialog .planify-fresh-error{color:#fca5a5}" +
      "#planify-fresh-banner button:focus-visible,.planify-fresh-card button:focus-visible,#planify-fresh-dialog button:focus-visible{outline:3px solid #7fd9c2;outline-offset:3px}" +
      "body.tema-claro .planify-fresh-card button:focus-visible,body.tema-claro #planify-fresh-dialog button:focus-visible{outline-color:#087e73}";
    document.head.appendChild(style);
  }

  function closeDialog() {
    pending = null;
    var old = document.getElementById("planify-fresh-dialog");
    if (!old) return;
    if (typeof old.close === "function" && old.open) old.close();
    old.remove();
  }

  // Confirmación con el mismo estilo para entrar y para salir.
  function confirmDialog(options) {
    closeDialog();
    var dialog = make("dialog");
    dialog.id = "planify-fresh-dialog";
    dialog.setAttribute("aria-labelledby", "planify-fresh-dialog-title");
    var title = make("h2", "", options.title);
    title.id = "planify-fresh-dialog-title";
    var text = make("p", "", options.text);
    var error = make("p", "planify-fresh-error");
    error.setAttribute("role", "alert");
    var actions = make("div", "planify-fresh-actions");
    var yes = make("button", "is-primary", options.yes);
    yes.type = "button";
    yes.setAttribute("data-fresh-action", "confirm");
    var no = make("button", "", options.no);
    no.type = "button";
    no.setAttribute("data-fresh-action", "cancel");
    actions.appendChild(yes);
    actions.appendChild(no);
    [title, text, error, actions].forEach(function (part) { dialog.appendChild(part); });
    pending = { onYes: options.onYes, error: error };
    // Escape cierra solo esta ventana; no debe llegar al protector de datos.
    dialog.addEventListener("keydown", function (event) { if (event.key === "Escape") event.stopPropagation(); });
    dialog.addEventListener("close", function () { if (dialog.parentNode) dialog.remove(); });
    host().appendChild(dialog);
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
    no.focus();
  }

  function askStart() {
    confirmDialog({ title: TEXT.confirmTitle, text: TEXT.confirmText, yes: TEXT.confirmYes, no: TEXT.cancel, onYes: start });
  }

  function askLeave() {
    if (!hasContent()) { exit(); return; }
    confirmDialog({ title: TEXT.leaveTitle, text: TEXT.leaveText, yes: TEXT.back, no: TEXT.stay, onYes: exit });
  }

  function ensureBanner() {
    if (!active) return;
    if (!banner) {
      banner = make("div");
      banner.id = "planify-fresh-banner";
      banner.setAttribute("role", "status");
      banner.appendChild(make("span", "", TEXT.banner));
      var back = make("button", "", TEXT.back);
      back.type = "button";
      back.setAttribute("data-fresh-action", "leave");
      banner.appendChild(back);
    }
    var parent = host();
    if (banner.parentNode !== parent || parent.firstChild !== banner) parent.insertBefore(banner, parent.firstChild);
    if (banner.inert) banner.inert = false;
    if (banner.getAttribute("aria-hidden")) banner.removeAttribute("aria-hidden");
  }

  function ensureCard() {
    var tab = document.getElementById("tab-ajustes");
    if (!tab) return;
    var card = tab.querySelector(".planify-fresh-card");
    if (!card) {
      card = make("section", "planify-fresh-card");
      var copy = make("div");
      copy.appendChild(make("strong", "", TEXT.cardTitle));
      copy.appendChild(make("small", "", active ? TEXT.cardTextActive : TEXT.cardText));
      var button = make("button", "", active ? TEXT.back : TEXT.start);
      button.type = "button";
      button.setAttribute("data-fresh-action", active ? "leave" : "start");
      card.appendChild(copy);
      card.appendChild(button);
      var backup = tab.querySelector(".panel-backup");
      if (backup && backup.parentNode) backup.parentNode.insertBefore(card, backup.nextSibling);
      else tab.appendChild(card);
    }
  }

  // En la vista no se puede cargar un respaldo: mezclaría datos temporales con los reales.
  function lockImport() {
    if (!active) return;
    var button = document.getElementById("btn-import-complete-json");
    var input = document.getElementById("planify-backup-file");
    if (button && !button.disabled) {
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
      button.title = TEXT.importOff;
      var note = make("p", "planify-fresh-note", TEXT.importOff);
      if (button.parentNode && button.parentNode.parentNode) button.parentNode.parentNode.insertBefore(note, button.parentNode.nextSibling);
    }
    if (input) input.disabled = true;
  }

  function sync() {
    syncTimer = 0;
    addStyles();
    ensureBanner();
    ensureCard();
    lockImport();
  }

  function schedule() { if (!syncTimer) syncTimer = window.setTimeout(sync, 60); }

  // Se escucha en la fase de captura y se detiene el resto: el código antiguo de app.js frena todo clic en un botón
  // cuyo texto contenga "volver" (para cerrar el dashboard), y "Volver a mi plan" lo contiene.
  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-fresh-action]") : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    var action = target.getAttribute("data-fresh-action");
    if (action === "start") askStart();
    else if (action === "leave") askLeave();
    else if (action === "cancel") closeDialog();
    else if (action === "confirm" && pending) {
      var result = pending.onYes();
      if (result && result.ok === false) pending.error.textContent = result.message || "";
    }
  }, true);

  function init() {
    sync();
    if (typeof MutationObserver === "function") new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
