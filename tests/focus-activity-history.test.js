"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const history = require("../js/focus-activity-history.js");

function session(sessionId, overrides = {}) {
  return Object.assign({
    sessionId,
    activityId: "activity-1",
    dateKey: "2026-09-27",
    title: "Estudiar cálculo",
    minutes: 25,
    completedAt: "2026-09-27T18:25:00.000Z"
  }, overrides);
}

test("registra sesiones una vez y resume minutos por fecha e identidad estable", () => {
  const first = history.addSession(history.emptyState(), session("session-1"));
  assert.equal(first.ok, true);
  const second = history.addSession(first.state, session("session-2", { minutes: 50, completedAt: "2026-09-27T20:00:00.000Z" }));
  assert.equal(second.ok, true);
  const stats = history.stats(second.state, "2026-09-27", "activity-1");
  assert.equal(stats.sessions, 2);
  assert.equal(stats.minutes, 75);
  assert.equal(history.stats(second.state, "2026-09-28", "activity-1").minutes, 0);
});

test("reimportar la misma sesión es idempotente y una identidad en conflicto falla", () => {
  const first = history.addSession(history.emptyState(), session("session-1"));
  const duplicate = history.addSession(first.state, session("session-1"));
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.duplicate, true);
  const conflict = history.addSession(first.state, session("session-1", { minutes: 50 }));
  assert.equal(conflict.ok, false);
  assert.equal(history.stats(first.state, "2026-09-27", "activity-1").sessions, 1);
});

test("rechaza fechas, sesiones y estados inválidos sin alterar la entrada", () => {
  const original = history.emptyState();
  assert.equal(history.validDateKey("2026-02-30"), false);
  assert.equal(history.addSession(original, session("", { sessionId: "" })).ok, false);
  assert.equal(history.addSession(original, session("session-1", { minutes: 0 })).ok, false);
  assert.equal(history.validState({ schemaVersion: 1, sessions: { broken: { sessionId: "wrong" } } }), false);
  assert.deepEqual(original, { schemaVersion: 1, sessions: {} });
});

test("leer clave ausente es compatible y no sobrescribe datos dañados", () => {
  const storage = { value: null, getItem() { return this.value; }, setItem(_key, value) { this.value = value; } };
  assert.equal(history.read(storage).present, false);
  storage.value = "{bad json";
  const damaged = history.read(storage);
  assert.equal(damaged.ok, false);
  assert.equal(history.write(storage, history.emptyState()), true);
  assert.equal(history.read(storage).ok, true);
});

test("combina respaldos sin duplicar sesiones y detecta identidades contradictorias", () => {
  const left = history.addSession(history.emptyState(), session("session-1")).state;
  const right = history.addSession(history.emptyState(), session("session-2", { activityId: "activity-2" })).state;
  const merged = history.mergeStates(left, right);
  assert.equal(Object.keys(merged.sessions).length, 2);
  assert.equal(Object.keys(history.mergeStates(merged, right).sessions).length, 2);
  const conflicting = history.addSession(history.emptyState(), session("session-1", { title: "Otro bloque" })).state;
  assert.equal(history.mergeStates(left, conflicting), null);
});
