"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const css = read("css/aurora.css");
const phase2 = css.slice(css.indexOf("Fase 2 · Inicio y cabecera"));
const brand = read("js/brand-home.js");

test("el hero es una superficie de vidrio con respaldo opaco y sin desenfoque si se pide menos transparencia", () => {
  assert.match(brand, /hero\.className = "brand-hero au-glass" \+ \(returning/);
  assert.match(phase2, /\.brand-hero\.au-glass \{[^}]*background: var\(--au-hero-tint\), var\(--au-hero-solid\);/);
  assert.match(phase2, /@supports \(\(backdrop-filter: blur\(1px\)\)[^{]*\{\s*html\.planify-brand-ready \.brand-hero\.au-glass \{ background: var\(--au-hero-tint\), var\(--au-hero-glass\); \}/);
  assert.match(phase2, /@media \(prefers-reduced-transparency: reduce\) \{\s*html\.planify-brand-ready \.brand-hero\.au-glass \{ background: var\(--au-hero-tint\), var\(--au-hero-solid\); \}/);
});

test("el hero translúcido mantiene contraste 4,5 con el texto claro incluso sobre el fondo más claro", () => {
  const solid = css.match(/--au-hero-solid:\s*(#[0-9a-f]{6})/i)[1];
  const glass = css.match(/--au-hero-glass:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  const lum = (rgb) => { const [r, g, b] = rgb.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const alpha = Number(glass[4]);
  const lightest = [244, 247, 245]; // fondo del tema claro
  const mixed = [0, 1, 2].map((i) => Number(glass[i + 1]) * alpha + lightest[i] * (1 - alpha));
  [[255, 255, 255], [212, 228, 231]].forEach((text) => assert.ok(ratio(text, mixed) >= 4.5, "el texto del hero pierde contraste sobre el vidrio"));
  const solidRgb = [1, 3, 5].map((i) => parseInt(solid.slice(i, i + 2), 16));
  assert.ok(ratio([212, 228, 231], solidRgb) >= 4.5);
});

test("título grande solo para quien empieza; con plan conserva el tamaño compacto", () => {
  assert.match(phase2, /\.brand-hero:not\(\.is-returning\) h2 \{[^}]*font: 700 var\(--au-t-display\)\/1\.02 var\(--au-font-display\) !important;/);
  assert.doesNotMatch(phase2, /\.is-returning h2/);
});

test("la menta es el único color de acción: cielo y violeta no aparecen en botones", () => {
  const buttons = phase2.match(/[^}]*(?:brand-hero-actions|header-actions|#welcome-flow-open)[^{]*\{[^}]*\}/g) || [];
  assert.ok(buttons.length >= 4);
  buttons.forEach((rule) => assert.doesNotMatch(rule, /--au-sky|--au-violet|#6fb8ff|#9a8cff/));
  assert.match(phase2, /\.brand-primary \{[^}]*background: var\(--au-mint\);[^}]*color: var\(--au-mint-ink\);/);
  assert.match(phase2, /#welcome-flow-open \{[^}]*background: var\(--au-mint\) !important;/);
});

test("cabecera: botones de 44 px en píldora, y no se toca la marca ni el título", () => {
  assert.match(phase2, /\.header-actions button:not\(#welcome-flow-open\),[^{]*\{\s*min-height: 44px !important;\s*border-radius: 999px !important;/);
  assert.match(phase2, /#btn-tema \{ width: 44px !important; min-width: 44px !important; \}/);
  assert.doesNotMatch(phase2, /brand-mark|icon\.svg|logo/);
});

test("fichas de 'Otras formas de empezar': neutras, con la recomendada resaltada, sin tocar texto", () => {
  assert.match(phase2, /\.trust-start-options > button \{[^}]*border-radius: var\(--au-r-md\) !important;[^}]*background: var\(--au-tile-2\) !important;/);
  assert.match(phase2, /button\.is-recommended \{[^}]*border-color: var\(--au-ring-a\) !important;/);
});

test("la fase 2 no trae animaciones ni toca Semanal, el PDF ni planify_*", () => {
  assert.doesNotMatch(phase2, /@keyframes|animation\s*:|transition\s*:/);
  assert.doesNotMatch(phase2, /#tabla|weekly|planify_|planify-backup/);
});
