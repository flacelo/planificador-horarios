"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const history = require("../js/completion-history.js");

test("calcula la fecha y el lunes según la zona del producto", () => {
  assert.equal(history.localDateKey("2026-09-27T04:30:00.000Z", "America/Lima"), "2026-09-26");
  assert.equal(history.mondayOf("2026-09-27"), "2026-09-21");
  assert.equal(history.addDays("2026-09-21", 6), "2026-09-27");
});

test("inicia sin inventar marcas previas y cuenta una actividad fusionada una sola vez", () => {
  const monday = "2026-09-21";
  const activity = { t: "Estudio", rowspan: 2, planifyActivityId: "actividad-1" };
  const schedule = {
    dias: ["Lunes"],
    filas: [
      { hora: "08:00", celdas: [activity] },
      { hora: "09:00", celdas: [{ t: "", rowspan: 0 }] }
    ]
  };
  const empty = { schemaVersion: 1, trackingStartedAt: "2026-09-26T12:00:00.000Z", days: {} };
  assert.equal(history.calculateWeek(schedule, empty, monday).hasHistory, false);
  const marked = {
    schemaVersion: 1,
    trackingStartedAt: "2026-09-26T12:00:00.000Z",
    days: { [monday]: { updatedAt: "2026-09-26T12:00:00.000Z", activities: { "actividad-1": true }, snapshot: { "actividad-1": { title: "Estudio", hours: 2 } } } }
  };
  const stats = history.calculateWeek(schedule, marked, monday);
  assert.equal(stats.total, 1);
  assert.equal(stats.completed, 1);
  assert.equal(stats.percent, 100);
  assert.equal(stats.recordedDayCount, 1);
  assert.equal(history.rowDurationHours(schedule.filas, 0, activity), 2);
});

test("suma rangos heterogéneos para el historial fechado y conserva el ID al cambiar rowspan", () => {
  const activity = { t: "Curso", c: "estudio", rowspan: 3, planifyActivityId: "curso-estable" };
  const rows = [
    { hora: "09:00 – 09:15", celdas: [activity] },
    { hora: "09:15 – 09:35", celdas: [{ t: "", rowspan: 0 }] },
    { hora: "09:35 – 10:00", celdas: [{ t: "", rowspan: 0 }] }
  ];
  assert.equal(history.rowDurationHours(rows, 0, activity), 1);

  const values = new Map();
  const data = { dias: ["Lunes"], filas: [
    { hora: "09:00 – 09:15", celdas: [{ t: "Curso", rowspan: 1 }] },
    { hora: "09:15 – 09:30", celdas: [{ t: "" }] }
  ] };
  const storage = { getItem: (key) => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, value) };
  const instance = history.create({ localStorage: storage, getDatosCompletos: () => data, autoGuardar() {}, crypto: { randomUUID: () => "id-estable" } });
  const stableId = data.filas[0].celdas[0].planifyActivityId;
  data.filas[0].celdas[0].rowspan = 2;
  instance.ensureActivityIds();
  assert.equal(data.filas[0].celdas[0].planifyActivityId, stableId);
});

test("el cumplimiento solo divide entre días registrados y conserva la actividad tras editar el plan", () => {
  const monday = "2026-09-21";
  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const schedule = { dias: days, filas: [{ hora: "08:00 – 09:00", celdas: days.map((_, index) => ({ t: "Estudio", planifyActivityId: "act-" + index })) }] };
  const state = {
    schemaVersion: 1,
    trackingStartedAt: "2026-09-26T12:00:00.000Z",
    days: { [monday]: { updatedAt: "2026-09-26T12:00:00.000Z", activities: { "act-0": true }, snapshot: { "act-0": { title: "Estudio", hours: 1 } } } }
  };
  const beforeEdit = history.calculateWeek(schedule, state, monday);
  assert.equal(beforeEdit.total, 7);
  assert.equal(beforeEdit.trackedTotal, 1);
  assert.equal(beforeEdit.percent, 100);
  const edited = structuredClone(schedule);
  edited.filas[0].celdas[0] = { t: "—" };
  const afterEdit = history.calculateWeek(edited, state, monday);
  assert.equal(afterEdit.trackedTotal, 1);
  assert.equal(afterEdit.completed, 1);
  assert.equal(afterEdit.percent, 100);
});

test("un registro guarda una instantánea del plan de ese día y no cuenta marcas recurrentes antiguas", () => {
  const values = new Map();
  const data = { dias: ["Lunes"], filas: [{ hora: "08:00 – 09:00", celdas: [{ t: "Estudio", done: true }] }] };
  const storage = { getItem: (key) => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, value) };
  const instance = history.create({ localStorage: storage, getDatosCompletos: () => data, autoGuardar() {}, crypto: { randomUUID: () => "estable" } });
  const weekStart = history.mondayOf(instance.todayKey());
  instance.setWeekStart(weekStart);
  instance.ensureActivityIds();
  const activityId = data.filas[0].celdas[0].planifyActivityId;
  assert.equal(instance.weekStats(data, weekStart).hasHistory, false);
  assert.equal(instance.set(weekStart, activityId, true), true);
  const recorded = instance.state().days[weekStart];
  assert.deepEqual(recorded.snapshot[activityId], { title: "Estudio", hours: 1 });
  data.filas[0].celdas[0].t = "Actividad editada después";
  data.filas[0].celdas[0].done = false;
  data.filas[0].celdas[0].t = "—";
  const afterEdit = instance.weekStats(data, weekStart);
  assert.equal(afterEdit.trackedTotal, 1);
  assert.equal(afterEdit.completed, 1);
  assert.equal(afterEdit.percent, 100);
});

test("una marca del diario usa la fecha de hoy aunque el planificador muestre otra semana", () => {
  const values = new Map();
  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const data = { dias: days, filas: [{ hora: "08:00 – 09:00", celdas: days.map((day) => ({ t: day, done: false })) }] };
  const storage = { getItem: (key) => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, value) };
  const instance = history.create({ localStorage: storage, getDatosCompletos: () => data, autoGuardar() {}, crypto: { randomUUID: () => "id-" + Math.random().toString(36).slice(2) } });
  const today = instance.todayKey();
  const todayWeekday = (new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7;
  const todayId = "actividad-hoy";
  data.filas[0].celdas[todayWeekday].planifyActivityId = todayId;
  instance.setWeekStart(history.addDays(history.mondayOf(today), -7));

  assert.equal(instance.set(today, todayId, true), true);
  assert.deepEqual(Object.keys(instance.state().days[today].snapshot), [todayId]);
  assert.equal(instance.state().days[today].snapshot[todayId].title, days[todayWeekday]);
});

test("valida historial y combina fechas conservando días exclusivos locales", () => {
  const local = {
    schemaVersion: 1,
    trackingStartedAt: "2026-09-20T12:00:00.000Z",
    days: { "2026-09-20": { updatedAt: "2026-09-20T12:00:00.000Z", activities: { a: true }, snapshot: { a: { title: "A", hours: 1 } } } }
  };
  const imported = {
    schemaVersion: 1,
    trackingStartedAt: "2026-09-22T12:00:00.000Z",
    days: { "2026-09-22": { updatedAt: "2026-09-22T12:00:00.000Z", activities: { b: false }, snapshot: { b: { title: "B", hours: 1 } } } }
  };
  assert.equal(history.validState(local), true);
  const merged = history.create({}).mergeStates(local, imported);
  assert.deepEqual(Object.keys(merged.days).sort(), ["2026-09-20", "2026-09-22"]);
  assert.equal(history.validState(merged), true);
  assert.equal(history.validState({ ...imported, days: { "2026-02-30": imported.days["2026-09-22"] } }), false);
});
