(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PLANIFY_FOCUS_ACTIVITY_HISTORY = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var STORAGE_KEY = "planify_focus_activity_v1";
  var MAX_SESSIONS = 40000;

  function validDateKey(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var date = new Date(value + "T12:00:00Z");
    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function emptyState() { return { schemaVersion: 1, sessions: {} }; }

  function validSession(session, key) {
    return !!session && typeof session === "object" && !Array.isArray(session) &&
      typeof session.sessionId === "string" && session.sessionId.length > 0 && session.sessionId.length <= 160 &&
      (!key || key === session.sessionId) &&
      typeof session.activityId === "string" && session.activityId.trim().length > 0 && session.activityId.length <= 160 &&
      validDateKey(session.dateKey) &&
      typeof session.title === "string" && session.title.trim().length > 0 && session.title.length <= 240 &&
      Number.isInteger(session.minutes) && session.minutes > 0 && session.minutes <= 720 &&
      typeof session.completedAt === "string" && Number.isFinite(Date.parse(session.completedAt));
  }

  function validState(state) {
    if (!state || typeof state !== "object" || Array.isArray(state) || state.schemaVersion !== 1 ||
        !state.sessions || typeof state.sessions !== "object" || Array.isArray(state.sessions)) return false;
    var ids = Object.keys(state.sessions);
    return ids.length <= MAX_SESSIONS && ids.every(function (id) { return validSession(state.sessions[id], id); });
  }

  function sameSession(left, right) {
    return left.sessionId === right.sessionId && left.activityId === right.activityId &&
      left.dateKey === right.dateKey && left.title === right.title &&
      left.minutes === right.minutes && left.completedAt === right.completedAt;
  }

  function addSession(state, session) {
    if (!validState(state)) return { ok: false, error: "El historial local de enfoque no se puede leer con seguridad." };
    if (!validSession(session, session && session.sessionId)) return { ok: false, error: "El registro de enfoque no es válido." };
    var previous = state.sessions[session.sessionId];
    if (previous) {
      if (sameSession(previous, session)) return { ok: true, duplicate: true, state: state };
      return { ok: false, error: "El identificador de sesión ya pertenece a otro registro." };
    }
    if (Object.keys(state.sessions).length >= MAX_SESSIONS) {
      return { ok: false, error: "El historial contextual alcanzó su límite; exporta una copia antes de continuar." };
    }
    var sessions = Object.assign({}, state.sessions);
    sessions[session.sessionId] = Object.assign({}, session);
    return { ok: true, duplicate: false, state: { schemaVersion: 1, sessions: sessions } };
  }

  function mergeStates(local, incoming) {
    if (!validState(incoming) || (local != null && !validState(local))) return null;
    var merged = local ? Object.assign({}, local.sessions) : {};
    Object.keys(incoming.sessions).forEach(function (id) {
      if (!merged[id]) merged[id] = incoming.sessions[id];
      else if (!sameSession(merged[id], incoming.sessions[id])) merged[id] = null;
    });
    if (Object.keys(merged).some(function (id) { return merged[id] === null; }) || Object.keys(merged).length > MAX_SESSIONS) return null;
    return { schemaVersion: 1, sessions: merged };
  }

  function stats(state, dateKey, activityId) {
    if (!validState(state) || !validDateKey(dateKey) || typeof activityId !== "string") return { sessions: 0, minutes: 0 };
    var matching = Object.keys(state.sessions).map(function (id) { return state.sessions[id]; }).filter(function (session) {
      return session.dateKey === dateKey && session.activityId === activityId;
    });
    return {
      sessions: matching.length,
      minutes: matching.reduce(function (total, session) { return total + session.minutes; }, 0),
      title: matching.length ? matching[matching.length - 1].title : ""
    };
  }

  function read(storage) {
    var raw;
    try { raw = storage.getItem(STORAGE_KEY); }
    catch (error) { return { ok: false, error: "No se pudo leer el historial de enfoque." }; }
    if (raw == null) return { ok: true, present: false, state: emptyState() };
    var state;
    try { state = JSON.parse(raw); }
    catch (error) { return { ok: false, error: "El historial local de enfoque está dañado." }; }
    if (!validState(state)) return { ok: false, error: "El historial local de enfoque está dañado." };
    return { ok: true, present: true, state: state, raw: raw };
  }

  function write(storage, state) {
    if (!validState(state)) return false;
    try {
      var raw = JSON.stringify(state);
      storage.setItem(STORAGE_KEY, raw);
      return storage.getItem(STORAGE_KEY) === raw;
    } catch (error) { return false; }
  }

  return {
    storageKey: STORAGE_KEY,
    maxSessions: MAX_SESSIONS,
    validDateKey: validDateKey,
    emptyState: emptyState,
    validSession: validSession,
    validState: validState,
    addSession: addSession,
    mergeStates: mergeStates,
    stats: stats,
    read: read,
    write: write
  };
});
