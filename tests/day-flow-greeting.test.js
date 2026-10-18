"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const scheduleTime = require("../js/schedule-time.js");
const source = fs.readFileSync(require.resolve("../js/day-flow.js"), "utf8");

// Domingo 27 de septiembre de 2026 (índice 6 del horario) con tres momentos: 6:00, 9:00 y 15:00.
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
function schedule() {
  const row = (hora, title, id) => ({ hora, celdas: DAYS.map((_, i) => ({ t: i === 6 ? title : "", c: "estudio", rowspan: 1, planifyActivityId: i === 6 ? id : "" })) });
  return { dias: DAYS, filas: [row("06:00 – 07:00", "Leer", "a1"), row("09:00 – 10:00", "Estudiar", "a2"), row("15:00 – 16:00", "Repasar", "a3")] };
}

// Dibuja la tarjeta con una hora, un nombre y una lista de momentos hechos.
function renderCard({ hour = 10, minute = 0, name = null, profileName = null, done = [], withItems = true }) {
  const sched = withItems ? schedule() : { dias: DAYS, filas: [] };
  const store = {
    horario_data_semanal: JSON.stringify(sched),
    planify_nombre: name,
    planify_personalizacion_v1: profileName ? JSON.stringify({ name: profileName }) : null
  };
  const fixed = new Date(2026, 8, 27, hour, minute, 0);
  class FakeDate extends Date { constructor(...args) { if (args.length) super(...args); else super(fixed.getTime()); } static now() { return fixed.getTime(); } }
  let html = "";
  const daily = { dataset: {}, querySelector() { return null; }, insertAdjacentElement(_p, el) { html = el.html; } };
  const document = {
    body: {}, readyState: "complete",
    getElementById(id) { return id === "view-diario" ? daily : null; },
    createElement() { return { set innerHTML(v) { this.html = v; this.firstElementChild = { html: v }; }, get innerHTML() { return this.html; }, firstElementChild: null }; },
    addEventListener() {}
  };
  const window = {
    PLANIFY_COMPLETION_HISTORY: { localDateKey() { return "2026-09-27"; }, weekdayIndex(_n, i) { return i; }, ensureActivityIds() { return sched; }, isDone(_d, id) { return done.indexOf(id) >= 0; } },
    PLANIFY_SCHEDULE_TIME: scheduleTime, PLANIFY_FOCUS: { open() {} }, setInterval() {}, addEventListener() {}, cambiarTab() {}
  };
  vm.runInNewContext(source, {
    window, document, localStorage: { getItem(k) { return store[k] == null ? null : store[k]; } },
    MutationObserver: class { observe() {} }, Date: FakeDate, Intl, Math, Number, String, Object, Array, JSON, RegExp, isNaN
  }, { filename: "day-flow.js" });
  return { html, api: window.PLANIFY_DAY_FLOW };
}
const hello = (html) => (html.match(/<strong class="day-flow-hello">([^<]*)<\/strong>/) || [])[1];

test("saludo según la hora: buenos días, buenas tardes o buenas noches", () => {
  [[5, 0, "Buenos días"], [9, 30, "Buenos días"], [11, 59, "Buenos días"], [12, 0, "Buenas tardes"], [18, 59, "Buenas tardes"],
   [19, 0, "Buenas noches"], [23, 30, "Buenas noches"], [2, 0, "Buenas noches"], [4, 59, "Buenas noches"]].forEach(([h, m, expected]) => {
    assert.equal(hello(renderCard({ hour: h, minute: m }).html), expected, h + ":" + m);
  });
});

test("el saludo usa solo la primera palabra del nombre ya guardado y sin nombre queda sin coma", () => {
  assert.equal(hello(renderCard({ hour: 21, name: "Flavio López" }).html), "Buenas noches, Flavio");
  assert.equal(hello(renderCard({ hour: 9, profileName: "Ana María" }).html), "Buenos días, Ana");
  assert.equal(hello(renderCard({ hour: 9, name: "  " }).html), "Buenos días");
  assert.equal(hello(renderCard({ hour: 14 }).html), "Buenas tardes");
});

test("el nombre se escapa (no se puede colar HTML) y no se escribe nada en el navegador", () => {
  const card = renderCard({ hour: 9, name: '<img src=x onerror="alert(1)">' });
  assert.doesNotMatch(card.html, /<img/);
  assert.match(card.html, /&lt;img/);
  assert.doesNotMatch(source, /localStorage\.setItem/);
});

test("la fecha va debajo del saludo: 'Hoy · domingo, 27 de setiembre' (como lo escribe es-PE)", () => {
  const card = renderCard({ hour: 10 });
  assert.match(card.html, /<div class="day-flow-date">Hoy · domingo, 27 de (?:se|sep)tiembre<\/div>/);
  assert.doesNotMatch(card.html, /HOY ·/);
  assert.ok(card.html.indexOf("day-flow-hello") < card.html.indexOf("day-flow-date"));
  assert.ok(card.html.indexOf("day-flow-date") < card.html.indexOf("day-flow-head"));
});

test("estilo del saludo y la fecha: 12 px o más y colores con contraste en claro y oscuro", () => {
  const css = fs.readFileSync(require.resolve("../css/day-flow.css"), "utf8");
  const i = css.indexOf("/* Saludo y fecha");
  assert.ok(i >= 0);
  const b = css.slice(i);
  assert.match(b, /\.planify-day-flow \.day-flow-hello \{[^}]*font-size: 1\.15rem;[^}]*color: #17333b;/);
  assert.match(b, /\.planify-day-flow \.day-flow-date \{[^}]*font-size: 12px;[^}]*color: #4f5d70;/);
  assert.match(b, /body\.tema-estelar:not\(\.light-mode\):where\(:not\(\.tema-claro\)\) \.planify-day-flow \.day-flow-hello \{ color: #f3f7ff; \}/);
  assert.match(b, /body\.tema-estelar:not\(\.light-mode\):where\(:not\(\.tema-claro\)\) \.planify-day-flow \.day-flow-date \{ color: #b4c3d6; \}/);
});
