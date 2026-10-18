"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const source = read("js/brand-home.js");

// Dibuja el hero con o sin plan guardado y devuelve su HTML.
function renderHero(withPlan) {
  let html = "";
  let className = "";
  const stub = { insertAdjacentHTML() {}, remove() {} };
  const hub = {
    parentNode: { insertBefore(el) { html = el.innerHTML; className = el.className; } },
    classList: { toggle() {}, add() {} },
    querySelector() { return stub; }
  };
  const classes = { toggle() {}, add() {}, contains() { return false; } };
  const document = {
    readyState: "complete", body: {}, head: { appendChild() {} }, getElementById() { return null; },
    documentElement: { classList: classes },
    querySelector(sel) { return sel === ".trust-start-hub" ? hub : null; },
    createElement() { return { setAttribute() {}, set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; }, className: "" }; },
    addEventListener() {}
  };
  const schedule = { filas: [{ celdas: [{ t: withPlan ? "Estudiar" : "" }] }] };
  vm.runInNewContext(source, {
    window: {}, document, localStorage: { getItem(k) { return k === "horario_data_semanal" ? JSON.stringify(schedule) : null; } },
    MutationObserver: class { observe() {} }, Array, JSON, String, Boolean
  }, { filename: "brand-home.js" });
  return { html, className };
}

test("con plan: título, botones y nota plegable con el mismo texto; sin etiqueta ni frase de apoyo", () => {
  const { html, className } = renderHero(true);
  assert.match(className, /is-returning/);
  assert.match(html, /<h2 id="brand-hero-title">Tu plan te espera\.<br><em>Continúa a tu ritmo\.<\/em><\/h2>/);
  assert.doesNotMatch(html, /PLANEA A TU MANERA|brand-eyebrow/);
  assert.doesNotMatch(html, /Tu espacio está listo/);
  assert.match(html, /<button type="button" class="brand-primary" data-brand-action="week">Ver mi semana <span aria-hidden="true">↗<\/span><\/button>/);
  assert.match(html, />Crear otro horario<\/button>/);
  assert.match(html, /<button type="button" class="brand-link" data-brand-action="others">Otras formas de empezar<\/button>/);
  assert.match(html, /<details class="brand-data-note"><summary><span aria-hidden="true">🔒<\/span> Tu plan se guarda en este navegador\.<\/summary><p>Para llevarlo a otro dispositivo: ⚙️ → Descargas → Copia de seguridad\.<\/p><\/details>/);
  // El texto completo es el mismo de antes.
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /🔒 Tu plan se guarda en este navegador\. Para llevarlo a otro dispositivo: ⚙️ → Descargas → Copia de seguridad\./);
});

test("sin plan: el hero grande no cambia (etiqueta, frase de apoyo, nota completa y ejemplo)", () => {
  const { html, className } = renderHero(false);
  assert.doesNotMatch(className, /is-returning/);
  assert.match(html, /<span class="brand-eyebrow"><span aria-hidden="true"><\/span> PLANEA A TU MANERA<\/span>/);
  assert.match(html, /<h2 id="brand-hero-title">Pon tu meta\. Te armo la semana\.<br><em>Estudiar, entrenar, descansar\.<\/em><\/h2>/);
  assert.match(html, /<p>Crea un primer borrador en pocos pasos, planifica desde cero o personaliza cada detalle\. Siempre podrás cambiarlo\.<\/p>/);
  assert.match(html, /<div class="brand-hero-actions"><button type="button" class="brand-primary" data-brand-action="paths">Elegir cómo empezar <span aria-hidden="true">↗<\/span><\/button><\/div>/);
  assert.match(html, /<p class="brand-data-note"><span aria-hidden="true">🔒<\/span> Tu plan se guarda en este navegador\. Para llevarlo a otro dispositivo: ⚙️ → Descargas → Copia de seguridad\.<\/p>/);
  assert.match(html, /UN EJEMPLO, A TU MEDIDA/);
});

const css = read("css/brand-system.css");
const block = css.slice(css.indexOf("/* Cabecera compacta: solo para quien ya tiene plan"));

test("los estilos compactos solo tocan .is-returning (el hero de quien empieza no se afecta)", () => {
  const selectors = block.match(/^\s*\.planify-brand-ready[^{]*\{/gm) || [];
  assert.ok(selectors.length >= 12);
  selectors.forEach((selector) => assert.match(selector, /\.brand-hero\.is-returning/));
});

test("título más chico, botones de 44 px, nota de 12 px con zona táctil de 44 px en celular", () => {
  assert.match(block, /\.brand-hero\.is-returning h2 \{[^}]*font-size: 1\.3rem !important;/);
  assert.match(block, /\.brand-hero\.is-returning \.brand-hero-actions button \{ min-height: 44px !important; \}/);
  assert.match(block, /details\.brand-data-note \{[^}]*font-size: 12px !important;/);
  assert.match(block, /details\.brand-data-note summary \{[^}]*min-height: 44px;/);
  assert.match(block, /details\.brand-data-note summary:focus-visible \{ outline: 3px solid #7fd9c2;/);
  assert.doesNotMatch(block, /transition|animation/);
});

test("en escritorio (921 px o más) los botones van en fila a la derecha y la nota queda en la columna del título", () => {
  const desktop = block.slice(block.indexOf("@media (min-width: 921px)"));
  assert.match(desktop, /flex-direction: row !important; flex-wrap: nowrap !important;/);
  assert.match(desktop, /grid-row: 1 \/ 3 !important;/);
  assert.match(desktop, /details\.brand-data-note \{ grid-column: 1 !important;/);
});
