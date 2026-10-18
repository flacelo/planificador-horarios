"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "..", "css/day-flow.css"), "utf8");
const block = css.slice(css.indexOf('/* Barra "Tu día"'));

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); }

test("la barra mide 8 px y usa la menta de la marca en claro y oscuro", () => {
  assert.match(block, /\.day-flow-bar \{[^}]*height: 8px;/);
  assert.match(block, /\.day-flow-bar > i \{[^}]*background: #087e73;/);
  assert.match(block, /tema-claro\)\) \.planify-day-flow \.day-flow-bar > i \{ background: #7fd9c2; \}/);
});

test("la barra se distingue de su pista: contraste de 3 a 1 o más (claro y oscuro)", () => {
  assert.ok(ratio("#087e73", "#d5e6df") >= 3, "claro " + ratio("#087e73", "#d5e6df"));
  assert.ok(ratio("#7fd9c2", "#38546d") >= 3, "oscuro " + ratio("#7fd9c2", "#38546d"));
});

test("la animación está solo dentro de prefers-reduced-motion: no-preference", () => {
  const outside = block.replace(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/, "");
  assert.doesNotMatch(outside, /transition|animation/);
  assert.match(block, /@media \(prefers-reduced-motion: no-preference\) \{[^}]*transition: width/);
});
