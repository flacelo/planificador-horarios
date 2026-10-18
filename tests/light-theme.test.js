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

test("Panel en claro: títulos pequeños y ayudas con contraste suficiente", () => {
  const css = read("css/panel-redesign.css");
  assert.match(css, /body\.tema-claro #side-panel \.panel-section-intro > span \{ color: #1d6b5c !important; \}/);
  assert.match(css, /body\.tema-claro #side-panel \.sp-hint \{ color: #4d665f !important; \}/);
  assert.match(css, /body\.tema-claro #side-panel \.merge-info \{ color: #4f6670 !important; \}/);
  assert.doesNotMatch(css, /sp-hint \{ color: #657f78/);
});

test("Mensual y Anual en claro: el rótulo superior usa un verde azulado más oscuro", () => {
  assert.match(read("css/monthly-calm.css"), /body\.tema-claro #view-mensual\.monthly-calm-ready \.monthly-calm-eyebrow \{ color: #06695f !important; \}/);
  assert.match(read("css/annual-calm.css"), /body\.tema-claro #vista-anual-metas\.annual-calm-ready \.annual-calm-eyebrow \{ color: #06695f !important; \}/);
});

test("Ideas de Mensual, Anual y Avance en claro: tarjetas claras con texto oscuro", () => {
  const css = read("css/trust-fixes.css");
  assert.match(css, /body\.tema-claro \.trust-personal-guidance li \{ background: #fff; border-color: #d5e5e2; color: #35505a; \}/);
  assert.match(css, /body\.tema-claro \.trust-personal-guidance li:before \{ color: #087e73; \}/);
  assert.match(css, /body\.tema-claro \.trust-personal-guidance small, body\.tema-claro \.trust-guidance-heading small \{ color: #4d6670; \}/);
});

test("Diario y botones pequeños: contraste suficiente en claro (y en oscuro para los botones de marcar)", () => {
  const css = read("css/interface-polish.css");
  assert.match(css, /body\.tema-claro \.btn-ideas-sugerencias \{ color: #0b5f7a !important; \}/);
  assert.match(css, /body\.tema-claro \.day-flow-glance span, body\.tema-claro \.day-flow-glance small \{ color: #4f6670; \}/);
  assert.match(css, /body\.tema-claro .pwa-settings-card small, body\.tema-claro \[data-pwa-status\] \{ color: #4d6670 !important; \}/);
  assert.match(css, /\.btn-mark\.done \{ color: #0b3b30 !important; \}/);
  assert.match(css, /\.btn-mark\.undo \{ background: linear-gradient\(135deg, #d9453d, #b8322b\) !important; \}/);
  assert.match(css, /#merge-badge\.merge-badge\.show \{ color: #fff !important; \}/);
});
