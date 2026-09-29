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
  assert.match(welcome, /class="welcome-flow-row-edit" data-week-edit-day/);
  assert.match(welcome, /no una estimación del tiempo real/);
  assert.match(welcome, /Tiempo disponible/);
});

test("el PDF semanal se genera por día en páginas verticales y desde el día se incluye la semana", () => {
  assert.match(pdf, /activa\.id === 'vista-diaria' && opcion\.id === 'vista-semanal'/);
  assert.match(pdf, /construirPaginasSeleccionadas/);
  assert.match(pdf, /dayIndex \+ 1/);
  assert.match(pdf, /Lunes.*Martes.*Miércoles.*Jueves.*Viernes.*Sábado.*Domingo/);
  assert.match(pdf, /@page planify-weekday \{ size: A4 portrait/);
  assert.match(pdf, /width:1200px;height:1600px/);
  assert.match(pdf, /pagina\.classList\.contains\('planify-export-semanal-dia'\)/);
  assert.match(pdf, /planify-export-semanal-dia thead\{display:table-header-group/);
  assert.match(pdf, /siguienteRango\[0\] !== horaFinal/);
  assert.match(pdf, /horaNueva\.textContent = rangoInicial\[0\] \+ " – " \+ horaFinal/);
  assert.match(pdf, /celdaDiaNueva\.rowSpan = 1/);
});

test("las duraciones genéricas no se presentan como actividades observadas", () => {
  assert.match(welcome, /reservados para tu resultado/);
  assert.match(welcome, /no predice cuánto tardas/);
  assert.match(welcome, /No fijamos una hora para la procrastinación/);
  assert.match(welcome, /Las comidas, pausas, traslados y actividades generales quedan disponibles/);
  assert.doesNotMatch(welcome, /text = "Prepararme para estudiar"/);
  assert.doesNotMatch(welcome, /text = "Desayuno y plan del día"/);
  assert.doesNotMatch(welcome, /text = "Pausa breve · estirar y despejarme"/);
});
