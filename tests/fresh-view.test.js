"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync(require.resolve("../js/fresh-view.js"), "utf8");
const indexHtml = fs.readFileSync(require.resolve("../index.html"), "utf8");

class FakeStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
  key(index) { return index >= 0 && index < this.map.size ? [...this.map.keys()][index] : null; }
  get length() { return this.map.size; }
}

// Prepara un navegador falso con datos reales y, si se pide, la vista temporal ya activa.
function setup({ real = {}, session = {} } = {}) {
  const local = new FakeStorage();
  const sess = new FakeStorage();
  Object.keys(real).forEach((key) => local.setItem(key, real[key]));
  Object.keys(session).forEach((key) => sess.setItem(key, session[key]));
  const reloads = [];
  const window = { Storage: FakeStorage, localStorage: local, sessionStorage: sess, location: { reload() { reloads.push(1); } } };
  vm.runInNewContext(source, { window, Object, JSON, String, Array }, { filename: "fresh-view.js" });
  return { window, local, sess, reloads, api: window.PLANIFY_FRESH_VIEW };
}

const REAL = {
  horario_data_semanal: JSON.stringify({ filas: [{ celdas: [{ t: "Estudiar" }] }] }),
  planify_nombre: "Flavio",
  planify_theme: "light"
};

test("sin la vista activa, el archivo no cambia nada: los datos reales se leen y se escriben normal", () => {
  const { local, api } = setup({ real: REAL });
  assert.equal(api.active, false);
  assert.equal(local.getItem("planify_nombre"), "Flavio");
  local.setItem("planify_nombre", "Ana");
  assert.equal(local.getItem("planify_nombre"), "Ana");
  assert.equal(local.length, 3);
  assert.equal(local.key(0), "horario_data_semanal");
});

test("con la vista activa, localStorage parece vacío y los datos reales no se leen", () => {
  const { local } = setup({ real: REAL, session: { planify_vista_nueva_v1: "1" } });
  assert.equal(local.getItem("planify_nombre"), null);
  assert.equal(local.getItem("horario_data_semanal"), null);
  assert.equal(local.length, 0);
  assert.equal(local.key(0), null);
});

test("lo que se escribe en la vista queda en la memoria temporal y NUNCA en los datos reales", () => {
  const { local, sess, window } = setup({ real: REAL, session: { planify_vista_nueva_v1: "1" } });
  const antes = JSON.stringify([...local.map.entries()]);
  local.setItem("planify_nombre", "Persona nueva");
  local.setItem("horario_data_semanal", "{\"filas\":[]}");
  local.removeItem("planify_theme");
  assert.equal(local.getItem("planify_nombre"), "Persona nueva");
  assert.equal(local.length, 2);
  assert.equal(local.key(1), "horario_data_semanal");
  // El almacenamiento real quedó idéntico (se mira el mapa interno sin pasar por los métodos cambiados).
  assert.equal(JSON.stringify([...local.map.entries()]), antes);
  // La memoria temporal vive en sessionStorage, que sigue funcionando normal.
  assert.match(sess.getItem("planify_vista_nueva_datos_v1"), /Persona nueva/);
  assert.equal(window.sessionStorage.getItem("planify_vista_nueva_v1"), "1");
});

test("clear en la vista solo vacía la memoria temporal", () => {
  const { local } = setup({ real: REAL, session: { planify_vista_nueva_v1: "1" } });
  local.setItem("a", "1");
  local.clear();
  assert.equal(local.length, 0);
  assert.equal(local.map.size, 3);
});

test("recargar en la vista sigue en la vista y conserva lo escrito", () => {
  const first = setup({ real: REAL, session: { planify_vista_nueva_v1: "1" } });
  first.local.setItem("planify_nombre", "Persona nueva");
  // "Recarga": un navegador nuevo con el mismo sessionStorage y los mismos datos reales.
  const second = setup({ real: REAL, session: Object.fromEntries(first.sess.map) });
  assert.equal(second.api.active, true);
  assert.equal(second.local.getItem("planify_nombre"), "Persona nueva");
  assert.equal(second.local.getItem("horario_data_semanal"), null);
});

test("sessionStorage no se cambia: solo localStorage se redirige", () => {
  const { sess } = setup({ real: REAL, session: { planify_vista_nueva_v1: "1" } });
  sess.setItem("otra", "x");
  assert.equal(sess.getItem("otra"), "x");
  assert.equal(sess.length, 2);
});

test("empezar marca la pestaña y recarga; salir borra la marca y la memoria temporal y recarga con los datos reales", () => {
  const a = setup({ real: REAL });
  assert.equal(JSON.stringify(a.api.start()), JSON.stringify({ ok: true }));
  assert.equal(a.sess.getItem("planify_vista_nueva_v1"), "1");
  assert.equal(a.reloads.length, 1);
  assert.equal(a.local.getItem("planify_nombre"), "Flavio");

  const b = setup({ real: REAL, session: { planify_vista_nueva_v1: "1", planify_vista_nueva_datos_v1: "{\"x\":\"1\"}" } });
  assert.equal(JSON.stringify(b.api.exit()), JSON.stringify({ ok: true }));
  assert.equal(b.sess.getItem("planify_vista_nueva_v1"), null);
  assert.equal(b.sess.getItem("planify_vista_nueva_datos_v1"), null);
  assert.equal(b.reloads.length, 1);
  assert.equal(b.local.map.size, 3);
});

test("después de salir, un último guardado de la página no deja rastro de la vista temporal", () => {
  const { local, sess, api } = setup({ real: REAL, session: { planify_vista_nueva_v1: "1" } });
  api.exit();
  local.setItem("planify_nombre", "tarde");
  assert.equal(sess.getItem("planify_vista_nueva_datos_v1"), null);
  assert.equal(sess.getItem("planify_vista_nueva_v1"), null);
  assert.equal(local.map.get("planify_nombre"), "Flavio");
});

test("si el navegador no deja usar sessionStorage, no entra a la vista y lo dice", () => {
  class FullStorage extends FakeStorage { setItem() { throw new Error("lleno"); } }
  const reloads = [];
  const window = { Storage: FullStorage, localStorage: new FullStorage(), sessionStorage: new FullStorage(), location: { reload() { reloads.push(1); } } };
  vm.runInNewContext(source, { window, Object, JSON, String, Array }, { filename: "fresh-view.js" });
  assert.equal(JSON.stringify(window.PLANIFY_FRESH_VIEW.start()), JSON.stringify({ ok: false, message: "Este navegador no permite abrir esta vista." }));
  assert.equal(reloads.length, 0);
});

test("hasContent distingue contenido de la persona de los ajustes que la app escribe sola", () => {
  const { local, api } = setup({ real: REAL, session: { planify_vista_nueva_v1: "1" } });
  assert.equal(api.hasContent(), false);
  local.setItem("planify_idioma", "es");
  local.setItem("horario_inicio", "06:00");
  local.setItem("horario_data_semanal", JSON.stringify({ filas: [{ celdas: [{ t: "" }, { t: "—" }] }] }));
  assert.equal(api.hasContent(), false);
  local.setItem("horario_data_semanal", JSON.stringify({ filas: [{ celdas: [{ t: "Leer" }] }] }));
  assert.equal(api.hasContent(), true);
  local.removeItem("horario_data_semanal");
  assert.equal(api.hasContent(), false);
  local.setItem("planify_nombre", "Ana");
  assert.equal(api.hasContent(), true);
});

test("el script va primero: antes del protector de datos y de app.js", () => {
  const fresh = indexHtml.indexOf('src="js/fresh-view.js?v=1.0"');
  const gate = indexHtml.indexOf('src="js/local-data-gate.js');
  const app = indexHtml.indexOf('src="js/app.js');
  assert.ok(fresh >= 0 && fresh < gate && gate < app);
});

test("no toca las claves de los datos reales ni escribe en localStorage por su cuenta", () => {
  assert.doesNotMatch(source, /localStorage\.(setItem|removeItem|clear)\(/);
  assert.doesNotMatch(source, /planify-backup/);
  // Las únicas claves nuevas son dos de sessionStorage.
  assert.deepEqual([...source.matchAll(/"(planify_vista_nueva[a-z_0-9]*)"/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i).sort(), ["planify_vista_nueva_datos_v1", "planify_vista_nueva_v1"]);
});
