"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const pdf = read("js/export-pdf.js");
const prepararClon = pdf.slice(pdf.indexOf("function prepararClon("), pdf.indexOf("function construirPagina("));
const semanal = prepararClon.slice(prepararClon.indexOf("if (opcion.tipo === 'semanal') {"));

test("en el celular, Semanal deja un solo día visible con display:none en línea (origen del problema)", () => {
  const weekly = read("js/weekly-calm.js");
  assert.match(weekly, /\(max-width: 700px\)/);
  assert.match(weekly, /cell\.style\.display = !compact \|\| index === 0 \|\| index - 1 === selectedDay \? "" : "none";/);
  assert.match(weekly, /cell\.style\.display = !compact \|\| Number\(cell\.dataset\.ci\) === selectedDay \? "" : "none";/);
});

test("el PDF semanal quita ese display:none de las celdas de su copia antes de armar la hoja de 7 días", () => {
  assert.match(semanal, /querySelectorAll\('th, td'\)/);
  assert.match(semanal, /celda\.style\.display === 'none'/);
  assert.match(semanal, /celda\.style\.removeProperty\('display'\)/);
  // Se hace sobre el clon, antes de construir la tabla compacta.
  assert.ok(semanal.indexOf("removeProperty('display')") < semanal.indexOf("construirTablaSemanalCompacta(tablaCompletaCompacta)"));
  assert.doesNotMatch(semanal, /document\.querySelectorAll\('th, td'\)/);
});

test("solo se limpia en Semanal: Diario, Mensual y Anual no pasan por esa limpieza", () => {
  assert.equal(prepararClon.split("removeProperty('display')").length, 2);
  assert.ok(prepararClon.indexOf("removeProperty('display')") > prepararClon.indexOf("if (opcion.tipo === 'semanal')"));
});
