"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const time = require("../js/schedule-time.js");
const source = fs.readFileSync(require.resolve("../js/variable-duration.js"), "utf8");

function harness(rows) {
  const elements = {};
  function element(tagName) {
    const children = [];
    const item = {
      tagName: tagName.toUpperCase(), children, attributes: {}, hidden: false, disabled: false,
      appendChild(child) { children.push(child); child.parentElement = this; return child; },
      insertAdjacentElement(_where, child) { child.parentElement = this; this.children.push(child); return child; },
      addEventListener() {},
      setAttribute(name, value) { this.attributes[name] = String(value); },
      closest(selector) { return selector === ".planify-block-duration" ? (this.tagName === "DIV" && this.className === selector.slice(1) ? this : this.parentElement && this.parentElement.closest(selector)) : null; },
      querySelector(selector) { return selector === "small" ? this.children.find((child) => child.tagName === "SMALL") || null : null; },
      focus() { this.focused = true; }
    };
    let id = "";
    Object.defineProperty(item, "id", { get() { return id; }, set(value) { id = value; if (value) elements[value] = item; } });
    return item;
  }
  const modal = element("div");
  const category = element("select");
  elements.modal = modal;
  elements["modal-categoria"] = category;
  const document = { getElementById: (id) => elements[id] || null, createElement: element, head: { appendChild() {} } };
  const context = {
    document,
    plannerType: "semanal",
    dias: ["Lunes"],
    filas: rows.map((row) => ({ hora: row.hora, celdas: row.celdas.map((cell) => Object.assign({}, cell)) })),
    modalFila: -1,
    modalCol: -1,
    mergeSeleccion: [],
    originalSaveCount: 0,
    window: {
      PLANIFY_SCHEDULE_TIME: time,
      abrirModal(row, day) { context.modalFila = row; context.modalCol = day; },
      okModal() {
        context.originalSaveCount += 1;
        const cell = context.filas[context.modalFila].celdas[context.modalCol];
        cell.t = "Actividad de prueba";
        return true;
      },
      verificarChoqueHorario() { return null; }
    }
  };
  vm.runInNewContext(source, context, { filename: "variable-duration.js" });
  return { context, elements };
}

test("el editor integra 20 minutos, guarda una vez y conserva la identidad", () => {
  const app = harness([
    { hora: "09:00 – 09:15", celdas: [{ t: "Clase", c: "estudio", rowspan: 1, planifyActivityId: "clase-id" }] },
    { hora: "09:15 – 09:30", celdas: [{ t: "", c: "libre", rowspan: 1 }] },
    { hora: "09:30 – 09:45", celdas: [{ t: "", c: "libre", rowspan: 1 }] }
  ]);
  app.context.window.abrirModal(0, 0);
  const field = app.elements["planify-block-duration"];
  assert.ok(field);
  assert.equal(field.value, "15");
  field.value = "20";
  assert.equal(app.context.window.okModal(), true);
  assert.equal(app.context.originalSaveCount, 1);
  assert.equal(app.context.filas.length, 4);
  assert.equal(app.context.filas[0].celdas[0].rowspan, 2);
  assert.equal(app.context.filas[0].celdas[0].planifyActivityId, "clase-id");
  assert.equal(time.activityInterval(app.context.filas, 0, app.context.filas[0].celdas[0], 15).durationMinutes, 20);
});

test("el editor muestra el conflicto y no guarda ni cambia filas", () => {
  const app = harness([
    { hora: "09:00 – 09:15", celdas: [{ t: "Clase", c: "estudio", rowspan: 1 }] },
    { hora: "09:15 – 09:30", celdas: [{ t: "Otra clase", c: "estudio", rowspan: 1 }] },
    { hora: "09:30 – 09:45", celdas: [{ t: "", c: "libre", rowspan: 1 }] }
  ]);
  const originalRows = JSON.stringify(app.context.filas);
  app.context.window.abrirModal(0, 0);
  app.elements["planify-block-duration"].value = "20";
  app.context.window.okModal();
  assert.equal(app.context.originalSaveCount, 0);
  assert.equal(JSON.stringify(app.context.filas), originalRows);
  assert.equal(app.elements["planify-block-duration-error"].hidden, false);
  assert.match(app.elements["planify-block-duration-error"].textContent, /cruzaría/);
});
