"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const completionHistory = require("../js/completion-history.js");
const scheduleTime = require("../js/schedule-time.js");
const focusActivityHistory = require("../js/focus-activity-history.js");

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8"));

class MemoryStorage {
  constructor() { this.values = new Map(); this.failNextKey = ""; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) {
    if (this.failNextKey === key) { this.failNextKey = ""; throw new Error("simulated quota failure"); }
    this.values.set(key, String(value));
  }
  removeItem(key) { this.values.delete(key); }
  key(index) { return [...this.values.keys()][index] || null; }
  get length() { return this.values.size; }
  snapshot() { return [...this.values.entries()].sort(([a], [b]) => a.localeCompare(b)); }
}

class FakeElement {
  constructor(document) {
    this.document = document;
    this.children = [];
    this.handlers = {};
    this.dataset = {};
    this.style = {};
    this.classList = { toggle() {}, add() {}, remove() {} };
    this.attributes = {};
    this.files = [];
    this.value = "";
    this.textContent = "";
    this.hidden = false;
    this._id = "";
  }
  set id(value) { this._id = value; if (value) this.document.elements.set(value, this); }
  get id() { return this._id; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(type, handler) { (this.handlers[type] ||= []).push(handler); }
  dispatch(type, extra = {}) {
    const event = Object.assign({ currentTarget: this, target: this, preventDefault() {} }, extra);
    (this.handlers[type] || []).forEach((handler) => handler(event));
  }
  click() { this.clickCount = (this.clickCount || 0) + 1; this.dispatch("click"); }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { children.forEach((child) => this.appendChild(child)); }
  insertAdjacentElement(_position, element) { this.appendChild(element); }
  querySelector() { return null; }
}

function makeHarness({ initialSchedule, initialHistory, initialFocus, confirm = true } = {}) {
  const storage = new MemoryStorage();
  const document = {
    readyState: "complete",
    elements: new Map(),
    addEventListener() {},
    querySelector(selector) { return selector === "#tab-ajustes .config-actions" ? actions : null; },
    getElementById(id) { return this.elements.get(id) || (id === "side-panel" ? panel : null); },
    createElement() { return new FakeElement(this); }
  };
  const actions = new FakeElement(document);
  const panel = new FakeElement(document);
  const host = {
    document,
    localStorage: storage,
    CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options && options.detail; },
    crypto: { randomUUID: () => "test-id" },
    getDatosCompletos: () => JSON.parse(storage.getItem("horario_completo") || "{\"dias\":[],\"filas\":[]}"),
    autoGuardar() {},
    setTimeout() {},
    location: { reload() { host.reloadCount = (host.reloadCount || 0) + 1; } },
    confirm: (message) => { host.lastConfirmation = message; return confirm; }
  };
  host.PLANIFY_COMPLETION_HISTORY = completionHistory.create(host);
  host.PLANIFY_FOCUS_ACTIVITY_HISTORY = focusActivityHistory;
  if (initialSchedule) storage.setItem("horario_completo", JSON.stringify(initialSchedule));
  if (initialHistory) host.PLANIFY_COMPLETION_HISTORY.replaceState(initialHistory);
  if (initialFocus) storage.setItem(focusActivityHistory.storageKey, JSON.stringify(initialFocus));

  let exportedBlob = null;
  const url = { createObjectURL(blob) { exportedBlob = blob; return "blob:backup-test"; }, revokeObjectURL() {} };
  const FileReader = function FileReader() {};
  FileReader.prototype.readAsText = function (file) {
    this.result = file.content;
    if (this.onload) this.onload();
  };
  const context = {
    window: Object.assign(host, { PLANIFY_COMPLETION_HISTORY: host.PLANIFY_COMPLETION_HISTORY, PLANIFY_FOCUS_ACTIVITY_HISTORY: focusActivityHistory, getDatosCompletos: host.getDatosCompletos }),
    document,
    localStorage: storage,
    MutationObserver: function MutationObserver(callback) { this.observe = () => { this.callback = callback; }; },
    FileReader,
    Blob,
    URL: url,
    Intl,
    Date,
    JSON,
    Object,
    Array,
    Number,
    String,
    RegExp,
    Math,
    isNaN,
    setTimeout() {}
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "js", "daily-backup.js"), "utf8"), context, { filename: "daily-backup.js" });

  return {
    storage,
    document,
    host,
    get exportedBlob() { return exportedBlob; },
    importBackup(backup, name = "test.json") {
      const input = document.getElementById("planify-backup-file");
      input.files = [{ name, type: "application/json", size: Buffer.byteLength(backup), content: backup }];
      input.dispatch("change");
      return document.getElementById("planify-backup-message").textContent;
    },
    exportBackup() { document.getElementById("btn-export-complete-json").click(); }
  };
}

function historyWithDays(days) {
  return { schemaVersion: 1, trackingStartedAt: "2026-09-20T12:00:00.000Z", days };
}

function oneDay(date, id, title, done, hours = 1) {
  return {
    updatedAt: date + "T18:00:00.000Z",
    activities: { [id]: done },
    snapshot: { [id]: { title, hours } }
  };
}

test("exportar e importar una copia v3 conserva fechas, estados y snapshots", async () => {
  const expected = historyWithDays({
    "2026-09-21": oneDay("2026-09-21", "a", "Lunes exportado", true),
    "2026-09-22": oneDay("2026-09-22", "b", "Martes exportado", false, 1.5)
  });
  const source = makeHarness({ initialSchedule: fixture("backup-v3-local.json"), initialHistory: expected });
  source.exportBackup();
  assert.ok(source.exportedBlob, "el control Descargar respaldo debe generar un archivo");
  const exported = JSON.parse(await source.exportedBlob.text());
  assert.equal(exported.backupVersion, 4);
  assert.deepEqual(JSON.parse(JSON.stringify(exported.cumplimiento.historialV1)), expected);

  const destination = makeHarness({ initialSchedule: fixture("backup-v2-no-history.json") });
  const message = destination.importBackup(JSON.stringify(exported));
  assert.match(message, /Copia restaurada/);
  assert.deepEqual(JSON.parse(destination.storage.getItem(completionHistory.storageKey)).days, expected.days);
});

test("copia v4 conserva y combina el historial contextual de enfoque sin duplicar sesiones", async () => {
  const first = focusActivityHistory.addSession(focusActivityHistory.emptyState(), {
    sessionId: "focus-one", activityId: "actividad-a", dateKey: "2026-09-27", title: "Estudio", minutes: 25,
    completedAt: "2026-09-27T18:25:00.000Z"
  }).state;
  const local = focusActivityHistory.addSession(focusActivityHistory.emptyState(), {
    sessionId: "focus-local", activityId: "actividad-b", dateKey: "2026-09-27", title: "Proyecto", minutes: 50,
    completedAt: "2026-09-27T20:00:00.000Z"
  }).state;
  const source = makeHarness({ initialSchedule: fixture("backup-v3-local.json"), initialFocus: first });
  source.exportBackup();
  const exported = JSON.parse(await source.exportedBlob.text());
  assert.equal(exported.backupVersion, 4);
  assert.deepEqual(JSON.parse(JSON.stringify(exported.enfoque.actividadV1)), first);

  const destination = makeHarness({ initialSchedule: fixture("backup-v2-no-history.json"), initialFocus: local });
  assert.match(destination.importBackup(JSON.stringify(exported)), /Copia restaurada/);
  const merged = focusActivityHistory.read(destination.storage).state;
  assert.equal(Object.keys(merged.sessions).length, 2);
  assert.match(destination.importBackup(JSON.stringify(exported)), /Copia restaurada/);
  assert.equal(Object.keys(focusActivityHistory.read(destination.storage).state.sessions).length, 2);
});

test("copias v2/v3 conservan byte por byte el historial de enfoque local", () => {
  const local = focusActivityHistory.addSession(focusActivityHistory.emptyState(), {
    sessionId: "focus-local", activityId: "actividad-a", dateKey: "2026-09-27", title: "Estudio", minutes: 25,
    completedAt: "2026-09-27T18:25:00.000Z"
  }).state;
  const harness = makeHarness({ initialSchedule: fixture("backup-v3-local.json"), initialFocus: local });
  const before = harness.storage.getItem(focusActivityHistory.storageKey);
  assert.match(harness.importBackup(JSON.stringify(fixture("backup-v2-no-history.json"))), /Copia restaurada/);
  assert.equal(harness.storage.getItem(focusActivityHistory.storageKey), before);
  assert.match(harness.importBackup(JSON.stringify(fixture("backup-v3-remote.json"))), /Copia restaurada/);
  assert.equal(harness.storage.getItem(focusActivityHistory.storageKey), before);
});

test("rechaza copia v4 sin historial de enfoque o con historial inválido sin mutar datos", () => {
  const base = Object.assign({}, fixture("backup-v3-local.json"), { backupVersion: 4 });
  const invalidCopies = [
    base,
    Object.assign({}, base, { enfoque: { actividadV1: { schemaVersion: 1, sessions: { broken: { sessionId: "other" } } } } })
  ];
  invalidCopies.forEach((backup) => {
    const harness = makeHarness({ initialSchedule: fixture("backup-v3-local.json") });
    const before = harness.storage.snapshot();
    assert.match(harness.importBackup(JSON.stringify(backup)), /no se modificaron/i);
    assert.deepEqual(harness.storage.snapshot(), before);
    assert.equal(harness.host.lastConfirmation, undefined);
  });
});

test("revierte las claves si falla al importar el historial de enfoque v4", async () => {
  const sessions = focusActivityHistory.addSession(focusActivityHistory.emptyState(), {
    sessionId: "focus-remote", activityId: "actividad-a", dateKey: "2026-09-27", title: "Estudio", minutes: 25,
    completedAt: "2026-09-27T18:25:00.000Z"
  }).state;
  const source = makeHarness({ initialSchedule: fixture("backup-v3-local.json"), initialFocus: sessions });
  source.exportBackup();
  const exported = JSON.parse(await source.exportedBlob.text());
  const destination = makeHarness({ initialSchedule: fixture("backup-v3-local.json") });
  const before = destination.storage.snapshot();
  destination.storage.failNextKey = focusActivityHistory.storageKey;
  assert.match(destination.importBackup(JSON.stringify(exported)), /restauró los datos anteriores/i);
  assert.deepEqual(destination.storage.snapshot(), before);
});

test("exportar e importar conserva rangos y duraciones variables del horario", async () => {
  const sourceTemplate = fixture("backup-v2-no-history.json");
  const original = {
    dias: ["Lunes", "Martes"],
    filas: [
      { hora: "09:00 – 09:15", celdas: [
        { t: "Clase", c: "estudio", done: false, reminder: false, rowspan: 1, planifyActivityId: "clase-estable" },
        { t: "Repaso", c: "estudio", done: false, reminder: false, rowspan: 1 }
      ] },
      { hora: "09:15 – 09:30", celdas: [
        { t: "", c: "libre", done: false, reminder: false, rowspan: 1 },
        { t: "", c: "libre", done: false, reminder: false, rowspan: 1 }
      ] },
      { hora: "09:30 – 09:45", celdas: [
        { t: "", c: "libre", done: false, reminder: false, rowspan: 1 },
        { t: "", c: "libre", done: false, reminder: false, rowspan: 1 }
      ] }
    ]
  };
  const changed = scheduleTime.setDuration(original, 0, 0, 20, 15);
  assert.equal(changed.ok, true);
  const expected = JSON.parse(JSON.stringify(changed.schedule));
  const initialSchedule = Object.assign({}, sourceTemplate, expected);
  const source = makeHarness({ initialSchedule });

  source.exportBackup();
  const exported = JSON.parse(await source.exportedBlob.text());
  assert.deepEqual(JSON.parse(JSON.stringify({ dias: exported.dias, filas: exported.filas })), expected);

  const destination = makeHarness({ initialSchedule: fixture("backup-v2-no-history.json") });
  assert.match(destination.importBackup(JSON.stringify(exported)), /Copia restaurada/);
  const restored = JSON.parse(destination.storage.getItem("horario_completo"));
  assert.deepEqual(JSON.parse(JSON.stringify({ dias: restored.dias, filas: restored.filas })), expected);
});

test("importar v3 combina fechas, conserva las exclusivas locales y usa la copia en conflictos", () => {
  const local = historyWithDays({
    "2026-09-21": oneDay("2026-09-21", "local", "Lunes local", true),
    "2026-09-23": oneDay("2026-09-23", "local-miércoles", "Miércoles local", true, 1.5)
  });
  const harness = makeHarness({ initialSchedule: fixture("backup-v3-local.json"), initialHistory: local });
  assert.match(harness.importBackup(JSON.stringify(fixture("backup-v3-remote.json"))), /Copia restaurada/);
  const saved = JSON.parse(harness.storage.getItem(completionHistory.storageKey));
  assert.deepEqual(Object.keys(saved.days).sort(), ["2026-09-21", "2026-09-22", "2026-09-23"]);
  assert.equal(saved.days["2026-09-21"].activities["remoto-lunes"], false);
  assert.equal(saved.days["2026-09-21"].snapshot["remoto-lunes"].hours, 2);
  assert.equal(saved.days["2026-09-22"].activities["remoto-martes"], true);
  assert.equal(saved.days["2026-09-23"].snapshot["local-miércoles"].title, "Miércoles local");
});

test("una copia v2 reemplaza el horario pero deja idéntico el historial local", () => {
  const local = historyWithDays({ "2026-09-23": oneDay("2026-09-23", "local", "Registro conservado", true) });
  const harness = makeHarness({ initialSchedule: fixture("backup-v3-local.json"), initialHistory: local });
  const before = harness.storage.getItem(completionHistory.storageKey);
  assert.match(harness.importBackup(JSON.stringify(fixture("backup-v2-no-history.json"))), /Copia restaurada/);
  assert.equal(harness.storage.getItem(completionHistory.storageKey), before);
  assert.equal(JSON.parse(harness.storage.getItem("horario_completo")).nombre, "Perfil antiguo v2");
});

test("rechaza copias v3 sin historial o con historial inválido sin cambiar almacenamiento", () => {
  for (const name of ["backup-v3-missing-history.json", "backup-v3-malformed-history.json"]) {
    const harness = makeHarness({ initialSchedule: fixture("backup-v3-local.json"), initialHistory: historyWithDays({ "2026-09-23": oneDay("2026-09-23", "local", "Sigue intacto", true) }) });
    const before = harness.storage.snapshot();
    const message = harness.importBackup(JSON.stringify(fixture(name)));
    assert.match(message, /no se modificaron/i, name);
    assert.deepEqual(harness.storage.snapshot(), before, name);
    assert.equal(harness.host.lastConfirmation, undefined, "una copia inválida no debe llegar a pedir confirmación");
  }
});

test("revierte todas las claves si falla al guardar el historial importado", () => {
  const local = historyWithDays({ "2026-09-23": oneDay("2026-09-23", "local", "Debe sobrevivir al fallo", true) });
  const harness = makeHarness({ initialSchedule: fixture("backup-v3-local.json"), initialHistory: local });
  const before = harness.storage.snapshot();
  harness.storage.failNextKey = completionHistory.storageKey;
  const message = harness.importBackup(JSON.stringify(fixture("backup-v3-remote.json")));
  assert.match(message, /restauró los datos anteriores/i);
  assert.deepEqual(harness.storage.snapshot(), before);
});
