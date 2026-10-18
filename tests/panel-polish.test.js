"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

function rule(css, selector) {
  const start = css.indexOf(selector + " {");
  assert.ok(start >= 0, "falta la regla: " + selector);
  return css.slice(start, css.indexOf("}", start));
}

test("A7: Excel y PDF tienen la misma altura de toque (44 px), letra y separación; el PDF sigue siendo el principal", () => {
  const css = read("css/panel-redesign.css");
  const actions = ".planify-panel-redesign-ready #side-panel .config-actions";
  const container = rule(css, actions + "[data-export-actions]");
  assert.match(container, /display: flex !important;/);
  assert.match(container, /flex-direction: column !important;/);
  assert.match(container, /gap: 10px !important;/);
  const both = rule(css, actions + " #btn-export-excel,\n" + actions + " #btn-export-pdf");
  assert.match(both, /min-height: 44px !important;/);
  assert.match(both, /font-size: 14px !important;/);
  assert.match(both, /padding: 10px 16px !important;/);
  assert.match(both, /margin: 0 !important;/);
  // El PDF conserva su relleno principal en los dos temas.
  assert.match(css, /#btn-export-pdf \{\s*border-color: #a5ebbd !important;\s*background: #a5ebbd !important;/);
  assert.match(css, /body\.tema-claro #side-panel \.config-actions #btn-export-pdf \{\s*background: #236d54 !important;/);
});

test("A7: el contenedor de las descargas se marca desde el panel", () => {
  const panel = read("js/panel-redesign.js");
  assert.match(panel, /data-export-actions/);
  assert.match(panel, /btn-export-excel/);
});

test("A8: donde falta el porcentaje se lee 'Sin datos aún' y no una raya sola", () => {
  const trust = read("js/trust-fixes.js");
  assert.match(trust, /<strong class="' \+ \(metrics\.hasHistory \? "" : "is-empty"\) \+ '">' \+ \(metrics\.hasHistory \? metrics\.percent \+ "%" : "Sin datos aún"\) \+ '<\/strong>/);
  // Las barras por día conservan su raya: ahí significa "sin registro" junto a cada día.
  assert.match(trust, /recorded \? completed \+ '\/' \+ count : "—"/);
  const css = read("css/dashboard-calm.css");
  assert.match(css, /\.dashboard-calm-percent strong\.is-empty \{[^}]*font-size: 22px/);
  assert.match(css, /\.dashboard-calm-percent strong\.is-empty \{[^}]*letter-spacing: 0/);
});
