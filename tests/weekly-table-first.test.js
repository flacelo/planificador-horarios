"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("Semanal: cabecera más chica con el título 'Tu semana' y sin rótulos ni frase de editar", () => {
  const js = read("js/weekly-calm.js");
  assert.match(js, /intro\.innerHTML = '<h2>Tu semana<\/h2>';/);
  assert.match(js, /heading\.innerHTML = '<h3>Actividades de la semana<\/h3>';/);
  assert.doesNotMatch(js, /TU TIEMPO, A TU MANERA|Tu semana, de un vistazo|Cada espacio de la tabla se puede editar|MI HORARIO/);
  const css = read("css/weekly-calm.css");
  assert.match(css, /#view-semanal\.weekly-calm-ready \.weekly-calm-intro \{\s*padding: 16px clamp\(18px, 3vw, 30px\) 12px;/);
  assert.match(css, /#view-semanal\.weekly-calm-ready \.weekly-calm-intro h2 \{\s*margin: 0;[^}]*font-size: clamp\(1\.25rem, 2vw, 1\.6rem\);/);
});

test("la tabla y su estructura no cambian: siguen sus piezas en el mismo orden real", () => {
  const js = read("js/weekly-calm.js");
  assert.match(js, /view\.insertBefore\(intro, nav\);/);
  assert.match(js, /tableView\.insertBefore\(gridBar, table\);/);
  assert.match(js, /tableView\.insertBefore\(hint, table\);/);
  assert.match(js, /tableView\.insertBefore\(dayPicker, table\);/);
});

test("'Resumen de hoy' se ve debajo de la tabla solo por orden visual (CSS), sin moverlo en la página", () => {
  const css = read("css/weekly-calm.css");
  assert.match(css, /@media screen \{\s*#view-semanal\.weekly-calm-ready #view-table \{\s*display: flex !important;\s*flex-direction: column;/);
  assert.match(css, /#view-semanal\.weekly-calm-ready #view-table > \* \{ min-width: 0; \}/);
  assert.match(css, /#view-semanal\.weekly-calm-ready #view-table > #day-summary \{ order: 1; margin: 14px 0 0 !important; \}/);
  assert.match(css, /#view-semanal\.weekly-calm-ready #view-table > \.weekly-calm-legend \{ order: 2; \}/);
  // El orden real no cambia: el PDF y el resto del código siguen leyendo lo mismo.
  assert.doesNotMatch(read("js/weekly-calm.js"), /day-summary/);
});

test("'Tu semana se puede editar' se ve debajo de todo solo en Semanal, sin moverlo en la página", () => {
  const css = read("css/weekly-calm.css");
  assert.match(css, /#view-semanal\.weekly-calm-ready\.active \{\s*display: flex !important;\s*flex-direction: column;/);
  assert.match(css, /#view-semanal\.weekly-calm-ready\.active > \* \{ min-width: 0; \}/);
  assert.match(css, /#view-semanal\.weekly-calm-ready\.active > \.planify-mobile-coach \{ order: 1; margin: 14px auto 0; \}/);
  // Solo cuando Semanal está activa: si no, sigue oculta como antes.
  assert.doesNotMatch(css, /#view-semanal\.weekly-calm-ready \{\s*display: flex/);
  // El código de la ayuda no cambia: se sigue colocando después de la cabecera en el orden real.
  assert.match(read("js/mobile-coach.js"), /if \(intro\) intro\.insertAdjacentElement\("afterend", coach\);/);
});
