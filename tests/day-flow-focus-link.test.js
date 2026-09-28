"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const scheduleTime = require("../js/schedule-time.js");
const source = fs.readFileSync(require.resolve("../js/day-flow.js"), "utf8");

function makeSchedule() {
  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  return {
    dias: days,
    filas: [{ hora: "00:00 – 24:00", celdas: days.map((_, index) => ({
      t: index === 6 ? "Curso de cálculo" : "", c: "estudio", rowspan: 1,
      planifyActivityId: index === 6 ? "calc-stable-id" : ""
    })) }]
  };
}

test("Enfocarme pasa ID estable, fecha local y título de la actividad visible", () => {
  const schedule = makeSchedule();
  const localStorage = { getItem(key) { return key === "horario_data_semanal" ? JSON.stringify(schedule) : null; } };
  const listeners = {};
  let insertedMarkup = "";
  let receivedContext = null;
  const daily = {
    querySelector() { return null; },
    insertAdjacentElement(_position, element) { insertedMarkup = element.html; }
  };
  const document = {
    body: {},
    readyState: "complete",
    getElementById(id) { return id === "view-diario" ? daily : null; },
    createElement() {
      return {
        set innerHTML(value) { this.html = value; this.firstElementChild = { html: value }; },
        get innerHTML() { return this.html; },
        firstElementChild: null
      };
    },
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); }
  };
  const history = {
    localDateKey() { return "2026-09-27"; },
    weekdayIndex(_name, index) { return index; },
    ensureActivityIds() { return schedule; },
    isDone() { return false; }
  };
  const window = {
    PLANIFY_COMPLETION_HISTORY: history,
    PLANIFY_SCHEDULE_TIME: scheduleTime,
    PLANIFY_FOCUS: { open(context) { receivedContext = context || null; } },
    setInterval() {},
    addEventListener() {},
    cambiarTab() {}
  };
  const context = {
    window, document, localStorage,
    MutationObserver: class { observe() {} },
    Date, Intl, Math, Number, String, Object, Array, JSON, RegExp, isNaN
  };
  vm.runInNewContext(source, context, { filename: "day-flow.js" });
  assert.match(insertedMarkup, /data-focus-activity-id="calc-stable-id"/);
  assert.match(insertedMarkup, /data-focus-date-key="2026-09-27"/);
  assert.match(insertedMarkup, /data-focus-title="Curso de cálculo"/);
  const button = {
    closest(selector) { return selector === "[data-day-flow-action]" ? this : null; },
    getAttribute(name) {
      return {
        "data-day-flow-action": "focus",
        "data-focus-activity-id": "calc-stable-id",
        "data-focus-date-key": "2026-09-27",
        "data-focus-title": "Curso de cálculo"
      }[name] || null;
    }
  };
  listeners.click[0]({ target: button, preventDefault() {} });
  assert.equal(receivedContext.activityId, "calc-stable-id");
  assert.equal(receivedContext.dateKey, "2026-09-27");
  assert.equal(receivedContext.title, "Curso de cálculo");
});
