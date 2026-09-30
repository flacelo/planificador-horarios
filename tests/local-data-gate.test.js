"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const gateSource = fs.readFileSync(require.resolve("../js/local-data-gate.js"), "utf8");
const indexHtml = fs.readFileSync(require.resolve("../index.html"), "utf8");

class MemoryStorage {
  constructor(initial = {}, quota = Infinity) {
    this.values = new Map(Object.entries(initial));
    this.quota = quota;
  }
  get length() { return this.values.size; }
  key(index) { return Array.from(this.values.keys())[index] || null; }
  getItem(key) { return this.values.has(String(key)) ? this.values.get(String(key)) : null; }
  setItem(key, value) {
    const name = String(key);
    const next = new Map(this.values);
    next.set(name, String(value));
    const bytes = Array.from(next.entries()).reduce((sum, entry) => sum + entry[0].length + entry[1].length, 0);
    if (bytes > this.quota) throw new Error("QuotaExceededError");
    this.values = next;
  }
  removeItem(key) { this.values.delete(String(key)); }
}

function runGate(initial = {}, options = {}) {
  const localStorage = new MemoryStorage(initial, options.quota);
  const sessionStorage = new MemoryStorage();
  const classes = new Set();
  const appended = [];
  const elements = [];
  const document = {
    activeElement: null,
    documentElement: {
      classList: {
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); }
      }
    },
    head: { appendChild(element) { appended.push(element); } },
    body: { appendChild(element) { elements.push(element); } },
    createElement(tag) {
      const element = {
        tagName: tag.toUpperCase(),
        handlers: {},
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, handler) { this.handlers[name] = handler; },
        querySelector() { return { focus() {} }; },
        querySelectorAll() { return [{ focus() {} }, { focus() {} }]; },
        focus() {},
        remove() { this.removed = true; }
      };
      return element;
    },
    getElementById(id) { return elements.find((element) => element.id === id) || null; }
  };
  let reloads = 0;
  const window = {
    __PLANIFY_PRIVACY_TEST__: true,
    location: { reload() { reloads += 1; } }
  };
  vm.runInNewContext(gateSource, {
    window, document, localStorage, sessionStorage, Date, Math, JSON, Object, Array, String, Set
  });
  return {
    localStorage,
    sessionStorage,
    classes,
    elements,
    appended,
    reloads: () => reloads,
    hooks: window.__PLANIFY_PRIVACY_TEST_HOOKS__
  };
}

test("no bloquea un plan vacío y no confunde preferencias con datos personales", () => {
  const app = runGate({
    horario_data_semanal: JSON.stringify({ dias: ["LUN"], filas: [] }),
    horario_tema: "estelar",
    planify_theme: "dark"
  });
  assert.equal(app.classes.has("planify-data-gate-active"), false);
  assert.equal(app.elements.length, 0);
});

test("el protector se carga antes de que app.js lea el almacenamiento", () => {
  const gateIndex = indexHtml.indexOf('src="js/local-data-gate.js?v=1.0"');
  const appIndex = indexHtml.indexOf('src="js/app.js?v=9.7"');
  assert.ok(gateIndex >= 0);
  assert.ok(appIndex > gateIndex);
});

test("oculta un horario anterior hasta que el usuario decide si es suyo", () => {
  const app = runGate({
    horario_data_semanal: JSON.stringify({ filas: [{ celdas: [{ t: "Turno privado" }] }] })
  });
  assert.equal(app.classes.has("planify-data-gate-active"), true);
  assert.equal(app.elements.length, 1);
  assert.match(app.elements[0].innerHTML, /Este navegador ya tiene un plan guardado/);
  assert.match(app.elements[0].innerHTML, /solo en este navegador/);
  assert.doesNotMatch(app.elements[0].innerHTML, /Turno privado/);

  const continueButton = {
    getAttribute(name) { return name === "data-action" ? "continue" : null; }
  };
  app.elements[0].handlers.click({ target: { closest() { return continueButton; } } });
  assert.equal(app.classes.has("planify-data-gate-active"), false);
  assert.equal(app.sessionStorage.getItem("planify_local_data_choice_v1"), "continue");
});

test("detecta y protege también historiales y ajustes del horario, no solo sus celdas", () => {
  const app = runGate({
    planify_cumplimiento_historial_v1: JSON.stringify({
      schemaVersion: 1,
      days: { "2026-09-28": { activityA: { status: "done" } } }
    }),
    planify_focus_activity_v1: JSON.stringify({
      schemaVersion: 1,
      sessions: { sessionA: { title: "Actividad privada", minutes: 25 } }
    }),
    horario_inicio: "06:30",
    horario_tema: "estelar",
    planify_idioma: "es"
  });
  assert.equal(app.classes.has("planify-data-gate-active"), true);
  const archived = app.hooks.createArchive();
  assert.equal(archived.ok, true);
  assert.equal(app.localStorage.getItem("planify_cumplimiento_historial_v1"), null);
  assert.equal(app.localStorage.getItem("planify_focus_activity_v1"), null);
  assert.equal(app.localStorage.getItem("horario_inicio"), null);
  assert.equal(app.localStorage.getItem("horario_tema"), "estelar");
  assert.equal(app.localStorage.getItem("planify_idioma"), "es");
  assert.equal(app.hooks.restoreArchive(archived.archiveKey).ok, true);
  assert.match(app.localStorage.getItem("planify_focus_activity_v1"), /Actividad privada/);

  const freshStart = app.hooks.createArchive();
  assert.equal(freshStart.ok, true);
  const reopened = runGate(Object.fromEntries(app.localStorage.values));
  assert.equal(reopened.classes.has("planify-data-gate-active"), true);
  assert.match(reopened.elements[0].innerHTML, /Hay una copia anterior/);
});

test("archiva y restaura datos Planify sin tocar preferencias ni datos de otros sitios", () => {
  const app = runGate({
    horario_data_semanal: JSON.stringify({ filas: [{ celdas: [{ t: "Proyecto" }] }] }),
    planify_nombre: "Flavio",
    horario_tema: "pastel",
    planify_theme: "light",
    unrelated_key: "keep"
  });
  const archived = app.hooks.createArchive();
  assert.equal(archived.ok, true);
  assert.equal(app.localStorage.getItem("horario_data_semanal"), null);
  assert.equal(app.localStorage.getItem("planify_nombre"), null);
  assert.equal(app.localStorage.getItem("horario_tema"), "pastel");
  assert.equal(app.localStorage.getItem("planify_theme"), "light");
  assert.equal(app.localStorage.getItem("unrelated_key"), "keep");

  const result = app.hooks.restoreArchive(archived.archiveKey);
  assert.equal(result.ok, true);
  assert.match(app.localStorage.getItem("horario_data_semanal"), /Proyecto/);
  assert.equal(app.localStorage.getItem("planify_nombre"), "Flavio");
  assert.notEqual(app.localStorage.getItem(archived.archiveKey), null);
});

test("si el navegador no tiene espacio para la copia, conserva intactos los datos actuales", () => {
  const initial = {
    horario_data_semanal: JSON.stringify({ filas: [{ celdas: [{ t: "No borrar" }] }] })
  };
  const originalSize = Object.entries(initial).reduce((sum, item) => sum + item[0].length + item[1].length, 0);
  const app = runGate(initial, { quota: originalSize + 1 });
  const result = app.hooks.createArchive();
  assert.equal(result.ok, false);
  assert.match(result.message, /No cambié ni borré tus datos/);
  assert.equal(app.localStorage.getItem("horario_data_semanal"), initial.horario_data_semanal);
  assert.deepEqual(Array.from(app.localStorage.values.keys()), ["horario_data_semanal"]);
});
