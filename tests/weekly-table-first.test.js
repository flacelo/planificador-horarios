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
