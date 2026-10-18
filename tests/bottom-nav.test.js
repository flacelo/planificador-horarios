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
  assert.match(block, /\.planify-brand-ready \.brand-nav-slot > \.bottom-nav,\s*\.planify-brand-ready \.main-card-container > \.bottom-nav \{[^}]*background: rgba\(19, 39, 51, \.74\) !important;[^}]*backdrop-filter: blur\(14px\)/);
  assert.match(block, /body\.tema-claro \.brand-nav-slot > \.bottom-nav,[^{]*\{[^}]*background: rgba\(255, 255, 255, \.78\) !important;/);
  assert.match(block, /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/);
  assert.match(block, /rgba\(19, 39, 51, \.94\)/);
  assert.match(block, /rgba\(255, 255, 255, \.96\)/);
});

test("la barra conserva su posición y su comportamiento de esconderse (no se toca)", () => {
  assert.match(css, /\.planify-brand-ready \.brand-nav-slot > \.bottom-nav\.is-pinned \{\s*position: fixed !important;/);
  assert.match(css, /bottom: calc\(8px \+ env\(safe-area-inset-bottom\)\) !important;/);
});
