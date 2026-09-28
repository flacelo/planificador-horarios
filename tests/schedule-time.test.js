"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const time = require("../js/schedule-time.js");

function cell(t, extra) {
  return Object.assign({ t, c: t ? "estudio" : "libre", done: false, reminder: false, rowspan: 1 }, extra || {});
}

function schedule(rows) {
  const firstCells = rows.length ? rows[0].slice(1).length : 1;
  return {
    dias: ["Lunes", "Martes"].slice(0, firstCells),
    filas: rows.map((item) => ({ hora: item[0], celdas: item.slice(1) }))
  };
}

test("interpreta duraciones distintas sumando rangos reales, no rowspan por un intervalo global", () => {
  const plan = schedule([
    ["09:00 – 09:15", cell("Clase A")],
    ["09:15 – 09:35", cell("Clase B")],
    ["09:35 – 10:00", cell("Clase C")],
    ["10:00 – 10:15", cell("Pausa", { c: "libre" })]
  ]);
  const durations = plan.filas.map((row, index) => time.activityInterval(plan.filas, index, row.celdas[0], 15).durationMinutes);
  assert.deepEqual(durations, [15, 20, 25, 15]);
  assert.equal(durations.reduce((sum, value) => sum + value, 0), 75);
});

test("extiende un bloque 15→20 min refinando solo el límite necesario y conserva las otras columnas", () => {
  const plan = schedule([
    ["09:00 – 09:15", cell("Clase", { planifyActivityId: "clase-id", done: true, reminder: true, custom: "se conserva" }), cell("Otra actividad")],
    ["09:15 – 09:30", cell(""), cell("", { c: "comida" })],
    ["09:30 – 09:45", cell(""), cell("")]
  ]);
  const updated = time.setDuration(plan, 0, 0, 20, 15);
  assert.equal(updated.ok, true);
  assert.deepEqual(updated.schedule.filas.map((row) => row.hora), [
    "09:00 – 09:15", "09:15 – 09:20", "09:20 – 09:30", "09:30 – 09:45"
  ]);
  assert.equal(updated.schedule.filas[0].celdas[0].rowspan, 2);
  assert.equal(time.activityInterval(updated.schedule.filas, 0, updated.schedule.filas[0].celdas[0], 15).durationMinutes, 20);
  assert.equal(updated.schedule.filas[0].celdas[0].planifyActivityId, "clase-id");
  assert.equal(updated.schedule.filas[0].celdas[0].done, true);
  assert.equal(updated.schedule.filas[0].celdas[0].reminder, true);
  assert.equal(updated.schedule.filas[0].celdas[0].custom, "se conserva");
  assert.equal(updated.schedule.filas[1].celdas[1].t, "");
  assert.equal(updated.schedule.filas[1].celdas[1].c, "comida");
  assert.equal(plan.filas.length, 3, "el horario de origen no se modifica");
});

test("admite el caso de 25 minutos, atraviesa el cambio de hora y muestra el fin correcto", () => {
  const plan = schedule([
    ["09:50 – 10:05", cell("Curso")],
    ["10:05 – 10:20", cell("")],
    ["10:20 – 10:35", cell("")]
  ]);
  const updated = time.setDuration(plan, 0, 0, 25, 15);
  assert.equal(updated.ok, true);
  const range = time.activityInterval(updated.schedule.filas, 0, updated.schedule.filas[0].celdas[0], 15);
  assert.equal(range.durationMinutes, 25);
  assert.equal(time.rangeLabel(range.start, range.end), "09:50 – 10:15");
});

test("reducir un bloque libera el excedente sin borrar los demás días", () => {
  const plan = schedule([
    ["08:00 – 08:15", cell("Clase", { rowspan: 2, planifyActivityId: "stable" }), cell("Curso martes", { rowspan: 2, planifyActivityId: "tue" })],
    ["08:15 – 08:30", cell("", { rowspan: 0 }), cell("", { rowspan: 0 })],
    ["08:30 – 08:45", cell("Otra") , cell("")]
  ]);
  const updated = time.setDuration(plan, 0, 0, 5, 15);
  assert.equal(updated.ok, true);
  assert.equal(updated.schedule.filas[0].celdas[0].rowspan, 1);
  assert.equal(updated.schedule.filas[1].celdas[0].rowspan, 1);
  assert.equal(updated.schedule.filas[1].celdas[0].t, "");
  assert.equal(updated.schedule.filas[0].celdas[1].rowspan, 3);
  assert.equal(updated.schedule.filas[0].celdas[1].planifyActivityId, "tue");
  assert.equal(time.activityInterval(updated.schedule.filas, 0, updated.schedule.filas[0].celdas[1], 15).durationMinutes, 30);
});

test("bloquea solapes, duraciones no admitidas y horarios discontinuos sin mutar el origen", () => {
  const conflict = schedule([
    ["08:00 – 08:15", cell("Clase")],
    ["08:15 – 08:30", cell("Otra clase")],
    ["08:30 – 08:45", cell("")]
  ]);
  const before = structuredClone(conflict);
  assert.equal(time.setDuration(conflict, 0, 0, 25, 15).ok, false);
  assert.deepEqual(conflict, before);
  assert.equal(time.setDuration(conflict, 0, 0, 22, 15).ok, false);
  const gap = schedule([
    ["08:00 – 08:15", cell("Clase")],
    ["08:20 – 08:35", cell("")]
  ]);
  assert.equal(time.setDuration(gap, 0, 0, 25, 15).ok, false);
});

test("los horarios antiguos con solo inicio de fila siguen calculándose sin alterarse", () => {
  const legacy = schedule([["08:00", cell("Clase", { rowspan: 2 })], ["08:15", cell("", { rowspan: 0 })], ["08:30", cell("")]]);
  const before = JSON.stringify(legacy);
  assert.equal(time.activityInterval(legacy.filas, 0, legacy.filas[0].celdas[0], 15).durationMinutes, 30);
  assert.equal(time.setDuration(legacy, 0, 0, 20, 15).ok, true);
  assert.equal(JSON.stringify(legacy), before);
});

test("mantiene los minutos correctos cuando un bloque pasa de medianoche", () => {
  const overnight = schedule([
    ["23:45 – 00:15", cell("Pausa")],
    ["00:15 – 00:30", cell("")]
  ]);
  assert.equal(time.activityInterval(overnight.filas, 0, overnight.filas[0].celdas[0], 15).durationMinutes, 30);
  const updated = time.setDuration(overnight, 0, 0, 20, 15);
  assert.equal(updated.ok, true);
  assert.equal(updated.schedule.filas[0].hora, "23:45 – 00:05");
  assert.equal(time.activityInterval(updated.schedule.filas, 0, updated.schedule.filas[0].celdas[0], 15).durationMinutes, 20);
});
