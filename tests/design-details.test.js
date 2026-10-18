"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const block = (css, marker) => { const i = css.indexOf(marker); assert.ok(i >= 0, "falta: " + marker); return css.slice(i); };

test("celular: al tocar una pestaña, la vista queda debajo del ⚙ (no tapa la tarjeta Hoy ni la ayuda)", () => {
  const css = block(read("css/brand-system.css"), "/* Detalles: el ⚙ del celular");
  assert.match(css, /@media \(max-width: 600px\) \{\s*\.planify-brand-ready :is\(#view-diario, #view-semanal, #view-mensual, #vista-anual-metas\) \{ scroll-margin-top: 72px !important; \}/);
  // La pestaña sigue desplazando la vista con scrollIntoView (que respeta scroll-margin-top).
  assert.match(read("js/brand-home.js"), /view\.scrollIntoView\(\{ behavior: "smooth", block: "start" \}\);/);
});

test("anillo de foco del teclado: menta en oscuro y verde azulado en claro (ya no amarillo)", () => {
  const css = read("css/brand-system.css");
  assert.doesNotMatch(css, /#f4cc6e/);
  assert.match(css, /\.planify-brand-ready button:focus-visible,\s*\.planify-brand-ready a:focus-visible \{ outline: 3px solid #7fd9c2 !important; outline-offset: 3px !important; \}/);
  assert.match(css, /\.planify-brand-ready body\.tema-claro button:focus-visible,\s*\.planify-brand-ready body\.tema-claro a:focus-visible \{ outline-color: #087e73 !important; \}/);
});
