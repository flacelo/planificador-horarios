"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// renderizarCalendario vive dentro de js/app.js; se extrae con su cierre de llaves para probarla sola.
const source = fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8");
const start = source.indexOf("function renderizarCalendario(");
let depth = 0;
let end = start;
for (let i = start; i < source.length; i += 1) {
  if (source[i] === "{") depth += 1;
  if (source[i] === "}") {
    depth -= 1;
    if (depth === 0) { end = i + 1; break; }
  }
}
const functionSource = source.slice(start, end);

function fakeElement() {
  const element = {
    className: "",
    textContent: "",
    dataset: {},
    style: {},
    children: [],
    classList: { add() {} },
    appendChild(child) { element.children.push(child); },
    addEventListener() {},
    querySelectorAll() { return []; }
  };
  return element;
}

function renderMonth(year, monthIndex) {
  const grid = fakeElement();
  const context = {
    _mesActual: monthIndex,
    _anioActual: year,
    _eventosCal: {},
    MESES_ES: [],
    MESES_EN: [],
    window: {},
    console: { log() {}, error(...args) { throw new Error(args.join(" ")); } },
    document: {
      getElementById(id) { return id === "cal-grid" ? grid : null; },
      querySelector() { return null; },
      createElement: fakeElement
    },
    abrirEventoFecha() {}
  };
  vm.createContext(context);
  vm.runInContext(functionSource + "; renderizarCalendario();", context);
  return grid.children;
}

test("los días grises antes del 1.º son los últimos del mes anterior, en los 12 meses de 2026", () => {
  assert.ok(functionSource.length > 500, "no se encontró renderizarCalendario en js/app.js");
  for (let month = 0; month < 12; month += 1) {
    const cells = renderMonth(2026, month);
    const firstOfMonth = new Date(2026, month, 1);
    const fillers = (firstOfMonth.getDay() + 6) % 7; // semana que empieza en lunes
    const lastOfPrevious = new Date(2026, month, 0).getDate();
    const expected = Array.from({ length: fillers }, (_, i) => String(lastOfPrevious - fillers + 1 + i));
    const shown = cells.slice(0, fillers).map((cell) => String(cell.textContent));
    assert.deepEqual(shown, expected, "mes " + (month + 1) + " de 2026");
  }
});

test("octubre de 2026 muestra 28, 29 y 30 antes del jueves 1", () => {
  const cells = renderMonth(2026, 9);
  assert.deepEqual(cells.slice(0, 3).map((cell) => String(cell.textContent)), ["28", "29", "30"]);
  assert.equal(cells.length % 7, 0);
});
