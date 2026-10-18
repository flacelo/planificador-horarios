"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "..", "css", "brand-system.css"), "utf8");
const start = css.indexOf("/* Barra inferior liviana");
const block = start >= 0 ? css.slice(start) : "";

test("barra inferior: vidrio translúcido en oscuro y claro, con alternativa sin desenfoque", () => {
  assert.ok(start >= 0, "falta el bloque 'Barra inferior liviana'");
  assert.match(block, /\.planify-brand-ready \.brand-nav-slot > \.bottom-nav,\s*\.planify-brand-ready \.main-card-container > \.bottom-nav \{[^}]*background: rgba\(19, 39, 51, \.88\) !important;[^}]*backdrop-filter: blur\(14px\)/);
  assert.match(block, /body\.tema-claro \.brand-nav-slot > \.bottom-nav,[^{]*\{[^}]*background: rgba\(255, 255, 255, \.9\) !important;/);
  assert.match(block, /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/);
  assert.match(block, /rgba\(19, 39, 51, \.94\)/);
  assert.match(block, /rgba\(255, 255, 255, \.96\)/);
});

test("la barra conserva su posición y su comportamiento de esconderse (no se toca)", () => {
  assert.match(css, /\.planify-brand-ready \.brand-nav-slot > \.bottom-nav\.is-pinned \{\s*position: fixed !important;/);
  assert.match(css, /bottom: calc\(8px \+ env\(safe-area-inset-bottom\)\) !important;/);
});

test("pestañas inactivas: sin botón blanco (transparentes), texto legible; la activa sigue en menta", () => {
  const inactive = ":not(.active):not([aria-current=\"page\"])";
  assert.ok(block.includes(".planify-brand-ready .bottom-nav .tab-btn" + inactive + " {"));
  const rule = block.slice(block.indexOf(".planify-brand-ready .bottom-nav .tab-btn" + inactive + " {"));
  const body = rule.slice(0, rule.indexOf("}"));
  assert.match(body, /background: transparent !important;/);
  assert.match(body, /border-color: transparent !important;/);
  assert.match(body, /box-shadow: none !important;/);
  assert.match(body, /color: #b9d0d2 !important;/);
  assert.match(block, /body\.tema-claro \.bottom-nav \.tab-btn:not\(\.active\):not\(\[aria-current="page"\]\) \{[^}]*color: #364f59 !important;/);
  // Hover suave y la pestaña activa conserva su menta con texto oscuro.
  assert.match(block, /\.tab-btn:not\(\.active\):not\(\[aria-current="page"\]\):hover \{[^}]*background: rgba\(127, 217, 194, \.16\) !important;/);
  assert.match(css, /\.planify-brand-ready \.bottom-nav \.tab-btn\.active,\s*\.planify-brand-ready \.bottom-nav \.tab-btn\[aria-current="page"\] \{ background: #7fd9c2 !important; color: #103a38 !important;/);
});
