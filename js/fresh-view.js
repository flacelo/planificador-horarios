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
})();
