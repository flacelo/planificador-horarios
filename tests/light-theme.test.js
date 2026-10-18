"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const cssFiles = fs.readdirSync(path.join(__dirname, "..", "css")).filter((name) => name.endsWith(".css"));

test("el tema claro real (clase tema-claro) no hereda las reglas del tema oscuro 'estelar'", () => {
  // La app activa el modo claro con la clase `tema-claro`; `light-mode` no existe en el cuerpo de la página.
  // Por eso cada regla oscura 'body.tema-estelar:not(.light-mode)' debe excluir también `.tema-claro`.
  let guarded = 0;
  cssFiles.forEach((file) => {
    const css = read("css/" + file);
    const all = css.match(/tema-estelar:not\(\.light-mode\)/g) || [];
    const safe = css.match(/tema-estelar:not\(\.light-mode\):where\(:not\(\.tema-claro\)\)/g) || [];
    assert.equal(all.length, safe.length, file + ": hay reglas oscuras sin excluir tema-claro");
    guarded += safe.length;
  });
  assert.ok(guarded >= 60, "se protegieron las reglas oscuras (" + guarded + ")");
});

test("la exclusión no cambia la especificidad de las reglas oscuras (usa :where)", () => {
  cssFiles.forEach((file) => {
    assert.doesNotMatch(read("css/" + file), /tema-estelar:not\(\.light-mode\):not\(\.tema-claro\)/, file);
  });
});

test("la clase del modo claro sigue siendo tema-claro en la app", () => {
  const app = read("js/app.js");
  assert.match(app, /classList\.toggle\("tema-claro"\)/);
  assert.match(app, /localStorage\.setItem\("planify_theme",\w+\?"light":"dark"\)/);
});

test("Semanal en claro: las celdas sin categoría usan relleno claro (no el oscuro por defecto)", () => {
  const css = read("css/weekly-calm.css");
  const base = css.slice(css.indexOf("body.tema-claro #view-semanal.weekly-calm-ready #tabla td.celda {"));
  const rule = base.slice(0, base.indexOf("}"));
  assert.match(rule, /--weekly-cell-fill: #eef7f4;/);
  assert.match(rule, /--weekly-cell-accent: #5fb5a2;/);
  assert.match(rule, /color: #203a3e !important;/);
  // Las categorías (más específicas) conservan sus propios colores.
  assert.match(css, /td\.celda\.weekly-kind-focus \{ --weekly-cell-fill: #edf7ff;/);
});

test("Semanal en celular: el día elegido se lee en oscuro (menta) y en claro (verde azulado)", () => {
  const css = read("css/weekly-calm.css");
  assert.match(css, /\.weekly-calm-day-button\[aria-pressed="true"\] \.weekly-calm-day-label \{ color: #123c3a !important; \}/);
  assert.match(css, /body\.tema-claro #view-semanal\.weekly-calm-ready \.weekly-calm-day-button\[aria-pressed="true"\] \{ color: #fff; \}/);
  assert.match(css, /body\.tema-claro #view-semanal\.weekly-calm-ready \.weekly-calm-day-button\[aria-pressed="true"\] :is\(\.weekly-calm-day-label, \.weekly-calm-day-count\) \{ color: #fff !important; \}/);
});
