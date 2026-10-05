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
  const sessionStorage = new MemoryStorage(options.session || {});
  const classes = new Set();
  const appended = [];
  const elements = [];
  const background = {
    nodeType: 1,
    inert: false,
    attributes: {},
    getAttribute(name) { return this.attributes[name] ?? null; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; }
  };
  const document = {
    activeElement: null,
    documentElement: {
      classList: {
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); }
      }
    },
    head: { appendChild(element) { appended.push(element); } },
    body: { children: [background], appendChild(element) { elements.push(element); } },
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
    background,
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

test("una primera visita recargada no confunde ajustes automáticos con un plan ajeno", () => {
  const app = runGate({
    horario_intervalo: "60",
    horario_inicio: "07:00",
    horario_fin: "23:00",
    horario_planner_type: "semanal",
    planify_tipo_planificador: "semanal",
    planify_ultima_vista_v1: "diario",
    planify_bienvenida_estado: "descartada",
    horario_data_semanal: JSON.stringify({ dias: ["LUNES"], filas: [{ hora: "07:00", celdas: [{ t: "", c: "libre" }] }] })
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
  assert.equal(app.background.inert, true);
  assert.equal(app.background.getAttribute("aria-hidden"), "true");
  assert.equal(app.elements.length, 1);
  assert.match(app.elements[0].innerHTML, /Este navegador ya tiene un plan guardado/);
  assert.match(app.elements[0].innerHTML, /solo en este navegador/);
  assert.doesNotMatch(app.elements[0].innerHTML, /Turno privado/);

  const continueButton = {
    getAttribute(name) { return name === "data-action" ? "continue" : null; }
  };
  app.elements[0].handlers.click({ target: { closest() { return continueButton; } } });
  assert.equal(app.classes.has("planify-data-gate-active"), false);
  assert.equal(app.background.inert, false);
  assert.equal(app.background.getAttribute("aria-hidden"), null);
  assert.equal(app.sessionStorage.getItem("planify_local_data_choice_v1"), null);

  const nextVisit = runGate(Object.fromEntries(app.localStorage.values), {
    session: Object.fromEntries(app.sessionStorage.values)
  });
  assert.equal(nextVisit.classes.has("planify-data-gate-active"), true);
  assert.doesNotMatch(nextVisit.elements[0].innerHTML, /Turno privado/);
});

test("una confirmación antigua de esta pestaña no muestra el plan automáticamente", () => {
  const app = runGate({
    horario_data_semanal: JSON.stringify({ filas: [{ celdas: [{ t: "Plan de otra persona" }] }] })
  }, {
    session: { planify_local_data_choice_v1: "continue" }
  });

  assert.equal(app.classes.has("planify-data-gate-active"), true);
  assert.equal(app.sessionStorage.getItem("planify_local_data_choice_v1"), null);
  assert.doesNotMatch(app.elements[0].innerHTML, /Plan de otra persona/);
});

test("empezar en blanco conserva la copia sin bloquear las visitas siguientes", () => {
  const app = runGate({
    horario_data_semanal: JSON.stringify({ filas: [{ celdas: [{ t: "Horario de prueba" }] }] }),
    planify_nombre: "Persona anterior"
  });
  const freshButton = {
    getAttribute(name) { return name === "data-action" ? "fresh" : null; }
  };
  app.elements[0].handlers.click({ target: { closest() { return freshButton; } } });

  assert.equal(app.reloads(), 1);
  assert.ok(Array.from(app.localStorage.values.keys()).some((key) => key.startsWith("planify_local_data_archive_v1:")));
  assert.equal(app.localStorage.getItem("horario_data_semanal"), null);
  assert.equal(app.localStorage.getItem("planify_nombre"), null);
  assert.equal(app.sessionStorage.getItem("planify_local_data_choice_v1"), "fresh");

  const afterFreshReload = runGate(Object.fromEntries(app.localStorage.values), {
    session: Object.fromEntries(app.sessionStorage.values)
  });
  assert.equal(afterFreshReload.classes.has("planify-data-gate-active"), false);
  assert.equal(afterFreshReload.sessionStorage.getItem("planify_local_data_choice_v1"), null);

  const nextVisit = runGate(Object.fromEntries(afterFreshReload.localStorage.values), {
    session: Object.fromEntries(afterFreshReload.sessionStorage.values)
  });
  assert.equal(nextVisit.classes.has("planify-data-gate-active"), false);
  assert.equal(nextVisit.elements[0].id, "planify-archive-recovery");
  assert.match(nextVisit.elements[0].innerHTML, /Recuperar una copia/);
  assert.doesNotMatch(nextVisit.elements[0].innerHTML, /Horario de prueba|Persona anterior/);

  nextVisit.elements[0].handlers.click({ target: { closest() { return {}; } } });
  assert.equal(nextVisit.classes.has("planify-data-gate-active"), true);
  assert.match(nextVisit.elements[1].innerHTML, /Hay una copia anterior/);
  const restoreButton = { getAttribute(name) { return name === "data-action" ? "restore" : null; } };
  nextVisit.elements[1].handlers.click({ target: { closest() { return restoreButton; } } });
  assert.equal(nextVisit.reloads(), 1);
  assert.match(nextVisit.localStorage.getItem("horario_data_semanal"), /Horario de prueba/);
  const restoredVisit = runGate(Object.fromEntries(nextVisit.localStorage.values));
  assert.equal(restoredVisit.classes.has("planify-data-gate-active"), true);
  assert.doesNotMatch(restoredVisit.elements[0].innerHTML, /Horario de prueba/);
});

test("una copia archivada vacía se conserva sin bloquear a una persona nueva", () => {
  const archiveKey = "planify_local_data_archive_v1:old-empty";
  const emptyArchive = {
    version: 1,
    savedAt: "2026-09-20T12:00:00.000Z",
    values: {
      horario_inicio: "07:00",
      horario_fin: "23:00",
      horario_intervalo: "60",
      horario_data_semanal: JSON.stringify({ dias: ["LUNES"], filas: [{ celdas: [{ t: "", c: "libre" }] }] })
    }
  };
  const app = runGate({ [archiveKey]: JSON.stringify(emptyArchive) });

  assert.equal(app.classes.has("planify-data-gate-active"), false);
  assert.equal(app.elements.length, 0);
  assert.equal(app.localStorage.getItem(archiveKey), JSON.stringify(emptyArchive));
  assert.equal(app.hooks.archives().length, 0);
});

test("la opción de recuperación elige la copia real más reciente e ignora una copia vacía posterior", () => {
  const emptyKey = "planify_local_data_archive_v1:empty-newer";
  const realKey = "planify_local_data_archive_v1:real-older";
  const emptyArchive = {
    version: 1,
    savedAt: "2026-09-30T12:00:00.000Z",
    values: { horario_inicio: "07:00", horario_data_semanal: JSON.stringify({ filas: [] }) }
  };
  const realArchive = {
    version: 1,
    savedAt: "2026-09-20T12:00:00.000Z",
    values: { horario_data_semanal: JSON.stringify({ filas: [{ celdas: [{ t: "Turno real" }] }] }) }
  };
  const app = runGate({
    [emptyKey]: JSON.stringify(emptyArchive),
    [realKey]: JSON.stringify(realArchive)
  });

  assert.equal(app.classes.has("planify-data-gate-active"), false);
  assert.equal(app.hooks.archives().length, 1);
  assert.equal(app.hooks.archives()[0].key, realKey);
  assert.equal(app.elements[0].id, "planify-archive-recovery");
  assert.doesNotMatch(app.elements[0].innerHTML, /Turno real/);
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
  assert.equal(app.localStorage.getItem("horario_inicio"), "06:30");
  assert.equal(app.localStorage.getItem("horario_tema"), "estelar");
  assert.equal(app.localStorage.getItem("planify_idioma"), "es");
  assert.equal(app.hooks.restoreArchive(archived.archiveKey).ok, true);
  assert.match(app.localStorage.getItem("planify_focus_activity_v1"), /Actividad privada/);

  const freshStart = app.hooks.createArchive();
  assert.equal(freshStart.ok, true);
  const reopened = runGate(Object.fromEntries(app.localStorage.values));
  assert.equal(reopened.classes.has("planify-data-gate-active"), false);
  assert.equal(reopened.elements[0].id, "planify-archive-recovery");
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
