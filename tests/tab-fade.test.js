"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "..", "css/interface-polish.css"), "utf8");
const block = css.slice(css.indexOf("/* Aparición suave (160 ms"));
const noPref = block.slice(block.indexOf("@media (prefers-reduced-motion: no-preference) {"), block.indexOf("@media print"));

test("la aparición suave solo cambia la transparencia (filter: opacity, porque main.css fija opacity con !important) y dura 160 ms", () => {
  assert.match(block, /@keyframes planifyTabFade \{ from \{ filter: opacity\(0\); \} to \{ filter: opacity\(1\); \} \}/);
  assert.doesNotMatch(block.slice(0, block.indexOf("@media")), /transform|translate/);
  assert.match(noPref, /animation: planifyTabFade 0\.16s ease-out;/);
});

test("la animación solo existe dentro de 'sin preferencia' y sin relleno (nunca queda invisible)", () => {
  const outside = block.replace(noPref, "");
  assert.doesNotMatch(outside.replace(/@media print[^\n]*/, ""), /animation:/);
  assert.doesNotMatch(block, /animation-fill-mode|forwards|\bboth\b/);
});

test("Semanal y su tabla no reciben la aparición", () => {
  assert.match(noPref, /\.view-content\.active:not\(#view-semanal, #view-table\)/);
  assert.doesNotMatch(noPref, /#view-semanal[^,{]*\{|#tabla|weekly-calm/);
});

test("Mensual y Avance cambian el rebote de sus encabezados por la aparición suave (Avance es la ventana planify-dashboard-safe)", () => {
  assert.match(noPref, /#view-mensual \.monthly-calm-intro,\s*#view-mensual \.cal-grid,\s*\.trust-dashboard-header \{ animation: planifyTabFade 0\.16s ease-out !important; \}/);
});

test("el panel hace aparecer la sección activa y al imprimir no hay animación", () => {
  assert.match(noPref, /#side-panel \.tab-content\.active,\s*\.trust-dashboard-inner \{ animation: planifyTabFade/);
  assert.match(block, /@media print \{ \.view-content, #side-panel \.tab-content, \.trust-dashboard-inner \{ animation: none !important; \} \}/);
});
