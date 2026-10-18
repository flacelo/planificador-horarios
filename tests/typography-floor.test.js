"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const block = (css, marker) => { const i = css.indexOf(marker); assert.ok(i >= 0, "falta: " + marker); return css.slice(i); };
const DARK = "body.dark, body.tema-estelar:not(.light-mode):where(:not(.tema-claro))";

test("tarjeta Hoy: ningún texto baja de 12 px", () => {
  const css = block(read("css/day-flow.css"), "/* Tipografía mínima");
  assert.match(css, /\.planify-day-flow :is\(\.day-flow-kicker, \.day-flow-head strong, \.day-flow-head small, \.day-flow-head p, \.day-flow-glance span, \.day-flow-glance small, \.day-flow-actions button, \.day-flow-list summary, \.day-flow-list li, \.day-flow-list time\) \{ font-size: 12px !important; \}/);
});

test("tarjeta Hoy: AVANCE/AVISOS y la hora de la jornada llegan a contraste 4,5 en claro y oscuro", () => {
  const css = block(read("css/day-flow.css"), "/* Tipografía mínima");
  assert.match(css, /\.planify-day-flow \.day-flow-glance :is\(span, small\) \{ color: #4f5d70; \}/);
  assert.match(css, /\.planify-day-flow \.day-flow-list time \{ color: #4b40b8; \}/);
  assert.match(css, /body\.tema-estelar:not\(\.light-mode\):where\(:not\(\.tema-claro\)\) \.planify-day-flow \.day-flow-glance :is\(span, small\) \{ color: #b4c3d6; \}/);
  assert.match(css, /body\.tema-estelar:not\(\.light-mode\):where\(:not\(\.tema-claro\)\) \.planify-day-flow \.day-flow-list time \{ color: #9be8d3; \}/);
});
