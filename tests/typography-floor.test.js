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

test("panel y aviso de instalar: ningún texto baja de 12 px", () => {
  const panel = block(read("css/panel-redesign.css"), "/* Tipografía mínima");
  assert.match(panel, /\.planify-panel-redesign-ready #side-panel :is\(\.sp-title small, \.panel-section-intro > span, \.panel-rebuild-hint, \.panel-advanced summary span, \.merge-info, \.sp-hint, \.panel-backup summary small, #planify-previous-week-caption, \.planify-pwa-settings-card small\) \{ font-size: 12px !important; \}/);
  const pwa = block(read("css/pwa-experience.css"), "/* Tipografía mínima");
  assert.match(pwa, /\.planify-mobile-app-hint small \{ font-size: 12px !important; \}/);
});

test("Avance: ningún texto baja de 12 px", () => {
  const css = block(read("css/dashboard-calm.css"), "/* Tipografía mínima");
  assert.match(css, /\.planify-dashboard-v2 :is\(\.trust-dashboard-eyebrow, \.dashboard-view-nav button span, \.dashboard-calm-kicker, \.dashboard-calm-history-note, \.trust-bar-value, \.trust-bar-label, \.dashboard-calm-chart-legend span, \.dashboard-calm-disclaimer\) \{ font-size: 12px !important; \}/);
});

test("Anual y Mensual: rótulos y sugerencias a 12 px (el calendario y sus casillas son excepción)", () => {
  assert.match(block(read("css/annual-calm.css"), "/* Tipografía mínima"), /#vista-anual-metas\.annual-calm-ready :is\(\.annual-calm-eyebrow, \.annual-calm-quarter, \.annual-calm-ideas > summary small\) \{ font-size: 12px !important; \}/);
  assert.match(block(read("css/monthly-calm.css"), "/* Tipografía mínima"), /#view-mensual\.monthly-calm-ready :is\(\.monthly-calm-eyebrow, \.monthly-calm-ideas > summary small\) \{ font-size: 12px !important; \}/);
  assert.match(block(read("css/trust-fixes.css"), "/* Tipografía mínima"), /\.trust-personal-guidance :is\(small, li\) \{ font-size: 12px !important; \}/);
  // Excepciones: no se tocan las casillas del calendario mensual.
  const monthlyFloor = block(read("css/monthly-calm.css"), "/* Tipografía mínima");
  assert.doesNotMatch(monthlyFloor.slice(0, monthlyFloor.indexOf("/* Cristal y luz (fase 2)")), /cal-dia/);
});

test("cabecera y ayuda del celular a 12 px", () => {
  assert.match(block(read("css/brand-system.css"), "/* Tipografía mínima"), /\.planify-brand-ready \.brand-hero \.brand-eyebrow \{ font-size: 12px !important; \}/);
  assert.match(block(read("css/mobile-coach.css"), "/* Tipografía mínima"), /\.planify-mobile-coach \.mobile-coach-action \{ font-size: 12px !important; \}/);
});

test("barra inferior: rótulos e íconos a 12 px; en pantallas de 340 px o menos se conserva el tamaño anterior para que no se corte 'Semanal'", () => {
  const css = block(read("css/brand-system.css"), "/* Tipografía mínima: los rótulos y el ícono de la barra inferior");
  assert.match(css, /\.planify-brand-ready \.brand-nav-slot > \.bottom-nav \.tab-btn,\s*\.planify-brand-ready \.brand-nav-slot > \.bottom-nav \.tab-btn span \{ font-size: 12px !important; \}/);
  assert.match(css, /@media \(max-width: 340px\) \{[\s\S]*?font-size: \.68rem !important;/);
});

test("Semanal: días del celular, resumen, leyenda y opciones a 12 px (la tabla es excepción)", () => {
  const css = block(read("css/weekly-calm.css"), "/* Tipografía mínima");
  assert.match(css, /#view-semanal\.weekly-calm-ready :is\(\.weekly-calm-day-label, \.weekly-calm-day-count, \.weekly-calm-selected-count, \.weekly-calm-legend span, \.weekly-calm-more > summary, \.weekly-calm-more > summary span, \.merge-badge, #day-summary \.ds-stat, #day-summary \.ds-stat strong, #day-summary \.ds-actions button\) \{ font-size: 12px !important; \}/);
  // La tabla (#tabla) no se toca.
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ""), /#tabla/);
});
