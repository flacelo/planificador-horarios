"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const block = (css, marker) => { const i = css.indexOf(marker); assert.ok(i >= 0, "falta: " + marker); return css.slice(i); };

test("tarjeta Hoy: el botón principal es menta sólido con texto oscuro (sin degradado violeta) y mide 44 px", () => {
  const css = block(read("css/day-flow.css"), "/* Un solo color de acción");
  assert.match(css, /\.planify-day-flow \.day-flow-primary \{[^}]*background: #7fd9c2 !important;[^}]*background-image: none !important;[^}]*color: #103a38 !important;[^}]*min-height: 44px !important;/);
  assert.match(css, /\.planify-day-flow :is\(\.day-flow-secondary, \.day-flow-check\) \{ min-height: 44px !important; \}/);
});

test("ayuda del celular: su botón deja la pastilla violeta y usa menta en claro y oscuro", () => {
  const css = block(read("css/mobile-coach.css"), "/* Un solo color de acción");
  assert.match(css, /\.planify-mobile-coach \.mobile-coach-action \{ border-color: #3f9f88; background: #e9f8f2; color: #17473d; \}/);
  assert.match(css, /body\.tema-estelar:not\(\.light-mode\):where\(:not\(\.tema-claro\)\) \.planify-mobile-coach \.mobile-coach-action \{ border-color: #7fd9c2; background: rgba\(127, 217, 194, \.14\); color: #d8f6ee; \}/);
});
