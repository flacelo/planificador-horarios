"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const welcome = fs.readFileSync(require.resolve("../js/welcome-flow.js"), "utf8");
const pdf = fs.readFileSync(require.resolve("../js/export-pdf.js"), "utf8");

test("cada turno permite agregar varias tareas por día sin preseleccionar lunes", () => {
  assert.match(welcome, /data-fixed-day-task/);
  assert.match(welcome, /add-workday-task/);
  assert.match(welcome, /dayTasks\.join\(" · "\)/);
  assert.match(welcome, /days: \[\], day: 0/);
  assert.match(welcome, /Elige los días de cada turno o compromiso fijo/);
});

test("cada celda semanal permite abrir la edición del día seleccionado", () => {
  assert.match(welcome, /data-week-edit-day/);
  assert.match(welcome, /state\.editing = previewDay\.hasAttribute\("data-week-edit-day"\)/);
});

test("el PDF semanal se genera por día en páginas verticales y desde el día se incluye la semana", () => {
  assert.match(pdf, /activa\.id === 'vista-diaria' && opcion\.id === 'vista-semanal'/);
  assert.match(pdf, /construirPaginasSeleccionadas/);
  assert.match(pdf, /dayIndex \+ 1/);
  assert.match(pdf, /Lunes.*Martes.*Miércoles.*Jueves.*Viernes.*Sábado.*Domingo/);
  assert.match(pdf, /@page planify-weekday \{ size: A4 portrait/);
});
