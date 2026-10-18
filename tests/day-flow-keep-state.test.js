"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const scheduleTime = require("../js/schedule-time.js");
const source = fs.readFileSync(require.resolve("../js/day-flow.js"), "utf8");

// Domingo 27 de septiembre de 2026 con tres momentos (a1, a2, a3).
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const row = (hora, title, id) => ({ hora, celdas: DAYS.map((_, i) => ({ t: i === 6 ? title : "", c: "estudio", rowspan: 1, planifyActivityId: i === 6 ? id : "" })) });
const sched = { dias: DAYS, filas: [row("06:00 – 07:00", "Leer", "a1"), row("09:00 – 10:00", "Estudiar", "a2"), row("15:00 – 16:00", "Repasar", "a3")] };

// Tarjeta falsa armada a partir del texto HTML: lista plegable y barra con un registro de cada ancho asignado.
function cardFromHtml(html) {
  const list = /class="day-flow-list"/.test(html)
    ? { open: false, classes: new Set(), setAttribute(name) { if (name === "open") this.open = true; }, classList: { add: (c) => list.classes.add(c), remove: (c) => list.classes.delete(c) } }
    : null;
  const match = html.match(/<i style="width:(\d+)%">/);
  let fill = null;
  if (match) {
    const log = [];
    let width = match[1] + "%";
    fill = { offsetWidth: 1, log, style: { get width() { return width; }, set width(v) { width = v; log.push(v); } } };
  }
  return { html, list, fill, querySelector(sel) { return sel === ".day-flow-list" ? list : sel === ".day-flow-bar" && fill ? { firstElementChild: fill } : null; }, replaceWith(next) { this.replacedBy = next; } };
}

function setup({ done = [], hour = 10 }) {
  const fixed = new Date(2026, 8, 27, hour, 0, 0);
  class FakeDate extends Date { constructor(...args) { if (args.length) super(...args); else super(fixed.getTime()); } static now() { return fixed.getTime(); } }
  const handlers = {};
  let current = null;
  const daily = { dataset: {}, querySelector(sel) { return sel === ".planify-day-flow" ? current : null; }, insertAdjacentElement(_p, el) { current = el; } };
  const document = {
    body: {}, readyState: "complete",
    getElementById(id) { return id === "view-diario" ? daily : null; },
    createElement() { return { set innerHTML(v) { this.firstElementChild = cardFromHtml(v); }, firstElementChild: null }; },
    addEventListener(type, fn) { handlers[type] = fn; }
  };
  const window = {
    PLANIFY_COMPLETION_HISTORY: { localDateKey() { return "2026-09-27"; }, weekdayIndex(_n, i) { return i; }, ensureActivityIds() { return sched; }, isDone(_d, id) { return done.indexOf(id) >= 0; } },
    PLANIFY_SCHEDULE_TIME: scheduleTime, PLANIFY_FOCUS: { open() {} }, setInterval() {}, addEventListener() {}, cambiarTab() {}
  };
  vm.runInNewContext(source, {
    window, document, localStorage: { getItem(k) { return k === "horario_data_semanal" ? JSON.stringify(sched) : null; } },
    MutationObserver: class { observe() {} }, Date: FakeDate, Intl, Math, Number, String, Object, Array, JSON, RegExp, isNaN, parseFloat
  }, { filename: "day-flow.js" });
  // Cada refresh deja la tarjeta nueva en `current` (replaceWith la guarda en la vieja).
  const refresh = () => { const old = current; window.PLANIFY_DAY_FLOW.refresh(); if (old) current = old.replacedBy; return current; };
  return { refresh, card: () => current, click: (event) => handlers.click(event), done };
}

test("'Ver mi jornada de hoy' sigue abierta tras volver a dibujar la tarjeta, sin animarse de nuevo", () => {
  const t = setup({});
  t.refresh();
  assert.equal(t.card().list.open, false);
  t.card().list.open = true;
  const next = t.refresh();
  assert.equal(next.list.open, true);
  assert.ok(next.list.classes.has("is-restored"));
});

test("si estaba cerrada, sigue cerrada", () => {
  const t = setup({});
  t.refresh();
  const next = t.refresh();
  assert.equal(next.list.open, false);
  assert.equal(next.list.classes.has("is-restored"), false);
});

test("al tocar el resumen se quita la marca de restaurada, para que abrir otra vez sí se anime", () => {
  const t = setup({});
  t.refresh(); t.card().list.open = true;
  const next = t.refresh();
  const summary = { parentNode: next.list };
  t.click({ target: { closest(sel) { return sel === ".day-flow-list > summary" ? summary : null; } } });
  assert.equal(next.list.classes.has("is-restored"), false);
});

test("la barra crece desde su valor anterior solo cuando el avance cambió", () => {
  const t = setup({});
  t.refresh();
  t.done.push("a1");
  const next = t.refresh();
  assert.deepEqual(next.fill.log, ["0%", "33%"]);
  assert.equal(next.fill.style.width, "33%");
  t.done.push("a2", "a3");
  assert.deepEqual(t.refresh().fill.log, ["33%", "100%"]);
});

test("sin cambio de avance la barra no se mueve (no parpadea cada 30 s)", () => {
  const t = setup({ done: ["a1"] });
  t.refresh();
  const next = t.refresh();
  assert.deepEqual(next.fill.log, []);
  assert.equal(next.fill.style.width, "33%");
});

test("la primera vez que se dibuja la barra aparece directo en su valor", () => {
  const t = setup({ done: ["a1"] });
  assert.deepEqual(t.refresh().fill.log, []);
});
