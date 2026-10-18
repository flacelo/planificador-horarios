"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const css = read("css/pwa-experience.css");
const block = css.slice(css.indexOf("/* Aviso de instalar en una fila (solo con plan)"));

test("el aviso de instalar queda en una fila solo para quien ya tiene plan", () => {
  const selectors = block.match(/^\s*\.[^{]*\{/gm) || [];
  assert.ok(selectors.length >= 5);
  selectors.forEach((selector) => assert.match(selector, /\.planify-has-schedule \.planify-mobile-app-hint/));
  assert.match(block, /\.planify-mobile-app-hint \{ margin: 0 auto 10px; padding: 8px 10px; \}/);
});

test("la línea explicativa se oculta a la vista pero sigue para lectores de pantalla (no se borra)", () => {
  assert.match(block, /\.planify-mobile-app-hint small \{ position: absolute; width: 1px; height: 1px;[^}]*overflow: hidden; clip: rect\(0 0 0 0\);/);
  assert.doesNotMatch(block, /small \{[^}]*display: none/);
  // El elemento y su texto siguen generándose en JavaScript.
  const js = read("js/pwa-experience.js");
  assert.match(js, /<strong>¿Lo usarás todos los días\?<\/strong><small data-pwa-status><\/small>/);
  assert.match(js, /Te explicamos cómo guardarla en tu pantalla de inicio\./);
});

test("el botón del aviso mide 44 px y en 360 px o menos sigue en una fila", () => {
  assert.match(block, /\.planify-mobile-app-hint button \{ min-height: 44px; \}/);
  assert.match(block, /@media \(max-width: 360px\) \{\s*\.planify-has-schedule \.planify-mobile-app-hint \{ display: flex; \}/);
});

test("no hay animaciones nuevas y el aviso de la pantalla de inicio de quien empieza de cero no se toca", () => {
  assert.doesNotMatch(block, /transition|animation/);
  assert.match(css, /\.planify-mobile-app-hint\{display:none;align-items:center;gap:10px;width:calc\(100% - 20px\);margin:-8px auto 16px;padding:12px;/);
});
