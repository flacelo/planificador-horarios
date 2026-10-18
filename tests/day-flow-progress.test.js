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

const bar = (html) => (html.match(/<div class="day-flow-progress">[\s\S]*?<\/small><\/div>/) || [])[0] || "";

test("la barra Tu día reemplaza el recuadro AVANCE y deja los avisos", () => {
  const html = renderCard({ done: ["a1"] }).html;
  assert.doesNotMatch(html, /AVANCE/);
  assert.match(html, /<span>AVISOS<\/span>/);
  assert.ok(html.indexOf("day-flow-progress") < html.indexOf("AVISOS"));
  assert.match(bar(html), /<span>Tu día<\/span>/);
});

test("la barra cuenta los momentos hechos con texto y lector de pantalla", () => {
  const b = bar(renderCard({ done: ["a1"] }).html);
  assert.match(b, /<small>1 de 3 momentos hechos<\/small>/);
  assert.match(b, /role="progressbar" aria-label="Progreso de tu día: 1 de 3 momentos hechos" aria-valuemin="0" aria-valuemax="3" aria-valuenow="1"/);
  assert.match(b, /<i style="width:33%"><\/i>/);
  assert.match(bar(renderCard({ done: [] }).html), /<small>0 de 3 momentos hechos<\/small>[\s\S]*$/);
  assert.match(bar(renderCard({ done: [] }).html), /width:0%/);
  assert.doesNotMatch(bar(renderCard({ done: ["a1"] }).html), /Día completo/);
});

test("con todos los momentos hechos dice ¡Día completo!", () => {
  const b = bar(renderCard({ done: ["a1", "a2", "a3"] }).html);
  assert.match(b, /<small>¡Día completo! 3 de 3 momentos hechos<\/small>/);
  assert.match(b, /aria-label="Progreso de tu día: 3 de 3 momentos hechos"/);
  assert.match(b, /width:100%/);
});

test("sin momentos no hay barra", () => {
  const html = renderCard({ withItems: false }).html;
  assert.doesNotMatch(html, /day-flow-progress|progressbar/);
  assert.match(html, /<span>AVISOS<\/span>/);
});

test("la barra no crea claves nuevas en el navegador", () => {
  assert.doesNotMatch(source, /localStorage\.setItem/);
});
