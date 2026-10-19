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

// ───────── Semanal ─────────
const weekly = read("css/weekly-calm.css");
const weeklyBlock = weekly.slice(weekly.indexOf("/* Cristal y luz (fase 2): Semanal"));

test("Semanal: título grande y fichas neutras sin desenfoque alrededor de la tabla", () => {
  assert.match(weeklyBlock, /\.weekly-calm-intro h2 \{[^}]*font: 700 var\(--au-t-h1\)\/1\.05 var\(--au-font-display\);/);
  assert.match(weeklyBlock, /\.weekly-calm-grid-title h3 \{[^}]*font: 700 var\(--au-t-h2\)\/1\.15 var\(--au-font-display\);/);
  assert.match(weeklyBlock, /#day-summary\.show,[\s\S]*?\.weekly-calm-selected-day \{[^}]*background: var\(--au-tile\) !important;[^}]*backdrop-filter: none !important;/);
  assert.match(weeklyBlock, /\.weekly-calm-more > summary \{\s*min-height: 44px;[^}]*border-radius: 999px;/);
  assert.match(weeklyBlock, /\.weekly-calm-day-button:not\(\[aria-pressed="true"\]\) \{[^}]*border-radius: var\(--au-r-sm\);/);
});

test("Semanal: la tabla no se toca (ni su HTML, ni sus reglas, ni el desenfoque de las celdas de hora: excepción anotada)", () => {
  assert.doesNotMatch(strip(weeklyBlock), /#tabla|#table-wrap|#view-table|hora-cell|planify-export|th:first-child/);
  // Quitar el desenfoque de .hora-cell cambia hasta 3/255 de color en unos 10 000 píxeles de la columna de horas: no es idéntico al píxel, así que se deja.
  assert.match(read("css/grid.css"), /\.hora-cell\{background:rgba\(255,255,255,0\.5\);backdrop-filter:blur\(4px\)/);
});

test("Semanal: todo lo nuevo va en @media screen y sin colores de acción distintos de la menta", () => {
  assert.match(strip(weeklyBlock).trim(), /^@media screen \{/);
  assert.doesNotMatch(strip(weeklyBlock), /--au-sky|--au-violet|#6fb8ff|#9a8cff|animation|transition/);
});

// ───────── Mensual ─────────
const monthly = read("css/monthly-calm.css");
const monthlyBlock = monthly.slice(monthly.indexOf("/* Cristal y luz (fase 2): Mensual"));

test("Mensual: título grande, calendario en ficha y días en fichas pequeñas; hoy resaltado en menta", () => {
  assert.match(monthlyBlock, /\.monthly-calm-intro h2 \{[^}]*font: 700 var\(--au-t-h1\)\/1\.05 var\(--au-font-display\);/);
  assert.match(monthlyBlock, /#cal-container \{[^}]*border-radius: var\(--au-r-lg\);[^}]*background: var\(--au-tile\);/);
  assert.match(monthlyBlock, /#cal-grid \.cal-dia \{[^}]*border-radius: var\(--au-r-sm\) !important;[^}]*background: var\(--au-tile-2\) !important;/);
  assert.match(monthlyBlock, /\.cal-dia\.hoy \{[^}]*border: 2px solid var\(--au-ring-a\) !important;/);
  assert.match(monthlyBlock, /\.cal-dia\.hoy \.cal-numero \{\s*color: var\(--au-ring-a\) !important;/);
});

test("Mensual: sin desenfoque propio, todo en @media screen, sin cielo ni violeta y sin tocar el PDF", () => {
  assert.match(strip(monthlyBlock).trim(), /^@media screen \{/);
  assert.doesNotMatch(strip(monthlyBlock), /backdrop-filter|--au-sky|--au-violet|animation|transition|planify-export|planify_/);
});

// ───────── Anual ─────────
const annual = read("css/annual-calm.css");
const annualBlock = annual.slice(annual.indexOf("/* Cristal y luz (fase 2): Anual"));

test("Anual: título grande y los 12 meses en fichas neutras; siguen en 3 columnas en escritorio y 1 en celular", () => {
  assert.match(annualBlock, /\.encabezado-anual h3 \{[^}]*font: 700 var\(--au-t-h1\)\/1\.05 var\(--au-font-display\) !important;/);
  assert.match(annualBlock, /\.tarjeta-mes-objetivos \{[^}]*border-radius: var\(--au-r-md\) !important;[^}]*background: var\(--au-tile\) !important;/);
  assert.match(annualBlock, /\.tarjeta-mes-objetivos:focus-within \{[^}]*border-color: var\(--au-ring-a\) !important;/);
  assert.match(annual, /\.grid-12-meses \{\s*display: grid !important;\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important;/);
  assert.match(annual, /@media \(max-width: 740px\) \{[\s\S]*?\.grid-12-meses \{ grid-template-columns: minmax\(0, 1fr\) !important;/);
  assert.doesNotMatch(strip(annualBlock), /grid-template-columns/);
});

test("Anual: sin desenfoque propio, todo en @media screen, sin cielo ni violeta y sin tocar el PDF ni los cuadros de texto", () => {
  assert.match(strip(annualBlock).trim(), /^@media screen \{/);
  assert.doesNotMatch(strip(annualBlock), /backdrop-filter|--au-sky|--au-violet|animation|transition|planify-export|planify_|resize|min-height/);
});

// ───────── Avance ─────────
const dash = read("css/dashboard-calm.css");
const dashBlock = dash.slice(dash.indexOf("/* Cristal y luz (fase 2): Avance"));

test("Avance: fondo con malla, título grande, número grande y barra con degradado (sin anillo)", () => {
  assert.match(dashBlock, /\.planify-dashboard-v2 \{\s*--dash-surface: var\(--au-tile\);[\s\S]*?background: var\(--au-mesh\), var\(--au-bg\) !important;/);
  assert.match(dashBlock, /\.trust-dashboard-header h2 \{\s*font: 700 var\(--au-t-h1\)\/1\.05 var\(--au-font-display\);/);
  assert.match(dashBlock, /\.dashboard-calm-percent strong:not\(\.is-empty\) \{[^}]*font: 700 clamp\(56px, 9vw, 104px\)\/1 var\(--au-font-display\);/);
  assert.match(dashBlock, /\.dashboard-calm-progress span \{\s*background: linear-gradient\(90deg, var\(--au-ring-a\), var\(--au-ring-b\)\);/);
  assert.doesNotMatch(strip(dashBlock), /conic-gradient|<svg|stroke-dasharray/);
});

test("Avance: una sola superficie de vidrio (la tarjeta principal) con respaldo opaco; lo tapado deja de desenfocar mientras está abierto", () => {
  const css = strip(dashBlock);
  assert.equal((css.match(/(?<!-webkit-)backdrop-filter: blur\(14px\)/g) || []).length, 1);
  assert.match(css, /dashboard-calm-lead,\s*html body:is\([^)]*\) \.planify-dashboard-v2 \.dashboard-calm-empty \{\s*border: 1px solid var\(--au-glass-line\);[^}]*background: var\(--au-glass-solid\);/);
  assert.match(css, /@media screen and \(prefers-reduced-transparency: reduce\) \{[\s\S]*?backdrop-filter: none;/);
  assert.match(css, /html\.planify-dashboard-open body \.brand-hero\.au-glass,[\s\S]*?\.day-flow-main,\s*html\.planify-dashboard-open body #tabla \.hora-cell \{\s*-webkit-backdrop-filter: none !important;\s*backdrop-filter: none !important;/);
});

test("Avance: la menta es el único color de acción en botones y pestaña actual; botones y pestañas de 44 px", () => {
  assert.match(dashBlock, /\.dashboard-view-nav button\[aria-current="page"\],[\s\S]*?\{\s*border-color: transparent;\s*background: var\(--au-mint\);\s*color: var\(--au-mint-ink\);/);
  assert.match(dashBlock, /\.dashboard-view-nav button \{\s*min-height: 44px;\s*border-radius: 999px;/);
  assert.match(dashBlock, /\.dashboard-week-nav button \{ min-width: 44px; \}/);
  assert.doesNotMatch(strip(dashBlock), /--au-sky|--au-violet|#6fb8ff|#9a8cff/);
});

test("Avance: todo en @media screen y sin tocar el PDF (Avance no entra al PDF) ni las claves", () => {
  assert.doesNotMatch(strip(dashBlock), /planify-export|planify_|planify-backup|animation|transition/);
});
