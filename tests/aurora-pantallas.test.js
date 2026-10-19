"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const aurora = read("css/aurora.css");
const base = aurora.slice(aurora.indexOf("Pantallas (fase 2) · base compartida"));
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const INTROS = [
  "#view-semanal.weekly-calm-ready .weekly-calm-intro",
  "#view-mensual.monthly-calm-ready .monthly-calm-intro",
  "#vista-anual-metas.annual-calm-ready .encabezado-anual"
];

test("llaves balanceadas en aurora.css (un cierre de más o de menos rompe todo lo que sigue)", () => {
  const css = strip(aurora);
  assert.equal(css.split("{").length, css.split("}").length);
});

test("la tarjeta de presentación de Semanal, Mensual y Anual es de vidrio con respaldo opaco", () => {
  INTROS.forEach((sel) => assert.ok(base.includes(sel), "falta " + sel));
  assert.match(base, /@media screen \{\s*html body:is\([^)]*\) #view-semanal[\s\S]*?\{\s*border: 1px solid var\(--au-glass-line\);\s*background: var\(--au-glass-solid\);/);
  assert.match(base, /@supports \(\(backdrop-filter: blur\(1px\)\)[^{]*\{\s*@media screen \{[\s\S]*?backdrop-filter: blur\(14px\) saturate\(1\.25\);/);
  assert.match(base, /@media screen and \(prefers-reduced-transparency: reduce\) \{[\s\S]*?backdrop-filter: none;/);
});

test("la barra de fecha continúa la tarjeta sin su propio desenfoque (una sola superficie de vidrio por pantalla)", () => {
  const nav = base.slice(base.indexOf("#nav-bar-semanal,"), base.indexOf("}", base.indexOf("#nav-bar-semanal,")));
  assert.doesNotMatch(nav, /backdrop-filter/);
  assert.match(nav, /border-radius: 0 0 var\(--au-r-lg\) var\(--au-r-lg\) !important;/);
  const supports = base.slice(base.indexOf("@supports"), base.indexOf("@media screen and (prefers-reduced-transparency"));
  assert.equal((supports.match(/(?<!-webkit-)backdrop-filter: blur\(14px\)/g) || []).length, 1, "solo la tarjeta de presentación desenfoca");
});

test("botones de fecha: píldora de 44 px, neutros (la menta es la única acción)", () => {
  assert.match(base, /\.btn-nav-fecha,[\s\S]*?\.btn-nav-fecha \{\s*flex: 0 0 auto;\s*width: 44px;\s*min-height: 44px;[^}]*border-radius: 999px !important;[^}]*background: var\(--au-tile\) !important;/);
  assert.doesNotMatch(base, /--au-sky|--au-violet|#6fb8ff|#9a8cff/);
});

test("todo lo nuevo va en @media screen (la impresión conserva lo de siempre) y la impresión quita la malla y el vidrio de la maqueta", () => {
  const outside = strip(base).replace(/@media screen \{[\s\S]*?\n\}\n/g, "").replace(/@supports[\s\S]*?\n\}\n/g, "").replace(/@media screen and \(prefers-reduced-transparency[\s\S]*?\n\}\n/g, "");
  assert.doesNotMatch(outside.replace(/@media print \{[\s\S]*?\n\}/, ""), /#view-|#vista-/);
  assert.match(base, /@media print \{\s*html\.planify-brand-ready body[^{]*\{ background-image: none !important; \}/);
  assert.match(base, /\.au-glass, html\.planify-brand-ready \.brand-hero\.au-glass \{ -webkit-backdrop-filter: none !important; backdrop-filter: none !important; box-shadow: none !important; \}/);
});

test("no toca la tabla de Semanal, el PDF ni las claves", () => {
  assert.doesNotMatch(base, /#tabla|#table-wrap|#view-table|hora-cell|planify-export|planify_|planify-backup|brand-mark|icon\.svg/);
});
