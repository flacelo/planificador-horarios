"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const trustFixes = fs.readFileSync(require.resolve("../js/trust-fixes.js"), "utf8");
const polishStyles = fs.readFileSync(require.resolve("../css/ux-follow-up.css"), "utf8");

test("cada paso del tutorial indica y resalta el control exacto", () => {
  assert.match(trustFixes, /target: "#tutorial-btn", where: "Botón 📖 Tutorial, en el encabezado\."/);
  assert.match(trustFixes, /target: ".bottom-nav \[data-tab='semanal'\]"/);
  assert.match(trustFixes, /target: "#tabla tbody td"/);
  assert.match(trustFixes, /target: ".bottom-nav \[data-tab='diario'\]"/);
  assert.match(trustFixes, /target: "#cloud-btn"/);
  assert.match(trustFixes, /trust-tutorial-where strong/);
  assert.match(trustFixes, /trust-tutorial-highlight/);
  assert.match(trustFixes, /cambiarTab\("semanal"\)/);
  assert.match(polishStyles, /\.trust-tutorial-highlight\s*\{[^}]*outline:/s);
  assert.match(polishStyles, /\.trust-tutorial-where\s*\{/);
});
