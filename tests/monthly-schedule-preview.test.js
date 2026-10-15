"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const scheduleTime = require("../js/schedule-time.js");
const dayFlowSource = fs.readFileSync(require.resolve("../js/day-flow.js"), "utf8");
const monthlySource = fs.readFileSync(require.resolve("../js/monthly-calm.js"), "utf8");

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function schedule() {
  return {
    dias: DAYS,
    filas: [
      { hora: "07:30 – 08:00", celdas: DAYS.map((_, i) => ({ t: i < 5 ? "Estudiar inglés" : "", c: "estudio", rowspan: 1 })) },
      { hora: "22:00 – 22:30", celdas: DAYS.map((_, i) => ({ t: i === 0 ? "Gimnasio" : "", c: "bienestar", rowspan: 1 })) }
    ]
  };
}

function loadDayFlow(stored, counters) {
  const window = {
    PLANIFY_SCHEDULE_TIME: scheduleTime,
    PLANIFY_COMPLETION_HISTORY: {
      localDateKey() { return "2026-10-15"; },
      weekdayIndex(_name, index) { return index; },
      ensureActivityIds() { counters.ensure += 1; return stored; },
      isDone() { counters.done += 1; return false; }
    },
    setInterval() {},
    addEventListener() {}
  };
  const document = {
    body: {},
    readyState: "complete",
    getElementById() { return null; },
    createElement() { return { firstElementChild: null }; },
    addEventListener() {}
  };
  const localStorage = { getItem(key) { return key === "horario_data_semanal" ? JSON.stringify(stored) : null; } };
  vm.runInNewContext(dayFlowSource, {
    window, document, localStorage,
    MutationObserver: class { observe() {} },
    Date, Intl, Math, Number, String, Object, Array, JSON, RegExp, isNaN
  }, { filename: "day-flow.js" });
  return window.PLANIFY_DAY_FLOW;
}

test("forDate devuelve las actividades del día de la semana sin asignar ids ni marcar avances", () => {
  const counters = { ensure: 0, done: 0 };
  const flow = loadDayFlow(schedule(), counters);
  const monday = flow.forDate("2026-10-05");
  assert.deepEqual(Array.from(monday.map((item) => item.title)), ["Estudiar inglés", "Gimnasio"]);
  assert.equal(monday[0].start, 7 * 60 + 30);
  assert.deepEqual(Array.from(flow.forDate("2026-10-06").map((item) => item.title)), ["Estudiar inglés"]);
  assert.equal(flow.forDate("2026-10-10").length, 0); // sábado
  assert.equal(counters.ensure, 0);
  assert.equal(counters.done, 0);
});

test("today sigue marcando ids y avances como antes", () => {
  const counters = { ensure: 0, done: 0 };
  const flow = loadDayFlow(schedule(), counters);
  flow.today(new Date("2026-10-15T12:00:00"));
  assert.equal(counters.ensure, 1);
});

function fakeCell(className, fecha, text) {
  const children = [];
  const cell = {
    classList: { contains(name) { return className.split(" ").includes(name); } },
    dataset: fecha ? { fecha } : {},
    textContent: text || "",
    children,
    attrs: {},
    setAttribute(name, value) { this.attrs[name] = value; },
    removeAttribute() {},
    querySelector(selector) {
      if (selector === ".cal-horario") return children.find((child) => child.className === "cal-horario") || null;
      if (selector === ".cal-numero") return number;
      return null;
    },
    insertBefore(node) { children.push(node); }
  };
  const number = { insertAdjacentElement(_where, node) { children.push(node); } };
  return cell;
}

test("la vista mensual muestra el horario solo en los días del mes que se está viendo", () => {
  const counters = { ensure: 0, done: 0 };
  const flow = loadDayFlow(schedule(), counters);
  const created = [];
  const document = {
    createElement(tag) {
      const element = {
        tag, className: "", textContent: "", children: [],
        setAttribute() {},
        appendChild(child) { this.children.push(child); },
        remove() { grid.cells.forEach((cell) => { const at = cell.children.indexOf(this); if (at >= 0) cell.children.splice(at, 1); }); }
      };
      created.push(element);
      return element;
    },
    getElementById() { return null; },
    addEventListener() {}
  };
  const grid = {
    cells: [
      fakeCell("cal-dia otro-mes", "", "30"),
      fakeCell("cal-dia", "2026-10-05"),
      fakeCell("cal-dia", "2026-10-10")
    ],
    querySelectorAll() { return this.cells; },
    addEventListener() {}
  };
  const context = {
    window: { PLANIFY_DAY_FLOW: flow, PLANIFY_SCHEDULE_TIME: scheduleTime },
    document,
    Intl, Date, Array, String, parseInt, Math,
    MutationObserver: class { observe() {} }
  };
  // Se expone enhanceCalendarCells ejecutando solo su definición, sin init().
  const exposed = monthlySource.replace(/\n\s*if \(document\.readyState[\s\S]*$/, "\n  window.__enhance = enhanceCalendarCells;\n})();");
  vm.runInNewContext(exposed, context, { filename: "monthly-calm.js" });
  context.window.__enhance(grid);

  const [other, monday, saturday] = grid.cells;
  assert.equal(other.children.length, 0, "el día gris no lleva horario");
  assert.equal(saturday.children.length, 0, "el sábado no tiene actividades");
  assert.equal(monday.children.length, 1);
  const rows = monday.children[0].children;
  assert.equal(rows.length, 2);
  assert.match(monday.attrs["aria-label"], /Horario: Estudiar inglés, Gimnasio/);
  // llamar de nuevo no duplica el horario
  context.window.__enhance(grid);
  assert.equal(monday.children.filter((child) => child.className === "cal-horario").length, 1);
});
