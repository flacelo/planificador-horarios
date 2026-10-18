"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("Diario: Metas y Tareas quedan arriba; las otras 6 tarjetas van en 'Más para tu día' (plegado)", () => {
  const js = read("js/daily-calm.js");
  assert.match(js, /var primary = \["\.goals-section", "\.todo-section"\];/);
  assert.match(js, /var secondary = \["\.morning-section", "\.mood-section", "\.sleep-section", "\.productivity-section", "\.grateful-section", "\.affirmations-section"\];/);
  assert.match(js, /more\.className = "daily-more";/);
  assert.match(js, /<summary><span class="daily-more-title">Más para tu día<\/span><small>Rutina, ánimo, sueño y más · opcional<\/small><\/summary>/);
  // Se mueven las tarjetas existentes (appendChild), no se recrean: conservan datos y funcionamiento.
  assert.match(js, /secondary\.forEach\(function \(selector\) \{ columns\[1\]\.appendChild\(grid\.querySelector\(selector\)\); \}\);/);
  assert.match(js, /more\.appendChild\(columns\[1\]\);/);
});

test("'Más para tu día' se abre solo si ese día ya tiene algo guardado, sin recordar nada nuevo", () => {
  const js = read("js/daily-calm.js");
  assert.match(js, /function hasMoreData\(view\)/);
  ["routine-checkboxes input:checked", ".mood-btn.active", ".sleep-clouds .cloud-btn.active", "#star-rating .star.active", "#grateful-input", "#affirmations-input"]
    .forEach((piece) => assert.ok(js.includes(piece), "revisa " + piece));
  assert.match(js, /more\.open = hasMoreData\(view\);/);
  assert.match(js, /event\.target && event\.target\.id === "planner-date"/);
  assert.doesNotMatch(js, /localStorage/, "no guarda si quedó abierto");
});

test("estilo de 'Más para tu día': ancho completo, dos columnas en escritorio y una en celular, foco visible", () => {
  const css = read("css/daily-calm.css");
  assert.match(css, /#view-diario\.daily-calm-ready \.daily-more \{[^}]*grid-column: 1 \/ -1;/);
  assert.match(css, /#view-diario\.daily-calm-ready \.daily-more > \.notebook-col \{[^}]*display: grid !important;[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(css, /#view-diario\.daily-calm-ready \.daily-more > summary \{[^}]*min-height: 48px;/);
  assert.match(css, /#view-diario\.daily-calm-ready \.daily-more > summary:focus-visible/);
  assert.match(css, /@media \(max-width: 700px\) \{[\s\S]*\.daily-more > \.notebook-col \{ grid-template-columns: minmax\(0, 1fr\); \}/);
});

test("el PDF del Diario abre 'Más para tu día' en su copia (no cambia la pantalla)", () => {
  const js = read("js/export-pdf.js");
  assert.match(js, /clon\.querySelectorAll\('details\.daily-more'\), function\(plegado\) \{\s*plegado\.setAttribute\('open', ''\);/);
});

test("PDF: mismo reparto que antes (Rutina y Ánimo vuelven a la primera columna) y sin el título del plegable", () => {
  const js = read("js/export-pdf.js");
  assert.match(js, /\['\.morning-section', '\.mood-section'\]\.forEach/);
  assert.match(js, /rejilla\.replaceChild\(columnaOpcional, plegado\);/);
});

test("imprimir desde el navegador abre 'Más para tu día' y luego lo deja como estaba", () => {
  const js = read("js/daily-calm.js");
  assert.match(js, /addEventListener\("beforeprint", function \(\) \{ openBeforePrint = more\.open; more\.open = true; \}\);/);
  assert.match(js, /addEventListener\("afterprint", function \(\) \{\s*if \(openBeforePrint !== null\) more\.open = openBeforePrint;/);
});

test("las tarjetas dentro de 'Más para tu día' usan todo el ancho y el fondo de la tarjeta", () => {
  const css = read("css/daily-calm.css");
  const rule = css.slice(css.indexOf("#view-diario.daily-calm-ready .daily-more > .notebook-col {"));
  const body = rule.slice(0, rule.indexOf("}"));
  assert.match(body, /width: auto !important;/);
  assert.match(body, /background: transparent !important;/);
});
