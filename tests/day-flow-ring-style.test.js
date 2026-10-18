"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const css = read("css/day-flow.css");
const aurora = read("css/aurora.css");
const js = read("js/day-flow.js");
const exporter = read("js/export-pdf.js");
const start = css.indexOf('/* Anillo "Tu día"');
const end = css.indexOf("\n/* ", start + 5);
const block = css.slice(start, end < 0 ? undefined : end);
const mosaicStart = css.indexOf('/* Mosaico "Hoy"');
const mosaic = css.slice(mosaicStart, css.indexOf("\n/* ", mosaicStart + 5));

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); }
const LIGHT = "body.tema-claro,\nbody.light-mode";
const token = (name, theme) => aurora.slice(aurora.indexOf(theme)).match(new RegExp(name + ":\\s*(#[0-9a-f]{6})", "i"))[1];

test("el anillo se dibuja con CSS sobre la barra de siempre: degradado cónico de los colores del anillo y número al centro", () => {
  assert.match(block, /\.day-flow-bar \{[^}]*width: 104px;[^}]*height: 104px;[^}]*border-radius: 50%;[^}]*conic-gradient\(from 0deg, var\(--au-ring-a[^)]*\) 0, var\(--au-ring-b[^)]*\) calc\(var\(--au-day-p, 0\) \* 1%\), var\(--au-ring-track[^)]*\) 0\)/);
  assert.match(block, /\.day-flow-bar > i \{ display: none; \}/);
  assert.match(block, /\.day-flow-bar::before \{[^}]*counter-reset: au-day var\(--au-day-n, 0\);[^}]*content: counter\(au-day\) "%";/);
  assert.match(block, /@property --au-day-p \{ syntax: "<number>"; inherits: true; initial-value: 0; \}/);
});

test("el HTML de la tarjeta no cambia (el PDF del Diario lo copia tal cual): sin SVG, sin clases nuevas, el porcentaje viaja por <html>", () => {
  assert.match(js, /<div class="day-flow-main">/);
  assert.doesNotMatch(js, /<svg|au-glass|day-flow-ring|day-ring/);
  assert.match(js, /root\.style\.setProperty\("--au-day-p", String\(percent\)\)/);
  assert.match(js, /root\.style\.setProperty\("--au-day-n", String\(percent\)\)/);
  assert.match(exporter, /clon\.querySelector\('\.planify-day-flow'\)/);
});

test("el arco se distingue de su pista: contraste de 3 a 1 o más (claro y oscuro, ambos extremos del degradado)", () => {
  const lightTrack = token("--au-ring-track", LIGHT);
  ["--au-ring-a", "--au-ring-b"].forEach((name) => assert.ok(ratio(token(name, LIGHT), lightTrack) >= 3, "claro " + name));
  // En oscuro la pista es blanca al 14 % sobre la ficha #172a40.
  const darkTrack = "#" + [0, 1, 2].map((i) => Math.round([0x17, 0x2a, 0x40][i] * 0.86 + 255 * 0.14).toString(16).padStart(2, "0")).join("");
  ["#74e3c0", "#6fb8ff"].forEach((hex) => assert.ok(ratio(hex, darkTrack) >= 3, "oscuro " + hex));
});

test("el porcentaje del centro es legible: texto del tema sobre la ficha, 4,5 o más", () => {
  assert.ok(ratio("#152336", "#ffffff") >= 4.5);
  assert.ok(ratio("#eaf5f3", "#172a40") >= 4.5);
});

test("la animación está solo dentro de prefers-reduced-motion: no-preference", () => {
  const outside = block.replace(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/, "");
  assert.doesNotMatch(outside, /transition|animation/);
  assert.match(block, /@media \(prefers-reduced-motion: no-preference\) \{\s*html \{ transition: --au-day-p 0\.6s ease; \}/);
});

test("mosaico: ficha grande de vidrio con respaldo opaco, fichas del anillo y de avisos, y dos columnas en celular", () => {
  assert.match(mosaic, /grid-template-areas: "main ring" "main avisos" "list list";/);
  assert.match(mosaic, /\.day-flow-glance \{ display: contents; \}/);
  assert.match(mosaic, /\.day-flow-main \{[^}]*background: var\(--au-glass-solid\);/);
  assert.match(mosaic, /@supports \(\(backdrop-filter: blur\(1px\)\)[^{]*\{\s*html\.planify-brand-ready body \.planify-day-flow \.day-flow-main \{\s*background: var\(--au-glass\);/);
  assert.match(mosaic, /@media \(prefers-reduced-transparency: reduce\) \{\s*html\.planify-brand-ready body \.planify-day-flow \.day-flow-main \{ background: var\(--au-glass-solid\);/);
  assert.match(mosaic, /@media \(max-width: 700px\)/);
  assert.match(mosaic, /grid-template-areas: "main main" "ring avisos" "list list";/);
});

test("'Ver mi jornada de hoy' mide 44 px de alto", () => {
  assert.match(mosaic, /\.day-flow-list summary \{ display: flex; align-items: center; min-height: 44px; \}/);
});

test("el mosaico no trae animaciones y no toca Semanal, el PDF ni planify_*", () => {
  assert.doesNotMatch(mosaic, /animation|transition|@keyframes/);
  assert.doesNotMatch(mosaic, /#tabla|weekly|planify_|planify-backup/);
});
