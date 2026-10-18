"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const flow = read("css/day-flow.css");
const calm = read("css/daily-calm.css");
const flowBlock = flow.slice(flow.indexOf('/* "Ver mi jornada de hoy": el contenido aparece suave'));
const calmBlock = calm.slice(calm.indexOf('/* "Más para tu día": las tarjetas aparecen suave'));

test("'Ver mi jornada de hoy' aparece en 180 ms solo al abrir y no si fue restaurada", () => {
  assert.match(flowBlock, /@keyframes planifyListIn \{ from \{ opacity: 0; \} to \{ opacity: 1; \} \}/);
  assert.match(flowBlock, /@media \(prefers-reduced-motion: no-preference\) \{\s*\.planify-day-flow \.day-flow-list:not\(\.is-restored\)\[open\] > ul \{ animation: planifyListIn 0\.18s ease-out; \}\s*\}/);
  assert.match(flowBlock, /@media print \{ \.planify-day-flow \.day-flow-list > ul \{ animation: none !important; \} \}/);
});

test("'Más para tu día' aparece en 180 ms solo al abrir (sin animación al cerrar)", () => {
  assert.match(calmBlock, /@keyframes planifyMoreIn \{ from \{ opacity: 0; \} to \{ opacity: 1; \} \}/);
  assert.match(calmBlock, /@media \(prefers-reduced-motion: no-preference\) \{\s*#view-diario\.daily-calm-ready \.daily-more\[open\] > \.notebook-col \{ animation: planifyMoreIn 0\.18s ease-out; \}\s*\}/);
  assert.match(calmBlock, /@media print \{ #view-diario\.daily-calm-ready \.daily-more > \.notebook-col \{ animation: none !important; \} \}/);
});

test("ninguna de las dos deja relleno ni se anima fuera de 'sin preferencia' (nunca queda invisible)", () => {
  [flowBlock, calmBlock].forEach((block) => {
    assert.doesNotMatch(block, /forwards|\bboth\b|animation-fill-mode/);
    const outside = block.replace(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/, "").replace(/@media print[^\n]*/, "");
    assert.doesNotMatch(outside, /animation:/);
  });
});

test("la lista restaurada se marca desde JavaScript y la marca se quita al tocar el resumen", () => {
  const js = read("js/day-flow.js");
  assert.match(js, /classList\.add\("is-restored"\)/);
  assert.match(js, /classList\.remove\("is-restored"\)/);
});
