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
  // La pantalla (tarjeta, aviso, ventanas) se prueba en el navegador; aquí el documento falso espera y no la dibuja.
  const document = { readyState: "loading", addEventListener() {} };
  vm.runInNewContext(source, { window, document, Object, JSON, String, Array }, { filename: "fresh-view.js" });
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
  vm.runInNewContext(source, { window, document: { readyState: "loading", addEventListener() {} }, Object, JSON, String, Array }, { filename: "fresh-view.js" });
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
  assert.doesNotMatch(source, /"planify-backup"|backupFormat/);
  // Las únicas claves nuevas son tres de sessionStorage (marca, datos temporales y aviso oculto).
  assert.deepEqual([...source.matchAll(/"(planify_vista_nueva[a-z_0-9]*)"/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i).sort(), ["planify_vista_nueva_aviso_oculto_v1", "planify_vista_nueva_datos_v1", "planify_vista_nueva_v1"]);
});

// ---- Pantalla (textos y reglas; el comportamiento se prueba en el navegador) ----
test("textos de la tarjeta, la confirmación y el aviso, tal como se aprobaron", () => {
  [
    "Ver Liberday como si fuera nuevo",
    "Entras como una persona nueva, sin tocar tus datos. Lo que hagas ahí no se guarda.",
    "Empezar como si fuera nuevo",
    "Vas a ver Liberday como la primera vez. Tus datos no se borran ni se modifican: solo quedan ocultos mientras estés en esta vista.",
    "Estás viendo Liberday como si fuera nuevo. Tus datos están a salvo y no se guardará nada de lo que hagas aquí.",
    "Volver a mi plan",
    "Se descartará lo que hiciste en esta vista.",
    "Seguir aquí"
  ].forEach((text) => assert.ok(source.includes('"' + text + '"'), text));
});

test("la tarjeta va debajo de 'Copia de seguridad' (.panel-backup) en ⚙️ → Descargas (#tab-ajustes)", () => {
  assert.match(source, /document\.getElementById\("tab-ajustes"\)/);
  assert.match(source, /tab\.querySelector\("\.panel-backup"\)/);
  assert.match(source, /backup\.parentNode\.insertBefore\(card, backup\.nextSibling\)/);
});

test("en la vista, importar un respaldo queda desactivado (botón y archivo) con su explicación", () => {
  assert.match(source, /getElementById\("btn-import-complete-json"\)/);
  assert.match(source, /getElementById\("planify-backup-file"\)/);
  assert.match(source, /button\.disabled = true;/);
  assert.match(source, /input\.disabled = true;/);
  assert.match(source, /importOff: "Cargar un respaldo no está disponible en esta vista\."/);
});

test("el aviso y las confirmaciones viven dentro del protector de datos cuando está abierto (si no, quedarían inertes)", () => {
  assert.match(source, /document\.getElementById\("planify-local-data-gate"\) \|\| document\.body/);
  assert.match(source, /dialog\.addEventListener\("keydown", function \(event\) \{ if \(event\.key === "Escape"\) event\.stopPropagation\(\); \}\);/);
});

test("salir pide confirmación solo si hay contenido; entrar siempre la pide", () => {
  assert.match(source, /function askLeave\(\) \{\s*if \(!hasContent\(\)\) \{ exit\(\); return; \}/);
  assert.match(source, /onYes: start/);
});

test("botones de 44 px, letra de 12 px o más y sin animaciones", () => {
  assert.match(source, /min-height:44px/);
  assert.doesNotMatch(source, /font-size:(1[01]|[0-9])px/);
  assert.doesNotMatch(source, /transition|animation/);
});

test("los clics se atienden en la fase de captura y se detienen: app.js frena todo botón que diga 'volver'", () => {
  assert.match(source, /event\.stopImmediatePropagation\(\);/);
  assert.match(source, /\}, true\);\n/);
  // El texto aprobado contiene "volver", así que sin esto el botón no respondería.
  assert.match(fs.readFileSync(require.resolve("../js/app.js"), "utf8"), /indexOf\("volver"\)/);
  assert.match(source, /data-fresh-action", "confirm"/);
  assert.match(source, /data-fresh-action", "cancel"/);
});

test("la ventana de confirmación se centra en la pantalla (la app reinicia los márgenes de <dialog>)", () => {
  assert.match(source, /#planify-fresh-dialog\{position:fixed;inset:0;margin:auto;height:fit-content;/);
});

// ---- "Quedarme aquí" ----
test("'Quedarme aquí' oculta el aviso en esta pestaña con una marca de sessionStorage y no toca los datos", () => {
  const { local, sess, api } = setup({ real: REAL, session: { planify_vista_nueva_v1: "1" } });
  local.setItem("planify_nombre", "Persona nueva");
  const realAntes = JSON.stringify([...local.map.entries()]);
  const memoriaAntes = sess.getItem("planify_vista_nueva_datos_v1");
  assert.equal(api.isNoticeHidden(), false);
  api.hideNotice();
  assert.equal(api.isNoticeHidden(), true);
  assert.equal(sess.getItem("planify_vista_nueva_aviso_oculto_v1"), "1");
  assert.equal(sess.getItem("planify_vista_nueva_datos_v1"), memoriaAntes);
  assert.equal(JSON.stringify([...local.map.entries()]), realAntes);
  assert.equal(local.getItem("planify_nombre"), "Persona nueva");
});

test("recargar con el aviso oculto sigue en la vista y sigue oculto, con los datos temporales", () => {
  const first = setup({ real: REAL, session: { planify_vista_nueva_v1: "1" } });
  first.local.setItem("planify_nombre", "Persona nueva");
  first.api.hideNotice();
  const second = setup({ real: REAL, session: Object.fromEntries(first.sess.map) });
  assert.equal(second.api.active, true);
  assert.equal(second.api.isNoticeHidden(), true);
  assert.equal(second.local.getItem("planify_nombre"), "Persona nueva");
});

test("la marca de aviso oculto no vale fuera de la vista y 'ocultar' no hace nada fuera de ella", () => {
  const outside = setup({ real: REAL, session: { planify_vista_nueva_aviso_oculto_v1: "1" } });
  assert.equal(outside.api.active, false);
  assert.equal(outside.api.isNoticeHidden(), false);
  outside.api.hideNotice();
  assert.equal(outside.sess.getItem("planify_vista_nueva_aviso_oculto_v1"), "1");
  assert.equal(outside.local.map.size, 3);
});

test("salir y empezar limpian la marca del aviso (no queda oculto la próxima vez)", () => {
  const inView = setup({ real: REAL, session: { planify_vista_nueva_v1: "1", planify_vista_nueva_aviso_oculto_v1: "1" } });
  inView.api.exit();
  assert.equal(inView.sess.getItem("planify_vista_nueva_aviso_oculto_v1"), null);
  assert.equal(inView.sess.getItem("planify_vista_nueva_v1"), null);
  const fresh = setup({ real: REAL, session: { planify_vista_nueva_aviso_oculto_v1: "1" } });
  fresh.api.start();
  assert.equal(fresh.sess.getItem("planify_vista_nueva_aviso_oculto_v1"), null);
  assert.equal(fresh.sess.getItem("planify_vista_nueva_v1"), "1");
});

test("textos y reglas de 'Quedarme aquí': botón, prefijo del título, puntito en ⚙️ y aviso siempre visible en la pantalla de inicio", () => {
  assert.ok(source.includes('"Quedarme aquí"'));
  assert.ok(source.includes('"Vista nueva · "'));
  assert.match(source, /if \(noticeHidden && !gate\) \{/);
  assert.match(source, /stayButton\.hidden = Boolean\(gate\);/);
  assert.match(source, /#cloud-btn\.planify-fresh-on::after/);
  assert.match(source, /gear\.classList\.toggle\("planify-fresh-on", marked\)/);
  assert.match(source, /data-fresh-action", "hide"/);
});

test("la tarjeta de ⚙️ → Descargas sigue ofreciendo 'Volver a mi plan' dentro de la vista, con el aviso oculto o no", () => {
  assert.match(source, /var button = make\("button", "", active \? TEXT\.back : TEXT\.start\);/);
  assert.match(source, /button\.setAttribute\("data-fresh-action", active \? "leave" : "start"\);/);
});
