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
